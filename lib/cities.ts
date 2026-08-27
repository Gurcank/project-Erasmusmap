import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { City } from "@/types";

const CITY_LIST_REVALIDATE_SECONDS = 3600;

/**
 * Every city with its coordinates, for the map. Seed-time data that changes
 * only on a re-seed, so it is cached once and shared by the map surfaces
 * instead of a findMany per request.
 */
export const getCities = unstable_cache(
  async (): Promise<City[]> =>
    prisma.city.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        country: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { name: "asc" },
    }),
  ["city-list"],
  { revalidate: CITY_LIST_REVALIDATE_SECONDS, tags: ["cities"] },
);
