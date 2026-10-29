import { createClient } from "@/lib/supabase/server";
import GoalsForm from "@/components/GoalsForm";
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
    daily_sunshine_minutes:
      fullProfile?.daily_sunshine_minutes == null ? null : Number(fullProfile.daily_sunshine_minutes),
  } as unknown as Goals;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="rounded-2xl bg-card p-4">
        <GoalsForm goals={goals} />
      </section>

      <section className="rounded-2xl bg-card p-4">
        <PriorityLiftsForm picked={picked} choices={choices} />
      </section>

      <form action={signOut}>
        <button
          type="submit"
          className="min-h-12 w-full rounded-xl border border-border text-base font-medium active:opacity-80"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
