"use server";

import { revalidatePath } from "next/cache";
import { currentUserId, failedSave, INVALID_DATE, SAVE_FAILED, SIGN_IN_AGAIN, type ActionResult } from "@/lib/actionResult";
import { CARDIO, validateCardio } from "@/lib/cardio";
import { planFromRow } from "@/lib/cardioPlan";
import { isoWeekday, isValidDateKey } from "@/lib/dates";
import { hasCardio } from "@/lib/workouts/weekSetup";
import { createClient } from "@/lib/supabase/server";

// Saves one run, ride, or swim. Distance and time are both optional.
export async function logCardio(input: {
  date: string;
  kind: string;
  distance: number | null;
  minutes: number | null;
}): Promise<ActionResult> {
  if (!isValidDateKey(input.date)) return INVALID_DATE;
  const checked = validateCardio(input.kind, input.distance, input.minutes);
  if (!checked.ok) return checked;

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return SIGN_IN_AGAIN;

  const { error } = await supabase.from("cardio_logs").insert({
    user_id: userId,
    log_date: input.date,
    kind: checked.kind,
    distance: checked.distance,
    distance_unit: checked.unit,
    duration_minutes: checked.minutes,
  });
  if (error) return failedSave(error);

  revalidatePath("/workouts"); // the cardio list, the streak, and the week rings all live here
  return { ok: true };
}

export async function deleteCardio(id: string): Promise<ActionResult> {
  if (typeof id !== "string" || id === "") return SAVE_FAILED;

  const supabase = await createClient();
  // Row Level Security means this can only ever delete your own log.
  const { error } = await supabase.from("cardio_logs").delete().eq("id", id);
  if (error) return SAVE_FAILED;

  revalidatePath("/workouts");
  return { ok: true };
}

/**
 * The "Completed" box on a cardio day: ticking it logs the day's planned cardio (its kind and
 * target distance); unticking removes that log again. The plan is read from your saved week,
 * never taken from the browser.
 */
export async function setPlannedCardioDone(input: { date: string; done: boolean }): Promise<ActionResult> {
  if (!isValidDateKey(input.date)) return INVALID_DATE;

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return SIGN_IN_AGAIN;

  const { data: day, error: dayError } = await supabase
    .from("workout_days")
    .select("kind, cardio_plan_kind, cardio_plan_distance")
    .eq("weekday", isoWeekday(input.date))
    .maybeSingle();
  if (dayError) return failedSave(dayError);
  const plan = day && hasCardio(day.kind) ? planFromRow(day) : null;
  if (!plan) return { ok: false, message: "There's no cardio planned for this day." };

  const { data: logs } = await supabase
    .from("cardio_logs")
    .select("id, distance")
    .eq("log_date", input.date)
    .eq("kind", plan.kind)
    .order("created_at", { ascending: false });

  if (input.done) {
    if ((logs ?? []).length > 0) return { ok: true }; // already logged
    const { error } = await supabase.from("cardio_logs").insert({
      user_id: userId,
      log_date: input.date,
      kind: plan.kind,
      distance: plan.distance,
      distance_unit: plan.distance === null ? null : CARDIO[plan.kind].unit,
      duration_minutes: null,
    });
    if (error) return failedSave(error);
  } else {
    // Remove the planned one (same distance) if it's there, else the latest of that kind.
    const sameDistance = (row: { distance: unknown }) =>
      (row.distance === null ? null : Number(row.distance)) === plan.distance;
    const target = (logs ?? []).find(sameDistance) ?? (logs ?? [])[0];
    if (target) {
      const { error } = await supabase.from("cardio_logs").delete().eq("id", target.id);
      if (error) return SAVE_FAILED;
    }
  }

  revalidatePath("/workouts");
  return { ok: true };
}
