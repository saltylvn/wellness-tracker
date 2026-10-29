"use client";

import { useState } from "react";
import { CARDIO, CARDIO_KINDS, type CardioKind } from "@/lib/cardio";
import { defaultUnit, PLAN_UNITS, UNIT_LABELS, type CardioPlan, type PlanUnit } from "@/lib/cardioPlan";

// text-base = 16px: smaller text makes iPhone Safari zoom in when you tap a field.
const inputClass = "min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base";

const UNIT_WORDS: Record<PlanUnit, string> = { mi: "miles", km: "kilometers", m: "meters", yd: "yards", min: "minutes" };

// The cardio part of a day's plan (inside the Edit plan form): pick Run, Cycle or Swim (or
// None), then what the target is in (miles, km, meters, yards for swims, or time), and the
// target itself (optional). Sent with the form as cardio_kind / cardio_unit / cardio_target.
export default function CardioPlanFields({ initial }: { initial: CardioPlan | null }) {
  const [kind, setKind] = useState<CardioKind | "">(initial?.kind ?? "");
  const [unit, setUnit] = useState<PlanUnit>(initial?.unit ?? "mi");

  function pickKind(next: CardioKind | "") {
    setKind(next);
    // Keep the unit if the new kind offers it, else that kind's usual one.
    if (next && !PLAN_UNITS[next].includes(unit)) setUnit(defaultUnit(next));
  }

  const segment = (selected: boolean) =>
    `flex min-h-11 flex-col items-center justify-center rounded-lg text-sm font-semibold active:opacity-80 ${
      selected ? "bg-accent text-on-accent" : "text-muted"
    }`;

  return (
    <fieldset className="space-y-3 rounded-2xl bg-card p-4">
      <legend className="sr-only">Cardio plan</legend>
      <p className="text-sm font-medium text-muted">Cardio plan</p>
      <input type="hidden" name="cardio_kind" value={kind} />
      <input type="hidden" name="cardio_unit" value={kind ? unit : ""} />

      <div role="radiogroup" aria-label="Which cardio" className="grid grid-cols-4 gap-1 rounded-xl bg-background p-1">
        {[...CARDIO_KINDS, ""].map((option) => (
          <button
            key={option || "none"}
            type="button"
            role="radio"
            aria-checked={kind === option}
            onClick={() => pickKind(option as CardioKind | "")}
            className={segment(kind === option)}
          >
            {option ? (
              <>
                <span aria-hidden="true">{CARDIO[option as CardioKind].icon}</span>
                {CARDIO[option as CardioKind].label}
              </>
            ) : (
              "None"
            )}
          </button>
        ))}
      </div>

      {kind && (
        <>
          <div
            role="radiogroup"
            aria-label="Target in"
            className="grid gap-1 rounded-xl bg-background p-1"
            style={{ gridTemplateColumns: `repeat(${PLAN_UNITS[kind].length}, minmax(0, 1fr))` }}
          >
            {PLAN_UNITS[kind].map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={unit === option}
                onClick={() => setUnit(option)}
                className={segment(unit === option)}
              >
                {UNIT_LABELS[option]}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="cardio-target" className="mb-1 block text-xs text-muted">
              Target <span className="font-normal">(optional, in {UNIT_WORDS[unit]})</span>
            </label>
            <input
              id="cardio-target"
              name="cardio_target"
              type="text"
              inputMode="decimal"
              defaultValue={initial && initial.kind === kind && initial.unit === unit && initial.target !== null ? String(initial.target) : ""}
              key={`${kind}-${unit}`} // a fresh box when the unit changes
              placeholder={unit === "min" ? "e.g. 30" : unit === "m" || unit === "yd" ? "e.g. 1000" : "e.g. 3"}
              autoComplete="off"
              className={inputClass}
            />
          </div>
        </>
      )}
    </fieldset>
  );
}
