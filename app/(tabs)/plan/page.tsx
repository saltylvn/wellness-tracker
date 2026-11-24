import { redirect } from "next/navigation";
import CoachButton from "@/components/CoachButton";
import GoToToday from "@/components/GoToToday";
import PlanPicks from "@/components/PlanPicks";
import PlanSeen from "@/components/PlanSeen";
import SettingsGear from "@/components/SettingsGear";
import { demoPlans } from "@/lib/coach";
import { formatShortDate, isValidDateKey } from "@/lib/dates";
import { isDemoEmail } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { loadCoachPlans } from "@/lib/workouts/queries";

// The Plan tab: the workout plans your coach found for you to consider. The newest set is open at
// the top; the earlier ones are folded up underneath (tap one to open it). The coach (the Raspberry
// Pi agent) looks for new ones on Wednesdays and Sundays; the app only reads and shows them.
export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  // No date in the address? Let the phone work out "today" and jump there.
  if (!date || !isValidDateKey(date)) return <GoToToday to="/plan" />;

  const supabase = await createClient();
  // getClaims reads the signed login token (no network trip): who you are, and whether it's the demo.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect("/login");
  // The demo account never gets real plans from the coach, so it shows fixed samples.
  const demo = isDemoEmail(data.claims.email, process.env.DEMO_EMAIL);
  const plans = demo ? demoPlans(date) : await loadCoachPlans(supabase, date);
  const [latest, ...earlier] = plans;

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        {/* The same three columns as the other tabs: title, the Coach button centered, ⚙️ on the right. */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <h1 className="text-2xl font-bold">Plan</h1>
          <CoachButton />
          <div className="justify-self-end">
            <SettingsGear />
          </div>
        </div>
        <p className="text-sm text-muted">
          Workout plans your coach found for you to consider. New ones arrive on Wednesdays and Sundays.
        </p>
      </header>

      {!latest ? (
        <section className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          No plans yet. When your coach finds some, they&apos;ll show up here.
        </section>
      ) : (
        <>
          {/* Remember, on this phone, that you've seen these (clears the dot on the tab bar). */}
          {!demo && <PlanSeen latest={latest.forDate} />}

          <section aria-labelledby="latest-plans" className="space-y-3">
            <div className="space-y-1">
              <p className="eyebrow">
                {demo ? "sample" : "latest"} · {formatShortDate(latest.forDate)}
              </p>
              <h2 id="latest-plans" className="text-lg font-semibold">
                {latest.note.headline}
              </h2>
            </div>
            <PlanPicks saved={latest} demo={demo} />
          </section>

          {earlier.length > 0 && (
            <section aria-labelledby="earlier-plans" className="space-y-2">
              <h2 id="earlier-plans" className="px-1 text-sm font-semibold">
                Earlier
              </h2>
              {earlier.map((plan) => (
                // <details> is the browser's own fold-up box: tap the top line to open or close it.
                <details key={plan.forDate} className="group rounded-2xl border border-border">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 active:opacity-70 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="eyebrow block">{formatShortDate(plan.forDate)}</span>
                      <span className="block truncate text-base font-medium">{plan.note.headline}</span>
                    </span>
                    <span aria-hidden="true" className="text-lg text-muted transition-transform group-open:rotate-90">
                      ›
                    </span>
                  </summary>
                  <div className="px-3 pb-3">
                    <PlanPicks saved={plan} demo={demo} />
                  </div>
                </details>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
