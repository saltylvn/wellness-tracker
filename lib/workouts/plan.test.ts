import { describe, expect, it } from "vitest";
import { STARTING_PLAN } from "./defaults";
import {
  connectorAfter,
  formatRest,
  formatSetsReps,
  parsePlanJson,
  REST_BETWEEN_EXERCISES,
} from "./plan";

describe("STARTING_PLAN", () => {
  it("is a blank week: all seven days rest, ready for a new user to plan", () => {
    expect(STARTING_PLAN.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const day of STARTING_PLAN) expect(day).toMatchObject({ kind: "rest", title: "Recovery Day" });
  });
});

describe("formatSetsReps", () => {
  it("formats sets and a rep range", () => {
    expect(formatSetsReps(3, 8, 12)).toBe("3 × 8–12");
    expect(formatSetsReps(4, 10, 10)).toBe("4 × 10");
  });

  it("handles partial and empty targets", () => {
    expect(formatSetsReps(3, null, null)).toBe("3 sets");
    expect(formatSetsReps(1, null, null)).toBe("1 set");
    expect(formatSetsReps(null, 8, 12)).toBe("8–12 reps");
    expect(formatSetsReps(null, null, null)).toBe("");
  });
});

const base = { name: "Incline press", sets: "3", repMin: "8", repMax: "12", supersetWithNext: false };

describe("parsePlanJson", () => {
  it("accepts a clean list, as JSON text or an array", () => {
    const list = [{ ...base, id: "abc" }, { ...base, name: "Dips", sets: "", repMin: "", repMax: "" }];
    const expected = {
      ok: true,
      exercises: [
        { id: "abc", name: "Incline press", target_sets: 3, rep_min: 8, rep_max: 12, superset_with_next: false },
        { id: undefined, name: "Dips", target_sets: null, rep_min: null, rep_max: null, superset_with_next: false },
      ],
    };
    expect(parsePlanJson(list)).toEqual(expected);
    expect(parsePlanJson(JSON.stringify(list))).toEqual(expected);
  });

  it("allows an empty list", () => {
    expect(parsePlanJson([])).toEqual({ ok: true, exercises: [] });
  });

  it("treats one filled-in rep end as exactly that many reps", () => {
    const result = parsePlanJson([{ ...base, repMin: "10", repMax: "" }]);
    expect(result.ok && result.exercises[0]).toMatchObject({ rep_min: 10, rep_max: 10 });
    const other = parsePlanJson([{ ...base, repMin: "", repMax: "6" }]);
    expect(other.ok && other.exercises[0]).toMatchObject({ rep_min: 6, rep_max: 6 });
  });

  it("clears the superset flag on the last exercise", () => {
    const result = parsePlanJson([
      { ...base, supersetWithNext: true },
      { ...base, name: "Pull downs", supersetWithNext: true },
    ]);
    expect(result.ok && result.exercises.map((e) => e.superset_with_next)).toEqual([true, false]);
  });

  it("rejects bad names, sets, and reps", () => {
    expect(parsePlanJson([{ ...base, name: "   " }]).ok).toBe(false);
    expect(parsePlanJson([{ ...base, name: "x".repeat(81) }]).ok).toBe(false);
    expect(parsePlanJson([{ ...base, sets: "0" }]).ok).toBe(false);
    expect(parsePlanJson([{ ...base, sets: "21" }]).ok).toBe(false);
    expect(parsePlanJson([{ ...base, sets: "many" }]).ok).toBe(false);
    expect(parsePlanJson([{ ...base, repMin: "0" }]).ok).toBe(false);
    expect(parsePlanJson([{ ...base, repMax: "101" }]).ok).toBe(false);
    expect(parsePlanJson([{ ...base, repMin: "12", repMax: "8" }]).ok).toBe(false);
  });

  it("rejects malformed input and oversized lists", () => {
    expect(parsePlanJson("not json").ok).toBe(false);
    expect(parsePlanJson({ not: "an array" }).ok).toBe(false);
    expect(parsePlanJson(["a string"]).ok).toBe(false);
    expect(parsePlanJson(Array.from({ length: 31 }, () => base)).ok).toBe(false);
    expect(parsePlanJson(Array.from({ length: 30 }, () => base)).ok).toBe(true);
  });
});

describe("rest between exercises", () => {
  it("defaults to 3-5 minutes", () => {
    expect(REST_BETWEEN_EXERCISES).toEqual({ minMinutes: 3, maxMinutes: 5 });
    expect(formatRest()).toBe("Rest 3–5 min");
  });

  it("formats other ranges", () => {
    expect(formatRest({ minMinutes: 2, maxMinutes: 2 })).toBe("Rest 2 min");
    expect(formatRest({ minMinutes: 1, maxMinutes: 3 })).toBe("Rest 1–3 min");
  });

  it("shows a superset marker or a rest reminder between exercises, and nothing after the last", () => {
    const list = [
      { n: "Pec deck", superset_with_next: true },
      { n: "Incline press", superset_with_next: false },
      { n: "Pull downs", superset_with_next: false },
      { n: "Deadlift", superset_with_next: false },
    ];
    const connectors = list.map((e, i) => connectorAfter(e, i === list.length - 1));
    expect(connectors).toEqual(["superset", "rest", "rest", null]);
  });

  it("never shows a rest between two supersetted exercises", () => {
    expect(connectorAfter({ superset_with_next: true }, false)).toBe("superset");
    expect(connectorAfter({ superset_with_next: false }, false)).toBe("rest");
    // a (bad) superset flag on the last exercise still shows nothing
    expect(connectorAfter({ superset_with_next: true }, true)).toBeNull();
  });
});
