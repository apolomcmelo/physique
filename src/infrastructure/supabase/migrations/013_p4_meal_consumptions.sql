create table meal_consumptions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  planned_meal_id text,
  activity text not null,
  description text not null,
  notes text,
  status text not null check (status in ('consumed', 'skipped')),
  recorded_at timestamptz not null
);

create index meal_consumptions_owner_recorded_at
  on meal_consumptions (user_id, recorded_at desc);

alter table meal_consumptions enable row level security;
create policy "meal_consumptions_owner_all" on meal_consumptions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
