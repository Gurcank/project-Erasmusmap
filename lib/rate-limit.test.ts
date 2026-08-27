import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

// No Upstash credentials in the test environment, so these exercise the
// in-memory fallback path.
describe("rateLimit", () => {
  it("allows requests up to the limit and blocks the next one", async () => {
    const key = `test-key-${Math.random()}`;

    for (let i = 0; i < 3; i++) {
      expect(await rateLimit(key, 3)).toBe(true);
    }
    expect(await rateLimit(key, 3)).toBe(false);
  });

  it("tracks separate keys independently", async () => {
    const keyA = `test-key-a-${Math.random()}`;
    const keyB = `test-key-b-${Math.random()}`;

    expect(await rateLimit(keyA, 1)).toBe(true);
    expect(await rateLimit(keyA, 1)).toBe(false);
    expect(await rateLimit(keyB, 1)).toBe(true);
  });

  it("allows a new request once the window has passed", async () => {
    const key = `test-key-window-${Math.random()}`;

    expect(await rateLimit(key, 1, 10)).toBe(true);
    expect(await rateLimit(key, 1, 10)).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(await rateLimit(key, 1, 10)).toBe(true);
  });
});
