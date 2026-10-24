// The Content Security Policy: tells the browser which scripts, styles, images and
// connections this app may use, so injected code (XSS) is blocked. Built per request
// with a fresh random "nonce": only scripts carrying it may run (Next.js adds it to its
// own scripts automatically; see node_modules/next/dist/docs/01-app/02-guides/
// content-security-policy.md). Sent by proxy.ts.

export function buildCsp(options: { nonce: string; isDev: boolean; supabaseUrl?: string }): string {
  const { nonce, isDev } = options;
  let supabaseOrigin = "";
  try {
    if (options.supabaseUrl) supabaseOrigin = new URL(options.supabaseUrl).origin;
  } catch {
    // a bad URL just leaves it out
  }

  const directives = [
    "default-src 'self'",
    // 'strict-dynamic': scripts loaded by a trusted (nonce) script are trusted too.
    // Development needs 'unsafe-eval' for React's debugging; production doesn't.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes (progress bars, scroll wheels) need 'unsafe-inline'.
    // Styles can't run code, so this is the usual, accepted trade-off.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:", // blob: = the photo preview before an AI estimate
    "font-src 'self'",
    "connect-src 'self'", // the browser only talks to this app; Supabase and Gemini are server-side
    "object-src 'none'",
    "base-uri 'self'",
    // Google sign-in posts a form here, then redirects to Supabase and on to Google.
    `form-action 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""} https://accounts.google.com`,
    "frame-ancestors 'none'", // nobody can embed the app in their page
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

/** A fresh, unguessable nonce for one request. */
export function createNonce(): string {
  return btoa(crypto.randomUUID());
}
