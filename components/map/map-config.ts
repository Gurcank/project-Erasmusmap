import type mapboxgl from "@/lib/mapbox";
import {
  RAIL_DRAW_ORDER,
  RAIL_GROUP_COLORS,
  RAIL_GROUP_OF,
  RAIL_GROUP_WIDTH_SCALE,
  type RawRailCategory,
} from "@/lib/rail-colors";

// Satellite imagery with nothing drawn over it but national borders. Province
// outlines and the region fill only appear while a region is hovered. Rail,
// motorway and airport overlays are opt-in from the bottom-left control.
export const MAP_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";

export const INITIAL_CENTER: [number, number] = [12, 50];
export const INITIAL_ZOOM = 3.6;
// The camera looks straight down. The hover effect is a flat shimmer now, so a
// tilt would add nothing.
export const INITIAL_PITCH = 0;

export const REGION_SOURCE = "regions";
// Invisible surface that only exists to catch hover and click.
export const REGION_HIT_LAYER = "region-hit";
// City names — the lowest label tier. Drawn from a Point-per-city source so a
// region made of several polygons (islands, exclaves) is still named once.
export const LABEL_SOURCE = "region-labels";
export const REGION_LABEL_LAYER = "region-label";
export const LABEL_COLOR = "#f9fafb";
export const LABEL_HALO = "#0b0e14";

// Basemap admin-0 lines restyled to this so national borders stay legible over
// satellite imagery. The disputed-boundary line is what shows Cyprus as two.
export const COUNTRY_BORDER_COLOR = "rgba(255, 255, 255, 0.5)";

// Outline of the hovered region, kept in its own source because line-gradient
// (the travelling shimmer) needs a LineString geometry with line metrics.
export const HIGHLIGHT_SOURCE = "region-highlight";
export const HIGHLIGHT_GLOW_LAYER = "region-highlight-glow";
export const HIGHLIGHT_EDGE_LAYER = "region-highlight-edge";

export const HOVER_FILL_DURATION_MS = 180;

// Every basemap label below country level goes: settlements (towns / villages /
// districts), POI, transit, road shields and the admin-1 "state" labels. The
// label ladder is then continent → country (basemap) → city (region-label).
export const HIDDEN_LABEL_KEYWORDS = [
  "settlement",
  "place",
  "poi",
  "transit",
  "road",
  "state-label",
];

// The satellite-streets road web is hidden by default; the "motorways" toggle
// (in MapControls) brings back only the largest roads. Every road line id
// starts with one of these prefixes.
export const ROAD_LINE_PREFIXES = ["road-", "tunnel-", "bridge-"];

// The "railways" toggle adds one line layer from public/map/railways.geojson
// (categorised OSM rail — see scripts/build-railways.ts). Line colour and paint
// order come from each feature's `c` category. The file is a few MB, so it is
// fetched only the first time the toggle is switched on, not on every map.
export const RAIL_SOURCE = "railways";
export const RAIL_LAYER = "overlay-rail";

// Every raw `c` value maps through its group (see lib/rail-colors.ts) to a
// colour, a paint order and a width multiplier. `train` is the falls-through
// default so each match always has an output.
export const RAW_RAIL_CATEGORIES = Object.keys(
  RAIL_GROUP_OF,
) as RawRailCategory[];

export const RAIL_COLOR_EXPRESSION = [
  "match",
  ["get", "c"],
  ...RAW_RAIL_CATEGORIES.flatMap((category) => [
    category,
    RAIL_GROUP_COLORS[RAIL_GROUP_OF[category]],
  ]),
  RAIL_GROUP_COLORS.train,
] as unknown as mapboxgl.Expression;

// line-sort-key = index of the group in the draw order: the backbone painted
// first, the high-speed network last so it sits on top at junctions.
export const RAIL_SORT_KEY_EXPRESSION = [
  "match",
  ["get", "c"],
  ...RAW_RAIL_CATEGORIES.flatMap((category) => [
    category,
    RAIL_DRAW_ORDER.indexOf(RAIL_GROUP_OF[category]),
  ]),
  0,
] as unknown as mapboxgl.Expression;

// Per-group multiplier on the zoom width ramp below.
export const RAIL_WIDTH_SCALE_EXPRESSION = [
  "match",
  ["get", "c"],
  ...RAW_RAIL_CATEGORIES.flatMap((category) => [
    category,
    RAIL_GROUP_WIDTH_SCALE[RAIL_GROUP_OF[category]],
  ]),
  1,
] as unknown as mapboxgl.Expression;

