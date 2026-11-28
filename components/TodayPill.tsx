"use client";

import Link from "next/link";
import { useToday } from "@/components/useToday";

// Says "Today" on today's page, or offers a way back when you're on another day.
// It needs the phone's clock, so it renders nothing on the server.
export default function TodayPill({ dateKey, href = "/food" }: { dateKey: string; href?: string }) {
  const today = useToday();

  if (!today) return <span className="block h-11" />; // keeps the layout steady
  if (today === dateKey) {
    return <span className="flex h-11 items-center text-sm font-medium text-today">Today</span>;
  }
  return (
    <Link
      href={`${href}?date=${today}`} // straight to today, without an extra load to find the date
      className="flex h-11 items-center text-sm font-medium text-today active:opacity-70"
    >
      Jump to today
    </Link>
  );
}
