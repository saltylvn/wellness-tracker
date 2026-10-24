import { describe, expect, it } from "vitest";
import { classifySignInError } from "./authErrors";

describe("classifySignInError", () => {
  it("treats Supabase's new-account database error as 'full'", () => {
    expect(classifySignInError("Database error saving new user")).toBe("full");
    expect(classifySignInError("database error saving new user")).toBe("full");
  });

  it("treats anything else as a normal sign-in failure", () => {
    expect(classifySignInError("Unable to exchange external code")).toBe("auth");
    expect(classifySignInError("access_denied")).toBe("auth");
    expect(classifySignInError("")).toBe("auth");
    expect(classifySignInError(null)).toBe("auth");
    expect(classifySignInError(undefined)).toBe("auth");
  });
});
