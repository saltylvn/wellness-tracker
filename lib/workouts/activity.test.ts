import { describe, expect, it } from "vitest";
import { loadDoneDates } from "./activity";
import { fakeSupabase } from "../testing/fakeSupabase";

describe("loadDoneDates", () => {
  it("merges lifting and cardio days without duplicates", async () => {
    const db = fakeSupabase({
      workout_sessions: [[{ session_date: "2026-11-09" }, { session_date: "2026-11-11" }]],
      cardio_logs: [[{ log_date: "2026-11-10" }, { log_date: "2026-11-11" }]],
    });
    expect((await loadDoneDates(db, "2026-11-01")).sort()).toEqual(["2026-11-09", "2026-11-10", "2026-11-11"]);
  });

  it("is empty when nothing is logged, or a query fails", async () => {
    const db = fakeSupabase({ workout_sessions: [{ error: { code: "500" } }], cardio_logs: [null] });
    expect(await loadDoneDates(db, "2026-11-01")).toEqual([]);
  });
});
