"use client";

import { useEffect } from "react";
import ErrorScreen from "@/components/ErrorScreen";

// Shown in place of a page that hit an unexpected error (for example, the database didn't
// answer). "Try again" loads the page again; everything else on the phone keeps working.
// The error itself stays on the server: the browser only gets an id to match the logs.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const reference = error instanceof Error && "digest" in error ? String(error.digest) : undefined;

  return (
    <ErrorScreen
      title="Something went wrong"
      message="This page couldn't load just now. Your data is safe. Please try again."
      reference={reference}
      action={
        <button
          type="button"
          onClick={() => retry()}
          className="flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-4 text-base font-semibold text-on-accent active:opacity-80"
        >
          Try again
        </button>
      }
    />
  );
}
