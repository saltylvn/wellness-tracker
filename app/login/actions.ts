"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { demoConfigured, demoToday } from "@/lib/demo";
import { isNewAccountRefused } from "@/lib/authErrors";
import { isMissingSchemaError, DATABASE_BEHIND_MESSAGE } from "@/lib/dbErrors";
import { normalizeInviteCode, parsePassword, parseUsername, usernameToEmail } from "@/lib/accounts";

/** What the password forms show after a try that didn't work (null before any try). */
export type LoginState = { message: string } | null;

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
  redirect(`/workouts?date=${today}`);
}

// "Log in with password": your username and password. Supabase checks the password
// (it also slows down repeated wrong guesses); the username is turned into the sign-in
// address only this app uses (see lib/accounts.ts).
export async function signInWithUsername(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const username = parseUsername(formData.get("username"));
  const password = formData.get("password");
  if (!username.ok || typeof password !== "string" || password === "") {
    return { message: "Enter your username and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username.value),
    password,
  });
  // The same message for a wrong username or a wrong password, so nobody can find out
  // which usernames exist by guessing.
  if (error) return { message: "That username and password don't match. Please try again." };
  redirect("/workouts");
}

// "Create account": needs an invite code (texted by the admin), a username and a password.
// The database checks the code again when the account is made (and marks it used), so
// this check is only for a clear message; it can't be skipped to get in without one.
export async function createAccount(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const code = normalizeInviteCode(formData.get("invite"));
  if (!code) return { message: "Enter the 8-character invite code from your text." };
  const username = parseUsername(formData.get("username"));
  if (!username.ok) return { message: username.message };
  const password = parsePassword(formData.get("password"));
  if (!password.ok) return { message: password.message };
  if (formData.get("password_again") !== password.value) {
    return { message: "The two passwords don't match." };
  }

  const supabase = await createClient();
  const { data: codeOk, error: codeError } = await supabase.rpc("invite_code_ok", { p_code: code });
  if (codeError) {
    return {
      message: isMissingSchemaError(codeError) ? DATABASE_BEHIND_MESSAGE : "Couldn't check the invite code. Please try again.",
    };
  }
  if (!codeOk) return { message: "That invite code isn't valid, was already used, or has expired." };

  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(username.value),
    password: password.value,
    options: { data: { invite_code: code } },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      return { message: "That username is taken. Please pick another." };
    }
    if (isNewAccountRefused(error.message)) {
      // The code was fine a moment ago, so the account limit is the likely cause.
      return { message: "DEVELOP is full right now, so new accounts can't be made. Sorry!" };
    }
    if (/password/i.test(error.message)) return { message: error.message };
    return { message: "Couldn't create the account. Please try again." };
  }
  // With "Confirm email" turned on in Supabase, no session comes back (it would wait for
  // an email nobody can receive). It must be off for username accounts.
  if (!data.session) {
    return { message: "Your account was made but can't sign in yet. Ask the admin to turn off \"Confirm email\" in Supabase." };
  }
  redirect("/workouts");
}
