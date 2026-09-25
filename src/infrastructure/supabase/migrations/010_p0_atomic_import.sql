create table plan_imports (
  user_id uuid not null references auth.users(id),
  import_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, import_id)
);
alter table plan_imports enable row level security;
create policy "plan_imports_owner" on plan_imports for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create function import_plan_atomically(p_import_id text, p_meals jsonb, p_workouts jsonb, p_owner_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare meal jsonb; workout jsonb; exercise jsonb; workout_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_owner_id then raise exception 'Import owner mismatch'; end if;
  if p_import_id is null or length(p_import_id) = 0 then raise exception 'Import ID required'; end if;
  if jsonb_typeof(p_meals) is distinct from 'array' or jsonb_typeof(p_workouts) is distinct from 'array' then
    raise exception 'Import entries must be arrays'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text, 0));
  insert into plan_imports (user_id, import_id) values (p_owner_id, p_import_id)
  on conflict do nothing;
  if not found then return; end if;

  for meal in select value from jsonb_array_elements(p_meals) loop
    insert into meal_plan_entries (id, day, time, activity, description, biological_objective, user_id)
    values ((meal->>'id')::uuid, meal->>'day', meal->>'time', meal->>'activity',
      meal->>'description', meal->>'biological_objective', p_owner_id);
  end loop;
  for workout in select value from jsonb_array_elements(p_workouts) loop
    workout_id := (workout->>'id')::uuid;
    insert into workouts (id, name, type, scheduled_at, created_at, updated_at, user_id)
    values (workout_id, workout->>'name', workout->>'type', (workout->>'scheduled_at')::timestamptz,
      (workout->>'created_at')::timestamptz, (workout->>'updated_at')::timestamptz, p_owner_id);
    for exercise in select value from jsonb_array_elements(workout->'exercises') loop
      insert into exercises (id, workout_id, name, sets, reps_per_set, weight_kg,
        duration_seconds, order_index, rest_seconds_between_sets,
        rest_seconds_before_next_exercise, notes)
      values ((exercise->>'id')::uuid, workout_id, exercise->>'name',
        (exercise->>'sets')::integer, (exercise->>'reps_per_set')::integer,
        (exercise->>'weight_kg')::numeric, (exercise->>'duration_seconds')::integer,
        (exercise->>'order_index')::integer,
        (exercise->>'rest_seconds_between_sets')::integer,
        (exercise->>'rest_seconds_before_next_exercise')::integer, exercise->>'notes');
    end loop;
  end loop;
end $$;
revoke all on function import_plan_atomically(text, jsonb, jsonb, uuid) from public;
grant execute on function import_plan_atomically(text, jsonb, jsonb, uuid) to authenticated;
