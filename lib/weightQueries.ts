import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "./dbErrors";
import { addDays, weekDays } from "./dates";
import type { WeighIn } from "./weightPlan";

// Everything the Weight tab reads, fetched at the same time.

export type WeightData = {
  logs: WeighIn[]; // the last ~6 months of weigh-ins up to `date`, oldest first
  weekLogged: string[]; // the days in `date`'s Monday-to-Sunday week with a weigh-in (for the calendar)
  first: WeighIn | null; // your very first weigh-in
  targetSetting: number | null;
  startSetting: number | null;
  pace: number | null; // your weekly pace from Settings (lb per week), null = the default 2
  databaseBehind: boolean; // true until the weight_plan SQL step has been run
};

const HISTORY_DAYS = 180;

const asNumber = (value: unknown) => (value === null || value === undefined ? null : Number(value));
const toWeighIn = (row: { log_date: unknown; weight_lb: unknown }): WeighIn => ({
  date: row.log_date as string,
  pounds: Number(row.weight_lb),
});

export async function loadWeightData(supabase: SupabaseClient, userId: string, date: string): Promise<WeightData> {
  const week = weekDays(date);
  const [logs, first, profile, weekLogs] = await Promise.all([
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
      .select("target_weight_lb, start_weight_lb, weight_pace_lb_week")
      .eq("id", userId)
      .maybeSingle(),
    // The whole week, including days after `date`, so the calendar's rings are all there.
    supabase.from("weight_logs").select("log_date").gte("log_date", week[0]).lte("log_date", week[6]),
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
    weekLogged: (weekLogs.data ?? []).map((row) => row.log_date as string),
    first: first.data ? toWeighIn(first.data) : null,
    targetSetting: asNumber(row?.target_weight_lb),
    startSetting: asNumber(row?.start_weight_lb),
    pace: asNumber(row?.weight_pace_lb_week),
    databaseBehind,
  };
}
