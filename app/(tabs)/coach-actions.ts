"use server";

import { currentUserId, INVALID_DATE, SAVE_FAILED, SIGN_IN_AGAIN, type ActionResult } from "@/lib/actionResult";
import { DEMO_PANEL, EMPTY_PANEL, type CoachPanelData } from "@/lib/coach";
import { isValidDateKey } from "@/lib/dates";
import { isDemoEmail } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { loadCoachPanel } from "@/lib/workouts/queries";

// Thumbs up or down on one of your coach's notes. The database only lets you rate your own.
export async function rateCoachNote(input: {
  kind: "daily" | "weekly" | "workouts";
  forDate: string;
  feedback: "up" | "down";
}): Promise<ActionResult> {
  // Never trust the browser: check everything it sent.
  if (input.kind !== "daily" && input.kind !== "weekly" && input.kind !== "workouts") return { ok: false, message: "Unknown note." };
  if (input.feedback !== "up" && input.feedback !== "down") return { ok: false, message: "Pick 👍 or 👎." };
  if (!isValidDateKey(input.forDate)) return INVALID_DATE;

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return SIGN_IN_AGAIN;

  const { data, error } = await supabase.rpc("rate_coach_note", {
    p_kind: input.kind,
    p_for_date: input.forDate,
    p_feedback: input.feedback,
  });
  if (error || data !== true) return SAVE_FAILED;

  return { ok: true };
}

// The coach's notes for a day, loaded when you open the coach (from any tab). The demo account
// never gets real notes, so it gets a fixed sample.
export async function loadCoach(day: string): Promise<{ panel: CoachPanelData; demo: boolean }> {
  if (!isValidDateKey(day)) return { panel: EMPTY_PANEL, demo: false };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return { panel: EMPTY_PANEL, demo: false };
  if (isDemoEmail(claims.claims.email, process.env.DEMO_EMAIL) && DEMO_PANEL.daily) {
    return { panel: { ...DEMO_PANEL, daily: { ...DEMO_PANEL.daily, forDate: day } }, demo: true };
  }
  return { panel: await loadCoachPanel(supabase, day), demo: false };
}
