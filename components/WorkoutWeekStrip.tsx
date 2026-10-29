"use client";

import Link from "next/link";
import { formatDayNumber, formatFullDate, formatWeekdayShort } from "@/lib/dates";
import type { DayKind } from "@/lib/workouts/defaults";
import { KIND_ICON, KIND_NAME } from "@/lib/workouts/weekSetup";
import { useToday } from "@/components/useToday";

export type WorkoutStripDay = {
  dateKey: string;
  kind: DayKind | null; // what the plan says for that weekday
  done: boolean; // you logged a workout or cardio that day
};

// The week at a glance: day name, date number, and what kind of day it is.
// A green ring around the number means you logged a workout or cardio that day.
// Days before today are dimmed (logged or not), so the days ahead stand out.
// Tap a day to see its plan. The selected day is highlighted.
// "use client" because "today" comes from the phone's clock; the server can't know it.
export default function WorkoutWeekStrip({
  days,
  selected,
  basePath,
}: {
  days: WorkoutStripDay[];
  selected: string;
  basePath: string; // the page the days link to, e.g. "/workouts"
}) {
  // null while the page is first drawn on the server; nothing is dimmed until the phone says what day it is.
  const today = useToday();

  return (
    <nav aria-label="Week" className="flex gap-1">
      {days.map((day) => {
        const isSelected = day.dateKey === selected;
        const isPast = today !== null && day.dateKey < today; // "YYYY-MM-DD" keys sort like dates
        const label = [formatFullDate(day.dateKey), day.kind ? KIND_NAME[day.kind] : null, day.done ? "workout logged" : null]
          .filter(Boolean)
          .join(", ");
        return (
          <Link
            key={day.dateKey}
            href={`${basePath}?date=${day.dateKey}`}
            aria-current={isSelected ? "date" : undefined}
            aria-label={label}
            className={`flex min-h-20 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 active:opacity-70 ${
              isSelected ? "bg-card" : ""
            }`}
          >
            <span className={`flex flex-col items-center gap-1 ${isPast ? "opacity-40" : ""}`}>
              <span className={`text-xs ${isSelected ? "font-semibold text-foreground" : "text-muted"}`}>
                {formatWeekdayShort(day.dateKey)}
              </span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-base ${
                  day.done ? "border-accent" : "border-transparent"
                } ${isSelected ? "font-bold" : "font-medium"}`}
              >
                {formatDayNumber(day.dateKey)}
              </span>
              {/* A day with both shows both icons, a little smaller so they fit. */}
              <span
                className={`flex h-4 items-center leading-none ${day.kind === "both" ? "text-[11px] tracking-tighter" : "text-base"}`}
                aria-hidden="true"
              >
                {day.kind ? KIND_ICON[day.kind] : ""}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
