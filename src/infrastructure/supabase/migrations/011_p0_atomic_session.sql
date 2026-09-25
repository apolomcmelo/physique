create function save_session_atomically(p_session jsonb, p_sets jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare performed_set jsonb; session_id uuid := (p_session->>'id')::uuid;
begin
  if auth.uid() is null or p_session->>'user_id' is distinct from auth.uid()::text then
    raise exception 'Session owner mismatch';
  end if;
  if jsonb_typeof(p_sets) is distinct from 'array' then raise exception 'Sets must be an array'; end if;
  if (p_session->>'workout_id') is null and not exists (
    select 1 from workout_sessions where id = session_id and user_id = auth.uid()
  ) then raise exception 'New session requires a workout'; end if;
  if exists (select 1 from workout_sessions where id = session_id and user_id = auth.uid()) then
    update workout_sessions set finished_at = (p_session->>'finished_at')::timestamptz
    where id = session_id and user_id = auth.uid();
    if not found then raise exception 'Session not found for account'; end if;
  else
  insert into workout_sessions (id, workout_id, started_at, finished_at, user_id)
  values (session_id, (p_session->>'workout_id')::uuid, (p_session->>'started_at')::timestamptz,
    (p_session->>'finished_at')::timestamptz, auth.uid());
  end if;
  for performed_set in select value from jsonb_array_elements(p_sets) loop
    if performed_set->>'session_id' is distinct from p_session->>'id' then raise exception 'Set session mismatch'; end if;
    insert into completed_sets (id, session_id, exercise_id, set_number, reps_completed,
      weight_used_kg, completed_at, user_id)
    values ((performed_set->>'id')::uuid, session_id, (performed_set->>'exercise_id')::uuid,
      (performed_set->>'set_number')::integer, (performed_set->>'reps_completed')::integer,
      (performed_set->>'weight_used_kg')::numeric, (performed_set->>'completed_at')::timestamptz, auth.uid())
    on conflict (id) do update set reps_completed = excluded.reps_completed,
      weight_used_kg = excluded.weight_used_kg, completed_at = excluded.completed_at
    where completed_sets.user_id = auth.uid();
    if not found then raise exception 'Set not found for account'; end if;
  end loop;
end $$;
revoke all on function save_session_atomically(jsonb, jsonb) from public;
grant execute on function save_session_atomically(jsonb, jsonb) to authenticated;

-- RLS must also reject direct writes that join a session/set to a different
-- account's parent, even when the child row claims the caller's user_id.
create or replace function enforce_session_parent_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'Session owner mismatch';
  end if;
  if tg_op = 'INSERT' and new.workout_id is not null and not exists
    (select 1 from workouts where id = new.workout_id and user_id = new.user_id) then
    raise exception 'Session workout owner mismatch';
  end if;
  return new;
end $$;
create trigger enforce_session_parent_owner before insert or update on workout_sessions
for each row execute function enforce_session_parent_owner();

create or replace function enforce_set_parent_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'Set owner mismatch';
  end if;
  if not exists (select 1 from workout_sessions where id = new.session_id and user_id = new.user_id) then
    raise exception 'Set session owner mismatch';
  end if;
  if exists (select 1 from exercises where id = new.exercise_id and
    workout_id <> (select workout_id from workout_sessions where id = new.session_id)) then
    raise exception 'Set exercise belongs to another workout';
  end if;
  return new;
end $$;
create trigger enforce_set_parent_owner before insert or update on completed_sets
for each row execute function enforce_set_parent_owner();
