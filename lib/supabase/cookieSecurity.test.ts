import { describe, expect, it } from "vitest";
import { secureCookieOptions } from "./cookieSecurity";

describe("secureCookieOptions", () => {
  it("hides login cookies from page scripts and keeps them on https in production", () => {
    expect(secureCookieOptions({ path: "/", maxAge: 100, httpOnly: false, sameSite: "none" }, true)).toEqual({
      path: "/",
      maxAge: 100,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  });

  it("doesn't require https on localhost, and copes with no options", () => {
    expect(secureCookieOptions(undefined, false)).toEqual({ httpOnly: true, secure: false, sameSite: "lax" });
  });
});
