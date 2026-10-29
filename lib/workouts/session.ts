import type { SupabaseClient } from "@supabase/supabase-js";

// Makes sure there is a workout session for this date (one per date, enforced by
// the database), so logged sets have one to belong to. On failure, `error` is what the database said (hand it to
// failedSave() to tell a missing SQL step apart from an ordinary failure).
export type UpsertSessionResult =
  | { ok: true; id: string }
  | { ok: false; error: { code?: string | null } | null };

export async function upsertSession(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  day: { id: string; title: string },
): Promise<UpsertSessionResult> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .upsert(
      { user_id: userId, session_date: date, day_id: day.id, title: day.title },
      { onConflict: "user_id,session_date" },
    )
    .select("id")
    .single();
  if (error || !data) return { ok: false, error };
  return { ok: true, id: data.id as string };
}
