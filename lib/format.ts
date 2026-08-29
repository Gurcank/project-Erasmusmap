/**
 * Date formatting shared by the review surfaces. Dates render in Turkish
 * regardless of the interface language, matching the rest of the app, which
 * calls `toLocaleDateString("tr-TR", …)` directly.
 */

const DAY_MONTH_YEAR: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

function day(value: Date): string {
  return new Date(value).toLocaleDateString("tr-TR", DAY_MONTH_YEAR);
}

/**
 * A stay as "12 Eyl 2024 – 3 Şub 2025". With only one end known it degrades to
 * an open range; with neither it returns null so the caller can skip the row.
 */
export function formatStayRange(
  start: Date | null | undefined,
  end: Date | null | undefined,
): string | null {
  if (start && end) {
    return day(start) === day(end) ? day(start) : `${day(start)} – ${day(end)}`;
  }
  if (start) return `${day(start)} –`;
  if (end) return `– ${day(end)}`;
  return null;
}
