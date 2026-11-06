-- The profile no longer stores a time zone; routine versions keep the device time zone captured at import.
alter table user_profiles drop column if exists timezone;
