import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logError } from "@/lib/logger";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

// A limiter that makes the visitor wait is worse than a weaker one. Redis gets
// this long to answer; past it the request goes on with the in-memory window.
const REDIS_TIMEOUT_MS = 1000;
// After a failure Redis is not asked again for this long, so an outage costs one
// slow request a minute instead of one on every request.
const REDIS_COOLDOWN_MS = 60_000;

const memoryHits = new Map<string, number[]>();
let redisDownUntil = 0;

/**
 * Per-instance sliding window. Only a stopgap: on serverless platforms each
 * concurrent instance keeps its own counters, so the effective limit is
 * multiplied by the number of running instances.
 */
function inMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const timestamps = (memoryHits.get(key) ?? []).filter(
    (timestamp) => now - timestamp < windowMs,
  );

  if (timestamps.length >= limit) {
    memoryHits.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  memoryHits.set(key, timestamps);
  return true;
}

// undefined = not resolved yet, null = not configured.
let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  // No retries: the client's default is five attempts with a growing pause, about
  // four seconds of waiting before it gives up on an unreachable database, and
  // every server action pays that before it does anything else.
  redisClient = url && token ? new Redis({ url, token, retry: false }) : null;

  if (!redisClient && process.env.NODE_ENV === "production") {
    // Each serverless instance would keep its own counters, so the limits
    // below are far weaker than they read. Say so once rather than silently.
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL / _TOKEN are not set: falling back to a per-instance in-memory limiter.",
    );
  }

  return redisClient;
}

const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cacheKey = `${limit}:${windowMs}`;
  let limiter = limiters.get(cacheKey);

  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: "erasmusmap/ratelimit",
    });
    limiters.set(cacheKey, limiter);
  }

  return limiter;
}

/**
 * Shared sliding-window rate limiter keyed by a caller-provided identifier
 * (IP or user email). Uses Upstash Redis when configured so the limit holds
 * across serverless instances, and falls back to the in-memory window for
 * local development or a Redis outage.
 */
export async function rateLimit(
  key: string,
  limit = MAX_REQUESTS_PER_WINDOW,
  windowMs = WINDOW_MS,
): Promise<boolean> {
  if (Date.now() < redisDownUntil) {
    return inMemoryRateLimit(key, limit, windowMs);
  }
  const limiter = getLimiter(limit, windowMs);
  if (!limiter) return inMemoryRateLimit(key, limit, windowMs);

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { success } = await Promise.race([
      limiter.limit(key),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Rate limiter timed out")),
          REDIS_TIMEOUT_MS,
        );
      }),
    ]);
    return success;
  } catch (error) {
    // A Redis outage must degrade to weaker limiting, not lock everyone out and
    // not make everyone wait.
    redisDownUntil = Date.now() + REDIS_COOLDOWN_MS;
    logError(
      "Rate limiter unreachable, using the in-memory window for a minute",
      error,
      { component: "rate-limit" },
    );
    return inMemoryRateLimit(key, limit, windowMs);
  } finally {
    clearTimeout(timer);
  }
}
