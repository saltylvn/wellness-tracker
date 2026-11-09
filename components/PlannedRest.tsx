"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRestPlanDone } from "@/app/(tabs)/workouts/cardio-actions";
import { formatRestPlan, type RestPlan } from "@/lib/restPlan";

// A rest day's planned recovery (set ahead of time on Edit plan), laid out like a cardio day's
// plan, with a "Completed" box. Ticking it logs the walk, bike ride or yoga for this day (a
// walk counts toward the weekly walking goal, a ride toward cycling, and either one gives the
// day its orange ring); unticking removes it. No plan yet: a link to plan one.
export default function PlannedRest({
  date,
  plan,
  completed,
  editHref,
}: {
  date: string;
  plan: RestPlan | null;
  completed: boolean; // a log of the planned activity is already there for this day
  editHref: string; // this day's editor on Edit plan (for the "Plan this day's recovery" link)
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
        Plan a walk, bike ride or yoga
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
      const result = await setRestPlanDone({ date, done: next });
      if (result.ok) router.refresh();
      else {
        setChecked(!next);
        setError(result.message);
      }
    });
  }

  return (
    <section aria-label="Planned recovery" className="rounded-2xl bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">Planned</p>
          <p className={`text-lg font-semibold ${checked ? "text-accent" : ""}`}>{formatRestPlan(plan)}</p>
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
