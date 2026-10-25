"use server";

import { revalidatePath } from "next/cache";
import { failedSave, SIGN_IN_AGAIN, type ActionResult } from "@/lib/actionResult";
import { isDemoEmail } from "@/lib/demo";
import { parseGymBarcode } from "@/lib/gymBarcode";
import { gymBarcodeSvg } from "@/lib/gymBarcodeSvg";
import { createClient } from "@/lib/supabase/server";

const DEMO_LOCKED: ActionResult = { ok: false, message: "The demo's sample barcode can't be changed." };

// Who's signed in, and whether it's the shared demo account (its sample barcode stays put,
// so one visitor can't change what the next one sees). Needs the email, so it reads the
// login claims itself instead of using currentUserId.
async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub ?? null;
  return { supabase, userId, inDemo: isDemoEmail(data?.claims.email, process.env.DEMO_EMAIL) };
}

// Saves the barcode the browser read from your screenshot (just its text and type).
export async function saveGymBarcode(input: { text: string; format: string }): Promise<ActionResult> {
  // Never trust the browser: check what it sent, and that we can actually draw it.
  const barcode = parseGymBarcode(input);
  if (!barcode || gymBarcodeSvg(barcode) === null) {
    return { ok: false, message: "That barcode can't be shown here. Try another screenshot." };
  }

  const { supabase, userId, inDemo } = await signedIn();
  if (!userId) return SIGN_IN_AGAIN;
  if (inDemo) return DEMO_LOCKED;

  const { error } = await supabase
    .from("profiles")
    .update({ gym_barcode_text: barcode.text, gym_barcode_format: barcode.format })
    .eq("id", userId);
  if (error) return failedSave(error);

  revalidatePath("/workouts");
  return { ok: true };
}

export async function deleteGymBarcode(): Promise<ActionResult> {
  const { supabase, userId, inDemo } = await signedIn();
  if (!userId) return SIGN_IN_AGAIN;
  if (inDemo) return DEMO_LOCKED;

  const { error } = await supabase
    .from("profiles")
    .update({ gym_barcode_text: null, gym_barcode_format: null })
    .eq("id", userId);
  if (error) return failedSave(error);

  revalidatePath("/workouts");
  return { ok: true };
}
