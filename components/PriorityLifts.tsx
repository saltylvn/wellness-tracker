import { formatWeight } from "@/lib/workouts/logging";
import type { PriorityLift } from "@/lib/priorityLifts";

// Two slim, quiet pills at the top of a lifting day, one above the other (full width, so
// longer names fit): the lifts you're focusing on (picked in Settings), each on one line with
// your PR (the heaviest weight you've logged for it): "★ Deadlift  PR 315". A name too long
// even for the full width is cut short with "…" so the PR always shows.
export default function PriorityLifts({ lifts }: { lifts: PriorityLift[] }) {
  if (lifts.length === 0) return null;
  return (
    <div aria-label="Priority lifts" role="group" className="grid gap-1.5">
      {lifts.map((lift) => (
        <div
          key={lift.name}
          className="flex min-w-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
        >
          <span aria-hidden="true" className="text-xs text-accent">
            ★
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold">{lift.name}</span>
          <span className="shrink-0 text-xs text-muted tabular-nums">
            {lift.best === null ? "PR –" : `PR ${formatWeight(lift.best)}`}
          </span>
        </div>
      ))}
    </div>
  );
}
