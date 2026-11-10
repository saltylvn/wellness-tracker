// What went wrong when sign-in sends someone back with an error.

// DEVELOP is capped at this many accounts (enforced in the database by
// supabase/migrations/20261024000000_user_cap.sql; keep the two in step).
export const MAX_USERS = 25;

export type SignInError = "invite" | "auth";

/** True for Supabase's one generic message when the database refused a new account. */
export function isNewAccountRefused(message: string | null | undefined): boolean {
  return /database error saving new user/i.test(message ?? "");
}

/**
 * Supabase hides database errors behind one generic message. When Google sign-in
 * tries to create a new account, the database refuses it unless it came with an
 * invite code (it never does from Google), or when DEVELOP is full. Either way the
 * login page says new accounts need an invite. Anything else is a normal sign-in
 * failure, where trying again may help.
 */
export function classifySignInError(errorDescription: string | null | undefined): SignInError {
  return isNewAccountRefused(errorDescription) ? "invite" : "auth";
}
