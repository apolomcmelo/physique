-- Performed timed sets and explicit partial/completed session state.
alter table completed_sets add column duration_seconds integer
  check (duration_seconds is null or duration_seconds >= 0);
alter table workout_sessions add column status text not null default 'active'
  check (status in ('active', 'complete', 'partial'));
update workout_sessions set status = 'complete' where finished_at is not null;

create or replace function save_session_atomically(p_session jsonb, p_sets jsonb)
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
    update workout_sessions set started_at = (p_session->>'started_at')::timestamptz,
      finished_at = (p_session->>'finished_at')::timestamptz,
      status = coalesce(p_session->>'status', 'active')
    where id = session_id and user_id = auth.uid();
    if not found then raise exception 'Session not found for account'; end if;
  else
    insert into workout_sessions (id, workout_id, started_at, finished_at, status, user_id)
    values (session_id, (p_session->>'workout_id')::uuid, (p_session->>'started_at')::timestamptz,
      (p_session->>'finished_at')::timestamptz, coalesce(p_session->>'status', 'active'), auth.uid());
  end if;
  for performed_set in select value from jsonb_array_elements(p_sets) loop
    if performed_set->>'session_id' is distinct from p_session->>'id' then raise exception 'Set session mismatch'; end if;
    insert into completed_sets (id, session_id, exercise_id, set_number, reps_completed,
      weight_used_kg, duration_seconds, completed_at, user_id)
    values ((performed_set->>'id')::uuid, session_id, (performed_set->>'exercise_id')::uuid,
      (performed_set->>'set_number')::integer, (performed_set->>'reps_completed')::integer,
      (performed_set->>'weight_used_kg')::numeric, (performed_set->>'duration_seconds')::integer,
      (performed_set->>'completed_at')::timestamptz, auth.uid())
    on conflict (id) do update set reps_completed = excluded.reps_completed,
      weight_used_kg = excluded.weight_used_kg, duration_seconds = excluded.duration_seconds,
      completed_at = excluded.completed_at where completed_sets.user_id = auth.uid();
    if not found then raise exception 'Set not found for account'; end if;
  end loop;
end $$;
