/**
 * The avatars a person can pick from. There are no uploaded photos: a photo is
 * personal data that has to be stored, moderated and eventually deleted, and
 * this site has no need of one.
 *
 * What is stored on the user is only the key. Anything not in this list is
 * rejected on write and ignored on read, so a stray value can never reach the
 * renderer.
 */
export const AVATAR_KEYS = [
  "traveler",
  "cyclist",
  "reader",
  "photographer",
  "waver",
  "runner",
  "hiker",
  "coffee",
  "listener",
  "suitcase",
  "flag",
  "dancer",
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

export function isAvatarKey(value: unknown): value is AvatarKey {
  return (
    typeof value === "string" &&
    (AVATAR_KEYS as readonly string[]).includes(value)
  );
}

/** FNV-1a: small, stable across runtimes, and spreads short ids well enough. */
function hash(seed: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/**
 * The avatar a person has until they choose one. Derived from the id, so it is
 * the same on every page and every visit without a row having to store it.
 */
export function defaultAvatarKey(seed: string): AvatarKey {
  return AVATAR_KEYS[hash(seed) % AVATAR_KEYS.length];
}

export function resolveAvatarKey(
  avatar: string | null | undefined,
  seed: string,
): AvatarKey {
  return isAvatarKey(avatar) ? avatar : defaultAvatarKey(seed);
}
