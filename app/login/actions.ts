"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { demoConfigured, demoToday } from "@/lib/demo";

// Starts "Continue with Google" on the server. Supabase gives back Google's sign-in
// address (and saves a one-time check code in a cookie); we send you there. After you
// approve, Google sends you back to /auth/callback, which finishes the login.
// Doing this on the server means the login page doesn't download the Supabase library.
export async function signInWithGoogle() {
  // This app's own address (Next.js only runs server actions sent from this same site).
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=auth");
  redirect(data.url);
}

// "Try the demo": signs in to the shared demo account on the server (its password is
// only in server environment variables, never sent to the browser), refreshes its
// sample data if it's stale, and opens the app on the visitor's own "today".
export async function signInAsDemo(formData: FormData) {
  const env = process.env;
  if (!demoConfigured(env)) redirect("/login?error=demo");

  const today = demoToday(formData.get("today"), new Date().toISOString().slice(0, 10));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: env.DEMO_EMAIL!.trim(),
    password: env.DEMO_PASSWORD!,
  });
  if (error) redirect("/login?error=demo");

  // Rebuilds the sample data relative to today (at most once an hour; see the
  // recruiter_demo migration). If it fails, the demo still opens with what's there.
  await supabase.rpc("reset_demo_data", { p_today: today });
  redirect(`/food?date=${today}`);
}
