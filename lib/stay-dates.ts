import { format, isValid, parse, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import { dateFnsLocale } from "@/lib/date-locale";
import type { Lang } from "@/lib/i18n";

/**
 * The shape of a typed stay date, shared by every surface that lets someone
 * enter one: the calendar under the review form and the compact pair inside a
 * review's edit form. Kept in one place so the three of them cannot drift on
 * what they accept.
 */

// The readable form, for summaries and for day labels read out to screen
// readers: "5 Eyl 2025".
export const READABLE_MASK = "d MMM yyyy";

// What the text fields write back — all numbers, day first. `d` and `M` match
// one or two digits, so 7.9.2025 and 07.09.2025 both work and a leading zero is
// never required.
export const INPUT_MASK = "d.M.yyyy";

// What they accept. The dotted form is what people actually type, and date-fns
// matches one mask per call, so they are tried in order. Two-digit years are
// left out on purpose: "05.09.25" is ambiguous, and guessing a century quietly
// would be worse than rejecting it.
const ACCEPTED_MASKS = [
  INPUT_MASK,
  "d/M/yyyy",
  "d-M-yyyy",
  READABLE_MASK,
  "d MMMM yyyy",
  "yyyy-MM-dd",
];

// Shown in an empty field. A worked example rather than a format string, with a
// single-digit day and month on purpose: it shows padding is not needed.
const EXAMPLE = new Date(2025, 8, 5);

// The oldest stay the fields accept, matching the server's floor in
// lib/schemas.ts. Nobody is recording an Erasmus term from before this.
export const EARLIEST_STAY = new Date(2000, 0, 1);

export function formatStayDate(
  date: Date,
  mask = INPUT_MASK,
  lang: Lang = "tr",
): string {
  return format(date, mask, { locale: dateFnsLocale(lang) });
}

/** The example to put in a placeholder, in the language of the mask. */
export const stayDatePlaceholder = (lang: Lang = "tr") =>
  formatStayDate(EXAMPLE, INPUT_MASK, lang);

/**
 * Reads one typed date. Returns null for an empty field and "invalid" for text
 * that matches no accepted mask or falls outside `min`/`max`.
 */
export function parseStayDate(
  text: string,
  bounds: { min?: Date; max?: Date } = {},
  lang: Lang = "tr",
): Date | null | "invalid" {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Month names are read in the interface language and in Turkish, so a date
  // written before the language was switched still parses.
  const locales = lang === "tr" ? [tr] : [dateFnsLocale(lang), tr];

  for (const mask of ACCEPTED_MASKS) {
    const date = locales
      .map((locale) => parse(trimmed, mask, new Date(), { locale }))
      .find((candidate) => isValid(candidate));
    if (!date) continue;
    // date-fns reads "25" against a `yyyy` mask as the year 25. Two-digit years
    // are ambiguous, so a stay has to spell the year out.
    if (date.getFullYear() < 1000) continue;
    if (bounds.min && date < startOfDay(bounds.min)) continue;
    if (bounds.max && date > startOfDay(bounds.max)) continue;
    return startOfDay(date);
  }
  return "invalid";
}

/** Local calendar day to `YYYY-MM-DD`, without the UTC shift `toISOString` adds. */
export function toISODate(date: Date | null | undefined): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** A stored date (midnight UTC) back to the calendar day the user picked. */
export function fromStoredDate(date: Date | null | undefined): Date | null {
  if (!date) return null;
  const value = new Date(date);
  return new Date(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  );
}
