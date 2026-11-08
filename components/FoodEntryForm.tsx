"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveFoodEntry, type FormState } from "@/app/(tabs)/food/actions";
import { MEAL_LABELS, MEAL_TYPES, type FoodEntry, type Nutrition } from "@/lib/food";

// text-base = 16px: smaller text makes iPhone Safari zoom in when you tap a field.
const inputClass =
  "min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base";
const labelClass = "mb-1 block text-sm font-medium text-muted";

export default function FoodEntryForm({
  entry,
  prefill,
  defaultDate,
  source,
  hideSaveToggle = false,
}: {
  entry?: FoodEntry; // present when editing, absent when adding
  prefill?: Nutrition; // starting values when adding (from a saved food or an AI estimate)
  defaultDate: string;
  source?: "text" | "photo"; // set when the numbers came from an AI estimate
  hideSaveToggle?: boolean; // true for foods that are already in your saved list
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveFoodEntry, null);
  const date = entry?.entry_date ?? defaultDate;
  const start = entry ?? prefill; // what the fields begin with

  return (
    <form action={formAction} className="space-y-4">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      {source && <input type="hidden" name="source" value={source} />}

      <div>
        <label htmlFor="name" className={labelClass}>
          What did you have?
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={200}
          defaultValue={start?.name}
          placeholder="e.g. Greek yogurt with berries"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="meal_type" className={labelClass}>
            Meal
          </label>
          <select
            id="meal_type"
            name="meal_type"
            defaultValue={entry?.meal_type ?? "breakfast"}
            className={inputClass}
          >
            {MEAL_TYPES.map((meal) => (
              <option key={meal} value={meal}>
                {MEAL_LABELS[meal]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="entry_date" className={labelClass}>
            Date
          </label>
          <input
            id="entry_date"
            name="entry_date"
            type="date"
            required
            defaultValue={date}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="calories" className={labelClass}>
          Calories
        </label>
        <input
          id="calories"
          name="calories"
          type="number"
          inputMode="numeric"
          step="any"
          min={0}
          max={10000}
          required
          defaultValue={start?.calories}
          placeholder="kcal"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ["protein_g", "Protein (g)", start?.protein_g],
            ["carbs_g", "Carbs (g)", start?.carbs_g],
            ["fat_g", "Fat (g)", start?.fat_g],
          ] as const
        ).map(([name, label, value]) => (
          <div key={name}>
            <label htmlFor={name} className={labelClass}>
              {label}
            </label>
            <input
              id={name}
              name={name}
              type="number"
              inputMode="numeric"
              step="any"
              min={0}
              max={1000}
              defaultValue={value}
              placeholder="0"
              className={inputClass}
            />
          </div>
        ))}
      </div>

      {/* A food that came from your saved list is already saved. */}
      {!hideSaveToggle && (
        <label className="flex min-h-12 items-center gap-3 rounded-xl bg-card px-4">
          <input
            type="checkbox"
            name="save_food"
            className="h-5 w-5 shrink-0 accent-[var(--accent)]"
          />
          <span className="text-base">Save to my foods for next time</span>
        </label>
      )}

      {state && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Link
          href={`/food?date=${date}`}
          className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-border text-base font-medium active:opacity-80"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 flex-1 rounded-full bg-accent text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60"
        >
          {pending ? "Saving…" : entry ? "Save changes" : "Add food"}
        </button>
      </div>
    </form>
  );
}
