"use client";

import { useEffect, useRef, useState } from "react";
import { getLocalDateKey } from "@/lib/dates";
import { CHEER_MESSAGE, CHEER_STORAGE_KEY, shouldCheer } from "@/lib/dailyCheer";

const HOLD_MS = 1800; // how long the orange page stays before flying into the streak flame
const FLY_MS = 650;

// "Way to get after it!": the first time you open the app each day (by your phone's date),
// the whole screen turns orange with a big 🔥 and the message. After a moment (or a tap)
// it shrinks away into the 🔥 on the streak card (`data-streak-flame`), which gives a
// little bounce as it "lands". On a page without a streak card it shrinks toward the top.
// The day it was last shown is remembered on this phone (localStorage), so switching tabs
// or reopening the app later that day doesn't show it again.
export default function DailyCheer() {
  const [phase, setPhase] = useState<"hidden" | "show" | "fly">("hidden");
  const overlayRef = useRef<HTMLDivElement>(null);
  const flameRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  // First visit of the day? Then show it (under the launch splash, which fades to reveal it).
  useEffect(() => {
    const today = getLocalDateKey();
    let lastShown: string | null;
    try {
      lastShown = localStorage.getItem(CHEER_STORAGE_KEY);
    } catch {
      return; // storage blocked (private browsing): skip it rather than show it every time
    }
    if (!shouldCheer(lastShown, today)) return;

    const splashShowing = !document.documentElement.classList.contains("no-splash");
    const showTimer = setTimeout(() => {
      try {
        localStorage.setItem(CHEER_STORAGE_KEY, today); // saved only once it really shows
      } catch {
        // can't remember it: it may show again later today, which is harmless
      }
      setPhase("show");
    }, 0);
    const flyTimer = setTimeout(() => setPhase("fly"), (splashShowing ? 1450 : 0) + HOLD_MS);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(flyTimer);
    };
  }, []);

  // Shrink into the streak card's flame, then go away.
  useEffect(() => {
    if (phase !== "fly") return;
    const overlay = overlayRef.current;
    const flame = flameRef.current;
    const done = setTimeout(() => setPhase("hidden"), FLY_MS + 50);
    if (!overlay || !flame) return () => clearTimeout(done);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = document.querySelector<HTMLElement>("[data-streak-flame]");
    const targetRect = target?.getBoundingClientRect();
    const tx = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth / 2;
    const ty = targetRect ? targetRect.top + targetRect.height / 2 : 0;

    const timing = { duration: reduceMotion ? 1 : FLY_MS, easing: "cubic-bezier(0.6, 0, 0.3, 1)", fill: "forwards" as const };
    overlay.animate(
      [{ clipPath: `circle(150% at ${tx}px ${ty}px)` }, { clipPath: `circle(0px at ${tx}px ${ty}px)` }],
      timing,
    );
    const flameRect = flame.getBoundingClientRect();
    const dx = tx - (flameRect.left + flameRect.width / 2);
    const dy = ty - (flameRect.top + flameRect.height / 2);
    const scale = targetRect ? targetRect.height / flameRect.height : 0.2;
    flame.animate(
      [{ transform: "translate(0, 0) scale(1)" }, { transform: `translate(${dx}px, ${dy}px) scale(${scale})` }],
      timing,
    );
    textRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { ...timing, duration: reduceMotion ? 1 : 250 });

    // The streak flame "catches" it with a small bounce.
    let bounce: ReturnType<typeof setTimeout> | undefined;
    if (target && !reduceMotion) {
      bounce = setTimeout(() => {
        target.animate([{ transform: "scale(1)" }, { transform: "scale(1.5)" }, { transform: "scale(1)" }], {
          duration: 400,
          easing: "ease-out",
        });
      }, FLY_MS - 80);
    }
    return () => {
      clearTimeout(done);
      if (bounce) clearTimeout(bounce);
    };
  }, [phase]);

  if (phase === "hidden") return null;
  return (
    <div
      ref={overlayRef}
      role="status"
      onClick={() => setPhase("fly")}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-5 bg-accent px-8 text-center text-on-accent"
    >
      {/* The flame is a span (not the text), so it can fly on its own into the streak card. */}
      <span ref={flameRef} aria-hidden="true" className="cheer-flame inline-block text-8xl leading-none">
        🔥
      </span>
      <p ref={textRef} className="cheer-text text-3xl font-extrabold tracking-tight">
        {CHEER_MESSAGE}
      </p>
    </div>
  );
}
