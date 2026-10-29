import { describe, expect, it } from "vitest";
import { parseGoalsForm } from "./goals";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseGoalsForm", () => {
  it("accepts all four goals", () => {
    expect(
      parseGoalsForm(
        form({ calorie_goal: "2200", protein_goal_g: "160", carb_goal_g: "220", fat_goal_g: "70" }),
      ),
    ).toEqual({
      ok: true,
      values: {
        calorie_goal: 2200,
        protein_goal_g: 160,
        carb_goal_g: 220,
        fat_goal_g: 70,
        weekly_run_miles: null,
        weekly_cycle_miles: null,
        weekly_swim_yards: null,
        target_weight_lb: null,
        start_weight_lb: null,
        weight_pace_lb_week: null,
        daily_sunshine_minutes: null,
      },
    });
  });

  it("treats blank macro goals as 'no goal' (null)", () => {
    const result = parseGoalsForm(
      form({ calorie_goal: "2000", protein_goal_g: "150", carb_goal_g: "", fat_goal_g: "  " }),
    );
    expect(result).toEqual({
      ok: true,
      values: {
        calorie_goal: 2000,
        protein_goal_g: 150,
        carb_goal_g: null,
        fat_goal_g: null,
        weekly_run_miles: null,
        weekly_cycle_miles: null,
        weekly_swim_yards: null,
        target_weight_lb: null,
        start_weight_lb: null,
        weight_pace_lb_week: null,
        daily_sunshine_minutes: null,
      },
    });
  });

  it("accepts a calorie goal alone", () => {
    const result = parseGoalsForm(form({ calorie_goal: "1800" }));
    expect(result.ok && result.values).toEqual({
      calorie_goal: 1800,
      protein_goal_g: null,
      carb_goal_g: null,
      fat_goal_g: null,
      weekly_run_miles: null,
      weekly_cycle_miles: null,
      weekly_swim_yards: null,
      target_weight_lb: null,
      start_weight_lb: null,
        weight_pace_lb_week: null,
        daily_sunshine_minutes: null,
      });
  });

  it("rounds decimals", () => {
    const result = parseGoalsForm(form({ calorie_goal: "2000.4", protein_goal_g: "149.6" }));
    expect(result.ok && result.values).toMatchObject({ calorie_goal: 2000, protein_goal_g: 150 });
  });

  it("requires a calorie goal in range", () => {
    expect(parseGoalsForm(form({})).ok).toBe(false);
    expect(parseGoalsForm(form({ calorie_goal: "" })).ok).toBe(false);
    expect(parseGoalsForm(form({ calorie_goal: "499" })).ok).toBe(false);
    expect(parseGoalsForm(form({ calorie_goal: "10001" })).ok).toBe(false);
    expect(parseGoalsForm(form({ calorie_goal: "lots" })).ok).toBe(false);
  });

  it("rejects macro goals that are out of range or not numbers", () => {
    const base = { calorie_goal: "2000" };
    expect(parseGoalsForm(form({ ...base, protein_goal_g: "0" })).ok).toBe(false);
    expect(parseGoalsForm(form({ ...base, protein_goal_g: "1001" })).ok).toBe(false);
    expect(parseGoalsForm(form({ ...base, carb_goal_g: "2001" })).ok).toBe(false);
    expect(parseGoalsForm(form({ ...base, carb_goal_g: "2000" })).ok).toBe(true);
    expect(parseGoalsForm(form({ ...base, fat_goal_g: "-5" })).ok).toBe(false);
    expect(parseGoalsForm(form({ ...base, fat_goal_g: "some" })).ok).toBe(false);
  });
});

