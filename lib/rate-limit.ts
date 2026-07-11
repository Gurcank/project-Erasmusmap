const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

const hits = new Map<string, number[]>();

/**
 * In-memory sliding-window rate limiter, keyed by caller-provided identifier
 * (e.g. IP or user id). Only holds per-instance state, so on serverless
 * platforms with multiple concurrent instances (e.g. Vercel) it limits per
 * instance rather than globally — use a shared store (Upstash Redis, Vercel KV)
 * for a hard guarantee under that deployment model.
 */
export function rateLimit(key: string, limit = MAX_REQUESTS_PER_WINDOW, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    hits.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return true;
}
