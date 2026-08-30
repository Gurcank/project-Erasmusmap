import { z } from "zod";
import { normalizeEmail } from "@/lib/email";

/**
 * Cost factor for bcrypt. 12 is the current OWASP recommendation and costs
 * roughly a quarter second per hash on Vercel's runtime — slow enough to make
 * offline cracking of a leaked table expensive, fast enough that a sign-in
 * still feels immediate.
 */
export const BCRYPT_SALT_ROUNDS = 12;

export const PASSWORD_MIN_LENGTH = 8;

/**
 * bcrypt hashes at most 72 bytes and silently ignores the rest, so a longer
 * password is not the password the user thinks it is: anyone knowing its first
 * 72 bytes could sign in. Rejecting is the honest answer — truncating quietly
 * would weaken a password chosen to be strong.
 *
 * Counted in bytes, not characters: "ö" and "ş" cost two each in UTF-8, so a
 * Turkish passphrase reaches the ceiling sooner than its length suggests.
 */
export const PASSWORD_MAX_BYTES = 72;

/**
 * The passwords that credential-stuffing lists try first. Not a substitute for
 * a full breach corpus (that belongs behind an API such as Pwned Passwords);
 * this is the cheap half of the protection, which rejects the handful of
 * values that account for most guessed accounts without a dependency or a
 * network call on the registration path.
 */
const COMMON_PASSWORDS = new Set([
  "123456789",
  "12345678",
  "1234567890",
  "password",
  "password1",
  "password123",
  "qwerty123",
  "qwertyuiop",
  "abc12345",
  "iloveyou",
  "princess",
  "sunshine",
  "football",
  "baseball",
  "welcome1",
  "admin123",
  "letmein1",
  "monkey123",
  "superman",
  "trustno1",
  "starwars",
  "whatever",
  "computer",
  "michael1",
  "jennifer",
  "internet",
  "samsung1",
  "asdfghjkl",
  "1q2w3e4r",
  "1qaz2wsx",
  "zaq12wsx",
  "parola123",
  "sifre123",
  "sifrem123",
  "galatasaray",
  "fenerbahce",
  "besiktas1",
  "trabzonspor",
  "istanbul1",
  "türkiye123",
  "turkiye123",
]);

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * Rejects the passwords a length rule alone lets through: a known-common
 * value, a single repeated character, or the account's own address.
 * Returns null when the password is acceptable.
 */
export function getWeakPasswordReason(
  password: string,
  email?: string,
): string | null {
  const normalized = password.trim().toLowerCase();

  if (COMMON_PASSWORDS.has(normalized)) {
    return "Bu şifre çok yaygın. Daha az tahmin edilebilir bir şey seç";
  }

  if (/^(.)\1+$/.test(normalized)) {
    return "Şifre tek bir karakterin tekrarı olamaz";
  }

  if (email) {
    const localPart = normalizeEmail(email).split("@")[0];
    if (localPart.length >= 3 && normalized.includes(localPart)) {
      return "Şifre email adresini içeremez";
    }
  }

  return null;
}

export const passwordSchema = z
  .string({ error: "Email ve şifre gerekli" })
  .min(
    PASSWORD_MIN_LENGTH,
    `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı`,
  )
  .refine(
    (value) => byteLength(value) <= PASSWORD_MAX_BYTES,
    `Şifre en fazla ${PASSWORD_MAX_BYTES} bayt olabilir`,
  );
