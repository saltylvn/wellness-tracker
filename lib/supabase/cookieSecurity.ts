// Locks down the login cookies. Supabase's defaults let page scripts read them (its
// browser library needs that), but this app only ever uses Supabase on the server, so:
//  - httpOnly: scripts in the page can't read the cookie, so even injected code (XSS)
//    couldn't steal a login.
//  - secure: the cookie is only ever sent over https (not on localhost, which is http).
//  - sameSite "lax": other sites can't send it along with their own requests.

type CookieOptions = Record<string, unknown>;

export function secureCookieOptions<T extends CookieOptions>(
  options: T | undefined,
  isProduction: boolean,
): T & { httpOnly: true; secure: boolean; sameSite: "lax" } {
  return { ...(options as T), httpOnly: true, secure: isProduction, sameSite: "lax" };
}
