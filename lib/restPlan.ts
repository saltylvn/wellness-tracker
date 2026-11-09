// The plan for a rest day: an easy recovery activity (a walk, a bike ride or yoga) with an
// optional target (miles for a walk or ride, minutes for yoga), or none. Set ahead of time on
// Edit plan, like a cardio day's plan; on the day, a "Completed" box logs it.
// Saved on the day itself (workout_days.rest_plan_activity / rest_plan_target).
import { formatWeight } from "./workouts/logging";
import { readNumberField } from "./cardio";

export const REST_ACTIVITIES = ["walk", "bike", "yoga"] as const;
export type RestActivity = (typeof REST_ACTIVITIES)[number];
export type RestPlan = { activity: RestActivity; target: number | null };

export const REST_ACTIVITY: Record<RestActivity, { icon: string; label: string; unit: "mi" | "min" }> = {
  walk: { icon: "🚶", label: "Walk", unit: "mi" },
  bike: { icon: "🚴", label: "Bike ride", unit: "mi" },
  yoga: { icon: "🧘", label: "Yoga", unit: "min" },
};

// The biggest target allowed: 100 miles, or 600 minutes of yoga.
const MAX_TARGET = { mi: 100, min: 600 } as const;

/**
 * Checks the plan sent by the editor: an activity ("" = no plan) and a target typed as text
 * (blank = no target). Never trust the browser.
 */
export function parseRestPlan(
  activity: unknown,
  targetText: unknown,
): { ok: true; plan: RestPlan | null } | { ok: false; message: string } {
  if (activity === "" || activity === null || activity === undefined) return { ok: true, plan: null };
  if (!(REST_ACTIVITIES as readonly unknown[]).includes(activity)) {
    return { ok: false, message: "Choose a walk, a bike ride, or yoga." };
  }
  const chosen = activity as RestActivity;
  const { unit } = REST_ACTIVITY[chosen];
  const typed = readNumberField(typeof targetText === "string" ? targetText : "");
  if (typed === "invalid") return { ok: false, message: "Enter the target as a number, like 2 or 2.5." };
  if (typed !== null && (typed <= 0 || typed > MAX_TARGET[unit])) {
    return { ok: false, message: `The target must be more than 0 and at most ${MAX_TARGET[unit]} ${unit}.` };
  }
  const target = typed === null ? null : Math.round(typed * 100) / 100;
  return { ok: true, plan: { activity: chosen, target: target === 0 ? null : target } };
}

/** The plan from the database row, or null (none, or the columns aren't there yet). */
export function restPlanFromRow(row: { rest_plan_activity?: unknown; rest_plan_target?: unknown } | null): RestPlan | null {
  const parsed = parseRestPlan(
    row?.rest_plan_activity ?? "",
    row?.rest_plan_target == null ? "" : String(row.rest_plan_target),
  );
  return parsed.ok ? parsed.plan : null;
}

/** "🚶 Walk · 2 mi", "🚴 Bike ride · 5 mi", "🧘 Yoga · 20 min", or "🧘 Yoga". */
export function formatRestPlan(plan: RestPlan): string {
  const { icon, label, unit } = REST_ACTIVITY[plan.activity];
  return plan.target === null ? `${icon} ${label}` : `${icon} ${label} · ${formatWeight(plan.target)} ${unit}`;
}

/** The cardio log kind a completed plan is saved as: a bike ride counts as cycling. */
export const REST_LOG_KIND: Record<RestActivity, "walk" | "cycle" | "yoga"> = { walk: "walk", bike: "cycle", yoga: "yoga" };

/**
 * The cardio log that ticking "Completed" saves: a walk or ride with its miles (so it counts
 * toward the weekly walking or cycling goal), or yoga with its minutes.
 */
export function restPlanToLog(plan: RestPlan): {
  kind: "walk" | "cycle" | "yoga";
  distance: number | null;
  unit: "mi" | null;
  minutes: number | null;
} {
  const kind = REST_LOG_KIND[plan.activity];
  if (REST_ACTIVITY[plan.activity].unit === "min") return { kind, distance: null, unit: null, minutes: plan.target };
  return { kind, distance: plan.target, unit: plan.target === null ? null : "mi", minutes: null };
}

/** True when the day has a log of the planned activity's kind. */
export function restPlanDone(plan: RestPlan, logs: { kind: string }[]): boolean {
  return logs.some((log) => log.kind === REST_LOG_KIND[plan.activity]);
}
