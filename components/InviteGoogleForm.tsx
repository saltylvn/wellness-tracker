"use client";

import { useFormStatus } from "react-dom";
import { signInWithGoogleInvite } from "@/app/login/actions";

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

// A new person's first login: the invite code from their text, then Google. Shown when
// they open their invite link, or when "Continue with Google" didn't let them in because
// they're new (DEVELOP is invite-only).
export default function InviteGoogleForm({ invite }: { invite: string | null }) {
  return (
    <form action={signInWithGoogleInvite} className="space-y-3 rounded-2xl bg-card p-4">
      <div>
        <p className="text-sm font-semibold">First time here? Enter your invite code</p>
        <p className="text-xs text-muted">It&apos;s in the text you were sent. Each code works once.</p>
      </div>
      <input
        name="invite"
        aria-label="Invite code"
        placeholder="Invite code"
        defaultValue={invite ?? ""}
        autoComplete="one-time-code"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        required
        className="min-h-12 w-full rounded-xl border border-border bg-card px-4 text-base uppercase tracking-widest"
      />
      <SubmitButton />
      <a href="/login" className="flex min-h-11 items-center justify-center text-sm font-medium text-accent active:opacity-70">
        Already have an account? Log in
      </a>
    </form>
  );
}
