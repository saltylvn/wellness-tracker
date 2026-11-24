import CoachRate from "@/components/CoachRate";
import { allowedLink, type Saved, type WorkoutsNote } from "@/lib/coach";

// One set of plans from your coach, on the Plan tab: how they'd fit your week, then each plan as a
// card (where it's from, its title as a link to the article, what it is, and why it suits you), then
// 👍/👎 for the set. Everything is plain text; the only links are the ones on the coach's fixed list
// of fitness sites (checked in the database and again here), and anything else shows as plain text.
export default function PlanPicks({ saved, demo }: { saved: Saved<WorkoutsNote>; demo: boolean }) {
  const { plan_summary, picks } = saved.note;
  return (
    <div className="space-y-3">
      <p className="text-base">{plan_summary}</p>
      <ol className="space-y-3">
        {picks.map((pick, i) => (
          <li key={i} className="rounded-2xl bg-card px-4 py-3">
            <p className="eyebrow">{pick.source}</p>
            {allowedLink(pick.url) ? (
              <a
                href={pick.url}
                target="_blank"
                rel="noopener noreferrer"
                // min-h-11 = at least 44px tall, so the title is easy to tap
                className="flex min-h-11 items-center text-base font-semibold text-accent-ink active:opacity-70"
              >
                <span>
                  {pick.title} <span aria-hidden="true">↗</span>
                </span>
              </a>
            ) : (
              <p className="flex min-h-11 items-center text-base font-semibold">{pick.title}</p>
            )}
            <p className="text-sm">{pick.summary}</p>
            {pick.why && <p className="mt-1 text-sm text-muted">{pick.why}</p>}
          </li>
        ))}
      </ol>
      {/* The demo account's plans are samples, so there's nothing to rate. */}
      {!demo && <CoachRate kind="workouts" forDate={saved.forDate} current={saved.feedback} />}
    </div>
  );
}
