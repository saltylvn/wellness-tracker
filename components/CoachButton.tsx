"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { loadCoach, rateCoachNote } from "@/app/(tabs)/coach-actions";
import { useToday } from "@/components/useToday";
import {
  allowedLink,
  EMPTY_TEXT,
  panelView,
  shouldAutoOpen,
  type CoachFeedback,
  type CoachPanelData,
  type DailyNote,
  type Saved,
  type WeeklyNote,
  type WorkoutsNote,
} from "@/lib/coach";
import { isoWeekday } from "@/lib/dates";

// The coach: a small "Coach" button centered at the top of every tab. Tapping it drops
// the coaching window down from the top of the screen: today's note (on Sunday, the weekly review),
// with 👍/👎 and a Hide button. The note loads only when you open it, so pages don't wait on it.
// Wednesdays and Sundays it also has a Workouts tab (picks from fitness sites, with links), and it opens
// by itself on that tab the first time the app is opened after 5 am, once the picks are in.
// Notes come from the Raspberry Pi coach and are shown as plain text; the only links are workout picks
// on the allowlisted sites (checked in the database and again here).

const SHOWN_KEY = "coach.workoutsShown"; // the date the coach last opened itself
const CHECKED_KEY = "coach.workoutsChecked"; // when we last looked for picks (at most every 20 minutes)

function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStore(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // private mode or storage blocked: the coach just won't remember, which is fine
  }
}
export default function CoachButton() {
  const today = useToday();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<CoachPanelData | null>(null);
  const [demo, setDemo] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [showLastWeek, setShowLastWeek] = useState(false);
  const [tab, setTab] = useState<"note" | "workouts">("note");
  const [loading, startLoading] = useTransition();

  function openCoach() {
    setShowLastWeek(false);
    setTab("note");
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

  // Wednesdays and Sundays after 5 am: open by itself on the Workouts tab, once a day, when the picks are in.
  useEffect(() => {
    if (!today) return;
    const now = new Date();
    if (!shouldAutoOpen(today, now.getHours(), isoWeekday(today), readStore(SHOWN_KEY))) return;
    const checked = Number(readStore(CHECKED_KEY) ?? 0);
    if (Date.now() - checked < 20 * 60 * 1000) return;
    writeStore(CHECKED_KEY, String(Date.now()));
    let cancelled = false;
    void loadCoach(today).then((loaded) => {
      if (cancelled || loaded.demo || !loaded.panel.workouts) return;
      setPanel(loaded.panel);
      setDemo(false);
      setLoadedFor(today);
      setShowLastWeek(false);
      setTab("workouts");
      setOpen(true);
      writeStore(SHOWN_KEY, today);
    });
    return () => {
      cancelled = true;
    };
  }, [today]);

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
  const picks = panel?.workouts && panel.workouts.forDate === today ? panel.workouts : null;
  const showWorkouts = Boolean(picks) && tab === "workouts";

  return (
    <>
      {/* 44px to tap, drawn as the agent icon (a chip) in a small accent-tinted square, the same icon the
          showcase image uses for "The coach agent". */}
      <button
        type="button"
        onClick={openCoach}
        aria-label="Coach"
        aria-expanded={open}
        className="group flex h-11 w-11 items-center justify-center"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-accent group-active:opacity-70">
          <AgentIcon />
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

            {!loading && picks && (
              <div role="tablist" aria-label="Coach" className="grid grid-cols-2 gap-1 rounded-lg bg-card-2 p-1">
                {(["note", "workouts"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={`min-h-9 rounded-md text-sm font-semibold active:opacity-70 ${
                      tab === t ? "bg-background text-foreground" : "text-muted"
                    }`}
                  >
                    {t === "workouts" ? "Workouts" : view?.kind === "weekly" ? "Week" : "Today"}
                  </button>
                ))}
              </div>
            )}

            {(loading || !view) && <p className="text-sm text-muted">Loading…</p>}
            {!loading && showWorkouts && picks && <WorkoutsBody saved={picks} />}
            {!loading && demo && (
              <p className="text-xs text-muted">Sample note: in your own account, a new one arrives each morning.</p>
            )}

            {!loading && !showWorkouts && view?.kind === "weekly" && <WeeklyBody saved={view.review} demo={demo} />}
            {!loading && !showWorkouts && view?.kind === "daily" && !showLastWeek && (
              <DailyBody saved={view.note} demo={demo} />
            )}
            {!loading && !showWorkouts && view?.kind === "empty" && !showLastWeek && (
              <p className="text-sm text-muted">{EMPTY_TEXT}</p>
            )}

            {!loading && !showWorkouts && view && view.kind !== "weekly" && view.lastWeek && (
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

function WorkoutsBody({ saved }: { saved: Saved<WorkoutsNote> }) {
  const n = saved.note;
  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold">{n.headline}</p>
      <p className="text-base">{n.plan_summary}</p>
      <ol className="space-y-3">
        {n.picks.map((p, i) => (
          <li key={i} className="space-y-1 rounded-xl border border-border bg-card p-3">
            {allowedLink(p.url) ? (
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-base font-semibold text-accent underline-offset-2 active:opacity-70"
              >
                {p.title} <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <p className="text-base font-semibold">{p.title}</p>
            )}
            <p className="eyebrow">{p.source}</p>
            <p className="text-sm">{p.summary}</p>
            {p.why && <p className="text-sm text-muted">{p.why}</p>}
          </li>
        ))}
      </ol>
      <Rate kind="workouts" forDate={saved.forDate} current={saved.feedback} />
    </div>
  );
}

function Rate({
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

/** The agent icon: a chip (a square with a core and pins on every side), drawn in the accent color. */
function AgentIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </svg>
  );
}
