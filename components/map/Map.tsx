"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "@/lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useRouter } from "next/navigation";
import { latinize } from "@/lib/latinize";
import { REGION_NAME_OVERRIDES, BALKAN_REGION_NAMES } from "@/lib/regionNames";
import type { City } from "@/types";

type MapProps = {
  cities?: City[];
  isStatic?: boolean;
};

// A "natural"/muted categorical palette (10 hues, OKLCH-tuned and validated
// for CVD-safe separation) assigned so that no two countries sharing a land
// border ever get the same color — colors repeat only between countries far
// enough apart on the map that they're never mistaken for one another.
const COUNTRY_COLORS: Record<string, string> = {
  DE: "#00b09d",
  AL: "#00b09d",
  RO: "#00b09d",
  TR: "#00b09d",

  AT: "#007a9b",
  BE: "#007a9b",
  XK: "#007a9b",
  CY: "#007a9b",

  RS: "#5b9ae5",
  CZ: "#5b9ae5",
  ES: "#5b9ae5",
  XCY: "#5b9ae5",

  FR: "#6a5aaf",
  EL: "#6a5aaf",
  FI: "#6a5aaf",
  DK: "#6a5aaf",

  HU: "#c079c2",
  IT: "#c079c2",
  LI: "#c079c2",
  EE: "#c079c2",

  BG: "#a44564",
  PL: "#a44564",
  LV: "#a44564",
  IE: "#a44564",

  CH: "#da785a",
  SI: "#da785a",
  LT: "#da785a",
  PT: "#da785a",

  HR: "#955b00",
  SK: "#955b00",
  NL: "#955b00",
  UK: "#955b00",

  ME: "#9d9d2e",
  LU: "#9d9d2e",
  NO: "#9d9d2e",
  IS: "#9d9d2e",

  MK: "#2d7d38",
  BA: "#2d7d38",
  SE: "#2d7d38",
  MT: "#2d7d38",
};

const FALLBACK_REGION_COLOR = "#e5e7eb";

// A darker tone of each region's own color, used on hover instead of a flat
// opacity bump. Simple per-channel multiply — keeps hue stable while reading
// unambiguously as "the same color, deepened", not a different color.
function darken(hex: string, amount = 0.32): string {
  const scale = 1 - amount;
  const channel = (start: number) =>
    Math.round(parseInt(hex.slice(start, start + 2), 16) * scale)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

// A lightened tint of each region's own color, used for the hover
// "highlight" rim — reads as light catching the raised edge, and stays
// visually tied to that region's own color rather than a generic white line
// that would blend into the basemap and the always-on white borders.
function lighten(hex: string, amount = 0.55): string {
  const channel = (start: number) => {
    const original = parseInt(hex.slice(start, start + 2), 16);
    return Math.round(original + (255 - original) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

const DARK_COUNTRY_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_COLORS).map(([code, color]) => [code, darken(color)]),
);

const LIGHT_COUNTRY_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_COLORS).map(([code, color]) => [code, lighten(color)]),
);

const HOVER_FILL_OPACITY: mapboxgl.ExpressionSpecification = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  0.85,
  0.6,
];

const HOVER_SHADOW_OPACITY: mapboxgl.ExpressionSpecification = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  0.45,
  0,
];

const HOVER_HIGHLIGHT_WIDTH: mapboxgl.ExpressionSpecification = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  1.5,
  0,
];

const HOVER_LINE_WIDTH: mapboxgl.ExpressionSpecification = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  2.5,
  0,
];

function hoverColorCase(normal: unknown, hover: unknown): unknown[] {
  return [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    hover,
    normal,
  ];
}

function normalizeRegionName(name: string): string {
  return latinize(name).toLowerCase().replace(/-/g, " ");
}

function resolveFeatureName(properties: Record<string, unknown>): string {
  const nutsId = properties.NUTS_ID as string | undefined;
  if (nutsId && REGION_NAME_OVERRIDES[nutsId])
    return REGION_NAME_OVERRIDES[nutsId];

  const gid1 = properties.GID_1 as string | undefined;
  if (gid1 && BALKAN_REGION_NAMES[gid1]) return BALKAN_REGION_NAMES[gid1];

  return (
    (properties.NAME_LATN as string) ||
    (properties.NUTS_NAME as string) ||
    (properties.NAME_1 as string) ||
    (properties.name as string) ||
    ""
  );
}

function buildCountryColorExpression(
  palette: Record<string, string>,
  fallback: string,
): unknown[] {
  const entries = Object.entries(palette).flatMap(([code, color]) => [
    code,
    color,
  ]);
  return ["match", ["slice", ["get", "NUTS_ID"], 0, 2], ...entries, fallback];
}

