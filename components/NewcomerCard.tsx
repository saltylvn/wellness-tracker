"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createAccount,
  joinWaitlist,
  signInWithGoogleInvite,
  type LoginState,
  type WaitlistState,
} from "@/app/login/actions";

// text-base = 16px: smaller text makes iPhone Safari zoom in when you tap a field.
const inputClass = "min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base";
const mainButton =
  "flex min-h-12 w-full items-center justify-center rounded-lg bg-accent px-4 text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60";
const quietLink = "min-h-11 w-full text-center text-sm font-medium text-muted active:opacity-70";
const switchLink = "min-h-11 w-full border-t border-border pt-2 text-center text-sm font-semibold text-accent active:opacity-70";

export type NewcomerTab = "code" | "waitlist";

// The one card a new person sees (after an invite link, or a login that didn't let them in).
// It opens on "Join the wait-list" (a name and a phone number, so the admin can text an
// invite), with a quiet "Received an invite code?" link below that switches the card to the
// code: the invite code, then Continue with Google, or "Use a username instead", which adds a
// username and password to the same card. An invite link opens straight on the code.
export default function NewcomerCard({
  invite,
  initialTab,
  codeError,
}: {
  invite: string | null; // filled in from an invite link
  initialTab: NewcomerTab;
  codeError: string | null; // e.g. the code Google sign-in tried wasn't valid
}) {
  const [tab, setTab] = useState<NewcomerTab>(initialTab);

  return (
    <section className="space-y-3 rounded-2xl bg-card p-4">
      <p className="text-base font-semibold">{tab === "waitlist" ? "Join the wait-list" : "Use your invite code"}</p>
      {tab === "waitlist" ? <WaitlistTab /> : <CodeTab invite={invite} codeError={codeError} />}
      <button type="button" onClick={() => setTab(tab === "waitlist" ? "code" : "waitlist")} className={switchLink}>
        {tab === "waitlist" ? "Received an invite code?" : "No code yet? Join the wait-list"}
      </button>
    </section>
  );
}

function GoogleButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={mainButton}>
      {pending ? "Opening Google…" : "Continue with Google"}
    </button>
  );
}

function CodeTab({ invite, codeError }: { invite: string | null; codeError: string | null }) {
  const [code, setCode] = useState(invite ?? "");
  const [withUsername, setWithUsername] = useState(false);
  const [state, createAction, creating] = useActionState<LoginState, FormData>(createAccount, null);
  const message = state?.message ?? codeError;

  const codeInput = (
    <input
      name="invite"
      aria-label="Invite code"
      placeholder="Invite code"
      value={code}
      onChange={(e) => setCode(e.target.value)}
      autoComplete="one-time-code"
      autoCapitalize="characters"
      autoCorrect="off"
      spellCheck={false}
      required
      className={`${inputClass} uppercase tracking-widest`}
    />
  );

  if (!withUsername) {
    return (
      <form action={signInWithGoogleInvite} className="space-y-3">
        {codeInput}
        {message && (
          <p role="alert" className="text-center text-sm text-danger">
            {message}
          </p>
        )}
        <GoogleButton />
        <button type="button" onClick={() => setWithUsername(true)} className={quietLink}>
          Use a username instead
        </button>
      </form>
    );
  }
  return (
    <form action={createAction} className="space-y-3">
      {codeInput}
      <input
        name="username"
        aria-label="Pick a username"
        placeholder="Pick a username"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        className={inputClass}
      />
      <input
        name="password"
        type="password"
        aria-label="Password (8+ characters)"
        placeholder="Password (8+ characters)"
        autoComplete="new-password"
        required
        className={inputClass}
      />
      <input
        name="password_again"
        type="password"
        aria-label="Password again"
        placeholder="Password again"
        autoComplete="new-password"
        required
        className={inputClass}
      />
      {message && (
        <p role="alert" className="text-center text-sm text-danger">
          {message}
        </p>
      )}
      <button type="submit" disabled={creating} className={mainButton}>
        {creating ? "Creating…" : "Create account"}
      </button>
      <button type="button" onClick={() => setWithUsername(false)} className={quietLink}>
        Use Google instead
      </button>
    </form>
  );
}

function WaitlistTab() {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, null);

  if (state?.ok) {
    return (
      <p role="status" className="py-2 text-center text-sm font-medium">
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="space-y-3">
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
      <button type="submit" disabled={pending} className={mainButton}>
        {pending ? "Adding you…" : "Join the wait-list"}
      </button>
      <p className="text-center text-xs text-muted">You&apos;ll get a text with an invite when a spot opens.</p>
    </form>
  );
}
