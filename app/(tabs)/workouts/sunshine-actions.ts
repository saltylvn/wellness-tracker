"use server";

import { revalidatePath } from "next/cache";
import { currentUserId, failedSave, INVALID_DATE, SAVE_FAILED, SIGN_IN_AGAIN, type ActionResult } from "@/lib/actionResult";
import { isValidDateKey } from "@/lib/dates";
import { DATABASE_BEHIND_MESSAGE, isCheckViolation } from "@/lib/dbErrors";
import { MAX_SUNSHINE_MINUTES, MIN_SUNSHINE_MINUTES, parseSunshineMinutes } from "@/lib/sunshine";
import { createClient } from "@/lib/supabase/server";

// Saves the sunshine minutes for a day (any day). Logging again on the same day replaces them.
// Stored in the tanning_logs table (its old name).
export async function saveSunshine(input: { date: string; minutes: number }): Promise<ActionResult> {
  // Never trust the browser: check everything it sent.
  if (!isValidDateKey(input.date)) return INVALID_DATE;
  const minutes = parseSunshineMinutes(input.minutes);
  if (minutes === null) return { ok: false, message: `Pick ${MIN_SUNSHINE_MINUTES} to ${MAX_SUNSHINE_MINUTES} minutes.` };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return SIGN_IN_AGAIN;

  const { error } = await supabase
    .from("tanning_logs")
    .upsert({ user_id: userId, log_date: input.date, minutes }, { onConflict: "user_id,log_date" });
  // Over 15 minutes is refused until the sunshine SQL step (which allows up to 60) is run.
  if (error) return isCheckViolation(error) ? { ok: false, message: DATABASE_BEHIND_MESSAGE } : failedSave(error);

  revalidatePath("/workouts");
  return { ok: true };
}

export async function deleteSunshine(date: string): Promise<ActionResult> {
  if (!isValidDateKey(date)) return INVALID_DATE;

  const supabase = await createClient();
  // Row Level Security means this can only ever delete your own log.
  const { error } = await supabase.from("tanning_logs").delete().eq("log_date", date);
  if (error) return SAVE_FAILED;

  revalidatePath("/workouts");
  return { ok: true };
}
