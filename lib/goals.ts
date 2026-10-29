import { PACE_CHOICES } from "./weightPlan";

// Goals from the Settings form. The daily calorie goal is required (it drives the
// green/red date circle). The three daily macro goals and the three weekly cardio
// distance goals are optional: a blank field means "no goal for this one".

export type Goals = {
  calorie_goal: number;
  protein_goal_g: number | null;
  carb_goal_g: number | null;
  fat_goal_g: number | null;
  weekly_run_miles: number | null;
  weekly_cycle_miles: number | null;
  weekly_swim_yards: number | null;
  target_weight_lb: number | null;
  start_weight_lb: number | null;
  weight_pace_lb_week: number | null; // your weekly weight pace (one of PACE_CHOICES); null = 2 lb
  daily_sunshine_minutes: number | null; // daily sunshine target; null = none
};

export type GoalsResult = { ok: true; values: Goals } | { ok: false; message: string };

// These limits match the CHECK rules in the profiles table.
export const GOAL_LIMITS = {
  calorie_goal: { min: 500, max: 10000 },
  protein_goal_g: { min: 1, max: 1000 },
  carb_goal_g: { min: 1, max: 2000 },
  fat_goal_g: { min: 1, max: 1000 },
  weekly_run_miles: { min: 0.1, max: 500 },
  weekly_cycle_miles: { min: 0.1, max: 500 },
  weekly_swim_yards: { min: 1, max: 100000 },
  target_weight_lb: { min: 70, max: 500 },
  start_weight_lb: { min: 70, max: 500 },
  daily_sunshine_minutes: { min: 1, max: 240 },
} as const;

// Blank -> null; a number in range (rounded to `decimals` places) -> that number; anything
// else -> "invalid". Decimal fields also accept a comma ("12,5"); whole-number fields don't,
// so "1,000" is rejected instead of being quietly read as 1.
function readGoal(
  raw: FormDataEntryValue | null,
  min: number,
  max: number,
  decimals = 0,
): number | null | "invalid" {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text === "") return null;
  const n = Number(decimals > 0 ? text.replace(",", ".") : text);
  if (!Number.isFinite(n)) return "invalid";
  const factor = 10 ** decimals;
  const rounded = Math.round(n * factor) / factor;
  return rounded < min || rounded > max ? "invalid" : rounded;
}

// Never trust the browser: this runs on the server before anything is saved.
export function parseGoalsForm(formData: FormData): GoalsResult {
  const { calorie_goal: cal } = GOAL_LIMITS;
  const calories = readGoal(formData.get("calorie_goal"), cal.min, cal.max);
  if (calories === null || calories === "invalid") {
    return {
      ok: false,
      message: `Enter a daily calorie goal between ${cal.min.toLocaleString("en-US")} and ${cal.max.toLocaleString("en-US")}.`,
    };
  }

  const macros = { protein_goal_g: null, carb_goal_g: null, fat_goal_g: null } as Omit<
    Goals,
    "calorie_goal"
  >;
  for (const key of ["protein_goal_g", "carb_goal_g", "fat_goal_g"] as const) {
    const { min, max } = GOAL_LIMITS[key];
    const value = readGoal(formData.get(key), min, max);
    if (value === "invalid") {
      return {
        ok: false,
        message: `Macro goals must be whole grams from ${min} to ${max.toLocaleString("en-US")}, or left blank.`,
      };
    }
    macros[key] = value;
  }

  // Weekly cardio distance goals (run and cycle in miles, swim in yards).
  const { weekly_run_miles: runLimits, weekly_cycle_miles: cycleLimits, weekly_swim_yards: swimLimits } = GOAL_LIMITS;
  const run = readGoal(formData.get("weekly_run_miles"), runLimits.min, runLimits.max, 2);
  const cycle = readGoal(formData.get("weekly_cycle_miles"), cycleLimits.min, cycleLimits.max, 2);
  if (run === "invalid" || cycle === "invalid") {
    return { ok: false, message: "Weekly run and cycle goals must be between 0.1 and 500 miles, or left blank." };
  }
  const swim = readGoal(formData.get("weekly_swim_yards"), swimLimits.min, swimLimits.max);
  if (swim === "invalid") {
    return { ok: false, message: "The weekly swim goal must be whole yards from 1 to 100,000, or left blank." };
  }

  const { target_weight_lb: weightLimits } = GOAL_LIMITS;
  const targetWeight = readGoal(formData.get("target_weight_lb"), weightLimits.min, weightLimits.max, 1);
  const startWeight = readGoal(formData.get("start_weight_lb"), weightLimits.min, weightLimits.max, 1);
  if (targetWeight === "invalid" || startWeight === "invalid") {
    return { ok: false, message: "Starting and target weights must be between 70 and 500 lb, or left blank." };
  }

  // The weekly pace is picked from a list; anything else is refused.
  const rawPace = formData.get("weight_pace_lb_week");
  const pace = typeof rawPace === "string" && rawPace !== "" ? Number(rawPace) : null;
  if (pace !== null && !(PACE_CHOICES as readonly number[]).includes(pace)) {
    return { ok: false, message: "Pick a weekly pace from the list." };
  }

  const { daily_sunshine_minutes: sunLimits } = GOAL_LIMITS;
  const sunshine = readGoal(formData.get("daily_sunshine_minutes"), sunLimits.min, sunLimits.max);
  if (sunshine === "invalid") {
    return { ok: false, message: "The daily sunshine target must be whole minutes from 1 to 240, or left blank." };
  }

  return {
    ok: true,
    values: {
      calorie_goal: calories,
      ...macros,
      weekly_run_miles: run,
      weekly_cycle_miles: cycle,
      weekly_swim_yards: swim,
      target_weight_lb: targetWeight,
      start_weight_lb: startWeight,
      weight_pace_lb_week: pace,
      daily_sunshine_minutes: sunshine,
    },
  };
}
