// The coach: notes written by the Raspberry Pi coach (supabase/migrations/20261117000000_coach_notes.sql),
// shown in the Coach window on every tab, and the workout plans it finds, shown on the Plan tab.
// Everything here is plain text: notes are shown as text, never as HTML, so nothing in them can
// become a link or markup (the one exception: a pick's link, checked against a fixed list of sites).
import { addDays, isoWeekday, isValidDateKey } from "./dates";

export type CoachFeedback = "up" | "down";
export type DailyNote = { headline: string; yesterday: string; week_so_far: string; focuses: string[]; safety: string[] };
export type WeeklyNote = { headline: string; wins: string[]; trends: string[]; focuses: string[]; safety: string[] };
export type WorkoutPick = { title: string; source: string; url: string; summary: string; why: string };
export type WorkoutsNote = { headline: string; plan_summary: string; picks: WorkoutPick[] };
export type Saved<T> = { forDate: string; note: T; feedback: CoachFeedback | null };
export type CoachPanelData = {
  daily: Saved<DailyNote> | null;
  weekly: Saved<WeeklyNote> | null; // this week's review (saved on Sunday)
  lastWeek: Saved<WeeklyNote> | null; // last week's, offered on Mondays
  workouts: Saved<WorkoutsNote> | null; // that day's workout picks (Wednesdays and Sundays); shown on the Plan tab
};

export const EMPTY_PANEL: CoachPanelData = { daily: null, weekly: null, lastWeek: null, workouts: null };

// The only sites a workout link may point to: the same list the database enforces
// (coach.allowed_link in 20261118000000_coach_workouts.sql). Anything else is shown as plain text.
const ALLOWED_LINK =
  /^https:\/\/(www\.)?(menshealth\.com|mensjournal\.com|muscleandfitness\.com|boxrox\.com|nerdfitness\.com|strongerbyscience\.com|legionathletics\.com)\/[A-Za-z0-9._~%/?#=&+:,;@!$()*-]*$/;

export function allowedLink(url: unknown): url is string {
  return typeof url === "string" && url.length <= 500 && ALLOWED_LINK.test(url);
}

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

function workouts(n: Record<string, unknown>): WorkoutsNote | null {
  const headline = text(n.headline, 80);
  const plan = text(n.plan_summary, 600);
  if (!headline || !plan || !Array.isArray(n.picks)) return null;
  const picks = n.picks
    .map((p): WorkoutPick | null => {
      if (!p || typeof p !== "object") return null;
      const r = p as Record<string, unknown>;
      const title = text(r.title, 200);
      const source = text(r.source, 60);
      const summary = text(r.summary, 300);
      if (!title || !source || !summary || !allowedLink(r.url)) return null;
      return { title, source, url: r.url, summary, why: text(r.why, 200) ?? "" };
    })
    .filter((p): p is WorkoutPick => p !== null)
    .slice(0, 5);
  return picks.length ? { headline, plan_summary: plan, picks } : null;
}

/** Reads my_coach_panel's JSON defensively: anything malformed is simply left out. */
export function parseCoachPanel(raw: unknown): CoachPanelData {
  if (!raw || typeof raw !== "object") return EMPTY_PANEL;
  const r = raw as Record<string, unknown>;
  return {
    daily: saved(r.daily, daily),
    weekly: saved(r.weekly, weekly),
    lastWeek: saved(r.last_week, weekly),
    workouts: saved(r.workouts, workouts),
  };
}

/** How many sets of picks the Plan tab shows: the latest and the nine before it (about five weeks). */
export const PLAN_LIMIT = 10;

/** Reads my_coach_plans' JSON (your recent picks) as defensively as the panel, newest first. */
export function parseCoachPlans(raw: unknown): Saved<WorkoutsNote>[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => saved(r, workouts))
    .filter((p): p is Saved<WorkoutsNote> => p !== null)
    .sort((a, b) => (a.forDate < b.forDate ? 1 : a.forDate > b.forDate ? -1 : 0))
    .slice(0, PLAN_LIMIT);
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
  workouts: null,
};

