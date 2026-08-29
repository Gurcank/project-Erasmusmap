import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env.local", quiet: true });

const prisma = new PrismaClient();

/**
 * Aligns each City row's `slug` with prisma/data/cities.json.
 *
 * The GeoNames import runs `disambiguate()` over the whole city list, so a
 * name that was unique at one population threshold can gain a `-country`
 * suffix at a lower one ("mechelen" -> "mechelen-be"). Rows seeded before the
 * threshold changed keep the old slug because `createMany` skips them on the
 * geonameId unique constraint, which leaves the map's region links pointing at
 * slugs that no longer exist.
 *
 * Match is by `geonameId` (stable), not by slug. Updates run in two passes —
 * every changing row is first parked on a temporary slug — so a rename can
 * swap two slugs without tripping the unique index mid-run.
 *
 * Run:  npx ts-node scripts/sync-city-slugs.ts [--apply]
 * Without --apply it only reports.
 */

type SeedCity = { geonameId: number; slug: string };

function loadSeedCities(): SeedCity[] {
  const file = path.join("prisma", "data", "cities.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as SeedCity[];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const wanted = new Map(loadSeedCities().map((c) => [c.geonameId, c.slug]));

  const rows = await prisma.city.findMany({
    where: { geonameId: { not: null } },
    select: { id: true, geonameId: true, slug: true },
  });

  const changes = rows
    .map((row) => ({ row, next: wanted.get(row.geonameId as number) }))
    .filter(
      (entry): entry is { row: (typeof rows)[number]; next: string } =>
        Boolean(entry.next) && entry.next !== entry.row.slug,
    );

  console.log(
    `${rows.length} rows with a geonameId, ${changes.length} slug(s) out of sync`,
  );
  for (const { row, next } of changes.slice(0, 20)) {
    console.log(`  ${row.slug}  ->  ${next}`);
  }
  if (changes.length > 20) console.log(`  … and ${changes.length - 20} more`);

  if (!apply) {
    console.log("\nDry run — pass --apply to write.");
    return;
  }

  // Pass 1: park every changing row on a collision-proof temporary slug.
  for (const { row } of changes) {
    await prisma.city.update({
      where: { id: row.id },
      data: { slug: `__sync_${row.id}` },
    });
  }
  // Pass 2: move each to its final slug.
  for (const { row, next } of changes) {
    await prisma.city.update({ where: { id: row.id }, data: { slug: next } });
  }

  console.log(`\nUpdated ${changes.length} slug(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
