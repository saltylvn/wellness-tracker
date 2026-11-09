"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveWeekKinds } from "@/app/(tabs)/workouts/week-actions";
import type { DayKind } from "@/lib/workouts/defaults";
import { hasCardio, hasLift, PLANNABLE_WEEKDAYS, toggleDay } from "@/lib/workouts/weekSetup";

const LETTERS = ["M", "T", "W", "TH", "F", "SA", "SU"]; // Monday to Sunday
const NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ROWS = [
  { kind: "lift", label: "Lift" },
  { kind: "cardio", label: "Cardio" },
  { kind: "rest", label: "Rest" },
] as const;

const SAVE_DELAY_MS = 600; // wait for a short pause in tapping, then save once

// "Your week" on the Fitness tab: three rows of small day toggles, Lift, Cardio and Rest, each
// on one line, Monday to Sunday. A day turns orange when it's on. Lift and Cardio are separate:
// a day on in both has lifting and cardio. Rest marks a planned rest day (tapping it turns
// Lift and Cardio off); a day with neither Lift nor Cardio shows as Rest too.
// Changes save by themselves a moment after you stop tapping.
export default function WeekSetup({
  days,
  editPlanHref,
}: {
  days: { weekday: number; kind: DayKind }[];
  editPlanHref?: string; // on the Fitness tab: an "Edit plan" link to the whole week's plan
}) {
  const router = useRouter();
  const [kinds, setKinds] = useState<DayKind[]>(() =>
    PLANNABLE_WEEKDAYS.map((weekday) => days.find((d) => d.weekday === weekday)?.kind ?? "rest"),
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const lastSaved = useRef(kinds); // what the server has, to undo a failed save
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function tap(index: number, row: "lift" | "cardio" | "rest") {
    const next = toggleDay(kinds, index, row);
    setKinds(next);
    setError(null);
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const result = await saveWeekKinds(Object.fromEntries(next.map((kind, i) => [PLANNABLE_WEEKDAYS[i], kind])));
      if (result.ok) {
        lastSaved.current = next;
        setStatus("saved");
        router.refresh();
      } else {
        setKinds(lastSaved.current); // put the toggles back the way they're saved
        setError(result.message);
        setStatus("error");
      }
    }, SAVE_DELAY_MS);
  }

  return (
    <section aria-label="Your week" className="space-y-1 rounded-2xl bg-card px-3 py-2">
      {ROWS.map((row) => (
        // One line per row: the label, then the seven days left to right.
        <div key={row.kind} className="flex items-center gap-2">
          <p className="w-12 shrink-0 text-xs font-semibold text-muted">{row.label}</p>
          <div className="grid flex-1 grid-cols-7 gap-1">
            {LETTERS.map((letter, i) => {
              const on =
                row.kind === "lift" ? hasLift(kinds[i]) : row.kind === "cardio" ? hasCardio(kinds[i]) : kinds[i] === "rest";
              return (
                // The button is taller than the small square inside it, so it's still easy to tap.
                <button
                  key={letter}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${NAMES[i]} ${row.kind === "lift" ? "lifting" : row.kind === "cardio" ? "cardio" : "rest day"}`}
                  onClick={() => tap(i, row.kind)}
                  className="flex h-9 items-center justify-center active:opacity-70"
                >
                  <span
                    className={`flex h-7 w-full items-center justify-center rounded-md text-xs font-semibold ${
                      on ? "bg-accent text-on-accent" : "bg-background text-muted"
                    }`}
                  >
                    {letter}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        <p role="status" className={`min-w-0 text-xs ${status === "error" ? "text-danger" : "text-muted"}`}>
          {status === "error" ? error : status === "saving" ? "Saving…" : status === "saved" ? "Saved." : "Tap to plan each day."}
        </p>
        {editPlanHref && (
          // -my-3 keeps the card the same height while giving the link a full 44px tap area.
          <Link
            href={editPlanHref}
            className="-my-3 flex min-h-11 shrink-0 items-center text-sm font-semibold text-accent active:opacity-70"
          >
            Edit plan ›
          </Link>
        )}
      </div>
    </section>
  );
}
