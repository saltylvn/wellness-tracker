import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_DAILY_LIMIT, isMissingFunction, takeAiRequest } from "./dailyLimit";

// A tiny stand-in for the Supabase client: the rpc answer, plus the older table path.
function fakeClient(rpc: { data?: unknown; error?: { code: string } | null }, existing = 0) {
  const calls = { rpc: 0, count: 0, insert: 0 };
  const client = {
    rpc: async () => (calls.rpc++, { data: rpc.data ?? null, error: rpc.error ?? null }),
    from: () => ({
      select: () => ({ gte: async () => (calls.count++, { count: existing }) }),
      insert: async () => (calls.insert++, { error: null }),
    }),
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe("takeAiRequest", () => {
  it("uses the one-step database function when it exists", async () => {
    const yes = fakeClient({ data: true });
    expect(await takeAiRequest(yes.client, "u")).toBe(true);
    expect(yes.calls).toEqual({ rpc: 1, count: 0, insert: 0 }); // one round trip

    const no = fakeClient({ data: false });
    expect(await takeAiRequest(no.client, "u")).toBe(false);
  });

  it("falls back to count-then-log if the SQL hasn't been run yet", async () => {
    const under = fakeClient({ error: { code: "PGRST202" } }, AI_DAILY_LIMIT - 1);
    expect(await takeAiRequest(under.client, "u")).toBe(true);
    expect(under.calls).toEqual({ rpc: 1, count: 1, insert: 1 });

    const full = fakeClient({ error: { code: "PGRST202" } }, AI_DAILY_LIMIT);
    expect(await takeAiRequest(full.client, "u")).toBe(false);
    expect(full.calls.insert).toBe(0);
  });

  it("says no on any other database error (fails safe)", async () => {
    const broken = fakeClient({ error: { code: "57014" } });
    expect(await takeAiRequest(broken.client, "u")).toBe(false);
    expect(broken.calls.count).toBe(0);
  });
});

describe("isMissingFunction", () => {
  it("recognizes PostgREST's and Postgres's 'no such function' codes", () => {
    expect(isMissingFunction({ code: "PGRST202" })).toBe(true);
    expect(isMissingFunction({ code: "42883" })).toBe(true);
    expect(isMissingFunction({ code: "42501" })).toBe(false);
    expect(isMissingFunction(null)).toBe(false);
  });
});
