# 1. Enforce rules in the database

**Status:** accepted

## Context
DEVELOP stores personal data (food, weight, workouts) for several people, lets anyone try a shared demo account, and must stay invite-only and within free-tier limits. Rules checked only in route handlers are easy to miss: one new server action without a check is a data leak or a bypass.

## Decision
Put the rules where every path has to pass through them, in Postgres:
- **Row-level security on every table** (25 policies), so a query can only see the signed-in user's rows whatever the app code does.
- **Invite-only sign-up as a `BEFORE INSERT` trigger on `auth.users`**: any new account, from any sign-in method, needs an unused, unexpired code, which the trigger marks used.
- **Limits as functions under an advisory lock**: the 40-a-day AI limit and the 25-account cap are one atomic call, so two requests at once can't both slip past.
- **The admin role in a table with no write policies**, so nobody can grant it to themselves through the API.

## Consequences
- The app code stays simpler: routes call the database and trust its answer.
- Rules are tested in CI against a real Postgres built from every migration (`supabase/tests/`), so a migration that weakens a rule fails the build. These tests caught a real bug: an older check refused every username sign-up (fixed in `20261108000000_allow_username_signups.sql`).
- Changing a rule needs a SQL migration, not just a deploy.
