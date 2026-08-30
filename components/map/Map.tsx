"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "@/lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useRouter } from "next/navigation";
import MapControls from "@/components/map/MapControls";
import SpaceParticles from "@/components/ui/SpaceParticles";
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
const MAP_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";

const INITIAL_CENTER: [number, number] = [12, 50];
const INITIAL_ZOOM = 3.6;
// The camera looks straight down. The hover effect is a flat shimmer now, so a
// tilt would add nothing.
const INITIAL_PITCH = 0;

const REGION_SOURCE = "regions";
// Invisible surface that only exists to catch hover and click.
const REGION_HIT_LAYER = "region-hit";
// City names — the lowest label tier. Drawn from a Point-per-city source so a
// region made of several polygons (islands, exclaves) is still named once.
const LABEL_SOURCE = "region-labels";
const REGION_LABEL_LAYER = "region-label";
const LABEL_COLOR = "#f9fafb";
const LABEL_HALO = "#0b0e14";

// Basemap admin-0 lines restyled to this so national borders stay legible over
// satellite imagery. The disputed-boundary line is what shows Cyprus as two.
const COUNTRY_BORDER_COLOR = "rgba(255, 255, 255, 0.5)";

// Outline of the hovered region, kept in its own source because line-gradient
// (the travelling shimmer) needs a LineString geometry with line metrics.
const HIGHLIGHT_SOURCE = "region-highlight";
const HIGHLIGHT_GLOW_LAYER = "region-highlight-glow";
const HIGHLIGHT_EDGE_LAYER = "region-highlight-edge";

const HOVER_FILL_DURATION_MS = 180;