export const EMPTY_TEXT = "Your coach's first note arrives tomorrow morning.";

/** The days the coach looks for new plans: Wednesday (3) and Sunday (7). */
const isPickDay = (isoWeekdayNumber: number) => isoWeekdayNumber === 3 || isoWeekdayNumber === 7;

/** Wednesdays and Sundays after 5 am the app looks for that day's new plans, to put a dot on the Plan
 * tab, until you've seen them. `lastSeen` is the date of the newest plans the Plan tab has shown you. */
export function shouldLookForPlans(today: string, hour: number, isoWeekdayNumber: number, lastSeen: string | null): boolean {
  return isPickDay(isoWeekdayNumber) && hour >= 5 && lastSeen !== today;
}

/** The most recent Wednesday or Sunday on or before `day`. */
export function lastPickDay(day: string): string {
  for (let back = 0; back < 7; back++) {
    const candidate = addDays(day, -back);
    if (isPickDay(isoWeekday(candidate))) return candidate;
  }
  return day; // never reached: every week has a Wednesday
}

/** What the demo account's Plan tab shows instead of real picks (it never gets any): two sample
 * sets, dated the last two pick days before `today`. The links are real articles on the allowlist. */
export function demoPlans(today: string): Saved<WorkoutsNote>[] {
  const latest = lastPickDay(today);
  return [
    {
      forDate: latest,
      feedback: null,
      note: {
        headline: "💪 Three splits that fit a 3-day lifting week",
        plan_summary:
          "Your week is three lifting days (Chest & Back, Legs, Delts & Arms) with cardio in between. " +
          "Each of these keeps three lifting days and changes how the muscle groups are shared out.",
        picks: [
          {
            title: "The Best Push Pull Legs Routines for Mass Gains",
            source: "Legion",
            url: "https://legionathletics.com/push-pull-legs/",
            summary: "Splits the week into pushing (chest, shoulders, triceps), pulling (back, biceps) and leg days.",
            why: "Closest to your week now: Monday would become push and Friday pull.",
          },
          {
            title: "The Best Upper Lower Split Workouts for Mass & Strength",
            source: "Legion",
            url: "https://legionathletics.com/upper-lower-split/",
            summary: "Alternates upper-body and lower-body sessions, so each muscle group is trained more than once a week.",
            why: "Adds a second leg day, which would help your squat and deadlift.",
          },
          {
            title: "An Expert Guide to the StrongLifts 5x5 Program",
            source: "Legion",
            url: "https://legionathletics.com/stronglifts-5x5/",
            summary: "Three full-body days a week built on five sets of five, adding a little weight each session.",
            why: "A simple way to keep your priority lifts moving up.",
          },
        ],
      },
    },
    {
      forDate: lastPickDay(addDays(latest, -1)),
      feedback: null,
      note: {
        headline: "🧱 Building your own routine, step by step",
        plan_summary:
          "Two guides on choosing exercises, sets and reps yourself, in case you'd rather adjust your current plan than switch to a new one.",
        picks: [
          {
            title: "How To Build Your Own Workout Routine (Plans & Exercises)",
            source: "Nerd Fitness",
            url: "https://www.nerdfitness.com/blog/how-to-build-your-own-workout-routine/",
            summary: "Nine steps: picking exercises, sets and reps, rest between sets, and how many days a week to train.",
            why: "Useful the next time you edit a lifting day.",
          },
          {
            title: "5 Strength Training Workouts (for Beginners)",
            source: "Nerd Fitness",
            url: "https://www.nerdfitness.com/blog/strength-training-101-where-do-i-start/",
            summary: "Five beginner programs, from a bodyweight circuit to a two-day barbell split.",
            why: "The two-day split is a lighter option for a busy week.",
          },
        ],
      },
    },
  ];
}
