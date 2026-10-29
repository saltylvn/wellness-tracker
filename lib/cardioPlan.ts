// The cardio plan for a weekday: which of the three (run, cycle, swim) you'll do and,
// optionally, how far. Set ahead of time on Edit plan; on the day, a "Completed" box logs
// it for you. Saved on the day itself (workout_days.cardio_plan_kind / cardio_plan_distance).
import { CARDIO, readNumberField, validateCardio, type CardioKind, type CardioLogRow } from "./cardio";
import { formatWeight } from "./workouts/logging";

export type CardioPlan = { kind: CardioKind; distance: number | null };

export type CardioPlanResult = { ok: true; plan: CardioPlan | null } | { ok: false; message: string };

/**
 * Checks the cardio plan sent by the editor: a kind (or "" for no plan) and a target
 * distance typed as text (blank = no target). Never trust the browser.
 */
export function parseCardioPlan(kind: unknown, distanceText: unknown): CardioPlanResult {
  if (kind === "" || kind === null || kind === undefined) return { ok: true, plan: null };
  const typed = readNumberField(typeof distanceText === "string" ? distanceText : "");
  if (typed === "invalid") return { ok: false, message: "Enter the target distance as a number, like 3 or 3.1." };
  const checked = validateCardio(kind, typed, null);
  if (!checked.ok) return checked;
  return { ok: true, plan: { kind: checked.kind, distance: checked.distance } };
}

/** A plan from the database row, or null if none (or the columns aren't there yet). */
export function planFromRow(row: { cardio_plan_kind?: unknown; cardio_plan_distance?: unknown } | null): CardioPlan | null {
  const result = parseCardioPlan(row?.cardio_plan_kind ?? "", row?.cardio_plan_distance == null ? "" : String(row.cardio_plan_distance));
  return result.ok ? result.plan : null;
}

/** "🏃 Run · 3 mi", "🏊 Swim · 1,000 yd", or "🚴 Cycle" with no target. */
export function formatCardioPlan(plan: CardioPlan): string {
  const { icon, label, unit } = CARDIO[plan.kind];
  if (plan.distance === null) return `${icon} ${label}`;
  const amount = unit === "yd" ? plan.distance.toLocaleString("en-US") : formatWeight(plan.distance);
  return `${icon} ${label} · ${amount} ${unit}`;
}

/** The day's log that completes the plan: one of the same kind (the first, if several). */
export function completingLog(plan: CardioPlan, logs: CardioLogRow[]): CardioLogRow | null {
  return logs.find((log) => log.kind === plan.kind) ?? null;
}
