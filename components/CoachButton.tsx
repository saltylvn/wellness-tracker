"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { loadCoach, rateCoachNote } from "@/app/(tabs)/coach-actions";
import { useToday } from "@/components/useToday";
import {
  EMPTY_TEXT,
  panelView,
  type CoachFeedback,
  type CoachPanelData,
  type DailyNote,
  type Saved,
  type WeeklyNote,
} from "@/lib/coach";
import { isoWeekday } from "@/lib/dates";

// The coach: a small "Coach" button centered at the top of every tab. Tapping it drops
// the coaching window down from the top of the screen: today's note (on Sunday, the weekly review),
// with 👍/👎 and a Hide button. The note loads only when you open it, so pages don't wait on it.
// Notes come from the Raspberry Pi coach and are shown as plain text only (never HTML).
export default function CoachButton() {
  const today = useToday();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<CoachPanelData | null>(null);
  const [demo, setDemo] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [showLastWeek, setShowLastWeek] = useState(false);
  const [loading, startLoading] = useTransition();

  function openCoach() {
    setShowLastWeek(false);
    setOpen(true);
    if (today && loadedFor !== today) {
      startLoading(async () => {
        const loaded = await loadCoach(today);
        setPanel(loaded.panel);
        setDemo(loaded.demo);
        setLoadedFor(today);
      });
    }
  }

  // Escape hides it; the page behind can't scroll while it's open (like the bottom sheets).
  const closeRef = useRef(() => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const view = panel && today ? panelView(today, panel, isoWeekday(today)) : null;

  return (
    <>
      {/* 44px tall to tap, drawn as a small orange-tinted chip (8px corners, like the app's other buttons). */}
      <button
        type="button"
        onClick={openCoach}
        aria-label="Coach"
        aria-expanded={open}
        className="group flex h-11 items-center justify-center px-1"
      >
        <span className="flex h-8 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 text-sm font-semibold text-accent group-active:opacity-70">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
          Coach
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 flex items-start bg-black/50"
          onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Coach"
            className="mx-auto max-h-[85dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-b-3xl bg-background p-4 pt-[calc(env(safe-area-inset-top)+1rem)]"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Coach</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 shrink-0 rounded-xl px-3 text-base font-semibold text-accent active:opacity-70"
              >
                Hide
              </button>
            </div>

            {(loading || !view) && <p className="text-sm text-muted">Loading…</p>}
            {!loading && demo && (
              <p className="text-xs text-muted">Sample note: in your own account, a new one arrives each morning.</p>
            )}

            {!loading && view?.kind === "weekly" && <WeeklyBody saved={view.review} demo={demo} />}
            {!loading && view?.kind === "daily" && !showLastWeek && <DailyBody saved={view.note} demo={demo} />}
            {!loading && view?.kind === "empty" && !showLastWeek && <p className="text-sm text-muted">{EMPTY_TEXT}</p>}

            {!loading && view && view.kind !== "weekly" && view.lastWeek && (
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
          </div>
        </div>
      )}
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
