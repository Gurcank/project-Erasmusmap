import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

import { PrismaClient } from "@prisma/client";
import { latinize } from "../lib/latinize";

const prisma = new PrismaClient();

/**
 * Applies prisma/data/city-overrides.json to the City table.
 *
 * The map takes its labels from the same file (see build-map-regions.ts), so
 * without this the map would say "Gazimağusa" while the city page it links to
 * still said "Famagusta".
 *
 * Renames keep the slug: it is the public URL and the identifier reviews were
 * written against. The former name is added to `searchAliases` so searching
 * "Famagusta" still finds Gazimağusa.
 *
 * Idempotent — safe to re-run.
 *
 * Run:  npx ts-node --files \
 *         --compiler-options '{"module":"commonjs","moduleResolution":"node"}' \
 *         scripts/apply-city-overrides.ts [--apply]
 */

const apply = process.argv.includes("--apply");

type Overrides = {
  rename: Record<string, string>;
  add: {
    slug: string;
    name: string;
    country: string;
    latitude: number;
    longitude: number;
    population: number;
    searchAliases?: string[];
  }[];
};

/** Aliases are stored lowercased and de-accented — see app/api/cities/search. */
const toAlias = (text: string) => latinize(text).toLowerCase();

async function main() {
  const overrides = JSON.parse(
    fs.readFileSync(path.join("prisma", "data", "city-overrides.json"), "utf8"),
  ) as Overrides;

  for (const [slug, name] of Object.entries(overrides.rename)) {
    const city = await prisma.city.findUnique({
      where: { slug },
      select: { name: true, searchAliases: true },
    });
    if (!city) {
      console.log(`  ${slug}: not in the database, skipped`);
      continue;
    }
    if (city.name === name) {
      console.log(`  ${slug}: already "${name}"`);
      continue;
    }

    // Keep both spellings searchable: the name being replaced, and the new one
    // in case its accents make the ILIKE on `name` miss.
    const searchAliases = [
      ...new Set([...city.searchAliases, toAlias(city.name), toAlias(name)]),
    ];

    console.log(
      `  ${slug}: "${city.name}" -> "${name}" (+${searchAliases.length - city.searchAliases.length} alias)`,
    );
    if (apply) {
      await prisma.city.update({
        where: { slug },
        data: { name, searchAliases },
      });
    }
  }

  for (const city of overrides.add) {
    const existing = await prisma.city.findUnique({
      where: { slug: city.slug },
      select: { name: true },
    });
    if (existing) {
      console.log(`  ${city.slug}: already present as "${existing.name}"`);
      continue;
    }

    const searchAliases = [
      ...new Set([...(city.searchAliases ?? []), toAlias(city.name)]),
    ];
    console.log(`  ${city.slug}: creating "${city.name}"`);
    if (apply) {
      await prisma.city.create({
        data: {
          slug: city.slug,
          name: city.name,
          country: city.country,
          latitude: city.latitude,
          longitude: city.longitude,
          population: city.population,
          searchAliases,
        },
      });
    }
  }

  if (!apply) console.log("\nDry run. Re-run with --apply to write.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
