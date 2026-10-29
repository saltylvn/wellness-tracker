import { describe, expect, it } from "vitest";
import {
  clampPace,
  coachKey,
  goalDirection,
  goalNumbers,
  planSummary,
  recentTrend,
  resolveStart,
  WEEKLY_PACE_LB,
  chosenPace,
} from "./weightPlan";

describe("goalDirection", () => {
  it("knows losing, gaining, and already there", () => {
    expect(goalDirection(200, 180)).toBe("lose");
    expect(goalDirection(150, 165)).toBe("gain");
    expect(goalDirection(180, 180)).toBe("done");
    expect(goalDirection(180.04, 180)).toBe("done");
  });
});

describe("paces", () => {
  it("pulls any suggestion into the safe range", () => {
    expect(clampPace(5, "lose")).toBe(2);
    expect(clampPace(0.01, "lose")).toBe(0.25);
    expect(clampPace(3, "gain")).toBe(1);
    expect(clampPace(NaN, "lose")).toBe(0.25);
    expect(clampPace(1.23, "lose")).toBeCloseTo(1.25);
  });

  it("uses your chosen 2 lb a week (gaining is capped at 1 lb a week)", () => {
    expect(WEEKLY_PACE_LB).toBe(2);
    expect(clampPace(WEEKLY_PACE_LB, "lose")).toBe(2);
    expect(clampPace(WEEKLY_PACE_LB, "gain")).toBe(1);
  });
});

describe("resolveStart", () => {
  it("uses Settings first, then the first weigh-in", () => {
    expect(resolveStart(210, { date: "2026-09-01", pounds: 205 })).toBe(210);
    expect(resolveStart(null, { date: "2026-09-01", pounds: 205 })).toBe(205);
    expect(resolveStart(null, null)).toBeNull();
  });
});

describe("recentTrend", () => {
  it("is the best-fit pace per week over the last 4 weeks", () => {
    const logs = [
      { date: "2026-09-01", pounds: 200 },
      { date: "2026-09-08", pounds: 199 },
      { date: "2026-09-15", pounds: 198 },
    ];
    expect(recentTrend(logs)).toBe(-1);
  });

  it("ignores weigh-ins older than the window", () => {
    const logs = [
      { date: "2026-01-01", pounds: 250 }, // long ago: left out
      { date: "2026-09-01", pounds: 200 },
      { date: "2026-09-15", pounds: 201 },
    ];
    expect(recentTrend(logs)).toBe(0.5);
  });

  it("needs two weigh-ins at least a week apart", () => {
    expect(recentTrend([{ date: "2026-09-01", pounds: 200 }])).toBeNull();
    expect(
      recentTrend([
        { date: "2026-09-01", pounds: 200 },
        { date: "2026-09-04", pounds: 199 },
      ]),
    ).toBeNull();
  });
});

describe("planSummary", () => {
  it("works out progress, weeks left and the goal date", () => {
    const plan = planSummary({ start: 200, current: 190, target: 180, pace: 1, today: "2026-10-09" });
    expect(plan).toMatchObject({
      direction: "lose",
      totalLb: 20,
      doneLb: 10,
      remainingLb: 10,
      progress: 0.5,
      pace: 1,
      weeks: 10,
      goalDate: "2026-12-18",
    });
  });

  it("works for gaining too", () => {
    const plan = planSummary({ start: 150, current: 152, target: 160, pace: 0.5, today: "2026-10-09" });
    expect(plan.direction).toBe("gain");
    expect(plan.progress).toBeCloseTo(0.2);
    expect(plan.weeks).toBe(16);
  });

  it("keeps the bar at 0 when you've moved away from the target", () => {
    const plan = planSummary({ start: 200, current: 203, target: 180, pace: 1, today: "2026-10-09" });
    expect(plan.doneLb).toBe(-3);
    expect(plan.progress).toBe(0);
    expect(plan.weeks).toBe(23);
  });

  it("is complete at the target, with no pace needed", () => {
    const plan = planSummary({ start: 200, current: 180, target: 180, pace: 1, today: "2026-10-09" });
    expect(plan).toMatchObject({ direction: "done", progress: 1, weeks: 0, remainingLb: 0 });
  });

  it("has no weeks or date until there's a pace", () => {
    const plan = planSummary({ start: 200, current: 190, target: 180, pace: null, today: "2026-10-09" });
    expect(plan.weeks).toBeNull();
    expect(plan.goalDate).toBeNull();
  });
});

describe("chosenPace", () => {
  it("uses your saved pace, or 2 lb a week if none", () => {
    expect(chosenPace(1)).toBe(1);
    expect(chosenPace(0.5)).toBe(0.5);
    expect(chosenPace(null)).toBe(2);
    expect(chosenPace(undefined)).toBe(2);
    expect(chosenPace(0)).toBe(2);
  });
});

describe("coachKey", () => {
  it("changes when any of the three numbers changes", () => {
    expect(coachKey(200, 190.5, 180)).toBe("200.0|190.5|180.0|2.0");
    expect(coachKey(200, 190.4, 180)).not.toBe(coachKey(200, 190.5, 180));
    expect(coachKey(200, 190.5, 180, 1)).toBe("200.0|190.5|180.0|1.0"); // a new pace asks again
  });
});

describe("goalNumbers", () => {
  const first = { date: "2026-09-01", pounds: 205 };
  const logs = [first, { date: "2026-10-01", pounds: 198 }];

  it("uses the latest weigh-in as current", () => {
    expect(goalNumbers({ logs, first, startSetting: null, targetSetting: 180 })).toEqual({
      start: 205,
      current: 198,
      target: 180,
    });
  });

  it("is null until there's a target and a weigh-in", () => {
    expect(goalNumbers({ logs, first, startSetting: null, targetSetting: null })).toBeNull();
    expect(goalNumbers({ logs: [], first: null, startSetting: 200, targetSetting: 180 })).toBeNull();
  });
});
