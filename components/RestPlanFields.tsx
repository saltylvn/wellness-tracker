"use client";

import { useState } from "react";
import { REST_ACTIVITIES, REST_ACTIVITY, type RestActivity, type RestPlan } from "@/lib/restPlan";

// text-base = 16px: smaller text makes iPhone Safari zoom in when you tap a field.
const inputClass = "min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base";

const UNIT_WORDS = { mi: "miles", min: "minutes" } as const;

// The rest day part of a day's plan (inside the Edit plan form), laid out like a cardio day's
// plan: pick Walk, Bike ride or Yoga (or None), then an optional target (miles for a walk or
// ride, minutes for yoga). Sent with the form as rest_activity / rest_target.
export default function RestPlanFields({ initial }: { initial: RestPlan | null }) {
  const [activity, setActivity] = useState<RestActivity | "">(initial?.activity ?? "");
  const unit = activity ? REST_ACTIVITY[activity].unit : "mi";

  return (
    <fieldset className="space-y-3 rounded-2xl bg-card p-4">
      <legend className="sr-only">Recovery plan</legend>
      <p className="text-sm font-medium text-muted">Recovery plan</p>
      <input type="hidden" name="rest_activity" value={activity} />

      <div role="radiogroup" aria-label="Which recovery activity" className="grid grid-cols-4 gap-1 rounded-xl bg-background p-1">
        {[...REST_ACTIVITIES, ""].map((option) => {
          const selected = activity === option;
          return (
            <button
              key={option || "none"}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setActivity(option as RestActivity | "")}
              className={`flex min-h-11 flex-col items-center justify-center rounded-lg text-sm font-semibold active:opacity-80 ${
                selected ? "bg-accent text-on-accent" : "text-muted"
              }`}
            >
              {option ? (
                <>
                  <span aria-hidden="true">{REST_ACTIVITY[option as RestActivity].icon}</span>
                  {REST_ACTIVITY[option as RestActivity].label}
                </>
              ) : (
                "None"
              )}
            </button>
          );
        })}
      </div>

      {activity && (
        <div>
          <label htmlFor="rest-target" className="mb-1 block text-xs text-muted">
            Target <span className="font-normal">(optional, in {UNIT_WORDS[unit]})</span>
          </label>
          <input
            id="rest-target"
            name="rest_target"
            type="text"
            inputMode="decimal"
            defaultValue={initial && initial.activity === activity && initial.target !== null ? String(initial.target) : ""}
            key={activity} // a fresh box when the activity changes
            placeholder={unit === "min" ? "e.g. 20" : "e.g. 2"}
            autoComplete="off"
            className={inputClass}
          />
        </div>
      )}
    </fieldset>
  );
}
