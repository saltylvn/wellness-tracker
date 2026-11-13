// The database rules, tested against a real Postgres built from every migration in order
// (see database.ts). These are the rules the app relies on the database to enforce:
// row-level security, invite-only sign-up, the admin role and the AI daily limit.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { asUser, migratedDatabase, migrationFiles } from "./database";

const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";
const ADMIN = "00000000-0000-0000-0000-0000000000ad";
const DEMO = "00000000-0000-0000-0000-0000000000de";

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
  await createUserWithoutInvite(DEMO, "demo@example.com");
  // The demo's password can only be set on purpose (see "the shared demo account" below).
  await db.exec("set develop.allow_demo_login_change = 'on'");
  await db.query("update auth.users set encrypted_password = 'demo-hash' where id = $1", [DEMO]);
  await db.exec("reset develop.allow_demo_login_change");
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

describe("armed invite codes", () => {
  it("can't be taken by a password sign-up that carries no code of its own", async () => {
    await asUser(db, ADMIN, () =>
      db.query("insert into public.invite_codes (code, created_by) values ('ARMEDXY2', $1)", [ADMIN]),
    );
    await db.query("select public.arm_invite_code('ARMEDXY2')");
    await expect(
      db.query("insert into auth.users (email, encrypted_password) values ('sneaky@example.com', 'some-hash')"),
    ).rejects.toThrow(/invite-only/);
    const { rows } = await db.query<{ used: boolean }>(
      "select used_at is not null as used from public.invite_codes where code = 'ARMEDXY2'",
    );
    expect(rows[0].used).toBe(false); // still there for the person it was armed for
    await db.query("delete from public.invite_codes where code = 'ARMEDXY2'");
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

  it("stores one row per phone number, normalized, and asking again changes nothing", async () => {
    // Someone else who knows the number can't overwrite the name next to it.
    await db.query("select public.request_access('Not Sam', '555-123-4567')");
    const { rows } = await db.query<{ name: string; phone: string }>("select name, phone from public.access_requests");
    expect(rows).toEqual([{ name: "Sam", phone: "+15551234567" }]);
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
    expect(admin.rows).toEqual([{ name: "Sam" }]);
    const marked = await asUser(db, ADMIN, () =>
      db.query("update public.access_requests set invited_at = now() where phone = '+15551234567'"),
    );
    expect(marked.affectedRows).toBe(1);
  });
});

describe("wait-list flooding", () => {
  it("takes at most 20 new people an hour, and answers the same for a number already on the list", async () => {
    const { rows } = await db.query<{ n: number }>(
      "select count(*)::int as n from public.access_requests where created_at > now() - interval '1 hour'",
    );
    for (let i = rows[0].n; i < 20; i++) {
      await db.query("select public.request_access($1, $2)", [`Person ${i}`, `555000${String(1000 + i)}`]);
    }
    await expect(db.query("select public.request_access('One more', '5559990000')")).rejects.toThrow(/full right now/);
    // The same reply for a number that IS on the list, so the reply can't be used to look people up.
    await expect(db.query("select public.request_access('Sam', '5551234567')")).rejects.toThrow(/full right now/);
  });
});

describe("the shared demo account", () => {
  it("keeps its password when a visitor tries to change it, and refuses a new email", async () => {
    await db.query("update auth.users set encrypted_password = 'attacker-hash', last_sign_in_at = now() where id = $1", [DEMO]);
    const { rows } = await db.query<{ p: string; signed_in: boolean }>(
      "select encrypted_password as p, last_sign_in_at is not null as signed_in from auth.users where id = $1",
      [DEMO],
    );
    expect(rows[0]).toEqual({ p: "demo-hash", signed_in: true }); // sign-ins still update the row
    await expect(db.query("update auth.users set email = 'mine@example.com' where id = $1", [DEMO])).rejects.toThrow(
      /demo login cannot be changed/,
    );
  });

  it("lets the owner change it on purpose, and leaves other accounts alone", async () => {
    await db.exec("set develop.allow_demo_login_change = 'on'");
    try {
      await db.query("update auth.users set encrypted_password = 'rotated' where id = $1", [DEMO]);
    } finally {
      await db.exec("reset develop.allow_demo_login_change");
    }
    await db.query("update auth.users set encrypted_password = 'alice-new' where id = $1", [ALICE]);
    const { rows } = await db.query<{ id: string; p: string }>(
      "select id, encrypted_password as p from auth.users where id in ($1, $2) order by email",
      [ALICE, DEMO],
    );
    expect(rows.map((r) => r.p)).toEqual(["alice-new", "rotated"]);
  });

  it("rebuilds its sample data and profile, but not more than once every 5 minutes", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const reset = (date: string) =>
      asUser(db, DEMO, () => db.query<{ ok: boolean }>("select public.reset_demo_data($1::date) as ok", [date]));

    expect((await reset(today)).rows[0].ok).toBe(true);
    // A visitor writes something into the demo's profile, straight through the API.
    await asUser(db, DEMO, () =>
      db.query("update public.profiles set priority_lift_1 = 'Defaced', gym_barcode_text = '000' where id = $1", [DEMO]),
    );
    // Asking again right away does nothing, even with a different date.
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    expect((await reset(tomorrow)).rows[0].ok).toBe(false);

    // Later (pretend the last rebuild was two hours ago) it rebuilds, profile included.
    await db.exec("update public.demo_state set reset_at = now() - interval '2 hours'");
    expect((await reset(today)).rows[0].ok).toBe(true);
    const { rows } = await db.query<{ a: string; b: string }>(
      "select priority_lift_1 as a, gym_barcode_text as b from public.profiles where id = $1",
      [DEMO],
    );
    expect(rows[0]).toEqual({ a: "Squats", b: "DEVELOP-0001234" });
  });

  it("does nothing for other accounts, and its inner rebuild can't be called directly", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await db.exec("update public.demo_state set reset_at = now() - interval '2 hours'");
    const alice = await asUser(db, ALICE, () =>
      db.query<{ ok: boolean }>("select public.reset_demo_data($1::date) as ok", [today]),
    );
    expect(alice.rows[0].ok).toBe(false);
    await expect(
      asUser(db, DEMO, () => db.query("select public.reset_demo_rows($1::date)", [today])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("what the API roles can call", () => {
  it("lets visitors who aren't signed in call only the three sign-up helpers", async () => {
    const { rows } = await db.query<{ name: string }>(
      `select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1`,
    );
    expect(rows.map((r) => r.name)).toEqual(["arm_invite_code", "invite_code_ok", "request_access"]);
  });

  it("keeps trigger-only and inner functions away from signed-in users too", async () => {
    const { rows } = await db.query<{ name: string }>(
      `select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute') order by 1`,
    );
    expect(rows.map((r) => r.name)).toEqual([
      "admin_list_users",
      "arm_invite_code",
      "invite_code_ok",
      "is_admin",
      "request_access",
      "reset_demo_data",
      "take_ai_request",
    ]);
  });
});

describe("size limits", () => {
  it("refuses oversized text in a profile", async () => {
    await expect(
      asUser(db, ALICE, () => db.query("update public.profiles set timezone = $1 where id = $2", ["x".repeat(65), ALICE])),
    ).rejects.toThrow(/profiles_timezone_len/);
  });
});

describe("AI daily limit", () => {
  it("can't be jammed by logging requests with a made-up time", async () => {
    await expect(
      asUser(db, ALICE, () =>
        db.query("insert into public.ai_requests (user_id, created_at) values ($1, '2999-01-01')", [ALICE]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

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

describe("the security hardening migration", () => {
  it("can be run a second time without errors", async () => {
    const file = path.join(__dirname, "..", "migrations", "20261111000000_security_hardening.sql");
    await expect(db.exec(readFileSync(file, "utf8"))).resolves.toBeDefined();
  });
});
