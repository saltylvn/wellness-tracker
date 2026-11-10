"use client";

import { useActionState } from "react";
import { savePassword, type SaveResult } from "@/app/(tabs)/settings/actions";

// text-base = 16px: smaller text makes iPhone Safari zoom in when you tap a field.
const inputClass = "min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base";

// Settings, "Password": set (the first time) or change the password you log in with.
export default function PasswordForm({ username }: { username: string }) {
  const [result, formAction, pending] = useActionState<SaveResult, FormData>(savePassword, null);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <p className="text-sm font-medium text-muted">Password</p>
        <p className="text-xs text-muted">Set or change the password you use with your username to log in.</p>
      </div>
      {/* Lets the phone's password manager save the username with the password. */}
      <input type="text" name="username" value={username} autoComplete="username" readOnly hidden />
      <input
        name="password"
        type="password"
        aria-label="New password (8+ characters)"
        placeholder="New password (8+ characters)"
        autoComplete="new-password"
        required
        className={inputClass}
      />
      <input
        name="password_again"
        type="password"
        aria-label="New password again"
        placeholder="New password again"
        autoComplete="new-password"
        required
        className={inputClass}
      />
      {result && (
        <p role="status" className={`text-sm ${result.ok ? "text-muted" : "text-danger"}`}>
          {result.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-full bg-accent text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
