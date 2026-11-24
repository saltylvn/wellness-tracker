"use client";

import { useState, useTransition } from "react";
import { rateCoachNote } from "@/app/(tabs)/coach-actions";
import type { CoachFeedback } from "@/lib/coach";

// "Useful? 👍 👎" under one of your coach's notes (in the Coach window) or a set of plans (on the
// Plan tab). The thumb shows as picked straight away and is saved in the background; if the save
// fails it goes back and says why. The database only lets you rate your own notes.
export default function CoachRate({
  kind,
  forDate,
  current,
}: {
  kind: "daily" | "weekly" | "workouts";
  forDate: string;
  current: CoachFeedback | null;
}) {
  const [picked, setPicked] = useState<CoachFeedback | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function rate(feedback: CoachFeedback) {
    setError(null);
    const before = picked;
    setPicked(feedback); // show it right away
    startTransition(async () => {
      const result = await rateCoachNote({ kind, forDate, feedback });
      if (!result.ok) {
        setPicked(before);
        setError(result.message);
      }
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Useful?</span>
        {(["up", "down"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => rate(f)}
            disabled={pending}
            aria-pressed={picked === f}
            aria-label={f === "up" ? "Useful" : "Not useful"}
            className={`min-h-11 min-w-11 rounded-xl border text-lg active:opacity-70 disabled:opacity-60 ${
              picked === f ? "border-accent bg-accent/10" : "border-border"
            }`}
          >
            {f === "up" ? "👍" : "👎"}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
