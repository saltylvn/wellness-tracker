import { describe, expect, it } from "vitest";
import { demoConfigured, demoToday, isDemoEmail } from "./demo";

describe("demoConfigured", () => {
  it("needs both the email and the password", () => {
    expect(demoConfigured({ DEMO_EMAIL: "demo@example.com", DEMO_PASSWORD: "x" })).toBe(true);
    expect(demoConfigured({ DEMO_EMAIL: "demo@example.com" })).toBe(false);
    expect(demoConfigured({ DEMO_PASSWORD: "x" })).toBe(false);
    expect(demoConfigured({ DEMO_EMAIL: "  ", DEMO_PASSWORD: "x" })).toBe(false);
    expect(demoConfigured({})).toBe(false);
  });
});

describe("isDemoEmail", () => {
  it("matches the demo email, ignoring case and spaces", () => {
    expect(isDemoEmail("Demo@Example.com", "demo@example.com")).toBe(true);
    expect(isDemoEmail(" demo@example.com ", "demo@example.com")).toBe(true);
  });
  it("doesn't match anything else", () => {
    expect(isDemoEmail("me@gmail.com", "demo@example.com")).toBe(false);
    expect(isDemoEmail(undefined, "demo@example.com")).toBe(false);
    expect(isDemoEmail("demo@example.com", undefined)).toBe(false);
    expect(isDemoEmail("", "")).toBe(false);
  });
});

describe("demoToday", () => {
  const utc = "2026-10-25";
  it("uses the visitor's date when it's within a day of UTC (any time zone)", () => {
    expect(demoToday("2026-10-25", utc)).toBe("2026-10-25");
    expect(demoToday("2026-10-24", utc)).toBe("2026-10-24"); // evening in the US
    expect(demoToday("2026-10-26", utc)).toBe("2026-10-26"); // morning in Asia
  });
  it("falls back to UTC for anything missing or odd", () => {
    expect(demoToday("2026-10-20", utc)).toBe(utc);
    expect(demoToday("not a date", utc)).toBe(utc);
    expect(demoToday(null, utc)).toBe(utc);
    expect(demoToday(undefined, utc)).toBe(utc);
  });
});
