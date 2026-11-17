// Coach notes for the Fitness tab's pull-up panel (supabase/migrations/20261117000000_coach_notes.sql),
// tested against a real Postgres built from every migration. The Pi's coach_writer login must be able
// to save one well-formed note for the configured person (today / this or last week) and nothing else;
// signed-in people see and rate only their own notes.
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, migratedDatabase } from "./database";

const TYLER = "00000000-0000-0000-0000-0000000000c1";
const OTHER = "00000000-0000-0000-0000-0000000000c2";
const DEMO = "00000000-0000-0000-0000-0000000000de";

let db: PGlite;
let today: string;
let monday: string;

const DAILY = {
  headline: "🎯 Today: Push day. Hit 160g protein.",
  yesterday: "Rest day as planned.",
  week_so_far: "2 of 2 lift days done.",
  focuses: ["Bench: add 5 lb to set 1."],
};
const WEEKLY = {
  headline: "📋 2 of 3 lift days, bench PR",
  wins: ["Bench PR: 190 lb."],
  trends: ["Volume up 1720 lb on last week."],
  focuses: ["Hit all 3 lift days.", "Log food every day."],
};

async function createUser(id: string, email: string) {
  await db.exec("alter table auth.users disable trigger require_invite_code");
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
  await db.exec("alter table auth.users enable trigger require_invite_code");
}

async function as<T>(role: string, sql: string, params: unknown[] = []) {
  await db.exec(`set role ${role}`);
  try {
    return await db.query<T>(sql, params);
  } finally {
    await db.exec("reset role");
  }
}

function save(kind: string, forDate: string, note: unknown, model = "gemini-test") {
  return as("coach_writer", "select coach.save_note($1, $2::date, $3::jsonb, $4, 'v1')", [
    kind,
    forDate,
    JSON.stringify(note),
    model,
  ]);
}

async function rows() {
  return (await db.query<{ user_id: string; kind: string; for_date: string; feedback: string | null }>(
    "select user_id, kind, for_date::text, feedback from coach.notes order by kind, for_date",
  )).rows;
}

beforeAll(async () => {
  db = await migratedDatabase();
  await createUser(TYLER, "tyler@example.com");
  await createUser(OTHER, "other@example.com");
  await createUser(DEMO, "demo@example.com");
  await db.query("insert into coach.config (user_id) values ($1)", [TYLER]);
  const { rows: d } = await db.query<{ today: string; monday: string }>(
    "select current_date::text as today, (current_date - (extract(isodow from current_date)::int - 1))::text as monday",
  );
  ({ today, monday } = d[0]);
}, 60_000);

beforeEach(async () => {
  await db.exec("delete from coach.notes");
});

describe("coach.save_note (the Pi's writer)", () => {
  it("saves today's note and this week's review for the configured person", async () => {
    await save("daily", today, DAILY);
    await save("weekly", monday, WEEKLY);
    expect(await rows()).toEqual([
      { user_id: TYLER, kind: "daily", for_date: today, feedback: null },
      { user_id: TYLER, kind: "weekly", for_date: monday, feedback: null },
    ]);
  });

  it("replaces a note on re-save and clears its old rating", async () => {
    await save("daily", today, DAILY);
    await db.query("update coach.notes set feedback = 'up'");
    await save("daily", today, { ...DAILY, yesterday: "Updated." });
    const { rows: r } = await db.query<{ note: { yesterday: string }; feedback: string | null }>(
      "select note, feedback from coach.notes",
    );
    expect(r).toEqual([expect.objectContaining({ feedback: null, note: expect.objectContaining({ yesterday: "Updated." }) })]);
  });

  it("only accepts today (daily) and this or last week's Monday (weekly)", async () => {
    await expect(save("daily", "2020-01-01", DAILY)).rejects.toThrow(/only for today/);
    const { rows: d } = await db.query<{ old: string; tue: string; two_weeks: string; last: string }>(
      `select ($1::date - 3)::text as old, ($2::date + 1)::text as tue,
              ($2::date - 14)::text as two_weeks, ($2::date - 7)::text as last`,
      [today, monday],
    );
    await expect(save("daily", d[0].old, DAILY)).rejects.toThrow(/only for today/);
    await expect(save("weekly", d[0].tue, WEEKLY)).rejects.toThrow(/Monday/);
    await expect(save("weekly", d[0].two_weeks, WEEKLY)).rejects.toThrow(/Monday/);
    await save("weekly", d[0].last, WEEKLY); // last week is fine (a late Sunday run)
    await expect(save("monthly", today, DAILY)).rejects.toThrow(/kind must be/);
  });

  it.each([
    ["an extra field", { ...DAILY, html: "<b>" }],
    ["a missing field", { headline: "x", focuses: ["y"] }],
    ["too many focuses", { ...DAILY, focuses: ["a", "b", "c"] }],
    ["no focuses", { ...DAILY, focuses: [] }],
    ["a non-text focus", { ...DAILY, focuses: [{ x: 1 }] }],
    ["a headline that's too long", { ...DAILY, headline: "x".repeat(81) }],
    ["an empty headline", { ...DAILY, headline: "" }],
    ["too many safety notes", { ...DAILY, safety: ["a", "b", "c", "d"] }],
    ["a list instead of an object", ["not", "an", "object"]],
  ])("refuses a daily note with %s", async (_label, note) => {
    await expect(save("daily", today, note)).rejects.toThrow(/wrong shape/);
    expect(await rows()).toEqual([]);
  });

  it("refuses an oversized or misshapen weekly review", async () => {
    await expect(save("weekly", monday, { ...WEEKLY, focuses: ["only one"] })).rejects.toThrow(/wrong shape/);
    await expect(save("weekly", monday, { ...WEEKLY, wins: ["x".repeat(161)] })).rejects.toThrow(/wrong shape/);
    await expect(save("weekly", monday, WEEKLY, "")).rejects.toThrow(/model/);
  });

  it("refuses to write for the demo account", async () => {
    await db.query("update coach.config set user_id = $1", [DEMO]);
    try {
      await expect(save("daily", today, DAILY)).rejects.toThrow(/demo account/);
    } finally {
      await db.query("update coach.config set user_id = $1", [TYLER]);
    }
  });

  it("deletes daily notes older than 90 days (weekly reviews are kept)", async () => {
    await db.query(
      `insert into coach.notes (user_id, kind, for_date, note, model) values
         ($1, 'daily', current_date - 91, '{}', 'old'),
         ($1, 'weekly', (current_date - 91) - (extract(isodow from current_date - 91)::int - 1), '{}', 'old')`,
      [TYLER],
    );
    await save("daily", today, DAILY);
    const kinds = (await rows()).map((r) => r.kind);
    expect(kinds).toEqual(["daily", "weekly"]); // the 91-day-old daily note is gone
  });
});

