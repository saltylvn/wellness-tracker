import { describe, expect, it } from "vitest";
import { latestSets, type HistoryRow } from "./history";
import {
  defaultRepsFor,
  defaultWeightFor,
  formatSet,
  formatWeight,
  isDumbbell,
  REP_OPTIONS,
  snapWeight,
  summarizeSets,
  validateSetInput,
  WEIGHT_OPTIONS,
} from "./logging";

describe("wheel options", () => {
  it("weights run 0 to 600 in 2.5 lb steps", () => {
    expect(WEIGHT_OPTIONS[0]).toBe(0);
    expect(WEIGHT_OPTIONS[1]).toBe(2.5);
    expect(WEIGHT_OPTIONS.at(-1)).toBe(600);
    expect(WEIGHT_OPTIONS).toContain(100);
    expect(WEIGHT_OPTIONS).toContain(102.5);
    expect(WEIGHT_OPTIONS).toHaveLength(241);
  });

  it("reps run 1 to 50", () => {
    expect(REP_OPTIONS[0]).toBe(1);
    expect(REP_OPTIONS.at(-1)).toBe(50);
    expect(REP_OPTIONS).toHaveLength(50);
  });
});

describe("isDumbbell", () => {
  it("spots dumbbell exercises", () => {
    expect(isDumbbell("Lateral raises (dumbbell)")).toBe(true);
    expect(isDumbbell("Dumbbell curl")).toBe(true);
    expect(isDumbbell("Hammer curls (dumbell)")).toBe(true); // common typo
  });

  it("doesn't flag other exercises", () => {
    expect(isDumbbell("Incline press")).toBe(false);
    expect(isDumbbell("Curls (barbell)")).toBe(false);
    expect(isDumbbell("Deadlift")).toBe(false);
  });
});

describe("defaultWeightFor", () => {
  it("starts at 100 lb for everything except dumbbell exercises", () => {
    expect(defaultWeightFor("Incline press")).toBe(100);
    expect(defaultWeightFor("Leg press")).toBe(100);
    expect(defaultWeightFor("Dips")).toBe(100);
    expect(defaultWeightFor("Lateral raises (dumbbell)")).toBe(25);
  });

  it("uses the weight from last time when there is one", () => {
    expect(defaultWeightFor("Incline press", 135)).toBe(135);
    expect(defaultWeightFor("Lateral raises (dumbbell)", 30)).toBe(30);
    expect(defaultWeightFor("Incline press", 0)).toBe(0); // zero (bodyweight) is a real answer
  });

  it("snaps odd weights onto the wheel and keeps them in range", () => {
    expect(snapWeight(101)).toBe(100);
    expect(snapWeight(101.3)).toBe(102.5);
    expect(snapWeight(-5)).toBe(0);
    expect(snapWeight(9999)).toBe(600);
    expect(WEIGHT_OPTIONS).toContain(defaultWeightFor("x", 101.3));
  });
});

describe("defaultRepsFor", () => {
  it("prefers last reps, then the top of the rep range, then 10", () => {
    expect(defaultRepsFor(12, 9)).toBe(9);
    expect(defaultRepsFor(12, null)).toBe(12);
    expect(defaultRepsFor(null, null)).toBe(10);
  });

  it("stays on the wheel", () => {
    expect(defaultRepsFor(100, null)).toBe(50);
    expect(defaultRepsFor(null, 0)).toBe(1);
  });
});

describe("formatting", () => {
  it("formats weights and sets", () => {
    expect(formatWeight(100)).toBe("100");
    expect(formatWeight(102.5)).toBe("102.5");
    expect(formatSet(135, 10)).toBe("135 × 10");
    expect(summarizeSets([{ weight: 135, reps: 10 }, { weight: 132.5, reps: 8 }])).toBe(
      "135 × 10 + 132.5 × 8",
    );
    expect(summarizeSets([])).toBe("");
  });
});

describe("validateSetInput", () => {
  it("accepts a normal set", () => {
    expect(validateSetInput(135, 10)).toEqual({ ok: true, weight: 135, reps: 10 });
    expect(validateSetInput(0, 1)).toEqual({ ok: true, weight: 0, reps: 1 }); // bodyweight
    expect(validateSetInput(102.5, 8)).toEqual({ ok: true, weight: 102.5, reps: 8 });
  });

  it("rejects bad weights", () => {
    for (const bad of [-1, 2001, NaN, Infinity, "100", null, undefined]) {
      expect(validateSetInput(bad, 10).ok).toBe(false);
    }
  });

  it("rejects bad reps", () => {
    for (const bad of [0, -3, 1.5, 1001, NaN, "10", null, undefined]) {
      expect(validateSetInput(100, bad).ok).toBe(false);
    }
  });
});

describe("latestSets", () => {
  const rows: HistoryRow[] = [
    { exercise_id: "a", session_date: "2026-10-05", set_number: 1, weight: 100, reps: 10 },
    { exercise_id: "a", session_date: "2026-10-05", set_number: 2, weight: 100, reps: 9 },
    { exercise_id: "a", session_date: "2026-09-28", set_number: 1, weight: 95, reps: 10 },
    { exercise_id: "b", session_date: "2026-10-05", set_number: 1, weight: 50, reps: 12 },
    { exercise_id: null, session_date: "2026-10-05", set_number: 1, weight: 10, reps: 10 },
  ];

  it("returns the most recent day's sets in set order", () => {
    expect(latestSets(rows, "a")).toEqual([
      { weight: 100, reps: 10 },
      { weight: 100, reps: 9 },
    ]);
  });

  it("works when rows arrive out of order", () => {
    expect(latestSets([...rows].reverse(), "a")).toEqual([
      { weight: 100, reps: 10 },
      { weight: 100, reps: 9 },
    ]);
  });

  it("returns nothing for an exercise with no history", () => {
    expect(latestSets(rows, "zzz")).toEqual([]);
    expect(latestSets([], "a")).toEqual([]);
  });

  it("ignores sets with missing weight or reps", () => {
    const partial: HistoryRow[] = [
      { exercise_id: "a", session_date: "2026-10-06", set_number: 1, weight: null, reps: 10 },
      { exercise_id: "a", session_date: "2026-10-05", set_number: 1, weight: 100, reps: 10 },
    ];
    expect(latestSets(partial, "a")).toEqual([{ weight: 100, reps: 10 }]);
  });
});
