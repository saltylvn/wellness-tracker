"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { updateSavedFood, type SavedFoodFormState } from "@/app/(tabs)/food/saved/actions";
import type { SavedFood } from "@/lib/food";

// text-base = 16px: smaller text makes iPhone Safari zoom in when you tap a field.
const inputClass =
  "min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base";
const labelClass = "mb-1 block text-sm font-medium text-muted";

export default function SavedFoodForm({ food, date }: { food: SavedFood; date: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SavedFoodFormState, FormData>(
    updateSavedFood,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={food.id} />
      <input type="hidden" name="date" value={date} />

      <div>
        <label htmlFor="name" className={labelClass}>
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={200}
          defaultValue={food.name}
          className={inputClass}
        />
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
          defaultValue={food.calories}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ["protein_g", "Protein (g)", food.protein_g],
            ["carbs_g", "Carbs (g)", food.carbs_g],
            ["fat_g", "Fat (g)", food.fat_g],
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
              className={inputClass}
            />
          </div>
        ))}
      </div>

      {state && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="min-h-12 flex-1 rounded-xl border border-border text-base font-medium active:opacity-80"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 flex-1 rounded-lg bg-accent text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
