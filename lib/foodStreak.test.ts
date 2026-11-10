import { describe, expect, it } from "vitest";
import { loadFoodLogDates } from "./foodStreak";
import { fakeSupabase } from "./testing/fakeSupabase";

describe("loadFoodLogDates", () => {
  it("returns each logged day once", async () => {
    const db = fakeSupabase({
      food_entries: [[{ entry_date: "2026-11-10" }, { entry_date: "2026-11-10" }, { entry_date: "2026-11-09" }]],
    });
    expect(await loadFoodLogDates(db, "2026-10-01")).toEqual(["2026-11-10", "2026-11-09"]);
  });

  it("is empty when nothing is logged", async () => {
    expect(await loadFoodLogDates(fakeSupabase({ food_entries: [null] }), "2026-10-01")).toEqual([]);
  });
});
