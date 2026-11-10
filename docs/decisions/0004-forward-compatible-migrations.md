# 4. Ship schema changes the app survives either side of

**Status:** accepted

## Context
Code deploys automatically on merge, but each SQL migration is run by hand in Supabase. For a few minutes (or longer) the live app can be ahead of its database.

## Decision
Every migration is written so the app works both before and after it runs:
- New columns are read with `select("*")` and treated as optional, so pages load before the column exists.
- Saves that would fail on a missing column or check fall back or show a clear "run the latest SQL" message (`isMissingSchemaError`, `DATABASE_BEHIND_MESSAGE`).
- Migrations use `if not exists` and `drop … if exists`, so running one twice is safe, and end with `notify pgrst, 'reload schema'`.

## Consequences
- Merging never takes the app down, even if the SQL step comes later.
- A little extra code for the transition period, which can be removed once every environment has the column.
