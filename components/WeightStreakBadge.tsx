"use client";

import { useToday } from "@/components/useToday";
import { formatWeight } from "@/lib/workouts/logging";
import { computeWeightStreak, type WeighInPoint } from "@/lib/weightStreak";

// The weekly weight streak at the top of the Weight tab, styled like the Fitness and
// Nutrition streaks: weeks in a row you lost at least 1 lb (see lib/weightStreak.ts).
// It needs today's date on YOUR phone, so it works it out in the browser.
export default function WeightStreakBadge({ logs }: { logs: WeighInPoint[] }) {
  const today = useToday();
  if (!today) return <div className="h-[72px]" aria-hidden="true" />; // keeps the layout steady

  const { current, longest, thisWeekCounts, keepGoingAt } = computeWeightStreak(logs, today);
  const hint = thisWeekCounts
    ? "This week counts. Nice work!"
    : keepGoingAt !== null
      ? `Get to ${formatWeight(keepGoingAt)} lb this week to ${current > 0 ? "keep it going" : "start one"}.`
      : "Lose at least 1 lb in a week to start one.";

  return (
    <section aria-label="Weight loss streak" className="rounded-2xl bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold">
          <span aria-hidden="true">🔥</span>{" "}
          {current > 0 ? `${current}-week streak` : "No streak yet"}
        </p>
        <p className="text-sm font-medium text-muted">Best: {longest}</p>
      </div>
      <p className={`mt-0.5 text-sm ${thisWeekCounts ? "font-medium text-accent" : "text-muted"}`}>{hint}</p>
    </section>
  );
}