describe("weekly cardio goals", () => {
  const base = { calorie_goal: "2000" };

  it("accepts run and cycle miles (with decimals) and swim yards", () => {
    const result = parseGoalsForm(
      form({ ...base, weekly_run_miles: "5", weekly_cycle_miles: "12.5", weekly_swim_yards: "2000" }),
    );
    expect(result.ok && result.values).toMatchObject({
      weekly_run_miles: 5,
      weekly_cycle_miles: 12.5,
      weekly_swim_yards: 2000,
    });
  });

  it("treats blank as no goal, so a cleared goal stays cleared", () => {
    const result = parseGoalsForm(
      form({ ...base, weekly_run_miles: "", weekly_cycle_miles: " ", weekly_swim_yards: "" }),
    );
    expect(result.ok && result.values).toMatchObject({
      weekly_run_miles: null,
      weekly_cycle_miles: null,
      weekly_swim_yards: null,
      target_weight_lb: null,
      start_weight_lb: null,
        weight_pace_lb_week: null,
      daily_sunshine_minutes: null,
    });
  });

  it("accepts comma decimals and rounds miles to 2 places", () => {
    const result = parseGoalsForm(form({ ...base, weekly_run_miles: "3,5", weekly_cycle_miles: "9.999" }));
    expect(result.ok && result.values).toMatchObject({ weekly_run_miles: 3.5, weekly_cycle_miles: 10 });
  });

  it("rounds swim yards to whole numbers", () => {
    const result = parseGoalsForm(form({ ...base, weekly_swim_yards: "1500.6" }));
    expect(result.ok && result.values.weekly_swim_yards).toBe(1501);
  });

  it("rejects out-of-range or non-numeric goals", () => {
    for (const bad of ["0", "-3", "501", "far", "0.04"]) {
      expect(parseGoalsForm(form({ ...base, weekly_run_miles: bad })).ok).toBe(false);
      expect(parseGoalsForm(form({ ...base, weekly_cycle_miles: bad })).ok).toBe(false);
    }
    for (const bad of ["0", "-1", "100001", "lots"]) {
      expect(parseGoalsForm(form({ ...base, weekly_swim_yards: bad })).ok).toBe(false);
    }
    expect(parseGoalsForm(form({ ...base, weekly_run_miles: "500" })).ok).toBe(true);
    expect(parseGoalsForm(form({ ...base, weekly_swim_yards: "100000" })).ok).toBe(true);
  });
});

describe("target weight", () => {
  const base = { calorie_goal: "2000" };

  it("accepts a weight with one decimal, including a comma", () => {
    const a = parseGoalsForm(form({ ...base, target_weight_lb: "175.5" }));
    expect(a.ok && a.values.target_weight_lb).toBe(175.5);
    const b = parseGoalsForm(form({ ...base, target_weight_lb: "170,25" }));
    expect(b.ok && b.values.target_weight_lb).toBe(170.3);
  });

  it("treats blank as no target", () => {
    const result = parseGoalsForm(form({ ...base, target_weight_lb: " " }));
    expect(result.ok && result.values.target_weight_lb).toBeNull();
  });

  it("rejects weights outside 70 to 500 lb or non-numbers", () => {
    for (const bad of ["69", "501", "0", "-150", "heavy"]) {
      expect(parseGoalsForm(form({ ...base, target_weight_lb: bad })).ok).toBe(false);
    }
    expect(parseGoalsForm(form({ ...base, target_weight_lb: "70" })).ok).toBe(true);
    expect(parseGoalsForm(form({ ...base, target_weight_lb: "500" })).ok).toBe(true);
  });

  it("reads an optional starting weight the same way", () => {
    const a = parseGoalsForm(form({ ...base, start_weight_lb: "210.4" }));
    expect(a.ok && a.values.start_weight_lb).toBe(210.4);
    const b = parseGoalsForm(form({ ...base, start_weight_lb: "" }));
    expect(b.ok && b.values.start_weight_lb).toBeNull();
    expect(parseGoalsForm(form({ ...base, start_weight_lb: "600" })).ok).toBe(false);
  });

  it("reads the weekly pace from the list, and refuses anything else", () => {
    const a = parseGoalsForm(form({ ...base, weight_pace_lb_week: "1.5" }));
    expect(a.ok && a.values.weight_pace_lb_week).toBe(1.5);
    const b = parseGoalsForm(form({ ...base, weight_pace_lb_week: "" }));
    expect(b.ok && b.values.weight_pace_lb_week).toBeNull();
    for (const bad of ["3", "0", "-1", "fast"]) {
      expect(parseGoalsForm(form({ ...base, weight_pace_lb_week: bad })).ok).toBe(false);
    }
  });

  it("reads an optional daily sunshine target in whole minutes", () => {
    const a = parseGoalsForm(form({ ...base, daily_sunshine_minutes: "20" }));
    expect(a.ok && a.values.daily_sunshine_minutes).toBe(20);
    const b = parseGoalsForm(form({ ...base, daily_sunshine_minutes: "" }));
    expect(b.ok && b.values.daily_sunshine_minutes).toBeNull();
    for (const bad of ["0", "241", "sunny"]) {
      expect(parseGoalsForm(form({ ...base, daily_sunshine_minutes: bad })).ok).toBe(false);
    }
  });
});
