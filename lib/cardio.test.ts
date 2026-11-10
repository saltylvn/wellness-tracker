import { describe, expect, it } from "vitest";
import {
  CARDIO,
  formatDistance,
  formatDuration,
  parseCardioKind,
  readNumberField,
  summarizeCardio,
  validateCardio,
} from "./cardio";

describe("CARDIO", () => {
  it("has run, cycle, swim and walk, with miles for run/cycle/walk and yards for swim", () => {
    expect(Object.keys(CARDIO)).toEqual(["run", "cycle", "swim", "walk"]);
    expect(CARDIO.run.unit).toBe("mi");
    expect(CARDIO.cycle.unit).toBe("mi");
    expect(CARDIO.swim.unit).toBe("yd");
    expect(CARDIO.walk.unit).toBe("mi");
  });

  it("parseCardioKind accepts only the four kinds", () => {
    expect(parseCardioKind("run")).toBe("run");
    expect(parseCardioKind("swim")).toBe("swim");
    expect(parseCardioKind("walk")).toBe("walk");
    for (const bad of ["Run", "yoga", "", null, undefined, 3, {}]) {
      expect(parseCardioKind(bad)).toBeNull();
    }
  });
});

describe("validateCardio", () => {
  it("accepts distance and time", () => {
    expect(validateCardio("run", 3.1, 28)).toEqual({ ok: true, kind: "run", distance: 3.1, unit: "mi", minutes: 28 });
    expect(validateCardio("swim", 1500, 30)).toEqual({ ok: true, kind: "swim", distance: 1500, unit: "yd", minutes: 30 });
  });

  it("makes distance and time both optional", () => {
    expect(validateCardio("cycle", null, 45)).toEqual({ ok: true, kind: "cycle", distance: null, unit: null, minutes: 45 });
    expect(validateCardio("cycle", 12, undefined)).toEqual({ ok: true, kind: "cycle", distance: 12, unit: "mi", minutes: null });
    expect(validateCardio("run", null, null)).toEqual({ ok: true, kind: "run", distance: null, unit: null, minutes: null });
  });

  it("rounds distance to 2 decimals and time to 1", () => {
    const result = validateCardio("run", 3.14159, 27.46);
    expect(result).toMatchObject({ ok: true, distance: 3.14, minutes: 27.5 });
  });

  it("rejects an unknown activity", () => {
    expect(validateCardio("yoga", 1, 10).ok).toBe(false);
    expect(validateCardio(undefined, 1, 10).ok).toBe(false);
  });

  it("rejects bad distances", () => {
    for (const bad of [0, -1, NaN, Infinity, "3", 501]) {
      expect(validateCardio("run", bad, 10).ok).toBe(false);
    }
    expect(validateCardio("swim", 100001, 10).ok).toBe(false);
    expect(validateCardio("swim", 600, 10).ok).toBe(true); // 600 yd is fine, though 600 mi is not
    expect(validateCardio("run", 0.001, 10).ok).toBe(false); // rounds to 0
  });

  it("rejects bad times", () => {
    for (const bad of [0, -5, NaN, Infinity, "30", 1441]) {
      expect(validateCardio("run", 3, bad).ok).toBe(false);
    }
    expect(validateCardio("run", 3, 0.01).ok).toBe(false); // rounds to 0
    expect(validateCardio("run", 3, 1440).ok).toBe(true);
  });
});

describe("readNumberField", () => {
  it("turns text into a number, blank into null, and junk into 'invalid'", () => {
    expect(readNumberField("3.1")).toBe(3.1);
    expect(readNumberField(" 28 ")).toBe(28);
    expect(readNumberField("3,5")).toBe(3.5); // comma keyboards
    expect(readNumberField("")).toBeNull();
    expect(readNumberField("   ")).toBeNull();
    expect(readNumberField("abc")).toBe("invalid");
    expect(readNumberField("3.1.2")).toBe("invalid");
  });
});

describe("formatting", () => {
  it("formats distances", () => {
    expect(formatDistance(3.1, "mi")).toBe("3.1 mi");
    expect(formatDistance(1500, "yd")).toBe("1,500 yd");
    expect(formatDistance(3, "mi")).toBe("3 mi");
  });

  it("formats durations", () => {
    expect(formatDuration(28)).toBe("28 min");
    expect(formatDuration(28.5)).toBe("28.5 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(65)).toBe("1 h 05 min");
    expect(formatDuration(125.5)).toBe("2 h 5.5 min");
  });

  it("summarizes a log, including when nothing was entered", () => {
    expect(summarizeCardio(3.1, "mi", 28)).toBe("3.1 mi · 28 min");
    expect(summarizeCardio(3.1, "mi", null)).toBe("3.1 mi");
    expect(summarizeCardio(null, null, 45)).toBe("45 min");
    expect(summarizeCardio(null, null, null)).toBe("Logged");
  });
});
