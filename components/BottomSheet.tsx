"use client";

import { useEffect, useRef, type ReactNode } from "react";

// A panel that slides up from the bottom of the screen over a dimmed backdrop.
// Tapping the backdrop or pressing Escape closes it, and the page behind it
// can't scroll while it's open. Used for logging sets, tanning time and the gym barcode.
export default function BottomSheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string; // read aloud by screen readers
  children: ReactNode;
}) {
  // Keep the latest onClose without re-running the effect below on every render.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-30 flex items-end bg-black/50"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="mx-auto max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-background p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {children}
      </div>
    </div>
  );
}
