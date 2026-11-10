"use client";

import { useActionState, useState } from "react";
import { createAccount, signInWithUsername, type LoginState } from "@/app/login/actions";

// text-base = 16px: smaller text makes iPhone Safari zoom in when you tap a field.
const inputClass = "min-h-12 w-full rounded-xl border border-border bg-card px-4 text-base";
const mainButton =
  "flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-4 text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60";
const linkButton = "min-h-11 w-full text-center text-sm font-medium text-accent active:opacity-70";

type Mode = "closed" | "login" | "create";

// The second way in, under "Continue with Google": "Log in with password" opens a username
// and password form. From there, "Create an account" (for people with an invite code) swaps
// in the sign-up form. An invite link (/login?invite=CODE) opens that form with the code filled in.
export default function PasswordLogin({ invite }: { invite: string | null }) {
  const [mode, setMode] = useState<Mode>(invite ? "create" : "closed");

  if (mode === "closed") {
    return (
      <button
        type="button"
        onClick={() => setMode("login")}
        className="flex min-h-12 w-full items-center justify-center rounded-full border border-border bg-card px-4 text-base font-semibold active:opacity-80"
      >
        Log in with password
      </button>
    );
  }
  return mode === "login" ? (
    <LoginForm onCreate={() => setMode("create")} />
  ) : (
    <CreateForm invite={invite} onLogin={() => setMode("login")} />
  );
}

function Message({ state }: { state: LoginState }) {
  if (!state) return null;
  return (
    <p role="alert" className="text-center text-sm text-danger">
      {state.message}
    </p>
  );
}

function LoginForm({ onCreate }: { onCreate: () => void }) {
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
      <button type="button" onClick={onCreate} className={linkButton}>
        Have an invite code? Create an account
      </button>
    </form>
  );
}

function CreateForm({ invite, onLogin }: { invite: string | null; onLogin: () => void }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(createAccount, null);
  return (
    <form action={action} className="space-y-3 rounded-2xl bg-card p-4">
      <div>
        <p className="text-sm font-semibold">Create an account</p>
        <p className="text-xs text-muted">DEVELOP is invite-only: you need the code from your invite text.</p>
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
        className={`${inputClass} uppercase tracking-widest`}
      />
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
      <p className="text-xs text-muted">Usernames: 3-20 letters, numbers, dots or underscores.</p>
      <Message state={state} />
      <button type="submit" disabled={pending} className={mainButton}>
        {pending ? "Creating…" : "Create account"}
      </button>
      <button type="button" onClick={onLogin} className={linkButton}>
        Already have an account? Log in
      </button>
    </form>
  );
}
