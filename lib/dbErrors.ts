// Tells "the database is missing something the app expects" apart from other save
// failures. This happens when a new feature needs a SQL step that hasn't been run yet.

export const DATABASE_BEHIND_MESSAGE =
  "This needs a one-time database update. Run the latest SQL in Supabase, then try again.";

// Postgres / PostgREST codes for a missing column or table:
//   42703 = undefined column, 42P01 = undefined table,
//   PGRST204 = column not found, PGRST205 = table not found.
const MISSING_SCHEMA_CODES = ["42703", "42P01", "PGRST204", "PGRST205"];

export function isMissingSchemaError(error: { code?: string | null } | null | undefined): boolean {
  return Boolean(error?.code && MISSING_SCHEMA_CODES.includes(error.code));
}

/**
 * True when the database refused a value its rules (CHECK constraints) don't allow yet.
 * 23514 = check violation. For example, saving a lifting-and-cardio day before the SQL
 * step that allows it has been run.
 */
export function isCheckViolation(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "23514";
}
