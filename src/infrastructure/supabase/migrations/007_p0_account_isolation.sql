-- Revoke the permissive exercise policy left by 001. Ownership is inherited
-- through its parent workout, including INSERT and re-parenting on UPDATE.
drop policy if exists "allow_all_exercises" on exercises;
-- Do not trust legacy exercises whose parent has no owner. They remain stored
-- but are invisible to authenticated users until ownership is reconciled.
create policy "exercises_owner_select" on exercises for select to authenticated
using (exists (select 1 from workouts where workouts.id = exercises.workout_id and workouts.user_id = auth.uid()));
create policy "exercises_owner_insert" on exercises for insert to authenticated
with check (exists (select 1 from workouts where workouts.id = exercises.workout_id and workouts.user_id = auth.uid()));
create policy "exercises_owner_update" on exercises for update to authenticated
using (exists (select 1 from workouts where workouts.id = exercises.workout_id and workouts.user_id = auth.uid()))
with check (exists (select 1 from workouts where workouts.id = exercises.workout_id and workouts.user_id = auth.uid()));
create policy "exercises_owner_delete" on exercises for delete to authenticated
using (exists (select 1 from workouts where workouts.id = exercises.workout_id and workouts.user_id = auth.uid()));

-- Public bucket delivery bypasses per-object read policies. Existing object
-- paths remain unchanged; previously issued public URLs cease to resolve.
update storage.buckets set public = false where id in ('exams', 'photos');
