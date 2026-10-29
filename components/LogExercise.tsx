"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "@/components/BottomSheet";
import WheelPicker from "@/components/WheelPicker";
import { deleteSet, logSet } from "@/app/(tabs)/workouts/log-actions";
import {
  formatSet,
  formatWeight,
  REP_OPTIONS,
  summarizeSets,
  WEIGHT_OPTIONS,
} from "@/lib/workouts/logging";

type SetRow = { id: string; weight: number; reps: number };

type Props = {
  exercise: { id: string; name: string; target: string }; // target like "3 × 8–12" (may be empty)
  date: string; // the day being logged
  todaySets: SetRow[]; // sets already logged today for this exercise
  lastTime: { weight: number; reps: number }[]; // the previous workout's sets
  bestWeight: number | null; // the heaviest weight ever logged for this exercise
  initialWeight: number; // where the weight wheel starts
  initialReps: number; // where the reps wheel starts
};

// One exercise card with a "Log" button. The button opens a sheet where you
// spin the weight and reps wheels and tap "Add set" for every set you do.
export default function LogExercise({
  exercise,
  date,
  todaySets,
  lastTime,
  bestWeight,
  initialWeight,
  initialReps,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addSet() {
    setError(null);
    startTransition(async () => {
      const result = await logSet({ date, exerciseId: exercise.id, weight, reps });
      if (result.ok) router.refresh(); // reload today's sets from the server
      else setError(result.message);
    });
  }

  function removeSet(set: SetRow, number: number) {
    if (!window.confirm(`Delete set ${number} (${formatSet(set.weight, set.reps)})?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteSet(set.id);
      if (result.ok) router.refresh();
      else setError(result.message);
    });
  }

  // Today's sets are green with a black "+" between them: "✓ Today: 135 × 10 + 135 × 9".
  const summary = todaySets.length ? (
    <>
      ✓ Today:{" "}
      {todaySets.map((set, index) => (
        <span key={set.id}>
          {index > 0 && <span className="font-bold text-black"> + </span>}
          {formatSet(set.weight, set.reps)}
        </span>
      ))}
    </>
  ) : lastTime.length ? (
    `Last time: ${summarizeSets(lastTime)}`
  ) : (
    "Not logged yet"
  );

  return (
    <>
      <div className="rounded-2xl bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-medium">{exercise.name}</p>
            {bestWeight !== null && (
              <p className="text-xs font-medium text-muted">
                <span aria-hidden="true">🏆</span> Heaviest: {formatWeight(bestWeight)} lb
              </p>
            )}
          </div>
          <p className={`shrink-0 text-sm ${exercise.target ? "font-semibold" : "text-muted"}`}>
            {exercise.target || "Set sets & reps"}
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className={`min-w-0 text-xs ${todaySets.length ? "font-medium text-accent" : "text-muted"}`}>
            {summary}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-11 shrink-0 rounded-xl bg-accent px-6 text-base font-semibold text-on-accent active:opacity-80"
          >
            Log
          </button>
        </div>
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} label={`Log ${exercise.name}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold">{exercise.name}</h2>
            {exercise.target && <p className="text-sm text-muted">Target: {exercise.target}</p>}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-11 shrink-0 rounded-xl px-3 text-base font-semibold text-accent active:opacity-70"
          >
            Done
          </button>
        </div>

        {bestWeight !== null && (
          <p className="text-sm text-muted">
            <span aria-hidden="true">🏆</span> Heaviest: {formatWeight(bestWeight)} lb
          </p>
        )}
        {lastTime.length > 0 && (
          <p className="text-sm text-muted">Last time: {summarizeSets(lastTime)}</p>
        )}

        {todaySets.length > 0 && (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
            {todaySets.map((set, index) => (
              <li key={set.id} className="flex min-h-12 items-center justify-between px-4">
                <span className="text-base">
                  <span className="text-muted">Set {index + 1}</span>
                  <span className="ml-3 font-semibold tabular-nums">
                    {formatWeight(set.weight)} lb × {set.reps}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeSet(set, index + 1)}
                  disabled={pending}
                  aria-label={`Delete set ${index + 1}`}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-danger active:bg-border disabled:opacity-40"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-3">
          <WheelPicker
            label="Weight (lb)"
            options={WEIGHT_OPTIONS}
            value={weight}
            onChange={setWeight}
            format={formatWeight}
          />
          <WheelPicker label="Reps" options={REP_OPTIONS} value={reps} onChange={setReps} />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={addSet}
          disabled={pending}
          className="min-h-14 w-full rounded-xl bg-accent text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60"
        >
          {pending ? "Saving…" : `Add set ${todaySets.length + 1} · ${formatWeight(weight)} lb × ${reps}`}
        </button>
      </BottomSheet>
    </>
  );
}
