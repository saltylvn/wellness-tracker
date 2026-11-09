import { CARDIO, CARDIO_KINDS, type CardioKind } from "./cardio";

// Weekly distance goals for run, cycle, swim, and walk. A goal of null means "no goal".
// Run, cycle and walk are in miles; swim is in yards.

export type WeeklyGoals = Record<CardioKind, number | null>;

// What a new account starts with: 5 miles of running, 10 of cycling, no swim or walk goal.
export const DEFAULT_WEEKLY_GOALS: WeeklyGoals = { run: 5, cycle: 10, swim: null, walk: null };

type LogLike = { kind: string; distance: number | null; distance_unit: string | null };

/** Adds up this week's distance for each activity (only logs in that activity's unit). */
export function weeklyTotals(logs: LogLike[]): Record<CardioKind, number> {
  const totals: Record<CardioKind, number> = { run: 0, cycle: 0, swim: 0, walk: 0 };
  for (const log of logs) {
    const kind = CARDIO_KINDS.find((k) => k === log.kind);
    if (!kind || log.distance === null) continue;
    if (log.distance_unit !== CARDIO[kind].unit) continue;
    totals[kind] += Number(log.distance);
  }
  for (const kind of CARDIO_KINDS) totals[kind] = Math.round(totals[kind] * 100) / 100;
  return totals;
}

export type GoalProgress = {
  percent: number; // 0 to 100, for the bar
  reached: boolean;
  remaining: number; // distance left to reach the goal (0 once reached)
};

/** How far along you are. Returns null when there's no goal to measure against. */
export function goalProgress(total: number, goal: number | null): GoalProgress | null {
  if (goal === null || goal <= 0) return null;
  return {
    percent: Math.min(100, Math.max(0, (total / goal) * 100)),
    reached: total >= goal,
    remaining: Math.max(0, Math.round((goal - total) * 100) / 100),
  };
}
