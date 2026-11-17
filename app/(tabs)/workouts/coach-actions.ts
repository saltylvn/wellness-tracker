"use server";

import { revalidatePath } from "next/cache";
import { currentUserId, INVALID_DATE, SAVE_FAILED, SIGN_IN_AGAIN, type ActionResult } from "@/lib/actionResult";
import { isValidDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

// Thumbs up or down on one of your coach's notes. The database only lets you rate your own.
export async function rateCoachNote(input: {
  kind: "daily" | "weekly";
  forDate: string;
  feedback: "up" | "down";
}): Promise<ActionResult> {
  // Never trust the browser: check everything it sent.
  if (input.kind !== "daily" && input.kind !== "weekly") return { ok: false, message: "Unknown note." };
  if (input.feedback !== "up" && input.feedback !== "down") return { ok: false, message: "Pick 👍 or 👎." };
  if (!isValidDateKey(input.forDate)) return INVALID_DATE;

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return SIGN_IN_AGAIN;

  const { data, error } = await supabase.rpc("rate_coach_note", {
    p_kind: input.kind,
    p_for_date: input.forDate,
    p_feedback: input.feedback,
  });
  if (error || data !== true) return SAVE_FAILED;

  revalidatePath("/workouts");
  return { ok: true };
}
