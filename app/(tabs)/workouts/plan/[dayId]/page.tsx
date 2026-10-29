import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import PlanEditor from "@/components/PlanEditor";
import { planFromRow } from "@/lib/cardioPlan";
import { isValidDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { afterDayEditPath, type PlanExercise } from "@/lib/workouts/plan";
import { dayTitle, editableDayName, hasCardio, hasLift, liftName } from "@/lib/workouts/weekSetup";

export default async function EditPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ dayId: string }>;
  searchParams: Promise<{ date?: string; from?: string }>;
}) {
  const { dayId } = await params;
  const { date: rawDate, from } = await searchParams;
  const date = rawDate && isValidDateKey(rawDate) ? rawDate : "";

  const supabase = await createClient();
  // Row Level Security hides other people's days, so they simply "don't exist".
  const { data: day, error } = await supabase
    .from("workout_days")
    .select("id, kind, title")
    .eq("id", dayId)
    .maybeSingle();
  if (error || !day || !(hasLift(day.kind) || hasCardio(day.kind))) notFound();
  const lift = hasLift(day.kind);
  const cardio = hasCardio(day.kind);

  const [{ data }, { data: planRow }] = await Promise.all([
    supabase
      .from("workout_exercises")
      .select("id, name, target_sets, rep_min, rep_max, superset_with_next")
      .eq("day_id", day.id)
      .order("position", { ascending: true }),
    // Read on its own, with "*" (whichever plan columns exist), so this page still opens
    // before the cardio plan SQL steps are run.
    supabase.from("workout_days").select("*").eq("id", day.id).maybeSingle(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <BackButton fallback={afterDayEditPath(from, date)} />
        <h1 className="text-2xl font-bold">Edit {dayTitle(day)}</h1>
        <p className="text-sm text-muted">
          {cardio && "Pick the cardio you'll do and how far. On the day, tick Completed to log it. "}
          {lift &&
            "Name this workout, then add your exercises with their sets and rep range. Change, reorder, or remove them any time."}
        </p>
      </div>
      <PlanEditor
        dayId={day.id}
        date={date}
        title={liftName(day.title)}
        initialName={editableDayName(day.title)}
        back={from === "plan" ? "plan" : ""}
        initial={(data ?? []) as PlanExercise[]}
        lift={lift}
        cardio={cardio ? planFromRow(planRow) : undefined}
      />
    </div>
  );
}
