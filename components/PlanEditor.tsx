"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { saveDayPlan, type PlanFormState } from "@/app/(tabs)/workouts/actions";
import CardioPlanFields from "@/components/CardioPlanFields";
import type { CardioPlan } from "@/lib/cardioPlan";
import { afterDayEditPath, type PlanExercise } from "@/lib/workouts/plan";
import { MAX_DAY_NAME_LENGTH } from "@/lib/workouts/weekSetup";

type Row = {
  key: string; // only used by React to keep rows straight; not saved
  id?: string; // present for exercises that already exist
  name: string;
  sets: string;
  repMin: string;
  repMax: string;
  supersetWithNext: boolean;
};

// text-base = 16px: smaller text makes iPhone Safari zoom in when you tap a field.
const inputClass =
  "min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base";
const smallButton =
  "flex min-h-11 flex-1 items-center justify-center rounded-xl border border-border text-sm font-medium active:opacity-80 disabled:opacity-40";

export default function PlanEditor({
  dayId,
  date,
  title,
  initialName,
  back,
  initial,
  lift = true,
  cardio,
}: {
  dayId: string;
  date: string; // may be empty
  title: string; // the day's heading, used in the "Remove…?" question
  initialName: string; // what's in the name box at first ("" for a day not named yet)
  back: "plan" | ""; // "plan" when opened from the week's Edit plan page, to go back there
  initial: PlanExercise[];
  lift?: boolean; // false for a cardio-only day: no name or exercises
  cardio?: CardioPlan | null; // present for a cardio day: its plan (null = none yet)
}) {
  const nextKey = useRef(0);
  const newKey = () => `new-${nextKey.current++}`;

  const [rows, setRows] = useState<Row[]>(
    initial.map((e) => ({
      key: e.id,
      id: e.id,
      name: e.name,
      sets: e.target_sets?.toString() ?? "",
      repMin: e.rep_min?.toString() ?? "",
      repMax: e.rep_max?.toString() ?? "",
      supersetWithNext: e.superset_with_next,
    })),
  );
  const [state, formAction, pending] = useActionState<PlanFormState, FormData>(saveDayPlan, null);

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const move = (index: number, by: -1 | 1) =>
    setRows((current) => {
      const target = index + by;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });

  const remove = (index: number) => {
    const row = rows[index];
    if (row.id && !window.confirm(`Remove "${row.name || "this exercise"}" from ${title}?`)) return;
    setRows((current) => current.filter((_, i) => i !== index));
  };

  // What gets sent to the server when you tap Save.
  const planJson = JSON.stringify(
    rows.map(({ id, name, sets, repMin, repMax, supersetWithNext }) => ({
      id,
      name,
      sets,
      repMin,
      repMax,
      supersetWithNext,
    })),
  );

  const backHref = afterDayEditPath(back, date);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="day_id" value={dayId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="plan" value={planJson} />

      {cardio !== undefined && <CardioPlanFields initial={cardio} />}

      {lift && (
        <>
          {/* The day's name ("theme"), shown on the Fitness tab: "Monday · Legs". Blank = "Lifting". */}
          <div>
            <label htmlFor="day-name" className="mb-1 block text-sm font-medium text-muted">
              Workout name
            </label>
            <input
              id="day-name"
              name="title"
              type="text"
              defaultValue={initialName}
              maxLength={MAX_DAY_NAME_LENGTH}
              placeholder="e.g. Legs, Push day, Upper body"
              autoComplete="off"
              className={inputClass}
            />
          </div>

          {rows.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
              No exercises yet. Add your first one below.
            </p>
          )}

          {rows.map((row, index) => (
            <fieldset key={row.key} className="space-y-3 rounded-2xl bg-card p-4">
              <legend className="sr-only">Exercise {index + 1}</legend>

              <div>
                <label htmlFor={`name-${row.key}`} className="mb-1 block text-sm font-medium text-muted">
                  Exercise {index + 1}
                </label>
                <input
                  id={`name-${row.key}`}
                  type="text"
                  value={row.name}
                  maxLength={80}
                  placeholder="e.g. Incline press"
                  onChange={(event) => update(index, { name: event.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ["sets", "Sets", row.sets, "3"],
                    ["repMin", "Min reps", row.repMin, "8"],
                    ["repMax", "Max reps", row.repMax, "12"],
                  ] as const
                ).map(([field, label, value, placeholder]) => (
                  <div key={field}>
                    <label htmlFor={`${field}-${row.key}`} className="mb-1 block text-xs text-muted">
                      {label}
                    </label>
                    <input
                      id={`${field}-${row.key}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={field === "sets" ? 20 : 100}
                      value={value}
                      placeholder={placeholder}
                      onChange={(event) => update(index, { [field]: event.target.value })}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>

              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={row.supersetWithNext}
                  disabled={index === rows.length - 1}
                  onChange={(event) => update(index, { supersetWithNext: event.target.checked })}
                  className="h-5 w-5 shrink-0 accent-[var(--accent)]"
                />
                <span className="text-sm">
                  Superset with the next exercise <span className="text-muted">(no rest between)</span>
                </span>
              </label>

              <div className="flex gap-2">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className={smallButton}>
                  ↑ Up
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  className={smallButton}
                >
                  ↓ Down
                </button>
                <button type="button" onClick={() => remove(index)} className={`${smallButton} text-danger`}>
                  Remove
                </button>
              </div>
            </fieldset>
          ))}

          <button
            type="button"
            onClick={() =>
              setRows((current) => [
                ...current,
                { key: newKey(), name: "", sets: "", repMin: "", repMax: "", supersetWithNext: false },
              ])
            }
            className="min-h-12 w-full rounded-xl border border-dashed border-border text-base font-medium active:opacity-80"
          >
            + Add exercise
          </button>
        </>
      )}

      {state && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Link
          href={backHref}
          className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-border text-base font-medium active:opacity-80"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 flex-1 rounded-xl bg-accent text-base font-semibold text-on-accent active:opacity-80 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save plan"}
        </button>
      </div>
    </form>
  );
}
