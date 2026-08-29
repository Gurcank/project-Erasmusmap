import fs from "node:fs";
import path from "node:path";

// Read rather than import: a JSON import needs an import attribute under ESM,
// which breaks depending on how the script is invoked (same reason as seed.ts).
const cities = JSON.parse(
  fs.readFileSync(path.join("prisma", "data", "cities.json"), "utf8"),
) as {
  slug: string;
  name: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  population: number;
}[];

/**
 * Builds the map's boundary layer.
 *
 * Boundaries come from Eurostat NUTS level 3 (plus GADM layers for the Western
 * Balkans and Cyprus, which NUTS does not cover at city level). That level is
 * what "İstanbul as a city" means administratively: 81 provinces in Turkey,
 * départements in France, Kreise in Germany.
 *
 * NUTS names themselves are unusable as city names — they are administrative
 * labels ("München, Kreisfreie Stadt") and many regions are rural districts no
 * one searches for. So each region is matched to the largest GeoNames city
 * inside it, and it is that city the region links to. Regions with no city
 * inside are kept for visual continuity but marked so the map can render them
 * dimmed and non-interactive.
 *
 * Run:  npx ts-node scripts/build-map-regions.ts
 */

// Raw NUTS/GADM dumps are build inputs; only the generated file is served.
const SOURCE_DIR = path.join("data", "boundaries");
const OUTPUT_PATH = path.join("public", "map", "regions.geojson");
// One Point per matched city, at the city's own coordinates. The map labels
// from this so a region drawn as several polygons (islands, exclaves) still
// gets its name written exactly once.
const LABELS_PATH = path.join("public", "map", "region-labels.geojson");
// The set of cities the search box is allowed to return: exactly the one city
// each region resolves to, so a metropolis's districts never show up.
const PRIMARY_SLUGS_PATH = path.join(
  "prisma",
  "data",
  "primary-city-slugs.json",
);

// Only the properties the map actually reads are kept; the NUTS dump ships
// eight per feature and the file is downloaded by every visitor.
type RegionProperties = {
  /** Slug of the city this region links to, absent when there is none. */
  citySlug?: string;
  /** Display name: the matched city, or the cleaned-up region name. */
  name: string;
  country: string;
  /** Population of the matched city — the map labels bigger cities first. */
  population?: number;
};

type Ring = [number, number][];

type City = (typeof cities)[number];

function boundingBox(rings: Ring[]): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return [minX, minY, maxX, maxY];
}

/** Standard ray casting: counts crossings of a ray cast from the point. */
function isInsideRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Outer rings contain the point, inner rings (holes) exclude it. */
function isInsidePolygon(x: number, y: number, polygon: Ring[]): boolean {
  if (!polygon.length || !isInsideRing(x, y, polygon[0])) return false;
  for (let hole = 1; hole < polygon.length; hole++) {
    if (isInsideRing(x, y, polygon[hole])) return false;
  }
  return true;
}

function polygonsOf(geometry: GeoJSON.Geometry): Ring[][] {
  if (geometry.type === "Polygon") return [geometry.coordinates as Ring[]];
  if (geometry.type === "MultiPolygon")
    return geometry.coordinates as unknown as Ring[][];
  return [];
}

/**
 * Strips the administrative suffixes and prefixes that make NUTS names unusable
 * as labels. Only applied to regions with no city match, as a last resort.
 */
function cleanRegionName(name: string): string {
  return name
    .replace(/,\s*(Kreisfreie Stadt|Stadtkreis|Landkreis|Stadt)$/i, "")
    .replace(
      /^(Landkreis|Kreis|Groot-|Hlavní město|Área Metropolitana de)\s+/i,
      "",
    )
    .replace(/\s+(län|megye|županija)$/i, "")
    .trim();
}

function regionName(properties: Record<string, unknown>): string {
  return (
    (properties.NAME_LATN as string) ||
    (properties.NUTS_NAME as string) ||
    (properties.NAME_1 as string) ||
    ""
  );
}

