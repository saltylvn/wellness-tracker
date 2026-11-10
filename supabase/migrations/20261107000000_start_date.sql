-- Settings, Weight goal: "Starting date", the day your weight goal started. The Weight tab's
-- progress and chart start from it (blank = your first weigh-in).
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.profiles add column if not exists start_date date;

notify pgrst, 'reload schema';
