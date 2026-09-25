-- Each RPC call is one PostgreSQL transaction. Invalid child rows roll back
-- the parent update and all child changes together.
create function save_workout_atomically(p_workout jsonb, p_exercises jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  exercise jsonb;
  owner uuid := auth.uid();
begin
  if owner is null or p_workout->>'user_id' is distinct from owner::text then
    raise exception 'Workout owner mismatch';
  end if;
  if jsonb_typeof(p_exercises) is distinct from 'array' then raise exception 'Exercises must be an array'; end if;
  perform 1 from workouts where id = (p_workout->>'id')::uuid and user_id = owner for update;
  update workouts set name = p_workout->>'name', type = p_workout->>'type',
    scheduled_at = (p_workout->>'scheduled_at')::timestamptz,
    updated_at = (p_workout->>'updated_at')::timestamptz
  where id = (p_workout->>'id')::uuid and user_id = owner;
  if not found then raise exception 'Workout not found for account'; end if;

  for exercise in select value from jsonb_array_elements(p_exercises) loop
    if exercise->>'workout_id' is distinct from p_workout->>'id' then
      raise exception 'Exercise workout mismatch';
    end if;
  end loop;
  -- Existing IDs are retained; change only the rows that differ so a session
  -- recorded against an exercise does not lose its model on ordinary edits.
  delete from exercises where workout_id = (p_workout->>'id')::uuid
    and id not in (select (value->>'id')::uuid from jsonb_array_elements(p_exercises));
  for exercise in select value from jsonb_array_elements(p_exercises) loop
    insert into exercises (id, workout_id, name, order_index, sets, reps_per_set,
      weight_kg, duration_seconds, rest_seconds_between_sets,
      rest_seconds_before_next_exercise, notes)
    values ((exercise->>'id')::uuid, (p_workout->>'id')::uuid, exercise->>'name',
      (exercise->>'order_index')::integer, (exercise->>'sets')::integer,
      (exercise->>'reps_per_set')::integer, (exercise->>'weight_kg')::numeric,
      (exercise->>'duration_seconds')::integer,
      (exercise->>'rest_seconds_between_sets')::integer,
      (exercise->>'rest_seconds_before_next_exercise')::integer, exercise->>'notes')
    on conflict (id) do update set name = excluded.name, order_index = excluded.order_index,
      sets = excluded.sets, reps_per_set = excluded.reps_per_set, weight_kg = excluded.weight_kg,
      duration_seconds = excluded.duration_seconds,
      rest_seconds_between_sets = excluded.rest_seconds_between_sets,
      rest_seconds_before_next_exercise = excluded.rest_seconds_before_next_exercise,
      notes = excluded.notes where exercises.workout_id = (p_workout->>'id')::uuid;
    if not found then raise exception 'Exercise belongs to another workout'; end if;
  end loop;
end $$;
revoke all on function save_workout_atomically(jsonb, jsonb) from public;
grant execute on function save_workout_atomically(jsonb, jsonb) to authenticated;

create function create_workout_atomically(p_workout jsonb, p_exercises jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare exercise jsonb;
begin
  if auth.uid() is null or p_workout->>'user_id' is distinct from auth.uid()::text then
    raise exception 'Workout owner mismatch';
  end if;
  if jsonb_typeof(p_exercises) is distinct from 'array' then raise exception 'Exercises must be an array'; end if;
  insert into workouts (id, name, type, scheduled_at, created_at, updated_at, user_id)
  values ((p_workout->>'id')::uuid, p_workout->>'name', p_workout->>'type',
    (p_workout->>'scheduled_at')::timestamptz, (p_workout->>'created_at')::timestamptz,
    (p_workout->>'updated_at')::timestamptz, auth.uid());
  for exercise in select value from jsonb_array_elements(p_exercises) loop
    if exercise->>'workout_id' is distinct from p_workout->>'id' then raise exception 'Exercise workout mismatch'; end if;
    insert into exercises (id, workout_id, name, order_index, sets, reps_per_set,
      weight_kg, duration_seconds, rest_seconds_between_sets,
      rest_seconds_before_next_exercise, notes)
    values ((exercise->>'id')::uuid, (p_workout->>'id')::uuid, exercise->>'name',
      (exercise->>'order_index')::integer, (exercise->>'sets')::integer,
      (exercise->>'reps_per_set')::integer, (exercise->>'weight_kg')::numeric,
      (exercise->>'duration_seconds')::integer,
      (exercise->>'rest_seconds_between_sets')::integer,
      (exercise->>'rest_seconds_before_next_exercise')::integer, exercise->>'notes');
  end loop;
end $$;
revoke all on function create_workout_atomically(jsonb, jsonb) from public;
grant execute on function create_workout_atomically(jsonb, jsonb) to authenticated;
