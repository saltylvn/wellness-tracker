// What went wrong when Google sign-in sends someone back with an error.

// DEVELOP is capped at this many accounts (enforced in the database by
// supabase/migrations/20261024000000_user_cap.sql; keep the two in step).
export const MAX_USERS = 25;

export type SignInError = "full" | "auth";

/**
 * Supabase hides database errors behind one generic message. While a new account
 * is being created, the expected cause is the 25-account limit refusing it, so
 * that message is shown as "DEVELOP is full". Anything else is a normal sign-in
 * failure, where trying again may help.
 */
export function classifySignInError(errorDescription: string | null | undefined): SignInError {
  return /database error saving new user/i.test(errorDescription ?? "") ? "full" : "auth";
}
