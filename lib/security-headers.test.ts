import { describe, expect, it } from "vitest";
import {
  contentSecurityPolicy,
  STATIC_SECURITY_HEADERS,
} from "@/lib/security-headers";

const NONCE = "test-nonce-value";

function directive(policy: string, name: string): string {
  const found = policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
  if (!found) throw new Error(`missing directive: ${name}`);
  return found;
}

describe("contentSecurityPolicy", () => {
  const production = contentSecurityPolicy(NONCE, false);
  const development = contentSecurityPolicy(NONCE, true);

  it("carries the request's nonce in script-src", () => {
    expect(directive(production, "script-src")).toContain(`'nonce-${NONCE}'`);
  });

  // The whole point of the nonce: an injected inline <script> must not run.
  it("never allows inline scripts", () => {
    expect(directive(production, "script-src")).not.toContain(
      "'unsafe-inline'",
    );
    expect(directive(development, "script-src")).not.toContain(
      "'unsafe-inline'",
    );
  });

  // 'strict-dynamic' would make browsers ignore 'self', which is what allows
  // the same-origin analytics script to load. See the note in the module.
  it("does not use strict-dynamic, so 'self' keeps applying", () => {
    const scriptSrc = directive(production, "script-src");
    expect(scriptSrc).not.toContain("'strict-dynamic'");
    expect(scriptSrc).toContain("'self'");
  });

  // A nonce in style-src makes browsers drop 'unsafe-inline', and React writes
  // real style attributes that would then be blocked.
  it("allows inline styles without a nonce", () => {
    const styleSrc = directive(production, "style-src");
    expect(styleSrc).toContain("'unsafe-inline'");
    expect(styleSrc).not.toContain("nonce-");
  });

  it("locks down the directives that have no legitimate use here", () => {
    expect(directive(production, "object-src")).toBe("object-src 'none'");
    expect(directive(production, "frame-ancestors")).toBe(
      "frame-ancestors 'none'",
    );
    expect(directive(production, "base-uri")).toBe("base-uri 'self'");
    expect(directive(production, "default-src")).toBe("default-src 'self'");
  });

  it("lets the OAuth form redirect reach Google and nowhere else", () => {
    expect(directive(production, "form-action")).toBe(
      "form-action 'self' https://accounts.google.com",
    );
  });

  // Both mapbox tile hosts have to be reachable as images and as fetches: which
  // one the library picks, and how it loads a raster tile, varies by version.
  it("allows both mapbox tile hosts for images and connections", () => {
    for (const name of ["img-src", "connect-src"]) {
      const value = directive(production, name);
      expect(value).toContain("https://api.mapbox.com");
      expect(value).toContain("https://*.tiles.mapbox.com");
    }
  });

  // The events host is opt-in: see the proxy tests for the cookie that adds it.
  it("keeps Mapbox usage events out of the policy unless they are enabled", () => {
    expect(directive(production, "connect-src")).not.toContain(
      "events.mapbox.com",
    );
    const off = contentSecurityPolicy(NONCE, false, { mapboxEvents: false });
    expect(directive(off, "connect-src")).not.toContain("events.mapbox.com");
    const on = contentSecurityPolicy(NONCE, false, { mapboxEvents: true });
    expect(directive(on, "connect-src")).toContain("https://events.mapbox.com");
    expect(directive(on, "img-src")).not.toContain("events.mapbox.com");
  });

  // Unsplash is only ever called from the server.
  it("allows unsplash as an image source but not as a connection", () => {
    expect(directive(production, "img-src")).toContain(
      "https://images.unsplash.com",
    );
    expect(directive(production, "connect-src")).not.toContain("unsplash");
  });

  describe("development-only relaxations", () => {
    it("adds them in development", () => {
      expect(directive(development, "script-src")).toContain("'unsafe-eval'");
      expect(directive(development, "connect-src")).toContain("ws:");
      expect(directive(development, "script-src")).toContain(
        "https://va.vercel-scripts.com",
      );
    });

    it("keeps every one of them out of production", () => {
      expect(production).not.toContain("'unsafe-eval'");
      expect(production).not.toContain("va.vercel-scripts.com");
      expect(directive(production, "connect-src")).not.toContain("ws:");
    });

    it("upgrades insecure requests in production only", () => {
      expect(production).toContain("upgrade-insecure-requests");
      expect(development).not.toContain("upgrade-insecure-requests");
    });
  });
});

describe("STATIC_SECURITY_HEADERS", () => {
  const header = (key: string) =>
    STATIC_SECURITY_HEADERS.find((entry) => entry.key === key)?.value;

  it("sets the headers that do not vary per request", () => {
    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("X-Frame-Options")).toBe("DENY");
    expect(header("Cross-Origin-Resource-Policy")).toBe("same-origin");
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("asks for at least two years of HSTS, including subdomains", () => {
    const hsts = header("Strict-Transport-Security") ?? "";
    const maxAge = Number(hsts.match(/max-age=(\d+)/)?.[1] ?? 0);
    expect(maxAge).toBeGreaterThanOrEqual(63072000);
    expect(hsts).toContain("includeSubDomains");
  });

  // same-origin would break a popup-based OAuth provider; the isolation this
  // buys is the same for our purposes.
  it("keeps popups usable while isolating the browsing context", () => {
    expect(header("Cross-Origin-Opener-Policy")).toBe(
      "same-origin-allow-popups",
    );
  });
});
