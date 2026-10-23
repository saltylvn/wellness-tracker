import { ApiError, GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";
import { buildModelChain, classifyGeminiError, isTimeoutError, raceModels } from "./modelChain";
import {
  NUTRITION_JSON_SCHEMA,
  parseAiNutrition,
  SYSTEM_PROMPT,
  type AiEstimate,
} from "./nutrition";
import {
  COACH_JSON_SCHEMA,
  COACH_SYSTEM_PROMPT,
  coachPrompt,
  parseCoachNote,
  type CoachInput,
} from "./weightCoach";

// Time limits. The API route allows 30 seconds in total, so we stop trying models once
// ~24 seconds have passed, and never wait more than 9 seconds on one. A model usually
// answers in 1-1.5 seconds; if it hasn't after 1.5, a backup model starts alongside it.
const TOTAL_BUDGET_MS = 24_000;
const PER_MODEL_TIMEOUT_MS = 9_000;
const HEDGE_AFTER_MS = 1_500;

export type EstimateInput = {
  description?: string;
  image?: { mimeType: string; base64: string };
};

export type EstimateResult =
  | { ok: true; estimate: AiEstimate }
  | {
      ok: false;
      reason: "not_configured" | "rate_limited" | "not_food" | "bad_response" | "failed";
      message: string;
    };

const BUSY: EstimateResult = {
  ok: false,
  reason: "rate_limited",
  message: "The AI is busy right now (free tier). Try again in a minute, or enter it manually.",
};

// This is the ONLY file that talks to Google. To switch AI providers later,
// replace the bodies of these functions and keep the same input and result shapes.
export async function estimateNutrition(input: EstimateInput): Promise<EstimateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      reason: "not_configured",
      message: "AI estimates aren't set up yet. You can enter the food manually.",
    };
  }

  const parts: Part[] = [];
  if (input.image) {
    parts.push({ inlineData: { mimeType: input.image.mimeType, data: input.image.base64 } });
  }
  const description = input.description?.trim();
  parts.push({
    text: description
      ? `Description of the food from the user: ${description}`
      : "Estimate the nutrition for the food or drink in this photo.",
  });

  return runModelChain<EstimateResult>({
    apiKey,
    parts,
    systemInstruction: SYSTEM_PROMPT,
    schema: NUTRITION_JSON_SCHEMA,
    busy: BUSY,
    stopped: {
      ok: false,
      reason: "failed",
      message: "The AI couldn't estimate that. Please try again, or enter it manually.",
    },
    // A real answer (including "that isn't food") is final. An unreadable one
    // means this model had a bad moment, so give the next model a try.
    read: (text) => {
      const parsed = parseAiNutrition(text);
      return parsed.ok || parsed.reason === "not_food" ? { done: parsed } : { retry: parsed };
    },
  });
}

/**
 * Asks the AI for one line of coaching about your weight goal (your pace is your own
 * choice; the AI doesn't change it). Returns null when the AI isn't set up, is busy, or
 * sent something unusable; the Weight tab then just shows no note.
 */
export async function writeWeightCoachNote(input: CoachInput): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return runModelChain<string | null>({
    apiKey,
    parts: [{ text: coachPrompt(input) }],
    systemInstruction: COACH_SYSTEM_PROMPT,
    schema: COACH_JSON_SCHEMA,
    busy: null,
    stopped: null,
    read: (text) => {
      const note = parseCoachNote(text);
      return note ? { done: note } : { retry: null };
    },
  });
}

// Google's free-tier models are sometimes overloaded ("high demand", HTTP 503), slow,
// or retired. So we try a list of free models (see modelChain.ts), starting a backup
// when one is slow, and use the first real answer. You can put your own favorite first
// with GEMINI_MODEL.
function runModelChain<T>(options: {
  apiKey: string;
  parts: Part[];
  systemInstruction: string;
  schema: object;
  busy: T; // the answer when every model was busy or we ran out of time
  stopped: T; // the answer when a problem means no model will work (like a bad key)
  read: (text: string | undefined) => { done: T } | { retry: T }; // check one model's reply
}): Promise<T> {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });

  return raceModels<T>({
    models: buildModelChain(process.env.GEMINI_MODEL),
    fallback: options.busy,
    hedgeAfterMs: HEDGE_AFTER_MS,
    budgetMs: TOTAL_BUDGET_MS,
    attempt: async (model, cancelled) => {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: options.parts }],
          config: {
            systemInstruction: options.systemInstruction,
            responseMimeType: "application/json",
            responseJsonSchema: options.schema,
            temperature: 0.2,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }, // fastest answers
            abortSignal: AbortSignal.any([cancelled, AbortSignal.timeout(PER_MODEL_TIMEOUT_MS)]),
          },
        });
        return options.read(response.text);
      } catch (error) {
        // Cancelled because another model already answered: nothing went wrong.
        if (cancelled.aborted) return { retry: options.busy };

        const status = error instanceof ApiError ? error.status : undefined;
        const message = error instanceof Error ? error.message : "";
        const timedOut = isTimeoutError(error);

        // Log what happened for debugging (never the API key).
        console.error(
          `Gemini request failed on ${model}:`,
          timedOut ? "timed out" : status !== undefined ? `${status} ${message.slice(0, 160)}` : (error as Error)?.name ?? "unknown",
        );

        return classifyGeminiError({ status, message, timedOut }) === "stop"
          ? { stop: options.stopped }
          : { retry: options.busy };
      }
    },
  });
}
