"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useToday } from "@/components/useToday";

// Three tabs, left to right: Weight, Fitness (lifting and cardio, all on
// the calendar), and Nutrition.
const tabs = [
  { href: "/weight", matches: ["/weight"], label: "Weight", icon: "⚖️" },
  { href: "/workouts", matches: ["/workouts"], label: "Fitness", icon: "🏋️" },
  { href: "/food", matches: ["/food"], label: "Nutrition", icon: "🍎" },
];

// "use client" (above) means this runs in the browser, which we need here
// because it checks which page is open (usePathname) to highlight the tab, and
// reads today's date from the phone's clock.
export default function TabBar() {
  const pathname = usePathname();
  // Each tab links straight to today (e.g. /workouts?date=2026-10-09). Without the date, the
  // page has to ask the phone for it and load a second time. (null while drawn on the server.)
  const today = useToday();

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
                <span
                  className={`text-xl leading-none ${active ? "" : "opacity-50 grayscale"}`}
                  aria-hidden="true"
                >
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
