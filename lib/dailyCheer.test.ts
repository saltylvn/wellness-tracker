import { describe, expect, it } from "vitest";
import { shouldCheer } from "./dailyCheer";

describe("shouldCheer", () => {
  it("shows the first time ever, and on a new day", () => {
    expect(shouldCheer(null, "2026-11-10")).toBe(true);
    expect(shouldCheer("2026-11-09", "2026-11-10")).toBe(true);
  });

  it("doesn't show again the same day", () => {
    expect(shouldCheer("2026-11-10", "2026-11-10")).toBe(false);
  });
});
