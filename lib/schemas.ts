import { z } from "zod";
import { MAX_BIO_LENGTH } from "@/lib/profile";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "@/lib/username";

export const PASSWORD_MIN_LENGTH = 8;
export const NAME_MAX_LENGTH = 100;

export const bioSchema = z
  .string({ error: "Geçersiz bio" })
  .trim()
  .max(MAX_BIO_LENGTH, `Bio en fazla ${MAX_BIO_LENGTH} karakter olabilir`);

export const usernameSchema = z
  .string({ error: "Kullanıcı adı gerekli" })
  .trim()
  .min(USERNAME_MIN_LENGTH, `En az ${USERNAME_MIN_LENGTH} karakter olmalı`)
  .max(USERNAME_MAX_LENGTH, `En fazla ${USERNAME_MAX_LENGTH} karakter olmalı`)
  .regex(USERNAME_PATTERN, "Sadece harf, rakam, _ ve - kullanılabilir");

export const registerSchema = z.object({
  name: z
    .string({ error: "Geçersiz ad" })
    .trim()
    .max(NAME_MAX_LENGTH, `Ad en fazla ${NAME_MAX_LENGTH} karakter olabilir`)
    .optional()
    .default(""),
  email: z
    .string({ error: "Email ve şifre gerekli" })
    .trim()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Geçerli bir email adresi gir"),
  password: z
    .string({ error: "Email ve şifre gerekli" })
    .min(
      PASSWORD_MIN_LENGTH,
      `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı`,
    ),
});

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

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const EARLIEST_YEAR = 1950;

/**
 * Parses the two `<input type="month">` fields of the visit form. Both are
 * optional, and clearing them is how a user removes the dates, so empty is a
 * valid value rather than an error.
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
    if (!MONTH_PATTERN.test(value)) return "invalid";
    // Month inputs give YYYY-MM; anchor to the first of the month in UTC so the
    // stored date does not shift by a day across time zones.
    const date = new Date(`${value}-01T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return "invalid";
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
