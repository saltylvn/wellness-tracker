// The shared demo account ("Try the demo" on the login page). Its email and password
// live only in server environment variables (DEMO_EMAIL, DEMO_PASSWORD); the database
// side is supabase/migrations/20261025000000_recruiter_demo.sql.
import { addDays, isValidDateKey } from "./dates";

/** True when the demo is set up on this server (both variables present). */
export function demoConfigured(env: Record<string, string | undefined>): boolean {
  return Boolean(env.DEMO_EMAIL?.trim() && env.DEMO_PASSWORD);
}

/** True when this email is the demo account's (case doesn't matter). */
export function isDemoEmail(email: unknown, demoEmail: string | undefined): boolean {
  const demo = demoEmail?.trim().toLowerCase();
  return typeof email === "string" && Boolean(demo) && email.trim().toLowerCase() === demo;
}

/**
 * Which day to build the demo data for: the visitor's own date (sent from their phone
 * or browser), as long as it's within a day of the server's UTC date (every time zone
 * is). Anything missing or odd falls back to the UTC date.
 */
export function demoToday(sent: unknown, utcToday: string): string {
  if (!isValidDateKey(sent)) return utcToday;
  return sent === utcToday || sent === addDays(utcToday, -1) || sent === addDays(utcToday, 1) ? sent : utcToday;
}
