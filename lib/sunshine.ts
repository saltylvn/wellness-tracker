// Sunshine: minutes outside in the sun, logged once a day (every day) on a scroll wheel,
// with an optional daily target set in Settings (profiles.daily_sunshine_minutes).
// It's a quiet little extra: it doesn't count toward streaks or the week rings.
// Saved in the tanning_logs table (its old name, so earlier entries are kept).

export const MIN_SUNSHINE_MINUTES = 5;
export const MAX_SUNSHINE_MINUTES = 60;
export const DEFAULT_SUNSHINE_MINUTES = 10;
export const MAX_SUNSHINE_GOAL = 240; // the daily target can be up to 4 hours

/** 5, 6, 7 ... 60: the choices on the wheel. */
export const SUNSHINE_MINUTE_OPTIONS: number[] = Array.from(
  { length: MAX_SUNSHINE_MINUTES - MIN_SUNSHINE_MINUTES + 1 },
  (_, i) => MIN_SUNSHINE_MINUTES + i,
);

/** A whole number from 5 to 60, or null if it's anything else. */
export function parseSunshineMinutes(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value >= MIN_SUNSHINE_MINUTES && value <= MAX_SUNSHINE_MINUTES ? value : null;
}

/** Where the wheel starts: today's minutes, else last time's, else 10, kept on the wheel. */
export function wheelStart(minutes: number | null, lastMinutes: number | null): number {
  const start = minutes ?? lastMinutes ?? DEFAULT_SUNSHINE_MINUTES;
  return Math.min(MAX_SUNSHINE_MINUTES, Math.max(MIN_SUNSHINE_MINUTES, start));
}

/** True once the day's minutes reach the daily target (never, with no target). */
export function reachedSunshineGoal(minutes: number | null, goal: number | null): boolean {
  return goal !== null && minutes !== null && minutes >= goal;
}
