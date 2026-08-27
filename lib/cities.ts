import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { City } from "@/types";

const CITY_LIST_REVALIDATE_SECONDS = 3600;

/**
 * The city list is seed-time data that changes only on a re-seed, yet the home
 * map, every city page and the navbar search all need it. Cached once and
 * shared instead of a findMany on each request.
 */
export const getCities = unstable_cache(
  async (): Promise<City[]> =>
    prisma.city.findMany({
      select: { id: true, name: true, slug: true, country: true },
      orderBy: { name: "asc" },
    }),
  ["city-list"],
  { revalidate: CITY_LIST_REVALIDATE_SECONDS, tags: ["cities"] },
);
