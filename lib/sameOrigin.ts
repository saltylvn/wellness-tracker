// Was this request sent by this app's own pages? Browsers add an "Origin" header to every
// POST saying which site sent it, and a script on another site can't change it. Next.js
// already checks this for server actions; route handlers (like the AI estimate) use this.
// Login cookies are also "SameSite", so this is a second lock on the same door.

/**
 * True when the request's Origin matches the address it was sent to (or there is no
 * Origin header at all, which browsers only leave out for same-site, non-script requests
 * and tools like curl, which carry no login cookie of their own to abuse).
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (origin === null) return true;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false; // "null" (a sandboxed page) or anything that isn't an address
  }
}
