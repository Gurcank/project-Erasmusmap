import fs from "node:fs";
import path from "node:path";

/**
 * Converts a GeoNames `cities15000` dump into the seed list.
 *
 * Run manually when the city list needs refreshing:
 *   curl -O https://download.geonames.org/export/dump/cities15000.zip
 *   unzip cities15000.zip
 *   npx ts-node scripts/build-city-data.ts cities15000.txt
 *
 * GeoNames data is licensed CC BY 4.0 (see README).
 */

// Tab-separated column positions in the GeoNames dump.
const COLUMN = {
  geonameId: 0,
  name: 1,
  asciiName: 2,
  alternateNames: 3,
  latitude: 4,
  longitude: 5,
  featureClass: 6,
  featureCode: 7,
  country: 8,
  population: 14,
} as const;

// Erasmus+ programme countries, the Western Balkans and the two partners the
// map already covered.
const COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
  "MK",
  "RS",
  "TR",
  "AL",
  "BA",
  "ME",
  "XK",
  "CH",
  "GB",
]);

const POPULATION_THRESHOLD = 50_000;
const CAPITAL_FEATURE_CODE = "PPLC";
// PPLX entries are districts of a larger city, not cities in their own right.
const EXCLUDED_FEATURE_CODE = "PPLX";

// GeoNames lists a name per language, often over seventy per city. Keep the
// Latin-script ones — Cyrillic, Greek and Arabic spellings are not what a user
// of this site types. They are not ordered by usefulness, so capping the count
// would drop the ones that matter: "Viyana" is Vienna's 27th alias.
const LATIN_ONLY = /^[\p{Script=Latin}\p{Mark}\s'.-]+$/u;

/** Lowercase and strip diacritics so "Münih" and "munih" both match. */
function normalizeAlias(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

type SeedCity = {
  geonameId: number;
  name: string;
  slug: string;
  country: string;
  latitude: number;
  longitude: number;
  population: number;
  /** Normalized local and translated names, searched alongside `name`. */
  searchAliases: string[];
};

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parse(dumpPath: string): SeedCity[] {
  const cities: SeedCity[] = [];

  for (const line of fs.readFileSync(dumpPath, "utf8").split("\n")) {
    if (!line) continue;
    const fields = line.split("\t");

    const country = fields[COLUMN.country];
    if (!COUNTRIES.has(country)) continue;
    if (fields[COLUMN.featureClass] !== "P") continue;
    if (fields[COLUMN.featureCode] === EXCLUDED_FEATURE_CODE) continue;

    const population = Number(fields[COLUMN.population]);
    const isCapital = fields[COLUMN.featureCode] === CAPITAL_FEATURE_CODE;
    if (population < POPULATION_THRESHOLD && !isCapital) continue;

    // asciiName is GeoNames' own transliteration, which is exactly the "proper
    // Latin name" the app needs — no client-side latinizing of city names.
    const name = fields[COLUMN.asciiName] || fields[COLUMN.name];
    if (!name) continue;

    const aliases = new Set<string>();
    for (const candidate of [
      fields[COLUMN.name],
      ...(fields[COLUMN.alternateNames] || "").split(","),
    ]) {
      const trimmed = candidate.trim();
      if (trimmed.length < 3 || !LATIN_ONLY.test(trimmed)) continue;
      const normalized = normalizeAlias(trimmed);
      // The city's own name is matched directly, so it adds nothing here.
      if (normalized === normalizeAlias(name)) continue;
      aliases.add(normalized);
    }

    cities.push({
      geonameId: Number(fields[COLUMN.geonameId]),
      name,
      slug: slugify(name),
      country,
      latitude: Number(fields[COLUMN.latitude]),
      longitude: Number(fields[COLUMN.longitude]),
      population,
      searchAliases: [...aliases],
    });
  }

  return cities;
}

/**
 * Slugs are globally unique, but city names repeat across countries (Valencia,
 * Cambridge, ...). Every member of a colliding group gets its country suffix
 * rather than one of them silently winning.
 */
function disambiguate(cities: SeedCity[]): SeedCity[] {
  const bySlug = new Map<string, SeedCity[]>();
  for (const city of cities) {
    const group = bySlug.get(city.slug);
    if (group) group.push(city);
    else bySlug.set(city.slug, [city]);
  }

  for (const group of bySlug.values()) {
    if (group.length < 2) continue;
    for (const city of group) {
      city.slug = `${city.slug}-${city.country.toLowerCase()}`;
    }
  }

  // A country suffix can still collide when one country has two same-named
  // cities; fall back to the geonameId, which is unique by definition.
  const seen = new Set<string>();
  for (const city of cities) {
    if (seen.has(city.slug)) city.slug = `${city.slug}-${city.geonameId}`;
    seen.add(city.slug);
  }

  return cities;
}

function main() {
  const dumpPath = process.argv[2];
  if (!dumpPath) {
    throw new Error(
      "usage: ts-node scripts/build-city-data.ts <cities15000.txt>",
    );
  }

  const cities = disambiguate(parse(dumpPath)).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const outputPath = path.join("prisma", "data", "cities.json");
  fs.writeFileSync(outputPath, JSON.stringify(cities, null, 0) + "\n");

  const byCountry = new Map<string, number>();
  for (const city of cities) {
    byCountry.set(city.country, (byCountry.get(city.country) ?? 0) + 1);
  }

  console.log(`Wrote ${cities.length} cities to ${outputPath}`);
  console.log(`Countries: ${byCountry.size}`);
  console.log(`Size: ${(fs.statSync(outputPath).size / 1024).toFixed(0)} KB`);
}

main();
