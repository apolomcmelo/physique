create table routine_versions (
  user_id uuid not null references auth.users(id),
  slot text not null check (slot in ('active', 'pending')),
  version_id text not null,
  starts_at timestamptz not null,
  timezone text not null,
  content jsonb not null,
  primary key (user_id, slot)
);
-- Only the active and pending slots are mutable. Historical performed sessions
-- and occurrence rows remain independent of slot replacement.
alter table routine_versions enable row level security;
create policy "routine_versions_owner" on routine_versions for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create table routine_occurrences (
  user_id uuid not null references auth.users(id),
  occurrence_id text not null,
  version_id text not null,
  scheduled_at timestamptz not null,
  outcome text not null check (outcome in ('completed', 'skipped')),
  primary key (user_id, occurrence_id)
);
-- No FK to routine_versions: historical instances survive slot replacement.
alter table routine_occurrences enable row level security;
create policy "routine_occurrences_owner" on routine_occurrences for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create index routine_occurrences_version_idx on routine_occurrences(user_id, version_id, scheduled_at);

-- Historical occurrence records are intentionally independent of the two
-- current version slots. Replacing a slot must never cascade-delete them.

create function get_routine_versions() returns jsonb language sql security invoker set search_path = public as $$
  select jsonb_build_object('active', (select content from routine_versions where user_id = auth.uid() and slot = 'active'),
    'pending', (select content from routine_versions where user_id = auth.uid() and slot = 'pending'))
$$;
revoke all on function get_routine_versions() from public;
grant execute on function get_routine_versions() to authenticated;

create function confirm_routine_version(p_owner_id uuid, p_state jsonb, p_proposal jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare previous jsonb; pending jsonb; active jsonb;
begin
  if p_owner_id is distinct from auth.uid() or p_owner_id is null then raise exception 'Routine owner mismatch'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text, 0));
  select content into active from routine_versions where user_id = p_owner_id and slot = 'active';
  select content into pending from routine_versions where user_id = p_owner_id and slot = 'pending';
  if active->>'id' = p_proposal->'version'->>'id' or pending->>'id' = p_proposal->'version'->>'id' then
    if (case when active->>'id' = p_proposal->'version'->>'id' then active else pending end)->>'sourceId'
      is distinct from p_proposal->'version'->>'sourceId' then raise exception 'A identidade da importação já foi usada'; end if;
    return;
  end if;
  if (p_proposal->>'startsAt')::timestamptz < now() and
    (p_proposal->>'startsAt')::timestamptz <> (p_proposal->>'proposedAt')::timestamptz then
    raise exception 'Prévia expirada'; end if;
  if p_proposal->'version'->>'timezone' is distinct from p_state->'pending'->>'timezone' and
     p_state->'pending' is not null then raise exception 'Prévia expirada: fuso mudou'; end if;
  if pending is not null and (pending->>'startsAt')::timestamptz <= now() then
    active := pending;
    pending := null;
  end if;
  if active->>'id' is distinct from p_proposal->>'activeId' or pending->>'id' is distinct from p_proposal->>'pendingId' then
    raise exception 'Prévia expirada: versão mudou'; end if;
  if (p_proposal->>'startsAt')::timestamptz > now() and
     p_state->'pending'->>'id' is distinct from p_proposal->'version'->>'id' then
    raise exception 'Prévia expirada: conteúdo mudou'; end if;
  if (p_proposal->>'replaces') is distinct from (case when (p_proposal->>'startsAt')::timestamptz <= now() then active->>'id' else pending->>'id' end)
    then raise exception 'Prévia expirada: versão mudou'; end if;
  if (p_proposal->>'startsAt')::timestamptz <= now() then active := p_proposal->'version'; pending := null;
  else pending := p_proposal->'version'; end if;
  if active is null then delete from routine_versions where user_id = p_owner_id and slot = 'active';
  else insert into routine_versions(user_id,slot,version_id,starts_at,timezone,content)
    values(p_owner_id,'active',active->>'id',(active->>'startsAt')::timestamptz,active->>'timezone',active)
    on conflict (user_id,slot) do update set version_id=excluded.version_id,starts_at=excluded.starts_at,timezone=excluded.timezone,content=excluded.content; end if;
  if pending is null then delete from routine_versions where user_id = p_owner_id and slot = 'pending';
  else insert into routine_versions(user_id,slot,version_id,starts_at,timezone,content)
    values(p_owner_id,'pending',pending->>'id',(pending->>'startsAt')::timestamptz,pending->>'timezone',pending)
    on conflict (user_id,slot) do update set version_id=excluded.version_id,starts_at=excluded.starts_at,timezone=excluded.timezone,content=excluded.content; end if;
end $$;
revoke all on function confirm_routine_version(uuid,jsonb,jsonb) from public;
grant execute on function confirm_routine_version(uuid,jsonb,jsonb) to authenticated;

create function edit_routine_version(p_owner_id uuid, p_viewed_id text, p_version jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare existing routine_versions%rowtype;
begin
  if p_owner_id is distinct from auth.uid() or p_owner_id is null then raise exception 'Routine owner mismatch'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text, 0));
  select * into existing from routine_versions where user_id = p_owner_id and version_id = p_viewed_id for update;
  if not found then raise exception 'Versão visualizada não encontrada'; end if;
  if existing.slot = 'pending' and existing.starts_at <= now() then raise exception 'Prévia expirada'; end if;
  if p_version->>'id' is distinct from p_viewed_id or p_version->>'anchorDay' is distinct from existing.content->>'anchorDay' or
    p_version->>'anchorTime' is distinct from existing.content->>'anchorTime' then raise exception 'Âncora não pode mudar'; end if;
  update routine_versions set content = p_version where user_id = p_owner_id and slot = existing.slot;
end $$;
revoke all on function edit_routine_version(uuid,text,jsonb) from public;
grant execute on function edit_routine_version(uuid,text,jsonb) to authenticated;

create function reschedule_pending_routine(p_owner_id uuid, p_version jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_owner_id is distinct from auth.uid() or p_owner_id is null then raise exception 'Routine owner mismatch'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text, 0));
  update routine_versions set starts_at = (p_version->>'startsAt')::timestamptz,
    timezone = p_version->>'timezone', content = p_version
  where user_id = p_owner_id and slot = 'pending' and version_id = p_version->>'id' and starts_at > now();
  if not found then raise exception 'Prévia expirada'; end if;
end $$;
revoke all on function reschedule_pending_routine(uuid,jsonb) from public;
grant execute on function reschedule_pending_routine(uuid,jsonb) to authenticated;
