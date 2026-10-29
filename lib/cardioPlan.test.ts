import { describe, expect, it } from "vitest";
import { completingLog, formatCardioPlan, parseCardioPlan, planFromRow } from "./cardioPlan";

describe("parseCardioPlan", () => {
  it("reads a kind and an optional target distance", () => {
    expect(parseCardioPlan("run", "3.1")).toEqual({ ok: true, plan: { kind: "run", distance: 3.1 } });
    expect(parseCardioPlan("swim", "1000")).toEqual({ ok: true, plan: { kind: "swim", distance: 1000 } });
    expect(parseCardioPlan("cycle", "")).toEqual({ ok: true, plan: { kind: "cycle", distance: null } });
  });

  it("treats no kind as no plan", () => {
    expect(parseCardioPlan("", "5")).toEqual({ ok: true, plan: null });
  });

  it("refuses unknown kinds and bad distances", () => {
    expect(parseCardioPlan("row", "3").ok).toBe(false);
    expect(parseCardioPlan("run", "far").ok).toBe(false);
    expect(parseCardioPlan("run", "-2").ok).toBe(false);
    expect(parseCardioPlan("run", "501").ok).toBe(false); // over 500 mi
  });
});

describe("planFromRow", () => {
  it("reads the saved columns, and is null when there's no plan", () => {
    expect(planFromRow({ cardio_plan_kind: "run", cardio_plan_distance: "3.00" })).toEqual({ kind: "run", distance: 3 });
    expect(planFromRow({ cardio_plan_kind: null, cardio_plan_distance: null })).toBeNull();
    expect(planFromRow(null)).toBeNull();
  });
});

describe("formatCardioPlan", () => {
  it("shows the icon, kind, and target", () => {
    expect(formatCardioPlan({ kind: "run", distance: 3 })).toBe("🏃 Run · 3 mi");
    expect(formatCardioPlan({ kind: "swim", distance: 1000 })).toBe("🏊 Swim · 1,000 yd");
    expect(formatCardioPlan({ kind: "cycle", distance: null })).toBe("🚴 Cycle");
  });
});

describe("completingLog", () => {
  const logs = [
    { id: "a", kind: "swim" as const, distance: 500, unit: "yd", minutes: null },
    { id: "b", kind: "run" as const, distance: 3, unit: "mi", minutes: 28 },
  ];

  it("finds a log of the planned kind", () => {
    expect(completingLog({ kind: "run", distance: 3 }, logs)?.id).toBe("b");
    expect(completingLog({ kind: "cycle", distance: 10 }, logs)).toBeNull();
  });
});
