import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

// Runs on every page request (via /proxy.ts) to:
//  1. keep the login session fresh (Supabase tokens expire and must be renewed)
//  2. send logged-out visitors to /login, and logged-in ones away from it
//  `requestHeaders` are added to what the page sees (proxy.ts passes the CSP nonce).
export async function updateSession(request: NextRequest, requestHeaders: Record<string, string> = {}) {
  const { url, publishableKey } = getSupabaseEnv();
  const forwarded = () => {
    const headers = new Headers(request.headers);
    Object.entries(requestHeaders).forEach(([key, value]) => headers.set(key, value));
    return { headers };
  };
  let response = NextResponse.next({ request: forwarded() });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: forwarded() });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // Stops CDNs from caching responses that carry login cookies.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims() checks the login token's signature, so it can be trusted.
  // (Don't put code between createServerClient and this call.)
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname.startsWith("/auth");

  if (!isLoggedIn && !isAuthPage) {
    return redirectWithCookies(request, response, "/login");
  }
  if (isLoggedIn && pathname === "/login") {
    return redirectWithCookies(request, response, "/food");
  }
  return response;
}

// A redirect must carry along any refreshed login cookies from `response`.
function redirectWithCookies(request: NextRequest, from: NextResponse, path: string) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  from.headers.forEach((value, key) => {
    if (key.toLowerCase() === "cache-control" || key === "expires" || key === "pragma") {
      redirect.headers.set(key, value);
    }
  });
  return redirect;
}
