import { z } from "zod";
import { MAX_BIO_LENGTH } from "@/lib/profile";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "@/lib/username";

export const NAME_MAX_LENGTH = 100;
export const LOCATION_MAX_LENGTH = 80;

export const bioSchema = z
  .string({ error: "Geçersiz bio" })
  .trim()
  .max(MAX_BIO_LENGTH, `Bio en fazla ${MAX_BIO_LENGTH} karakter olabilir`);

// The display name is optional — a fresh account has none — so empty is a
// valid value that clears it rather than an error.
export const nameSchema = z
  .string({ error: "Geçersiz ad" })
  .trim()
  .max(NAME_MAX_LENGTH, `Ad en fazla ${NAME_MAX_LENGTH} karakter olabilir`);

// Free-text location shown on the profile. Optional; empty clears it.
export const locationSchema = z
  .string({ error: "Geçersiz konum" })
  .trim()
  .max(
    LOCATION_MAX_LENGTH,
    `Konum en fazla ${LOCATION_MAX_LENGTH} karakter olabilir`,
  );

export const usernameSchema = z
  .string({ error: "Kullanıcı adı gerekli" })
  .trim()
  .min(USERNAME_MIN_LENGTH, `En az ${USERNAME_MIN_LENGTH} karakter olmalı`)
  .max(USERNAME_MAX_LENGTH, `En fazla ${USERNAME_MAX_LENGTH} karakter olmalı`)
  .regex(USERNAME_PATTERN, "Sadece harf, rakam, _ ve - kullanılabilir");

export const visitSchema = z.object({
  cityId: z.string({ error: "Invalid cityId" }).min(1, "Invalid cityId"),
});

export const usernameRequestSchema = z.object({
  username: usernameSchema,
});

/**
 * Parses a JSON request body. Covers both malformed JSON (which arrives as
 * null) and schema failures, so callers never leak Zod's English defaults for
 * a body that is not even an object.
 */
export function parseRequestBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  if (body === null || typeof body !== "object") {
    return { ok: false, error: "Geçersiz istek" };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: firstIssueMessage(result.error) };
  }

  return { ok: true, data: result.data };
}

/**
 * Reduces a Zod failure to the single message the UI shows. The forms here
 * surface one error at a time, so the first issue is the useful one.
 */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri";
}

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const EARLIEST_YEAR = 1950;

/**
 * Parses the two date fields of the visit form, each a `YYYY-MM-DD` string from
 * the range calendar. Both are optional, and clearing them is how a user
 * removes the dates, so empty is a valid value rather than an error.
 */
export function parseVisitDates(
  formData: FormData,
):
  | { ok: true; data: { startDate: Date | null; endDate: Date | null } }
  | { ok: false; error: string } {
  const read = (field: string): string =>
    String(formData.get(field) ?? "").trim();

  const toDate = (value: string): Date | null | "invalid" => {
    if (!value) return null;
    if (!DATE_PATTERN.test(value)) return "invalid";
    // Anchor the day at midnight UTC so the stored @db.Date does not shift
    // across time zones. The calendar reports the day the user picked in their
    // own locale, so no further conversion is wanted.
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return "invalid";
    // A YYYY-MM-DD that passed the pattern but names a day the month lacks
    // (2025-02-30) rolls over — reject it rather than store the wrong day.
    if (date.toISOString().slice(0, 10) !== value) return "invalid";
    if (date.getUTCFullYear() < EARLIEST_YEAR) return "invalid";
    if (date.getUTCFullYear() > new Date().getUTCFullYear() + 10)
      return "invalid";
    return date;
  };

  const startDate = toDate(read("startDate"));
  const endDate = toDate(read("endDate"));

  if (startDate === "invalid" || endDate === "invalid") {
    return { ok: false, error: "Geçerli bir tarih seç" };
  }
  if (startDate && endDate && startDate > endDate) {
    return { ok: false, error: "Başlangıç tarihi bitişten sonra olamaz" };
  }

  return { ok: true, data: { startDate, endDate } };
}
