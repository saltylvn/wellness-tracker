import { describe, expect, it } from "vitest";
import { DATABASE_BEHIND_MESSAGE, isCheckViolation, isMissingSchemaError } from "./dbErrors";

describe("isMissingSchemaError", () => {
  it("recognizes a missing column or table", () => {
    for (const code of ["42703", "42P01", "PGRST204", "PGRST205"]) {
      expect(isMissingSchemaError({ code })).toBe(true);
    }
  });

  it("ignores other errors and empty values", () => {
    expect(isMissingSchemaError({ code: "23505" })).toBe(false); // duplicate value
    expect(isMissingSchemaError({ code: "42501" })).toBe(false); // permission denied
    expect(isMissingSchemaError({ code: null })).toBe(false);
    expect(isMissingSchemaError({})).toBe(false);
    expect(isMissingSchemaError(null)).toBe(false);
    expect(isMissingSchemaError(undefined)).toBe(false);
  });

  it("has a message that says what to do", () => {
    expect(DATABASE_BEHIND_MESSAGE).toMatch(/SQL/);
  });
});

describe("isCheckViolation", () => {
  it("recognizes a value the database's rules don't allow", () => {
    expect(isCheckViolation({ code: "23514" })).toBe(true);
    expect(isCheckViolation({ code: "42703" })).toBe(false);
    expect(isCheckViolation(null)).toBe(false);
  });
});
