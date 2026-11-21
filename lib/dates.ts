// Calendar dates are passed around as "date keys": plain "YYYY-MM-DD" strings
// like "2026-10-05". They mean "that day on the wall calendar", with no time
// zone attached, so your daily totals never shift at midnight UTC.

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(key: string): [number, number, number] {
  const match = DATE_KEY.exec(key);
  if (!match) throw new Error(`Invalid date key: ${key}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function toKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** True only for real calendar dates ("2026-02-30" is rejected). Anything that isn't a string is rejected too. */
export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = DATE_KEY.exec(value);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** The date key n days after (or before, if negative) the given one. */
export function addDays(key: string, n: number): string {
  const [y, m, d] = parts(key);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return toKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** 1 = weeks start on Monday. Use 0 for Sunday (US calendar). */
export const WEEK_STARTS_ON = 1;

/** The 7 date keys of the week that contains `key`, in order. */
export function weekDays(key: string, weekStartsOn: number = WEEK_STARTS_ON): string[] {
  const [y, m, d] = parts(key);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const start = addDays(key, -((dayOfWeek - weekStartsOn + 7) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Day of the week for a date key: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(key: string): number {
  const [y, m, d] = parts(key);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return day === 0 ? 7 : day;
}

/** Today's date on THIS device's clock. Only call this in the browser. */
export function getLocalDateKey(now: Date = new Date()): string {
  return toKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

// Formatting always uses UTC so the server and the phone print identical text.
function format(key: string, options: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = parts(key);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    ...options,
    timeZone: "UTC",
  });
}

export const formatWeekday = (key: string) => format(key, { weekday: "long" });
export const formatWeekdayShort = (key: string) => format(key, { weekday: "short" });
export const formatShortMonth = (key: string) => format(key, { month: "short" });
export const formatDayNumber = (key: string) => format(key, { day: "numeric" });
export const formatFullDate = (key: string) =>
  format(key, { month: "short", day: "numeric", year: "numeric" });
/** "Wed, Nov 18": a day's name and date, without the year. */
export const formatShortDate = (key: string) =>
  format(key, { weekday: "short", month: "short", day: "numeric" });

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = parts(from);
  const [y2, m2, d2] = parts(to);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}
