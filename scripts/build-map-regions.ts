import fs from "node:fs";
import path from "node:path";
import mapshaper from "mapshaper";

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
 * Boundaries come from Eurostat NUTS level 3 — the level that means "İstanbul
 * as a city" administratively: 81 provinces in Turkey, départements in France,
 * Kreise in Germany — at the 1:1M scale. The 1:20M generalisation this used to
 * read drew Paris as a 7-point polygon; at 1:1M a region carries about 490
 * points before simplification.
 *
 * Four gaps are filled from elsewhere:
 *   - the UK left NUTS after Brexit, so its 179 regions come from NUTS 2021
 *   - Cyprus and Montenegro are single whole-country units in NUTS, so their
 *     districts / municipalities come from geoBoundaries (OSM-derived)
 *   - Bosnia is not in NUTS at all; its cantons come from the GADM dump
 *   - every Cyprus source draws the island on the internationally recognised
 *     scheme, so the six districts north of the Green Line come from their own
 *     OSM relations and are erased out of the geoBoundaries ones. That splits
 *     the two divided districts in two: Lefkoşa and Nicosia, Gazimağusa and
 *     the Ayia Napa corner, each with its own name.
 *
 * NUTS names themselves are unusable as city names — they are administrative
 * labels ("München, Kreisfreie Stadt") and many regions are rural districts no
 * one searches for. So each region is matched to the largest GeoNames city
 * inside it, and it is that city the region links to. Regions with no city
 * inside are kept for visual continuity but marked so the map can render them
 * dimmed and non-interactive.
 *
 * The assembled layer is finally simplified through mapshaper. That step is not
 * optional: simplifying polygons independently pulls neighbouring provinces off
 * their shared edge and tears gaps between them, so the whole layer has to go
 * through one topology-aware pass.
 *
 * Run:  npx ts-node --files  *          --compiler-options '{"module":"commonjs","moduleResolution":"node"}'  *          scripts/build-map-regions.ts
 *
 * --files loads types/mapshaper.d.ts (mapshaper ships no types of its own);
 * the compiler override is needed because the app's tsconfig targets ESM.
 */

// Raw dumps are build inputs; only the generated file is served. The two NUTS
// files and the geoBoundaries ones are downloaded on demand and git-ignored.
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

const NUTS_BASE =
  "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson";
const NUTS_2024 = "nuts-01m-l3.geojson";
const NUTS_2021 = "nuts-01m-l3-2021.geojson";
const KKTC_FILE = "kktc-districts-osm.json";

// The six KKTC districts, as OSM admin_level=5 relations. Their `name:tr` is
// the district's Turkish name, which is also its seat's name — exactly the
// label this map wants. Taken by id because there is no country relation to
// query them through: OSM carries Cyprus as one admin_level=2 boundary.
const KKTC_RELATIONS = [
  3264494, // Girne
  10090475, // İskele
  10090538, // Güzelyurt
  10090539, // Lefke
  11974176, // Gazimağusa
  11974267, // Lefkoşa
];

// Same instances and header build-railways.ts uses; all reject a bare Node UA.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const USER_AGENT = "ErasmusMap/1.0 (map boundary build script)";

// Erasing one dataset's districts with another's leaves crumbs wherever the two
// trace the same coast slightly differently. Nothing this small is a place.
const MIN_FRAGMENT_AREA_M2 = 1_000_000;

// Each region is simplified against a threshold derived from its own size,
// not one global cut-off. Both a flat percentage and a flat ground interval
// spend the budget on the largest regions: at ~3 MB either left Ankara with
// 300+ points and Paris — a small, smooth département — with 12, which is the
// exact "polygon, not a boundary" look this build exists to fix.
//
// The threshold is a fraction of the region's own linear size (√area), so a
// 10 km département and a 160 km province keep comparable relative detail.
// Tuned once against a ~3 MB budget and then fixed, so the build produces the
// same bytes from the same inputs every time. Higher divisor = finer detail.
const SIMPLIFY_DIVISOR = 55;
// ~1 m at these latitudes. Anything finer is noise the map cannot draw.
const COORD_PRECISION = 0.00001;

// Only the properties the map actually reads are kept; the NUTS dump ships
// eighteen per feature and the file is downloaded by every visitor.
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

// Curated corrections to the GeoNames dump — see the file's own comments.
const overrides = JSON.parse(
  fs.readFileSync(path.join("prisma", "data", "city-overrides.json"), "utf8"),
) as {
  rename: Record<string, string>;
  add: (City & { searchAliases?: string[] })[];
};

