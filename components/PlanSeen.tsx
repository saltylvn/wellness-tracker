"use client";

import { useEffect } from "react";
import { PLANS_SEEN_KEY, writeStore } from "@/components/planSeen";

// Draws nothing: it just remembers, on this phone, the date of the newest plans the Plan tab has
// shown you, which clears the "new plans" dot on the tab bar.
export default function PlanSeen({ latest }: { latest: string }) {
  useEffect(() => {
    writeStore(PLANS_SEEN_KEY, latest);
  }, [latest]);
  return null;
}
