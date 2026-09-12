-- ============================================================
-- 006 – Exercise order and interval metadata
-- ============================================================

alter table if exists exercises
add column if not exists order_index integer not null default 0,
add column if not exists rest_seconds_between_sets integer,
add column if not exists rest_seconds_before_next_exercise integer;