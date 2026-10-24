import type { SupabaseClient } from "@supabase/supabase-js";

// Each person can make this many AI requests per rolling 24 hours (food estimates and
// weight-plan updates together). The free AI quota is shared by everyone who can sign
// in, so one person can't use it all.
export const AI_DAILY_LIMIT = 40;

/**
 * True if you still have AI requests left today, and if so logs this one. It's logged
 * before the AI answers (even if it then fails), so failed attempts can't be used to
 * hammer the service.
 *
 * Uses the take_ai_request database function (one round trip, exact even when two
 * requests arrive at once; see supabase/migrations/20261026000000_ai_limit_function.sql).
 * If that SQL hasn't been run yet, it falls back to the older count-then-log check.
 */
export async function takeAiRequest(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("take_ai_request", { max_per_day: AI_DAILY_LIMIT });
  if (!error) return data === true;
  if (!isMissingFunction(error)) return false; // a real problem: be safe and say no

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("ai_requests")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= AI_DAILY_LIMIT) return false;
  await supabase.from("ai_requests").insert({ user_id: userId });
  return true;
}

/** PostgREST's "no such function" (the migration hasn't been run yet). */
export function isMissingFunction(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "PGRST202" || error?.code === "42883";
}
