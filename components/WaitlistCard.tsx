"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { inviteFromWaitlist, removeFromWaitlist } from "@/app/(tabs)/settings/actions";
import { inviteSmsHref } from "@/lib/accounts";
import { formatPhone, type WaitlistEntry } from "@/lib/waitlist";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (ts: string) => {
  const [, m, d] = ts.slice(0, 10).split("-").map(Number);
  return `${MONTHS[m - 1] ?? ""} ${d}`;
};
const noSubscribe = () => () => {};

// Settings, for the admin only: the "Wait-list", people who asked for access after a login
// didn't let them in. Each shows their name, number and when they asked. "Invite" makes a
// code and marks them invited; then "Text invite" opens Messages addressed to them with the
// link and code written out. "Remove" takes them off without inviting.
export default function WaitlistCard({ entries, error }: { entries: WaitlistEntry[]; error: string | null }) {
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const [ready, setReady] = useState<Record<string, { code: string; phone: string }>>({});
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const shown = entries.filter((e) => !gone.has(e.id));

  function makeInvite(id: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await inviteFromWaitlist(id);
      if (result.ok) setReady((r) => ({ ...r, [id]: { code: result.code, phone: result.phone } }));
      else setMessage(result.message);
    });
  }

  function remove(id: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await removeFromWaitlist(id);
      if (result.ok) setGone((g) => new Set(g).add(id));
      else setMessage(result.message);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-muted">Wait-list</p>
        {!error && <p className="text-xs text-muted tabular-nums">{shown.length} waiting</p>}
      </div>
      {error ? (
        <p className="text-sm text-muted">{error}</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">Nobody is waiting. People who try to log in without an invite can join.</p>
      ) : (
        <ul className="divide-y divide-border">
          {shown.map((entry) => {
            const invite = ready[entry.id];
            return (
              <li key={entry.id} className="flex min-h-14 items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{entry.name}</p>
                  <p className="text-xs text-muted tabular-nums">
                    {formatPhone(entry.phone)} · asked {shortDate(entry.created_at)}
                  </p>
                </div>
                {invite ? (
                  <a
                    href={inviteSmsHref(origin, invite.code, invite.phone)}
                    onClick={() => setGone((g) => new Set(g).add(entry.id))}
                    className="flex min-h-11 shrink-0 items-center rounded-full bg-accent px-4 text-sm font-semibold text-on-accent active:opacity-80"
                  >
                    Text invite ›
                  </a>
                ) : (
                  <span className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => makeInvite(entry.id)}
                      disabled={pending}
                      className="min-h-11 px-2 text-sm font-semibold text-accent active:opacity-70 disabled:opacity-60"
                    >
                      Invite
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(entry.id)}
                      disabled={pending}
                      className="min-h-11 pl-2 text-sm font-medium text-muted active:opacity-70 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {message && (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
