import Link from "next/link";
import { TOP_CARD } from "@/components/cardStyles";

const fmt = (n: number) => n.toLocaleString("en-US");

type Macro = { label: string; grams: number; goal: number | null };

// The day's macros, left to right: Protein, Carbs, Fat. Each shows "eaten / goal g" and a
// thin bar filling toward the goal (with no goal set, just the grams). The bar stays orange
// even past the goal: going over on protein isn't a problem, so it isn't flagged red.
// Same size as the "Your week" card on Fitness (TOP_CARD), so the tabs line up.
export default function MacrosCard({ macros }: { macros: Macro[] }) {
  const hasGoals = macros.some((m) => m.goal !== null);

  return (
    <section aria-label="Macros" className={`${TOP_CARD} flex flex-col justify-center gap-2`}>
      <div className="grid grid-cols-3 gap-3 px-1">
        {macros.map(({ label, grams, goal }) => (
          <div key={label} className="min-w-0 space-y-1">
            <p className="text-xs font-semibold text-muted">{label}</p>
            <p className="truncate tabular-nums">
              <span className="text-lg font-bold">{fmt(grams)}</span>
              <span className="text-xs text-muted">{goal ? ` / ${fmt(goal)} g` : " g"}</span>
            </p>
            <div
              role={goal ? "progressbar" : undefined}
              aria-label={goal ? `${label} toward daily goal` : undefined}
              aria-valuemin={goal ? 0 : undefined}
              aria-valuemax={goal ?? undefined}
              aria-valuenow={goal ? grams : undefined}
              className="h-1.5 overflow-hidden rounded-full bg-border"
            >
              {goal ? (
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (grams / goal) * 100)}%` }} />
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {!hasGoals && (
        <p className="px-1 text-xs text-muted">
          <Link href="/settings" className="font-medium text-accent underline">
            Set macro goals
          </Link>{" "}
          to see progress for each.
        </p>
      )}
    </section>
  );
}
