"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "@/lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useRouter } from "next/navigation";
import MapControls from "@/components/map/MapControls";
import { RAIL_CATEGORY_COLORS, RAIL_DRAW_ORDER } from "@/lib/rail-colors";

type MapProps = {
  isStatic?: boolean;
};

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

// `["match", ["get","c"], "highspeed", <col>, ..., <mainline col>]` — mainline
// is the falls-through default so the match always has an output.
const RAIL_COLOR_EXPRESSION = [
  "match",
  ["get", "c"],
  ...RAIL_DRAW_ORDER.filter((category) => category !== "rail").flatMap(
    (category) => [category, RAIL_CATEGORY_COLORS[category]],
  ),
  RAIL_CATEGORY_COLORS.rail,
] as unknown as mapboxgl.Expression;

// Index in the draw order = line-sort-key: mainline (0) painted first, the
// flagship high-speed network last so it sits on top at junctions.
const RAIL_SORT_KEY_EXPRESSION = [
  "match",
  ["get", "c"],
  ...RAIL_DRAW_ORDER.flatMap((category, index) => [category, index]),
  0,
] as unknown as mapboxgl.Expression;

// The basemap's own airport symbol layer. Always on; only its zoom floor is
// lowered (see below).
const AIRPORT_LAYER = "airport-label";

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

export default function Map({ isStatic = false }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const router = useRouter();
  // Set together once the style has loaded: the flag that shows the control,
  // and the motorway layer ids it toggles (only knowable after parsing).
  const [controls, setControls] = useState<{
    ready: boolean;
    motorwayLayerIds: string[];
  }>({ ready: false, motorwayLayerIds: [] });
  // The layer control reports the railway toggle here; Map owns the rail
  // layer so there is no add / flip race. The geojson is only fetched the
  // first time it is switched on.
  const [railwaysOn, setRailwaysOn] = useState(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (railwaysOn && !map.getSource(RAIL_SOURCE)) {
      map.addSource(RAIL_SOURCE, {
        type: "geojson",
        data: "/map/railways.geojson",
      });
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
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              3,
              0.5,
              7,
              1.4,
              11,
              2.6,
              14,
              3.6,
            ],
            "line-opacity": ["match", ["get", "c"], "rail", 0.7, 0.95],
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
      interactive: !isStatic,
    });

    mapRef.current = map;

    let shimmerFrame = 0;

    map.on("load", () => {
      map.setFog({
        color: "#0b0e14",
        "high-color": "#132033",
        "horizon-blend": 0.04,
        "space-color": "#05070b",
        "star-intensity": 0.5,
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

        if (
          layer.type === "line" &&
          (layer.id.includes("motorway-trunk") ||
            layer.id.includes("major-link"))
        ) {
          motorwayLayerIds.push(layer.id);
        }

        if (isHiddenLabel || isRoadLine || isProvinceBorder) {
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

      // Airports are always on — no toggle. The basemap ships the layer at
      // minzoom 8; drop the floor to 4 so airports appear as soon as a country
      // fills the view. (The `airport_label` tiles carry no data much below
      // that, so a lower floor would not add anything.)
      if (map.getLayer(AIRPORT_LAYER)) {
        map.setLayerZoomRange(AIRPORT_LAYER, 4, 24);
      }

      map.addSource(REGION_SOURCE, {
        type: "geojson",
        data: "/map/regions.geojson",
        // Required for feature-state, which drives the hover.
        generateId: true,
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

      // Decorative background maps stop here: bare satellite, no interaction,
      // no layer control.
      if (isStatic) return;

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
              coordinates: ringsOf(feature.geometry),
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
    <div className="relative h-screen w-full">
      <div ref={containerRef} className="h-full w-full" />
      {!isStatic && (
        <MapControls
          mapRef={mapRef}
          ready={controls.ready}
          motorwayLayerIds={controls.motorwayLayerIds}
          onRailwaysToggle={setRailwaysOn}
        />
      )}
    </div>
  );
}
