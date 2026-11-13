"use client";

import { useActionState } from "react";
import { savePriorityLifts, type SaveResult } from "@/app/(tabs)/settings/actions";

// text-base = 16px: smaller text makes iPhone Safari zoom in when you tap a field.
const inputClass = "min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base";

// Settings: pick up to three exercises from your plan to focus on. They show as slim
// pills at the top of every lifting day on the Fitness tab.
const SLOT_LABELS = ["First", "Second", "Third"];
export default function PriorityLiftsForm({ picked, choices }: { picked: string[]; choices: string[] }) {
  const [result, formAction, pending] = useActionState<SaveResult, FormData>(savePriorityLifts, null);

  return (
    // The key redraws the form with your saved picks after Save (see GoalsForm).
    <form key={picked.join("|")} action={formAction} className="space-y-3">
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-muted">
          Priority lifts <span className="font-normal">(optional, up to 3)</span>
        </legend>
        {choices.length === 0 ? (
          <p className="text-sm text-muted">
            Add exercises to a lifting day (Fitness, then Edit plan) to pick from them here.
          </p>
        ) : (
          // One row per pick, full width, so longer exercise names fit at phone width.
          <div className="space-y-2">
            {SLOT_LABELS.map((label, slot) => (
              <div key={slot} className="flex items-center gap-3">
                <label htmlFor={`priority_lift_${slot + 1}`} className="w-14 shrink-0 text-xs text-muted">
                  {label}
                </label>
                <select
                  id={`priority_lift_${slot + 1}`}
                  name={`priority_lift_${slot + 1}`}
                  defaultValue={picked[slot] ?? ""}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {choices.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-muted">
          Shown as slim pills at the top of your lifting days, with your PR (heaviest weight) for each.
        </p>
      </fieldset>

      {choices.length > 0 && (
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 w-full rounded-full bg-accent text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save priority lifts"}
        </button>
      )}

      {result && (
        <p role="status" className={`text-sm ${result.ok ? "text-accent" : "text-danger"}`}>
          {result.message}
        </p>
      )}
    </form>
  );
}
