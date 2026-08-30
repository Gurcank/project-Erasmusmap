import { afterEach, describe, expect, it, vi } from "vitest";

const FALLBACK = "https://erasmusmap.vercel.app";
const originalValue = process.env.NEXT_PUBLIC_SITE_URL;

/** The value is read at module load, so each case needs a fresh import. */
async function siteUrlWith(value: string | undefined): Promise<string> {
  if (value === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = value;

  vi.resetModules();
  const { SITE_URL } = await import("@/lib/site");
  return SITE_URL;
}

afterEach(() => {
  if (originalValue === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalValue;
  vi.resetModules();
});

describe("SITE_URL", () => {
  it("uses a configured origin", async () => {
    expect(await siteUrlWith("https://erasmusmap.com")).toBe(
      "https://erasmusmap.com",
    );
  });

  it("keeps a port, which local development needs", async () => {
    expect(await siteUrlWith("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });

  it("drops a trailing slash so joined paths do not double up", async () => {
    expect(await siteUrlWith("https://erasmusmap.com/")).toBe(
      "https://erasmusmap.com",
    );
  });

  it("falls back when the variable is absent", async () => {
    expect(await siteUrlWith(undefined)).toBe(FALLBACK);
  });

  // The case that failed a production build: a variable that exists but holds
  // nothing reached new URL("") and threw.
  it("falls back when the variable is defined but empty", async () => {
    expect(await siteUrlWith("")).toBe(FALLBACK);
    expect(await siteUrlWith("   ")).toBe(FALLBACK);
  });

  it("falls back on a value that is not a URL", async () => {
    expect(await siteUrlWith("erasmusmap.com")).toBe(FALLBACK);
    expect(await siteUrlWith("not a url")).toBe(FALLBACK);
  });
});
