/**
 * The visitor's choice about optional cookies and statistics.
 *
 * Only two things exist: the cookies the site cannot work without, which need no
 * consent and are always on, and the optional anonymous visit statistics, which
 * stay off until the visitor accepts. Nothing optional is loaded, and no request
 * is made to its provider, before that.
 *
 * The choice is stored in a cookie of its own rather than in local storage so
 * the server can read it while rendering: the statistics script is then left out
 * of the page itself, instead of being included and switched off afterwards.
 */
export const CONSENT_COOKIE = "consent";

/** Six months. A refusal is asked again after that, as is an acceptance. */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 183;

/** `null` means the visitor has not chosen yet. */
export type Consent = "granted" | "denied" | null;

/** Reads the stored value. Anything unrecognised counts as no choice made. */
export function parseConsent(value: string | undefined | null): Consent {
  return value === "granted" || value === "denied" ? value : null;
}

/**
 * The optional statistics (Vercel Analytics and Mapbox's usage events) run only
 * for a visitor who said yes.
 */
export function analyticsAllowed(consent: Consent): boolean {
  return consent === "granted";
}

/**
 * The choice in a cookie string, `document.cookie` in the browser. For code that
 * has to decide before React renders anything.
 */
export function readConsentCookie(cookieString: string): Consent {
  for (const part of cookieString.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === CONSENT_COOKIE) return parseConsent(value.join("="));
  }
  return null;
}

/** The banner shows until a choice has been made, either way. */
export function needsConsentDecision(consent: Consent): boolean {
  return consent === null;
}

/**
 * The cookie string for document.cookie. Not HttpOnly, because the page itself
 * writes it; it holds nothing but the choice. `Secure` is added on https, which
 * is everywhere except local development.
 */
export function consentCookie(granted: boolean, secure: boolean): string {
  return [
    `${CONSENT_COOKIE}=${granted ? "granted" : "denied"}`,
    `Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
    "Path=/",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

/** Records the choice in this browser. Client side only. */
export function storeConsent(granted: boolean): void {
  document.cookie = consentCookie(granted, location.protocol === "https:");
}
