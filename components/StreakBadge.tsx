"use client";

import { STREAK_CARD, STREAK_PLACEHOLDER } from "@/components/cardStyles";
import { computeStreak, milestoneMessage, nextMilestone } from "@/lib/streak";
import { useToday } from "@/components/useToday";

// A streak badge, used for both workouts (Fitness) and food logging (Nutrition).
// It needs to know today's date on YOUR phone, so it works it out in the browser
// and shows a placeholder-sized blank until then.
export default function StreakBadge({
  doneDates,
  restWeekdays,
  label = "Workout streak",
  startHint = "Log a workout or cardio today to start one.",
}: {
  doneDates: string[]; // dates you logged something
  restWeekdays: number[]; // 1 = Monday ... 7 = Sunday; these days never break a streak
  label?: string; // read aloud by screen readers
  startHint?: string; // shown when you have no streak yet
}) {
  const today = useToday();
  if (!today) return <div className={STREAK_PLACEHOLDER} aria-hidden="true" />; // keeps the layout steady

  const { current, longest, doneToday } = computeStreak(doneDates, today, new Set(restWeekdays));
  const celebration = milestoneMessage(current);
  const next = nextMilestone(current);

  return (
    <section aria-label={label} className={STREAK_CARD}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold">
          <span aria-hidden="true">🔥</span>{" "}
          {current > 0 ? `${current}-day streak` : "No streak yet"}
        </p>
        <p className="text-sm font-medium text-muted">Best: {longest}</p>
      </div>
      <p className={`mt-0.5 truncate text-sm ${celebration ? "font-medium text-accent" : "text-muted"}`}>
        {celebration ??
          (current === 0
            ? startHint
            : !doneToday
              ? "Log today to keep it going."
              : next
                ? `${next - current} more ${next - current === 1 ? "day" : "days"} to ${next}.`
                : "Incredible consistency!")}
      </p>
    </section>
  );
}
