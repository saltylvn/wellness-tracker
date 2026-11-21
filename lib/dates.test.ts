import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDayNumber,
  formatFullDate,
  formatShortDate,
  formatShortMonth,
  formatWeekday,
  getLocalDateKey,
  isoWeekday,
  isValidDateKey,
  weekDays,
} from "./dates";

describe("isValidDateKey", () => {
  it("rejects anything that isn't a string", () => {
    for (const bad of [undefined, null, 20261005, {}, ["2026-10-05"]]) expect(isValidDateKey(bad)).toBe(false);
  });

  it("accepts real dates", () => {
    expect(isValidDateKey("2026-10-05")).toBe(true);
    expect(isValidDateKey("2028-02-29")).toBe(true); // leap year
  });

  it("rejects impossible or badly formatted dates", () => {
    expect(isValidDateKey("2026-02-30")).toBe(false);
    expect(isValidDateKey("2027-02-29")).toBe(false); // not a leap year
    expect(isValidDateKey("2026-13-01")).toBe(false);
    expect(isValidDateKey("2026-1-5")).toBe(false);
    expect(isValidDateKey("tomorrow")).toBe(false);
    expect(isValidDateKey("")).toBe(false);
  });
});

describe("addDays", () => {
  it("moves forward and backward", () => {
    expect(addDays("2026-10-05", 1)).toBe("2026-10-06");
    expect(addDays("2026-10-05", -1)).toBe("2026-10-04");
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("weekDays", () => {
  it("lists Monday through Sunday by default", () => {
    // Oct 5, 2026 is a Monday
    expect(weekDays("2026-10-05")).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
  });

  it("gives the same week for every day in it", () => {
    const week = weekDays("2026-10-05");
    for (const day of week) expect(weekDays(day)).toEqual(week);
  });

  it("starts a new week on Monday", () => {
    expect(weekDays("2026-10-05")[0]).toBe("2026-10-05"); // a Monday
    expect(weekDays("2026-10-04")[6]).toBe("2026-10-04"); // Sunday ends the week before
    expect(weekDays("2026-10-04")).toEqual(weekDays("2026-09-28"));
    expect(weekDays("2026-10-12")[0]).toBe("2026-10-12"); // next Monday
  });

  it("can start on Sunday instead", () => {
    expect(weekDays("2026-10-04", 0)[0]).toBe("2026-10-04"); // a Sunday
    expect(weekDays("2026-10-10", 0)[6]).toBe("2026-10-10"); // Saturday ends it
    expect(weekDays("2026-10-05", 0)[0]).toBe("2026-10-04");
  });

  it("crosses month and year boundaries", () => {
    // Thursday, Dec 31, 2026
    expect(weekDays("2026-12-31")).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
  });
});

describe("isoWeekday", () => {
  it("numbers days 1 (Monday) through 7 (Sunday)", () => {
    expect(isoWeekday("2026-10-05")).toBe(1); // Monday
    expect(isoWeekday("2026-10-06")).toBe(2);
    expect(isoWeekday("2026-10-07")).toBe(3); // Wednesday
    expect(isoWeekday("2026-10-09")).toBe(5); // Friday
    expect(isoWeekday("2026-10-10")).toBe(6);
    expect(isoWeekday("2026-10-11")).toBe(7); // Sunday
  });
});

describe("getLocalDateKey", () => {
  it("uses the local calendar date, not UTC", () => {
    // Built from local parts, so this holds in any time zone the tests run in.
    const lateEvening = new Date(2026, 9, 5, 23, 30); // Oct 5, 11:30pm local
    expect(getLocalDateKey(lateEvening)).toBe("2026-10-05");
    const justAfterMidnight = new Date(2026, 9, 6, 0, 5);
    expect(getLocalDateKey(justAfterMidnight)).toBe("2026-10-06");
  });
});

describe("formatting", () => {
  it("prints the same text everywhere", () => {
    expect(formatWeekday("2026-10-05")).toBe("Monday");
    expect(formatShortMonth("2026-10-05")).toBe("Oct");
    expect(formatDayNumber("2026-10-05")).toBe("5");
    expect(formatFullDate("2026-10-05")).toBe("Oct 5, 2026");
    expect(formatShortDate("2026-11-18")).toBe("Wed, Nov 18");
  });
});
