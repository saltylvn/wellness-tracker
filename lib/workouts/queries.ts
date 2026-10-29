import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardioLogRow } from "../cardio";
import { weeklyTotals, type WeeklyGoals } from "../cardioGoals";
import { addDays, isoWeekday, weekDays } from "../dates";
import { parseGymBarcode, type GymBarcode } from "../gymBarcode";
import { isTanningDay } from "../tanning";
import { loadDoneDates } from "./activity";
import type { HistoryRow } from "./history";
import type { PlanExercise, WorkoutDay } from "./plan";
import { loadWorkoutDays } from "./seed";

// The database reads behind the Fitness page: loadFitnessPage (at the bottom) runs them in
// two rounds, and each round's queries run at the same time (not one after another), so
// the page waits on the database as few times as possible.
// Row Level Security means every query only ever sees YOUR rows.

const asNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

// A set logged on this date: weight × reps, or a time (seconds) for a timed set.
export type TodaySet = {
  id: string;
  exercise_id: string | null;
  set_number: number;
  weight: number | null;
  reps: number | null;
  seconds: number | null;
};

export type LiftDayData = {
  exercises: PlanExercise[];
  todaySets: TodaySet[]; // sets already logged on this date
  history: HistoryRow[]; // sets from earlier workouts ("last time")
  bestById: Map<string, number | null>; // heaviest weight ever logged for each exercise
};

const EXERCISE_FIELDS = "id, name, target_sets, rep_min, rep_max, superset_with_next";

/**
 * The exercise list for a weekday's plan. Looked up by weekday (not by the day's id) so it
 * can load at the same time as the plan itself, instead of waiting for it.
 */
export async function loadPlanExercises(supabase: SupabaseClient, weekday: number): Promise<PlanExercise[]> {
  const { data } = await supabase
    .from("workout_exercises")
    .select(`${EXERCISE_FIELDS}, workout_days!inner(weekday)`)
    .eq("workout_days.weekday", weekday)
    .order("position", { ascending: true });
  // Keep just the exercise fields (drop the joined weekday).
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    target_sets: row.target_sets as number | null,
    rep_min: row.rep_min as number | null,
    rep_max: row.rep_max as number | null,
    superset_with_next: Boolean(row.superset_with_next),
  }));
}

/** Everything a lifting day shows besides the exercise list, all fetched at the same time. */
export async function loadLiftDay(supabase: SupabaseClient, date: string, exercises: PlanExercise[]): Promise<LiftDayData> {
  const ids = exercises.map((e) => e.id);
  const [sessionResult, bests, past] = await Promise.all([
    // Today's session: every set logged so far.
    supabase
      .from("workout_sessions")
      .select("workout_sets(id, exercise_id, set_number, weight, reps, duration_seconds)")
      .eq("session_date", date)
      .maybeSingle(),
    // The heaviest weight ever logged for each exercise (any date), for the quick-reference line.
    Promise.all(
      ids.map(async (id) => {
        const { data } = await supabase
          .from("workout_sets")
          .select("weight")
          .eq("exercise_id", id)
          .not("weight", "is", null)
          .order("weight", { ascending: false })
          .limit(1)
          .maybeSingle();
        return [id, asNumber(data?.weight)] as const;
      }),
    ),
    // Sets from earlier workouts, for each exercise's "last time".
    ids.length === 0
      ? null
      : supabase
          .from("workout_sets")
          .select("exercise_id, set_number, weight, reps, duration_seconds, workout_sessions!inner(session_date)")
          .in("exercise_id", ids)
          .lt("workout_sessions.session_date", date)
          .order("created_at", { ascending: false })
          .limit(800),
  ]);

  const session = sessionResult.data;
  const todaySets: TodaySet[] = (session?.workout_sets ?? []).map((set: Record<string, unknown>) => ({
    id: set.id as string,
    exercise_id: set.exercise_id as string | null,
    set_number: set.set_number as number,
    weight: asNumber(set.weight),
    reps: asNumber(set.reps),
    seconds: asNumber(set.duration_seconds),
  }));
  const history: HistoryRow[] = (past?.data ?? []).map((row) => {
    // The joined session comes back as one object (or a one-item list).
    const joined = row.workout_sessions as unknown as { session_date: string } | { session_date: string }[];
    const sessionDate = Array.isArray(joined) ? joined[0]?.session_date : joined?.session_date;
    return {
      exercise_id: row.exercise_id as string | null,
      session_date: sessionDate ?? "",
      set_number: row.set_number as number,
      weight: asNumber(row.weight),
      reps: asNumber(row.reps),
      seconds: asNumber(row.duration_seconds),
    };
  });

  return {
    exercises,
    todaySets,
    history,
    bestById: new Map(bests),
  };
}

