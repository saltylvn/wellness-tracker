import Link from "next/link";
import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import WeekSetup from "@/components/WeekSetup";
import { currentUserId } from "@/lib/actionResult";
import { formatCardioPlan } from "@/lib/cardioPlan";
import { formatRestPlan } from "@/lib/restPlan";
import { isValidDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { loadPlanOverview } from "@/lib/workouts/queries";
import { dayTitle, hasCardio, hasLift, KIND_ICON } from "@/lib/workouts/weekSetup";

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// "Edit plan" for the whole week, in one place: the same Lift / Cardio day toggles as on the
// Fitness tab, then Monday to Sunday with what each day is. Tapping a day opens its editor
// (name and exercises, the cardio plan, or a rest day's recovery plan), which comes back here when you save.
export default async function WeekPlanPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: rawDate } = await searchParams;
  const date = rawDate && isValidDateKey(rawDate) ? rawDate : "";

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");
  const days = await loadPlanOverview(supabase, userId);

  return (
    <div className="space-y-5">
      <BackButton fallback={date ? `/workouts?date=${date}` : "/workouts"} />
      <div className="-mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit plan</h1>
        <Link
          href={date ? `/workouts?date=${date}` : "/workouts"}
          className="flex min-h-11 items-center px-1 text-base font-semibold text-accent active:opacity-70"
        >
          Done
        </Link>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">1. Pick your lifting and cardio days</h2>
        <WeekSetup days={days} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">2. Tap a day to plan its exercises, cardio or recovery</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
          {days.map((day) => {
            const lift = hasLift(day.kind);
            const cardio = hasCardio(day.kind);
            const rest = day.kind === "rest";
            const liftDetail = lift
              ? day.exerciseCount === 0
                ? "No exercises yet"
                : `${day.exerciseCount} ${day.exerciseCount === 1 ? "exercise" : "exercises"}`
              : null;
            const cardioDetail = cardio ? (day.cardioPlan ? formatCardioPlan(day.cardioPlan) : "No cardio planned") : null;
            const restDetail = rest ? (day.restPlan ? formatRestPlan(day.restPlan) : "No recovery planned") : null;
            const detail = [liftDetail, cardioDetail, restDetail].filter(Boolean).join(" · ") || null;
            const needsPlan = (lift && day.exerciseCount === 0) || (cardio && !day.cardioPlan);
            // Every day opens its editor: exercises, cardio, or a rest day's recovery plan.
            return (
              <li key={day.id}>
                <Link
                  href={`/workouts/plan/${day.id}?from=plan${date ? `&date=${date}` : ""}`}
                  className="flex min-h-14 items-center gap-3 px-4 py-2 active:bg-border"
                >
                  <span className="w-24 shrink-0 text-sm text-muted">{WEEKDAY_NAMES[day.weekday - 1]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium">
                      <span aria-hidden="true">{KIND_ICON[day.kind]}</span> {dayTitle(day)}
                    </span>
                    {detail && (
                      <span className={`block text-xs ${needsPlan ? "text-accent" : "text-muted"}`}>
                        {detail}
                      </span>
                    )}
                  </span>
                  <span aria-hidden="true" className="text-xl text-muted">
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
