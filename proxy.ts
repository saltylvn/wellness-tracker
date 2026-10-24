import type { NextRequest } from "next/server";
import { buildCsp, createNonce } from "@/lib/csp";
import { updateSession } from "@/lib/supabase/proxy";

// In Next.js 16 this file is called "proxy" (older tutorials call it "middleware").
export async function proxy(request: NextRequest) {
  // A fresh nonce and Content Security Policy for every page (see lib/csp.ts).
  // Next.js reads the policy from the request to tag its own scripts with the nonce;
  // the layout reads x-nonce for our one inline script.
  const nonce = createNonce();
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

  const response = await updateSession(request, { "x-nonce": nonce, "Content-Security-Policy": csp });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Run on every page, but skip static files and the files the phone needs
  // *before* you're logged in (the home-screen manifest and icons).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
