import type { ReactNode } from "react";
import Link from "next/link";
import SettingsGear from "@/components/SettingsGear";
import StreakBadge from "@/components/StreakBadge";
import TodayPill from "@/components/TodayPill";
import WeekSetup from "@/components/WeekSetup";
import WorkoutWeekStrip from "@/components/WorkoutWeekStrip";
import { weekPlanPath } from "@/lib/workouts/plan";
import { addDays, isoWeekday, weekDays } from "@/lib/dates";
import type { WorkoutDay } from "@/lib/workouts/plan";

const arrowClass =
  "flex h-11 w-11 items-center justify-center rounded-full text-2xl text-muted active:bg-card";

// The top of the Fitness page: title, your streak (in the same spot as on Nutrition), your
// gym check-in barcode (`barcode`), "Your week" (toggles for lifting and cardio days, with
// an "Edit plan" link to the whole week's plan), and the week strip with a green ring on
// every day you logged a workout or cardio.
export default function FitnessHeader({
  date,
  days,
  doneDates,
  barcode,
}: {
  date: string;
  days: WorkoutDay[]; // your weekly plan
  doneDates: string[]; // dates you logged a workout or cardio
  barcode?: ReactNode; // the gym check-in barcode card, right under the streak
}) {
  const basePath = "/workouts";
  const byWeekday = new Map(days.map((d) => [d.weekday, d]));
  const done = new Set(doneDates);
  const restWeekdays = days.filter((d) => d.kind === "rest").map((d) => d.weekday);

  return (
    <header className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fitness</h1>
        <div className="flex items-center gap-1">
          <TodayPill dateKey={date} href={basePath} />
          <SettingsGear />
        </div>
      </div>

      <StreakBadge doneDates={doneDates} restWeekdays={restWeekdays} />

      {barcode}

      <WeekSetup days={days} editPlanHref={weekPlanPath(date)} />

      <div className="flex items-center gap-1">
        <Link href={`${basePath}?date=${addDays(date, -7)}`} aria-label="Previous week" className={arrowClass}>
          ‹
        </Link>
        <div className="min-w-0 flex-1">
          <WorkoutWeekStrip
            selected={date}
            basePath={basePath}
            days={weekDays(date).map((dateKey) => ({
              dateKey,
              kind: byWeekday.get(isoWeekday(dateKey))?.kind ?? null,
              done: done.has(dateKey),
            }))}
          />
        </div>
        <Link href={`${basePath}?date=${addDays(date, 7)}`} aria-label="Next week" className={arrowClass}>
          ›
        </Link>
      </div>
    </header>
  );
}
