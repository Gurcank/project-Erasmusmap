import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cityFind = vi.hoisted(() => vi.fn());
const tripFind = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { city: { findMany: cityFind }, trip: { findMany: tripFind } },
}));

import primarySlugs from "@/prisma/data/primary-city-slugs.json";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/site";

const day = new Date("2026-10-01T00:00:00Z");

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.resetAllMocks();
  cityFind.mockResolvedValue([{ slug: "berlin", updatedAt: day }]);
  tripFind.mockResolvedValue([{ id: "trip-1", updatedAt: day }]);
});

describe("sitemap and the legal pages", () => {
  it("lists them where they may be shown", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain(`${SITE_URL}/privacy`);
    expect(urls).toContain(`${SITE_URL}/terms`);
  });

  it("leaves them out on production while they are withheld", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).not.toContain(`${SITE_URL}/privacy`);
    expect(urls).not.toContain(`${SITE_URL}/terms`);
  });
});

describe("sitemap", () => {
  it("lists the map, the square, the cities and the public plans", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain(SITE_URL);
    expect(urls).toContain(`${SITE_URL}/meydan`);
    expect(urls).toContain(`${SITE_URL}/c/berlin`);
    expect(urls).toContain(`${SITE_URL}/trips/trip-1`);
  });

  it("leaves out the sign-in form, which is not a page to land on", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).not.toContain(`${SITE_URL}/login`);
  });

  it("asks only for the cities the product shows", async () => {
    await sitemap();
    expect(cityFind.mock.calls[0][0].where).toEqual({
      slug: { in: primarySlugs },
    });
  });

  it("asks only for public plans, so a private plan is never listed", async () => {
    await sitemap();
    expect(tripFind.mock.calls[0][0].where).toEqual({ visibility: "PUBLIC" });
  });

  it("bounds the plans it lists, newest first", async () => {
    await sitemap();
    const args = tripFind.mock.calls[0][0];
    expect(args.take).toBeGreaterThan(0);
    expect(args.take).toBeLessThanOrEqual(5000);
    expect(args.orderBy).toEqual({ updatedAt: "desc" });
  });

  it("never lists a profile, an account page or the admin panel", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    for (const url of urls) {
      expect(url).not.toMatch(/\/(u|admin|account|settings|api)(\/|$)/);
    }
  });

  it("stays within the 50 000 URLs one sitemap may hold", async () => {
    cityFind.mockResolvedValue(
      Array.from({ length: primarySlugs.length }, (_, i) => ({
        slug: `c-${i}`,
        updatedAt: day,
      })),
    );
    tripFind.mockResolvedValue(
      Array.from({ length: 5000 }, (_, i) => ({
        id: `t-${i}`,
        updatedAt: day,
      })),
    );
    expect((await sitemap()).length).toBeLessThan(50_000);
  });
});
