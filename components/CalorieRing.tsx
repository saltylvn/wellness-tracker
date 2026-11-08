import type { GoalStatus } from "@/lib/goalStatus";

const SIZE = 128;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const fmt = (n: number) => n.toLocaleString("en-US");

// The main number on the Nutrition tab: calories eaten today inside a ring that
// fills toward your daily goal. Orange while you're at or under the goal, red once
// you're over it. With no goal set, the ring stays empty.
export default function CalorieRing({
  calories,
  goal,
  status,
}: {
  calories: number;
  goal: number | null;
  status: GoalStatus;
}) {
  const fraction = goal ? Math.min(1, calories / goal) : 0;

  return (
    <div
      role="img"
      aria-label={goal ? `${fmt(calories)} of ${fmt(goal)} calories` : `${fmt(calories)} calories, no goal set`}
      className="relative"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-border" />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE * fraction} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className={status === "over" ? "stroke-danger" : "stroke-accent"}
          style={{ opacity: fraction === 0 ? 0 : 1 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* The one main number: calories eaten, out of your goal. */}
        <span className="text-3xl font-bold leading-none tabular-nums">{fmt(calories)}</span>
        <span className="mt-1 text-xs text-muted tabular-nums">{goal ? `/ ${fmt(goal)} kcal` : "kcal"}</span>
      </div>
    </div>
  );
}