/**
 * The city list the map matches against: GeoNames, with the curated renames
 * applied and the curated additions appended. Renaming matters beyond the
 * label — `considerCity` prefers a city whose name matches its region's, so a
 * district gets its seat rather than its largest village.
 */
function citiesWithOverrides(): City[] {
  const renamed = cities.map((city) =>
    overrides.rename[city.slug]
      ? { ...city, name: overrides.rename[city.slug] }
      : city,
  );
  return [...renamed, ...overrides.add];
}

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
    .replace(/\s+(Municipality|District)$/i, "")
    .trim();
}

// NUTS uses its own codes for two countries; GeoNames uses ISO.
const NUTS_TO_ISO: Record<string, string> = { EL: "GR", UK: "GB" };

// Cyprus and Montenegro are one NUTS region each — the whole country — so their
// sub-national units come from geoBoundaries instead.
const NUTS_SINGLE_UNIT_COUNTRIES = new Set(["CY", "ME"]);

// GADM country prefixes in the Bosnia layer, mapped to the app's codes.
const GADM_COUNTRY: Record<string, string> = { BIH: "BA" };

type SourceFeature = {
  geometry: GeoJSON.Geometry;
  name: string;
  country: string;
};

function readJson(fileName: string): GeoJSON.FeatureCollection {
  return JSON.parse(
    fs.readFileSync(path.join(SOURCE_DIR, fileName), "utf8"),
  ) as GeoJSON.FeatureCollection;
}

/** Downloads a build input once; later runs read the cached copy. */
async function ensureDownloaded(fileName: string, url: string) {
  const target = path.join(SOURCE_DIR, fileName);
  if (fs.existsSync(target)) return;

  console.log(`Fetching ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${fileName}: HTTP ${response.status}`);
  fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
}

/** Resolves the current geoBoundaries release URL, then caches the file. */
async function ensureGeoBoundaries(iso3: string, fileName: string) {
  const target = path.join(SOURCE_DIR, fileName);
  if (fs.existsSync(target)) return;

  const api = `https://www.geoboundaries.org/api/current/gbOpen/${iso3}/ADM1/`;
  console.log(`Fetching ${api}`);
  const meta = await fetch(api);
  if (!meta.ok) throw new Error(`${iso3}: HTTP ${meta.status}`);
  const { gjDownloadURL } = (await meta.json()) as { gjDownloadURL: string };
  await ensureDownloaded(fileName, gjDownloadURL);
}

function nutsName(properties: Record<string, unknown>): string {
  return (
    (properties.NAME_LATN as string) || (properties.NUTS_NAME as string) || ""
  );
}

/** Every NUTS 2024 region except the countries covered better elsewhere. */
function loadNuts(): SourceFeature[] {
  return readJson(NUTS_2024)
    .features.filter(
      (feature) =>
        !NUTS_SINGLE_UNIT_COUNTRIES.has(
          feature.properties?.CNTR_CODE as string,
        ),
    )
    .map((feature) => {
      const code = (feature.properties?.CNTR_CODE as string) ?? "";
      return {
        geometry: feature.geometry,
        name: nutsName(feature.properties ?? {}),
        country: NUTS_TO_ISO[code] ?? code,
      };
    });
}

/** The UK left NUTS after Brexit; 2021 is the last edition that carries it. */
function loadUnitedKingdom(): SourceFeature[] {
  return readJson(NUTS_2021)
    .features.filter((feature) => feature.properties?.CNTR_CODE === "UK")
    .map((feature) => ({
      geometry: feature.geometry,
      name: nutsName(feature.properties ?? {}),
      country: "GB",
    }));
}

function loadGeoBoundaries(fileName: string, country: string): SourceFeature[] {
  return readJson(fileName).features.map((feature) => ({
    geometry: feature.geometry,
    name: (feature.properties?.shapeName as string) ?? "",
    country,
  }));
}

