import { describe, expect, it } from "vitest";
import { completingLog, formatCardioPlan, parseCardioPlan, planFromRow, planToLog } from "./cardioPlan";

describe("parseCardioPlan", () => {
  it("reads a kind, a unit, and an optional target", () => {
    expect(parseCardioPlan("run", "mi", "3.1")).toEqual({ ok: true, plan: { kind: "run", target: 3.1, unit: "mi" } });
    expect(parseCardioPlan("run", "km", "5")).toEqual({ ok: true, plan: { kind: "run", target: 5, unit: "km" } });
    expect(parseCardioPlan("swim", "m", "800")).toEqual({ ok: true, plan: { kind: "swim", target: 800, unit: "m" } });
    expect(parseCardioPlan("cycle", "min", "45")).toEqual({ ok: true, plan: { kind: "cycle", target: 45, unit: "min" } });
    expect(parseCardioPlan("cycle", "mi", "")).toEqual({ ok: true, plan: { kind: "cycle", target: null, unit: "mi" } });
  });

  it("uses the kind's usual unit when none is given (plans saved before units)", () => {
    expect(parseCardioPlan("run", "", "3")).toEqual({ ok: true, plan: { kind: "run", target: 3, unit: "mi" } });
    expect(parseCardioPlan("swim", null, "1000")).toEqual({ ok: true, plan: { kind: "swim", target: 1000, unit: "yd" } });
  });

  it("treats no kind as no plan", () => {
    expect(parseCardioPlan("", "km", "5")).toEqual({ ok: true, plan: null });
  });

  it("refuses unknown kinds or units, and bad targets", () => {
    expect(parseCardioPlan("row", "mi", "3").ok).toBe(false);
    expect(parseCardioPlan("run", "yd", "3").ok).toBe(false); // yards are for swims
    expect(parseCardioPlan("run", "furlong", "3").ok).toBe(false);
    expect(parseCardioPlan("run", "mi", "far").ok).toBe(false);
    expect(parseCardioPlan("run", "mi", "-2").ok).toBe(false);
    expect(parseCardioPlan("run", "mi", "501").ok).toBe(false);
    expect(parseCardioPlan("run", "min", "1441").ok).toBe(false); // over 24 hours
  });
});

describe("planFromRow", () => {
  it("reads the saved columns, and is null when there's no plan", () => {
    expect(planFromRow({ cardio_plan_kind: "run", cardio_plan_distance: "5.00", cardio_plan_unit: "km" })).toEqual({
      kind: "run",
      target: 5,
      unit: "km",
    });
    expect(planFromRow({ cardio_plan_kind: "run", cardio_plan_distance: "3.00" })).toEqual({ kind: "run", target: 3, unit: "mi" });
    expect(planFromRow({ cardio_plan_kind: null, cardio_plan_distance: null })).toBeNull();
    expect(planFromRow(null)).toBeNull();
  });
});

describe("formatCardioPlan", () => {
  it("shows the icon, kind, and target with its unit", () => {
    expect(formatCardioPlan({ kind: "run", target: 3, unit: "mi" })).toBe("🏃 Run · 3 mi");
    expect(formatCardioPlan({ kind: "run", target: 5, unit: "km" })).toBe("🏃 Run · 5 km");
    expect(formatCardioPlan({ kind: "swim", target: 1000, unit: "yd" })).toBe("🏊 Swim · 1,000 yd");
    expect(formatCardioPlan({ kind: "swim", target: 1500, unit: "m" })).toBe("🏊 Swim · 1,500 m");
    expect(formatCardioPlan({ kind: "cycle", target: 45, unit: "min" })).toBe("🚴 Cycle · 45 min");
    expect(formatCardioPlan({ kind: "cycle", target: null, unit: "mi" })).toBe("🚴 Cycle");
  });
});

describe("planToLog", () => {
  it("converts distances to the unit your weekly goals use", () => {
    expect(planToLog({ kind: "run", target: 3, unit: "mi" })).toEqual({ distance: 3, unit: "mi", minutes: null });
    expect(planToLog({ kind: "run", target: 5, unit: "km" })).toEqual({ distance: 3.11, unit: "mi", minutes: null });
    expect(planToLog({ kind: "cycle", target: 1609.344, unit: "m" })).toEqual({ distance: 1, unit: "mi", minutes: null });
    expect(planToLog({ kind: "swim", target: 1000, unit: "m" })).toEqual({ distance: 1093.61, unit: "yd", minutes: null });
    expect(planToLog({ kind: "swim", target: 1, unit: "mi" })).toEqual({ distance: 1760, unit: "yd", minutes: null });
  });

  it("logs a time target as minutes, and no target as nothing", () => {
    expect(planToLog({ kind: "run", target: 30, unit: "min" })).toEqual({ distance: null, unit: null, minutes: 30 });
    expect(planToLog({ kind: "run", target: null, unit: "mi" })).toEqual({ distance: null, unit: null, minutes: null });
  });
});

describe("completingLog", () => {
  const logs = [
    { id: "a", kind: "swim" as const, distance: 500, unit: "yd", minutes: null },
    { id: "b", kind: "run" as const, distance: 3, unit: "mi", minutes: 28 },
  ];

  it("finds a log of the planned kind", () => {
    expect(completingLog({ kind: "run", target: 3, unit: "mi" }, logs)?.id).toBe("b");
    expect(completingLog({ kind: "cycle", target: 10, unit: "mi" }, logs)).toBeNull();
  });
});
