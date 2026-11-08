import Link from "next/link";
import CalorieRing from "@/components/CalorieRing";
import type { GoalStatus } from "@/lib/goalStatus";

const fmt = (n: number) => n.toLocaleString("en-US");

// Calories for the day: the ring with the one main number inside ("1,450 / 2,000 kcal";
// orange at or under your goal, red over), and beside it a plain line saying how much is
// left, or how far over you are. (Macros have their own card up top.)
export default function CaloriesCard({
  calories,
  goal,
  status,
}: {
  calories: number;
  goal: number | null;
  status: GoalStatus;
}) {
  return (
    <section aria-label="Calories" className="flex items-center gap-5 rounded-2xl bg-card p-4">
      <CalorieRing calories={calories} goal={goal} status={status} />
      <div className="min-w-0">
        {goal ? (
          calories > goal ? (
            <p className="text-base font-semibold tabular-nums text-danger">{fmt(calories - goal)} kcal over</p>
          ) : (
            <p className="text-base font-medium tabular-nums">
              {fmt(goal - calories)} <span className="text-muted">kcal left</span>
            </p>
          )
        ) : (
          <Link href="/settings" className="text-sm font-medium text-accent underline">
            Set a calorie goal
          </Link>
        )}
      </div>
    </section>
  );
}
