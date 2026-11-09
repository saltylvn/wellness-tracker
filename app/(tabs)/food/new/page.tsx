import FoodEntryForm from "@/components/FoodEntryForm";
import GoToToday from "@/components/GoToToday";
import { isValidDateKey } from "@/lib/dates";
import type { Nutrition } from "@/lib/food";
import { createClient } from "@/lib/supabase/server";

export default async function NewFoodPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; from?: string }>;
}) {
  const { date, from } = await searchParams;
  // No date given (e.g. a bookmark)? Let the phone pick today, then come back here.
  if (!date || !isValidDateKey(date)) return <GoToToday to="/food/new" />;

  // Coming from the Saved foods list? Start the form with that food's numbers.
  let prefill: Nutrition | undefined;
  if (from) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("saved_foods")
      .select("name, calories, protein_g, carbs_g, fat_g")
      .eq("id", from)
      .maybeSingle();
    if (data) prefill = data as Nutrition;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{prefill ? "Log saved food" : "Log food"}</h1>
      <FoodEntryForm defaultDate={date} prefill={prefill} hideSaveToggle={Boolean(prefill)} />
    </div>
  );
}
