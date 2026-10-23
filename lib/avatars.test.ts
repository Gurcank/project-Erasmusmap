import { describe, expect, it } from "vitest";
import {
  AVATAR_KEYS,
  defaultAvatarKey,
  isAvatarKey,
  resolveAvatarKey,
} from "@/lib/avatars";
import { avatarNames } from "@/lib/translations/avatars";
import { OFFERED_LANGUAGES } from "@/lib/i18n";

describe("isAvatarKey", () => {
  it("accepts every key in the list", () => {
    for (const key of AVATAR_KEYS) expect(isAvatarKey(key)).toBe(true);
  });

  it("rejects anything else, including look-alikes and non-strings", () => {
    for (const value of [
      "",
      "Traveler",
      "traveler ",
      "../traveler",
      "<script>",
      "constructor",
      "__proto__",
      null,
      undefined,
      42,
      {},
      ["traveler"],
    ]) {
      expect(isAvatarKey(value)).toBe(false);
    }
  });
});

describe("defaultAvatarKey", () => {
  it("is the same for the same id every time", () => {
    const id = "3f1c0f5e-7a4e-4f3a-9e0e-0c6f6f3a2b11";
    expect(defaultAvatarKey(id)).toBe(defaultAvatarKey(id));
  });

  it("always returns a key from the list", () => {
    for (let i = 0; i < 200; i++) {
      expect(isAvatarKey(defaultAvatarKey(`user-${i}`))).toBe(true);
    }
  });

  it("uses every avatar across a realistic spread of ids", () => {
    const seen = new Set(
      Array.from({ length: 500 }, (_, i) => defaultAvatarKey(`id-${i}`)),
    );
    expect(seen.size).toBe(AVATAR_KEYS.length);
  });

  it("copes with an empty seed", () => {
    expect(isAvatarKey(defaultAvatarKey(""))).toBe(true);
  });
});

describe("resolveAvatarKey", () => {
  it("returns the stored key when it is valid", () => {
    expect(resolveAvatarKey("hiker", "any-id")).toBe("hiker");
  });

  it("falls back to the derived default for null, unknown or tampered values", () => {
    const expected = defaultAvatarKey("any-id");
    expect(resolveAvatarKey(null, "any-id")).toBe(expected);
    expect(resolveAvatarKey(undefined, "any-id")).toBe(expected);
    expect(resolveAvatarKey("https://evil.example/x.png", "any-id")).toBe(
      expected,
    );
  });
});

describe("avatar names", () => {
  it("name every avatar in every offered language", () => {
    for (const { code } of OFFERED_LANGUAGES) {
      for (const key of AVATAR_KEYS) {
        expect(avatarNames[code][key]?.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
