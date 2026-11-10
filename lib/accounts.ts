// Username + password accounts, and the invite codes new people need to make one.
// Pure logic (no database), so it can be tested; the database side is
// supabase/migrations/20261105000000_username_invites.sql.

/**
 * Supabase signs people in with an email and a password, so a username is stored as an
 * address only this app uses: "tylerpclark" becomes "tylerpclark@<this domain>". No email
 * is ever sent to it. (The app's own web address, so it's a real, working domain name.)
 * Don't change this: existing accounts would no longer match their usernames.
 */
export const USERNAME_EMAIL_DOMAIN = "wellness-tracker-virid.vercel.app";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // the most Supabase's password hashing uses

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

/** A username as typed: lowercased, 3-20 letters, numbers, dots or underscores. */
export function parseUsername(raw: unknown): Parsed<string> {
  const name = typeof raw === "string" ? raw.trim().toLowerCase().replace(/^@/, "") : "";
  if (!name) return { ok: false, message: "Enter your username." };
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) {
    return { ok: false, message: `Usernames are ${USERNAME_MIN} to ${USERNAME_MAX} characters.` };
  }
  if (!/^[a-z0-9._]+$/.test(name)) {
    return { ok: false, message: "Use only letters, numbers, dots (.) and underscores (_)." };
  }
  if (name.startsWith(".") || name.endsWith(".") || name.includes("..")) {
    return { ok: false, message: "A username can't start or end with a dot, or have two in a row." };
  }
  return { ok: true, value: name };
}

/** A new password: 8 to 72 characters. */
export function parsePassword(raw: unknown): Parsed<string> {
  const password = typeof raw === "string" ? raw : "";
  if (password.length < PASSWORD_MIN) {
    return { ok: false, message: `Passwords need at least ${PASSWORD_MIN} characters.` };
  }
  if (password.length > PASSWORD_MAX) {
    return { ok: false, message: `Passwords can be at most ${PASSWORD_MAX} characters.` };
  }
  return { ok: true, value: password };
}

/** The sign-in address Supabase stores for a username. */
export function usernameToEmail(username: string): string {
  return `${username}@${USERNAME_EMAIL_DOMAIN}`;
}

/** The username behind a sign-in address, or null for a real email (a Google account). */
export function usernameFromEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const suffix = `@${USERNAME_EMAIL_DOMAIN}`;
  const lower = email.trim().toLowerCase();
  return lower.endsWith(suffix) && lower.length > suffix.length ? lower.slice(0, -suffix.length) : null;
}

// Invite codes: 8 characters from letters and numbers that are hard to mix up
// (no 0/O, 1/I/L). 31^8 is about 850 billion codes, so they can't be guessed.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 8;
export const INVITE_DAYS = 14; // an unused code stops working after this many days

/** A fresh invite code, from random bytes (crypto.getRandomValues on the server). */
export function makeInviteCode(randomBytes: Uint8Array): string {
  if (randomBytes.length < INVITE_CODE_LENGTH) throw new Error("not enough random bytes");
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    // 248 = 31 * 8: the largest multiple of 31 under 256, so every character is equally likely
    // when the caller rejects bytes >= 248 (see randomInviteCode in app/login/actions.ts).
    code += CODE_ALPHABET[randomBytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

/** True for a byte that keeps codes evenly random (see makeInviteCode). */
export function isFairCodeByte(byte: number): boolean {
  return byte < 248;
}

/** An invite code as typed: spaces and dashes dropped, capitals; null if it can't be one. */
export function normalizeInviteCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.replace(/[\s-]/g, "").toUpperCase();
  if (code.length !== INVITE_CODE_LENGTH) return null;
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return null;
  return code;
}

/**
 * The text-message link for an invite: opens Messages with the invite written out, so you
 * only pick who to send it to. (iPhones read "sms:&body=", which Android also accepts.)
 */
export function inviteSmsHref(origin: string, code: string): string {
  const link = `${origin.replace(/\/$/, "")}/login?invite=${code}`;
  const body =
    `You're invited to DEVELOP, my wellness tracker. Tap to make your account: ${link} ` +
    `(invite code ${code}, works once, for ${INVITE_DAYS} days)`;
  return `sms:&body=${encodeURIComponent(body)}`;
}

export type InviteRow = { code: string; created_at: string; used_at: string | null; used_username: string | null };
export type InviteStatus = { kind: "used"; by: string | null } | { kind: "waiting" } | { kind: "expired" };

/** Where an invite stands: used (by whom), still waiting, or expired. */
export function inviteStatus(row: InviteRow, now: Date): InviteStatus {
  if (row.used_at) return { kind: "used", by: row.used_username };
  const ageMs = now.getTime() - new Date(row.created_at).getTime();
  return ageMs > INVITE_DAYS * 24 * 60 * 60 * 1000 ? { kind: "expired" } : { kind: "waiting" };
}
