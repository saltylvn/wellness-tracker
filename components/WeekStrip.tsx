"use client";

import Link from "next/link";
import { useToday } from "@/components/useToday";
import { formatDayNumber, formatFullDate, formatWeekdayShort } from "@/lib/dates";
import { getGoalStatus } from "@/lib/goalStatus";

export type WeekDay = { dateKey: string; calories: number; hasEntries: boolean };

// The whole week at a glance: day name + date number, with a ring that is
// orange (at/under goal) or red (over goal) for days that have food logged.
// Laid out like the Fitness calendar (same height, same spacing): a ✅ under each day
// you logged food, and days before today dimmed the same way. Tap a day to jump to it. The selected day is highlighted.
// "use client" because "today" comes from the phone's clock; the server can't know it.
export default function WeekStrip({
  days,
  selected,
  goal,
}: {
  days: WeekDay[];
  selected: string;
  goal: number | null;
}) {
  const today = useToday(); // null on the server: nothing is dimmed until the phone says what day it is

  return (
    <nav aria-label="Week" className="flex gap-1">
      {days.map((day) => {
        const isSelected = day.dateKey === selected;
        const isPast = today !== null && day.dateKey < today; // "YYYY-MM-DD" keys sort like dates
        const status = day.hasEntries ? getGoalStatus(day.calories, goal) : null;
        const ring =
          status === "under"
            ? "border-accent"
            : status === "over"
              ? "border-danger"
              : status === "none"
                ? "border-muted"
                : "border-transparent";

        return (
          <Link
            key={day.dateKey}
            href={`/food?date=${day.dateKey}`}
            aria-current={isSelected ? "date" : undefined}
            aria-label={`${formatFullDate(day.dateKey)}${day.hasEntries ? ", food logged" : ""}`}
            className={`flex min-h-20 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 active:opacity-70 ${
              isSelected ? "bg-card" : ""
            }`}
          >
            <span className={`flex flex-col items-center gap-1 ${isPast ? "opacity-40" : ""}`}>
              <span className={`text-xs ${isSelected ? "font-semibold text-foreground" : "text-muted"}`}>
                {formatWeekdayShort(day.dateKey)}
              </span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-base ${ring} ${
                  isSelected ? "font-bold" : "font-medium"
                }`}
              >
                {formatDayNumber(day.dateKey)}
              </span>
              {/* A ✅ on days you logged food, in the same row and size as the Fitness day icons,
                  so both calendars match. Days with nothing logged keep the row empty. */}
              <span className="h-4 text-base leading-none" aria-hidden="true">
                {day.hasEntries ? "✅" : ""}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
