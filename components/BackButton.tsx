"use client";

import { useRouter } from "next/navigation";

// "‹ Back" at the top of an editing page (Settings, Edit plan, a day's editor): goes back to
// the page you came from, or to `fallback` when there's nothing to go back to (the page was
// opened directly, e.g. from a bookmark).
export default function BackButton({ fallback }: { fallback: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="-ml-1 flex min-h-11 items-center gap-1 px-1 text-base font-medium text-accent active:opacity-70"
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        ‹
      </span>
      Back
    </button>
  );
}
