// Workout picks from the Pi coach (supabase/migrations/20261118000000_coach_workouts.sql), tested on a
// real Postgres built from every migration. The writer can save today's picks, but only with https
// links on the allowlisted publishers; the app shows them only to their owner.
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, migratedDatabase } from "./database";

const TYLER = "00000000-0000-0000-0000-0000000000d1";
const OTHER = "00000000-0000-0000-0000-0000000000d2";

let db: PGlite;
let today: string;

const PICK = {
  title: "The 4-Day Upper/Lower Split",
  source: "Men's Health",
  url: "https://www.menshealth.com/fitness/a1/upper-lower-split/",
  summary: "Two upper and two lower days with 4 sets of 6.",
  why: "Fits your bench focus.",
};
const WORKOUTS = { headline: "💪 Bigger lifts this week", plan_summary: "Swap Friday for the upper day.", picks: [PICK] };

async function createUser(id: string, email: string) {
  await db.exec("alter table auth.users disable trigger require_invite_code");
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
  await db.exec("alter table auth.users enable trigger require_invite_code");
}

async function save(note: unknown, forDate = today, kind = "workouts") {
  await db.exec("set role coach_writer");
  try {
    return await db.query("select coach.save_note($1, $2::date, $3::jsonb, 'gemini-test', 'w1')", [kind, forDate, JSON.stringify(note)]);
  } finally {
    await db.exec("reset role");
  }
}

beforeAll(async () => {
  db = await migratedDatabase();
  await createUser(TYLER, "tyler@example.com");
  await createUser(OTHER, "other@example.com");
  await db.query("insert into coach.config (user_id) values ($1)", [TYLER]);
  ({ today } = (await db.query<{ today: string }>("select current_date::text as today")).rows[0]);
}, 60_000);

beforeEach(async () => {
  await db.exec("delete from coach.notes");
});

describe("saving workout picks", () => {
  it("saves today's picks with allowlisted links", async () => {
    await save({ ...WORKOUTS, picks: [PICK, { ...PICK, url: "https://nerdfitness.com/blog/x/" }] });
    const { rows } = await db.query<{ kind: string; n: number }>(
      "select kind, jsonb_array_length(note -> 'picks') as n from coach.notes",
    );
    expect(rows).toEqual([{ kind: "workouts", n: 2 }]);
  });

  it.each([
    ["an off-list site", "https://evil.example.com/workout"],
    ["plain http", "http://www.menshealth.com/fitness/a1/"],
    ["a look-alike domain", "https://www.menshealth.com.evil.io/fitness/"],
    ["a javascript: link", "javascript:alert(1)"],
    ["credentials in the link", "https://user@www.menshealth.com/fitness/"],
    ["a quote that could break out of an attribute", 'https://www.menshealth.com/fitness/"onmouseover=x'],
    ["spaces", "https://www.menshealth.com/fitness/a b"],
  ])("refuses a link to %s", async (_label, url) => {
    await expect(save({ ...WORKOUTS, picks: [{ ...PICK, url }] })).rejects.toThrow(/wrong shape/);
  });

  it.each([
    ["no picks", { ...WORKOUTS, picks: [] }],
    ["six picks", { ...WORKOUTS, picks: Array(6).fill(PICK) }],
    ["an extra field on a pick", { ...WORKOUTS, picks: [{ ...PICK, html: "<b>" }] }],
    ["a missing summary", { ...WORKOUTS, picks: [{ ...PICK, summary: undefined }] }],
    ["an extra field on the note", { ...WORKOUTS, focuses: ["x"] }],
    ["a missing plan summary", { headline: "x", picks: [PICK] }],
  ])("refuses picks with %s", async (_label, note) => {
    await expect(save(note)).rejects.toThrow(/wrong shape/);
  });

  it("only accepts today's picks", async () => {
    const { rows } = await db.query<{ old: string }>("select (current_date - 3)::text as old");
    await expect(save(WORKOUTS, rows[0].old)).rejects.toThrow(/only for today/);
  });

  it("still accepts daily and weekly notes, and weekly ones only on Mondays", async () => {
    await save({ headline: "h", yesterday: "y", week_so_far: "", focuses: ["f"] }, today, "daily");
    const { rows } = await db.query<{ tue: string }>(
      "select ((current_date - (extract(isodow from current_date)::int - 1)) + 1)::text as tue",
    );
    await expect(
      db.query("insert into coach.notes (user_id, kind, for_date, note, model) values ($1, 'weekly', $2::date, '{}', 'x')", [TYLER, rows[0].tue]),
    ).rejects.toThrow(/notes_weekly_monday_check/);
  });

  it("keeps workout picks for 90 days", async () => {
    await db.query("insert into coach.notes (user_id, kind, for_date, note, model) values ($1, 'workouts', current_date - 91, '{}', 'old')", [TYLER]);
    await save(WORKOUTS);
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from coach.notes");
    expect(rows[0].n).toBe(1);
  });
});

describe("the app", () => {
  it("shows the day's picks to their owner only, and rates them", async () => {
    await save(WORKOUTS);
    const panel = (userId: string) =>
      asUser(db, userId, async () => (await db.query<{ p: { workouts: unknown } }>("select public.my_coach_panel($1::date) as p", [today])).rows[0].p);
    expect((await panel(TYLER)).workouts).toEqual(expect.objectContaining({ note: WORKOUTS }));
    expect((await panel(OTHER)).workouts).toBeNull();
    const ok = await asUser(db, TYLER, async () =>
      (await db.query<{ ok: boolean }>("select public.rate_coach_note('workouts', $1::date, 'up') as ok", [today])).rows[0].ok,
    );
    expect(ok).toBe(true);
  });

  it("can't call the link check or shape helpers directly", async () => {
    await asUser(db, TYLER, async () => {
      await expect(db.query("select coach.allowed_link('https://www.menshealth.com/')")).rejects.toThrow(/permission denied/);
    });
  });
});
