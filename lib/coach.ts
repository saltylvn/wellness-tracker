// The coach's pull-up panel on the Fitness tab: notes written by the Raspberry Pi coach
// (supabase/migrations/20261117000000_coach_notes.sql). Everything here is plain text: notes are
// shown as text, never as HTML, so nothing in them can become a link or markup.
import { isValidDateKey } from "./dates";

export type CoachFeedback = "up" | "down";
export type DailyNote = { headline: string; yesterday: string; week_so_far: string; focuses: string[]; safety: string[] };
export type WeeklyNote = { headline: string; wins: string[]; trends: string[]; focuses: string[]; safety: string[] };
export type Saved<T> = { forDate: string; note: T; feedback: CoachFeedback | null };
export type CoachPanelData = {
  daily: Saved<DailyNote> | null;
  weekly: Saved<WeeklyNote> | null; // this week's review (saved on Sunday)
  lastWeek: Saved<WeeklyNote> | null; // last week's, offered on Mondays
};

export const EMPTY_PANEL: CoachPanelData = { daily: null, weekly: null, lastWeek: null };

const text = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null;

const texts = (v: unknown, max: number, maxItems: number): string[] =>
  Array.isArray(v) ? v.map((x) => text(x, max)).filter((x): x is string => x !== null).slice(0, maxItems) : [];

function saved<T>(raw: unknown, build: (note: Record<string, unknown>) => T | null): Saved<T> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isValidDateKey(r.for_date) || !r.note || typeof r.note !== "object") return null;
  const note = build(r.note as Record<string, unknown>);
  if (!note) return null;
  const feedback = r.feedback === "up" || r.feedback === "down" ? r.feedback : null;
  return { forDate: r.for_date as string, note, feedback };
}

function daily(n: Record<string, unknown>): DailyNote | null {
  const headline = text(n.headline, 80);
  const focuses = texts(n.focuses, 160, 2);
  if (!headline || focuses.length === 0) return null;
  return {
    headline,
    yesterday: text(n.yesterday, 300) ?? "",
    week_so_far: text(n.week_so_far, 260) ?? "",
    focuses,
    safety: texts(n.safety, 200, 3),
  };
}

function weekly(n: Record<string, unknown>): WeeklyNote | null {
  const headline = text(n.headline, 80);
  const focuses = texts(n.focuses, 160, 3);
  if (!headline || focuses.length === 0) return null;
  return { headline, wins: texts(n.wins, 160, 3), trends: texts(n.trends, 160, 3), focuses, safety: texts(n.safety, 200, 3) };
}

/** Reads my_coach_panel's JSON defensively: anything malformed is simply left out. */
export function parseCoachPanel(raw: unknown): CoachPanelData {
  if (!raw || typeof raw !== "object") return EMPTY_PANEL;
  const r = raw as Record<string, unknown>;
  return { daily: saved(r.daily, daily), weekly: saved(r.weekly, weekly), lastWeek: saved(r.last_week, weekly) };
}

export type PanelView =
  | { kind: "weekly"; review: Saved<WeeklyNote> }
  | { kind: "daily"; note: Saved<DailyNote>; lastWeek: Saved<WeeklyNote> | null }
  | { kind: "empty"; lastWeek: Saved<WeeklyNote> | null };

/** Sunday shows the week's review once it's saved; other days show that day's note (Mondays can open last week's). */
export function panelView(day: string, panel: CoachPanelData, isoWeekday: number): PanelView {
  if (isoWeekday === 7 && panel.weekly) return { kind: "weekly", review: panel.weekly };
  const lastWeek = isoWeekday === 1 ? panel.lastWeek : null;
  if (panel.daily && panel.daily.forDate === day) return { kind: "daily", note: panel.daily, lastWeek };
  return { kind: "empty", lastWeek };
}

/** What the demo account shows instead of real notes (it never gets any). */
export const DEMO_PANEL: CoachPanelData = {
  daily: {
    forDate: "",
    feedback: null,
    note: {
      headline: "🎯 Today: Push day. Bench: add 5 lb to set 1.",
      yesterday: "Rest day as planned. Water 60 of 60 oz.",
      week_so_far: "2 of 2 lift days done. Run 3 of 5 miles.",
      focuses: ["Bench: add 5 lb to set 1.", "Hit 160g protein."],
      safety: [],
    },
  },
  weekly: null,
  lastWeek: null,
};

export const EMPTY_TEXT = "Your coach's first note arrives tomorrow morning.";
