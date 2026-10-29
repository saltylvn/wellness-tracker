import Link from "next/link";
import { redirect } from "next/navigation";
import CaloriesCard from "@/components/CaloriesCard";
import GoToToday from "@/components/GoToToday";
import MacrosCard from "@/components/MacrosCard";
import NutritionHeader from "@/components/NutritionHeader";
import WaterTracker from "@/components/WaterTracker";
import { type WeekDay } from "@/components/WeekStrip";
import { addDays, isValidDateKey, weekDays } from "@/lib/dates";
import { MEAL_LABELS, MEAL_TYPES, sumEntries, type FoodEntry } from "@/lib/food";
import { loadFoodLogDates } from "@/lib/foodStreak";
import { getGoalStatus } from "@/lib/goalStatus";
import { createClient } from "@/lib/supabase/server";
import { currentUserId } from "@/lib/actionResult";

const fmt = (n: number) => n.toLocaleString("en-US");

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  // No date in the address? Let the phone work out "today" and jump there.
  if (!date || !isValidDateKey(date)) return <GoToToday />;

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");

  // Fetch your goal and the whole week's entries at the same time.
  // (One query covers all 7 days: the week strip needs each day's total.)
  const week = weekDays(date);
  const [{ data: profile }, { data: rows }, foodDates, { data: waterRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("calorie_goal, protein_goal_g, carb_goal_g, fat_goal_g")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("food_entries")
      .select("id, entry_date, meal_type, name, calories, protein_g, carbs_g, fat_g, source")
      .gte("entry_date", week[0])
      .lte("entry_date", week[6])
      .order("created_at", { ascending: true }),
    // Every day you've logged food, for the streak.
    loadFoodLogDates(supabase, addDays(date, -400)),
    // Water logged on this date (each row is one 20 oz bottle).
    supabase.from("water_logs").select("ounces").eq("log_date", date),
  ]);
  const waterTotal = (waterRows ?? []).reduce((sum, row) => sum + Number(row.ounces), 0);

  const goal: number | null = profile?.calorie_goal ?? null;
  const macroGoals = {
    protein: (profile?.protein_goal_g ?? null) as number | null,
    carbs: (profile?.carb_goal_g ?? null) as number | null,
    fat: (profile?.fat_goal_g ?? null) as number | null,
  };
  const weekEntries = (rows ?? []) as FoodEntry[];
  const weekSummary: WeekDay[] = week.map((dateKey) => {
    const dayEntries = weekEntries.filter((e) => e.entry_date === dateKey);
    return {
      dateKey,
      calories: sumEntries(dayEntries).calories,
      hasEntries: dayEntries.length > 0,
    };
  });
  const entries = weekEntries.filter((e) => e.entry_date === date);
  const totals = sumEntries(entries);
  const status = getGoalStatus(totals.calories, goal);

  return (
    <div className="space-y-6">
      <NutritionHeader
        date={date}
        goal={goal}
        week={weekSummary}
        foodDates={foodDates}
        calories={<CaloriesCard calories={totals.calories} goal={goal} status={status} />}
        macros={
          <MacrosCard
            macros={[
              { label: "Protein", grams: totals.protein_g, goal: macroGoals.protein },
              { label: "Carbs", grams: totals.carbs_g, goal: macroGoals.carbs },
              { label: "Fat", grams: totals.fat_g, goal: macroGoals.fat },
            ]}
          />
        }
      />

      <WaterTracker date={date} totalOz={waterTotal} />

      <Link
        href={`/food/add?date=${date}`}
        className="flex min-h-12 items-center justify-center rounded-xl bg-accent text-base font-semibold text-on-accent active:opacity-80"
      >
        + Add food
      </Link>

      {entries.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Nothing logged for this day yet.
        </section>
      ) : (
        MEAL_TYPES.map((meal) => {
          const items = entries.filter((e) => e.meal_type === meal);
          if (items.length === 0) return null;
          const subtotal = items.reduce((sum, e) => sum + e.calories, 0);
          return (
            <section key={meal}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold">{MEAL_LABELS[meal]}</h2>
                <span className="text-sm text-muted">{fmt(subtotal)} kcal</span>
              </div>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
                {items.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={`/food/${entry.id}`}
                      className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 active:bg-border"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium">{entry.name}</p>
                        <p className="text-xs text-muted">
                          P {entry.protein_g}g · C {entry.carbs_g}g · F {entry.fat_g}g
                        </p>
                      </div>
                      <span className="shrink-0 text-base font-semibold">{fmt(entry.calories)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
