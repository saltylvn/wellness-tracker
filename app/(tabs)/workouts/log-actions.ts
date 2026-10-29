"use server";

import { revalidatePath } from "next/cache";
import { currentUserId, failedSave, INVALID_DATE, SAVE_FAILED, SIGN_IN_AGAIN, type ActionResult } from "@/lib/actionResult";
import { isValidDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { validateSetInput, validateTimeInput } from "@/lib/workouts/logging";
import { upsertSession } from "@/lib/workouts/session";

// Saves one set for an exercise on a date: weight and reps, or a time (seconds) for a
// timed set. The first set you log on a date also creates that day's workout session.
export async function logSet(
  input: { date: string; exerciseId: string } & (
    | { mode: "weight"; weight: number; reps: number }
    | { mode: "time"; seconds: number }
  ),
): Promise<ActionResult> {
  if (!isValidDateKey(input.date)) return INVALID_DATE;
  // Never trust the browser: a timed set saves only its seconds, a weight set only weight and reps.
  let values: { weight: number | null; reps: number | null; duration_seconds: number | null };
  if (input.mode === "time") {
    const checked = validateTimeInput(input.seconds);
    if (!checked.ok) return checked;
    values = { weight: null, reps: null, duration_seconds: checked.seconds };
  } else {
    const checked = validateSetInput(input.weight, input.reps);
    if (!checked.ok) return checked;
    values = { weight: checked.weight, reps: checked.reps, duration_seconds: null };
  }

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return SIGN_IN_AGAIN;

  // Look the exercise up ourselves instead of trusting names sent by the browser.
  // Row Level Security means this only finds YOUR exercises.
  const { data: exercise } = await supabase
    .from("workout_exercises")
    .select("id, name, position, day_id")
    .eq("id", String(input.exerciseId))
    .maybeSingle();
  if (!exercise) return { ok: false, message: "Couldn't find that exercise." };

  const { data: day } = await supabase
    .from("workout_days")
    .select("id, title")
    .eq("id", exercise.day_id)
    .maybeSingle();
  if (!day) return SAVE_FAILED;

  // One session per date (the table enforces it); reuse it if it already exists.
  const session = await upsertSession(supabase, userId, input.date, day);
  if (!session.ok) return failedSave(session.error);
  const sessionId = session.id;

  // Next set number for this exercise today.
  const { data: last } = await supabase
    .from("workout_sets")
    .select("set_number")
    .eq("session_id", sessionId)
    .eq("exercise_id", exercise.id)
    .order("set_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const setNumber = (last?.set_number ?? 0) + 1;
  if (setNumber > 50) return { ok: false, message: "That's the maximum of 50 sets for one exercise." };

  const { error } = await supabase.from("workout_sets").insert({
    user_id: userId,
    session_id: sessionId,
    exercise_id: exercise.id,
    exercise_name: exercise.name,
    position: exercise.position,
    set_number: setNumber,
    ...values,
  });
  if (error) return failedSave(error);

  revalidatePath("/workouts");
  return { ok: true };
}

export async function deleteSet(setId: string): Promise<ActionResult> {
  if (typeof setId !== "string" || setId === "") return SAVE_FAILED;

  const supabase = await createClient();
  // Row Level Security means this can only ever delete your own set.
  const { error } = await supabase.from("workout_sets").delete().eq("id", setId);
  if (error) return SAVE_FAILED;

  revalidatePath("/workouts");
  return { ok: true };
}
