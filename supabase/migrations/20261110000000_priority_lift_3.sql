-- A third priority lift (Settings → Priority lifts), next to priority_lift_1 / _2.
-- Same rule as the first two: blank (null) or 1-80 characters.
alter table public.profiles
  add column if not exists priority_lift_3 text
  check (priority_lift_3 is null or char_length(priority_lift_3) between 1 and 80);

-- The shared recruiter demo shows a third of its sample lifts.
update public.profiles
set priority_lift_3 = 'Incline press'
where id in (select id from auth.users where lower(email) = 'demo@example.com');

notify pgrst, 'reload schema';
