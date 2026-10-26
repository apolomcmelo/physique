create table weight_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_weight_kg numeric not null check (target_weight_kg > 0),
  started_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table weight_records alter column weight_kg drop not null;
alter table weight_records add constraint weight_records_at_least_one_measurement
  check (weight_kg is not null or body_fat_percentage is not null or protein_percentage is not null);
alter table user_profiles alter column current_weight_kg drop not null;

drop policy if exists "allow_all_weight_records" on weight_records;
drop policy if exists "weight_records_owner_all" on weight_records;
create policy "weight_records_owner_all" on weight_records for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index weight_goals_owner_start_idx on weight_goals (user_id, started_at desc);
alter table weight_goals enable row level security;
create policy "weight_goals_owner_all" on weight_goals for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into weight_goals (user_id, target_weight_kg, started_at, created_at)
select user_id, goal_weight_kg, created_at, created_at
from user_profiles
where user_id is not null
  and not exists (
    select 1 from weight_goals where weight_goals.user_id = user_profiles.user_id
  );

insert into weight_records (
  user_id, weight_kg, body_fat_percentage, protein_percentage, recorded_at, created_at
)
select profile.user_id,
       case when not exists (
         select 1 from weight_records where weight_records.user_id = profile.user_id and weight_kg is not null
       ) then profile.current_weight_kg else null end,
       case when not exists (
         select 1 from weight_records where weight_records.user_id = profile.user_id and body_fat_percentage is not null
       ) then profile.body_fat_percentage else null end,
       case when not exists (
         select 1 from weight_records where weight_records.user_id = profile.user_id and protein_percentage is not null
       ) then profile.protein_percentage else null end,
       profile.created_at, profile.created_at
from user_profiles as profile
where profile.user_id is not null
  and (
    (profile.current_weight_kg is not null and not exists (
      select 1 from weight_records where weight_records.user_id = profile.user_id and weight_kg is not null
    ))
    or (profile.body_fat_percentage is not null and not exists (
      select 1 from weight_records where weight_records.user_id = profile.user_id and body_fat_percentage is not null
    ))
    or (profile.protein_percentage is not null and not exists (
      select 1 from weight_records where weight_records.user_id = profile.user_id and protein_percentage is not null
    ))
  );
