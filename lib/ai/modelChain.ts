// Which Gemini models to try, in order, and what to do when one of them fails.
// All of these are on Google's free tier. Google sometimes overloads a model
// ("high demand", HTTP 503) or retires one, so the app falls back to the next.

// Fastest first: in testing (Oct 2026) these answered in about 1-1.5 seconds, photo or
// text. (gemini-3.8-flash is left out: it was overloaded or timed out on nearly every
// try and doesn't allow minimal thinking. gemini-3.7-flash kept timing out, and
// gemini-2.5-flash is no longer offered to new users.)
export const DEFAULT_MODEL_CHAIN = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-flash-lite-latest",
] as const;

/** Your chosen model (GEMINI_MODEL) goes first, then the defaults, with no repeats. */
export function buildModelChain(
  preferred?: string | null,
  defaults: readonly string[] = DEFAULT_MODEL_CHAIN,
): string[] {
  const chosen = preferred?.trim();
  return [...new Set([...(chosen ? [chosen] : []), ...defaults])];
}

export type ErrorAction = "try-next-model" | "stop";

/**
 * After a failed request: is it worth trying the next model, or will every model
 * fail the same way? Overload, timeouts, and retired models are model-specific.
 * A bad API key or no permission fails everywhere, so stop right away.
 */
export function classifyGeminiError(error: {
  status?: number;
  message?: string;
  timedOut?: boolean;
}): ErrorAction {
  if (error.timedOut) return "try-next-model";

  const { status, message = "" } = error;
  // Google reports an invalid key as HTTP 400 with "API key" in the message.
  if (status === 401 || status === 403 || /api key/i.test(message)) return "stop";

  // 429 busy/quota, 5xx overload or outage, 404 model retired, 400 model-specific problem
  return "try-next-model";
}

/** True for the errors a request abort or timeout produces. */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/** What one model attempt produced: a final answer, a reason to try another model, or a reason to give up. */
export type AttemptOutcome<T> = { done: T } | { retry: T } | { stop: T };

/**
 * Tries the models in order, but doesn't wait on a slow one: if a model hasn't answered
 * after `hedgeAfterMs`, the next one starts alongside it (at most `maxParallel` at once),
 * and the first real answer wins. A model that fails starts the next one right away.
 * When it's decided, every request still running is cancelled through its signal.
 *
 * `fallback` is the answer if no model gives a final one before `budgetMs` runs out.
 */
export function raceModels<T>(options: {
  models: readonly string[];
  attempt: (model: string, signal: AbortSignal) => Promise<AttemptOutcome<T>>;
  fallback: T;
  hedgeAfterMs: number;
  budgetMs: number;
  maxParallel?: number;
}): Promise<T> {
  const { models, attempt, hedgeAfterMs, budgetMs, maxParallel = 2 } = options;

  return new Promise<T>((resolve) => {
    const controllers = new Set<AbortController>(); // requests still running
    let next = 0; // index of the next model to start
    let running = 0;
    let lastResult = options.fallback;
    let finished = false;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (value: T) => {
      if (finished) return;
      finished = true;
      clearTimeout(hedgeTimer);
      clearTimeout(budgetTimer);
      controllers.forEach((controller) => controller.abort()); // cancel the rest
      resolve(value);
    };

    const startNext = () => {
      clearTimeout(hedgeTimer);
      if (finished) return;
      if (next >= models.length) {
        if (running === 0) finish(lastResult); // every model has had its turn
        return;
      }
      if (running >= maxParallel) return;

      const controller = new AbortController();
      controllers.add(controller);
      const model = models[next++];
      running++;
      attempt(model, controller.signal)
        .then((outcome) => {
          controllers.delete(controller);
          if ("done" in outcome) finish(outcome.done);
          else if ("stop" in outcome) finish(outcome.stop);
          else lastResult = outcome.retry;
        })
        .catch(() => {}) // an attempt should report problems as an outcome; ignore anything else
        .finally(() => {
          running--;
          startNext(); // this one is over: give the next model its turn
        });

      // If it's slow, start a backup alongside it.
      hedgeTimer = setTimeout(startNext, hedgeAfterMs);
    };

    const budgetTimer = setTimeout(() => finish(lastResult), budgetMs);
    startNext();
  });
}