/** Downloads the six KKTC district relations from Overpass, once. */
async function ensureKktcDistricts() {
  const target = path.join(SOURCE_DIR, KKTC_FILE);
  if (fs.existsSync(target)) return;

  const query = `[out:json][timeout:180];
relation(id:${KKTC_RELATIONS.join(",")});
out geom;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    console.log(
      `Fetching ${KKTC_RELATIONS.length} KKTC relations from ${endpoint}`,
    );
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT },
        body: new URLSearchParams({ data: query }),
      });
      if (!response.ok) {
        console.log(`  HTTP ${response.status}`);
        continue;
      }
      const text = await response.text();
      const json = JSON.parse(text);
      if (json.elements?.length !== KKTC_RELATIONS.length) {
        console.log(
          `  got ${json.elements?.length ?? 0} relations, expected ${KKTC_RELATIONS.length}`,
        );
        continue;
      }
      fs.writeFileSync(target, text);
      return;
    } catch (error) {
      console.log(`  ${(error as Error).name}`);
    }
  }
  throw new Error("KKTC districts: every Overpass endpoint failed");
}

/**
 * Stitches a relation's member ways into closed rings. Overpass returns a
 * boundary as the individual ways that trace it, in no particular order and
 * pointing either way round, so each ring is grown from whichever fragment
 * shares its current endpoint.
 */
function buildRings(ways: Ring[]): Ring[] {
  const endpoint = (point: [number, number]) =>
    `${point[0].toFixed(7)},${point[1].toFixed(7)}`;
  const pool = ways.map((way) => way.slice());
  const rings: Ring[] = [];

  while (pool.length) {
    let ring = pool.shift() as Ring;
    for (let growing = true; growing;) {
      if (endpoint(ring[0]) === endpoint(ring[ring.length - 1])) break;
      growing = false;
      const tail = endpoint(ring[ring.length - 1]);
      for (let index = 0; index < pool.length; index++) {
        const segment = pool[index];
        if (endpoint(segment[0]) === tail) {
          ring = ring.concat(segment.slice(1)) as Ring;
        } else if (endpoint(segment[segment.length - 1]) === tail) {
          ring = ring.concat(segment.slice().reverse().slice(1)) as Ring;
        } else {
          continue;
        }
        pool.splice(index, 1);
        growing = true;
        break;
      }
    }
    // An unclosed ring means the relation is broken upstream; drawing it as a
    // polygon would fill an arbitrary shape, so it is dropped instead.
    if (endpoint(ring[0]) === endpoint(ring[ring.length - 1])) rings.push(ring);
    else console.log(`  dropped an unclosed ring (${ring.length} points)`);
  }
  return rings;
}

function loadNorthernCyprus(): SourceFeature[] {
  const raw = JSON.parse(
    fs.readFileSync(path.join(SOURCE_DIR, KKTC_FILE), "utf8"),
  ) as {
    elements: {
      tags: Record<string, string>;
      members: { type: string; geometry?: { lat: number; lon: number }[] }[];
    }[];
  };

  return raw.elements.map((relation) => {
    const ways = relation.members
      .filter((member) => member.type === "way" && member.geometry)
      .map(
        (member) =>
          member.geometry!.map((node) => [node.lon, node.lat]) as Ring,
      );
    return {
      geometry: {
        type: "MultiPolygon",
        coordinates: buildRings(ways).map((ring) => [ring]),
      } as GeoJSON.Geometry,
      // "Girne ilçesi" -> "Girne": the district and its seat share a name.
      name: relation.tags["name:tr"].replace(/\s+ilçesi$/, ""),
      country: "CY",
    };
  });
}

/**
 * Removes `eraser` from `features`, keeping each remainder under its own name.
 * Used to take the KKTC districts out of the geoBoundaries Cyprus ones, which
 * cover the whole island.
 */
async function eraseArea(
  features: SourceFeature[],
  eraser: SourceFeature[],
): Promise<SourceFeature[]> {
  // Not `name`: mapshaper treats that as its own layer-naming field and
  // -dissolve on it silently produces no output.
  const toCollection = (source: SourceFeature[]) => ({
    type: "FeatureCollection",
    features: source.map((entry) => ({
      type: "Feature",
      geometry: entry.geometry,
      properties: { regionName: entry.name, country: entry.country },
    })),
  });

  const output = await mapshaper.applyCommands(
    "-i target.json -erase source=eraser.json " +
      "-explode " +
      `-filter 'this.area > ${MIN_FRAGMENT_AREA_M2}' ` +
      "-dissolve regionName copy-fields=country " +
      "-o out.json format=geojson",
    {
      "target.json": Buffer.from(JSON.stringify(toCollection(features))),
      "eraser.json": Buffer.from(JSON.stringify(toCollection(eraser))),
    },
  );

  const result = JSON.parse(
    Buffer.from(output["out.json"]).toString("utf8"),
  ) as GeoJSON.FeatureCollection;

  return result.features.map((feature) => ({
    geometry: feature.geometry,
    name: feature.properties?.regionName as string,
    country: feature.properties?.country as string,
  }));
}

function loadGadm(fileName: string): SourceFeature[] {
  return readJson(fileName).features.map((feature) => {
    const gid = (feature.properties?.GID_1 as string) ?? "";
    return {
      geometry: feature.geometry,
      name: (feature.properties?.NAME_1 as string) ?? "",
      country: GADM_COUNTRY[gid.split(".")[0]] ?? "",
    };
  });
}

/**
 * One topology-aware simplification pass over the finished layer. mapshaper
 * builds shared arcs on import, so a border simplifies once and both sides keep
 * matching; a per-polygon pass would leave slivers and overlaps between them.
 */
async function simplify(
  collection: GeoJSON.FeatureCollection,
): Promise<GeoJSON.FeatureCollection> {
  // `this.area` is in square metres for lat/long input, so √area is the
  // region's linear size in metres.
  const command =
    `-i regions.json ` +
    `-simplify visvalingam weighted keep-shapes variable ` +
    `interval='Math.sqrt(this.area) / ${SIMPLIFY_DIVISOR}' ` +
    `-o out.json format=geojson precision=${COORD_PRECISION}`;

  const output = await mapshaper.applyCommands(command, {
    "regions.json": Buffer.from(JSON.stringify(collection)),
  });

  return JSON.parse(Buffer.from(output["out.json"]).toString("utf8"));
}

function countPoints(geometry: GeoJSON.Geometry): number {
  const walk = (value: unknown): number =>
    Array.isArray(value)
      ? typeof value[0] === "number"
        ? 1
        : value.reduce((total: number, item) => total + walk(item), 0)
      : 0;
  return walk((geometry as { coordinates?: unknown }).coordinates);
}

async function main() {
  await ensureDownloaded(
    NUTS_2024,
    `${NUTS_BASE}/NUTS_RG_01M_2024_4326_LEVL_3.geojson`,
  );
  await ensureDownloaded(
    NUTS_2021,
    `${NUTS_BASE}/NUTS_RG_01M_2021_4326_LEVL_3.geojson`,
  );
  await ensureGeoBoundaries("CYP", "gb-CYP-adm1.geojson");
  await ensureGeoBoundaries("MNE", "gb-MNE-adm1.geojson");
  await ensureKktcDistricts();

  // The geoBoundaries districts cover the whole island, so the KKTC ones are
  // cut out of them rather than laid on top — two regions claiming the same
  // ground would both answer the map's hover query.
  const northernCyprus = loadNorthernCyprus();
  const southernCyprus = await eraseArea(
    loadGeoBoundaries("gb-CYP-adm1.geojson", "CY"),
    northernCyprus,
  );
  console.log(
    `Cyprus: ${northernCyprus.length} KKTC districts, ` +
      `${southernCyprus.length} remaining south of the Green Line`,
  );

  const regions = [
    ...loadNuts(),
    ...loadUnitedKingdom(),
    ...northernCyprus,
    ...southernCyprus,
    ...loadGeoBoundaries("gb-MNE-adm1.geojson", "ME"),
    ...loadGadm("bosnia.json"),
  ].filter((region) => region.name && region.country);

  console.log(`Regions: ${regions.length}`);

  // Group cities by country so each city is only tested against its own
  // country's regions.
  const citiesByCountry = new Map<string, City[]>();
  for (const city of citiesWithOverrides()) {
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
  // When the exact point-in-polygon test finds nothing, the smallest bounding
  // box containing the city is used instead — still within one country, so a
  // wrong answer can only be a neighbouring region rather than an arbitrary
  // one. The two counters below report how often that happens: at 1:20M it was
  // the common case, because the coarse rings put city centres outside their
  // own province.
  const bestByRegion = new Map<number, City>();
  let exactMatches = 0;
  let fallbackMatches = 0;

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

      if (assigned) {
        exactMatches++;
      } else if (fallbackIndex !== -1) {
        considerCity(fallbackIndex, city);
        fallbackMatches++;
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

  const rawPoints = features.reduce(
    (total, feature) => total + countPoints(feature.geometry),
    0,
  );

  const simplified = await simplify({
    type: "FeatureCollection",
    features,
  });

  const keptPoints = simplified.features.reduce(
    (total, feature) => total + countPoints(feature.geometry),
    0,
  );

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(simplified));
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
  console.log(
    `City placement: ${exactMatches} inside a polygon, ${fallbackMatches} by bounding box`,
  );
  console.log(
    `Points: ${rawPoints} raw -> ${keptPoints} after simplify ` +
      `(${(keptPoints / simplified.features.length).toFixed(1)} per region)`,
  );
  console.log(`Wrote ${OUTPUT_PATH} (${sizeMb.toFixed(2)} MB)`);
  console.log(`Wrote ${LABELS_PATH} (${labelFeatures.length} label points)`);
  console.log(`Wrote ${PRIMARY_SLUGS_PATH} (${primarySlugs.length} slugs)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
