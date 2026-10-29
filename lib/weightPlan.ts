// The Weight tab's goal math: where you started, where you are, where you're going,
// how fast (lb per week), and how many weeks that takes. Every number on screen is
// worked out here, so it's always exact (the AI only writes the one-line coaching note:
// lib/ai/weightCoach.ts). Pure functions, no database, so they're easy to test.

/** The weekly pace when you haven't chosen one in Settings: 2 lb a week toward your target. */
export const WEEKLY_PACE_LB = 2;

/** The weekly paces you can choose in Settings (lb per week). */
export const PACE_CHOICES = [0.5, 1, 1.5, 2] as const;

/** Your chosen pace (saved in Settings), or 2 lb a week if you haven't picked one. */
export function chosenPace(saved: number | null | undefined): number {
  return saved !== null && saved !== undefined && Number.isFinite(saved) && saved > 0 ? saved : WEEKLY_PACE_LB;
}

import { addDays, daysBetween } from "./dates";

export type WeighIn = { date: string; pounds: number };
export type Direction = "lose" | "gain" | "done";

// The paces we'll ever show, in lb per week. Anything the AI suggests outside these
// is pulled back in: about 0.5-1% of body weight a week is the usual safe range for
// losing, and slower for gaining (so it's mostly muscle).
export const PACE_LIMITS = {
  lose: { min: 0.25, max: 2 },
  gain: { min: 0.25, max: 1 },
} as const;

/** Losing, gaining, or already there (within 0.05 lb). */
export function goalDirection(current: number, target: number): Direction {
  if (Math.abs(current - target) < 0.05) return "done";
  return current > target ? "lose" : "gain";
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;
const tenth = (n: number) => Math.round(n * 10) / 10;

/** Keeps a suggested pace inside the safe range, rounded to 0.05 lb. */
export function clampPace(pace: number, direction: Exclude<Direction, "done">): number {
  const { min, max } = PACE_LIMITS[direction];
  const safe = Number.isFinite(pace) ? pace : min;
  return roundTo(Math.min(max, Math.max(min, safe)), 0.05);
}

/** Your starting weight: the one in Settings, else your first weigh-in, else none. */
export function resolveStart(setting: number | null, first: WeighIn | null): number | null {
  return setting ?? first?.pounds ?? null;
}

/**
 * Your actual recent pace in lb per week (negative = losing), from the weigh-ins in
 * the last `windowDays` days. It draws the best straight line through them, so one
 * odd day doesn't swing it much. Needs 2+ weigh-ins at least a week apart, else null.
 */
export function recentTrend(logs: WeighIn[], windowDays = 28): number | null {
  if (logs.length < 2) return null;
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted.at(-1)!.date;
  const points = sorted
    .filter((log) => daysBetween(log.date, last) <= windowDays)
    .map((log) => ({ x: daysBetween(last, log.date), y: log.pounds }));
  if (points.length < 2 || -points[0].x < 7) return null;

  const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  let top = 0;
  let bottom = 0;
  for (const p of points) {
    top += (p.x - meanX) * (p.y - meanY);
    bottom += (p.x - meanX) ** 2;
  }
  return tenth((top / bottom) * 7) + 0; // "+ 0" turns -0 into 0
}

export type PlanSummary = {
  direction: Direction;
  totalLb: number; // start -> target
  doneLb: number; // how much of that you've done (negative if you've gone the other way)
  remainingLb: number; // current -> target
  progress: number; // 0 to 1, for the progress bar
  pace: number | null; // lb per week toward the target
  weeks: number | null; // weeks left at that pace
  goalDate: string | null; // the day you'd reach it
};

/** Everything the progress card shows, from four numbers and today's date. */
export function planSummary(input: {
  start: number;
  current: number;
  target: number;
  pace: number | null;
  today: string;
}): PlanSummary {
  const { start, current, target, today } = input;
  const direction = goalDirection(current, target);
  const totalLb = tenth(Math.abs(start - target));
  // Positive when you've moved from the start toward the target.
  const doneLb = tenth(start > target ? start - current : current - start);
  const remainingLb = tenth(Math.abs(current - target));

  if (direction === "done") {
    return { direction, totalLb, doneLb: totalLb, remainingLb: 0, progress: 1, pace: null, weeks: 0, goalDate: today };
  }

  const progress = totalLb === 0 ? 0 : Math.min(1, Math.max(0, doneLb / totalLb));
  const pace = input.pace === null ? null : clampPace(input.pace, direction);
  const weeks = pace === null ? null : Math.max(1, Math.ceil(remainingLb / pace));
  const goalDate = pace === null ? null : addDays(today, Math.ceil((remainingLb / pace) * 7));
  return { direction, totalLb, doneLb, remainingLb, progress, pace, weeks, goalDate };
}

/** The numbers a saved coaching note was written for. When any changes, ask the AI again. */
export function coachKey(start: number, current: number, target: number, pace: number = WEEKLY_PACE_LB): string {
  return [start, current, target, pace].map((n) => n.toFixed(1)).join("|");
}

/**
 * Start, current (your latest weigh-in) and target, once all three are known; else null.
 * `logs` are oldest first.
 */
export function goalNumbers(input: {
  logs: WeighIn[];
  first: WeighIn | null;
  startSetting: number | null;
  targetSetting: number | null;
}): { start: number; current: number; target: number } | null {
  const start = resolveStart(input.startSetting, input.first);
  const current = input.logs.at(-1)?.pounds ?? null;
  const target = input.targetSetting;
  return start === null || current === null || target === null ? null : { start, current, target };
}
