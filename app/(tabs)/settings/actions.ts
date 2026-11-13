"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DATABASE_BEHIND_MESSAGE, isMissingSchemaError } from "@/lib/dbErrors";
import { parseGoalsForm } from "@/lib/goals";
import { parsePriorityLifts } from "@/lib/priorityLifts";
import { createClient } from "@/lib/supabase/server";
import { currentUserId } from "@/lib/actionResult";
import { isFairCodeByte, makeInviteCode, parsePassword } from "@/lib/accounts";

// "use server" = these functions run on the server when a form is submitted.
// Never trust what the browser sends: we check everything again here.

export type SaveResult = { ok: boolean; message: string } | null;

export async function saveGoals(_previous: SaveResult, formData: FormData): Promise<SaveResult> {
  const parsed = parseGoalsForm(formData);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");

  // Row Level Security in the database also enforces "only your own row".
  let { error } = await supabase.from("profiles").update(parsed.values).eq("id", userId);
  // Before the starting-date SQL step, the column doesn't exist: still save the rest when no
  // date was picked (picking one needs the SQL step, and says so).
  if (isMissingSchemaError(error) && parsed.values.start_date === null) {
    const { start_date: _skip, ...rest } = parsed.values;
    void _skip;
    ({ error } = await supabase.from("profiles").update(rest).eq("id", userId));
  }

  if (error) {
    return {
      ok: false,
      message: isMissingSchemaError(error) ? DATABASE_BEHIND_MESSAGE : "Couldn't save. Please try again.",
    };
  }

  revalidatePath("/settings"); // so this page shows what you just saved
  revalidatePath("/food");
  revalidatePath("/weight");
  revalidatePath("/workouts");
  return { ok: true, message: "Saved." };
}

/** Your priority lifts, up to three (shown at the top of lifting days). */
export async function savePriorityLifts(_previous: SaveResult, formData: FormData): Promise<SaveResult> {
  const parsed = parsePriorityLifts([
    formData.get("priority_lift_1"),
    formData.get("priority_lift_2"),
    formData.get("priority_lift_3"),
  ]);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");

  let { error } = await supabase.from("profiles").update(parsed.values).eq("id", userId);
  // Before the SQL step adds priority_lift_3, two picks still save (like start_date in saveGoals).
  if (isMissingSchemaError(error) && parsed.values.priority_lift_3 === null) {
    const { priority_lift_3: _skip, ...firstTwo } = parsed.values;
    void _skip;
    ({ error } = await supabase.from("profiles").update(firstTwo).eq("id", userId));
  }
  if (error) {
    return {
      ok: false,
      message: isMissingSchemaError(error) ? DATABASE_BEHIND_MESSAGE : "Couldn't save. Please try again.",
    };
  }

  revalidatePath("/workouts");
  return { ok: true, message: "Saved." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Settings, "Password": set or change the password you log in with (with your username). */
export async function savePassword(_previous: SaveResult, formData: FormData): Promise<SaveResult> {
  const parsed = parsePassword(formData.get("password"));
  if (!parsed.ok) return { ok: false, message: parsed.message };
  if (formData.get("password_again") !== parsed.value) {
    return { ok: false, message: "The two passwords don't match." };
  }

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password: parsed.value });
  if (error) {
    if (/different from the old/i.test(error.message)) return { ok: false, message: "That's already your password." };
    if (/password/i.test(error.message)) return { ok: false, message: error.message };
    return { ok: false, message: "Couldn't save. Please try again." };
  }
  return { ok: true, message: "Password saved. Use it with your username to log in." };
}

/** 8 evenly random invite characters (bytes that would favor some characters are skipped). */
function randomInviteCode(): string {
  const fair: number[] = [];
  while (fair.length < 8) {
    for (const byte of crypto.getRandomValues(new Uint8Array(16))) {
      if (isFairCodeByte(byte) && fair.length < 8) fair.push(byte);
    }
  }
  return makeInviteCode(Uint8Array.from(fair));
}

export type InviteResult = { ok: true; code: string } | { ok: false; message: string };

/**
 * Settings, "Invite someone" (the admin only): makes a fresh invite code. The page then
 * opens Messages with it written out. The database only lets the admin save one
 * (see the username_invites migration), so this can't be used by anyone else.
 */
export async function createInvite(): Promise<InviteResult> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");

  const code = randomInviteCode();
  const { error } = await supabase.from("invite_codes").insert({ code, created_by: userId });
  if (error) {
    return {
      ok: false,
      message: isMissingSchemaError(error)
        ? DATABASE_BEHIND_MESSAGE
        : error.code === "42501"
          ? "Only the admin can send invites."
          : "Couldn't make an invite. Please try again.",
    };
  }
  revalidatePath("/settings");
  return { ok: true, code };
}

/**
 * Settings, "Invite someone" (the admin only): revokes an invite nobody has used yet, so its
 * code stops working at once. (Deletes it; the database only lets the admin delete their own
 * unused invites, see 20261106000000_revoke_invites.sql. A used invite stays: that person
 * already has their account.)
 */
export async function revokeInvite(code: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");

  const { data, error } = await supabase
    .from("invite_codes")
    .delete()
    .eq("code", String(code))
    .is("used_at", null)
    .select("code");
  if (error) return { ok: false, message: "Couldn't revoke it. Please try again." };
  // Nothing deleted: it was just used, or the database step for revoking isn't run yet.
  if (!data || data.length === 0) {
    revalidatePath("/settings");
    return {
      ok: false,
      message: "Couldn't revoke it: it may have just been used. If not, run the latest SQL in Supabase, then try again.",
    };
  }
  revalidatePath("/settings");
  return { ok: true };
}

export type WaitlistInviteResult = { ok: true; code: string; phone: string } | { ok: false; message: string };

/**
 * Settings, "Wait-list" (the admin only): makes an invite code for this person and marks
 * them invited, then the page opens Messages addressed to their number. Row-level security
 * lets only the admin read or change the wait-list, and only the admin can create codes.
 */
export async function inviteFromWaitlist(id: string): Promise<WaitlistInviteResult> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");

  const { data: person, error: readError } = await supabase
    .from("access_requests")
    .select("phone")
    .eq("id", String(id))
    .maybeSingle();
  if (readError) return { ok: false, message: isMissingSchemaError(readError) ? DATABASE_BEHIND_MESSAGE : "Couldn't load the wait-list." };
  if (!person) return { ok: false, message: "That person isn't on the wait-list any more." };

  const invite = await createInvite();
  if (!invite.ok) return invite;

  await supabase.from("access_requests").update({ invited_at: new Date().toISOString() }).eq("id", String(id));
  return { ok: true, code: invite.code, phone: person.phone as string };
}

/** Settings, "Wait-list" (the admin only): takes someone off the list without inviting them. */
export async function removeFromWaitlist(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");

  const { error } = await supabase.from("access_requests").delete().eq("id", String(id));
  if (error) return { ok: false, message: "Couldn't remove them. Please try again." };
  revalidatePath("/settings");
  return { ok: true };
}
