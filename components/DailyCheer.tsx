"use client";

import { useEffect, useState } from "react";
import { getLocalDateKey } from "@/lib/dates";
import { CHEER_MESSAGE, CHEER_STORAGE_KEY, shouldCheer } from "@/lib/dailyCheer";

const SHOW_MS = 3500; // how long the banner stays before sliding away

// "Way to get after it!": slides down from the top of the screen the first time you open
// the app each day (by your phone's date), then slides away after a few seconds; tap it to
// close it sooner. The day it was last shown is remembered on this phone (localStorage), so
// it doesn't come back when you switch tabs or reopen the app later that day.
export default function DailyCheer() {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");

  useEffect(() => {
    const today = getLocalDateKey();
    let lastShown: string | null;
    try {
      lastShown = localStorage.getItem(CHEER_STORAGE_KEY);
    } catch {
      return; // storage blocked (private browsing): skip the banner rather than show it every time
    }
    if (!shouldCheer(lastShown, today)) return;

    // Wait for the launch splash to finish (about a second) when it's showing. The day is
    // saved only when the banner actually appears.
    const delay = document.documentElement.classList.contains("no-splash") ? 300 : 1400;
    const showTimer = setTimeout(() => {
      try {
        localStorage.setItem(CHEER_STORAGE_KEY, today);
      } catch {
        // can't remember it: it may show again later today, which is harmless
      }
      setPhase("in");
    }, delay);
    const hideTimer = setTimeout(() => setPhase("out"), delay + SHOW_MS);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Once it starts sliding away, remove it after the slide (a timer, so it also goes away
  // when the phone is set to reduce motion and there's no slide).
  useEffect(() => {
    if (phase !== "out") return;
    const timer = setTimeout(() => setPhase("hidden"), 320);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "hidden") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <button
        type="button"
        role="status"
        onClick={() => setPhase("out")}
        className={`pointer-events-auto flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-base font-semibold text-on-accent shadow-lg ${
          phase === "in" ? "cheer-in" : "cheer-out"
        }`}
      >
        <span aria-hidden="true">🔥</span>
        {CHEER_MESSAGE}
      </button>
    </div>
  );
}
