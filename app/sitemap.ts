import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

// Built on request, not at build time: the city list lives in the database, and
// a build without database access (CI, a fresh preview) must not fail on it.
// Crawlers fetch it rarely, so a query per request is not a cost worth caching.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cities = await prisma.city.findMany({
    select: { slug: true, updatedAt: true },
  });

  const cityEntries: MetadataRoute.Sitemap = cities.map((city) => ({
    url: `${SITE_URL}/c/${city.slug}`,
    lastModified: city.updatedAt,
  }));

  return [
    { url: SITE_URL, lastModified: new Date() },
    { url: `${SITE_URL}/login`, lastModified: new Date() },
    ...cityEntries,
  ];
}
