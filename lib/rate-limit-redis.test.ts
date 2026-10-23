import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const limit = vi.hoisted(() => vi.fn());
const redisOptions = vi.hoisted(() => vi.fn());
const logError = vi.hoisted(() => vi.fn());

vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor(options: unknown) {
      redisOptions(options);
    }
  },
}));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {};
    }
    limit = limit;
  },
}));
vi.mock("@/lib/logger", () => ({ logError }));

/** The module keeps its state between calls, so each test needs a fresh one. */
async function load() {
  vi.resetModules();
  return (await import("@/lib/rate-limit")).rateLimit;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("rateLimit with Redis configured", () => {
  it("does not let the client retry an unreachable database", async () => {
    limit.mockResolvedValue({ success: true });
    const rateLimit = await load();
    await rateLimit(`k-${Math.random()}`, 5);
    expect(redisOptions).toHaveBeenCalledWith(
      expect.objectContaining({ retry: false }),
    );
  });

  it("uses Redis's answer when it gives one", async () => {
    limit.mockResolvedValueOnce({ success: false });
    limit.mockResolvedValueOnce({ success: true });
    const rateLimit = await load();
    expect(await rateLimit("a", 5)).toBe(false);
    expect(await rateLimit("a", 5)).toBe(true);
  });

  it("falls back to the in-memory window when Redis fails", async () => {
    limit.mockRejectedValue(new Error("fetch failed"));
    const rateLimit = await load();
    const key = `k-${Math.random()}`;
    expect(await rateLimit(key, 2)).toBe(true);
    expect(await rateLimit(key, 2)).toBe(true);
    expect(await rateLimit(key, 2)).toBe(false);
  });

  it("stops asking Redis for a while after a failure", async () => {
    limit.mockRejectedValue(new Error("fetch failed"));
    const rateLimit = await load();
    await rateLimit(`k-${Math.random()}`, 5);
    await rateLimit(`k-${Math.random()}`, 5);
    await rateLimit(`k-${Math.random()}`, 5);
    expect(limit).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it("asks again once the pause is over", async () => {
    vi.useFakeTimers();
    limit.mockRejectedValue(new Error("fetch failed"));
    const rateLimit = await load();
    await rateLimit("a", 5);
    vi.advanceTimersByTime(61_000);
    await rateLimit("a", 5);
    expect(limit).toHaveBeenCalledTimes(2);
  });

  it("does not wait for a Redis that never answers", async () => {
    vi.useFakeTimers();
    limit.mockReturnValue(new Promise(() => {}));
    const rateLimit = await load();
    const pending = rateLimit(`k-${Math.random()}`, 5);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toBe(true);
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
