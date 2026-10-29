"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPlannedCardioDone } from "@/app/(tabs)/workouts/cardio-actions";
import { formatCardioPlan, type CardioPlan } from "@/lib/cardioPlan";

// The day's planned cardio, set ahead of time on Edit plan, with a "Completed" box. Ticking it
// logs the planned run, ride or swim for this day (so it counts toward your streak, the green
// ring and the weekly goals); unticking removes it. No plan yet: a link to plan one.
export default function PlannedCardio({
  date,
  plan,
  completed,
  editHref,
}: {
  date: string;
  plan: CardioPlan | null;
  completed: boolean; // a log of the planned kind is already there for this day
  editHref: string; // this day's editor on Edit plan (for the "Plan this day's cardio" link)
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(completed);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!plan) {
    return (
      <Link
        href={editHref}
        className="flex min-h-11 items-center justify-between rounded-2xl border border-dashed border-border px-4 py-2 text-sm font-medium text-muted active:opacity-70"
      >
        Plan this day&apos;s cardio
        <span aria-hidden="true" className="text-lg">
          ›
        </span>
      </Link>
    );
  }

  function toggle(next: boolean) {
    setChecked(next); // show the tick straight away
    setError(null);
    startTransition(async () => {
      const result = await setPlannedCardioDone({ date, done: next });
      if (result.ok) router.refresh();
      else {
        setChecked(!next);
        setError(result.message);
      }
    });
  }

  return (
    <section aria-label="Planned cardio" className="rounded-2xl bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">Planned</p>
          <p className={`text-lg font-semibold ${checked ? "text-accent" : ""}`}>{formatCardioPlan(plan)}</p>
        </div>
        <label className="flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium">
          Completed
          <input
            type="checkbox"
            checked={checked}
            disabled={pending}
            onChange={(event) => toggle(event.target.checked)}
            className="h-6 w-6 accent-[var(--accent)]"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
