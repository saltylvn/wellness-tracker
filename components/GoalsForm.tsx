"use client";

import { useActionState } from "react";
import { saveGoals, type SaveResult } from "@/app/(tabs)/settings/actions";
import type { Goals } from "@/lib/goals";
import { chosenPace, PACE_CHOICES } from "@/lib/weightPlan";

// text-base = 16px: smaller text makes iPhone Safari zoom in when you tap a field.
const inputClass =
  "min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base";
const labelClass = "mb-1 block text-sm font-medium text-muted";

export default function GoalsForm({ goals }: { goals: Goals }) {
  // useActionState connects the form to the server action and gives us its reply.
  const [result, formAction, pending] = useActionState<SaveResult, FormData>(saveGoals, null);

  // After Save, React clears the form back to the values it started with, and a picker
  // (like Weekly pace) doesn't pick up new values on its own, so it would jump back to the
  // old choice. The key redraws the form with your saved values instead.
  return (
    <form key={JSON.stringify(goals)} action={formAction} className="space-y-5">
      <div>
        <label htmlFor="calorie_goal" className={labelClass}>
          Daily calorie goal
        </label>
        <input
          id="calorie_goal"
          name="calorie_goal"
          type="number"
          inputMode="numeric"
          min={500}
          max={10000}
          step={1}
          defaultValue={goals.calorie_goal ?? ""}
          placeholder="e.g. 2000"
          required
          className={inputClass}
        />
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-muted">
          Daily macro goals <span className="font-normal">(optional, in grams)</span>
        </legend>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["protein_goal_g", "Protein", goals.protein_goal_g, 1000],
              ["carb_goal_g", "Carbs", goals.carb_goal_g, 2000],
              ["fat_goal_g", "Fat", goals.fat_goal_g, 1000],
            ] as const
          ).map(([name, label, value, max]) => (
            <div key={name}>
              <label htmlFor={name} className="mb-1 block text-xs text-muted">
                {label}
              </label>
              <input
                id={name}
                name={name}
                type="number"
                inputMode="numeric"
                min={1}
                max={max}
                step={1}
                defaultValue={value ?? ""}
                placeholder="g"
                className={inputClass}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Leave a macro blank if you don&apos;t want a goal for it.</p>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-muted">
          Weekly cardio goals <span className="font-normal">(optional, Monday to Sunday)</span>
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["weekly_run_miles", "Run (mi)", goals.weekly_run_miles, "decimal"],
              ["weekly_cycle_miles", "Cycle (mi)", goals.weekly_cycle_miles, "decimal"],
              ["weekly_swim_yards", "Swim (yd)", goals.weekly_swim_yards, "numeric"],
              ["weekly_walk_miles", "Walk (mi)", goals.weekly_walk_miles, "decimal"],
            ] as const
          ).map(([name, label, value, mode]) => (
            <div key={name}>
              <label htmlFor={name} className="mb-1 block text-xs text-muted">
                {label}
              </label>
              <input
                id={name}
                name={name}
                type="text"
                inputMode={mode}
                defaultValue={value ?? ""}
                placeholder="none"
                className={inputClass}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Leave one blank if you don&apos;t want a goal for it.</p>
      </fieldset>

      {/* id: the Weight tab's "Edit goal" link jumps straight here. */}
      <fieldset id="weight-goal" className="scroll-mt-4">
        <legend className="mb-1 text-sm font-medium text-muted">
          Weight goal <span className="font-normal">(optional, in lb)</span>
        </legend>
        {/* Starting weight and starting date side by side, then target and weekly pace. */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="start_weight_lb" className="mb-1 block text-xs text-muted">
              Starting weight
            </label>
            <input
              id="start_weight_lb"
              name="start_weight_lb"
              type="text"
              inputMode="decimal"
              defaultValue={goals.start_weight_lb ?? ""}
              placeholder="first weigh-in"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="start_date" className="mb-1 block text-xs text-muted">
              Starting date
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              defaultValue={goals.start_date ?? ""}
              className={`${inputClass} appearance-none`}
            />
          </div>
          <div>
            <label htmlFor="target_weight_lb" className="mb-1 block text-xs text-muted">
              Target weight
            </label>
            <input
              id="target_weight_lb"
              name="target_weight_lb"
              type="text"
              inputMode="decimal"
              defaultValue={goals.target_weight_lb ?? ""}
              placeholder="e.g. 175"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="weight_pace_lb_week" className="mb-1 block text-xs text-muted">
              Weekly pace
            </label>
            <select
              id="weight_pace_lb_week"
              name="weight_pace_lb_week"
              defaultValue={String(chosenPace(goals.weight_pace_lb_week))}
              className={inputClass}
            >
              {PACE_CHOICES.map((pace) => (
                <option key={pace} value={pace}>
                  {pace} lb / week
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          Used on the Weight tab: your progress and chart start from the starting date. Leave the starting
          weight or date blank to use your first weigh-in. Gaining is capped at 1 lb per week.
        </p>
      </fieldset>

      <div>
        <label htmlFor="daily_sunshine_minutes" className={labelClass}>
          Daily sunshine <span className="font-normal">(optional, in minutes)</span>
        </label>
        <input
          id="daily_sunshine_minutes"
          name="daily_sunshine_minutes"
          type="text"
          inputMode="numeric"
          defaultValue={goals.daily_sunshine_minutes ?? ""}
          placeholder="e.g. 20"
          className={inputClass}
        />
        <p className="mt-2 text-xs text-muted">
          Shown on the Fitness tab every day as &ldquo;☀️ Sunshine 10 / 20 min&rdquo;. Leave blank for no target.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-lg bg-accent text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save goals"}
      </button>

      {result && (
        <p role="status" className={`text-sm ${result.ok ? "text-accent" : "text-danger"}`}>
          {result.message}
        </p>
      )}
    </form>
  );
}
