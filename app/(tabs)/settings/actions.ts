"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DATABASE_BEHIND_MESSAGE, isMissingSchemaError } from "@/lib/dbErrors";
import { parseGoalsForm } from "@/lib/goals";
import { parsePriorityLifts } from "@/lib/priorityLifts";
import { createClient } from "@/lib/supabase/server";
import { currentUserId } from "@/lib/actionResult";

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
  const { error } = await supabase.from("profiles").update(parsed.values).eq("id", userId);

  if (error) {
    return {
      ok: false,
      message: isMissingSchemaError(error) ? DATABASE_BEHIND_MESSAGE : "Couldn't save. Please try again.",
    };
  }

  revalidatePath("/food");
  revalidatePath("/weight");
  return { ok: true, message: "Saved." };
}

/** Your two priority lifts (shown at the top of lifting days). */
export async function savePriorityLifts(_previous: SaveResult, formData: FormData): Promise<SaveResult> {
  const parsed = parsePriorityLifts(formData.get("priority_lift_1"), formData.get("priority_lift_2"));
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");

  const { error } = await supabase.from("profiles").update(parsed.values).eq("id", userId);
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
