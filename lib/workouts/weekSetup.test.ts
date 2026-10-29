import { describe, expect, it } from "vitest";
import {
  dayTitle,
  editableDayName,
  isBlankWeek,
  parseDayName,
  parseWeekKinds,
  titleAfterChange,
  toggleDay,
} from "./weekSetup";

describe("dayTitle", () => {
  it("names cardio and rest days by their kind", () => {
    expect(dayTitle({ kind: "cardio", title: "Legs" })).toBe("Cardio");
    expect(dayTitle({ kind: "rest", title: "Rest Day" })).toBe("Recovery Day");
  });

  it("uses a lifting day's own name, or 'Lifting' for a generic one", () => {
    expect(dayTitle({ kind: "lift", title: "Legs" })).toBe("Legs");
    expect(dayTitle({ kind: "lift", title: "Cardio" })).toBe("Lifting");
  });

  it("adds '+ Cardio' to a day with both", () => {
    expect(dayTitle({ kind: "both", title: "Legs" })).toBe("Legs + Cardio");
    expect(dayTitle({ kind: "both", title: "Lifting" })).toBe("Lifting + Cardio");
  });
});

describe("titleAfterChange", () => {
  it("gives a new lifting day a lifting name and keeps real names", () => {
    expect(titleAfterChange("lift", "Cardio")).toBe("Lifting");
    expect(titleAfterChange("lift", "Recovery Day")).toBe("Lifting");
    expect(titleAfterChange("cardio", "Legs")).toBe("Legs");
    expect(titleAfterChange("lift", "Legs")).toBe("Legs");
  });
});

describe("parseDayName", () => {
  it("keeps your name, tidying extra spaces", () => {
    expect(parseDayName("  Push   day ")).toBe("Push day");
    expect(parseDayName("Chest & Back")).toBe("Chest & Back");
  });

  it("turns a blank name into 'Lifting' and refuses one that's too long", () => {
    expect(parseDayName("   ")).toBe("Lifting");
    expect(parseDayName(undefined)).toBe("Lifting");
    expect(parseDayName("x".repeat(41))).toBeNull();
  });
});

describe("editableDayName", () => {
  it("shows a real name, and an empty box for a generic one", () => {
    expect(editableDayName("Legs")).toBe("Legs");
    expect(editableDayName("Lifting")).toBe("");
    expect(editableDayName("Recovery Day")).toBe("");
  });
});

describe("isBlankWeek", () => {
  it("is true only when no day is a lifting or cardio day", () => {
    expect(isBlankWeek([{ kind: "rest" }, { kind: "rest" }])).toBe(true);
    expect(isBlankWeek([{ kind: "rest" }, { kind: "cardio" }])).toBe(false);
  });
});

describe("parseWeekKinds", () => {
  const good = { 1: "lift", 2: "cardio", 3: "lift", 4: "cardio", 5: "lift", 6: "cardio" };

  it("reads Monday to Saturday and always makes Sunday a rest day", () => {
    const week = parseWeekKinds(good);
    expect(week?.get(1)).toBe("lift");
    expect(week?.get(6)).toBe("cardio");
    expect(week?.get(7)).toBe("rest");
    expect(parseWeekKinds({ ...good, 7: "lift" })?.get(7)).toBe("rest");
  });

  it("rejects missing days or unknown kinds", () => {
    expect(parseWeekKinds({ ...good, 6: undefined })).toBeNull();
    expect(parseWeekKinds({ ...good, 3: "yoga" })).toBeNull();
    expect(parseWeekKinds(null)).toBeNull();
    expect(parseWeekKinds(["lift"])).toBeNull();
  });
});

describe("toggleDay", () => {
  const week = ["lift", "cardio", "rest"] as const;

  it("turns a rest day on in either row", () => {
    expect(toggleDay([...week], 2, "lift")).toEqual(["lift", "cardio", "lift"]);
    expect(toggleDay([...week], 2, "cardio")).toEqual(["lift", "cardio", "cardio"]);
  });

  it("turning on the other row makes a day both", () => {
    expect(toggleDay([...week], 0, "cardio")).toEqual(["both", "cardio", "rest"]);
    expect(toggleDay([...week], 1, "lift")).toEqual(["lift", "both", "rest"]);
  });

  it("turning one row off leaves the other", () => {
    expect(toggleDay(["both"], 0, "lift")).toEqual(["cardio"]);
    expect(toggleDay(["both"], 0, "cardio")).toEqual(["lift"]);
  });

  it("turns a day that's on in one row only off (rest)", () => {
    expect(toggleDay([...week], 0, "lift")).toEqual(["rest", "cardio", "rest"]);
  });
});
