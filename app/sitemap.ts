import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import primarySlugList from "@/prisma/data/primary-city-slugs.json";

// Built on request, not at build time: the city list lives in the database, and
// a build without database access (CI, a fresh preview) must not fail on it.
// Crawlers fetch it rarely, so a query per request is not a cost worth caching.
export const dynamic = "force-dynamic";

// The sitemap protocol allows 50 000 URLs in one file. Cities are bounded by the
// primary list; trips are not, so the newest are listed and the rest wait for a
// sitemap index, which is not worth building until there are that many.
const MAX_TRIP_ENTRIES = 5000;

const PRIMARY_SLUGS = primarySlugList as string[];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, trips] = await Promise.all([
    // Only the cities the product shows. The table can also hold the rest of the
    // GeoNames dump, which nothing links to and which should not be crawled.
    prisma.city.findMany({
      where: { slug: { in: PRIMARY_SLUGS } },
      select: { slug: true, updatedAt: true },
    }),
    // A plan is listed only if its owner made it public. A private plan is not
    // reachable by anyone else, and its page is marked noindex anyway.
    prisma.trip.findMany({
      where: { visibility: "PUBLIC" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: MAX_TRIP_ENTRIES,
    }),
  ]);

  const cityEntries: MetadataRoute.Sitemap = cities.map((city) => ({
    url: `${SITE_URL}/c/${city.slug}`,
    lastModified: city.updatedAt,
  }));

  const tripEntries: MetadataRoute.Sitemap = trips.map((trip) => ({
    url: `${SITE_URL}/trips/${trip.id}`,
    lastModified: trip.updatedAt,
  }));

  return [
    { url: SITE_URL, lastModified: new Date() },
    { url: `${SITE_URL}/meydan`, lastModified: new Date() },
    { url: `${SITE_URL}/login`, lastModified: new Date() },
    ...cityEntries,
    ...tripEntries,
  ];
}
