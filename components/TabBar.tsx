"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { loadCoach } from "@/app/(tabs)/coach-actions";
import { PLANS_CHECKED_KEY, PLANS_NEW_KEY, PLANS_SEEN_KEY, readStore, useStored, writeStore } from "@/components/planSeen";
import { useToday } from "@/components/useToday";
import { shouldLookForPlans } from "@/lib/coach";
import { isoWeekday } from "@/lib/dates";

// Three tabs, left to right: Weight, Fitness (lifting and cardio, all on the calendar), and
// Plan (the workout plans your coach finds). Nutrition isn't a tab any more: it opens from a
// link on the Weight tab, so the Weight tab stays lit while you're in it.
const tabs = [
  { href: "/weight", matches: ["/weight", "/food"], label: "Weight", icon: "⚖️" },
  { href: "/workouts", matches: ["/workouts"], label: "Fitness", icon: "🏋️" },
  { href: "/plan", matches: ["/plan"], label: "Plan", icon: "📋" },
];

// True while the app is asking the server about new plans, so quick tab changes don't ask twice.
let lookingForPlans = false;

// "use client" (above) means this runs in the browser, which we need here
// because it checks which page is open (usePathname) to highlight the tab, and
// reads today's date from the phone's clock.
export default function TabBar() {
  const pathname = usePathname();
  // Each tab links straight to today (e.g. /workouts?date=2026-10-09). Without the date, the
  // page has to ask the phone for it and load a second time. (null while drawn on the server.)
  const today = useToday();

  // A small dot on the Plan tab when today's new plans are in and you haven't opened them yet.
  // Both facts are remembered on this phone (see planSeen.ts); the Plan page marks them seen.
  const onPlan = pathname.startsWith("/plan");
  const newPlansFor = useStored(PLANS_NEW_KEY);
  const seenPlansFor = useStored(PLANS_SEEN_KEY);
  const newPlans = today !== null && newPlansFor === today && seenPlansFor !== today && !onPlan;

  // The coach looks for plans on Wednesdays and Sundays, so on those days (after 5 am) ask the
  // server whether today's are in: at most every 20 minutes, and not again once they're found or seen.
  useEffect(() => {
    if (!today || onPlan || lookingForPlans || readStore(PLANS_NEW_KEY) === today) return;
    if (!shouldLookForPlans(today, new Date().getHours(), isoWeekday(today), readStore(PLANS_SEEN_KEY))) return;
    if (Date.now() - Number(readStore(PLANS_CHECKED_KEY) ?? 0) < 20 * 60 * 1000) return;
    lookingForPlans = true;
    loadCoach(today)
      .then((loaded) => {
        writeStore(PLANS_CHECKED_KEY, String(Date.now()));
        // Never for the demo account: its plans are samples.
        if (!loaded.demo && loaded.panel.workouts?.forDate === today) writeStore(PLANS_NEW_KEY, today);
      })
      .catch(() => {
        // Offline, or the login ran out: nothing is remembered, so the next tab change asks again.
      })
      .finally(() => {
        lookingForPlans = false;
      });
    // `pathname` is listed so this runs again each time you change tabs (the tab bar itself stays put).
  }, [today, onPlan, pathname]);

  return (
    <nav
      aria-label="Main"
      // fixed = stays pinned to the bottom of the screen.
      // pb-[env(safe-area-inset-bottom)] = leave room for the iPhone home bar.
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/90 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {tabs.map((tab) => {
          const active = tab.matches.some((path) => pathname.startsWith(path));
          const dot = tab.href === "/plan" && newPlans;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={today ? `${tab.href}?date=${today}` : tab.href}
                aria-current={active ? "page" : undefined}
                // min-h-14 = 56px tall, comfortably above the 44px tap-target minimum
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <span className="relative">
                  <span
                    className={`block text-xl leading-none ${active ? "" : "opacity-50 grayscale"}`}
                    aria-hidden="true"
                  >
                    {tab.icon}
                  </span>
                  {dot && <span aria-hidden="true" className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-accent" />}
                </span>
                <span>
                  {tab.label}
                  {dot && <span className="sr-only"> (new plans)</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
