import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/BackButton";
import GoalsForm from "@/components/GoalsForm";
import InviteCard from "@/components/InviteCard";
import PasswordForm from "@/components/PasswordForm";
import UsersCard, { type AppUser } from "@/components/UsersCard";
import WaitlistCard from "@/components/WaitlistCard";
import type { WaitlistEntry } from "@/lib/waitlist";
import { DATABASE_BEHIND_MESSAGE, isMissingSchemaError } from "@/lib/dbErrors";
import { usernameFromEmail, type InviteRow } from "@/lib/accounts";
import PriorityLiftsForm from "@/components/PriorityLiftsForm";
import { priorityChoices, priorityNames } from "@/lib/priorityLifts";
import type { Goals } from "@/lib/goals";
import { signOut } from "./actions";
import { currentUserId } from "@/lib/actionResult";

export default async function SettingsPage() {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "calorie_goal, protein_goal_g, carb_goal_g, fat_goal_g, weekly_run_miles, weekly_cycle_miles, weekly_swim_yards",
    )
    .eq("id", userId ?? "")
    .maybeSingle();

  // The weight goal is read on its own, so Settings still loads if its database steps aren't run yet.
  // The priority lifts too ("*", so it works before their SQL step), with your plan's exercise names.
  const [{ data: targetRow }, { data: startRow }, { data: paceRow }, { data: fullProfile }, { data: exerciseRows }] =
    await Promise.all([
      supabase.from("profiles").select("target_weight_lb").eq("id", userId ?? "").maybeSingle(),
      supabase.from("profiles").select("start_weight_lb").eq("id", userId ?? "").maybeSingle(),
      supabase.from("profiles").select("weight_pace_lb_week").eq("id", userId ?? "").maybeSingle(),
      supabase.from("profiles").select("*").eq("id", userId ?? "").maybeSingle(),
      supabase.from("workout_exercises").select("name"),
    ]);
  const picked = priorityNames(fullProfile);

  // Your account: your username (for username + password accounts) and whether you're the
  // admin. Each read fails quietly (as "not admin", no invites) before the SQL step is run.
  const [{ data: claimsData }, { data: adminRow }, { data: inviteRows }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("app_admins").select("user_id").eq("user_id", userId ?? "").maybeSingle(),
    supabase
      .from("invite_codes")
      .select("code, created_at, used_at, used_username")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const username = usernameFromEmail(claimsData?.claims.email);
  const isAdmin = Boolean(adminRow);

  // The admin's "Users" list (everyone with an account and their last login).
  const [usersResult, waitlistResult] = isAdmin
    ? await Promise.all([
        supabase.rpc("admin_list_users"),
        // Only people not invited yet, oldest first.
        supabase
          .from("access_requests")
          .select("id, name, phone, created_at")
          .is("invited_at", null)
          .order("created_at", { ascending: true }),
      ])
    : [null, null];
  const waitlist = (waitlistResult?.data ?? []) as WaitlistEntry[];
  const waitlistError = waitlistResult?.error
    ? isMissingSchemaError(waitlistResult.error)
      ? DATABASE_BEHIND_MESSAGE
      : "Couldn't load the wait-list."
    : null;
  const users = (usersResult?.data ?? []) as AppUser[];
  const usersError = usersResult?.error
    ? isMissingSchemaError(usersResult.error)
      ? DATABASE_BEHIND_MESSAGE
      : "Couldn't load the list of users."
    : null;
  const choices = priorityChoices(
    (exerciseRows ?? []).map((row) => row.name as string),
    picked,
  );

  // Before you've saved anything, the calorie goal is blank (null).
  const goals = {
    ...(profile ?? {
      calorie_goal: null,
      protein_goal_g: null,
      carb_goal_g: null,
      fat_goal_g: null,
      weekly_run_miles: null,
      weekly_cycle_miles: null,
      weekly_swim_yards: null,
    }),
    target_weight_lb: targetRow?.target_weight_lb == null ? null : Number(targetRow.target_weight_lb),
    start_weight_lb: startRow?.start_weight_lb == null ? null : Number(startRow.start_weight_lb),
    weight_pace_lb_week: paceRow?.weight_pace_lb_week == null ? null : Number(paceRow.weight_pace_lb_week),
    weekly_walk_miles:
      fullProfile?.weekly_walk_miles == null ? null : Number(fullProfile.weekly_walk_miles),
    start_date: typeof fullProfile?.start_date === "string" ? fullProfile.start_date : null,
    daily_sunshine_minutes:
      fullProfile?.daily_sunshine_minutes == null ? null : Number(fullProfile.daily_sunshine_minutes),
  } as unknown as Goals;

  return (
    <div className="space-y-6">
      <div>
        <BackButton fallback="/workouts" />
        {/* Title on the left, a small orange "Sign out" on the right (like "Done" on Edit plan). */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Settings</h1>
          <form action={signOut}>
            <button
              type="submit"
              className="flex min-h-11 items-center px-1 text-base font-semibold text-accent active:opacity-70"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <section className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">Signed in as</p>
          <p className="truncate text-base font-semibold">{username ?? "your Google account"}</p>
        </div>
        {isAdmin && (
          <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent">
            Admin
          </span>
        )}
      </section>

      <section className="rounded-2xl bg-card p-4">
        <GoalsForm goals={goals} />
      </section>

      <section className="rounded-2xl bg-card p-4">
        <PriorityLiftsForm picked={picked} choices={choices} />
      </section>

      {username && (
        <section className="rounded-2xl bg-card p-4">
          <PasswordForm username={username} />
        </section>
      )}

      {isAdmin && (
        <section className="rounded-2xl bg-card p-4">
          <InviteCard invites={(inviteRows ?? []) as InviteRow[]} />
        </section>
      )}

      {isAdmin && (
        <section className="rounded-2xl bg-card p-4">
          <WaitlistCard entries={waitlist} error={waitlistError} />
        </section>
      )}

      {isAdmin && (
        <section className="rounded-2xl bg-card p-4">
          <UsersCard users={users} error={usersError} />
        </section>
      )}

    </div>
  );
}
