-- A workout day can now be both a lifting and a cardio day ("both"), so someone can lift
-- and do cardio on the same day ("Your week" on the Fitness tab: on in both rows).
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.workout_days drop constraint if exists workout_days_kind_check;
alter table public.workout_days
  add constraint workout_days_kind_check check (kind in ('lift', 'cardio', 'both', 'rest'));
