"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addWater, undoWater } from "@/app/(tabs)/food/water-actions";
import { BOTTLE_OZ, DAILY_WATER_OZ, STEP_MILESTONES, waterProgress } from "@/lib/water";

// A slim water row on the Nutrition page: tap "+20 oz" each time you finish a bottle.
// Three small pills (20, 40, 60 oz) fill in as you go; the third is your daily goal.
export default function WaterTracker({ date, totalOz }: { date: string; totalOz: number }) {
  const router = useRouter();
  // The number updates instantly; if saving fails it goes back to what's really saved.
  const [total, changeTotal] = useOptimistic(totalOz, (current, delta: number) => Math.max(0, current + delta));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const progress = waterProgress(total);

  function change(delta: number, action: () => ReturnType<typeof addWater>) {
    setError(null);
    startTransition(async () => {
      changeTotal(delta);
      const result = await action();
      if (result.ok) router.refresh();
      else setError(result.message);
    });
  }

  return (
    <section aria-label="Water" className="rounded-2xl bg-card px-4 py-2">
      <div className="flex items-center gap-3">
        <span className="text-base" aria-hidden="true">
          💧
        </span>

        <div className="min-w-0 flex-1">
          <ol aria-label="Water steps" className="flex gap-1">
            {STEP_MILESTONES.map((oz, index) => (
              <li
                key={oz}
                aria-label={`Step ${index + 1}, ${oz} ounces${progress.steps > index ? ", done" : ""}`}
                className={`h-1.5 flex-1 rounded-full ${progress.steps > index ? "bg-accent" : "bg-border"}`}
              />
            ))}
          </ol>
          <p className="mt-1 text-xs tabular-nums text-muted">
            <span className="font-medium text-foreground">{progress.total}</span> / {DAILY_WATER_OZ} oz
            {progress.goalReached && <span className="ml-1.5 font-medium text-accent">🎉 goal</span>}
          </p>
        </div>

        <button
          type="button"
          onClick={() => change(-BOTTLE_OZ, () => undoWater({ date }))}
          disabled={pending || progress.total === 0}
          aria-label="Undo the last 20 oz"
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-base text-muted active:opacity-70 disabled:opacity-30"
        >
          ↩
        </button>
        <button
          type="button"
          onClick={() => change(BOTTLE_OZ, () => addWater({ date }))}
          disabled={pending}
          className="min-h-11 shrink-0 rounded-lg border border-border px-3 text-sm font-semibold text-accent active:opacity-70 disabled:opacity-60"
        >
          +{BOTTLE_OZ} oz
        </button>
      </div>

      {error && (
        <p role="alert" className="pb-1 text-xs text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
