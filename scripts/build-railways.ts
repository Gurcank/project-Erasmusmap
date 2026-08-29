import fs from "node:fs";
import path from "node:path";

/**
 * Builds the map's railway overlay from OpenStreetMap.
 *
 * Mapbox Streets carries no rail below zoom 8, so the "railways" toggle needs
 * its own data. This pulls `railway=*` ways from Overpass, one country at a
 * time, and sorts each into a colour category the map styles:
 *
 *   highspeed  – rail with highspeed=yes or maxspeed >= 250
 *   rail       – ordinary heavy rail (yards / sidings / industrial excluded)
 *   metro      – railway=subway
 *   light_rail – railway=light_rail
 *   narrow     – railway=narrow_gauge
 *
 * OSM splits every line into thousands of short ways (one per junction, one
 * per bridge). Left as-is that is 40+ MB of static geojson, so within each
 * country each category's segments are stitched back into continuous
 * polylines on shared endpoints, then Douglas-Peucker simplified. Trams are
 * left out entirely — even merged they are too dense for this to stay small.
 *
 * Raw Overpass responses are cached under data/osm-rail-cache/ (git-ignored),
 * so re-running after a tuning change re-processes without re-downloading.
 *
 * Run:  npx ts-node scripts/build-railways.ts
 */

const OUTPUT_PATH = path.join("public", "map", "railways.geojson");
const CACHE_DIR = path.join("data", "osm-rail-cache");

// Same set the city list covers: Erasmus+ programme countries, the Western
// Balkans, plus the two long-standing partners.
const COUNTRIES = [
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
];

// Retries cycle through these in order. The .de instance is fastest when
// healthy but rate-limits hard; kumi and the mail.ru mirror pick up the slack
// when it does. All reject a bare Node User-Agent (the .de one with a 406).
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const USER_AGENT = "ErasmusMap/1.0 (map railway overlay build script)";

const SIMPLIFY_TOLERANCE = 0.0012; // degrees, ~120 m
const COORD_PRECISION = 5;
// After merging, drop straight two-point leftovers shorter than this — station
// throats and buffer stops that did not connect to anything.
const STUB_MIN_DEGREES = 0.003; // ~300 m
const REQUEST_TIMEOUT_S = 240;
// overpass-api.de serves one query per client at a time and expects a pause
// between them; this keeps us clear of its 429s.
const BETWEEN_COUNTRIES_MS = 6000;

type Point = [number, number];
type Category = "highspeed" | "rail" | "metro" | "light_rail" | "narrow";

type OverpassWay = {
  type: "way";
  id: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
};

function queryFor(iso: string): string {
  const lifecycle = `["railway"!~"^(abandoned|disused|razed|construction|proposed|dismantled)$"]`;
  return `[out:json][timeout:${REQUEST_TIMEOUT_S - 30}];
area["ISO3166-1"="${iso}"][admin_level=2]->.a;
(
  way(area.a)["railway"="subway"]${lifecycle};
  way(area.a)["railway"="light_rail"]${lifecycle};
  way(area.a)["railway"="narrow_gauge"]${lifecycle};
  way(area.a)["railway"="rail"]["service"!~"."]["usage"!~"industrial|military|test"]${lifecycle};
);
out geom;`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchCountry(iso: string): Promise<OverpassWay[]> {
  const cachePath = path.join(CACHE_DIR, `${iso}.json`);
  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, "utf8")).elements ?? [];
  }

  for (let attempt = 1; attempt <= 8; attempt++) {
    const endpoint =
      OVERPASS_ENDPOINTS[(attempt - 1) % OVERPASS_ENDPOINTS.length];
    try {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_S * 1000,
      );
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT },
        body: new URLSearchParams({ data: queryFor(iso) }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        // 429 = rate limit, 502/503/504 = the instance is busy. Both clear up
        // if we wait; the wait grows with each try.
        console.log(`  ${iso}: HTTP ${response.status} from ${endpoint}`);
        await sleep(Math.min(attempt * 15_000, 90_000));
        continue;
      }

      const text = await response.text();
      const json = JSON.parse(text);
      // Overpass reports query errors as a 200 with a `remark` and no elements.
      if (!Array.isArray(json.elements) && json.remark) {
        console.log(`  ${iso}: remark from ${endpoint}: ${json.remark}`);
        await sleep(Math.min(attempt * 15_000, 90_000));
        continue;
      }
      fs.writeFileSync(cachePath, text);
      return json.elements ?? [];
    } catch (error) {
      console.log(
        `  ${iso}: attempt ${attempt} failed (${(error as Error).name})`,
      );
      await sleep(Math.min(attempt * 15_000, 90_000));
    }
  }
  console.log(`  ${iso}: giving up`);
  return [];
}

