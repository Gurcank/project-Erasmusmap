import fs from "node:fs";
import path from "node:path";

/**
 * Builds the map's airport overlay from the OurAirports open dataset.
 *
 * Mapbox Streets only carries airports from about zoom 8, so the "airports"
 * toggle needs its own source to show them at continental zoom. This pulls the
 * public-domain airports.csv, keeps the large and medium airports with
 * scheduled service and an IATA code inside the programme region, and writes a
 * compact point layer: `{ name, iata }` per feature.
 *
 * Run:  npx ts-node scripts/build-airports.ts
 */

const SOURCE_URL =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";
const OUTPUT_PATH = path.join("public", "map", "airports.geojson");
const COORD_PRECISION = 5;

// Same set the city list and the railway overlay cover: Erasmus+ programme
// countries, the Western Balkans, plus the two long-standing partners.
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
  "XK",
  "CH",
  "GB",
  "TR",
  "AL",
  "BA",
  "ME",
]);

const KEPT_TYPES = new Set(["large_airport", "medium_airport"]);

/** Splits one CSV line, honouring double-quoted fields that contain commas. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

const round = (value: number) =>
  Math.round(value * 10 ** COORD_PRECISION) / 10 ** COORD_PRECISION;

async function main() {
  console.log(`Fetching ${SOURCE_URL}`);
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`airports.csv: HTTP ${response.status}`);
  }
  const csv = await response.text();

  const lines = csv.split(/\r?\n/).filter((line) => line.length > 0);
  const header = splitCsvLine(lines[0]);
  const index = (name: string) => {
    const position = header.indexOf(name);
    if (position === -1) throw new Error(`column not found: ${name}`);
    return position;
  };
  const col = {
    type: index("type"),
    name: index("name"),
    lat: index("latitude_deg"),
    lon: index("longitude_deg"),
    iso: index("iso_country"),
    scheduled: index("scheduled_service"),
    iata: index("iata_code"),
  };

  const features: GeoJSON.Feature[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = splitCsvLine(lines[i]);
    const iata = row[col.iata]?.trim().toUpperCase();
    if (!iata || iata.length !== 3) continue;
    if (!KEPT_TYPES.has(row[col.type])) continue;
    if (row[col.scheduled] !== "yes") continue;
    if (!COUNTRIES.has(row[col.iso])) continue;

    const lon = Number.parseFloat(row[col.lon]);
    const lat = Number.parseFloat(row[col.lat]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [round(lon), round(lat)] },
      properties: { name: row[col.name], iata },
    });
  }

  features.sort((a, b) =>
    String(a.properties?.iata).localeCompare(String(b.properties?.iata)),
  );

  const collection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(collection));

  const sizeKb = fs.statSync(OUTPUT_PATH).size / 1024;
  console.log(
    `Wrote ${OUTPUT_PATH}: ${features.length} airports (${sizeKb.toFixed(1)} KB)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
