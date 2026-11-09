import { describe, expect, it } from "vitest";
import { formatRestPlan, parseRestPlan, restPlanDone, restPlanFromRow, restPlanToLog } from "./restPlan";

describe("parseRestPlan", () => {
  it("reads an activity and an optional target", () => {
    expect(parseRestPlan("walk", "2.5")).toEqual({ ok: true, plan: { activity: "walk", target: 2.5 } });
    expect(parseRestPlan("bike", "")).toEqual({ ok: true, plan: { activity: "bike", target: null } });
    expect(parseRestPlan("yoga", "20")).toEqual({ ok: true, plan: { activity: "yoga", target: 20 } });
  });

  it("treats no activity as no plan", () => {
    expect(parseRestPlan("", "3")).toEqual({ ok: true, plan: null });
    expect(parseRestPlan(null, null)).toEqual({ ok: true, plan: null });
  });

  it("refuses unknown activities and bad targets", () => {
    expect(parseRestPlan("run", "3").ok).toBe(false);
    expect(parseRestPlan("walk", "far").ok).toBe(false);
    expect(parseRestPlan("walk", "-1").ok).toBe(false);
    expect(parseRestPlan("walk", "101").ok).toBe(false); // over 100 miles
    expect(parseRestPlan("yoga", "601").ok).toBe(false); // over 600 minutes
  });
});

describe("restPlanFromRow", () => {
  it("reads the saved columns, and is null without them", () => {
    expect(restPlanFromRow({ rest_plan_activity: "walk", rest_plan_target: "2.00" })).toEqual({ activity: "walk", target: 2 });
    expect(restPlanFromRow({ rest_plan_activity: "yoga", rest_plan_target: null })).toEqual({ activity: "yoga", target: null });
    expect(restPlanFromRow({})).toBeNull(); // the SQL step isn't run yet
    expect(restPlanFromRow(null)).toBeNull();
  });
});

describe("formatRestPlan", () => {
  it("shows the icon, name and target", () => {
    expect(formatRestPlan({ activity: "walk", target: 2 })).toBe("🚶 Walk · 2 mi");
    expect(formatRestPlan({ activity: "bike", target: 5.5 })).toBe("🚴 Bike ride · 5.5 mi");
    expect(formatRestPlan({ activity: "yoga", target: 20 })).toBe("🧘 Yoga · 20 min");
    expect(formatRestPlan({ activity: "yoga", target: null })).toBe("🧘 Yoga");
  });
});

describe("restPlanToLog and restPlanDone", () => {
  it("logs a walk or ride in miles (a ride as cycling) and yoga in minutes", () => {
    expect(restPlanToLog({ activity: "walk", target: 2 })).toEqual({ kind: "walk", distance: 2, unit: "mi", minutes: null });
    expect(restPlanToLog({ activity: "bike", target: 5 })).toEqual({ kind: "cycle", distance: 5, unit: "mi", minutes: null });
    expect(restPlanToLog({ activity: "yoga", target: 20 })).toEqual({ kind: "yoga", distance: null, unit: null, minutes: 20 });
    expect(restPlanToLog({ activity: "walk", target: null })).toEqual({ kind: "walk", distance: null, unit: null, minutes: null });
  });

  it("is done when the day has a log of that kind", () => {
    expect(restPlanDone({ activity: "bike", target: null }, [{ kind: "cycle" }])).toBe(true);
    expect(restPlanDone({ activity: "walk", target: null }, [{ kind: "cycle" }])).toBe(false);
  });
});
