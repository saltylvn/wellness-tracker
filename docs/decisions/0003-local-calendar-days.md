# 3. Store dates as the user's local calendar day

**Status:** accepted

## Context
Meals, weigh-ins, workouts and streaks are about days as the user lives them. Stored as UTC timestamps, a meal at 11 pm in California lands on the next day, and streaks break at midnight UTC.

## Decision
Every log stores a plain `date` column holding the user's local calendar day, taken from the phone's clock (`useToday()` and `?date=` on tab links). One weigh-in per day is a unique `(user_id, log_date)` constraint. Streak and goal logic in `lib/` works on these date keys and is unit tested.

## Consequences
- Daily totals and streaks match what the user sees, in any time zone.
- The server never guesses a time zone: pages are rendered for the date the phone sends.
- Travelling across time zones can make one day slightly longer or shorter, which is acceptable for a personal tracker.