// NUTS uses its own codes for two countries; GeoNames uses ISO.
const NUTS_TO_ISO: Record<string, string> = { EL: "GR", UK: "GB" };

// GADM country prefixes in the Balkan/Cyprus layers, mapped to the country
// codes used elsewhere in the app.
const GADM_COUNTRY: Record<string, string> = {
  BIH: "BA",
  MNE: "ME",
  XKO: "XK",
  CYP: "CY",
  CYN: "CY",
};

type SourceFeature = {
  geometry: GeoJSON.Geometry;
  name: string;
  country: string;
};

function loadNutsRegions(): SourceFeature[] {
  const geo = JSON.parse(
    fs.readFileSync(path.join(SOURCE_DIR, "europe.geojson"), "utf8"),
  ) as GeoJSON.FeatureCollection;

  return (
    geo.features
      .filter((feature) => feature.properties?.LEVL_CODE === 3)
      // Cyprus and Montenegro are single whole-country units in NUTS, so they
      // come from their own GADM layers instead.
      .filter(
        (feature) =>
          feature.properties?.CNTR_CODE !== "CY" &&
          feature.properties?.CNTR_CODE !== "ME",
      )
      .map((feature) => ({
        geometry: feature.geometry,
        name: regionName(feature.properties ?? {}),
        country: (() => {
          const code = (feature.properties?.CNTR_CODE as string) ?? "";
          return NUTS_TO_ISO[code] ?? code;
        })(),
      }))
  );
}

function loadGadmRegions(fileName: string): SourceFeature[] {
  const geo = JSON.parse(
    fs.readFileSync(path.join(SOURCE_DIR, fileName), "utf8"),
  ) as GeoJSON.FeatureCollection;

  return geo.features.map((feature) => {
    const gid = (feature.properties?.GID_1 as string) ?? "";
    return {
      geometry: feature.geometry,
      name: (feature.properties?.NAME_1 as string) ?? "",
      country: GADM_COUNTRY[gid.split(".")[0]] ?? "",
    };
  });
}

