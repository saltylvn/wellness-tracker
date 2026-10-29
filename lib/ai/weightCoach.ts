// What we ask the AI about your weight goal, and how we check what it sends back.
// Your weekly pace is your own choice (Settings; `chosenPace` in lib/weightPlan.ts), and the app
// does the weeks-to-goal math itself. The AI only writes one short line of coaching.

import type { Direction } from "../weightPlan";

export type CoachInput = {
  start: number;
  current: number;
  target: number;
  direction: Exclude<Direction, "done">;
  pace: number; // your chosen lb per week toward the target
  trend: number | null; // your actual recent lb per week (negative = losing), if known
  weeksTracked: number; // weeks since your first weigh-in
};

export const COACH_JSON_SCHEMA = {
  type: "object",
  properties: {
    note: {
      type: "string",
      description: "One short, encouraging sentence (under 140 characters) about the plan",
    },
  },
  required: ["note"],
} as const;

export const COACH_SYSTEM_PROMPT = `You are a supportive fitness coach inside a weight-tracking app.

Given a person's starting, current and target body weight (in pounds), the weekly pace they
have chosen, and their recent trend, write ONE short, warm, specific sentence of coaching.
- Their pace is already decided: do not suggest a different pace or number of pounds per week.
- If their recent trend is behind or ahead of their pace, you may mention it kindly.
- No medical claims, no emojis.`;

export function coachPrompt(input: CoachInput): string {
  const trend =
    input.trend === null
      ? "not enough weigh-ins yet"
      : `${input.trend > 0 ? "+" : ""}${input.trend.toFixed(1)} lb per week over the last 4 weeks`;
  return [
    `Goal: ${input.direction} weight.`,
    `Starting weight: ${input.start.toFixed(1)} lb.`,
    `Current weight: ${input.current.toFixed(1)} lb.`,
    `Target weight: ${input.target.toFixed(1)} lb.`,
    `Chosen pace: ${input.pace.toFixed(1)} lb per week.`,
    `Recent trend: ${trend}.`,
    `Weeks tracked so far: ${input.weeksTracked}.`,
  ].join("\n");
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Checks the AI's reply: the coaching note, tidied and kept short, or null if unusable. */
export function parseCoachNote(raw: unknown): string | null {
  let data: unknown = raw;
  if (typeof raw === "string") {
    const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try {
      data = JSON.parse(text);
    } catch {
      return null;
    }
  }
  if (!isRecord(data) || typeof data.note !== "string") return null;
  const note = data.note.trim().replace(/\s+/g, " ").slice(0, 200);
  return note === "" ? null : note;
}
