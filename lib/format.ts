/**
 * Date formatting shared by the review surfaces. The locale comes from the
 * interface language (see localeFor in lib/lang.ts); Turkish is the default for
 * a caller that has none.
 */

const DAY_MONTH_YEAR: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

function day(value: Date, locale: string): string {
  return new Date(value).toLocaleDateString(locale, DAY_MONTH_YEAR);
}

/**
 * A stay as "12 Sep 2024 – 3 Feb 2025". With only one end known it degrades to
 * an open range; with neither it returns null so the caller can skip the row.
 */
export function formatStayRange(
  start: Date | null | undefined,
  end: Date | null | undefined,
  locale = "tr-TR",
): string | null {
  if (start && end) {
    const from = day(start, locale);
    const to = day(end, locale);
    return from === to ? from : `${from} – ${to}`;
  }
  if (start) return `${day(start, locale)} –`;
  if (end) return `– ${day(end, locale)}`;
  return null;
}
