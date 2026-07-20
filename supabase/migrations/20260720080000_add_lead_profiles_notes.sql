-- User-editable notes field for the lead detail drawer. Not part of the
-- Step 1 schema spec, but needed for the explicitly requested editable
-- "Notes field" in the lead detail view.
alter table public.lead_profiles add column notes text;
