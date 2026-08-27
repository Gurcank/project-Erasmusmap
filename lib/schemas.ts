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
