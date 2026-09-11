-- ============================================================
-- 005 – Cascade delete workout sessions with their workout
-- ============================================================

alter table workout_sessions
drop constraint workout_sessions_workout_id_fkey;

alter table workout_sessions
add constraint workout_sessions_workout_id_fkey foreign key (workout_id) references workouts (id) on delete cascade;