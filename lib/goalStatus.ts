// Drives the color of the date circle.
//  - "under": at or below the daily calorie goal -> orange
//  - "over":  above the goal                     -> red
//  - "none":  no goal set yet                    -> neutral grey
export type GoalStatus = "under" | "over" | "none";

export function getGoalStatus(
  calories: number,
  goal: number | null | undefined,
): GoalStatus {
  if (!goal || goal <= 0) return "none";
  return calories > goal ? "over" : "under";
}
