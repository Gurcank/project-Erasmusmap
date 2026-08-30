/**
 * Canonical form of an address, used for every lookup and for the stored
 * value.
 *
 * Without this, `Ali@example.com` and `ali@example.com` are two accounts: the
 * credentials lookup is case sensitive, so whoever registered with capitals
 * cannot sign in with lowercase, and Google — which reports the address
 * lowercased — opens a second account instead of matching the first.
 *
 * Only case and surrounding space are normalized. Provider-specific rules
 * (Gmail's dots, `+` tags) are deliberately left alone: they are not
 * universal, and folding them would merge addresses their owners consider
 * distinct.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