function main() {
  const regions = [
    ...loadNutsRegions(),
    ...loadGadmRegions("bosnia.json"),
    ...loadGadmRegions("montenegro.json"),
    ...loadGadmRegions("kosovo.json"),
    ...loadGadmRegions("cyprus.json"),
  ].filter((region) => region.name && region.country);

  console.log(`Regions: ${regions.length}`);

  // Group cities by country so each city is only tested against its own
  // country's regions.
  const citiesByCountry = new Map<string, City[]>();
  for (const city of cities) {
    const bucket = citiesByCountry.get(city.country);
    if (bucket) bucket.push(city);
    else citiesByCountry.set(city.country, [city]);
  }

  const prepared = regions
    .map((region) => ({ region, polygons: polygonsOf(region.geometry) }))
    .filter((entry) => entry.polygons.length)
    .map((entry) => ({
      ...entry,
      boxes: entry.polygons.map((polygon) => boundingBox(polygon)),
    }));

  // Assign each city to the region that contains it, then let each region take
  // its largest. Searching the other way round — region looks for a city —
  // hands a region whichever city it happens to test first, which is how
  // İstanbul's province ended up labelled "Esenyurt".
  //
  // The NUTS geometry is coarse: İstanbul's European side is an 18-point ring,
  // so a point-in-polygon test puts the city centre outside its own province.
  // When the exact test finds nothing, the smallest bounding box containing the
  // city is used instead — still within one country, so a wrong answer can only
  // be a neighbouring region rather than an arbitrary one.
  const bestByRegion = new Map<number, City>();

  const normalizeName = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ı/g, "i")
      .replace(/İ/g, "i")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

  /**
   * The largest city is usually the right label, but not when a province is
   * named after its seat: Tekirdağ's largest city is Çorlu, and labelling the
   * province "Corlu" hides the name people actually search for. A city whose
   * name matches the region's therefore outranks a larger one.
   */
  const considerCity = (index: number, city: City) => {
    const regionLabel = normalizeName(prepared[index].region.name);
    const cityLabel = normalizeName(city.name);
    const current = bestByRegion.get(index);

    if (!current) {
      bestByRegion.set(index, city);
      return;
    }

    const currentMatchesRegion = normalizeName(current.name) === regionLabel;
    const cityMatchesRegion = cityLabel === regionLabel;

    if (cityMatchesRegion && !currentMatchesRegion) {
      bestByRegion.set(index, city);
      return;
    }
    if (!cityMatchesRegion && currentMatchesRegion) return;

    if (city.population > current.population) bestByRegion.set(index, city);
  };

  for (const [country, countryCities] of citiesByCountry) {
    const countryRegions = prepared
      .map((entry, index) => ({ ...entry, index }))
      .filter((entry) => entry.region.country === country);
    if (!countryRegions.length) continue;

    for (const city of countryCities) {
      if (city.latitude === null || city.longitude === null) continue;

      let assigned = false;
      let fallbackIndex = -1;
      let fallbackArea = Infinity;

      for (const entry of countryRegions) {
        for (let index = 0; index < entry.polygons.length; index++) {
          const [minX, minY, maxX, maxY] = entry.boxes[index];
          if (
            city.longitude < minX ||
            city.longitude > maxX ||
            city.latitude < minY ||
            city.latitude > maxY
          ) {
            continue;
          }

          if (
            isInsidePolygon(
              city.longitude,
              city.latitude,
              entry.polygons[index],
            )
          ) {
            considerCity(entry.index, city);
            assigned = true;
            break;
          }

          const area = (maxX - minX) * (maxY - minY);
          if (area < fallbackArea) {
            fallbackArea = area;
            fallbackIndex = entry.index;
          }
        }
        // Regions do not overlap, so the containing one is the only one.
        if (assigned) break;
      }

      if (!assigned && fallbackIndex !== -1) {
        considerCity(fallbackIndex, city);
      }
    }
  }

  const features: GeoJSON.Feature[] = [];
  const labelFeatures: GeoJSON.Feature[] = [];
  let matched = 0;

  prepared.forEach((entry, index) => {
    const match = bestByRegion.get(index);
    const properties: RegionProperties = match
      ? {
          citySlug: match.slug,
          name: match.name,
          country: entry.region.country,
          population: match.population,
        }
      : {
          name: cleanRegionName(entry.region.name),
          country: entry.region.country,
        };

    if (match) matched++;
    features.push({
      type: "Feature",
      geometry: entry.region.geometry,
      properties,
    });

    if (match && match.latitude !== null && match.longitude !== null) {
      labelFeatures.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [match.longitude, match.latitude],
        },
        properties: { name: match.name, population: match.population },
      });
    }
  });

  const collection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(collection));
  fs.writeFileSync(
    LABELS_PATH,
    JSON.stringify({ type: "FeatureCollection", features: labelFeatures }),
  );

  const primarySlugs = [
    ...new Set(
      features
        .map((feature) => feature.properties?.citySlug as string | undefined)
        .filter((slug): slug is string => Boolean(slug)),
    ),
  ].sort();
  fs.writeFileSync(PRIMARY_SLUGS_PATH, JSON.stringify(primarySlugs) + "\n");

  const sizeMb = fs.statSync(OUTPUT_PATH).size / 1024 / 1024;
  console.log(`Matched to a city: ${matched} / ${features.length}`);
  console.log(`Unmatched (rendered dimmed): ${features.length - matched}`);
  console.log(`Wrote ${OUTPUT_PATH} (${sizeMb.toFixed(2)} MB)`);
  console.log(`Wrote ${LABELS_PATH} (${labelFeatures.length} label points)`);
  console.log(`Wrote ${PRIMARY_SLUGS_PATH} (${primarySlugs.length} slugs)`);
}

main();
