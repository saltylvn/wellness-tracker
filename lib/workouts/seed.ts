import type { SupabaseClient } from "@supabase/supabase-js";
import { STARTING_PLAN } from "./defaults";
import type { WorkoutDay } from "./plan";

// Adds your seven (blank) workout days the first time you open the Fitness tab. Safe to
// run twice: days that already exist are skipped, so a second run (or two requests at
// once) never duplicates anything or overwrites a plan you've set up.
export async function ensureStartingPlan(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase
    .from("workout_days")
    .upsert(
      STARTING_PLAN.map((d) => ({ user_id: userId, weekday: d.weekday, kind: d.kind, title: d.title })),
      { onConflict: "user_id,weekday", ignoreDuplicates: true },
    );
}

// Loads your seven workout days (Mon-Sun), adding the blank starting week first if this
// is your first visit.
export async function loadWorkoutDays(supabase: SupabaseClient, userId: string): Promise<WorkoutDay[]> {
  const load = async () =>
    ((await supabase.from("workout_days").select("id, weekday, kind, title").order("weekday")).data ??
      []) as WorkoutDay[];

  const days = await load();
  if (days.length > 0) return days;
  await ensureStartingPlan(supabase, userId);
  return load();
}