export default function Map({ cities = [], isStatic = false }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const citiesRef = useRef<City[]>([]);
  const router = useRouter();

  useEffect(() => {
    citiesRef.current = cities;
  }, [cities]);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      projection: "globe",
      center: [10, 50],
      zoom: 4,
      pitch: 0,
      interactive: !isStatic,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Globe + space now that the hover "pop" is built entirely from flat
      // 2D layers (fill/line translate + opacity), not fill-extrusion —
      // globe projection is only incompatible with 3D geometry, not this.
      map.setFog({
        color: "#000000",
        "high-color": "#000000",
        "horizon-blend": 0.02,
        "space-color": "#000000",
        "star-intensity": 0.6,
      });

      map.setPaintProperty("water", "fill-color", "#3b82f6");
      if (map.getLayer("water-shadow")) {
        map.setPaintProperty("water-shadow", "fill-color", "#0ea5e9");
      }

      const HIDDEN_LABEL_KEYWORDS = [
        "settlement",
        "place",
        "town",
        "village",
        "region",
      ];
      map.getStyle().layers?.forEach((layer) => {
        if (layer.type !== "symbol") return;
        const isPlaceLabel = HIDDEN_LABEL_KEYWORDS.some((kw) =>
          layer.id.includes(kw),
        );
        const isCountryLabel = layer.id.includes("country-label");
        if (isPlaceLabel) map.setLayoutProperty(layer.id, "visibility", "none");
        if (isCountryLabel) {
          map.setLayoutProperty(layer.id, "visibility", "visible");
          // Force Latin-script country names regardless of the visitor's
          // browser/OS locale, matching the Latin city/region names below.
          map.setLayoutProperty(layer.id, "text-field", [
            "coalesce",
            ["get", "name_en"],
            ["get", "name"],
          ]);
        }
      });

      if (!isStatic) {
        popupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: "city-tooltip",
          offset: 15,
        });
      }

      map.addSource("nuts", {
        type: "geojson",
        data: "/eu-cities/europe.geojson",
        generateId: true,
      });
      map.addSource("bosnia", {
        type: "geojson",
        data: "/eu-cities/bosnia.json",
        generateId: true,
      });
      map.addSource("montenegro", {
        type: "geojson",
        data: "/eu-cities/montenegro.json",
        generateId: true,
      });
      map.addSource("kosovo", {
        type: "geojson",
        data: "/eu-cities/kosovo.json",
        generateId: true,
      });
      map.addSource("cyprus", {
        type: "geojson",
        data: "/eu-cities/cyprus.json",
        generateId: true,
      });

      // Cyprus and Montenegro are excluded here — Eurostat only models
      // Cyprus as a single (Republic of Cyprus) unit and Montenegro as a
      // single whole-country unit, so both are drawn from their own
      // dedicated, real-city-level layers instead (added above/below).
      // Germany and the UK's NUTS3 level is hundreds of small,
      // unrecognizable rural districts; NUTS2 has far fewer, bigger,
      // more recognizable regions — every other country stays at NUTS3.
      const NUTS_LEVEL_2_COUNTRIES = ["DE", "UK"];
      const cityFilter = [
        "all",
        ["!=", ["get", "CNTR_CODE"], "CY"],
        ["!=", ["get", "CNTR_CODE"], "ME"],
        [
          "any",
          [
            "all",
            ["in", ["get", "CNTR_CODE"], ["literal", NUTS_LEVEL_2_COUNTRIES]],
            ["==", ["get", "LEVL_CODE"], 2],
          ],
          [
            "all",
            [
              "!",
              ["in", ["get", "CNTR_CODE"], ["literal", NUTS_LEVEL_2_COUNTRIES]],
            ],
            ["==", ["get", "LEVL_CODE"], 3],
          ],
        ],
      ];

      map.addLayer({
        id: "country-fill",
        type: "fill",
        source: "nuts",
        filter: ["==", ["get", "LEVL_CODE"], 0],
        paint: { "fill-color": FALLBACK_REGION_COLOR, "fill-opacity": 0.2 },
      });

      type RegionLayer = {
        id: string;
        source: string;
        filter?: unknown[];
        color: unknown;
        hoverColor: unknown;
        highlightColor: unknown;
      };

      const regionLayers: RegionLayer[] = [
        {
          id: "city",
          source: "nuts",
          filter: cityFilter,
          color: buildCountryColorExpression(
            COUNTRY_COLORS,
            FALLBACK_REGION_COLOR,
          ),
          hoverColor: buildCountryColorExpression(
            DARK_COUNTRY_COLORS,
            darken(FALLBACK_REGION_COLOR),
          ),
          highlightColor: buildCountryColorExpression(
            LIGHT_COUNTRY_COLORS,
            lighten(FALLBACK_REGION_COLOR),
          ),
        },
        {
          id: "bosnia",
          source: "bosnia",
          color: COUNTRY_COLORS.BA,
          hoverColor: DARK_COUNTRY_COLORS.BA,
          highlightColor: LIGHT_COUNTRY_COLORS.BA,
        },
        {
          id: "montenegro",
          source: "montenegro",
          color: COUNTRY_COLORS.ME,
          hoverColor: DARK_COUNTRY_COLORS.ME,
          highlightColor: LIGHT_COUNTRY_COLORS.ME,
        },
        {
          id: "kosovo",
          source: "kosovo",
          color: COUNTRY_COLORS.XK,
          hoverColor: DARK_COUNTRY_COLORS.XK,
          highlightColor: LIGHT_COUNTRY_COLORS.XK,
        },
        {
          id: "cyprus",
          source: "cyprus",
          color: [
            "match",
            ["get", "GID_1"],
            "CYN.1_1",
            COUNTRY_COLORS.XCY,
            COUNTRY_COLORS.CY,
          ],
          hoverColor: [
            "match",
            ["get", "GID_1"],
            "CYN.1_1",
            DARK_COUNTRY_COLORS.XCY,
            DARK_COUNTRY_COLORS.CY,
          ],
          highlightColor: [
            "match",
            ["get", "GID_1"],
            "CYN.1_1",
            LIGHT_COUNTRY_COLORS.XCY,
            LIGHT_COUNTRY_COLORS.CY,
          ],
        },
      ];

      for (const {
        id,
        source,
        filter,
        color,
        hoverColor,
        highlightColor,
      } of regionLayers) {
        const filterProp = filter
          ? { filter: filter as mapboxgl.FilterSpecification }
          : {};
        const colorExpr = hoverColorCase(
          color,
          hoverColor,
        ) as mapboxgl.DataDrivenPropertyValueSpecification<string>;

        // A "raised card" look built entirely from flat 2D layers — no
        // camera pitch, no 3D geometry, so the map itself never tilts and
        // stays 2D at every zoom level. Only the hovered feature gets it:
        // a dark cast shadow offset down-right (simulating light from the
        // top-left) plus a bright highlight rim offset up-left on the same
        // side the "light" comes from, both invisible until hovered.
        map.addLayer({
          id: `${id}-shadow`,
          type: "fill",
          source,
          ...filterProp,
          paint: {
            "fill-color": "#0f172a",
            "fill-opacity": HOVER_SHADOW_OPACITY,
            "fill-translate": [6, 7],
          },
        });
        // Base color, switching to a darker tone of itself on hover.
        map.addLayer({
          id: `${id}-fill`,
          type: "fill",
          source,
          ...filterProp,
          paint: {
            "fill-color": colorExpr,
            "fill-opacity": HOVER_FILL_OPACITY,
          },
        });
        map.addLayer({
          id: `${id}-highlight`,
          type: "line",
          source,
          ...filterProp,
          paint: {
            "line-color":
              highlightColor as mapboxgl.DataDrivenPropertyValueSpecification<string>,
            "line-width": HOVER_HIGHLIGHT_WIDTH,
            "line-opacity": 0.9,
            "line-translate": [-1.5, -2],
          },
        });
        map.addLayer({
          id: `${id}-outline`,
          type: "line",
          source,
          ...filterProp,
          paint: { "line-color": "#ffffff", "line-width": 0.5 },
        });
        map.addLayer({
          id: `${id}-hover`,
          type: "line",
          source,
          ...filterProp,
          paint: { "line-color": "#000", "line-width": HOVER_LINE_WIDTH },
        });
      }

      function resolveDisplayName(rawName: string) {
        const matchedCity = citiesRef.current.find(
          (c) => normalizeRegionName(c.name) === normalizeRegionName(rawName),
        );
        return {
          matchedCity,
          displayName: latinize(matchedCity ? matchedCity.name : rawName),
        };
      }

      // The background maps on the profile, auth and error pages are purely
      // decorative: no popup, no cursor change, no navigation on click.
      if (isStatic) return;

      for (const { id, source } of regionLayers) {
        let hoveredId: number | null = null;
        const layerId = `${id}-fill`;

        map.on("mousemove", layerId, (e) => {
          if (!e.features?.length) return;

          const featureId = e.features[0].id as number;
          if (hoveredId !== featureId) {
            if (hoveredId !== null) {
              map.setFeatureState({ source, id: hoveredId }, { hover: false });
            }
            hoveredId = featureId;
            map.setFeatureState({ source, id: featureId }, { hover: true });
          }

          const rawName = resolveFeatureName(e.features[0].properties ?? {});
          if (!rawName) return;

          const { displayName } = resolveDisplayName(rawName);
          popupRef.current
            ?.setLngLat(e.lngLat)
            .setHTML(`<strong>${displayName}</strong>`)
            .addTo(map);
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", layerId, () => {
          if (hoveredId !== null) {
            map.setFeatureState({ source, id: hoveredId }, { hover: false });
          }
          hoveredId = null;
          popupRef.current?.remove();
          map.getCanvas().style.cursor = "";
        });

        map.on("click", layerId, (e) => {
          if (!e.features?.length) return;
          const rawName = resolveFeatureName(e.features[0].properties ?? {});
          if (!rawName) return;

          const { matchedCity } = resolveDisplayName(rawName);
          const slug = matchedCity
            ? matchedCity.slug
            : latinize(rawName).toLowerCase().replace(/\s+/g, "-");

          router.push(`/c/${slug}`);
        });
      }
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={mapContainerRef} className="w-full h-screen" />;
}
