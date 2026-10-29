// Picks "last time's" numbers for an exercise out of your past sets.
import type { LoggedSet } from "./logging";

export type HistoryRow = {
  exercise_id: string | null;
  session_date: string; // "YYYY-MM-DD"
  set_number: number;
  weight: number | null;
  reps: number | null;
  seconds: number | null; // set for a timed set (then weight and reps are empty)
};

/** The sets from the most recent day you did this exercise, in set order (weight or timed). */
export function latestSets(rows: HistoryRow[], exerciseId: string): LoggedSet[] {
  const mine = rows.filter(
    (r) => r.exercise_id === exerciseId && (r.seconds !== null || (r.weight !== null && r.reps !== null)),
  );
  if (mine.length === 0) return [];

  const latestDate = mine.reduce((max, r) => (r.session_date > max ? r.session_date : max), "");
  return mine
    .filter((r) => r.session_date === latestDate)
    .sort((a, b) => a.set_number - b.set_number)
    .map(({ weight, reps, seconds }) => ({ weight, reps, seconds }));
}
