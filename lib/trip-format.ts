import type { ExpenseCategory, TransportMode } from "@/lib/trip-types";

/*
 * Display formatting for the planner. Days and times are wall-clock strings
 * (see lib/trip-types.ts), so every Date built here is pinned to UTC and
 * formatted in UTC — formatting in the browser's zone would move them.
 */

function asUtc(day: string, time = "00:00"): Date {
  return new Date(`${day}T${time}:00Z`);
}

export function formatDay(
  day: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  },
): string {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(asUtc(day));
}

export function formatRange(start: string, end: string, locale: string) {
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  };
  const format = new Intl.DateTimeFormat(locale, options);
  return format.formatRange(asUtc(start), asUtc(end));
}

export function formatTime(time: string): string {
  return time.slice(11, 16);
}

/** "2026-12-23" → "23" for calendar cells. */
export function dayNumber(day: string): number {
  return Number(day.slice(8, 10));
}

/** Monday-first weekday index, 0–6. */
export function weekdayIndex(day: string): number {
  return (asUtc(day).getUTCDay() + 6) % 7;
}

/*
 * Colour is identity only, assigned in the fixed slot order of the series
 * palette in globals.css (--series-1…8), and always next to a label.
 *
 * Cities take slots by their order on the trip. Past eight they wrap — a trip
 * through nine cities is rare, and the city name is always beside the colour.
 */
const SLOTS = 8;

export function cityColor(index: number): string {
  return `var(--series-${(index % SLOTS) + 1})`;
}

/** Fixed per category, so a category keeps its colour on every chart. */
export const CATEGORY_COLOR: Record<ExpenseCategory | "LUMP", string> = {
  TRANSPORT: "var(--series-1)",
  ACCOMMODATION: "var(--series-2)",
  FOOD: "var(--series-3)",
  ACTIVITIES: "var(--series-4)",
  SHOPPING: "var(--series-5)",
  OTHER: "var(--series-6)",
  LUMP: "var(--series-7)",
};

/*
 * The map needs literal colours (Mapbox paints on a canvas, not with CSS). The
 * basemap is dark satellite imagery in both themes, so these are the series
 * palette's dark-surface steps.
 */
export const MAP_SERIES = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];

export const MODE_COLOR: Record<TransportMode, string> = {
  BUS: MAP_SERIES[1],
  TRAIN: MAP_SERIES[0],
  FLIGHT: MAP_SERIES[6],
  CAR: MAP_SERIES[3],
  FERRY: MAP_SERIES[2],
  WALK: MAP_SERIES[4],
  OTHER: "#c3c2b7",
};
