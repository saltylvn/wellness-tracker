"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isValidDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { parsePlanJson } from "@/lib/workouts/plan";
import { hasLift, MAX_DAY_NAME_LENGTH, parseDayName } from "@/lib/workouts/weekSetup";
import { currentUserId } from "@/lib/actionResult";

export type PlanFormState = { message: string } | null;

// Saves one lifting day's plan: its name ("Legs", "Push day"...), and its exercise list:
// updates the ones you kept (in their new order), adds new ones, and removes the ones you deleted.
export async function saveDayPlan(
  _previous: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const dayId = String(formData.get("day_id") ?? "");
  const date = String(formData.get("date") ?? "");

  const title = parseDayName(formData.get("title"));
  if (title === null) return { message: `Keep the workout name to ${MAX_DAY_NAME_LENGTH} characters.` };
  const parsed = parsePlanJson(String(formData.get("plan") ?? ""));
  if (!parsed.ok) return { message: parsed.message };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");

  // Row Level Security hides other people's days, so this only finds yours.
  const { data: day } = await supabase
    .from("workout_days")
    .select("id, kind, title")
    .eq("id", dayId)
    .maybeSingle();
  if (!day || !hasLift(day.kind)) return { message: "Couldn't find that workout day." };

  // 0. The day's name, if you changed it.
  if (title !== day.title) {
    const { error } = await supabase.from("workout_days").update({ title }).eq("id", day.id);
    if (error) return { message: "Couldn't save. Please try again." };
  }

  const { data: existing } = await supabase
    .from("workout_exercises")
    .select("id")
    .eq("day_id", day.id);
  const existingIds = new Set((existing ?? []).map((e) => e.id as string));

  // Only ids that really belong to this day count as "kept".
  const kept = parsed.exercises.map((e) => (e.id && existingIds.has(e.id) ? e.id : undefined));
  const keptIds = kept.filter((id): id is string => Boolean(id));

  // 1. Remove exercises that are no longer in the list.
  const toRemove = [...existingIds].filter((id) => !keptIds.includes(id));
  if (toRemove.length > 0) {
    const { error } = await supabase.from("workout_exercises").delete().in("id", toRemove);
    if (error) return { message: "Couldn't save. Please try again." };
  }

  // 2. Update the kept ones (this also saves their new order).
  const updates = parsed.exercises.flatMap((e, position) => {
    const id = kept[position];
    if (!id) return [];
    return [
      supabase
        .from("workout_exercises")
        .update({
          position,
          name: e.name,
          target_sets: e.target_sets,
          rep_min: e.rep_min,
          rep_max: e.rep_max,
          superset_with_next: e.superset_with_next,
        })
        .eq("id", id),
    ];
  });
  const results = await Promise.all(updates);
  if (results.some((r) => r.error)) return { message: "Couldn't save. Please try again." };

  // 3. Add the new ones.
  const added = parsed.exercises.flatMap((e, position) =>
    kept[position]
      ? []
      : [
          {
            user_id: userId,
            day_id: day.id,
            position,
            name: e.name,
            target_sets: e.target_sets,
            rep_min: e.rep_min,
            rep_max: e.rep_max,
            superset_with_next: e.superset_with_next,
          },
        ],
  );
  if (added.length > 0) {
    const { error } = await supabase.from("workout_exercises").insert(added);
    if (error) return { message: "Couldn't save. Please try again." };
  }

  revalidatePath("/workouts");
  redirect(isValidDateKey(date) ? `/workouts?date=${date}` : "/workouts");
}
