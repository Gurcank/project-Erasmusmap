/**
 * The client address rate limiting keys on.
 *
 * Vercel overwrites `x-forwarded-for` with the real client address and drops
 * any value the client supplied, so on this deployment that header alone is
 * already trustworthy — see
 * https://vercel.com/docs/headers/request-headers. `x-vercel-forwarded-for` is
 * preferred anyway because it is the one header that survives a proxy placed
 * on top of Vercel overwriting `x-forwarded-for`, and because reading the
 * address through one helper means a move to another host (or Cloudflare in
 * front) is a change here rather than at every call site.
 */

// Only these are set by infrastructure. `x-forwarded-for` comes last: it is the
// one an untrusted client can populate on a host that does not overwrite it.
const TRUSTED_HEADERS = [
  "x-vercel-forwarded-for",
  "x-real-ip",
  "x-forwarded-for",
] as const;

/** Shared bucket for requests whose address cannot be established. */
export const UNKNOWN_CLIENT_ADDRESS = "unknown";

// Longest possible textual IPv6 address, including an IPv4 tail.
const MAX_ADDRESS_LENGTH = 45;
const ADDRESS_PATTERN = /^[0-9a-fA-F.:]+$/;

type HeaderSource =
  Headers | Record<string, string | string[] | undefined> | undefined;

function readHeader(source: HeaderSource, name: string): string | null {
  if (!source) return null;
  if (source instanceof Headers) return source.get(name);

  // NextAuth hands `authorize` a plain object whose keys are already
  // lowercased, but a stray array value is still possible.
  const value = source[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Rejects anything that is not shaped like an address so a forged header
 * cannot mint unlimited distinct rate-limit keys, which would both evade the
 * limit and grow the Redis keyspace without bound.
 */
function sanitize(candidate: string): string | null {
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.length > MAX_ADDRESS_LENGTH) return null;
  return ADDRESS_PATTERN.test(trimmed) ? trimmed : null;
}

export function getClientAddress(source: HeaderSource): string {
  for (const header of TRUSTED_HEADERS) {
    const raw = readHeader(source, header);
    if (!raw) continue;

    // Vercel sends a single address, so the split is a no-op there. Elsewhere
    // the list is client-first, proxy-last: the final entry is the only one
    // added by a hop this application actually sits behind.
    const entries = raw.split(",");
    const address = sanitize(entries[entries.length - 1] ?? "");
    if (address) return address;
  }

  return UNKNOWN_CLIENT_ADDRESS;
}
