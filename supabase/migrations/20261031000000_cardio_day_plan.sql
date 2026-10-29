-- Cardio day plans: on Edit plan, a cardio day (or a lifting and cardio day) can be planned
-- ahead of time with which of the three to do and, optionally, a target distance. On the
-- day, a "Completed" box logs it. Run and cycle distances are miles; swim is yards.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.workout_days
  add column if not exists cardio_plan_kind text
    check (cardio_plan_kind is null or cardio_plan_kind in ('run', 'cycle', 'swim')),
  add column if not exists cardio_plan_distance numeric(8, 2)
    check (cardio_plan_distance is null or (cardio_plan_distance > 0 and cardio_plan_distance <= 100000));
