"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "@/components/BottomSheet";
import WheelPicker from "@/components/WheelPicker";
import { deleteSunshine, saveSunshine } from "@/app/(tabs)/workouts/sunshine-actions";
import { reachedSunshineGoal, SUNSHINE_MINUTE_OPTIONS, wheelStart } from "@/lib/sunshine";

// A quiet row every day: "☀️ Sunshine 10 / 20 min" (green once you reach your daily target
// from Settings). Tap it to pick 5 to 60 minutes on a scroll wheel, which starts on what you
// did last time. It's plain text with no card, so it doesn't pull attention from the workout.
export default function SunshineLog({
  date,
  minutes,
  lastMinutes,
  goal,
}: {
  date: string;
  minutes: number | null; // saved for this day, if any
  lastMinutes: number | null; // your most recent earlier day, to remember last time
  goal: number | null; // daily target in minutes (Settings), if set
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(wheelStart(minutes, lastMinutes));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openSheet() {
    setPicked(wheelStart(minutes, lastMinutes));
    setError(null);
    setOpen(true);
  }

  function run(action: () => ReturnType<typeof saveSunshine>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else setError(result.message);
    });
  }

  const reached = reachedSunshineGoal(minutes, goal);

  return (
    <div>
      <button
        type="button"
        onClick={openSheet}
        aria-label={`Sunshine: ${minutes ?? 0}${goal !== null ? ` of ${goal}` : ""} minutes today. Tap to log`}
        className={`flex min-h-11 w-full items-center gap-2 px-1 text-sm active:opacity-70 ${
          reached ? "font-semibold text-accent" : "text-muted"
        }`}
      >
        <span aria-hidden="true">☀️</span>
        <span>Sunshine</span>
        <span className="tabular-nums">
          {goal !== null
            ? `${minutes ?? 0} / ${goal} min${reached ? " ✓" : ""}`
            : minutes !== null
              ? `${minutes} min`
              : lastMinutes !== null
                ? `Last time: ${lastMinutes} min`
                : ""}
        </span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} label="Sunshine">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold">
            <span aria-hidden="true">☀️</span> Sunshine
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-11 shrink-0 rounded-xl px-3 text-base font-semibold text-accent active:opacity-70"
          >
            Cancel
          </button>
        </div>

        <div className="flex">
          <WheelPicker
            label="Minutes"
            options={SUNSHINE_MINUTE_OPTIONS}
            value={picked}
            onChange={setPicked}
            format={(n) => `${n} min`}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => run(() => saveSunshine({ date, minutes: picked }))}
          disabled={pending}
          className="min-h-14 w-full rounded-xl bg-accent text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {minutes !== null && (
          <button
            type="button"
            onClick={() => run(() => deleteSunshine(date))}
            disabled={pending}
            className="min-h-11 w-full rounded-xl text-base font-medium text-danger active:opacity-70 disabled:opacity-60"
          >
            Remove
          </button>
        )}
      </BottomSheet>
    </div>
  );
}
