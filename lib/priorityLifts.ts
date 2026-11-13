// Priority lifts: up to three exercises you're focusing on, picked in Settings and shown as
// slim pills at the top of every lifting day, so you see them often. Saved by name
// (profiles.priority_lift_1 / _2 / _3), so they work across days.

export const PRIORITY_SLOTS = 3;

export const MAX_PRIORITY_NAME = 80; // same limit as an exercise name

export type PriorityLift = { name: string; best: number | null }; // best = heaviest weight ever logged

export type PriorityValues = {
  priority_lift_1: string | null;
  priority_lift_2: string | null;
  priority_lift_3: string | null;
};

const clean = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Checks the picks sent by Settings (one per slot): blank = none, at most 80 characters
 * each, and the same exercise twice counts once. The picks fill the first slots in order,
 * so a gap (first blank, second set) moves up. Never trust the browser.
 */
export function parsePriorityLifts(
  picks: unknown[],
): { ok: true; values: PriorityValues } | { ok: false; message: string } {
  const names: string[] = [];
  for (const pick of picks.slice(0, PRIORITY_SLOTS)) {
    const name = clean(pick);
    if (!name) continue;
    if (name.length > MAX_PRIORITY_NAME) {
      return { ok: false, message: `Exercise names can be at most ${MAX_PRIORITY_NAME} characters.` };
    }
    if (!names.some((n) => sameName(n, name))) names.push(name);
  }
  return {
    ok: true,
    values: { priority_lift_1: names[0] ?? null, priority_lift_2: names[1] ?? null, priority_lift_3: names[2] ?? null },
  };
}

/** The saved picks from a profile row, in order (none if the row or the columns aren't there yet). */
export function priorityNames(row: Record<string, unknown> | null): string[] {
  const parsed = parsePriorityLifts([row?.priority_lift_1, row?.priority_lift_2, row?.priority_lift_3]);
  if (!parsed.ok) return [];
  const v = parsed.values;
  return [v.priority_lift_1, v.priority_lift_2, v.priority_lift_3].filter((n): n is string => n !== null);
}

/**
 * The choices for the Settings dropdowns: every exercise name in your plan, A to Z, each once
 * (ignoring capitals), plus anything already picked that's no longer in the plan.
 */
export function priorityChoices(planNames: string[], picked: string[]): string[] {
  const choices: string[] = [];
  for (const raw of [...picked, ...planNames]) {
    const name = raw.trim();
    if (name && !choices.some((c) => sameName(c, name))) choices.push(name);
  }
  return choices.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}
