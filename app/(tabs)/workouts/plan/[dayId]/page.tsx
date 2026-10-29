import { notFound } from "next/navigation";
import PlanEditor from "@/components/PlanEditor";
import { isValidDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { PlanExercise } from "@/lib/workouts/plan";
import { editableDayName, hasLift, liftName } from "@/lib/workouts/weekSetup";

export default async function EditPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ dayId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { dayId } = await params;
  const { date: rawDate } = await searchParams;
  const date = rawDate && isValidDateKey(rawDate) ? rawDate : "";

  const supabase = await createClient();
  // Row Level Security hides other people's days, so they simply "don't exist".
  const { data: day, error } = await supabase
    .from("workout_days")
    .select("id, kind, title")
    .eq("id", dayId)
    .maybeSingle();
  if (error || !day || !hasLift(day.kind)) notFound();

  const { data } = await supabase
    .from("workout_exercises")
    .select("id, name, target_sets, rep_min, rep_max, superset_with_next")
    .eq("day_id", day.id)
    .order("position", { ascending: true });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Edit {liftName(day.title)}</h1>
        <p className="text-sm text-muted">
          Name this workout, then add your exercises with their sets and rep range. Change, reorder, or
          remove them any time.
        </p>
      </div>
      <PlanEditor
        dayId={day.id}
        date={date}
        title={liftName(day.title)}
        initialName={editableDayName(day.title)}
        initial={(data ?? []) as PlanExercise[]}
      />
    </div>
  );
}
