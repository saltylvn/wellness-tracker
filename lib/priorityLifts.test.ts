import { describe, expect, it } from "vitest";
import { parsePriorityLifts, priorityChoices, priorityNames } from "./priorityLifts";

describe("parsePriorityLifts", () => {
  const none = { priority_lift_1: null, priority_lift_2: null, priority_lift_3: null };

  it("trims names and treats blanks as none", () => {
    expect(parsePriorityLifts(["Squats", " Deadlift ", "Bench press"])).toEqual({
      ok: true,
      values: { priority_lift_1: "Squats", priority_lift_2: "Deadlift", priority_lift_3: "Bench press" },
    });
    expect(parsePriorityLifts(["", "", ""])).toEqual({ ok: true, values: none });
    expect(parsePriorityLifts([null, undefined])).toEqual({ ok: true, values: none });
  });

  it("moves picks up to fill gaps, and counts the same exercise once", () => {
    expect(parsePriorityLifts(["", "Squats", ""])).toEqual({ ok: true, values: { ...none, priority_lift_1: "Squats" } });
    expect(parsePriorityLifts(["Squats", "squats", "Deadlift"])).toEqual({
      ok: true,
      values: { priority_lift_1: "Squats", priority_lift_2: "Deadlift", priority_lift_3: null },
    });
  });

  it("keeps at most three, and refuses very long names", () => {
    expect(parsePriorityLifts(["A", "B", "C", "D"])).toMatchObject({ ok: true, values: { priority_lift_3: "C" } });
    expect(parsePriorityLifts(["x".repeat(81)]).ok).toBe(false);
  });
});

describe("priorityNames", () => {
  it("reads the saved picks from the profile, in order", () => {
    expect(priorityNames({ priority_lift_1: "Squats", priority_lift_2: "Deadlift", priority_lift_3: "Bench" })).toEqual([
      "Squats",
      "Deadlift",
      "Bench",
    ]);
    expect(priorityNames({ priority_lift_1: "Squats", priority_lift_2: null })).toEqual(["Squats"]); // before the third column exists
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
