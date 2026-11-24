"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLocalDateKey } from "@/lib/dates";

// Opening a page with no date in the address lands here. The server can't know
// what day it is on YOUR phone, so the browser works it out and jumps to
// `<page>?date=today`. `to` is the page to come back to (default: the Nutrition page).
export default function GoToToday({ to = "/food" }: { to?: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`${to}?date=${getLocalDateKey()}`);
  }, [router, to]);

  return <p className="pt-12 text-center text-sm text-muted">Loading today…</p>;
}
