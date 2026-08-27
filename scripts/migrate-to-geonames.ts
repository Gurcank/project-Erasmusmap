import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

import { PrismaClient } from "@prisma/client";
import cities from "../prisma/data/cities.json";

const prisma = new PrismaClient();

/**
 * One-off migration from the NUTS region list to real cities.
 *
 * NUTS is an administrative division system, not a city list: it named regions
 * ("Yvelines", "Thüringen") that no Erasmus student searches for, and mangled
 * the ones it did contain ("München, Kreisfreie Stadt"). This seeds the
 * GeoNames list, moves reviews and visits from each legacy region to the city
 * it corresponds to, and removes what is left.
 *
 * Reviews and visits attached to a region with no city equivalent are deleted:
 * guessing a city for them would be inventing data.
 *
 * Ordering matters. Hundreds of legacy rows already occupy the slugs the new
 * cities need ("canakkale" was both a NUTS region and is a GeoNames city), so
 * the legacy rows have to be moved out of the way before seeding, not after.
 *
 * Run with:  npx ts-node scripts/migrate-to-geonames.ts [--apply]
 * Without --apply it only reports what it would do.
 */

const CHUNK_SIZE = 200;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ł/g, "l")
    .replace(/đ/g, "d")
    .replace(/ß/g, "ss")
    .replace(/ø/g, "o")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type Candidate = { geonameId: number; name: string; country: string };

/** Index every seed city by its name and by each of its aliases. */
function buildIndex(): Map<string, Candidate[]> {
  const index = new Map<string, Candidate[]>();

  for (const city of cities) {
    const entry = {
      geonameId: city.geonameId,
      name: city.name,
      country: city.country,
    };
    for (const key of [
      normalize(city.name),
      ...city.searchAliases.map(normalize),
    ]) {
      if (!key) continue;
      const bucket = index.get(key);
      if (bucket) bucket.push(entry);
      else index.set(key, [entry]);
    }
  }

  return index;
}

/**
 * Resolves a legacy region name to a city. Falls back to a word-level match so
 * "Hlavní město Praha" still finds Praha, which an exact lookup misses.
 */
function resolve(
  index: Map<string, Candidate[]>,
  legacyName: string,
  legacyCountry: string,
): Candidate | null {
  const key = normalize(legacyName);

  const pick = (candidates: Candidate[]): Candidate | null => {
    if (!candidates.length) return null;
    const sameCountry = candidates.filter((c) => c.country === legacyCountry);
    return (sameCountry.length ? sameCountry : candidates)[0];
  };

  const exact = pick(index.get(key) ?? []);
  if (exact) return exact;

  // Longest word first, so "praha" is tried before "mesto".
  const words = key.split(" ").filter((word) => word.length >= 4);
  words.sort((a, b) => b.length - a.length);
  for (const word of words) {
    const match = pick(index.get(word) ?? []);
    if (match) return match;
  }

  return null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(
    apply ? "Applying migration…\n" : "Dry run (pass --apply to commit)\n",
  );

  const legacy = await prisma.city.findMany({
    where: { geonameId: null },
    select: {
      id: true,
      name: true,
      country: true,
      _count: { select: { reviews: true, visits: true } },
    },
  });

  const inUse = legacy.filter(
    (city) => city._count.reviews > 0 || city._count.visits > 0,
  );
  console.log(`Legacy cities: ${legacy.length} (${inUse.length} carry data)\n`);

  const index = buildIndex();
  const plan = inUse.map((city) => ({
    city,
    match: resolve(index, city.name, city.country),
  }));

  for (const { city, match } of plan) {
    const counts = `${city._count.reviews} review(s), ${city._count.visits} visit(s)`;
    if (match) {
      console.log(
        `  MOVE  "${city.name}" (${city.country}) -> "${match.name}"  (${counts})`,
      );
    } else {
      console.log(
        `  DROP  "${city.name}" (${city.country}) — no city equivalent; ${counts} will be deleted`,
      );
    }
  }

  if (!apply) {
    const dropped = plan.filter((entry) => !entry.match);
    console.log(
      `\nWould drop ${dropped.reduce((n, e) => n + e.city._count.reviews, 0)} review(s) ` +
        `and ${dropped.reduce((n, e) => n + e.city._count.visits, 0)} visit(s) with no city equivalent.` +
        `\nWould remove ${legacy.length} legacy cities.`,
    );
    return;
  }

  // 1. Free the slugs the new cities need. Legacy rows that carry data have to
  //    survive until their reviews are moved, so they are parked on a prefixed
  //    slug rather than deleted.
  for (const { city } of plan) {
    await prisma.city.update({
      where: { id: city.id },
      data: { slug: `legacy-${city.id}` },
    });
  }

  // 2. Legacy rows with no data can go immediately.
  const emptyRemoved = await prisma.city.deleteMany({
    where: {
      geonameId: null,
      id: { notIn: plan.map((entry) => entry.city.id) },
    },
  });
  console.log(`\nRemoved ${emptyRemoved.count} empty legacy cities.`);

  // 3. Seed, now that no slug is taken.
  let inserted = 0;
  for (let start = 0; start < cities.length; start += CHUNK_SIZE) {
    const result = await prisma.city.createMany({
      data: cities.slice(start, start + CHUNK_SIZE),
      skipDuplicates: true,
    });
    inserted += result.count;
  }
  console.log(`Seeded ${inserted} GeoNames cities.`);

  // 4. Move the data across.
  let movedReviews = 0;
  let movedVisits = 0;

  for (const { city, match } of plan) {
    if (!match) continue;

    const target = await prisma.city.findUnique({
      where: { geonameId: match.geonameId },
      select: { id: true },
    });
    if (!target) throw new Error(`Seeded city missing: ${match.name}`);

    // Rows that would violate one-review-per-user-per-city are left behind and
    // removed with the legacy row.
    for (const review of await prisma.review.findMany({
      where: { cityId: city.id },
      select: { id: true, userId: true },
    })) {
      const clash = await prisma.review.findFirst({
        where: { cityId: target.id, userId: review.userId },
        select: { id: true },
      });
      if (clash) continue;
      await prisma.review.update({
        where: { id: review.id },
        data: { cityId: target.id },
      });
      movedReviews++;
    }

    for (const visit of await prisma.visit.findMany({
      where: { cityId: city.id },
      select: { id: true, userId: true },
    })) {
      const clash = await prisma.visit.findFirst({
        where: { cityId: target.id, userId: visit.userId },
        select: { id: true },
      });
      if (clash) continue;
      await prisma.visit.update({
        where: { id: visit.id },
        data: { cityId: target.id },
      });
      movedVisits++;
    }
  }

  // 5. Everything still on a legacy row goes with it.
  const removed = await prisma.city.deleteMany({ where: { geonameId: null } });

  console.log(
    `Moved ${movedReviews} review(s) and ${movedVisits} visit(s).\n` +
      `Removed ${removed.count} remaining legacy cities.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
