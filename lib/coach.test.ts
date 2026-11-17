import { describe, expect, it } from "vitest";
import { allowedLink, EMPTY_PANEL, parseCoachPanel, panelView, shouldAutoOpen } from "./coach";

const DAILY = {
  headline: "🎯 Today: Push day",
  yesterday: "Rest day.",
  week_so_far: "2 of 2 lift days.",
  focuses: ["Hit 160g protein.", "Bench +5 lb."],
};
const WEEKLY = { headline: "📋 Solid week", wins: ["PR"], trends: ["Up"], focuses: ["A", "B"] };

describe("parseCoachPanel", () => {
  it("reads a full panel", () => {
    const p = parseCoachPanel({
      daily: { for_date: "2026-11-16", note: DAILY, feedback: "up" },
      weekly: { for_date: "2026-11-16", note: WEEKLY, feedback: null },
      last_week: null,
    });
    expect(p.daily).toEqual({ forDate: "2026-11-16", feedback: "up", note: { ...DAILY, safety: [] } });
    expect(p.weekly?.note.focuses).toEqual(["A", "B"]);
    expect(p.lastWeek).toBeNull();
  });

  it("leaves out anything malformed instead of breaking the page", () => {
    expect(parseCoachPanel(null)).toEqual(EMPTY_PANEL);
    expect(parseCoachPanel("nope")).toEqual(EMPTY_PANEL);
    expect(parseCoachPanel({ daily: { for_date: "bad", note: DAILY } }).daily).toBeNull();
    expect(parseCoachPanel({ daily: { for_date: "2026-11-16", note: { ...DAILY, headline: 5 } } }).daily).toBeNull();
    expect(parseCoachPanel({ daily: { for_date: "2026-11-16", note: { ...DAILY, focuses: [] } } }).daily).toBeNull();
  });

  it("drops odd items, caps lists and ignores unknown feedback", () => {
    const p = parseCoachPanel({
      daily: {
        for_date: "2026-11-16",
        feedback: "maybe",
        note: { ...DAILY, focuses: ["ok", 7, "", "x".repeat(200), "two", "three"], extra: "<script>" },
      },
    });
    expect(p.daily?.note.focuses).toEqual(["ok", "two"]);
    expect(p.daily?.feedback).toBeNull();
    expect(JSON.stringify(p)).not.toContain("<script>");
  });
});

describe("panelView", () => {
  const panel = parseCoachPanel({
    daily: { for_date: "2026-11-16", note: DAILY },
    weekly: { for_date: "2026-11-16", note: WEEKLY },
    last_week: { for_date: "2026-11-09", note: WEEKLY },
  });

  it("shows the weekly review on Sunday once it's saved", () => {
    expect(panelView("2026-11-22", panel, 7).kind).toBe("weekly");
    expect(panelView("2026-11-22", { ...panel, weekly: null }, 7).kind).toBe("empty");
  });

  it("shows the day's note, and last week's review on Mondays", () => {
    const monday = panelView("2026-11-16", panel, 1);
    expect(monday.kind).toBe("daily");
    expect(monday.kind === "daily" && monday.lastWeek?.forDate).toBe("2026-11-09");
    const tuesday = panelView("2026-11-16", panel, 2);
    expect(tuesday.kind === "daily" && tuesday.lastWeek).toBeNull();
  });

  it("is empty when there's no note for that day", () => {
    expect(panelView("2026-11-17", panel, 2)).toEqual({ kind: "empty", lastWeek: null });
  });
});

describe("workout picks", () => {
  const PICK = { title: "Upper/Lower Split", source: "Men's Health", url: "https://www.menshealth.com/fitness/a1/", summary: "Four days.", why: "Fits you." };
  const note = (picks: unknown[]) => parseCoachPanel({ workouts: { for_date: "2026-11-18", note: { headline: "💪 Picks", plan_summary: "Swap Friday.", picks } } }).workouts;

  it("reads picks with allowlisted links", () => {
    expect(note([PICK])?.note.picks).toEqual([PICK]);
  });

  it("drops any pick whose link isn't on the allowlist", () => {
    const picks = note([PICK, { ...PICK, url: "https://evil.example.com/x" }, { ...PICK, url: "javascript:alert(1)" }, { ...PICK, url: "http://www.menshealth.com/x" }]);
    expect(picks?.note.picks.map((p) => p.url)).toEqual([PICK.url]);
  });

  it("drops the whole note when no pick survives", () => {
    expect(note([{ ...PICK, url: "https://evil.example.com/x" }])).toBeNull();
  });

  it("checks links the same way the database does", () => {
    expect(allowedLink("https://nerdfitness.com/blog/x/")).toBe(true);
    expect(allowedLink("https://www.menshealth.com.evil.io/x")).toBe(false);
    expect(allowedLink('https://www.menshealth.com/x"onclick=y')).toBe(false);
    expect(allowedLink("https://www.menshealth.com/a b")).toBe(false);
  });
});

describe("shouldAutoOpen", () => {
  it("opens on Wednesday and Sunday after 5 am, once a day", () => {
    expect(shouldAutoOpen("2026-11-18", 5, 3, null)).toBe(true);
    expect(shouldAutoOpen("2026-11-22", 9, 7, "2026-11-18")).toBe(true);
    expect(shouldAutoOpen("2026-11-18", 4, 3, null)).toBe(false); // before 5 am
    expect(shouldAutoOpen("2026-11-19", 9, 4, null)).toBe(false); // Thursday
    expect(shouldAutoOpen("2026-11-18", 9, 3, "2026-11-18")).toBe(false); // already shown today
  });
});
