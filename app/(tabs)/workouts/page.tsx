import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import CardioLogger from "@/components/CardioLogger";
import ExtraCheck from "@/components/ExtraCheck";
import FitnessHeader from "@/components/FitnessHeader";
import GymBarcodeCard from "@/components/GymBarcodeCard";
import GoToToday from "@/components/GoToToday";
import LogExercise from "@/components/LogExercise";
import ThreeRepMaxes from "@/components/ThreeRepMaxes";
import TanningLog from "@/components/TanningLog";
import WeeklyCardioGoals from "@/components/WeeklyCardioGoals";
import { currentUserId } from "@/lib/actionResult";
import { formatFullDate, formatWeekday, isValidDateKey } from "@/lib/dates";
import { gymBarcodeSvg } from "@/lib/gymBarcodeSvg";
import { createClient } from "@/lib/supabase/server";
import { connectorAfter, formatRest, formatSetsReps } from "@/lib/workouts/plan";
import { latestSets } from "@/lib/workouts/history";
import { defaultRepsFor, defaultWeightFor } from "@/lib/workouts/logging";
import { REST_DAY_TITLE } from "@/lib/workouts/defaults";
import { dayTitle } from "@/lib/workouts/weekSetup";
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
  const { days, doneDates, today, lift, cardio, tanning, gymBarcode } = await loadFitnessPage(supabase, userId, date);

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
        <h2 className="text-lg font-semibold">
          {formatWeekday(date)}
          {today ? (
            <span className="text-muted"> · {dayTitle(today)}</span>
          ) : null}
        </h2>
        <p className="text-sm text-muted">{formatFullDate(date)}</p>
      </section>

      {!today && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Couldn&apos;t load your plan. Please refresh.
        </p>
      )}

      {today?.kind === "rest" && (
        <section className="rounded-2xl bg-card p-6 text-center">
          <p className="text-4xl" aria-hidden="true">
            🧘
          </p>
          <p className="mt-2 text-base font-semibold">{REST_DAY_TITLE}</p>
          <p className="mt-1 text-sm text-muted">Recover, stretch, and sleep well.</p>
        </section>
      )}

      {cardio && (
        <>
          <CardioLogger date={date} logs={cardio.logs} />
          <WeeklyCardioGoals totals={cardio.weekTotals} goals={cardio.weeklyGoals} />
        </>
      )}

      {tanning && <TanningLog date={date} minutes={tanning.minutes} lastMinutes={tanning.lastMinutes} />}

      {today && lift && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted">Today&apos;s exercises</h3>
            <Link
              href={`/workouts/plan/${today.id}?date=${date}`}
              className="flex min-h-11 items-center text-sm font-medium text-accent active:opacity-70"
            >
              Edit plan
            </Link>
          </div>

          <ExtraCheck kind="sauna" date={date} dayId={today.id} done={lift.saunaDone} />

          {lift.exercises.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
              No exercises yet. Tap Edit plan to add some.
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
              const seed = mySets.at(-1) ?? lastTime[0];
              return (
                <Fragment key={exercise.id}>
                  <LogExercise
                    exercise={{ id: exercise.id, name: exercise.name, target }}
                    date={date}
                    todaySets={mySets.map((set) => ({ id: set.id, weight: set.weight, reps: set.reps }))}
                    lastTime={lastTime}
                    bestWeight={lift.bestById.get(exercise.id) ?? null}
                    initialWeight={defaultWeightFor(exercise.name, seed?.weight)}
                    initialReps={defaultRepsFor(exercise.rep_max, seed?.reps)}
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

          <ExtraCheck kind="stretch" date={date} dayId={today.id} done={lift.stretchDone} />
        </section>
      )}

      {/* The #1000club card sits at the bottom of lifting days, after the workout. */}
      {lift && <ThreeRepMaxes maxes={lift.threeRepMaxes} />}
    </div>
  );
}
