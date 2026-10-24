"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidDateKey } from "@/lib/dates";
import { parseNutritionForm } from "@/lib/food";
import { currentUserId } from "@/lib/actionResult";

export type SavedFoodFormState = { message: string } | null;

function backToList(date: FormDataEntryValue | null) {
  const key = String(date ?? "");
  return isValidDateKey(key) ? `/food/saved?date=${key}` : "/food/saved";
}

export async function updateSavedFood(
  _previous: SavedFoodFormState,
  formData: FormData,
): Promise<SavedFoodFormState> {
  const parsed = parseNutritionForm(formData);
  if (!parsed.ok) return { message: parsed.message };

  const id = formData.get("id");
  if (typeof id !== "string" || id === "") return { message: "Couldn't save. Please try again." };

  const supabase = await createClient();
  if (!(await currentUserId(supabase))) return { message: "Please sign in again." };
  // Row Level Security means this can only ever change your own saved food.
  const { error } = await supabase.from("saved_foods").update(parsed.values).eq("id", id);

  if (error) {
    // 23505 = unique violation: another saved food already has this name.
    return {
      message:
        error.code === "23505"
          ? "You already have a saved food with that name."
          : "Couldn't save. Please try again.",
    };
  }

  revalidatePath("/food/saved");
  redirect(backToList(formData.get("date")));
}

export async function deleteSavedFood(formData: FormData) {
  const id = formData.get("id");
  if (typeof id === "string" && id !== "") {
    const supabase = await createClient();
    if (!(await currentUserId(supabase))) redirect("/login");
    await supabase.from("saved_foods").delete().eq("id", id);
  }
  revalidatePath("/food/saved");
  redirect(backToList(formData.get("date")));
}
