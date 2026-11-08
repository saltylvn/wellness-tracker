"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import WheelPicker from "@/components/WheelPicker";
import { deleteWeight, saveWeight } from "@/app/(tabs)/weight/actions";
import { formatDayNumber, formatShortMonth } from "@/lib/dates";
import {
  DEFAULT_WEIGHT_LB,
  formatWeightLb,
  joinWeight,
  splitWeight,
  TENTH_OPTIONS,
  WHOLE_POUND_OPTIONS,
} from "@/lib/weight";
import type { WeighIn } from "@/lib/weightPlan";

// Today's weigh-in on the Weight tab: a "Weigh in" button across the top, two compact
// scroll wheels (pounds and tenths) below, and a small status line. Swipe the wheels to your weight, then tap Save. Saving again
// the same day just changes the number.
export default function WeighInCard({
  date,
  latest,
  fallback,
}: {
  date: string;
  latest: WeighIn | null; // your latest weigh-in on or before this date
  fallback: number | null; // where the wheels start before your first weigh-in (your start or target)
}) {
  const router = useRouter();
  const saved = latest?.date === date ? latest.pounds : null; // this day's weigh-in, if any
  const start = splitWeight(latest?.pounds ?? fallback ?? DEFAULT_WEIGHT_LB);
  const [whole, setWhole] = useState(start.whole);
  const [tenth, setTenth] = useState(start.tenth);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const picked = joinWeight(whole, tenth);
  const unchanged = saved !== null && picked === saved;

  function run(action: () => ReturnType<typeof saveWeight>, done: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setMessage({ ok: true, text: done });
        router.refresh();
      } else setMessage({ ok: false, text: result.message });
    });
  }

  return (
    <section aria-label="Weigh-in" className="space-y-2 rounded-2xl bg-card px-4 py-3">
      {/* The button across the top (it names the card, so there's no separate title). */}
      <button
        type="button"
        onClick={() => run(() => saveWeight({ date, weight: picked }), "Saved.")}
        disabled={pending || unchanged}
        className="min-h-11 w-full rounded-full bg-accent text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-50"
      >
        {pending ? "Saving…" : unchanged ? "✓ Weighed in" : "Weigh in"}
      </button>

      {/* Pounds and tenths wheels, 3 rows each. */}
      <div className="flex gap-2">
        <WheelPicker label="Pounds" options={WHOLE_POUND_OPTIONS} value={whole} onChange={setWhole} rows={3} showLabel={false} />
        <WheelPicker
          label="Tenths"
          options={TENTH_OPTIONS}
          value={tenth}
          onChange={setTenth}
          format={(n) => `.${n}`}
          rows={3}
          showLabel={false}
        />
      </div>

      {/* A small status line: today's weigh-in (with Remove), or your last one. */}
      <p className="flex items-center justify-center gap-2 text-xs text-muted">
        <span className="truncate">
          {saved !== null
            ? `Logged: ${formatWeightLb(saved)} lb`
            : latest
              ? `Last: ${formatWeightLb(latest.pounds)} lb on ${formatShortMonth(latest.date)} ${formatDayNumber(latest.date)}`
              : "No weigh-ins yet"}
        </span>
        {saved !== null && (
          <button
            type="button"
            onClick={() => run(() => deleteWeight(date), "Removed.")}
            disabled={pending}
            className="min-h-8 shrink-0 font-medium text-danger active:opacity-70 disabled:opacity-60"
          >
            Remove
          </button>
        )}
      </p>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`text-center text-xs ${message.ok ? "text-accent" : "text-danger"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
