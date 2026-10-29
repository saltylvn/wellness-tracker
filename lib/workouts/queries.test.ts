import { describe, expect, it } from "vitest";
import {
  loadCardioDay,
  loadFitnessPage,
  loadGymBarcode,
  loadLiftDay,
  loadPlanExercises,
  loadPlanOverview,
  loadTanning,
} from "./queries";

// A stand-in for the database: each from("table") call hands back the next prepared
// answer for that table (in the order the page asks), and any query-builder call chains on.
function fakeSupabase(answers: Record<string, unknown[]>) {
  const queues = Object.fromEntries(Object.entries(answers).map(([table, rows]) => [table, [...rows]]));
  return {
    from(table: string) {
      const data = queues[table]?.shift() ?? null;
      const chain: unknown = new Proxy(
        {},
        {
          get: (_target, prop) =>
            prop === "then"
              ? (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve)
              : () => chain,
        },
      );
      return chain;
    },
  } as never;
}

describe("loadTanning", () => {
  it("returns today's minutes and the last earlier session", async () => {
    const db = fakeSupabase({ tanning_logs: [{ minutes: 12 }, { minutes: 8 }] });
    expect(await loadTanning(db, "2026-10-06")).toEqual({ minutes: 12, lastMinutes: 8 });
  });

  it("returns nulls when nothing is logged", async () => {
    expect(await loadTanning(fakeSupabase({ tanning_logs: [null, null] }), "2026-10-06")).toEqual({
      minutes: null,
      lastMinutes: null,
    });
  });
});

describe("loadCardioDay", () => {
  it("combines the week's totals, goals, and today's logs", async () => {
    const db = fakeSupabase({
      cardio_logs: [
        [
          { kind: "run", distance: "3.1", distance_unit: "mi" },
          { kind: "swim", distance: 500, distance_unit: "yd" },
        ],
        [{ id: "c1", kind: "run", distance: "3.1", distance_unit: "mi", duration_minutes: "28" }],
      ],
      profiles: [
        { weekly_run_miles: "5", weekly_cycle_miles: "10", weekly_swim_yards: null },
      ],
    });
    expect(await loadCardioDay(db, "user-1", "2026-10-06")).toEqual({
      logs: [{ id: "c1", kind: "run", distance: 3.1, unit: "mi", minutes: 28 }],
      weekTotals: { run: 3.1, cycle: 0, swim: 500 },
      weeklyGoals: { run: 5, cycle: 10, swim: null },
    });
  });

  it("handles a brand new account with nothing saved", async () => {
    const db = fakeSupabase({ cardio_logs: [[], []], profiles: [null] });
    expect(await loadCardioDay(db, "user-1", "2026-10-06")).toEqual({
      logs: [],
      weekTotals: { run: 0, cycle: 0, swim: 0 },
      weeklyGoals: { run: null, cycle: null, swim: null },
    });
  });
});

describe("loadLiftDay", () => {
  const deadlift = { id: "e1", name: "Deadlift", target_sets: 3, rep_min: 3, rep_max: 5, superset_with_next: false };

  it("gathers today's sets, bests, and history", async () => {
    const db = fakeSupabase({
      workout_sessions: [
        {
          workout_sets: [
            { id: "s1", exercise_id: "e1", set_number: 1, weight: "315", reps: 3, duration_seconds: null },
            { id: "s2", exercise_id: "e1", set_number: 2, weight: null, reps: null, duration_seconds: 60 },
          ],
        },
      ],
      // Calls in order: the one exercise's best, then history.
      workout_sets: [
        { weight: "335" }, // best weight for e1
        [{ exercise_id: "e1", set_number: 1, weight: "305", reps: 5, workout_sessions: { session_date: "2026-09-29" } }],
      ],
    });
    const lift = await loadLiftDay(db, "2026-10-06", [deadlift]);
    expect(lift.exercises).toEqual([deadlift]);
    expect(lift.todaySets).toEqual([
      { id: "s1", exercise_id: "e1", set_number: 1, weight: 315, reps: 3, seconds: null },
      { id: "s2", exercise_id: "e1", set_number: 2, weight: null, reps: null, seconds: 60 },
    ]);
    expect(lift.bestById.get("e1")).toBe(335);
    expect(lift.history).toEqual([
      { exercise_id: "e1", session_date: "2026-09-29", set_number: 1, weight: 305, reps: 5, seconds: null },
    ]);
  });

  it("skips the per-exercise lookups when the day has no exercises", async () => {
    const db = fakeSupabase({ workout_sessions: [null], workout_sets: [] });
    const lift = await loadLiftDay(db, "2026-10-06", []);
    expect(lift).toMatchObject({ exercises: [], todaySets: [], history: [] });
    expect(lift.bestById.size).toBe(0);
  });
});

