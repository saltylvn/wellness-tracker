import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUNSHINE_MINUTES,
  parseSunshineMinutes,
  reachedSunshineGoal,
  SUNSHINE_MINUTE_OPTIONS,
  wheelStart,
} from "./sunshine";

describe("sunshine minutes", () => {
  it("the wheel runs from 5 to 60 and starts on 10", () => {
    expect(SUNSHINE_MINUTE_OPTIONS[0]).toBe(5);
    expect(SUNSHINE_MINUTE_OPTIONS.at(-1)).toBe(60);
    expect(SUNSHINE_MINUTE_OPTIONS).toHaveLength(56);
    expect(SUNSHINE_MINUTE_OPTIONS).toContain(DEFAULT_SUNSHINE_MINUTES);
  });

  it("accepts whole minutes from 5 to 60", () => {
    expect(parseSunshineMinutes(5)).toBe(5);
    expect(parseSunshineMinutes(60)).toBe(60);
  });

  it("rejects anything else", () => {
    for (const bad of [4, 61, 0, -5, 7.5, NaN, "10", null, undefined]) {
      expect(parseSunshineMinutes(bad)).toBeNull();
    }
  });

  it("starts the wheel on today's, then last time's, minutes", () => {
    expect(wheelStart(20, 12)).toBe(20);
    expect(wheelStart(null, 12)).toBe(12);
    expect(wheelStart(null, null)).toBe(10);
  });
});

describe("reachedSunshineGoal", () => {
  it("is true once the minutes reach the target", () => {
    expect(reachedSunshineGoal(20, 20)).toBe(true);
    expect(reachedSunshineGoal(15, 20)).toBe(false);
    expect(reachedSunshineGoal(null, 20)).toBe(false);
    expect(reachedSunshineGoal(30, null)).toBe(false); // no target set
  });
});
