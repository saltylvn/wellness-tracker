import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import FitnessHeader from "@/components/FitnessHeader";
import GymBarcodeCard from "@/components/GymBarcodeCard";
import GoToToday from "@/components/GoToToday";
import LogExercise from "@/components/LogExercise";
import PlannedCardio from "@/components/PlannedCardio";
import PriorityLifts from "@/components/PriorityLifts";
import SunshineLog from "@/components/SunshineLog";
import WeeklyCardioGoals from "@/components/WeeklyCardioGoals";
import { currentUserId } from "@/lib/actionResult";
import { completingLog } from "@/lib/cardioPlan";
import { formatFullDate, formatWeekday, isValidDateKey } from "@/lib/dates";
import { gymBarcodeSvg } from "@/lib/gymBarcodeSvg";
import { createClient } from "@/lib/supabase/server";
import { connectorAfter, formatRest, formatSetsReps } from "@/lib/workouts/plan";
import { latestSets } from "@/lib/workouts/history";
import { defaultRepsFor, defaultSecondsFor, defaultWeightFor, isTimed } from "@/lib/workouts/logging";
import { REST_DAY_TITLE } from "@/lib/workouts/defaults";
import { dayTitle, isBlankWeek } from "@/lib/workouts/weekSetup";
import { loadFitnessPage } from "@/lib/workouts/queries";

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  // No date in the address? Let the phone work out "today" and jump there.
  if (!date || !isValidDateKey(date)) return <GoToToday to="/workouts" />;

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");

  // Everything this page reads, in two rounds (see loadFitnessPage).
  // (Don't put key={date} on the cards below: switching days then left stale copies on screen.)
  const { days, doneDates, today, lift, cardio, sunshine, gymBarcode, cardioPlan, priorityLifts } = await loadFitnessPage(
    supabase,
    userId,
    date,
  );

  return (
    <div className="space-y-6">
      <FitnessHeader
        date={date}
        days={days}
        doneDates={doneDates}
        // Drawn here on the server, so the barcode is part of the page: nothing extra to load.
        barcode={<GymBarcodeCard barcode={gymBarcode} svg={gymBarcode ? gymBarcodeSvg(gymBarcode) : null} />}
      />


      <section className="space-y-1">
        {/* The selected day, large and green, so it's easy to see which day you're on. */}
        <h2 className="text-2xl font-bold">
          <span className="text-accent">{formatWeekday(date)}</span>
          {today ? (
            <span className="text-lg font-semibold text-muted"> · {dayTitle(today)}</span>
          ) : null}
        </h2>
        <p className="text-sm text-muted">{formatFullDate(date)}</p>
      </section>

      {!today && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Couldn&apos;t load your plan. Please refresh.
        </p>
      )}

      {/* A new account starts with a blank week: show how to build a plan instead of "Recovery Day". */}
      {isBlankWeek(days) && (
        <section className="space-y-3 rounded-2xl bg-card p-5">
          <p className="text-base font-semibold">Build your weekly plan</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
            <li>
              In <span className="font-medium text-foreground">Your week</span> above, tap the days you lift and the
              days you do cardio. Days left off are rest days.
            </li>
            <li>
              On each lifting day, tap <span className="font-medium text-foreground">Edit plan</span> to name the
              workout (like &ldquo;Legs&rdquo; or &ldquo;Push day&rdquo;) and add its exercises.
            </li>
          </ol>
        </section>
      )}

      {today?.kind === "rest" && !isBlankWeek(days) && (
        <section className="rounded-2xl bg-card p-6 text-center">
          <p className="text-4xl" aria-hidden="true">
            🧘
          </p>
          <p className="mt-2 text-base font-semibold">{REST_DAY_TITLE}</p>
          <p className="mt-1 text-sm text-muted">Recover, stretch, and sleep well.</p>
        </section>
      )}

      {cardio && today && (
        <>
          {/* The cardio you planned for this weekday on Edit plan, with its Completed box. The
              heading row matches the exercises one below: day on the left, Edit plan on the right. */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted">{formatWeekday(date)}&apos;s cardio</h3>
              <Link
                href={`/workouts/plan/${today.id}?date=${date}`}
                className="flex min-h-11 items-center text-sm font-medium text-accent active:opacity-70"
              >
                Edit plan
              </Link>
            </div>
            <PlannedCardio
              key={`${date}-${cardioPlan ? completingLog(cardioPlan, cardio.logs) !== null : false}`}
              date={date}
              plan={cardioPlan}
              completed={cardioPlan ? completingLog(cardioPlan, cardio.logs) !== null : false}
              editHref={`/workouts/plan/${today.id}?date=${date}`}
            />
          </section>
          <WeeklyCardioGoals totals={cardio.weekTotals} goals={cardio.weeklyGoals} />
        </>
      )}

      {/* Every day: minutes of sunshine toward your daily target (Settings). */}
      <SunshineLog date={date} minutes={sunshine.minutes} lastMinutes={sunshine.lastMinutes} goal={sunshine.goal} />

      {today && lift && (
        <section className="space-y-3">
          {/* The lifts you're focusing on (picked in Settings), small and side by side. */}
          <PriorityLifts lifts={priorityLifts} />
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted">{formatWeekday(date)}&apos;s exercises</h3>
            <Link
              href={`/workouts/plan/${today.id}?date=${date}`}
              className="flex min-h-11 items-center text-sm font-medium text-accent active:opacity-70"
            >
              Edit plan
            </Link>
          </div>

          {lift.exercises.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
              No exercises yet. Tap Edit plan to name this workout and add your exercises.
            </p>
          ) : (
            lift.exercises.map((exercise, index) => {
              const target = formatSetsReps(exercise.target_sets, exercise.rep_min, exercise.rep_max);
              const connector = connectorAfter(exercise, index === lift.exercises.length - 1);
              const mySets = lift.todaySets
                .filter((set) => set.exercise_id === exercise.id)
                .sort((a, b) => a.set_number - b.set_number);
              const lastTime = latestSets(lift.history, exercise.id);
              // The wheels start where you left off: your last set today, else last workout's first set.
              // The Weight / Time switch starts on whichever kind that set was (Weight if none).
              const seed = mySets.at(-1) ?? lastTime[0];
              const weightSeed = [...mySets].reverse().find((s) => !isTimed(s)) ?? lastTime.find((s) => !isTimed(s));
              const timeSeed = [...mySets].reverse().find(isTimed) ?? lastTime.find(isTimed);
              return (
                <Fragment key={exercise.id}>
                  <LogExercise
                    exercise={{ id: exercise.id, name: exercise.name, target }}
                    date={date}
                    todaySets={mySets.map(({ id, weight, reps, seconds }) => ({ id, weight, reps, seconds }))}
                    lastTime={lastTime}
                    bestWeight={lift.bestById.get(exercise.id) ?? null}
                    initialMode={seed && isTimed(seed) ? "time" : "weight"}
                    initialWeight={defaultWeightFor(exercise.name, weightSeed?.weight)}
                    initialReps={defaultRepsFor(exercise.rep_max, weightSeed?.reps)}
                    initialSeconds={defaultSecondsFor(timeSeed?.seconds)}
                  />
                  {connector === "superset" && (
                    <p className="flex items-center justify-center gap-1.5 py-0.5 text-sm font-semibold text-accent">
                      <span aria-hidden="true">⚡</span> Superset · no rest
                    </p>
                  )}
                  {connector === "rest" && (
                    <p className="flex items-center justify-center gap-1.5 py-0.5 text-sm font-medium text-muted">
                      <span aria-hidden="true">⏱</span> {formatRest()}
                    </p>
                  )}
                </Fragment>
              );
            })
          )}
        </section>
      )}
    </div>
  );
}