describe("loadPlanExercises", () => {
  it("returns just the exercise fields, without the joined weekday", async () => {
    const db = fakeSupabase({
      workout_exercises: [
        [{ id: "e1", name: "Squat", target_sets: 3, rep_min: 5, rep_max: 8, superset_with_next: true, workout_days: { weekday: 3 } }],
      ],
    });
    expect(await loadPlanExercises(db, 3)).toEqual([
      { id: "e1", name: "Squat", target_sets: 3, rep_min: 5, rep_max: 8, superset_with_next: true },
    ]);
  });
});

describe("loadPlanOverview", () => {
  it("adds each day's exercise count and cardio plan", async () => {
    const db = fakeSupabase({
      workout_days: [
        [
          { id: "d1", weekday: 1, kind: "lift", title: "Legs" },
          { id: "d2", weekday: 2, kind: "cardio", title: "Cardio" },
        ],
        [
          { id: "d1", cardio_plan_kind: null, cardio_plan_distance: null },
          { id: "d2", cardio_plan_kind: "run", cardio_plan_distance: "3.00" },
        ],
      ],
      workout_exercises: [[{ day_id: "d1" }, { day_id: "d1" }, { day_id: "d1" }]],
    });
    expect(await loadPlanOverview(db, "u")).toEqual([
      { id: "d1", weekday: 1, kind: "lift", title: "Legs", exerciseCount: 3, cardioPlan: null },
      { id: "d2", weekday: 2, kind: "cardio", title: "Cardio", exerciseCount: 0, cardioPlan: { kind: "run", distance: 3 } },
    ]);
  });
});

describe("loadGymBarcode", () => {
  it("returns the saved barcode", async () => {
    const db = fakeSupabase({ profiles: [{ gym_barcode_text: "0012345", gym_barcode_format: "code128" }] });
    expect(await loadGymBarcode(db, "u")).toEqual({ text: "0012345", format: "code128" });
  });

  it("returns null when none is saved, or the profile can't be read", async () => {
    expect(await loadGymBarcode(fakeSupabase({ profiles: [{ gym_barcode_text: null, gym_barcode_format: null }] }), "u")).toBeNull();
    expect(await loadGymBarcode(fakeSupabase({ profiles: [null] }), "u")).toBeNull();
  });
});

describe("loadFitnessPage round trips", () => {
  // A stand-in database where every query takes 50 ms, like a trip over the network.
  // Queries that run at the same time overlap; ones that wait on each other add up.
  const LATENCY = 50;
  const days = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    id: `d${weekday}`,
    weekday,
    kind: [1, 3, 5].includes(weekday) ? "lift" : weekday === 6 ? "both" : weekday === 7 ? "rest" : "cardio",
    title: "x",
  }));
  const slowDb = () =>
    ({
      from(table: string) {
        let single = false;
        const rows =
          table === "workout_days"
            ? days
            : table === "workout_exercises"
              ? [{ id: "e1", name: "Squat", target_sets: 3, rep_min: 5, rep_max: 8, superset_with_next: false }]
              : [];
        const chain: unknown = new Proxy(
          {},
          {
            get: (_target, prop) => {
              if (prop === "maybeSingle" || prop === "single") single = true;
              if (prop !== "then") return () => chain;
              const data = single ? (rows[0] ?? null) : rows;
              return (resolve: (value: unknown) => unknown) =>
                new Promise((r) => setTimeout(r, LATENCY)).then(() => resolve({ data, error: null }));
            },
          },
        );
        return chain;
      },
    }) as never;

  async function trips(date: string) {
    const start = performance.now();
    const page = await loadFitnessPage(slowDb(), "u", date);
    return { page, trips: Math.round((performance.now() - start) / LATENCY) };
  }

  it("loads a lifting day in 2 trips", async () => {
    const { page, trips: count } = await trips("2026-10-05"); // Monday
    expect(page.lift?.exercises).toHaveLength(1);
    expect(page.gymBarcode).toBeNull();
    expect(count).toBe(2);
  });

  it("loads a lifting and cardio day in 2 trips", async () => {
    const { page, trips: count } = await trips("2026-10-10"); // Saturday: both
    expect(page.lift?.exercises).toHaveLength(1);
    expect(page.cardio).not.toBeNull();
    expect(count).toBe(2);
  });

  it("loads a cardio + tanning day in 2 trips", async () => {
    const { page, trips: count } = await trips("2026-10-06"); // Tuesday
    expect(page.cardio).not.toBeNull();
    expect(page.tanning).not.toBeNull();
    expect(count).toBe(2);
  });
});
