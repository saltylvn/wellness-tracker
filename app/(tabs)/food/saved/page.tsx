import Link from "next/link";
import { redirect } from "next/navigation";
import GoToToday from "@/components/GoToToday";
import { formatFullDate, isValidDateKey } from "@/lib/dates";
import type { SavedFood } from "@/lib/food";
import { createClient } from "@/lib/supabase/server";
import { currentUserId } from "@/lib/actionResult";

export default async function SavedFoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  if (!date || !isValidDateKey(date)) return <GoToToday to="/food/saved" />;

  const supabase = await createClient();
  if (!(await currentUserId(supabase))) redirect("/login");

  const { data } = await supabase
    .from("saved_foods")
    .select("id, name, calories, protein_g, carbs_g, fat_g")
    .order("name", { ascending: true });
  const foods = (data ?? []) as SavedFood[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saved foods</h1>
        <p className="text-sm text-muted">Tap one to log it for {formatFullDate(date)}.</p>
      </div>

      {foods.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Nothing saved yet. When you add a food, switch on{" "}
          <span className="font-medium text-foreground">Save to my foods for next time</span> and
          it will show up here.
        </section>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
          {foods.map((food) => (
            <li key={food.id} className="flex items-stretch">
              <Link
                href={`/food/new?date=${date}&from=${food.id}`}
                className="flex min-h-14 min-w-0 flex-1 items-center justify-between gap-3 px-4 py-2 active:bg-border"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-medium">{food.name}</p>
                  <p className="text-xs text-muted">
                    P {food.protein_g}g · C {food.carbs_g}g · F {food.fat_g}g
                  </p>
                </div>
                <span className="shrink-0 text-base font-semibold">
                  {food.calories.toLocaleString("en-US")}
                </span>
              </Link>
              <Link
                href={`/food/saved/${food.id}?date=${date}`}
                aria-label={`Edit ${food.name}`}
                className="flex w-14 shrink-0 items-center justify-center text-sm font-medium text-accent-ink active:bg-border"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/food/add?date=${date}`}
        className="flex min-h-12 items-center justify-center text-base text-muted active:opacity-70"
      >
        Back
      </Link>
    </div>
  );
}
