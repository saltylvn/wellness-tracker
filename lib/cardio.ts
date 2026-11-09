// Cardio logging: run, cycle, swim, or walk, each with an optional distance and time.

export const CARDIO_KINDS = ["run", "cycle", "swim", "walk"] as const;
export type CardioKind = (typeof CARDIO_KINDS)[number];
export type DistanceUnit = "mi" | "yd";

// Run, cycle and walk are in miles; swim is in yards.
export const CARDIO: Record<CardioKind, { label: string; icon: string; unit: DistanceUnit }> = {
  run: { label: "Run", icon: "🏃", unit: "mi" },
  cycle: { label: "Cycle", icon: "🚴", unit: "mi" },
  swim: { label: "Swim", icon: "🏊", unit: "yd" },
  walk: { label: "Walk", icon: "🚶", unit: "mi" },
};

// One logged cardio session, as shown in the list on a cardio day.
export type CardioLogRow = {
  id: string;
  kind: CardioKind;
  distance: number | null;
  unit: string | null;
  minutes: number | null;
};

export const MAX_DISTANCE: Record<DistanceUnit, number> = { mi: 500, yd: 100000 };
export const MAX_MINUTES = 1440; // 24 hours

/** Checks a value from the browser is really "run", "cycle", "swim", or "walk"; otherwise null. */
export function parseCardioKind(value: unknown): CardioKind | null {
  return (CARDIO_KINDS as readonly unknown[]).includes(value) ? (value as CardioKind) : null;
}

export type CardioCheck =
  | {
      ok: true;
      kind: CardioKind;
      distance: number | null;
      unit: DistanceUnit | null;
      minutes: number | null;
    }
  | { ok: false; message: string };

// Never trust the browser: this runs on the server before a cardio log is saved.
// Distance and minutes are both optional (null or undefined means "not entered").
export function validateCardio(kind: unknown, distance: unknown, minutes: unknown): CardioCheck {
  const parsedKind = parseCardioKind(kind);
  if (!parsedKind) return { ok: false, message: "Choose run, cycle, swim, or walk." };
  const { unit } = CARDIO[parsedKind];

  let cleanDistance: number | null = null;
  if (distance !== null && distance !== undefined) {
    if (typeof distance !== "number" || !Number.isFinite(distance) || distance <= 0 || distance > MAX_DISTANCE[unit]) {
      return {
        ok: false,
        message: `Distance must be more than 0 and at most ${MAX_DISTANCE[unit].toLocaleString("en-US")} ${unit}.`,
      };
    }
    cleanDistance = Math.round(distance * 100) / 100;
    if (cleanDistance <= 0) return { ok: false, message: "That distance is too small." };
  }

  let cleanMinutes: number | null = null;
  if (minutes !== null && minutes !== undefined) {
    if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0 || minutes > MAX_MINUTES) {
      return { ok: false, message: `Time must be more than 0 and at most ${MAX_MINUTES.toLocaleString("en-US")} minutes.` };
    }
    cleanMinutes = Math.round(minutes * 10) / 10;
    if (cleanMinutes <= 0) return { ok: false, message: "That time is too small." };
  }

  return {
    ok: true,
    kind: parsedKind,
    distance: cleanDistance,
    unit: cleanDistance === null ? null : unit,
    minutes: cleanMinutes,
  };
}

/** What you typed in a text field -> a number, null if blank, or "invalid". Accepts "3,5" too. */
export function readNumberField(text: string): number | null | "invalid" {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : "invalid";
}

/** 3.1 -> "3.1 mi", 1500 -> "1,500 yd" */
export function formatDistance(distance: number, unit: string): string {
  return `${distance.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit}`;
}

/** 28 -> "28 min", 28.5 -> "28.5 min", 65 -> "1 h 05 min", 120 -> "2 h" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round((minutes - hours * 60) * 10) / 10;
  if (rest === 0) return `${hours} h`;
  const restText = Number.isInteger(rest) ? String(rest).padStart(2, "0") : rest.toFixed(1);
  return `${hours} h ${restText} min`;
}

/** "3.1 mi · 28 min", or "Logged" when neither distance nor time was entered. */
export function summarizeCardio(
  distance: number | null,
  unit: string | null,
  minutes: number | null,
): string {
  const parts: string[] = [];
  if (distance !== null && unit) parts.push(formatDistance(distance, unit));
  if (minutes !== null) parts.push(formatDuration(minutes));
  return parts.length > 0 ? parts.join(" · ") : "Logged";
}
