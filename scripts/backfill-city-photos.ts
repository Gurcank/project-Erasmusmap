import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Backfills City.imageUrl from Unsplash for the primary cities that have none.
 *
 * Only the ~1550 slugs in prisma/data/primary-city-slugs.json matter: those are
 * the cities the map links to and search returns, so they are the only ones
 * whose imageUrl is ever read (trending lists, profile favourites). The rest of
 * the City table is raw GeoNames — districts and villages nobody reaches.
 *
 * Unsplash's demo tier allows 50 requests/hour; production allows 5000. When
 * the hourly limit is hit the API returns 403, so the run stops cleanly and
 * reports how many are left — rerun later (or hourly) to continue where it
 * stopped. Cities are filled largest-population first.
 *
 * Run:  npx ts-node scripts/backfill-city-photos.ts [--delay=2000] [--limit=150]
 */

const SEARCH_ENDPOINT = "https://api.unsplash.com/search/photos";
const PRIMARY_SLUGS_PATH = path.join(
  "prisma",
  "data",
  "primary-city-slugs.json",
);

const args = process.argv.slice(2);
const readArg = (name: string): number | null => {
  const raw = args.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];
  const value = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(value) ? value : null;
};
const delayMs = readArg("delay") ?? 2000;
const limit = readArg("limit") ?? 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type PhotoResult =
  | { status: "ok"; url: string }
  | { status: "none" }
  | { status: "rate-limited" };

async function photoFor(
  cityName: string,
  accessKey: string,
): Promise<PhotoResult> {
  const url = `${SEARCH_ENDPOINT}?query=${encodeURIComponent(
    cityName,
  )}&orientation=landscape&per_page=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  if (response.status === 403 || response.status === 429) {
    return { status: "rate-limited" };
  }
  if (!response.ok) {
    console.log(`  ${cityName}: HTTP ${response.status}`);
    return { status: "none" };
  }

  const data = (await response.json()) as {
    results?: Array<{ urls?: { regular?: string } }>;
  };
  const found = data.results?.[0]?.urls?.regular;
  return found ? { status: "ok", url: found } : { status: "none" };
}

async function main() {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    throw new Error("UNSPLASH_ACCESS_KEY is not set (.env.local)");
  }

  const primarySlugs: string[] = JSON.parse(
    fs.readFileSync(PRIMARY_SLUGS_PATH, "utf8"),
  );

  const cities = await prisma.city.findMany({
    where: { slug: { in: primarySlugs }, imageUrl: null },
    select: { id: true, name: true },
    orderBy: { population: "desc" },
    ...(limit > 0 ? { take: limit } : {}),
  });

  console.log(
    `${cities.length} primary cities without a photo` +
      `${limit > 0 ? " (limited)" : ""}; ${delayMs}ms between calls`,
  );

  let filled = 0;
  let missed = 0;
  for (const [index, city] of cities.entries()) {
    const result = await photoFor(city.name, accessKey);

    if (result.status === "rate-limited") {
      console.log(
        `\nUnsplash rate limit reached after ${filled} filled. ` +
          `${cities.length - index} still to go — rerun in about an hour.`,
      );
      break;
    }

    if (result.status === "ok") {
      await prisma.city.update({
        where: { id: city.id },
        data: { imageUrl: result.url },
      });
      filled++;
    } else {
      missed++;
    }

    if (index < cities.length - 1) await sleep(delayMs);
    if ((index + 1) % 25 === 0) {
      console.log(`  … ${index + 1}/${cities.length} (${filled} filled)`);
    }
  }

  console.log(`Done: ${filled} filled, ${missed} without a result`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
