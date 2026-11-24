import { useSyncExternalStore } from "react";

// What this browser remembers about your coach's plans, for the small dot on the Plan tab:
// the day new plans were found, and the date of the newest plans the Plan tab has shown you.
// It lives in localStorage (this phone only); if that's blocked (private mode), there's just no dot.

export const PLANS_NEW_KEY = "coach.plansNew"; // the day the app found new plans waiting
export const PLANS_SEEN_KEY = "coach.plansSeen"; // the date of the newest plans you've seen
export const PLANS_CHECKED_KEY = "coach.plansChecked"; // when the app last looked (at most every 20 minutes)

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStore(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // private mode or storage blocked: nothing is remembered, which is fine
  }
  listeners.forEach((listener) => listener()); // tell the tab bar, so the dot updates at once
}

/** A remembered value that stays up to date on screen (null on the server and when nothing is saved). */
export function useStored(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => readStore(key),
    () => null,
  );
}
