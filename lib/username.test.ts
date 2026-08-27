import { describe, expect, it } from "vitest";
import {
  getUsernameError,
  toUsernameBase,
  withUsernameSuffix,
  USERNAME_MAX_LENGTH,
} from "./username";

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

  it("accepts mixed case, since display casing is preserved", () => {
    expect(getUsernameError("GurcanK")).toBeNull();
    expect(getUsernameError("Ada_Lovelace-1")).toBeNull();
  });

  it("rejects characters outside letters, digits, underscore and dash", () => {
    expect(getUsernameError("gurcan k")).toMatch(/Sadece harf/i);
    expect(getUsernameError("gurcan@k")).toMatch(/Sadece harf/i);
    expect(getUsernameError("gürcan")).toMatch(/Sadece harf/i);
  });
});

describe("toUsernameBase", () => {
  it("transliterates diacritics instead of dropping them", () => {
    expect(toUsernameBase("Ömer Şahin")).toBe("omer-sahin");
    expect(toUsernameBase("Łukasz Nowak")).toBe("lukasz-nowak");
  });

  it("collapses separators and trims leading/trailing dashes", () => {
    expect(toUsernameBase("  John   Doe  ")).toBe("john-doe");
    expect(toUsernameBase("!!!Ana!!!")).toBe("ana");
  });

  it("stays within the length limit without a trailing dash", () => {
    const base = toUsernameBase("a".repeat(30) + " b");
    expect(base.length).toBeLessThanOrEqual(USERNAME_MAX_LENGTH);
    expect(base.endsWith("-")).toBe(false);
  });

  it("falls back when nothing usable remains", () => {
    expect(toUsernameBase("")).toBe("user");
    expect(toUsernameBase("!!")).toBe("user");
  });

  it("always produces a value the validator accepts", () => {
    for (const name of ["Ömer Şahin", "", "!!", "Łukasz", "a".repeat(40)]) {
      expect(getUsernameError(toUsernameBase(name))).toBeNull();
    }
  });
});

describe("withUsernameSuffix", () => {
  it("appends the counter", () => {
    expect(withUsernameSuffix("john-doe", 2)).toBe("john-doe-2");
  });

  it("trims the base rather than the suffix to fit the limit", () => {
    const result = withUsernameSuffix("a".repeat(USERNAME_MAX_LENGTH), 12);
    expect(result).toHaveLength(USERNAME_MAX_LENGTH);
    expect(result.endsWith("-12")).toBe(true);
  });
});
