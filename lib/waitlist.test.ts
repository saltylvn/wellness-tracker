import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone, parseWaitlistForm } from "./waitlist";

describe("normalizePhone", () => {
  it("turns a typed US number into digits with +1", () => {
    expect(normalizePhone("(555) 123-4567")).toBe("+15551234567");
    expect(normalizePhone("555.123.4567")).toBe("+15551234567");
  });

  it("keeps an international number with its +", () => {
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("refuses numbers that are too short, too long or missing", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("1234567890123456")).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});

describe("formatPhone", () => {
  it("shows US numbers the familiar way, others as stored", () => {
    expect(formatPhone("+15551234567")).toBe("(555) 123-4567");
    expect(formatPhone("+442079460958")).toBe("+442079460958");
  });
});

describe("parseWaitlistForm", () => {
  it("accepts a name and a phone number", () => {
    expect(parseWaitlistForm("  Sam ", "555-123-4567")).toEqual({ ok: true, value: { name: "Sam", phone: "+15551234567" } });
  });

  it("asks for a name and a number that can be texted", () => {
    expect(parseWaitlistForm("", "5551234567")).toMatchObject({ ok: false });
    expect(parseWaitlistForm("Sam", "123")).toMatchObject({ ok: false });
  });
});
