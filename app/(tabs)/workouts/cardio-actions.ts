"use server";

import { revalidatePath } from "next/cache";
import { currentUserId, failedSave, INVALID_DATE, SAVE_FAILED, SIGN_IN_AGAIN, type ActionResult } from "@/lib/actionResult";
import { planFromRow, planToLog } from "@/lib/cardioPlan";
import { REST_LOG_KIND, restPlanFromRow, restPlanToLog } from "@/lib/restPlan";
import { isoWeekday, isValidDateKey } from "@/lib/dates";
import { hasCardio } from "@/lib/workouts/weekSetup";
import { DATABASE_BEHIND_MESSAGE, isCheckViolation } from "@/lib/dbErrors";
import { createClient } from "@/lib/supabase/server";

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
    .select("*") // whichever plan columns exist (the unit column comes with a later SQL step)
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
    const log = planToLog(plan); // a distance in the unit your weekly goals use, or a time
    const { error } = await supabase.from("cardio_logs").insert({
      user_id: userId,
      log_date: input.date,
      kind: plan.kind,
      distance: log.distance,
      distance_unit: log.unit,
      duration_minutes: log.minutes,
    });
    if (error) return failedSave(error);
  } else {
    // Remove the planned one (same distance) if it's there, else the latest of that kind.
    const plannedDistance = planToLog(plan).distance;
    const sameDistance = (row: { distance: unknown }) =>
      (row.distance === null ? null : Number(row.distance)) === plannedDistance;
    const target = (logs ?? []).find(sameDistance) ?? (logs ?? [])[0];
    if (target) {
      const { error } = await supabase.from("cardio_logs").delete().eq("id", target.id);
      if (error) return SAVE_FAILED;
    }
  }

  revalidatePath("/workouts");
  return { ok: true };
}

/**
 * The "Completed" box on a rest day: ticking it logs the planned recovery activity (a walk or
 * bike ride with its miles, or yoga with its minutes); unticking removes that log again. A walk
 * counts toward the weekly walking goal, a bike ride toward cycling. The plan is read from your
 * saved week, never taken from the browser.
 */
export async function setRestPlanDone(input: { date: string; done: boolean }): Promise<ActionResult> {
  if (!isValidDateKey(input.date)) return INVALID_DATE;

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return SIGN_IN_AGAIN;

  const { data: day, error: dayError } = await supabase
    .from("workout_days")
    .select("*") // whichever plan columns exist
    .eq("weekday", isoWeekday(input.date))
    .maybeSingle();
  if (dayError) return failedSave(dayError);
  const plan = day && day.kind === "rest" ? restPlanFromRow(day) : null;
  if (!plan) return { ok: false, message: "There's no recovery planned for this day." };

  const kind = REST_LOG_KIND[plan.activity];
  const { data: logs } = await supabase
    .from("cardio_logs")
    .select("id")
    .eq("log_date", input.date)
    .eq("kind", kind)
    .order("created_at", { ascending: false });

  if (input.done) {
    if ((logs ?? []).length > 0) return { ok: true }; // already logged
    const log = restPlanToLog(plan);
    const { error } = await supabase.from("cardio_logs").insert({
      user_id: userId,
      log_date: input.date,
      kind: log.kind,
      distance: log.distance,
      distance_unit: log.unit,
      duration_minutes: log.minutes,
    });
    // Walks and yoga are refused until the rest day SQL step allows them: say so plainly.
    if (error) return isCheckViolation(error) ? { ok: false, message: DATABASE_BEHIND_MESSAGE } : failedSave(error);
  } else {
    const latest = (logs ?? [])[0];
    if (latest) {
      const { error } = await supabase.from("cardio_logs").delete().eq("id", latest.id);
      if (error) return SAVE_FAILED;
    }
  }

  revalidatePath("/workouts");
  return { ok: true };
}
