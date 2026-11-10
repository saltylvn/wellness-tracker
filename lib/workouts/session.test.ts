import { describe, expect, it } from "vitest";
import { upsertSession } from "./session";
import { fakeSupabase } from "../testing/fakeSupabase";

const day = { id: "day-1", title: "Legs" };

describe("upsertSession", () => {
  it("returns the session id", async () => {
    const db = fakeSupabase({ workout_sessions: [{ id: "s1" }] });
    expect(await upsertSession(db, "u", "2026-11-10", day)).toEqual({ ok: true, id: "s1" });
  });

  it("passes the database error on, so the caller can tell a missing SQL step apart", async () => {
    const db = fakeSupabase({ workout_sessions: [{ error: { code: "42P01" } }] });
    expect(await upsertSession(db, "u", "2026-11-10", day)).toEqual({ ok: false, error: { code: "42P01" } });
  });
});
