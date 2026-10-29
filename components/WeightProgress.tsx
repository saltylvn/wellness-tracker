import Link from "next/link";
import type { ReactNode } from "react";
import PlanRefresher from "@/components/PlanRefresher";
import { formatDayNumber, formatShortMonth } from "@/lib/dates";
import { formatWeightLb } from "@/lib/weight";
import type { PlanSummary } from "@/lib/weightPlan";

const shortDate = (key: string) => `${formatShortMonth(key)} ${formatDayNumber(key)}`;
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}`;

// Your goal at a glance, in one card: start -> current -> target with a progress bar,
// the chart of your weigh-ins, then the pace you need each week, how many weeks that
// takes, and the date you'd get there.
export default function WeightProgress({
  start,
  current,
  target,
  plan,
  trend,
  note,
  source,
  refreshing,
  today,
  chart,
}: {
  start: number;
  current: number;
  target: number;
  plan: PlanSummary;
  trend: number | null; // your actual lb per week over the last 4 weeks (negative = losing)
  note: string | null; // the AI's one-line coaching note
  source: "ai" | "auto" | null;
  refreshing: boolean; // the plan is out of date and is being updated now
  today: string;
  chart: ReactNode; // the weigh-in chart (WeightChart), or nothing before your first weigh-in
}) {
  const verb = plan.direction === "gain" || (plan.direction === "done" && target > start) ? "gained" : "lost";
  const percent = Math.round(plan.progress * 100);

  return (
    <section aria-label="Goal progress" className="space-y-2 rounded-2xl bg-card p-4 pb-1">
      <div className="grid grid-cols-3 text-center">
        {(
          [
            ["Start", start],
            ["Current", current],
            ["Target", target],
          ] as const
        ).map(([label, lb]) => (
          <div key={label}>
            <p className="text-xs text-muted">{label}</p>
            <p className={`tabular-nums ${label === "Current" ? "text-xl font-bold" : "text-base font-semibold"}`}>
              {formatWeightLb(lb)}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div
          className="h-3 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-label="Progress to target"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
        <p className="flex justify-between text-xs text-muted tabular-nums">
          <span>
            {plan.doneLb >= 0
              ? `${formatWeightLb(plan.doneLb)} of ${formatWeightLb(plan.totalLb)} lb ${verb}`
              : `${formatWeightLb(-plan.doneLb)} lb past your start`}
          </span>
          <span className="font-semibold text-foreground">{percent}%</span>
        </p>
      </div>

      {chart}

      {plan.direction === "done" ? (
        <p className="rounded-xl bg-background p-3 text-center text-base font-semibold">🎯 You&apos;re at your target!</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-center">
          {(
            [
              ["lb / week", plan.pace === null ? "—" : formatWeightLb(plan.pace)],
              ["weeks to go", plan.weeks === null ? "—" : String(plan.weeks)],
              ["goal date", plan.goalDate === null ? "—" : shortDate(plan.goalDate)],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-background px-2 py-1.5">
              <p className="text-lg font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      )}

      {plan.direction !== "done" && (
        <div className="space-y-1">
          {refreshing ? (
            <PlanRefresher today={today} />
          ) : source === "ai" && note ? (
            <p className="text-sm">
              <span aria-hidden="true">✨</span> {note}
            </p>
          ) : null}
        </div>
      )}

      {/* Your recent trend and the Settings link share one line, to keep the card short. */}
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-xs text-muted tabular-nums">
          {plan.direction !== "done" && trend !== null && (
            <>
              Last 4 weeks: {signed(trend)} lb/week
              {plan.pace !== null &&
                ` · ${(plan.direction === "lose" ? -trend : trend) >= plan.pace ? "on pace 👍" : "behind pace"}`}
            </>
          )}
        </p>
        <Link
          href="/settings"
          className="flex min-h-11 shrink-0 items-center text-sm font-medium text-accent active:opacity-70"
        >
          Edit goal
        </Link>
      </div>
    </section>
  );
}
