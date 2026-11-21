import Link from "next/link";
import { redirect } from "next/navigation";
import GoToToday from "@/components/GoToToday";
import CoachButton from "@/components/CoachButton";
import SettingsGear from "@/components/SettingsGear";
import TodayPill from "@/components/TodayPill";
import WeighInCard from "@/components/WeighInCard";
import WeightChart from "@/components/WeightChart";
import WeightProgress from "@/components/WeightProgress";
import WeightStreakBadge from "@/components/WeightStreakBadge";
import WeightWeekStrip from "@/components/WeightWeekStrip";
import { currentUserId } from "@/lib/actionResult";
import { DATABASE_BEHIND_MESSAGE } from "@/lib/dbErrors";
import { isValidDateKey } from "@/lib/dates";
import { chosenPace, goalNumbers, planSummary, recentTrend, weighInsSinceStart } from "@/lib/weightPlan";
import { loadWeightData } from "@/lib/weightQueries";
import { createClient } from "@/lib/supabase/server";

// The Weight tab: today's weigh-in wheels first, a row that opens Nutrition (the food log), then
// one card with your progress toward your target, a chart, and your weekly pace from Settings
// (weeks to go, goal date).
export default async function WeightPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  // No date in the address? Let the phone work out "today" and jump there.
  if (!date || !isValidDateKey(date)) return <GoToToday to="/weight" />;

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");

  const data = await loadWeightData(supabase, userId, date);
  // Your goal's weigh-ins: from your starting date (Settings) on, else all of them.
  const sinceStart = weighInsSinceStart(data.logs, data.startDate, data.startSetting);
  const numbers = goalNumbers({
    ...data,
    first: data.startDate ? (sinceStart[0] ?? null) : data.first,
  });
  const latest = data.logs.at(-1) ?? null;
  const trend = recentTrend(data.logs);

  const pace = chosenPace(data.pace); // your weekly pace from Settings (2 lb if none)
  const plan = numbers && planSummary({ ...numbers, pace, today: date });

  const chart =
    sinceStart.length > 0 ? (
      <WeightChart logs={sinceStart} target={data.targetSetting} today={date} />
    ) : null;

  return (
    <div className="space-y-6">
      {/* Title, streak and calendar spaced exactly like the Fitness header (and Nutrition's), so
          they sit in the same places on each. */}
      <header className="space-y-4">
        {/* Three columns: title on the left, the coach's 🎯 centered, Today and ⚙️ on the right. */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <h1 className="text-2xl font-bold">Weight</h1>
          <CoachButton />
          <div className="flex items-center gap-1 justify-self-end">
            <TodayPill dateKey={date} href="/weight" />
            <SettingsGear />
          </div>
        </div>

        {/* Weeks in a row you lost at least 1 lb, from your weigh-ins. */}
        <WeightStreakBadge logs={data.logs} />

        {/* This week, with an orange ring on each day you weighed in. Tap a day to weigh in for it. */}
        <WeightWeekStrip date={date} logged={data.weekLogged} />
      </header>

      {/* Today's weigh-in first, above your progress and the graph. No key={date} here: on the
          Fitness page that left stale copies on screen. */}
      <WeighInCard date={date} latest={latest} fallback={data.startSetting ?? data.targetSetting} />

      {/* Nutrition lives here now (the third tab is Plan): one row that opens the food log for this day. */}
      <Link
        href={`/food?date=${date}`}
        className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-card px-4 active:opacity-70"
      >
        <span className="text-base font-semibold">
          <span aria-hidden="true">🍎</span> Nutrition
        </span>
        <span className="flex items-center gap-1 text-sm text-muted">
          Food, water and macros
          <span aria-hidden="true" className="text-lg">
            ›
          </span>
        </span>
      </Link>

      {data.databaseBehind && (
        <p role="alert" className="rounded-2xl border border-danger p-4 text-sm text-danger">
          {DATABASE_BEHIND_MESSAGE}
        </p>
      )}

      {/* Your progress and the chart, together in one card at the top. */}
      {numbers && plan ? (
        <WeightProgress
          {...numbers}
          plan={plan}
          trend={trend}
          chart={chart}
        />
      ) : (
        <section className="space-y-3 rounded-2xl bg-card p-4">
          <div className="space-y-2 text-center">
            <p className="text-base font-semibold">
              <span aria-hidden="true">🎯</span> Set your goal
            </p>
            <p className="text-sm text-muted">
              {data.targetSetting === null
                ? "Add a target weight in Settings to see your progress, weekly pace and weeks to go."
                : "Log your first weigh-in below to see your progress."}
            </p>
            {data.targetSetting === null && (
              <Link href="/settings" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent active:opacity-70">
                Open Settings
              </Link>
            )}
          </div>
          {chart}
        </section>
      )}

    </div>
  );
}
