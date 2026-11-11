import { describe, expect, it } from "vitest";
import {
  inviteSmsHref,
  inviteStatus,
  isFairCodeByte,
  lastLoginLabel,
  makeInviteCode,
  normalizeInviteCode,
  parsePassword,
  parseUsername,
  usernameFromEmail,
  usernameToEmail,
  USERNAME_EMAIL_DOMAIN,
} from "./accounts";

describe("parseUsername", () => {
  it("lowercases and trims, and drops a leading @", () => {
    expect(parseUsername("  TylerPClark ")).toEqual({ ok: true, value: "tylerpclark" });
    expect(parseUsername("@sam_r.2")).toEqual({ ok: true, value: "sam_r.2" });
  });

  it("refuses empty, too short, too long, and odd characters", () => {
    expect(parseUsername("").ok).toBe(false);
    expect(parseUsername(null).ok).toBe(false);
    expect(parseUsername("ab").ok).toBe(false);
    expect(parseUsername("a".repeat(21)).ok).toBe(false);
    expect(parseUsername("tyler clark").ok).toBe(false);
    expect(parseUsername("tyler@x").ok).toBe(false);
    expect(parseUsername(".tyler").ok).toBe(false);
    expect(parseUsername("ty..ler").ok).toBe(false);
  });
});

describe("parsePassword", () => {
  it("needs 8 to 72 characters", () => {
    expect(parsePassword("1234567").ok).toBe(false);
    expect(parsePassword("12345678")).toEqual({ ok: true, value: "12345678" });
    expect(parsePassword("x".repeat(73)).ok).toBe(false);
    expect(parsePassword(undefined).ok).toBe(false);
  });
});

describe("username addresses", () => {
  it("round-trips a username", () => {
    const email = usernameToEmail("tylerpclark");
    expect(email).toBe(`tylerpclark@${USERNAME_EMAIL_DOMAIN}`);
    expect(usernameFromEmail(email)).toBe("tylerpclark");
    expect(usernameFromEmail(email.toUpperCase())).toBe("tylerpclark");
  });

  it("gives null for real emails", () => {
    expect(usernameFromEmail("someone@gmail.com")).toBeNull();
    expect(usernameFromEmail(`@${USERNAME_EMAIL_DOMAIN}`)).toBeNull();
    expect(usernameFromEmail(undefined)).toBeNull();
  });
});

describe("invite codes", () => {
  it("makes 8-character codes that read back as valid", () => {
    const code = makeInviteCode(new Uint8Array([0, 1, 2, 3, 30, 31, 100, 247]));
    expect(code).toHaveLength(8);
    expect(normalizeInviteCode(code)).toBe(code);
  });

  it("rejects bytes that would make some characters likelier", () => {
    expect(isFairCodeByte(247)).toBe(true);
    expect(isFairCodeByte(248)).toBe(false);
  });

  it("accepts a typed code with spaces, dashes or small letters", () => {
    expect(normalizeInviteCode("abcd-efgh")).toBe("ABCDEFGH");
    expect(normalizeInviteCode(" ab cd ef gh ")).toBe("ABCDEFGH");
  });

  it("refuses codes of the wrong length or with confusable characters", () => {
    expect(normalizeInviteCode("ABC")).toBeNull();
    expect(normalizeInviteCode("ABCDEFG0")).toBeNull(); // zero isn't used
    expect(normalizeInviteCode(42)).toBeNull();
  });

  it("writes a text message with the sign-up link", () => {
    const href = inviteSmsHref("https://example.app/", "ABCDEFGH");
    expect(href.startsWith("sms:&body=")).toBe(true);
    const body = decodeURIComponent(href.slice("sms:&body=".length));
    expect(body).toContain("https://example.app/login?invite=ABCDEFGH");
    expect(body).toContain("invite code ABCDEFGH");
  });

  it("can address the text to someone from the wait-list", () => {
    expect(inviteSmsHref("https://example.app", "ABCDEFGH", "+15551234567").startsWith("sms:+15551234567&body=")).toBe(true);
  });

  it("tells used, waiting and expired invites apart", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    const base = { code: "ABCDEFGH", used_at: null, used_username: null };
    expect(inviteStatus({ ...base, created_at: "2026-11-19T12:00:00Z" }, now)).toEqual({ kind: "waiting" });
    expect(inviteStatus({ ...base, created_at: "2026-11-01T12:00:00Z" }, now)).toEqual({ kind: "expired" });
    expect(
      inviteStatus({ ...base, created_at: "2026-11-01T12:00:00Z", used_at: "2026-11-02T00:00:00Z", used_username: "sam" }, now),
    ).toEqual({ kind: "used", by: "sam" });
  });
});

describe("lastLoginLabel", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  it("reads like a phone would say it", () => {
    expect(lastLoginLabel(null, now)).toBe("Never");
    expect(lastLoginLabel("2026-11-10T11:59:40Z", now)).toBe("Just now");
    expect(lastLoginLabel("2026-11-10T11:55:00Z", now)).toBe("5 min ago");
    expect(lastLoginLabel("2026-11-10T09:00:00Z", now)).toBe("3 hr ago");
    expect(lastLoginLabel("2026-11-09T10:00:00Z", now)).toBe("Yesterday");
    expect(lastLoginLabel("2026-11-06T12:00:00Z", now)).toBe("4 days ago");
    expect(lastLoginLabel("2026-11-02T12:00:00Z", now)).toBe("Nov 2");
    expect(lastLoginLabel("2025-12-25T12:00:00Z", now)).toBe("Dec 25, 2025");
  });
});
