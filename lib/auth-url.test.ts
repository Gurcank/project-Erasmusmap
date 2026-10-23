import { describe, expect, it } from "vitest";
import { authUrlOverride } from "@/lib/auth-url";

const SITE = "https://erasmusmap.vercel.app";
const production = { VERCEL_ENV: "production" };

describe("authUrlOverride", () => {
  // The case that stopped sign-in: the variable copied over with its local value.
  it("replaces a loopback address on production", () => {
    for (const url of [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://[::1]:3000",
    ]) {
      expect(authUrlOverride({ ...production, NEXTAUTH_URL: url }, SITE)).toBe(
        SITE,
      );
    }
  });

  it("fills in a missing or unusable value on production", () => {
    expect(authUrlOverride(production, SITE)).toBe(SITE);
    expect(authUrlOverride({ ...production, NEXTAUTH_URL: "  " }, SITE)).toBe(
      SITE,
    );
    expect(
      authUrlOverride({ ...production, NEXTAUTH_URL: "not a url" }, SITE),
    ).toBe(SITE);
  });

  it("keeps a real address on production", () => {
    expect(
      authUrlOverride(
        { ...production, NEXTAUTH_URL: "https://erasmusmap.com" },
        SITE,
      ),
    ).toBeNull();
  });

  it("leaves every other environment alone", () => {
    for (const env of [
      { NEXTAUTH_URL: "http://localhost:3000" },
      { VERCEL_ENV: "preview", NEXTAUTH_URL: "http://localhost:3000" },
      { VERCEL_ENV: "development", NEXTAUTH_URL: "http://localhost:3000" },
      {},
    ]) {
      expect(authUrlOverride(env, SITE)).toBeNull();
    }
  });
});
