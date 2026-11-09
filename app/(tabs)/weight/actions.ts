"use server";

import { revalidatePath } from "next/cache";
import { currentUserId, failedSave, INVALID_DATE, SAVE_FAILED, SIGN_IN_AGAIN, type ActionResult } from "@/lib/actionResult";
import { isValidDateKey } from "@/lib/dates";
import { parseWeight } from "@/lib/weight";
import { createClient } from "@/lib/supabase/server";

// Saves your weigh-in for a day. Weighing in again on the same day replaces the number.
export async function saveWeight(input: { date: string; weight: number }): Promise<ActionResult> {
  // Never trust the browser: check everything it sent.
  if (!isValidDateKey(input.date)) return INVALID_DATE;
  const weight = parseWeight(input.weight);
  if (weight === null) return { ok: false, message: "Pick a weight from 70 to 500 lb." };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return SIGN_IN_AGAIN;

  const { error } = await supabase
    .from("weight_logs")
    .upsert({ user_id: userId, log_date: input.date, weight_lb: weight }, { onConflict: "user_id,log_date" });
  if (error) return failedSave(error);

  revalidatePath("/weight");
  return { ok: true };
}

export async function deleteWeight(date: string): Promise<ActionResult> {
  if (!isValidDateKey(date)) return INVALID_DATE;

  const supabase = await createClient();
  // Row Level Security means this can only ever delete your own weigh-in.
  const { error } = await supabase.from("weight_logs").delete().eq("log_date", date);
  if (error) return SAVE_FAILED;

  revalidatePath("/weight");
  return { ok: true };
}