describe("the writer login can't do anything else", () => {
  it("can't read or change any table", async () => {
    for (const table of ["coach.notes", "coach.config", "public.food_entries", "public.profiles", "auth.users"]) {
      await expect(as("coach_writer", `select 1 from ${table} limit 1`)).rejects.toThrow(/permission denied/);
    }
    await expect(as("coach_writer", "delete from coach.notes")).rejects.toThrow(/permission denied/);
  });

  it("can't call the reader's function or the shape helpers", async () => {
    await expect(as("coach_writer", "select coach.weekly_data(8)")).rejects.toThrow(/permission denied/);
    await expect(as("coach_writer", "select coach.valid_note('daily', '{}')")).rejects.toThrow(/permission denied/);
  });

  it("and the reader login can't write", async () => {
    await expect(
      as("coach_reader", "select coach.save_note('daily', current_date, '{}'::jsonb, 'x')"),
    ).rejects.toThrow(/permission denied/);
  });

  it("is time-limited and limited to 2 connections", async () => {
    const { rows: r } = await db.query<{ rolconfig: string[]; rolconnlimit: number; rolbypassrls: boolean }>(
      "select rolconfig, rolconnlimit, rolbypassrls from pg_roles where rolname = 'coach_writer'",
    );
    expect(r[0].rolconfig).toEqual(expect.arrayContaining(["statement_timeout=10s"]));
    expect(r[0].rolconnlimit).toBe(2);
    expect(r[0].rolbypassrls).toBe(false);
  });
});

describe("the app: my_coach_panel and rate_coach_note", () => {
  type Panel = { daily: { note: typeof DAILY; feedback: string | null } | null; weekly: unknown; last_week: unknown };

  async function panel(userId: string, day: string) {
    return asUser(db, userId, async () => {
      const { rows: r } = await db.query<{ p: Panel }>("select public.my_coach_panel($1::date) as p", [day]);
      return r[0].p;
    });
  }

  it("shows your own note for the day and that week's review", async () => {
    await save("daily", today, DAILY);
    await save("weekly", monday, WEEKLY);
    const p = await panel(TYLER, today);
    expect(p.daily?.note).toEqual(DAILY);
    expect(p.weekly).toEqual(expect.objectContaining({ note: WEEKLY }));
    expect(p.last_week).toBeNull();
  });

  it("never shows anyone else's notes", async () => {
    await save("daily", today, DAILY);
    const p = await panel(OTHER, today);
    expect(p).toEqual({ daily: null, weekly: null, last_week: null, workouts: null });
  });

  it("can't read coach.notes directly", async () => {
    await asUser(db, TYLER, async () => {
      await expect(db.query("select * from coach.notes")).rejects.toThrow(/permission denied/);
    });
  });

  it("rates only your own notes, with up or down", async () => {
    await save("daily", today, DAILY);
    const rate = (userId: string, feedback: string) =>
      asUser(db, userId, async () => {
        const { rows: r } = await db.query<{ ok: boolean }>(
          "select public.rate_coach_note('daily', $1::date, $2) as ok",
          [today, feedback],
        );
        return r[0].ok;
      });
    expect(await rate(OTHER, "up")).toBe(false);
    expect(await rate(TYLER, "sideways")).toBe(false);
    expect(await rate(TYLER, "down")).toBe(true);
    expect((await rows())[0].feedback).toBe("down");
  });

  it("isn't available to signed-out visitors", async () => {
    await expect(as("anon", "select public.my_coach_panel(current_date)")).rejects.toThrow(/permission denied/);
    await expect(as("anon", "select public.rate_coach_note('daily', current_date, 'up')")).rejects.toThrow(
      /permission denied/,
    );
  });
});