// Every basemap label below country level goes: settlements (towns / villages /
// districts), POI, transit, road shields and the admin-1 "state" labels. The
// label ladder is then continent → country (basemap) → city (region-label).
const HIDDEN_LABEL_KEYWORDS = [
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
const ROAD_LINE_PREFIXES = ["road-", "tunnel-", "bridge-"];

// The "railways" toggle adds one line layer from public/map/railways.geojson
// (categorised OSM rail — see scripts/build-railways.ts). Line colour and paint
// order come from each feature's `c` category. The file is a few MB, so it is
// fetched only the first time the toggle is switched on, not on every map.
const RAIL_SOURCE = "railways";
const RAIL_LAYER = "overlay-rail";

// Every raw `c` value maps through its group (see lib/rail-colors.ts) to a
// colour, a paint order and a width multiplier. `train` is the falls-through
// default so each match always has an output.
const RAW_RAIL_CATEGORIES = Object.keys(RAIL_GROUP_OF) as RawRailCategory[];

const RAIL_COLOR_EXPRESSION = [
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
const RAIL_SORT_KEY_EXPRESSION = [
  "match",
  ["get", "c"],
  ...RAW_RAIL_CATEGORIES.flatMap((category) => [
    category,
    RAIL_DRAW_ORDER.indexOf(RAIL_GROUP_OF[category]),
  ]),
  0,
] as unknown as mapboxgl.Expression;

// Per-group multiplier on the zoom width ramp below.
const RAIL_WIDTH_SCALE_EXPRESSION = [
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
const RAIL_WIDTH_EXPRESSION = [
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
const BASEMAP_AIRPORT_LAYER = "airport-label";
const AIRPORT_SOURCE = "airports";
const AIRPORT_LAYER = "overlay-airport";
const AIRPORT_ICON = "airport-marker";
// Sky blue: legible over dark imagery and distinct from every rail colour.
const AIRPORT_COLOR = "#7dd3fc";
// Plane glyph drawn once and registered with the map (map.addImage). Keeping it
// inline avoids depending on whatever the basemap sprite happens to ship.
const AIRPORT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24"><path d="M13.4 9V3.5a1.4 1.4 0 0 0-2.8 0V9L2 14v2l8.6-2.6V19L8 20.6V22l4-1.2 4 1.2v-1.4L13.4 19v-5.6L22 16v-2z" fill="${AIRPORT_COLOR}" stroke="#0b0e14" stroke-width="0.9" stroke-linejoin="round"/></svg>`;

// Territory labels the basemap gets wrong for this audience: it splits
// Palestine into "West Bank" / "Gaza Strip", and labels the TRNC as "Northern
// Cyprus". Those basemap labels are filtered out of country-label and replaced
// with the two points below.
const TERRITORY_LABEL_SOURCE = "territory-labels";
const TERRITORY_LABEL_LAYER = "territory-labels";
const HIDDEN_COUNTRY_LABELS = [
  "West Bank",
  "Gaza Strip",
  "Northern Cyprus",
  "N. Cyprus",
];
const TERRITORY_LABELS: GeoJSON.FeatureCollection = {
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
const HOVER_FILL = "rgba(255, 255, 255, 0.1)";

// Shimmer palette: a soft standing rim with a slightly brighter band drifting
// around it — closer to a moving sheen than a neon pulse.
const RIM_DIM = "rgba(255, 255, 255, 0.2)";
const RIM_BRIGHT = "rgba(255, 255, 255, 0.8)";
const GLOW_COLOR = "rgba(255, 255, 255, 0.8)";

// Half-width of the travelling band, as a fraction of the outline length.
const BAND_HALF_WIDTH = 0.06;
// Fraction of the loop covered per frame — an unhurried lap, ~3.5 s.
const SHIMMER_SPEED = 0.005;
// Bands are kept off the exact 0/1 seam, where a closed ring joins itself.
const SEAM_MARGIN = 0.03;

type GradientStop = number | string;

/**
 * Builds a line-gradient expression with one or more bright bands over a dim
 * rim. Band centres are fractions along the outline; positions are forced
 * strictly ascending so Mapbox accepts the stop list.
 */
function shimmerGradient(centers: number[]): mapboxgl.Expression {
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
function ringsOf(geometry: GeoJSON.Geometry): number[][][] {
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

const EMPTY_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const router = useRouter();
  // Set once the style has loaded: the flag that shows the control and the
  // motorway layer ids it toggles (only knowable after parsing the style).
  const [controls, setControls] = useState<{
    ready: boolean;
    motorwayLayerIds: string[];
  }>({ ready: false, motorwayLayerIds: [] });
  // The layer control reports the railway toggle here; Map owns the rail
  // layer so there is no add / flip race. The geojson is only fetched the
  // first time it is switched on.
  const [railwaysOn, setRailwaysOn] = useState(false);
  // The airport layer is added hidden on load; this only flips its visibility.
  const [airportsOn, setAirportsOn] = useState(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (railwaysOn && !map.getLayer(RAIL_LAYER)) {
      if (!map.getSource(RAIL_SOURCE)) {
        map.addSource(RAIL_SOURCE, {
          type: "geojson",
          data: "/map/railways.geojson",
        });
      }
      map.addLayer(
        {
          id: RAIL_LAYER,
          type: "line",
          source: RAIL_SOURCE,
          layout: {
            visibility: "none",
            "line-cap": "round",
            "line-join": "round",
            "line-sort-key": RAIL_SORT_KEY_EXPRESSION,
          },
          paint: {
            "line-color": RAIL_COLOR_EXPRESSION,
            "line-width": RAIL_WIDTH_EXPRESSION,
            "line-opacity": 0.9,
          },
        },
        map.getLayer(REGION_HIT_LAYER) ? REGION_HIT_LAYER : undefined,
      );
    }

    const visibility = railwaysOn ? "visible" : "none";
    if (map.getLayer(RAIL_LAYER)) {
      map.setLayoutProperty(RAIL_LAYER, "visibility", visibility);
    }
  }, [railwaysOn]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const visibility = airportsOn ? "visible" : "none";
    if (map.getLayer(AIRPORT_LAYER)) {
      map.setLayoutProperty(AIRPORT_LAYER, "visibility", visibility);
    }
  }, [airportsOn]);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      projection: "globe",
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      pitch: INITIAL_PITCH,
      maxPitch: 0,
    });

    mapRef.current = map;

    let shimmerFrame = 0;

    map.on("load", async () => {
      map.setFog({
        color: "#0b0e14",
        "high-color": "#132033",
        "horizon-blend": 0.04,
        // Transparent, so SpaceParticles below the canvas becomes the space.
        // Mapbox's own star field goes with it — two of them read as noise.
        "space-color": "rgba(0, 0, 0, 0)",
        "star-intensity": 0,
      });

      // Hide every below-country label (see HIDDEN_LABEL_KEYWORDS), the whole
      // road web, and the basemap's admin-1 (state / province / il) borders;
      // keep continent and country labels; brighten national borders.
      const motorwayLayerIds: string[] = [];
      for (const layer of map.getStyle().layers ?? []) {
        const isHiddenLabel =
          layer.type === "symbol" &&
          HIDDEN_LABEL_KEYWORDS.some((keyword) => layer.id.includes(keyword));
        const isRoadLine =
          layer.type === "line" &&
          ROAD_LINE_PREFIXES.some((prefix) => layer.id.startsWith(prefix));
        // admin-1-boundary and admin-1-boundary-bg — the only sub-national
        // outlines the style ships. Province borders only exist on hover now.
        const isProvinceBorder = layer.id.startsWith("admin-1-boundary");
        // The basemap airport layer is replaced by the all-zoom overlay below.
        const isBasemapAirport = layer.id === BASEMAP_AIRPORT_LAYER;

        if (
          layer.type === "line" &&
          (layer.id.includes("motorway-trunk") ||
            layer.id.includes("major-link"))
        ) {
          motorwayLayerIds.push(layer.id);
        }

        if (
          isHiddenLabel ||
          isRoadLine ||
          isProvinceBorder ||
          isBasemapAirport
        ) {
          map.setLayoutProperty(layer.id, "visibility", "none");
          continue;
        }

        // The national boundary line and the disputed one (Cyprus, etc.), not
        // their wide blurred backing.
        if (
          layer.id === "admin-0-boundary" ||
          layer.id === "admin-0-boundary-disputed"
        ) {
          map.setLayoutProperty(layer.id, "visibility", "visible");
          map.setPaintProperty(layer.id, "line-color", COUNTRY_BORDER_COLOR);
          map.setPaintProperty(layer.id, "line-opacity", 1);
        }
      }

      // Drop the basemap's "West Bank" / "Gaza Strip" / "Northern Cyprus"
      // labels (by ISO code where there is one, then by English name) and paint
      // the replacements from TERRITORY_LABELS.
      if (map.getLayer("country-label")) {
        const current = map.getFilter("country-label");
        map.setFilter("country-label", [
          "all",
          current as unknown as boolean,
          ["!=", ["get", "iso_3166_1"], "PS"],
          ["!", ["in", ["get", "name_en"], ["literal", HIDDEN_COUNTRY_LABELS]]],
        ] as unknown as mapboxgl.Expression);
      }
      map.addSource(TERRITORY_LABEL_SOURCE, {
        type: "geojson",
        data: TERRITORY_LABELS,
      });
      map.addLayer({
        id: TERRITORY_LABEL_LAYER,
        type: "symbol",
        source: TERRITORY_LABEL_SOURCE,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 13,
          "text-max-width": 6,
          "text-letter-spacing": 0.05,
        },
        paint: {
          "text-color": LABEL_COLOR,
          "text-halo-color": LABEL_HALO,
          "text-halo-width": 1.4,
        },
      });

      // Fetched here instead of handed to the source as a URL: the hover
      // outline is looked up from this same array by feature id, so the map
      // and the lookup have to share one parsed copy.
      let regionCollection: GeoJSON.FeatureCollection;
      try {
        regionCollection = await fetch("/map/regions.geojson").then(
          (response) => {
            if (!response.ok) {
              throw new Error(`regions.geojson: HTTP ${response.status}`);
            }
            return response.json() as Promise<GeoJSON.FeatureCollection>;
          },
        );
      } catch (error) {
        console.error("Map region layer failed to load", error);
        setControls({ ready: true, motorwayLayerIds });
        return;
      }

      // Ids by array index: they drive both the hover feature-state and the
      // outline lookup below, and stay stable across tiling (the same rule
      // Mapbox's `generateId` uses).
      regionCollection.features.forEach((feature, index) => {
        feature.id = index;
      });
      const regionGeometries = regionCollection.features.map(
        (feature) => feature.geometry,
      );

      map.addSource(REGION_SOURCE, {
        type: "geojson",
        data: regionCollection,
      });

      map.addSource(LABEL_SOURCE, {
        type: "geojson",
        data: "/map/region-labels.geojson",
      });

      // Hit surface: a flat fill that is fully transparent until hovered, when
      // it takes a faint wash. The show/hide rides on `fill-color`'s alpha —
      // `fill-opacity` does not accept feature-state expressions. The layer is
      // still queried for hover and click regardless of its paint.
      map.addLayer({
        id: REGION_HIT_LAYER,
        type: "fill",
        source: REGION_SOURCE,
        filter: ["has", "citySlug"],
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            HOVER_FILL,
            "rgba(255, 255, 255, 0)",
          ],
          "fill-color-transition": {
            duration: prefersReducedMotion ? 0 : HOVER_FILL_DURATION_MS,
            delay: 0,
          },
        },
      });

      // City names — the only label tier below country, one Point per city.
      // Bigger cities win the collision (symbol-sort-key), and a
      // zoom-vs-population gate keeps the smallest ones hidden until the camera
      // is close: a few names at the continental view, every city once zoomed in.
      map.addLayer({
        id: REGION_LABEL_LAYER,
        type: "symbol",
        source: LABEL_SOURCE,
        filter: [
          ">=",
          ["to-number", ["get", "population"], 0],
          [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            600000,
            4.5,
            150000,
            6,
            40000,
            8,
            0,
          ],
        ],
        layout: {
          "text-field": ["get", "name"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            10,
            6,
            13,
            9,
            16,
          ],
          "text-allow-overlap": false,
          "symbol-sort-key": ["-", 0, ["to-number", ["get", "population"], 0]],
        },
        paint: {
          "text-color": LABEL_COLOR,
          "text-halo-color": LABEL_HALO,
          "text-halo-width": 1.4,
        },
      });

      map.addSource(HIGHLIGHT_SOURCE, {
        type: "geojson",
        data: EMPTY_GEOJSON,
        // line-gradient reads progress along the outline from line metrics.
        lineMetrics: true,
      });

      // Soft bloom that reads as the region glowing along its edge.
      map.addLayer({
        id: HIGHLIGHT_GLOW_LAYER,
        type: "line",
        source: HIGHLIGHT_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": GLOW_COLOR,
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 4, 8, 9],
          "line-blur": 6,
          "line-opacity": 0.2,
        },
      });

      // Crisp edge carrying the travelling shimmer.
      map.addLayer({
        id: HIGHLIGHT_EDGE_LAYER,
        type: "line",
        source: HIGHLIGHT_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.4, 8, 2.4],
          "line-gradient": shimmerGradient(
            prefersReducedMotion ? [0.5] : [0, 0.5],
          ),
        },
      });

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "city-tooltip",
        offset: 12,
      });

      let hoveredId: number | null = null;
      let phase = 0;

      const runShimmer = () => {
        phase = (phase + SHIMMER_SPEED) % 1;
        map.setPaintProperty(
          HIGHLIGHT_EDGE_LAYER,
          "line-gradient",
          shimmerGradient([phase, (phase + 0.5) % 1]),
        );
        const breath = 0.5 + 0.5 * Math.sin(phase * Math.PI * 4);
        map.setPaintProperty(
          HIGHLIGHT_GLOW_LAYER,
          "line-opacity",
          0.16 + breath * 0.12,
        );
        shimmerFrame = requestAnimationFrame(runShimmer);
      };

      const clearHover = () => {
        if (hoveredId !== null) {
          map.setFeatureState(
            { source: REGION_SOURCE, id: hoveredId },
            { hover: false },
          );
        }
        hoveredId = null;
        cancelAnimationFrame(shimmerFrame);
        shimmerFrame = 0;
        (map.getSource(HIGHLIGHT_SOURCE) as mapboxgl.GeoJSONSource).setData(
          EMPTY_GEOJSON,
        );
        popup.remove();
        map.getCanvas().style.cursor = "";
      };

      map.on("mousemove", REGION_HIT_LAYER, (event) => {
        const feature = event.features?.[0];
        if (!feature || typeof feature.id !== "number") return;

        if (feature.id !== hoveredId) {
          if (hoveredId !== null) {
            map.setFeatureState(
              { source: REGION_SOURCE, id: hoveredId },
              { hover: false },
            );
          }
          hoveredId = feature.id;
          map.setFeatureState(
            { source: REGION_SOURCE, id: hoveredId },
            { hover: true },
          );

          (map.getSource(HIGHLIGHT_SOURCE) as mapboxgl.GeoJSONSource).setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "MultiLineString",
              // Full outline from the parsed source copy. `feature.geometry`
              // off a rendered-feature query is clipped to the tile under the
              // pointer, so the shimmer traced a different partial edge
              // depending on which side the pointer entered from and broke off
              // at tile seams near the coast.
              coordinates: ringsOf(
                regionGeometries[feature.id] ?? feature.geometry,
              ),
            },
          });

          if (!prefersReducedMotion && shimmerFrame === 0) {
            shimmerFrame = requestAnimationFrame(runShimmer);
          }
        }

        popup
          .setLngLat(event.lngLat)
          .setText(String(feature.properties?.name ?? ""))
          .addTo(map);
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", REGION_HIT_LAYER, clearHover);

      map.on("click", REGION_HIT_LAYER, (event) => {
        const slug = event.features?.[0]?.properties?.citySlug;
        if (typeof slug === "string") router.push(`/c/${slug}`);
      });

      // Airport overlay (added hidden; the [airportsOn] effect flips visibility).
      // A plane marker at every zoom, the IATA code once the camera is close.
      // `icon-allow-overlap: false` lets collision thin the field to the major
      // hubs at continental zoom and fill in as the camera moves closer.
      try {
        if (!map.hasImage(AIRPORT_ICON)) {
          const icon = new Image();
          await new Promise<void>((resolve, reject) => {
            icon.onload = () => resolve();
            icon.onerror = () => reject(new Error("airport icon failed"));
            icon.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
              AIRPORT_ICON_SVG,
            )}`;
          });
          map.addImage(AIRPORT_ICON, icon, { pixelRatio: 2 });
        }

        map.addSource(AIRPORT_SOURCE, {
          type: "geojson",
          data: "/map/airports.geojson",
        });
        map.addLayer({
          id: AIRPORT_LAYER,
          type: "symbol",
          source: AIRPORT_SOURCE,
          layout: {
            // Added hidden: the visibility effect runs before the style has
            // loaded, so the layer itself has to carry the default.
            visibility: "none",
            "icon-image": AIRPORT_ICON,
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              3,
              0.55,
              7,
              0.8,
              11,
              1,
            ],
            "icon-allow-overlap": false,
            "icon-padding": 3,
            "text-field": ["step", ["zoom"], "", 5, ["get", "iata"]],
            "text-size": ["interpolate", ["linear"], ["zoom"], 5, 10, 9, 12],
            "text-offset": [0, 1.1],
            "text-anchor": "top",
            "text-optional": true,
          },
          paint: {
            "text-color": AIRPORT_COLOR,
            "text-halo-color": LABEL_HALO,
            "text-halo-width": 1.2,
          },
        });
      } catch (error) {
        console.error("Airport overlay failed to load", error);
      }

      setControls({ ready: true, motorwayLayerIds });
    });

    return () => {
      cancelAnimationFrame(shimmerFrame);
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Built once — the region data is a static file, not a prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-screen w-full bg-ink-950">
      <SpaceParticles />
      <div ref={containerRef} className="relative h-full w-full" />
      <MapControls
        mapRef={mapRef}
        ready={controls.ready}
        motorwayLayerIds={controls.motorwayLayerIds}
        onRailwaysToggle={setRailwaysOn}
        onAirportsToggle={setAirportsOn}
      />
    </div>
  );
}
