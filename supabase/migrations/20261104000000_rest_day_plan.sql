-- Rest day plans and a weekly walking goal.
--   1. On Edit plan, a rest day can get an easy recovery activity (walk, bike ride or yoga) and
--      an optional target (miles for a walk or ride, minutes for yoga), shown on the day like a
--      cardio day's plan, with a Completed box.
--   2. Completing it logs it in cardio_logs: a walk as 'walk' (miles, toward the new weekly
--      walking goal), a bike ride as 'cycle' (toward the cycling goal), yoga as 'yoga' (minutes).
--   3. A weekly walking goal in miles (Settings), next to run, cycle and swim.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.workout_days
  add column if not exists rest_plan_activity text
    check (rest_plan_activity is null or rest_plan_activity in ('walk', 'bike', 'yoga')),
  add column if not exists rest_plan_target numeric(6, 2)
    check (rest_plan_target is null or (rest_plan_target > 0 and rest_plan_target <= 1440));

-- Let cardio_logs hold walks and yoga too. The old rule is found by what it checks, not its name.
do $$
declare
  rule record;
begin
  for rule in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.cardio_logs'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%kind%'
  loop
    execute format('alter table public.cardio_logs drop constraint %I', rule.conname);
  end loop;
end $$;

alter table public.cardio_logs
  add constraint cardio_logs_kind_check check (kind in ('run', 'cycle', 'swim', 'walk', 'yoga'));

-- Your weekly walking goal in miles (blank = no goal).
alter table public.profiles
  add column if not exists weekly_walk_miles numeric(6, 2)
    check (weekly_walk_miles is null or (weekly_walk_miles > 0 and weekly_walk_miles <= 500));

-- Let the app see the new columns straight away.
notify pgrst, 'reload schema';
