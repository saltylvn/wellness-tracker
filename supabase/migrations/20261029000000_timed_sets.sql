-- Timed sets: on the Fitness tab, a set can be logged as a time (planks, wall sits...)
-- instead of weight × reps. A timed set saves only its seconds; weight and reps stay empty.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.workout_sets
  add column duration_seconds integer
    check (duration_seconds is null or duration_seconds between 1 and 7200);
