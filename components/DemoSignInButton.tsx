"use client";

import { useFormStatus } from "react-dom";
import { signInAsDemo } from "@/app/login/actions";
import { useToday } from "@/components/useToday";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-12 w-full items-center justify-center rounded-xl border border-border px-4 text-base font-medium active:opacity-80 disabled:opacity-60"
    >
      {pending ? "Opening the demo…" : "Try the demo"}
    </button>
  );
}

// Signs in to the shared demo account (see signInAsDemo). Sends the phone's date so
// the sample data lines up with the visitor's "today".
export default function DemoSignInButton() {
  const today = useToday();
  return (
    <form action={signInAsDemo} className="space-y-2">
      <input type="hidden" name="today" value={today ?? ""} />
      <SubmitButton />
      <p className="text-center text-xs text-muted">Sample data, no sign-up. Anyone can use it.</p>
    </form>
  );
}