export type CardioDayData = {
  logs: CardioLogRow[]; // cardio logged on this date
  weekTotals: ReturnType<typeof weeklyTotals>;
  weeklyGoals: WeeklyGoals;
};

export async function loadCardioDay(supabase: SupabaseClient, userId: string, date: string): Promise<CardioDayData> {
  const week = weekDays(date);
  const [weekLogs, profile, dayLogs] = await Promise.all([
    supabase.from("cardio_logs").select("kind, distance, distance_unit").gte("log_date", week[0]).lte("log_date", week[6]),
    supabase
      .from("profiles")
      .select("weekly_run_miles, weekly_cycle_miles, weekly_swim_yards")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("cardio_logs")
      .select("id, kind, distance, distance_unit, duration_minutes")
      .eq("log_date", date)
      .order("created_at", { ascending: true }),
  ]);

  const goals = profile.data;
  return {
    logs: (dayLogs.data ?? []).map((row) => ({
      id: row.id as string,
      kind: row.kind as CardioLogRow["kind"],
      distance: asNumber(row.distance),
      unit: row.distance_unit as string | null,
      minutes: asNumber(row.duration_minutes),
    })),
    weekTotals: weeklyTotals(
      (weekLogs.data ?? []).map((row) => ({
        kind: row.kind as string,
        distance: asNumber(row.distance),
        distance_unit: row.distance_unit as string | null,
      })),
    ),
    weeklyGoals: {
      run: asNumber(goals?.weekly_run_miles),
      cycle: asNumber(goals?.weekly_cycle_miles),
      swim: asNumber(goals?.weekly_swim_yards),
    },
  };
}

export type TanningData = {
  minutes: number | null; // saved for this date, if any
  lastMinutes: number | null; // your most recent earlier session
};

export async function loadTanning(supabase: SupabaseClient, date: string): Promise<TanningData> {
  const [today, previous] = await Promise.all([
    supabase.from("tanning_logs").select("minutes").eq("log_date", date).maybeSingle(),
    supabase
      .from("tanning_logs")
      .select("minutes")
      .lt("log_date", date)
      .order("log_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return { minutes: asNumber(today.data?.minutes), lastMinutes: asNumber(previous.data?.minutes) };
}

/** Your saved gym check-in barcode, or null (none saved yet, or the SQL step isn't run yet). */
export async function loadGymBarcode(supabase: SupabaseClient, userId: string): Promise<GymBarcode | null> {
  const { data } = await supabase
    .from("profiles")
    .select("gym_barcode_text, gym_barcode_format")
    .eq("id", userId)
    .maybeSingle();
  return data ? parseGymBarcode({ text: data.gym_barcode_text, format: data.gym_barcode_format }) : null;
}

export type FitnessPageData = {
  days: WorkoutDay[]; // your weekly plan
  doneDates: string[]; // every day you logged a workout or cardio (streak and green rings)
  today: WorkoutDay | undefined; // the plan for this date's weekday
  lift: LiftDayData | null;
  cardio: CardioDayData | null;
  tanning: TanningData | null;
  gymBarcode: GymBarcode | null; // shown at the top of the page
};

/**
 * Everything the Fitness page reads, in as few trips to the database as possible:
 *   1. your plan, the days you logged, this weekday's exercises, tanning (Tue/Thu), and your
 *      gym barcode, together;
 *   2. then what this kind of day needs (lifting or cardio), together.
 */
export async function loadFitnessPage(supabase: SupabaseClient, userId: string, date: string): Promise<FitnessPageData> {
  const weekday = isoWeekday(date);
  const [days, doneDates, planExercises, tanning, gymBarcode] = await Promise.all([
    loadWorkoutDays(supabase, userId),
    loadDoneDates(supabase, addDays(date, -400)),
    loadPlanExercises(supabase, weekday),
    isTanningDay(weekday) ? loadTanning(supabase, date) : null,
    loadGymBarcode(supabase, userId),
  ]);
  const today = days.find((d) => d.weekday === weekday);

  const lift = today?.kind === "lift" ? await loadLiftDay(supabase, date, planExercises) : null;
  const cardio = today?.kind === "cardio" ? await loadCardioDay(supabase, userId, date) : null;

  return { days, doneDates, today, lift, cardio, tanning, gymBarcode };
}
