import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { latinize } from "../lib/latinize";
import { REGION_NAME_OVERRIDES, BALKAN_REGION_NAMES } from "../lib/regionNames";

const prisma = new PrismaClient();

const NUTS_LEVEL = 3;

function slugify(text: string): string {
  return latinize(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

type SeedCity = {
  name: string;
  slug: string;
  regionSlug: string;
  country: string;
};

// Cyprus is excluded here — Eurostat only models the Republic of Cyprus as a
// single unit, so it's seeded from the dedicated cyprus.json layer instead
// (see loadStaticRegionCities), which splits it into two regions.
function loadNutsCities(): SeedCity[] {
  const filePath = path.join(
    process.cwd(),
    "public",
    "eu-cities",
    "europe.geojson",
  );
  const geo = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const cities: SeedCity[] = [];

  for (const feature of geo.features) {
    const props = feature.properties;
    if (props.LEVL_CODE !== NUTS_LEVEL || props.CNTR_CODE === "CY") continue;

    const country: string = props.CNTR_CODE;
    const regionSlug: string = props.NUTS_ID;
    const name: string = REGION_NAME_OVERRIDES[regionSlug] ?? props.NAME_LATN;

    if (!regionSlug || !name) continue;

    cities.push({ name, slug: slugify(name), regionSlug, country });
  }

  return cities;
}

// GADM/Natural Earth GID_0 prefix (the part of GID_1 before the dot) -> the
// short country code this app displays elsewhere (matches COUNTRY_COLORS in
// components/map/Map.tsx).
const STATIC_LAYER_COUNTRY_CODES: Record<string, string> = {
  BIH: "BA",
  XKO: "XK",
  CYP: "CY",
  CYN: "XCY",
};

function loadStaticRegionCities(fileName: string): SeedCity[] {
  const filePath = path.join(process.cwd(), "public", "eu-cities", fileName);
  const geo = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const cities: SeedCity[] = [];

  for (const feature of geo.features) {
    const props = feature.properties;
    const regionSlug: string = props.GID_1;
    const name: string = BALKAN_REGION_NAMES[regionSlug] ?? props.NAME_1;
    const country = STATIC_LAYER_COUNTRY_CODES[regionSlug?.split(".")[0]];

    if (!regionSlug || !name || !country) continue;

    cities.push({ name, slug: slugify(name), regionSlug, country });
  }

  return cities;
}

// `slug` is globally unique, but a handful of same-named regions legitimately
// exist in different countries (e.g. the Jura mountains give their name to
// both a Swiss canton and a French département). Disambiguate every member
// of a colliding group with its country code rather than silently dropping
// one on insert.
function disambiguateSlugs(cities: SeedCity[]): SeedCity[] {
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

  return cities;
}

async function main() {
  const cities = disambiguateSlugs([
    ...loadNutsCities(),
    ...loadStaticRegionCities("bosnia.json"),
    ...loadStaticRegionCities("kosovo.json"),
    ...loadStaticRegionCities("cyprus.json"),
  ]);

  console.log(`Preparing to insert ${cities.length} regions...`);

  await prisma.city.createMany({ data: cities, skipDuplicates: true });

  console.log("Done. All regions inserted.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
