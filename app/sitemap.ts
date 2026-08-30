import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

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
