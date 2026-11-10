// Shared card sizes, so the tabs line up. The slim card under the streak on Fitness
// ("Your week" day toggles) and on Nutrition (macros) is exactly the same size: 112px tall.
export const TOP_CARD = "h-28 rounded-2xl bg-card px-3 py-2";

// The streak card at the top of every tab (Weight, Fitness, Nutrition): one fixed height, so
// it sits in the same place and is the same size on all three. A long hint is cut short with
// "…" instead of wrapping onto a second line (which would make that tab's card taller).
export const STREAK_CARD = "flex h-[76px] flex-col justify-center rounded-2xl bg-card px-4";
// Shown in the streak card's place until the phone says what day it is, so nothing jumps.
export const STREAK_PLACEHOLDER = "h-[76px]";
