import { describe, expect, it } from "vitest";
import { parsePriorityLifts, priorityChoices, priorityNames } from "./priorityLifts";

describe("parsePriorityLifts", () => {
  it("keeps up to two picks, blank meaning none", () => {
    expect(parsePriorityLifts("Squats", " Deadlift ")).toEqual({
      ok: true,
      values: { priority_lift_1: "Squats", priority_lift_2: "Deadlift" },
    });
    expect(parsePriorityLifts("", "")).toEqual({ ok: true, values: { priority_lift_1: null, priority_lift_2: null } });
    expect(parsePriorityLifts(null, undefined)).toEqual({
      ok: true,
      values: { priority_lift_1: null, priority_lift_2: null },
    });
  });

  it("moves a lone second pick into the first slot, and counts the same exercise once", () => {
    expect(parsePriorityLifts("", "Squats")).toEqual({ ok: true, values: { priority_lift_1: "Squats", priority_lift_2: null } });
    expect(parsePriorityLifts("Squats", "squats")).toEqual({
      ok: true,
      values: { priority_lift_1: "Squats", priority_lift_2: null },
    });
  });

  it("refuses names that are too long", () => {
    expect(parsePriorityLifts("x".repeat(81), "").ok).toBe(false);
  });
});

describe("priorityNames", () => {
  it("reads the saved picks from the profile", () => {
    expect(priorityNames({ priority_lift_1: "Squats", priority_lift_2: "Deadlift" })).toEqual(["Squats", "Deadlift"]);
    expect(priorityNames({ priority_lift_1: "Squats", priority_lift_2: null })).toEqual(["Squats"]);
    expect(priorityNames({ calorie_goal: 2000 })).toEqual([]); // columns not added yet
    expect(priorityNames(null)).toEqual([]);
  });
});

describe("priorityChoices", () => {
  it("lists each plan exercise once, A to Z, keeping old picks", () => {
    expect(priorityChoices(["Squats", "bench press", "Squats", "Leg press"], ["Old lift"])).toEqual([
      "bench press",
      "Leg press",
      "Old lift",
      "Squats",
    ]);
    expect(priorityChoices(["Squats", "squats"], [])).toEqual(["Squats"]);
  });
});
