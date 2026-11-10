"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { createInvite } from "@/app/(tabs)/settings/actions";
import { INVITE_DAYS, inviteSmsHref, inviteStatus, type InviteRow } from "@/lib/accounts";

const mainButton =
  "flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-4 text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60";

// Settings, for the admin only: "Invite someone". Tap "New invite", then "Text it" opens
// Messages with the invite link and code written out; you pick who to send it to. The code
// is never shown on its own, so invites only go out by text. Below: your recent invites
// and whether each one has been used.
export default function InviteCard({ invites }: { invites: InviteRow[] }) {
  const [code, setCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // This site's address for the invite link ("" while the server draws the page; filled in
  // in the browser right after, without a mismatch).
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const now = new Date();

  function newInvite() {
    setMessage(null);
    startTransition(async () => {
      const result = await createInvite();
      if (result.ok) setCode(result.code);
      else setMessage(result.message);
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-muted">Invite someone</p>
        <p className="text-xs text-muted">
          New people need an invite code to make an account. Each code works once, for {INVITE_DAYS} days.
        </p>
      </div>

      {code ? (
        <a href={inviteSmsHref(origin, code)} onClick={() => setCode(null)} className={mainButton}>
          Text it ›
        </a>
      ) : (
        <button type="button" onClick={newInvite} disabled={pending} className={mainButton}>
          {pending ? "Making an invite…" : "New invite"}
        </button>
      )}
      {message && (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}

      {invites.length > 0 && (
        <ul className="divide-y divide-border text-sm">
          {invites.map((invite) => {
            const status = inviteStatus(invite, now);
            const sent = shortDate(invite.created_at);
            return (
              <li key={invite.code} className="flex min-h-11 items-center justify-between gap-3">
                <span className="text-muted">Sent {sent}</span>
                {status.kind === "used" ? (
                  <span className="font-medium">✓ Joined{status.by ? ` as ${status.by}` : ""}</span>
                ) : status.kind === "expired" ? (
                  <span className="text-muted">Expired</span>
                ) : (
                  <a
                    href={inviteSmsHref(origin, invite.code)}
                    className="flex min-h-11 items-center font-medium text-accent active:opacity-70"
                  >
                    Waiting · Text again
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function noSubscribe() {
  return () => {};
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Nov 10" from a saved timestamp (the same on the server and the phone). */
function shortDate(timestamp: string): string {
  const [, month, day] = timestamp.slice(0, 10).split("-").map(Number);
  return `${MONTHS[month - 1] ?? ""} ${day}`;
}
