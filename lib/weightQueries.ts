import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "./dbErrors";
import { addDays } from "./dates";
import type { WeighIn } from "./weightPlan";

// Everything the Weight tab reads, fetched at the same time. The server actions use it
// too, so the page and the AI plan always work from the same numbers.

export type SavedPlan = {
  pace: number | null; // your weekly pace from Settings (lb per week), null = the default 2
  note: string | null;
  source: "ai" | "auto" | null;
  key: string | null; // the numbers it was worked out for (see coachKey)
};

export type WeightData = {
  logs: WeighIn[]; // the last ~6 months of weigh-ins up to `date`, oldest first
  first: WeighIn | null; // your very first weigh-in
  targetSetting: number | null;
  startSetting: number | null;
  plan: SavedPlan;
  databaseBehind: boolean; // true until the weight_plan SQL step has been run
};

const HISTORY_DAYS = 180;

const asNumber = (value: unknown) => (value === null || value === undefined ? null : Number(value));
const toWeighIn = (row: { log_date: unknown; weight_lb: unknown }): WeighIn => ({
  date: row.log_date as string,
  pounds: Number(row.weight_lb),
});

export async function loadWeightData(supabase: SupabaseClient, userId: string, date: string): Promise<WeightData> {
  const [logs, first, profile] = await Promise.all([
    supabase
      .from("weight_logs")
      .select("log_date, weight_lb")
      .gte("log_date", addDays(date, -HISTORY_DAYS))
      .lte("log_date", date)
      .order("log_date", { ascending: true }),
    supabase
      .from("weight_logs")
      .select("log_date, weight_lb")
      .order("log_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select(
        "target_weight_lb, start_weight_lb, weight_pace_lb_week, weight_coach_note, weight_coach_source, weight_coach_key",
      )
      .eq("id", userId)
      .maybeSingle(),
  ]);

  // Before the new SQL step is run, the new columns don't exist: still show the target.
  let row: Record<string, unknown> | null = profile.data;
  const databaseBehind = isMissingSchemaError(profile.error);
  if (databaseBehind) {
    const fallback = await supabase.from("profiles").select("target_weight_lb").eq("id", userId).maybeSingle();
    row = fallback.data;
  }

  return {
    logs: (logs.data ?? []).map(toWeighIn),
    first: first.data ? toWeighIn(first.data) : null,
    targetSetting: asNumber(row?.target_weight_lb),
    startSetting: asNumber(row?.start_weight_lb),
    plan: {
      pace: asNumber(row?.weight_pace_lb_week),
      note: (row?.weight_coach_note as string | null) ?? null,
      source: (row?.weight_coach_source as SavedPlan["source"]) ?? null,
      key: (row?.weight_coach_key as string | null) ?? null,
    },
    databaseBehind,
  };
}
