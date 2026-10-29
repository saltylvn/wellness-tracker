"use client";

import { useState } from "react";
import { CARDIO, CARDIO_KINDS, type CardioKind } from "@/lib/cardio";
import type { CardioPlan } from "@/lib/cardioPlan";

// text-base = 16px: smaller text makes iPhone Safari zoom in when you tap a field.
const inputClass = "min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base";

// The cardio part of a day's plan (inside the Edit plan form): pick Run, Cycle or Swim (or
// None), and an optional target distance. Sent with the form as cardio_kind / cardio_distance.
export default function CardioPlanFields({ initial }: { initial: CardioPlan | null }) {
  const [kind, setKind] = useState<CardioKind | "">(initial?.kind ?? "");
  const unit = kind ? CARDIO[kind].unit : null;

  return (
    <fieldset className="space-y-3 rounded-2xl bg-card p-4">
      <legend className="sr-only">Cardio plan</legend>
      <p className="text-sm font-medium text-muted">Cardio plan</p>
      <input type="hidden" name="cardio_kind" value={kind} />

      <div role="radiogroup" aria-label="Which cardio" className="grid grid-cols-4 gap-1 rounded-xl bg-background p-1">
        {[...CARDIO_KINDS, ""].map((option) => {
          const selected = kind === option;
          return (
            <button
              key={option || "none"}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setKind(option as CardioKind | "")}
              className={`flex min-h-11 flex-col items-center justify-center rounded-lg text-sm font-semibold active:opacity-80 ${
                selected ? "bg-accent text-on-accent" : "text-muted"
              }`}
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
          );
        })}
      </div>

      {kind && (
        <div>
          <label htmlFor="cardio-distance" className="mb-1 block text-xs text-muted">
            Target distance <span className="font-normal">(optional, in {unit === "yd" ? "yards" : "miles"})</span>
          </label>
          <input
            id="cardio-distance"
            name="cardio_distance"
            type="text"
            inputMode="decimal"
            defaultValue={initial && initial.kind === kind && initial.distance !== null ? String(initial.distance) : ""}
            key={kind} // a fresh box when you switch between miles and yards
            placeholder={unit === "yd" ? "e.g. 1000" : "e.g. 3"}
            autoComplete="off"
            className={inputClass}
          />
        </div>
      )}
    </fieldset>
  );
}
