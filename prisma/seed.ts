import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const NUTS_LEVEL_2_COUNTRIES = new Set(["DE", "UK"]);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/ą/g, "a")
    .replace(/ę/g, "e")
    .replace(/ś/g, "s")
    .replace(/ć/g, "c")
    .replace(/ń/g, "n")
    .replace(/ż|ź/g, "z")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

async function main() {
  const filePath = path.join(process.cwd(), "data", "nuts.geojson");
  const raw = fs.readFileSync(filePath, "utf-8");
  const geo = JSON.parse(raw);

  const cities: { name: string; slug: string; regionSlug: string; country: string }[] = [];

  for (const feature of geo.features) {
    const props = feature.properties;
    const level: number = props.LEVL_CODE;
    const country: string = props.CNTR_CODE;
    const regionSlug: string = props.NUTS_ID;
    const name: string = props.NAME_LATN;

    if (!regionSlug || !name) continue;

    const expectedLevel = NUTS_LEVEL_2_COUNTRIES.has(country) ? 2 : 3;
    if (level !== expectedLevel) continue;

    cities.push({ name, slug: slugify(name), regionSlug, country });
  }

  console.log(`Preparing to insert ${cities.length} regions...`);

  await prisma.city.createMany({ data: cities, skipDuplicates: true });

  console.log("Done. All regions inserted.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
