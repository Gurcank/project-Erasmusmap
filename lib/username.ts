import { latinize } from "@/lib/latinize";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
// Casing is preserved for display; uniqueness is enforced on the lowercase
// mirror column, so "Ada" and "ada" cannot both be taken.
export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

const FALLBACK_USERNAME_BASE = "user";

export function getUsernameError(username: string): string | null {
  if (username.length < USERNAME_MIN_LENGTH)
    return `En az ${USERNAME_MIN_LENGTH} karakter olmalı`;
  if (username.length > USERNAME_MAX_LENGTH)
    return `En fazla ${USERNAME_MAX_LENGTH} karakter olmalı`;
  if (!USERNAME_PATTERN.test(username))
    return "Sadece harf, rakam, _ ve - kullanılabilir";
  return null;
}

/**
 * Derives a username-safe base from a display name. Latinizing first is what
 * keeps "Ömer Şahin" from becoming "-mer--ahin" — the diacritics would
 * otherwise be stripped as invalid characters rather than transliterated.
 */
export function toUsernameBase(displayName: string): string {
  const base = latinize(displayName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, USERNAME_MAX_LENGTH)
    .replace(/^-+|-+$/g, "");

  return base.length >= USERNAME_MIN_LENGTH ? base : FALLBACK_USERNAME_BASE;
}

/**
 * Appends a collision counter while keeping the result within the length
 * limit, trimming the base rather than the suffix.
 */
export function withUsernameSuffix(base: string, counter: number): string {
  const suffix = `-${counter}`;
  const trimmed = base
    .slice(0, USERNAME_MAX_LENGTH - suffix.length)
    .replace(/-+$/g, "");
  return `${trimmed}${suffix}`;
}
