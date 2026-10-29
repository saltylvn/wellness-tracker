import type { SupabaseClient } from "@supabase/supabase-js";

// Every date (on or after `sinceKey`) on which you logged a workout: either at
// least one lifting set, or a cardio log. Used for the streak and the green rings
// on the week strip.
export async function loadDoneDates(supabase: SupabaseClient, sinceKey: string): Promise<string[]> {
  const [sessions, cardio] = await Promise.all([
    // "!inner" keeps only sessions that have at least one logged set.
    supabase.from("workout_sessions").select("session_date, workout_sets!inner(id)").gte("session_date", sinceKey),
    supabase.from("cardio_logs").select("log_date").gte("log_date", sinceKey),
  ]);

  const dates = new Set<string>();
  for (const row of sessions.data ?? []) dates.add(row.session_date as string);
  for (const row of cardio.data ?? []) dates.add(row.log_date as string);
  return [...dates];
}
