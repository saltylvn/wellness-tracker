"use client";

import { useFormStatus } from "react-dom";
import { signInWithGoogle } from "@/app/login/actions";

// The button inside the form: shows "Opening Google…" while the server gets the sign-in link.
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-4 text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60"
    >
      {pending ? "Opening Google…" : "Continue with Google"}
    </button>
  );
}

// Sends you to Google to sign in (the server starts it: see app/login/actions.ts).
export default function GoogleSignInButton() {
  return (
    <form action={signInWithGoogle}>
      <SubmitButton />
    </form>
  );
}
