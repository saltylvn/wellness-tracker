// Pure helpers for logging sets: the wheel options, sensible defaults, and the
// checks the server runs before saving a set.

export const WEIGHT_STEP = 2.5; // pounds per click of the weight wheel
export const WEIGHT_MAX = 600;
export const REPS_MAX = 50;

export const DEFAULT_WEIGHT = 100;
export const DEFAULT_DUMBBELL_WEIGHT = 25;
export const DEFAULT_REPS = 10;

// 0, 2.5, 5, ... 600
export const WEIGHT_OPTIONS: number[] = Array.from(
  { length: WEIGHT_MAX / WEIGHT_STEP + 1 },
  (_, i) => i * WEIGHT_STEP,
);

// 1, 2, ... 50
export const REP_OPTIONS: number[] = Array.from({ length: REPS_MAX }, (_, i) => i + 1);

/** "Lateral raises (dumbbell)" -> true. Also catches the common "dumbell" typo. */
export function isDumbbell(name: string): boolean {
  return /dumb{1,2}ell/i.test(name);
}

/** Rounds to the nearest wheel position (2.5 lb) and keeps it on the wheel. */
export function snapWeight(weight: number): number {
  const clamped = Math.min(WEIGHT_MAX, Math.max(0, weight));
  return Math.round(clamped / WEIGHT_STEP) * WEIGHT_STEP;
}

/**
 * Where the weight wheel starts: the weight you last used for this exercise if
 * there is one, otherwise 100 lb (25 lb for dumbbell exercises).
 */
export function defaultWeightFor(name: string, lastWeight?: number | null): number {
  if (lastWeight !== undefined && lastWeight !== null && Number.isFinite(lastWeight)) {
    return snapWeight(lastWeight);
  }
  return isDumbbell(name) ? DEFAULT_DUMBBELL_WEIGHT : DEFAULT_WEIGHT;
}

/** Where the reps wheel starts: last reps, else the top of your rep range, else 10. */
export function defaultRepsFor(repMax: number | null, lastReps?: number | null): number {
  const start = lastReps ?? repMax ?? DEFAULT_REPS;
  return Math.min(REPS_MAX, Math.max(1, Math.round(start)));
}

/** 100 -> "100", 102.5 -> "102.5" */
export function formatWeight(weight: number): string {
  return Number.isInteger(weight) ? String(weight) : weight.toFixed(1);
}

/** "135 × 10" */
export function formatSet(weight: number, reps: number): string {
  return `${formatWeight(weight)} × ${reps}`;
}

/** "135 × 10 + 135 × 9 + 130 × 8" */
export function summarizeSets(sets: { weight: number; reps: number }[]): string {
  return sets.map((s) => formatSet(s.weight, s.reps)).join(" + ");
}

export type SetInputResult =
  | { ok: true; weight: number; reps: number }
  | { ok: false; message: string };

// Never trust the browser: this runs on the server before a set is saved.
export function validateSetInput(weight: unknown, reps: unknown): SetInputResult {
  if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0 || weight > 2000) {
    return { ok: false, message: "Weight must be between 0 and 2,000." };
  }
  if (typeof reps !== "number" || !Number.isInteger(reps) || reps < 1 || reps > 1000) {
    return { ok: false, message: "Reps must be a whole number from 1 to 1,000." };
  }
  return { ok: true, weight: Math.round(weight * 100) / 100, reps };
}
