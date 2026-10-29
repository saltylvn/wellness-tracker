-- Cardio plan targets in other units: a planned run, ride or swim can have its target in
-- miles, kilometers, meters, yards (swims) or minutes. The number stays in
-- cardio_plan_distance; this says what it's in (empty = miles, or yards for a swim).
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.workout_days
  add column if not exists cardio_plan_unit text
    check (cardio_plan_unit is null or cardio_plan_unit in ('mi', 'km', 'm', 'yd', 'min'));

-- Tell Supabase's API about the new column straight away.
notify pgrst, 'reload schema';
