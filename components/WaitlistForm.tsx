"use client";

import { useActionState, useState } from "react";
import { joinWaitlist, type WaitlistState } from "@/app/login/actions";

// text-base = 16px: smaller text makes iPhone Safari zoom in when you tap a field.
const inputClass = "min-h-12 w-full rounded-xl border border-border bg-card px-4 text-base";

// "No invite code? Join the wait-list": offered only after a login didn't let someone in
// (Google refused a new person, or a password login failed), never on the plain login page.
// It opens a small form for a name and a phone number, so the admin can text an invite.
export default function WaitlistForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, null);

  if (state?.ok) {
    return (
      <p role="status" className="rounded-2xl bg-card p-4 text-center text-sm font-medium">
        {state.message}
      </p>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 w-full text-center text-sm font-medium text-accent active:opacity-70"
      >
        No invite code? Join the wait-list
      </button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-2xl bg-card p-4">
      <div>
        <p className="text-sm font-semibold">Join the wait-list</p>
        <p className="text-xs text-muted">Leave your name and number, and you&apos;ll get a text with an invite.</p>
      </div>
      <input name="name" aria-label="Your name" placeholder="Your name" autoComplete="name" required maxLength={60} className={inputClass} />
      <input
        name="phone"
        type="tel"
        aria-label="Phone number"
        placeholder="Phone number"
        autoComplete="tel"
        inputMode="tel"
        required
        className={inputClass}
      />
      {/* A field people can't see; bots fill it in (see joinWaitlist). */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {state && !state.ok && (
        <p role="alert" className="text-center text-sm text-danger">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-4 text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60"
      >
        {pending ? "Adding you…" : "Join the wait-list"}
      </button>
    </form>
  );
}
