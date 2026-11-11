// The Wait-list: people without an invite leave their name and phone number (after a
// login doesn't let them in), and the admin texts them an invite from Settings.
// Pure logic, tested; the database side is supabase/migrations/20261109000000_waitlist.sql,
// whose request_access() checks the same rules again.

export type WaitlistEntry = { id: string; name: string; phone: string; created_at: string };

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

/**
 * A phone number as typed, as the digits we store: "(555) 123-4567" → "+15551234567".
 * A leading + is kept; a 10-digit number is taken as a US number. Null if it can't be one.
 */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^0-9]/g, "");
  const phone = trimmed.startsWith("+") ? `+${digits}` : digits.length === 10 ? `+1${digits}` : digits;
  return /^\+?[0-9]{10,15}$/.test(phone) ? phone : null;
}

/** "+15551234567" → "(555) 123-4567"; other countries are shown as stored. */
export function formatPhone(phone: string): string {
  const us = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return us ? `(${us[1]}) ${us[2]}-${us[3]}` : phone;
}

/** The name and phone number from the "Join the wait-list" form. */
export function parseWaitlistForm(name: unknown, phone: unknown): Parsed<{ name: string; phone: string }> {
  const n = typeof name === "string" ? name.trim() : "";
  if (n.length < 1 || n.length > 60) return { ok: false, message: "Enter your name (up to 60 characters)." };
  const p = normalizePhone(phone);
  if (!p) return { ok: false, message: "Enter a phone number we can text, like (555) 123-4567." };
  return { ok: true, value: { name: n, phone: p } };
}