/** Ways that survived the Overpass filter but still are not through track. */
function keepWay(tags: Record<string, string>): boolean {
  if (tags.service) return false;
  if (/industrial|military|test/.test(tags.usage ?? "")) return false;
  return true;
}

function classify(tags: Record<string, string>): Category {
  switch (tags.railway) {
    case "subway":
      return "metro";
    case "light_rail":
      return "light_rail";
    case "narrow_gauge":
      return "narrow";
    default: {
      const maxspeed = Number.parseInt(tags.maxspeed ?? "", 10);
      if (
        tags.highspeed === "yes" ||
        (Number.isFinite(maxspeed) && maxspeed >= 250)
      ) {
        return "highspeed";
      }
      return "rail";
    }
  }
}

const endpointKey = (p: Point) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`;

/**
 * Stitch segments that share an endpoint into continuous polylines. At a
 * junction the walk follows one arbitrary branch and leaves the rest to start
 * their own line — every segment is still used exactly once, so coverage is
 * preserved; only where the network splits is arbitrary.
 */
function mergeSegments(segments: Point[][]): Point[][] {
  const byEndpoint = new Map<string, number[]>();
  segments.forEach((segment, index) => {
    for (const point of [segment[0], segment[segment.length - 1]]) {
      const key = endpointKey(point);
      const list = byEndpoint.get(key);
      if (list) list.push(index);
      else byEndpoint.set(key, [index]);
    }
  });

  const used = new Array<boolean>(segments.length).fill(false);
  const lines: Point[][] = [];

  const extend = (line: Point[], fromTail: boolean): Point[] => {
    for (let growing = true; growing;) {
      growing = false;
      const anchor = fromTail ? line[line.length - 1] : line[0];
      const key = endpointKey(anchor);
      for (const index of byEndpoint.get(key) ?? []) {
        if (used[index]) continue;
        const segment = segments[index];
        const head = endpointKey(segment[0]);
        const tail = endpointKey(segment[segment.length - 1]);
        let piece: Point[] | null = null;
        if (head === key) piece = segment;
        else if (tail === key) piece = segment.slice().reverse();
        if (!piece) continue;

        line = fromTail
          ? line.concat(piece.slice(1))
          : piece.slice(0, -1).concat(line);
        used[index] = true;
        growing = true;
        break;
      }
    }
    return line;
  };

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    let line = segments[i].slice();
    line = extend(line, true);
    line = extend(line, false);
    lines.push(line);
  }
  return lines;
}

/** Perpendicular distance from p to the line a–b, in degrees. */
function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1e-12;
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / length;
}

/** Iterative Douglas-Peucker — recursion overflows on long lines. */
function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDistance = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const distance = perpendicularDistance(
        points[i],
        points[start],
        points[end],
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }
    if (maxDistance > tolerance && index !== -1) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function lengthOf(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
    );
  }
  return total;
}

const round = (value: number) =>
  Math.round(value * 10 ** COORD_PRECISION) / 10 ** COORD_PRECISION;

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const features: GeoJSON.Feature[] = [];
  const counts: Record<string, number> = {};

  for (const iso of COUNTRIES) {
    const wasCached = fs.existsSync(path.join(CACHE_DIR, `${iso}.json`));
    const ways = await fetchCountry(iso);

    const buckets = new Map<Category, Point[][]>();
    for (const way of ways) {
      if (!way.geometry || way.geometry.length < 2) continue;
      if (!keepWay(way.tags ?? {})) continue;
      const category = classify(way.tags ?? {});
      const segment = way.geometry.map((node) => [node.lon, node.lat] as Point);
      const bucket = buckets.get(category);
      if (bucket) bucket.push(segment);
      else buckets.set(category, [segment]);
    }

    let kept = 0;
    for (const [category, segments] of buckets) {
      for (const line of mergeSegments(segments)) {
        const coordinates = simplify(line, SIMPLIFY_TOLERANCE).map(
          ([x, y]) => [round(x), round(y)] as Point,
        );
        if (coordinates.length < 2) continue;
        if (
          coordinates.length === 2 &&
          lengthOf(coordinates) < STUB_MIN_DEGREES
        ) {
          continue;
        }
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates },
          properties: { c: category },
        });
        counts[category] = (counts[category] ?? 0) + 1;
        kept++;
      }
    }
    console.log(`${iso}: ${ways.length} ways -> ${kept} lines`);
    // Give the instance room to breathe, but only after a live request.
    if (!wasCached) await sleep(BETWEEN_COUNTRIES_MS);
  }

  const collection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(collection));

  const sizeMb = fs.statSync(OUTPUT_PATH).size / 1024 / 1024;
  console.log(`\nBy category: ${JSON.stringify(counts)}`);
  console.log(
    `Wrote ${OUTPUT_PATH}: ${features.length} lines (${sizeMb.toFixed(2)} MB)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
