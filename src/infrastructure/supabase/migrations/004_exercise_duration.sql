-- ============================================================
-- 004 – Exercise duration for time-based sets
-- ============================================================

alter table if exists exercises
add column if not exists duration_seconds integer;