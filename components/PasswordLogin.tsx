"use client";

import { useActionState, useState } from "react";
import { signInWithUsername, type LoginState } from "@/app/login/actions";

// text-base = 16px: smaller text makes iPhone Safari zoom in when you tap a field.
const inputClass = "min-h-12 w-full rounded-xl border border-border bg-card px-4 text-base";
const mainButton =
  "flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-4 text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60";

// The second way in, under "Continue with Google": "Log in with password" opens a username
// and password form. After a login that fails, a quiet link offers the new-person card
// (/login?join=1: an invite code, or the wait-list).
export default function PasswordLogin() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-12 w-full items-center justify-center rounded-full border border-border bg-card px-4 text-base font-semibold active:opacity-80"
      >
        Log in with password
      </button>
    );
  }
  return <LoginForm />;
}

function Message({ state }: { state: LoginState }) {
  if (!state) return null;
  return (
    <p role="alert" className="text-center text-sm text-danger">
      {state.message}
    </p>
  );
}

function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signInWithUsername, null);
  return (
    <form action={action} className="space-y-3 rounded-2xl bg-card p-4">
      <p className="text-sm font-semibold">Log in with password</p>
      <input
        name="username"
        aria-label="Username"
        placeholder="Username"
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
        aria-label="Password"
        placeholder="Password"
        autoComplete="current-password"
        required
        className={inputClass}
      />
      <Message state={state} />
      <button type="submit" disabled={pending} className={mainButton}>
        {pending ? "Logging in…" : "Log in"}
      </button>
      {state && (
        <a href="/login?join=1" className="flex min-h-11 items-center justify-center text-sm font-medium text-muted active:opacity-70">
          New here? Get access
        </a>
      )}
    </form>
  );
}
