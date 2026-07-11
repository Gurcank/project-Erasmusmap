import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const key = `test-key-${Math.random()}`;

    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3)).toBe(true);
    }
    expect(rateLimit(key, 3)).toBe(false);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-key-a-${Math.random()}`;
    const keyB = `test-key-b-${Math.random()}`;

    expect(rateLimit(keyA, 1)).toBe(true);
    expect(rateLimit(keyA, 1)).toBe(false);
    expect(rateLimit(keyB, 1)).toBe(true);
  });

  it("allows a new request once the window has passed", () => {
    const key = `test-key-window-${Math.random()}`;

    expect(rateLimit(key, 1, 10)).toBe(true);
    expect(rateLimit(key, 1, 10)).toBe(false);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(rateLimit(key, 1, 10)).toBe(true);
        resolve();
      }, 20);
    });
  });
});
