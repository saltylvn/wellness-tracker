import { addDays, weekDays } from "./dates";

// The weekly weight streak on the Weight tab. A week (Monday to Sunday) counts when your
// last weigh-in that week is at least 1 lb lower than your last weigh-in the week before.
// The streak is how many weeks in a row counted. Rules, like the other streaks:
//  - This week doesn't break the streak until it's over: if it hasn't counted yet, the
//    streak still shows what you had through last week.
//  - A week with no weigh-in ends the streak (there's nothing to compare).
// All dates are "YYYY-MM-DD" keys in your local calendar.

export const WEEKLY_LOSS_LB = 1; // the least you need to lose in a week for it to count

export type WeighInPoint = { date: string; pounds: number };

export type WeightStreak = {
  current: number; // weeks in a row, through this week (or last week, if this one hasn't counted yet)
  longest: number; // the best run in the weigh-ins we looked at
  thisWeekCounts: boolean;
  keepGoingAt: number | null; // weigh in at this or less this week to count it (null if unknown)
};

const weekStart = (date: string) => weekDays(date)[0];

export function computeWeightStreak(logs: WeighInPoint[], today: string): WeightStreak {
  // Each week's last weigh-in (by date), keyed by the week's Monday.
  const lastByWeek = new Map<string, WeighInPoint>();
  for (const log of logs) {
    if (log.date > today) continue;
    const week = weekStart(log.date);
    const current = lastByWeek.get(week);
    if (!current || log.date >= current.date) lastByWeek.set(week, log);
  }

  const counts = (week: string) => {
    const now = lastByWeek.get(week);
    const before = lastByWeek.get(addDays(week, -7));
    return Boolean(now && before && before.pounds - now.pounds >= WEEKLY_LOSS_LB - 1e-9);
  };

  const thisWeek = weekStart(today);
  const thisWeekCounts = counts(thisWeek);

  // Current streak: this week if it counted, then back week by week.
  let current = thisWeekCounts ? 1 : 0;
  for (let week = addDays(thisWeek, -7); counts(week); week = addDays(week, -7)) current++;

  // Longest streak: walk forward from the first week with a weigh-in.
  let longest = 0;
  const weeks = [...lastByWeek.keys()].sort();
  if (weeks.length > 0) {
    let run = 0;
    for (let week = weeks[0]; week <= thisWeek; week = addDays(week, 7)) {
      if (counts(week)) {
        run++;
        longest = Math.max(longest, run);
      } else if (week !== thisWeek) {
        run = 0;
      }
    }
  }

  const lastWeek = lastByWeek.get(addDays(thisWeek, -7));
  const keepGoingAt =
    !thisWeekCounts && lastWeek ? Math.round((lastWeek.pounds - WEEKLY_LOSS_LB) * 10) / 10 : null;

  return { current, longest, thisWeekCounts, keepGoingAt };
}
