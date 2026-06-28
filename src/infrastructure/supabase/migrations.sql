-- ============================================================
-- Physique – Supabase migrations
-- ============================================================

-- user_profiles
create table if not exists user_profiles (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  age                  integer not null,
  height_cm            numeric not null,
  current_weight_kg    numeric not null,
  goal_weight_kg       numeric not null,
  body_fat_percentage  numeric,
  protein_percentage   numeric,
  objective            text not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table user_profiles enable row level security;
create policy "allow_all_user_profiles" on user_profiles for all using (true) with check (true);

-- workouts
create table if not exists workouts (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text not null check (type in ('HIT', 'Calisthenics', 'Weightlifting')),
  scheduled_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table workouts enable row level security;
create policy "allow_all_workouts" on workouts for all using (true) with check (true);

-- exercises
create table if not exists exercises (
  id           uuid primary key default gen_random_uuid(),
  workout_id   uuid not null references workouts (id) on delete cascade,
  name         text not null,
  sets         integer,
  reps_per_set integer,
  weight_kg    numeric,
  notes        text,
  created_at   timestamptz not null default now()
);

alter table exercises enable row level security;
create policy "allow_all_exercises" on exercises for all using (true) with check (true);

-- workout_sessions
create table if not exists workout_sessions (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references workouts (id),
  started_at  timestamptz not null,
  finished_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table workout_sessions enable row level security;
create policy "allow_all_workout_sessions" on workout_sessions for all using (true) with check (true);

-- completed_sets
create table if not exists completed_sets (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references workout_sessions (id) on delete cascade,
  exercise_id     uuid not null,
  set_number      integer not null,
  reps_completed  integer not null,
  weight_used_kg  numeric,
  completed_at    timestamptz not null
);

alter table completed_sets enable row level security;
create policy "allow_all_completed_sets" on completed_sets for all using (true) with check (true);

-- meal_plan_entries
create table if not exists meal_plan_entries (
  id                   uuid primary key default gen_random_uuid(),
  day                  text not null,
  time                 text not null,
  activity             text not null,
  description          text not null,
  biological_objective text not null,
  created_at           timestamptz not null default now()
);

alter table meal_plan_entries enable row level security;
create policy "allow_all_meal_plan_entries" on meal_plan_entries for all using (true) with check (true);

-- body_photos
create table if not exists body_photos (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null,
  captured_at      timestamptz not null,
  angle            text not null check (angle in ('front', 'back', 'left', 'right')),
  file_url         text not null,
  accelerometer_x  numeric not null,
  accelerometer_y  numeric not null,
  accelerometer_z  numeric not null,
  latitude         numeric,
  longitude        numeric,
  luminosity       numeric,
  month_year       text not null,
  created_at       timestamptz not null default now()
);

alter table body_photos enable row level security;
create policy "allow_all_body_photos" on body_photos for all using (true) with check (true);

-- exams
create table if not exists exams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  title       text not null,
  file_url    text not null,
  uploaded_at timestamptz not null,
  file_type   text not null check (file_type in ('pdf', 'image')),
  created_at  timestamptz not null default now()
);

alter table exams enable row level security;
create policy "allow_all_exams" on exams for all using (true) with check (true);

-- food_items
create table if not exists food_items (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  brand_or_source     text,
  serving_size_grams  numeric not null,
  calories            numeric not null,
  protein_grams       numeric not null,
  carbs_grams         numeric not null,
  fat_grams           numeric not null,
  ingredients         text,
  raw_ocr_text        text,
  created_at          timestamptz not null default now()
);

alter table food_items enable row level security;
create policy "allow_all_food_items" on food_items for all using (true) with check (true);

-- weight_records
create table if not exists weight_records (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null,
  weight_kg            numeric not null,
  body_fat_percentage  numeric,
  protein_percentage   numeric,
  recorded_at          timestamptz not null,
  created_at           timestamptz not null default now()
);

alter table weight_records enable row level security;
create policy "allow_all_weight_records" on weight_records for all using (true) with check (true);
