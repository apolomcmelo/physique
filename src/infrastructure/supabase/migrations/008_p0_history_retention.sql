-- Snapshot names and prescriptions before unlinking historical sessions.
alter table workout_sessions add column workout_name text;
alter table completed_sets add column exercise_name text;
alter table completed_sets add column prescribed_reps integer;
alter table completed_sets add column prescribed_weight_kg numeric;
alter table completed_sets add column prescribed_duration_seconds integer;
alter table workout_sessions add column workout_type text;
alter table workout_sessions add column workout_scheduled_at timestamptz;
alter table completed_sets add column prescribed_sets integer;
alter table completed_sets add column exercise_notes text;
alter table completed_sets add column exercise_order_index integer;
alter table completed_sets add column prescribed_rest_between_sets integer;
alter table completed_sets add column prescribed_rest_before_next_exercise integer;
update workout_sessions s set workout_name = w.name, workout_type = w.type,
workout_scheduled_at = w.scheduled_at from workouts w where s.workout_id = w.id;
update completed_sets s set exercise_name = e.name, prescribed_reps = e.reps_per_set,
prescribed_weight_kg = e.weight_kg, prescribed_duration_seconds = e.duration_seconds,
prescribed_sets = e.sets, exercise_notes = e.notes, exercise_order_index = e.order_index,
prescribed_rest_between_sets = e.rest_seconds_between_sets,
prescribed_rest_before_next_exercise = e.rest_seconds_before_next_exercise
from exercises e where s.exercise_id = e.id;
-- A legacy exercise might already have been deleted by an earlier edit.
-- Keep its UUID as context rather than fabricating its lost prescription.
-- Verify orphan/null-owner counts and reconcile ownership in a test database
-- before running this migration against any database with real records.

-- Keep the original UUID as historical context; it is no longer a foreign key.
alter table workout_sessions drop constraint workout_sessions_workout_id_fkey;

-- Backfill remaining legacy snapshots before any model can be removed.
create or replace function snapshot_workout_session() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.workout_name is null then
    select name, type, scheduled_at into new.workout_name, new.workout_type,
      new.workout_scheduled_at from workouts where id = new.workout_id;
  end if;
  if tg_op = 'UPDATE' then
    new.workout_name := old.workout_name;
    new.workout_type := old.workout_type;
    new.workout_scheduled_at := old.workout_scheduled_at;
    new.workout_id := old.workout_id;
    new.user_id := old.user_id;
  end if;
  return new;
end $$;
create trigger snapshot_workout_session before insert or update on workout_sessions
for each row execute function snapshot_workout_session();

create or replace function snapshot_completed_set() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.exercise_name is null then
    select name, reps_per_set, weight_kg, duration_seconds, sets, notes, order_index,
      rest_seconds_between_sets, rest_seconds_before_next_exercise into
      new.exercise_name, new.prescribed_reps, new.prescribed_weight_kg, new.prescribed_duration_seconds,
      new.prescribed_sets, new.exercise_notes, new.exercise_order_index,
      new.prescribed_rest_between_sets, new.prescribed_rest_before_next_exercise
    from exercises where id = new.exercise_id;
  end if;
  if tg_op = 'UPDATE' then
    new.exercise_name := old.exercise_name;
    new.prescribed_reps := old.prescribed_reps;
    new.prescribed_weight_kg := old.prescribed_weight_kg;
    new.prescribed_duration_seconds := old.prescribed_duration_seconds;
    new.prescribed_sets := old.prescribed_sets;
    new.exercise_notes := old.exercise_notes;
    new.exercise_order_index := old.exercise_order_index;
    new.prescribed_rest_between_sets := old.prescribed_rest_between_sets;
    new.prescribed_rest_before_next_exercise := old.prescribed_rest_before_next_exercise;
    new.exercise_id := old.exercise_id;
    new.session_id := old.session_id;
    new.user_id := old.user_id;
  end if;
  return new;
end $$;
create trigger snapshot_completed_set before insert or update on completed_sets
for each row execute function snapshot_completed_set();

-- Existing sessions receive snapshots on migration; later exercise edits must
-- not rewrite what was prescribed when the historical set was recorded.
