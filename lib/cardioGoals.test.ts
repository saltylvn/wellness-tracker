import { describe, expect, it } from "vitest";
import { DEFAULT_WEEKLY_GOALS, goalProgress, weeklyTotals } from "./cardioGoals";

describe("DEFAULT_WEEKLY_GOALS", () => {
  it("starts at 5 miles running, 10 miles cycling, and no swim goal", () => {
    expect(DEFAULT_WEEKLY_GOALS).toEqual({ run: 5, cycle: 10, swim: null, walk: null });
  });
});

describe("weeklyTotals", () => {
  it("adds up distance for each activity", () => {
    const totals = weeklyTotals([
      { kind: "run", distance: 3.1, distance_unit: "mi" },
      { kind: "run", distance: 2, distance_unit: "mi" },
      { kind: "cycle", distance: 12.5, distance_unit: "mi" },
      { kind: "swim", distance: 1500, distance_unit: "yd" },
      { kind: "swim", distance: 500, distance_unit: "yd" },
    ]);
    expect(totals).toEqual({ run: 5.1, cycle: 12.5, swim: 2000, walk: 0 });
  });

  it("ignores logs without a distance (time only)", () => {
    expect(weeklyTotals([{ kind: "run", distance: null, distance_unit: null }])).toEqual({
      run: 0,
      cycle: 0,
      swim: 0,
      walk: 0,
    });
  });

  it("ignores distances in a unit that doesn't match the activity, and unknown activities", () => {
    const totals = weeklyTotals([
      { kind: "run", distance: 5, distance_unit: "km" },
      { kind: "swim", distance: 1, distance_unit: "mi" },
      { kind: "row", distance: 3, distance_unit: "mi" },
    ]);
    expect(totals).toEqual({ run: 0, cycle: 0, swim: 0, walk: 0 });
  });

  it("avoids floating point noise (0.1 + 0.2)", () => {
    const totals = weeklyTotals([
      { kind: "run", distance: 0.1, distance_unit: "mi" },
      { kind: "run", distance: 0.2, distance_unit: "mi" },
    ]);
    expect(totals.run).toBe(0.3);
  });

  it("is all zeros with no logs", () => {
    expect(weeklyTotals([])).toEqual({ run: 0, cycle: 0, swim: 0, walk: 0 });
  });
});

describe("goalProgress", () => {
  it("measures progress toward a goal", () => {
    expect(goalProgress(2.5, 5)).toEqual({ percent: 50, reached: false, remaining: 2.5 });
    expect(goalProgress(0, 10)).toEqual({ percent: 0, reached: false, remaining: 10 });
  });

  it("marks the goal reached at exactly the goal, and caps the bar at 100%", () => {
    expect(goalProgress(5, 5)).toEqual({ percent: 100, reached: true, remaining: 0 });
    expect(goalProgress(8, 5)).toEqual({ percent: 100, reached: true, remaining: 0 });
  });

  it("returns null when there's no goal", () => {
    expect(goalProgress(3, null)).toBeNull();
    expect(goalProgress(3, 0)).toBeNull();
  });
});
