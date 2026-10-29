// Priority lifts: up to two exercises you're focusing on, picked in Settings and shown as
// two small boxes at the top of every lifting day, so you see them often. Saved by name
// (profiles.priority_lift_1 / priority_lift_2), so they work across days.

export const MAX_PRIORITY_NAME = 80; // same limit as an exercise name

export type PriorityLift = { name: string; best: number | null }; // best = heaviest weight ever logged

export type PriorityValues = { priority_lift_1: string | null; priority_lift_2: string | null };

const clean = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Checks the two picks sent by Settings: blank = none, at most 80 characters each, and the
 * same exercise twice counts once. Never trust the browser.
 */
export function parsePriorityLifts(
  first: unknown,
  second: unknown,
): { ok: true; values: PriorityValues } | { ok: false; message: string } {
  const one = clean(first);
  let two = clean(second);
  if ((one?.length ?? 0) > MAX_PRIORITY_NAME || (two?.length ?? 0) > MAX_PRIORITY_NAME) {
    return { ok: false, message: `Exercise names can be at most ${MAX_PRIORITY_NAME} characters.` };
  }
  if (one && two && sameName(one, two)) two = null;
  // Fill the first slot first.
  return one || !two
    ? { ok: true, values: { priority_lift_1: one, priority_lift_2: two } }
    : { ok: true, values: { priority_lift_1: two, priority_lift_2: null } };
}

/** The saved picks from a profile row (none if the row or the columns aren't there yet). */
export function priorityNames(row: Record<string, unknown> | null): string[] {
  const parsed = parsePriorityLifts(row?.priority_lift_1, row?.priority_lift_2);
  if (!parsed.ok) return [];
  return [parsed.values.priority_lift_1, parsed.values.priority_lift_2].filter((n): n is string => n !== null);
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
