// The cardio plan for a weekday: which of the three (run, cycle, swim) you'll do and,
// optionally, a target: a distance in miles, km, meters (or yards for swims), or a time in
// minutes. Set ahead of time on Edit plan; on the day, a "Completed" box logs it for you.
// Saved on the day itself (workout_days.cardio_plan_kind / cardio_plan_distance / cardio_plan_unit).
import { CARDIO, CARDIO_KINDS, MAX_MINUTES, readNumberField, type CardioKind, type CardioLogRow } from "./cardio";
import { formatWeight } from "./workouts/logging";

export type PlanUnit = "mi" | "km" | "m" | "yd" | "min";

export type CardioPlan = { kind: CardioKind; target: number | null; unit: PlanUnit };

/** The target choices for each kind, the first being the default (what plans used before units). */
export const PLAN_UNITS: Record<CardioKind, PlanUnit[]> = {
  run: ["mi", "km", "m", "min"],
  cycle: ["mi", "km", "m", "min"],
  swim: ["yd", "m", "mi", "km", "min"],
};

export const UNIT_LABELS: Record<PlanUnit, string> = { mi: "Miles", km: "Km", m: "Meters", yd: "Yards", min: "Time" };

// The biggest target allowed in each unit (the database allows 100,000).
const MAX_TARGET: Record<PlanUnit, number> = { mi: 500, km: 800, m: 100000, yd: 100000, min: MAX_MINUTES };

export const defaultUnit = (kind: CardioKind): PlanUnit => PLAN_UNITS[kind][0];

export type CardioPlanResult = { ok: true; plan: CardioPlan | null } | { ok: false; message: string };

/**
 * Checks the cardio plan sent by the editor: a kind ("" for no plan), a unit, and a target
 * typed as text (blank = no target). Never trust the browser.
 */
export function parseCardioPlan(kind: unknown, unit: unknown, targetText: unknown): CardioPlanResult {
  if (kind === "" || kind === null || kind === undefined) return { ok: true, plan: null };
  if (!(CARDIO_KINDS as readonly unknown[]).includes(kind)) return { ok: false, message: "Choose run, cycle, or swim." };
  const cardioKind = kind as CardioKind;
  const planUnit = (unit === "" || unit === null || unit === undefined ? defaultUnit(cardioKind) : unit) as PlanUnit;
  if (!PLAN_UNITS[cardioKind].includes(planUnit)) return { ok: false, message: "Choose miles, km, meters, or time." };

  const typed = readNumberField(typeof targetText === "string" ? targetText : "");
  if (typed === "invalid") return { ok: false, message: "Enter the target as a number, like 3 or 3.1." };
  if (typed !== null && (typed <= 0 || typed > MAX_TARGET[planUnit])) {
    return {
      ok: false,
      message: `The target must be more than 0 and at most ${MAX_TARGET[planUnit].toLocaleString("en-US")} ${planUnit}.`,
    };
  }
  const target = typed === null ? null : Math.round(typed * 100) / 100;
  return { ok: true, plan: { kind: cardioKind, target: target === 0 ? null : target, unit: planUnit } };
}

/** A plan from the database row, or null if none (or the columns aren't there yet). */
export function planFromRow(
  row: { cardio_plan_kind?: unknown; cardio_plan_distance?: unknown; cardio_plan_unit?: unknown } | null,
): CardioPlan | null {
  const result = parseCardioPlan(
    row?.cardio_plan_kind ?? "",
    row?.cardio_plan_unit ?? "",
    row?.cardio_plan_distance == null ? "" : String(row.cardio_plan_distance),
  );
  return result.ok ? result.plan : null;
}

/** "🏃 Run · 3 mi", "🏃 Run · 5 km", "🏊 Swim · 1,000 yd", "🚴 Cycle · 45 min", or "🚴 Cycle". */
export function formatCardioPlan(plan: CardioPlan): string {
  const { icon, label } = CARDIO[plan.kind];
  if (plan.target === null) return `${icon} ${label}`;
  const amount =
    plan.unit === "m" || plan.unit === "yd" ? plan.target.toLocaleString("en-US") : formatWeight(plan.target);
  return `${icon} ${label} · ${amount} ${plan.unit}`;
}

// How many of each unit make one mile.
const PER_MILE: Record<Exclude<PlanUnit, "min">, number> = { mi: 1, km: 1.609344, m: 1609.344, yd: 1760 };

/**
 * The cardio log that ticking "Completed" saves. A distance is converted to the unit your
 * weekly goals add up (miles for run and cycle, yards for swim), so it counts toward them;
 * a time target is saved as the log's minutes.
 */
export function planToLog(plan: CardioPlan): { distance: number | null; unit: "mi" | "yd" | null; minutes: number | null } {
  if (plan.target === null) return { distance: null, unit: null, minutes: null };
  if (plan.unit === "min") return { distance: null, unit: null, minutes: plan.target };
  const logUnit = CARDIO[plan.kind].unit === "yd" ? "yd" : "mi";
  const miles = plan.target / PER_MILE[plan.unit];
  const distance = Math.round(miles * PER_MILE[logUnit] * 100) / 100;
  return { distance: distance > 0 ? distance : null, unit: distance > 0 ? logUnit : null, minutes: null };
}

/** The day's log that completes the plan: one of the same kind (the first, if several). */
export function completingLog(plan: CardioPlan, logs: CardioLogRow[]): CardioLogRow | null {
  return logs.find((log) => log.kind === plan.kind) ?? null;
}
