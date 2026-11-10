// "Way to get after it!": a banner that greets you on your first visit of the day.
// Pure logic (tested); the banner itself is components/DailyCheer.tsx.

export const CHEER_MESSAGE = "Way to get after it!";
export const CHEER_STORAGE_KEY = "develop-cheer-day"; // the last day (YYYY-MM-DD) it was shown

/** True when the banner hasn't been shown yet today (on this phone). */
export function shouldCheer(lastShownDay: string | null, today: string): boolean {
  return lastShownDay !== today;
}
