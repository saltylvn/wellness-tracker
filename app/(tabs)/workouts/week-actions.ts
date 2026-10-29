"use server";

import { revalidatePath } from "next/cache";
import { currentUserId, failedSave, SIGN_IN_AGAIN, type ActionResult } from "@/lib/actionResult";
import { DATABASE_BEHIND_MESSAGE, isCheckViolation } from "@/lib/dbErrors";
import { createClient } from "@/lib/supabase/server";
import { parseWeekKinds, titleAfterChange } from "@/lib/workouts/weekSetup";
import { loadWorkoutDays } from "@/lib/workouts/seed";

// Saves which weekdays are lifting, cardio, both, or rest days. Only the days you changed are
// updated; each day keeps its exercises, so switching a day back to lifting restores them.
export async function saveWeekKinds(input: unknown): Promise<ActionResult> {
  // Never trust the browser: all seven days must be there, each lift, cardio, both, or rest.
  const week = parseWeekKinds(input);
  if (!week) return { ok: false, message: "Pick lifting, cardio, both, or rest for every day." };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return SIGN_IN_AGAIN;

  const days = await loadWorkoutDays(supabase, userId);
  const changed = days.filter((day) => week.get(day.weekday) !== day.kind);

  // Row Level Security means these updates can only ever touch your own days.
  const results = await Promise.all(
    changed.map((day) => {
      const kind = week.get(day.weekday)!;
      return supabase
        .from("workout_days")
        .update({ kind, title: titleAfterChange(kind, day.title) })
        .eq("id", day.id);
    }),
  );
  const failed = results.find((result) => result.error);
  if (failed) {
    // A lifting-and-cardio day is refused until its SQL step allows "both": say so plainly.
    if (isCheckViolation(failed.error)) return { ok: false, message: DATABASE_BEHIND_MESSAGE };
    return failedSave(failed.error);
  }

  revalidatePath("/workouts");
  return { ok: true };
}
