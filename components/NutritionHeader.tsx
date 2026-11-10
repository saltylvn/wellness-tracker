import Link from "next/link";
import type { ReactNode } from "react";
import SettingsGear from "@/components/SettingsGear";
import StreakBadge from "@/components/StreakBadge";
import TodayPill from "@/components/TodayPill";
import WeekStrip, { type WeekDay } from "@/components/WeekStrip";
import { addDays } from "@/lib/dates";

const arrowClass =
  "flex h-11 w-11 items-center justify-center rounded-full text-2xl text-muted active:bg-card";

// The top of the Nutrition tab, laid out like the Fitness and Weight tabs: title on the left,
// "Today / Jump to today" and settings on the right, your streak, then the week strip right
// under it (orange or red ring per day, against your calorie goal; it also shows which day
// you're on, so there's no separate date line), then the day's calories card and the macros card.
export default function NutritionHeader({
  date,
  goal,
  week,
  foodDates,
  calories,
  macros,
}: {
  date: string;
  goal: number | null;
  week: WeekDay[];
  foodDates: string[]; // days you logged food, for the streak
  calories: ReactNode; // the CaloriesCard for this day (above the macros)
  macros: ReactNode; // the MacrosCard for this day
}) {
  return (
    <header className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nutrition</h1>
        <div className="flex items-center gap-1">
          <TodayPill dateKey={date} href="/food" />
          <SettingsGear />
        </div>
      </div>

      <StreakBadge
        doneDates={foodDates}
        restWeekdays={[]}
        label="Food logging streak"
        startHint="Log a meal or snack today to start one."
      />

      <div className="flex items-center gap-1">
        <Link href={`/food?date=${addDays(date, -7)}`} aria-label="Previous week" className={arrowClass}>
          ‹
        </Link>
        <div className="min-w-0 flex-1">
          <WeekStrip days={week} selected={date} goal={goal} />
        </div>
        <Link href={`/food?date=${addDays(date, 7)}`} aria-label="Next week" className={arrowClass}>
          ›
        </Link>
      </div>

      {calories}

      {macros}
    </header>
  );
}
