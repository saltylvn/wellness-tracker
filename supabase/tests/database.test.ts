// The database rules, tested against a real Postgres built from every migration in order
// (see database.ts). These are the rules the app relies on the database to enforce:
// row-level security, invite-only sign-up, the admin role and the AI daily limit.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, migratedDatabase, migrationFiles } from "./database";

const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";
const ADMIN = "00000000-0000-0000-0000-0000000000ad";

let db: PGlite;

/** Creates an account directly (like the Supabase dashboard does), skipping the invite check. */
async function createUserWithoutInvite(id: string, email: string) {
  await db.exec("alter table auth.users disable trigger require_invite_code");
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
  await db.exec("alter table auth.users enable trigger require_invite_code");
}

/** Tries to create an account the way sign-up does, optionally with an invite code. */
async function signUp(email: string, inviteCode?: string) {
  const meta = inviteCode ? JSON.stringify({ invite_code: inviteCode }) : "{}";
  return db.query<{ id: string }>("insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id", [
    email,
    meta,
  ]);
}

beforeAll(async () => {
  db = await migratedDatabase();
  await createUserWithoutInvite(ALICE, "alice@example.com");
  await createUserWithoutInvite(BOB, "bob@example.com");
  await createUserWithoutInvite(ADMIN, "admin@example.com");
  await db.query("insert into public.app_admins (user_id) values ($1)", [ADMIN]);
}, 60_000);

describe("migrations", () => {
  it("apply in order to a fresh database", async () => {
    expect(migrationFiles().length).toBeGreaterThanOrEqual(26);
    const { rows } = await db.query<{ count: number }>(
      "select count(*)::int as count from pg_tables where schemaname = 'public'",
    );
    expect(rows[0].count).toBe(16);
  });

  it("give every new account a profile", async () => {
    const { rows } = await db.query("select id from public.profiles where id = $1", [ALICE]);
    expect(rows).toHaveLength(1);
  });
});

