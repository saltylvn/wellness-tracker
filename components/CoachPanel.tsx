"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "@/components/BottomSheet";
import { rateCoachNote } from "@/app/(tabs)/workouts/coach-actions";
import {
  EMPTY_TEXT,
  type CoachFeedback,
  type DailyNote,
  type PanelView,
  type Saved,
  type WeeklyNote,
} from "@/lib/coach";

// The coach's pull-up panel: a slim bar pinned just above the tab bar on the Fitness tab, with today's
// focus (or "📋 Your weekly review is ready" on Sundays). Tap it to pull up the full note.
// Notes come from the Raspberry Pi coach and are shown as plain text only (never HTML).
export default function CoachPanel({ view, demo }: { view: PanelView; demo: boolean }) {
  const [open, setOpen] = useState(false);
  const [showLastWeek, setShowLastWeek] = useState(false);

  const headline =
    view.kind === "weekly"
      ? "📋 Your weekly review is ready"
      : view.kind === "daily"
        ? view.note.note.headline
        : `🎯 ${EMPTY_TEXT}`;

  return (
    <>
      {/* Room at the bottom of the page so the bar never covers the last row. */}
      <div aria-hidden="true" className="h-12" />
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3.5rem)] z-10 px-4">
        <button
          type="button"
          onClick={() => {
            setShowLastWeek(false);
            setOpen(true);
          }}
          aria-label={`Coach: ${headline}. Tap to open`}
          className="mx-auto flex min-h-11 w-full max-w-md items-center gap-2 rounded-2xl border border-border bg-card/95 px-4 text-left text-sm shadow-sm backdrop-blur active:opacity-80"
        >
          <span className="min-w-0 flex-1 truncate font-medium">{headline}</span>
          <span aria-hidden="true" className="text-muted">
            ⌃
          </span>
        </button>
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} label="Coach">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold">Coach</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-11 shrink-0 rounded-xl px-3 text-base font-semibold text-accent active:opacity-70"
          >
            Done
          </button>
        </div>

        {demo && <p className="text-xs text-muted">Sample note: in your own account, a new one arrives each morning.</p>}

        {view.kind === "weekly" && <WeeklyBody saved={view.review} demo={demo} />}
        {view.kind === "daily" && !showLastWeek && <DailyBody saved={view.note} demo={demo} />}
        {view.kind === "empty" && !showLastWeek && <p className="text-sm text-muted">{EMPTY_TEXT}</p>}

        {view.kind !== "weekly" && view.lastWeek && (
          <>
            {showLastWeek && <WeeklyBody saved={view.lastWeek} demo={demo} />}
            <button
              type="button"
              onClick={() => setShowLastWeek((v) => !v)}
              className="min-h-11 w-full rounded-xl text-sm font-semibold text-accent active:opacity-70"
            >
              {showLastWeek ? "Back to today" : "📋 Last week's review"}
            </button>
          </>
        )}
      </BottomSheet>
    </>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold text-muted">{title}</h3>
      {items.length === 1 ? (
        <p className="text-base">{items[0]}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-base">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Safety({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div role="note" className="space-y-1 rounded-xl border border-border-strong p-3 text-sm">
      {notes.map((n, i) => (
        <p key={i}>⚠️ {n}</p>
      ))}
    </div>
  );
}

function DailyBody({ saved, demo }: { saved: Saved<DailyNote>; demo: boolean }) {
  const n = saved.note;
  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold">{n.headline}</p>
      <Safety notes={n.safety} />
      <Section title="Yesterday" items={n.yesterday ? [n.yesterday] : []} />
      <Section title="This week so far" items={n.week_so_far ? [n.week_so_far] : []} />
      <Section title="Today's focus" items={n.focuses} />
      {!demo && <Rate kind="daily" forDate={saved.forDate} current={saved.feedback} />}
    </div>
  );
}

function WeeklyBody({ saved, demo }: { saved: Saved<WeeklyNote>; demo: boolean }) {
  const n = saved.note;
  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold">{n.headline}</p>
      <Safety notes={n.safety} />
      <Section title="Wins" items={n.wins} />
      <Section title="Trends" items={n.trends} />
      <Section title="Next week's focus" items={n.focuses} />
      {!demo && <Rate kind="weekly" forDate={saved.forDate} current={saved.feedback} />}
    </div>
  );
}

function Rate({ kind, forDate, current }: { kind: "daily" | "weekly"; forDate: string; current: CoachFeedback | null }) {
  const router = useRouter();
  const [picked, setPicked] = useState<CoachFeedback | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function rate(feedback: CoachFeedback) {
    setError(null);
    setPicked(feedback); // show it right away
    startTransition(async () => {
      const result = await rateCoachNote({ kind, forDate, feedback });
      if (result.ok) router.refresh();
      else {
        setPicked(current);
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
