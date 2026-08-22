-- ============================================================
-- 002 – Google auth + per-user data isolation
-- ============================================================

-- This migration assumes the app is in pre-release and the existing data can be reset safely.
-- If you need to keep records, backfill them to one legacy user before enforcing non-null constraints.

-- 1) Ensure user_profiles is linked to auth.users
alter table if exists user_profiles
add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- Optional cleanup for pre-release data:
-- update user_profiles set user_id = auth.uid() where user_id is null;
-- The safe production choice is to wipe the table when the app is still pre-release.

-- If you want to recreate a clean profile table, use a full reset as a one-off.
-- For a simple migration, keep this as a nullable step until backfill is done.

-- 2) Add user_id to all user-owned tables.
alter table if exists workouts
add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table if exists workout_sessions
add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table if exists completed_sets
add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table if exists meal_plan_entries
add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table if exists weight_records
add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table if exists exams
add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table if exists body_photos
add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table if exists food_items
add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- 3) Replace permissive policies with user-scoped policies.
-- user_profiles
DROP POLICY IF EXISTS "allow_all_user_profiles" ON user_profiles;

CREATE POLICY "user_profiles_owner_all" ON user_profiles FOR ALL USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- workouts
DROP POLICY IF EXISTS "allow_all_workouts" ON workouts;

CREATE POLICY "workouts_owner_all" ON workouts FOR ALL USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- workout_sessions
DROP POLICY IF EXISTS "allow_all_workout_sessions" ON workout_sessions;

CREATE POLICY "workout_sessions_owner_all" ON workout_sessions FOR ALL USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- completed_sets
DROP POLICY IF EXISTS "allow_all_completed_sets" ON completed_sets;

CREATE POLICY "completed_sets_owner_all" ON completed_sets FOR ALL USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- meal_plan_entries
DROP POLICY IF EXISTS "allow_all_meal_plan_entries" ON meal_plan_entries;

CREATE POLICY "meal_plan_entries_owner_all" ON meal_plan_entries FOR ALL USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- weight_records
DROP POLICY IF EXISTS "allow_all_weight_records" ON weight_records;

CREATE POLICY "weight_records_owner_all" ON weight_records FOR ALL USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- exams
DROP POLICY IF EXISTS "allow_all_exams" ON exams;

CREATE POLICY "exams_owner_all" ON exams FOR ALL USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- body_photos
DROP POLICY IF EXISTS "allow_all_body_photos" ON body_photos;

CREATE POLICY "body_photos_owner_all" ON body_photos FOR ALL USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- food_items
DROP POLICY IF EXISTS "allow_all_food_items" ON food_items;

CREATE POLICY "food_items_owner_all" ON food_items FOR ALL USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- 4) Storage recommendation
-- Move uploads to: exams/{user_id}/timestamp_filename and body-photos/{user_id}/...
-- Enforce storage policies using auth.uid() matching the path prefix.
-- Prefer signed URLs, not public URLs, for exam documents.