describe("priority lifts", () => {
  it("keep three names of 1-80 characters each", async () => {
    await asUser(db, ALICE, () =>
      db.query("update public.profiles set priority_lift_1 = 'Squats', priority_lift_2 = 'Deadlift', priority_lift_3 = 'Bench' where id = $1", [ALICE]),
    );
    await expect(
      db.query("update public.profiles set priority_lift_3 = $1 where id = $2", ["x".repeat(81), ALICE]),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("row-level security", () => {
  it("is switched on for every table in the public schema", async () => {
    const { rows } = await db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("keeps each person's rows private", async () => {
    await asUser(db, ALICE, () =>
      db.query(
        "insert into public.food_entries (user_id, entry_date, meal_type, name, calories) values ($1, '2026-11-10', 'lunch', 'Salad', 400)",
        [ALICE],
      ),
    );
    const alice = await asUser(db, ALICE, () => db.query("select name from public.food_entries"));
    const bob = await asUser(db, BOB, () => db.query("select name from public.food_entries"));
    expect(alice.rows).toEqual([{ name: "Salad" }]);
    expect(bob.rows).toEqual([]);
  });

  it("won't let someone write a row as another person", async () => {
    await expect(
      asUser(db, BOB, () =>
        db.query(
          "insert into public.food_entries (user_id, entry_date, meal_type, name, calories) values ($1, '2026-11-10', 'lunch', 'Not mine', 1)",
          [ALICE],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("won't let someone change another person's rows", async () => {
    const updated = await asUser(db, BOB, () =>
      db.query("update public.food_entries set calories = 9999 where user_id = $1", [ALICE]),
    );
    expect(updated.affectedRows ?? 0).toBe(0);
  });
});

describe("invite-only sign-up", () => {
  it("refuses a new account without an invite code", async () => {
    await expect(signUp("stranger@example.com")).rejects.toThrow(/invite-only/);
  });

  it("only lets the admin create invite codes", async () => {
    await expect(
      asUser(db, ALICE, () =>
        db.query("insert into public.invite_codes (code, created_by) values ('ABCDEFGH', $1)", [ALICE]),
      ),
    ).rejects.toThrow(/row-level security/);
    await asUser(db, ADMIN, () =>
      db.query("insert into public.invite_codes (code, created_by) values ('JKMNPQRS', $1)", [ADMIN]),
    );
  });

  it("accepts a valid code once, marks it used and removes it from the account", async () => {
    const { rows } = await signUp("newcomer@example.com", "jkmnpqrs"); // case doesn't matter
    const [invite] = (
      await db.query<{ used_username: string; used: boolean }>(
        "select used_username, used_at is not null as used from public.invite_codes where code = 'JKMNPQRS'",
      )
    ).rows;
    expect(invite).toEqual({ used_username: "newcomer", used: true });
    const meta = await db.query<{ m: Record<string, unknown> }>("select raw_user_meta_data as m from auth.users where id = $1", [
      rows[0].id,
    ]);
    expect(meta.rows[0].m).not.toHaveProperty("invite_code");
  });

  it("refuses a code that was already used", async () => {
    await expect(signUp("second@example.com", "JKMNPQRS")).rejects.toThrow(/invite-only/);
  });

  it("refuses a code older than 14 days", async () => {
    await db.query(
      "insert into public.invite_codes (code, created_by, created_at) values ('TUVWXYZ2', $1, now() - interval '15 days')",
      [ADMIN],
    );
    await expect(signUp("late@example.com", "TUVWXYZ2")).rejects.toThrow(/invite-only/);
  });

  it("uses a code armed for a first-time Google sign-in (which can't carry the code itself)", async () => {
    await asUser(db, ADMIN, () =>
      db.query("insert into public.invite_codes (code, created_by) values ('ABCDEFG3', $1)", [ADMIN]),
    );
    const armed = await db.query<{ ok: boolean }>("select public.invite_code_ok('ABCDEFG3') as ok");
    expect(armed.rows[0].ok).toBe(true);
    await db.query("select public.arm_invite_code('ABCDEFG3')");
    await signUp("google.person@gmail.com"); // no code in the metadata
    const { rows } = await db.query<{ used: boolean }>(
      "select used_at is not null as used from public.invite_codes where code = 'ABCDEFG3'",
    );
    expect(rows[0].used).toBe(true);
  });
});

describe("account cap", () => {
  it("refuses the 26th account, invite or not", async () => {
    await db.exec("alter table auth.users disable trigger require_invite_code");
    try {
      const { rows } = await db.query<{ n: number }>("select count(*)::int as n from auth.users");
      for (let i = rows[0].n; i < 25; i++) await db.query("insert into auth.users (email) values ($1)", [`filler${i}@example.com`]);
      await expect(db.query("insert into auth.users (email) values ('one-too-many@example.com')")).rejects.toThrow(
        /limited to 25 accounts/,
      );
    } finally {
      await db.exec("alter table auth.users enable trigger require_invite_code");
    }
  });
});

describe("admin", () => {
  it("lists users only for the admin", async () => {
    const list = await asUser(db, ADMIN, () => db.query("select email from public.admin_list_users()"));
    expect(list.rows.length).toBeGreaterThanOrEqual(3);
    await expect(asUser(db, ALICE, () => db.query("select * from public.admin_list_users()"))).rejects.toThrow(
      /Only the admin/,
    );
  });

  it("can't be granted by a user to themselves", async () => {
    await expect(
      asUser(db, ALICE, () => db.query("insert into public.app_admins (user_id) values ($1)", [ALICE])),
    ).rejects.toThrow();
  });
});

describe("wait-list", () => {
  it("lets a visitor who isn't signed in ask for access, without seeing the list", async () => {
    await db.exec("set role anon");
    try {
      await db.query("select public.request_access('Sam', '(555) 123-4567')");
      const seen = await db.query("select * from public.access_requests");
      expect(seen.rows).toEqual([]); // row-level security hides every row from visitors
    } finally {
      await db.exec("reset role");
    }
  });

  it("stores one row per phone number, normalized, and refreshes it when asked again", async () => {
    await db.query("select public.request_access('Sam R', '555-123-4567')");
    const { rows } = await db.query<{ name: string; phone: string }>("select name, phone from public.access_requests");
    expect(rows).toEqual([{ name: "Sam R", phone: "+15551234567" }]);
  });

  it("refuses an empty name or a bad phone number", async () => {
    await expect(db.query("select public.request_access('', '5551234567')")).rejects.toThrow(/check your name/);
    await expect(db.query("select public.request_access('Pat', '12345')")).rejects.toThrow(/check your name/);
  });

  it("is visible and editable only to the admin", async () => {
    const alice = await asUser(db, ALICE, () => db.query("select * from public.access_requests"));
    expect(alice.rows).toEqual([]);
    const removed = await asUser(db, ALICE, () => db.query("delete from public.access_requests"));
    expect(removed.affectedRows ?? 0).toBe(0);
    const admin = await asUser(db, ADMIN, () => db.query<{ name: string }>("select name from public.access_requests"));
    expect(admin.rows).toEqual([{ name: "Sam R" }]);
    const marked = await asUser(db, ADMIN, () =>
      db.query("update public.access_requests set invited_at = now() where phone = '+15551234567'"),
    );
    expect(marked.affectedRows).toBe(1);
  });
});

describe("AI daily limit", () => {
  it("allows exactly the daily limit, then refuses", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const { rows } = await asUser(db, BOB, () =>
        db.query<{ ok: boolean }>("select public.take_ai_request(3) as ok"),
      );
      results.push(rows[0].ok);
    }
    expect(results).toEqual([true, true, true, false]);
  });

  it("counts each person separately", async () => {
    const { rows } = await asUser(db, ALICE, () => db.query<{ ok: boolean }>("select public.take_ai_request(3) as ok"));
    expect(rows[0].ok).toBe(true);
  });
});
