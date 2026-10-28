// The weekly plan a new account starts with: blank. Every day starts as a rest day with
// no exercises, and you build your own plan on the Fitness tab: pick your lifting and
// cardio days in "Your week", then name each lifting day and add its exercises (Edit plan).
// Weekdays: 1 = Monday ... 7 = Sunday.

export type DayKind = "lift" | "cardio" | "rest";

export type StartingDay = {
  weekday: number;
  kind: DayKind;
  title: string;
};

// What a rest day is called everywhere in the app (it's shown for any day set to rest, even
// if an older copy of your plan still says "Rest Day").
export const REST_DAY_TITLE = "Recovery Day";

/** A new account's week: all seven days blank (rest), ready for you to plan. */
export const STARTING_PLAN: StartingDay[] = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  kind: "rest",
  title: REST_DAY_TITLE,
}));
