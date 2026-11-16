// The read-only access for the Raspberry Pi fitness + wellness coach
// (supabase/migrations/20261116000000_coach_access.sql), tested against a real Postgres built from
// every migration. The coach's login must be able to call one function that returns one person's
// data, and nothing else: no tables, no other users, no food names, photos or gym barcode.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, migratedDatabase } from "./database";

const TYLER = "00000000-0000-0000-0000-0000000000a1";
const OTHER = "00000000-0000-0000-0000-0000000000b2";
const DEMO = "00000000-0000-0000-0000-0000000000de";

let db: PGlite;

async function createUser(id: string, email: string) {
  await db.exec("alter table auth.users disable trigger require_invite_code");
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
  await db.exec("alter table auth.users enable trigger require_invite_code");
}

/** Runs `sql` as the coach's login, then switches back. */
async function asCoach<T>(sql: string, params: unknown[] = []) {
  await db.exec("set role coach_reader");
  try {
    return await db.query<T>(sql, params);
  } finally {
    await db.exec("reset role");
  }
}

type WeeklyData = Record<string, unknown> & {
  sets: { exercise: string; weight: number; reps: number }[];
  nutrition_daily: { calories: number; protein_g: number; entries: number }[];
  water_daily: { ounces: number }[];
  sunshine_daily: { minutes: number }[];
  weight: { lb: number }[];
};

async function weeklyData(weeks = 8): Promise<WeeklyData> {
  const { rows } = await asCoach<{ data: WeeklyData }>("select coach.weekly_data($1) as data", [weeks]);
  return rows[0].data;
}

async function seed(userId: string, food: string, calories: number) {
  const day = await db.query<{ id: string }>(
    "insert into public.workout_days (user_id, weekday, kind, title) values ($1, 1, 'lift', 'Push') returning id",
    [userId],
  );
  const ex = await db.query<{ id: string }>(
    "insert into public.workout_exercises (user_id, day_id, name, target_sets, rep_min, rep_max) values ($1, $2, 'Bench', 3, 6, 10) returning id",
    [userId, day.rows[0].id],
  );
  const session = await db.query<{ id: string }>(
    "insert into public.workout_sessions (user_id, session_date, day_id, title, sauna_done) values ($1, current_date - 2, $2, 'Push', true) returning id",
    [userId, day.rows[0].id],
  );
  await db.query(
    "insert into public.workout_sets (user_id, session_id, exercise_id, exercise_name, set_number, weight, reps) values ($1, $2, $3, 'Bench', 1, 185, 8)",
    [userId, session.rows[0].id, ex.rows[0].id],
  );
  await db.query(
    "insert into public.food_entries (user_id, entry_date, meal_type, name, calories, protein_g, image_path) values ($1, current_date - 1, 'lunch', $2, $3, 40, 'photos/secret.jpg'), ($1, current_date - 1, 'dinner', $2, $3, 50, null)",
    [userId, food, calories],
  );
  await db.query("insert into public.water_logs (user_id, log_date, ounces) values ($1, current_date - 1, 20), ($1, current_date - 1, 40)", [userId]);
  await db.query("insert into public.tanning_logs (user_id, log_date, minutes) values ($1, current_date - 1, 15)", [userId]);
  await db.query("insert into public.weight_logs (user_id, log_date, weight_lb) values ($1, current_date - 1, 200.4)", [userId]);
  await db.query("insert into public.cardio_logs (user_id, log_date, kind, distance, distance_unit) values ($1, current_date - 3, 'run', 3.1, 'mi')", [userId]);
  await db.query("update public.profiles set gym_barcode_text = 'BARCODE-SECRET', gym_barcode_format = 'code128', protein_goal_g = 160 where id = $1", [userId]);
}

beforeAll(async () => {
  db = await migratedDatabase();
  await createUser(TYLER, "tyler@example.com");
  await createUser(OTHER, "other@example.com");
  await createUser(DEMO, "demo@example.com");
  await seed(TYLER, "Tyler's chicken bowl", 600);
  await seed(OTHER, "Other person's pizza", 900);
  await db.query("insert into coach.config (user_id) values ($1)", [TYLER]);
}, 60_000);

describe("coach.weekly_data", () => {
  it("returns the configured person's data, with daily totals", async () => {
    const data = await weeklyData();
    expect(data.sets).toEqual([expect.objectContaining({ exercise: "Bench", weight: 185, reps: 8 })]);
    expect(data.nutrition_daily).toEqual([expect.objectContaining({ calories: 1200, protein_g: 90, entries: 2 })]);
    expect(data.water_daily).toEqual([expect.objectContaining({ ounces: 60 })]);
    expect(data.sunshine_daily).toEqual([expect.objectContaining({ minutes: 15 })]);
    expect(data.weight).toEqual([expect.objectContaining({ lb: 200.4 })]);
    for (const key of ["goals", "plan", "exercises", "sessions", "cardio"]) expect(data).toHaveProperty(key);
  });

  it("never includes other people, food names, photos or the gym barcode", async () => {
    const text = JSON.stringify(await weeklyData());
    expect(text).not.toContain("pizza");
    expect(text).not.toContain("1800"); // the other person's calories
    expect(text).not.toContain("chicken bowl");
    expect(text).not.toContain("secret.jpg");
    expect(text).not.toContain("BARCODE-SECRET");
    expect(text).not.toContain(TYLER);
    expect(text).not.toContain(OTHER);
  });

  it("caps how far back it reads at 12 weeks", async () => {
    expect((await weeklyData(500)).weeks).toBe(12);
    expect((await weeklyData(0)).weeks).toBe(1);
  });

  it("refuses to serve the demo account", async () => {
    await db.query("update coach.config set user_id = $1", [DEMO]);
    try {
      await expect(weeklyData()).rejects.toThrow(/demo account/);
    } finally {
      await db.query("update coach.config set user_id = $1", [TYLER]);
    }
  });
});

describe("the coach's login", () => {
  it("can't read any table directly", async () => {
    for (const table of ["public.food_entries", "public.profiles", "public.workout_sets", "public.access_requests", "auth.users", "coach.config"]) {
      await expect(asCoach(`select 1 from ${table} limit 1`)).rejects.toThrow(/permission denied/);
    }
  });

  it("can't change data", async () => {
    await expect(asCoach("delete from public.food_entries")).rejects.toThrow(/permission denied/);
    await expect(asCoach("insert into coach.config (user_id) values ($1)", [OTHER])).rejects.toThrow(/permission denied/);
  });

  it("is read-only, time-limited and limited to 2 connections", async () => {
    const { rows } = await db.query<{ rolconfig: string[]; rolconnlimit: number; rolsuper: boolean; rolbypassrls: boolean }>(
      "select rolconfig, rolconnlimit, rolsuper, rolbypassrls from pg_roles where rolname = 'coach_reader'",
    );
    expect(rows[0].rolconfig).toEqual(expect.arrayContaining(["default_transaction_read_only=on", "statement_timeout=10s"]));
    expect(rows[0].rolconnlimit).toBe(2);
    expect(rows[0].rolsuper).toBe(false);
    expect(rows[0].rolbypassrls).toBe(false);
  });
});

describe("the app's own roles", () => {
  it("can't call the coach function", async () => {
    await asUser(db, TYLER, async () => {
      await expect(db.query("select coach.weekly_data(8)")).rejects.toThrow(/permission denied/);
    });
    await db.exec("set role anon");
    try {
      await expect(db.query("select coach.weekly_data(8)")).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role");
    }
  });
});
