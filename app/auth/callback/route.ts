import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifySignInError } from "@/lib/authErrors";

// Google sends you back here with a one-time "code". We trade it for a
// real login session (stored in cookies), then send you to the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Supabase sends an error instead of a code when it couldn't sign you in,
  // for example when DEVELOP is full and a new account was refused.
  if (searchParams.has("error")) {
    const kind = classifySignInError(searchParams.get("error_description"));
    return NextResponse.redirect(`${origin}/login?error=${kind}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/workouts`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
