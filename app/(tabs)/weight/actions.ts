"use server";

import { revalidatePath } from "next/cache";
import { currentUserId, failedSave, INVALID_DATE, SAVE_FAILED, SIGN_IN_AGAIN, type ActionResult } from "@/lib/actionResult";
import { takeAiRequest } from "@/lib/ai/dailyLimit";
import { writeWeightCoachNote } from "@/lib/ai/gemini";
import { daysBetween, isValidDateKey } from "@/lib/dates";
import { parseWeight } from "@/lib/weight";
import { chosenPace, clampPace, coachKey, goalDirection, goalNumbers, recentTrend } from "@/lib/weightPlan";
import { loadWeightData } from "@/lib/weightQueries";
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

/**
 * Brings the AI coaching note up to date. The Weight tab calls this by itself when your
 * numbers have changed since the last note (a new weigh-in, start, target or weekly pace).
 * The pace is the one you chose in Settings (2 lb if none); if the AI is busy or you're over today's AI
 * limit, the note is simply left empty until your next weigh-in.
 */
export async function refreshWeightPlan(today: string): Promise<ActionResult> {
  if (!isValidDateKey(today)) return INVALID_DATE;

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return SIGN_IN_AGAIN;

  const data = await loadWeightData(supabase, userId, today);
  const numbers = goalNumbers(data);
  if (data.databaseBehind || !numbers) return { ok: true }; // nothing to plan yet
  const direction = goalDirection(numbers.current, numbers.target);
  if (direction === "done") return { ok: true }; // at your target: no note needed

  const chosen = chosenPace(data.plan.pace);
  const key = coachKey(numbers.start, numbers.current, numbers.target, chosen);
  if (data.plan.key === key) return { ok: true }; // already up to date

  const pace = clampPace(chosen, direction);
  const note = (await takeAiRequest(supabase, userId))
    ? await writeWeightCoachNote({
        ...numbers,
        direction,
        pace,
        trend: recentTrend(data.logs),
        weeksTracked: data.first ? Math.max(0, Math.floor(daysBetween(data.first.date, today) / 7)) : 0,
      })
    : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      weight_coach_note: note,
      weight_coach_source: note ? "ai" : "auto",
      weight_coach_key: key,
    })
    .eq("id", userId);
  if (error) return failedSave(error);

  revalidatePath("/weight");
  return { ok: true };
}
