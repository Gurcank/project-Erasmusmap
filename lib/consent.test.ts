import { describe, expect, it } from "vitest";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  analyticsAllowed,
  consentCookie,
  needsConsentDecision,
  parseConsent,
  readConsentCookie,
} from "@/lib/consent";

describe("parseConsent", () => {
  it("reads the two valid values", () => {
    expect(parseConsent("granted")).toBe("granted");
    expect(parseConsent("denied")).toBe("denied");
  });

  it("treats a missing, empty or unrecognised value as no choice", () => {
    for (const value of [
      undefined,
      null,
      "",
      "true",
      "1",
      "GRANTED",
      "granted ",
      "granted; denied",
      "yes",
    ]) {
      expect(parseConsent(value)).toBeNull();
    }
  });
});

describe("readConsentCookie", () => {
  it("finds the choice among other cookies", () => {
    expect(readConsentCookie("a=1; consent=granted; b=2")).toBe("granted");
    expect(readConsentCookie("consent=denied")).toBe("denied");
  });

  it("returns no choice when the cookie is absent, empty or not ours", () => {
    for (const value of [
      "",
      "a=1",
      "xconsent=granted",
      "consent=",
      "consent=maybe",
    ]) {
      expect(readConsentCookie(value)).toBeNull();
    }
  });
});

describe("what the choice allows", () => {
  it("loads statistics only after an explicit yes", () => {
    expect(analyticsAllowed("granted")).toBe(true);
    expect(analyticsAllowed("denied")).toBe(false);
    expect(analyticsAllowed(null)).toBe(false);
  });

  it("asks until a choice has been made, either way", () => {
    expect(needsConsentDecision(null)).toBe(true);
    expect(needsConsentDecision("granted")).toBe(false);
    expect(needsConsentDecision("denied")).toBe(false);
  });

  it("does not load statistics while the banner is still showing", () => {
    for (const consent of ["granted", "denied", null] as const) {
      expect(analyticsAllowed(consent) && needsConsentDecision(consent)).toBe(
        false,
      );
    }
  });
});

describe("consentCookie", () => {
  it("records the choice for about six months, site-wide, same-site", () => {
    const cookie = consentCookie(true, false);
    expect(cookie).toContain(`${CONSENT_COOKIE}=granted`);
    expect(cookie).toContain(`Max-Age=${CONSENT_MAX_AGE_SECONDS}`);
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("SameSite=Lax");
    expect(CONSENT_MAX_AGE_SECONDS).toBeGreaterThan(60 * 60 * 24 * 150);
    expect(CONSENT_MAX_AGE_SECONDS).toBeLessThanOrEqual(60 * 60 * 24 * 183);
  });

  it("writes a refusal as plainly as an acceptance", () => {
    expect(consentCookie(false, false)).toContain(`${CONSENT_COOKIE}=denied`);
  });

  it("adds Secure only over https", () => {
    expect(consentCookie(true, true)).toContain("Secure");
    expect(consentCookie(true, false)).not.toContain("Secure");
  });

  it("round-trips through the parser", () => {
    for (const granted of [true, false]) {
      const value = consentCookie(granted, true).split(";")[0].split("=")[1];
      expect(parseConsent(value)).toBe(granted ? "granted" : "denied");
    }
  });
});
