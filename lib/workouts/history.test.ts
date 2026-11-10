import { describe, expect, it } from "vitest";
import { latestSets, type HistoryRow } from "./history";

const row = (r: Partial<HistoryRow>): HistoryRow => ({
  exercise_id: "squat",
  session_date: "2026-11-02",
  set_number: 1,
  weight: 225,
  reps: 5,
  seconds: null,
  ...r,
});

describe("latestSets", () => {
  it("returns the most recent day's sets for that exercise, in set order", () => {
    const rows = [
      row({ session_date: "2026-10-26", set_number: 1, weight: 215 }),
      row({ session_date: "2026-11-02", set_number: 2, weight: 230, reps: 4 }),
      row({ session_date: "2026-11-02", set_number: 1, weight: 225 }),
      row({ exercise_id: "bench", session_date: "2026-11-09", weight: 185 }),
    ];
    expect(latestSets(rows, "squat")).toEqual([
      { weight: 225, reps: 5, seconds: null },
      { weight: 230, reps: 4, seconds: null },
    ]);
  });

  it("keeps timed sets and skips half-filled ones", () => {
    const rows = [
      row({ set_number: 1, weight: null, reps: null, seconds: 90 }),
      row({ set_number: 2, weight: 100, reps: null }),
    ];
    expect(latestSets(rows, "squat")).toEqual([{ weight: null, reps: null, seconds: 90 }]);
  });

  it("is empty when the exercise was never done", () => {
    expect(latestSets([row({})], "deadlift")).toEqual([]);
  });
});
