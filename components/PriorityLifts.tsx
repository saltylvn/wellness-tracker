import { formatWeight } from "@/lib/workouts/logging";
import type { PriorityLift } from "@/lib/priorityLifts";

// Two small, quiet boxes side by side at the top of a lifting day: the lifts you're focusing
// on (picked in Settings), each with your PR (the heaviest weight you've logged for it).
export default function PriorityLifts({ lifts }: { lifts: PriorityLift[] }) {
  if (lifts.length === 0) return null;
  return (
    <div aria-label="Priority lifts" role="group" className="grid grid-cols-2 gap-2">
      {lifts.map((lift) => (
        <div key={lift.name} className="min-w-0 rounded-xl border border-border px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">★ Priority</p>
          <p className="truncate text-sm font-semibold">{lift.name}</p>
          <p className="text-xs text-muted">
            {lift.best === null ? "No weight logged yet" : `PR ${formatWeight(lift.best)} lb`}
          </p>
        </div>
      ))}
    </div>
  );
}
