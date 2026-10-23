import { describe, expect, it } from "vitest";
import {
  buildModelChain,
  classifyGeminiError,
  DEFAULT_MODEL_CHAIN,
  isTimeoutError,
  raceModels,
  type AttemptOutcome,
} from "./modelChain";

describe("buildModelChain", () => {
  it("uses the defaults when no model is chosen", () => {
    expect(buildModelChain()).toEqual([...DEFAULT_MODEL_CHAIN]);
    expect(buildModelChain("")).toEqual([...DEFAULT_MODEL_CHAIN]);
    expect(buildModelChain("   ")).toEqual([...DEFAULT_MODEL_CHAIN]);
    expect(buildModelChain(null)).toEqual([...DEFAULT_MODEL_CHAIN]);
  });

  it("puts the chosen model first", () => {
    const chain = buildModelChain("gemini-9-pro");
    expect(chain[0]).toBe("gemini-9-pro");
    expect(chain.slice(1)).toEqual([...DEFAULT_MODEL_CHAIN]);
  });

  it("doesn't repeat a model that's already in the list", () => {
    const chain = buildModelChain("gemini-3.5-flash-lite");
    expect(chain[0]).toBe("gemini-3.5-flash-lite");
    expect(chain.filter((m) => m === "gemini-3.5-flash-lite")).toHaveLength(1);
    expect(chain).toHaveLength(DEFAULT_MODEL_CHAIN.length);
  });

  it("has several free models to fall back on", () => {
    expect(DEFAULT_MODEL_CHAIN.length).toBeGreaterThanOrEqual(3);
    expect(new Set(DEFAULT_MODEL_CHAIN).size).toBe(DEFAULT_MODEL_CHAIN.length);
  });
});

describe("classifyGeminiError", () => {
  it("tries the next model when Google is overloaded or busy", () => {
    for (const status of [429, 500, 502, 503, 504]) {
      expect(classifyGeminiError({ status, message: "high demand" })).toBe("try-next-model");
    }
  });

  it("tries the next model after a timeout", () => {
    expect(classifyGeminiError({ timedOut: true })).toBe("try-next-model");
  });

  it("tries the next model when a model has been retired", () => {
    expect(classifyGeminiError({ status: 404, message: "no longer available to new users" })).toBe(
      "try-next-model",
    );
  });

  it("stops on a bad key or missing permission, since every model would fail", () => {
    expect(classifyGeminiError({ status: 401 })).toBe("stop");
    expect(classifyGeminiError({ status: 403, message: "permission denied" })).toBe("stop");
    expect(classifyGeminiError({ status: 400, message: "API key not valid. Please pass a valid API key." })).toBe(
      "stop",
    );
  });

  it("treats a generic 400 as a model-specific problem", () => {
    expect(classifyGeminiError({ status: 400, message: "thinking level not supported" })).toBe(
      "try-next-model",
    );
  });

  it("tries the next model when the error has no details", () => {
    expect(classifyGeminiError({})).toBe("try-next-model");
  });
});

describe("isTimeoutError", () => {
  it("recognizes abort and timeout errors only", () => {
    const abort = new Error("aborted");
    abort.name = "AbortError";
    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";
    expect(isTimeoutError(abort)).toBe(true);
    expect(isTimeoutError(timeout)).toBe(true);
    expect(isTimeoutError(new Error("boom"))).toBe(false);
    expect(isTimeoutError("AbortError")).toBe(false);
    expect(isTimeoutError(null)).toBe(false);
  });
});

describe("raceModels", () => {
  // A stand-in model: answers with `outcome` after `ms`, unless it's cancelled first.
  type Fake = { ms: number; outcome: AttemptOutcome<string> };
  function setup(fakes: Record<string, Fake>, options: { hedgeAfterMs?: number; budgetMs?: number } = {}) {
    const started: string[] = [];
    const cancelled: string[] = [];
    const run = () =>
      raceModels<string>({
        models: Object.keys(fakes),
        fallback: "busy",
        hedgeAfterMs: options.hedgeAfterMs ?? 30,
        budgetMs: options.budgetMs ?? 1000,
        attempt: (model, signal) =>
          new Promise((resolve) => {
            started.push(model);
            const timer = setTimeout(() => resolve(fakes[model].outcome), fakes[model].ms);
            signal.addEventListener("abort", () => {
              clearTimeout(timer);
              cancelled.push(model);
              resolve({ retry: "cancelled" });
            });
          }),
      });
    return { run, started, cancelled };
  }

  it("uses the first model when it answers quickly, without starting a backup", async () => {
    const { run, started } = setup({ a: { ms: 5, outcome: { done: "A" } }, b: { ms: 5, outcome: { done: "B" } } });
    expect(await run()).toBe("A");
    expect(started).toEqual(["a"]);
  });

  it("starts a backup when the first model is slow, and takes whichever answers first", async () => {
    const { run, started, cancelled } = setup({
      slow: { ms: 500, outcome: { done: "slow" } },
      quick: { ms: 10, outcome: { done: "quick" } },
    });
    const t = Date.now();
    expect(await run()).toBe("quick");
    expect(Date.now() - t).toBeLessThan(200); // didn't wait for the slow one
    expect(started).toEqual(["slow", "quick"]);
    expect(cancelled).toEqual(["slow"]); // the slow request was cancelled
  });

  it("moves on right away when a model fails", async () => {
    const { run, started } = setup(
      { a: { ms: 5, outcome: { retry: "busy" } }, b: { ms: 5, outcome: { done: "B" } } },
      { hedgeAfterMs: 10_000 },
    );
    expect(await run()).toBe("B");
    expect(started).toEqual(["a", "b"]);
  });

  it("never runs more than two models at once", async () => {
    const { run, started } = setup({
      a: { ms: 100, outcome: { retry: "busy" } },
      b: { ms: 100, outcome: { retry: "busy" } },
      c: { ms: 5, outcome: { done: "C" } },
    }, { hedgeAfterMs: 10 });
    const result = run();
    await new Promise((r) => setTimeout(r, 60));
    expect(started).toEqual(["a", "b"]); // c waits for a free slot
    expect(await result).toBe("C");
  });

  it("stops at once on a problem every model would share (like a bad key)", async () => {
    const { run, started } = setup({ a: { ms: 5, outcome: { stop: "bad key" } }, b: { ms: 5, outcome: { done: "B" } } });
    expect(await run()).toBe("bad key");
    expect(started).toEqual(["a"]);
  });

  it("reports the last problem when every model fails", async () => {
    const { run } = setup({ a: { ms: 5, outcome: { retry: "busy" } }, b: { ms: 5, outcome: { retry: "unreadable" } } });
    expect(await run()).toBe("unreadable");
  });

  it("gives up with what it has when time runs out", async () => {
    const { run, cancelled } = setup(
      { a: { ms: 5_000, outcome: { done: "A" } }, b: { ms: 5_000, outcome: { done: "B" } } },
      { hedgeAfterMs: 10, budgetMs: 50 },
    );
    expect(await run()).toBe("busy");
    expect(cancelled.sort()).toEqual(["a", "b"]);
  });
});
