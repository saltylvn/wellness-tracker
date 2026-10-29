import Link from "next/link";
import { CARDIO, CARDIO_KINDS, formatDistance } from "@/lib/cardio";
import { goalProgress, type WeeklyGoals } from "@/lib/cardioGoals";

// "This week" progress toward your weekly distance goals, shown on cardio days.
// Run and cycle show up while they have a goal; swim shows once it has a goal
// or you've swum this week, one compact line each. The bars stay green; reaching a goal gets a 🎯.
export default function WeeklyCardioGoals({
  totals,
  goals,
}: {
  totals: Record<"run" | "cycle" | "swim", number>;
  goals: WeeklyGoals;
}) {
  const rows = CARDIO_KINDS.filter((kind) => goals[kind] !== null || totals[kind] > 0);

  return (
    <section className="space-y-2 rounded-2xl bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">This week</h3>
        {/* -my-3 keeps the 44px tap area without making the card taller. */}
        <Link
          href="/settings"
          className="-my-3 flex min-h-11 items-center text-sm font-medium text-accent active:opacity-70"
        >
          Edit goals
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          No weekly goals set. Add some in{" "}
          <Link href="/settings" className="font-medium text-accent underline">
            Settings
          </Link>
          .
        </p>
      ) : (
        // One line per kind: name, a thin bar, then "done / goal" (🎯 once reached).
        rows.map((kind) => {
          const { unit, label, icon } = CARDIO[kind];
          const goal = goals[kind];
          const progress = goalProgress(totals[kind], goal);
          return (
            <div key={kind} className="flex items-center gap-3">
              <p className="w-20 shrink-0 text-sm font-medium">
                <span aria-hidden="true">{icon}</span> {label}
              </p>
              <div
                role={progress ? "progressbar" : undefined}
                aria-label={progress ? `${label} distance toward weekly goal` : undefined}
                aria-valuemin={progress ? 0 : undefined}
                aria-valuemax={progress ? (goal ?? 0) : undefined}
                aria-valuenow={progress ? totals[kind] : undefined}
                className="h-2 flex-1 overflow-hidden rounded-full bg-border"
              >
                {progress && <div className="h-full rounded-full bg-accent" style={{ width: `${progress.percent}%` }} />}
              </div>
              <p className="shrink-0 text-sm tabular-nums">
                {progress?.reached && <span aria-label="Goal reached">🎯 </span>}
                <span className="font-semibold">{formatDistance(totals[kind], unit)}</span>
                {goal !== null && <span className="text-muted"> / {formatDistance(goal, unit)}</span>}
              </p>
            </div>
          );
        })
      )}
    </section>
  );
}
