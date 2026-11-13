import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { secureCookieOptions } from "./cookieSecurity";
import { getSupabaseEnv } from "./env";

// For server code: pages, server actions, route handlers.
// Create a new client per request (never share one between requests).
export async function createClient() {
  // Read cookies first: this tells Next.js the page is per-user and must be
  // built on each request, never pre-built at deploy time. (If the settings
  // check ran first and failed, the deploy build itself would crash.)
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          // Login cookies are hidden from page scripts (see cookieSecurity.ts).
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, secureCookieOptions(options, process.env.NODE_ENV === "production")),
          );
        } catch {
          // Pages can't write cookies. That's fine: proxy.ts refreshes the
          // login session on every request, so it's already taken care of.
        }
      },
    },
  });
}
