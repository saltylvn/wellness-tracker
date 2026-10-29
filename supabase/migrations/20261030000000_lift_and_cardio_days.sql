-- A workout day can now be both a lifting and a cardio day ("both"), so someone can lift
-- and do cardio on the same day ("Your week" on the Fitness tab: on in both rows).
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once.

-- 1. Remove the old rule that only allowed 'lift', 'cardio' or 'rest'. It's found by what it
--    checks (the kind column), not by its name, so this works whatever the database called it.
do $$
declare
  rule record;
begin
  for rule in
    select conname from pg_constraint
    where conrelid = 'public.workout_days'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.workout_days drop constraint %I', rule.conname);
  end loop;
end $$;

-- 2. Add the new rule, which also allows 'both'.
alter table public.workout_days
  add constraint workout_days_kind_check check (kind in ('lift', 'cardio', 'both', 'rest'));
