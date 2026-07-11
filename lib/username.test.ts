import { describe, expect, it } from "vitest";
import { getUsernameError } from "./username";

describe("getUsernameError", () => {
  it("accepts a valid username", () => {
    expect(getUsernameError("gurcan_k-1")).toBeNull();
  });

  it("rejects usernames shorter than the minimum length", () => {
    expect(getUsernameError("ab")).toMatch(/en az/i);
  });

  it("rejects usernames longer than the maximum length", () => {
    expect(getUsernameError("a".repeat(21))).toMatch(/en fazla/i);
  });

  it("rejects uppercase letters and other invalid characters", () => {
    expect(getUsernameError("Gurcan")).toMatch(/küçük harf/i);
    expect(getUsernameError("gurcan k")).toMatch(/küçük harf/i);
    expect(getUsernameError("gurcan@k")).toMatch(/küçük harf/i);
  });
});
