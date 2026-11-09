import Link from "next/link";
import WorkoutWeekStrip from "@/components/WorkoutWeekStrip";
import { addDays, weekDays } from "@/lib/dates";

const arrowClass =
  "flex h-11 w-11 items-center justify-center rounded-full text-2xl text-muted active:bg-card";

// A small week calendar for the Weight tab, like the Fitness one: Monday to Sunday with an
// orange ring on every day you weighed in. Tap a day to weigh in for it; the arrows move a week.
export default function WeightWeekStrip({ date, logged }: { date: string; logged: string[] }) {
  const done = new Set(logged);
  return (
    <div className="flex items-center gap-1">
      <Link href={`/weight?date=${addDays(date, -7)}`} aria-label="Previous week" className={arrowClass}>
        ‹
      </Link>
      <div className="min-w-0 flex-1">
        <WorkoutWeekStrip
          selected={date}
          basePath="/weight"
          doneLabel="weighed in"
          days={weekDays(date).map((dateKey) => ({ dateKey, kind: null, done: done.has(dateKey) }))}
        />
      </div>
      <Link href={`/weight?date=${addDays(date, 7)}`} aria-label="Next week" className={arrowClass}>
        ›
      </Link>
    </div>
  );
}