// Zoom ramp for rail line width. The per-group multiplier has to sit inside
// each stop's output: Mapbox only accepts a `zoom` expression as the input of a
// top-level `step` or `interpolate`, so wrapping the ramp in a `*` — which is
// what this used to do — is rejected when the layer is added.
export const RAIL_WIDTH_EXPRESSION = [
  "interpolate",
  ["linear"],
  ["zoom"],
  3,
  ["*", RAIL_WIDTH_SCALE_EXPRESSION, 0.5],
  7,
  ["*", RAIL_WIDTH_SCALE_EXPRESSION, 1.4],
  11,
  ["*", RAIL_WIDTH_SCALE_EXPRESSION, 2.6],
  14,
  ["*", RAIL_WIDTH_SCALE_EXPRESSION, 3.6],
] as unknown as mapboxgl.Expression;

// The basemap's own airport layer only carries data from about zoom 8, and only
// commercial fields at that. The "airports" toggle (default off) hides it and
// paints public/map/airports.geojson instead — scheduled-service airports with
// an IATA code, see scripts/build-airports.ts — as plane markers at every zoom.
export const BASEMAP_AIRPORT_LAYER = "airport-label";
export const AIRPORT_SOURCE = "airports";
export const AIRPORT_LAYER = "overlay-airport";
export const AIRPORT_ICON = "airport-marker";
// Sky blue: legible over dark imagery and distinct from every rail colour.
export const AIRPORT_COLOR = "#7dd3fc";
// Plane glyph drawn once and registered with the map (map.addImage). Keeping it
// inline avoids depending on whatever the basemap sprite happens to ship.
export const AIRPORT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24"><path d="M13.4 9V3.5a1.4 1.4 0 0 0-2.8 0V9L2 14v2l8.6-2.6V19L8 20.6V22l4-1.2 4 1.2v-1.4L13.4 19v-5.6L22 16v-2z" fill="${AIRPORT_COLOR}" stroke="#0b0e14" stroke-width="0.9" stroke-linejoin="round"/></svg>`;

// Territory labels the basemap gets wrong for this audience: it splits
// Palestine into "West Bank" / "Gaza Strip", and labels the TRNC as "Northern
// Cyprus". Those basemap labels are filtered out of country-label and replaced
// with the two points below.
export const TERRITORY_LABEL_SOURCE = "territory-labels";
export const TERRITORY_LABEL_LAYER = "territory-labels";
export const HIDDEN_COUNTRY_LABELS = [
  "West Bank",
  "Gaza Strip",
  "Northern Cyprus",
  "N. Cyprus",
];
export const TERRITORY_LABELS: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [35.2, 31.95] },
      properties: { name: "Palestine" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [33.72, 35.28] },
      properties: { name: "KKTC" },
    },
  ],
};

// A gentle light wash on the hovered region — the region reads as lifting into
// focus, not glowing.
export const HOVER_FILL = "rgba(255, 255, 255, 0.1)";

// Shimmer palette: a soft standing rim with a slightly brighter band drifting
// around it — closer to a moving sheen than a neon pulse.
export const RIM_DIM = "rgba(255, 255, 255, 0.2)";
export const RIM_BRIGHT = "rgba(255, 255, 255, 0.8)";
export const GLOW_COLOR = "rgba(255, 255, 255, 0.8)";

// Half-width of the travelling band, as a fraction of the outline length.
export const BAND_HALF_WIDTH = 0.06;
// Fraction of the loop covered per frame — an unhurried lap, ~3.5 s.
export const SHIMMER_SPEED = 0.005;
// Bands are kept off the exact 0/1 seam, where a closed ring joins itself.
export const SEAM_MARGIN = 0.03;

export type GradientStop = number | string;

/**
 * Builds a line-gradient expression with one or more bright bands over a dim
 * rim. Band centres are fractions along the outline; positions are forced
 * strictly ascending so Mapbox accepts the stop list.
 */
export function shimmerGradient(centers: number[]): mapboxgl.Expression {
  const points: Array<[number, string]> = [
    [0, RIM_DIM],
    [1, RIM_DIM],
  ];

  for (const raw of centers) {
    const center = Math.min(1 - SEAM_MARGIN, Math.max(SEAM_MARGIN, raw));
    points.push([Math.max(0, center - BAND_HALF_WIDTH), RIM_DIM]);
    points.push([center, RIM_BRIGHT]);
    points.push([Math.min(1, center + BAND_HALF_WIDTH), RIM_DIM]);
  }

  points.sort((a, b) => a[0] - b[0]);

  const stops: GradientStop[] = [];
  let previous = -1;
  for (const [position, color] of points) {
    const clamped = position <= previous ? previous + 1e-4 : position;
    if (clamped >= 1) break;
    stops.push(clamped, color);
    previous = clamped;
  }
  stops.push(1, RIM_DIM);

  return [
    "interpolate",
    ["linear"],
    ["line-progress"],
    ...stops,
  ] as unknown as mapboxgl.Expression;
}

/** Polygon / MultiPolygon rings as MultiLineString coordinates. */
export function ringsOf(geometry: GeoJSON.Geometry): number[][][] {
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

export const EMPTY_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};
