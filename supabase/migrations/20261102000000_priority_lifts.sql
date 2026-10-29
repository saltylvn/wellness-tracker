-- Priority lifts: up to two exercises you're focusing on, picked in Settings and shown as
-- two small boxes at the top of every lifting day. Saved by exercise name.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.profiles
  add column if not exists priority_lift_1 text
    check (priority_lift_1 is null or char_length(priority_lift_1) between 1 and 80),
  add column if not exists priority_lift_2 text
    check (priority_lift_2 is null or char_length(priority_lift_2) between 1 and 80);

-- The shared recruiter demo shows two of its sample lifts.
update public.profiles
set priority_lift_1 = 'Squats', priority_lift_2 = 'Deadlift'
where id in (select id from auth.users where lower(email) = 'demo@example.com');

-- Let the app see the new columns straight away.
notify pgrst, 'reload schema';
