// Choosing which weekdays are lifting or cardio days ("Your week" on the Fitness tab).
// Monday to Saturday can be lift, cardio, or neither (rest); Sunday is always a recovery day.
// Each weekday row in workout_days keeps its exercises even when you switch it to cardio
// or rest, so switching it back to lifting brings them back.

import { REST_DAY_TITLE, type DayKind } from "./defaults";

export const DAY_KINDS: DayKind[] = ["lift", "cardio", "rest"];
export const KIND_ICON: Record<DayKind, string> = { lift: "🏋️", cardio: "🏃", rest: "🧘" };
export const KIND_NAME: Record<DayKind, string> = { lift: "Lifting", cardio: "Cardio", rest: "Rest" };

// Titles that only describe a kind of day (not a real lifting day's name like "Legs").
const GENERIC_TITLES = new Set(["Cardio", "Rest Day", REST_DAY_TITLE, "Lifting"]);

/** The heading for a day: cardio and rest always use their own names; lifting days use yours. */
export function dayTitle(day: { kind: DayKind; title: string }): string {
  if (day.kind === "rest") return REST_DAY_TITLE;
  if (day.kind === "cardio") return "Cardio";
  return GENERIC_TITLES.has(day.title) ? "Lifting" : day.title;
}

/**
 * The title to save when a day changes kind. A day becoming a lifting day gets "Lifting"
 * unless it already has a lifting name. Otherwise the old title is kept, so a lifting
 * day switched to cardio and back is still called "Legs".
 */
export function titleAfterChange(kind: DayKind, currentTitle: string): string {
  if (kind === "lift" && GENERIC_TITLES.has(currentTitle)) return "Lifting";
  return currentTitle;
}

export const MAX_DAY_NAME_LENGTH = 40;

/**
 * Checks the name you type for a lifting day ("Legs", "Push day"...): extra spaces are
 * tidied up, and a blank name becomes "Lifting". Too long gives null.
 */
export function parseDayName(raw: unknown): string | null {
  const name = (typeof raw === "string" ? raw : "").replace(/\s+/g, " ").trim();
  if (name.length > MAX_DAY_NAME_LENGTH) return null;
  return name === "" ? "Lifting" : name;
}

/** What to show in the name box: a lifting day's own name, or empty for a generic one. */
export function editableDayName(title: string): string {
  return GENERIC_TITLES.has(title) ? "" : title;
}

/** True for a week that hasn't been planned yet: no lifting or cardio days at all. */
export function isBlankWeek(days: { kind: DayKind }[]): boolean {
  return days.every((day) => day.kind === "rest");
}

/** Sunday (weekday 7) is always a recovery day; it can't be planned. */
export const PLANNABLE_WEEKDAYS = [1, 2, 3, 4, 5, 6];

/**
 * Checks the week sent by the browser: Monday to Saturday (1-6), each lift, cardio, or
 * rest. Sunday is added as rest whatever the browser sent.
 */
export function parseWeekKinds(raw: unknown): Map<number, DayKind> | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const week = new Map<number, DayKind>();
  for (const weekday of PLANNABLE_WEEKDAYS) {
    const kind = (raw as Record<string, unknown>)[String(weekday)];
    if (typeof kind !== "string" || !DAY_KINDS.includes(kind as DayKind)) return null;
    week.set(weekday, kind as DayKind);
  }
  week.set(7, "rest");
  return week;
}

/** Tapping a day in the Lift or Cardio row: turns it on (and off in the other row), or off (rest). */
export function toggleDay(kinds: DayKind[], index: number, row: "lift" | "cardio"): DayKind[] {
  return kinds.map((kind, i) => (i !== index ? kind : kind === row ? "rest" : row));
}
