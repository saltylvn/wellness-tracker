import { describe, expect, it } from "vitest";
import { computeWeightStreak } from "./weightStreak";

// 2026-10-26 is a Monday. Weeks: Oct 5, 12, 19, 26.
const TODAY = "2026-10-29"; // Thursday

describe("computeWeightStreak", () => {
  it("counts weeks in a row that each lost at least 1 lb", () => {
    const logs = [
      { date: "2026-10-06", pounds: 200 },
      { date: "2026-10-13", pounds: 199 }, // -1: counts
      { date: "2026-10-20", pounds: 197.5 }, // -1.5: counts
      { date: "2026-10-27", pounds: 196.5 }, // -1: counts
    ];
    expect(computeWeightStreak(logs, TODAY)).toEqual({
      current: 3,
      longest: 3,
      thisWeekCounts: true,
      keepGoingAt: null,
    });
  });

  it("uses each week's last weigh-in", () => {
    const logs = [
      { date: "2026-10-19", pounds: 200 },
      { date: "2026-10-25", pounds: 199 }, // Sunday: last of that week
      { date: "2026-10-26", pounds: 199.5 },
      { date: "2026-10-28", pounds: 197.8 }, // last of this week: -1.2
    ];
    expect(computeWeightStreak(logs, TODAY).current).toBe(1);
  });

  it("keeps last week's streak while this week hasn't counted yet, and says what to weigh in at", () => {
    const logs = [
      { date: "2026-10-13", pounds: 200 },
      { date: "2026-10-20", pounds: 198.4 }, // counts
      { date: "2026-10-27", pounds: 198 }, // only -0.4 so far
    ];
    expect(computeWeightStreak(logs, TODAY)).toEqual({
      current: 1,
      longest: 1,
      thisWeekCounts: false,
      keepGoingAt: 197.4,
    });
  });

  it("a week that lost under 1 lb, or had no weigh-in, ends the streak", () => {
    const lessThanOne = [
      { date: "2026-10-06", pounds: 200 },
      { date: "2026-10-13", pounds: 199 }, // counts
      { date: "2026-10-20", pounds: 198.5 }, // -0.5: breaks
      { date: "2026-10-27", pounds: 197.5 }, // counts
    ];
    expect(computeWeightStreak(lessThanOne, TODAY)).toMatchObject({ current: 1, longest: 1 });

    const gap = [
      { date: "2026-10-06", pounds: 200 },
      { date: "2026-10-13", pounds: 199 }, // counts
      // no weigh-in the week of Oct 19
      { date: "2026-10-27", pounds: 190 }, // nothing last week to compare to
    ];
    expect(computeWeightStreak(gap, TODAY)).toMatchObject({ current: 0, longest: 1, keepGoingAt: null });
  });

  it("is zero with no weigh-ins or just one", () => {
    expect(computeWeightStreak([], TODAY)).toEqual({ current: 0, longest: 0, thisWeekCounts: false, keepGoingAt: null });
    expect(computeWeightStreak([{ date: "2026-10-20", pounds: 200 }], TODAY)).toMatchObject({
      current: 0,
      keepGoingAt: 199,
    });
  });

  it("ignores weigh-ins after today", () => {
    const logs = [
      { date: "2026-10-20", pounds: 200 },
      { date: "2026-11-02", pounds: 150 },
    ];
    expect(computeWeightStreak(logs, TODAY).current).toBe(0);
  });
});
