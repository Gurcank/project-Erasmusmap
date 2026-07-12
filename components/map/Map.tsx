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

// Mapbox GL doesn't support data/feature-state expressions for
// fill-extrusion-opacity (camera expressions only), so the hover "pop" comes
// from two stacked layers per region: a 2D fill (data-driven opacity, as
// before) for the color/brightness change, and a fill-extrusion (fixed
// opacity, data-driven height) purely for the rise. Fixed rather than
// zoom-interpolated height, since a zoom expression is only valid at the
// top level of a style-spec expression — it can't be nested inside "case".
const HOVER_HEIGHT: mapboxgl.ExpressionSpecification = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  45000,
  0,
];

const HOVER_FILL_OPACITY: mapboxgl.ExpressionSpecification = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  0.9,
  0.6,
];

const HOVER_LINE_WIDTH: mapboxgl.ExpressionSpecification = [
  "case",
  ["boolean", ["feature-state", "hover"], false],
  3,
  0,
];

function normalizeRegionName(name: string): string {
  return latinize(name).toLowerCase().replace(/-/g, " ");
}

function resolveFeatureName(properties: Record<string, unknown>): string {
  const nutsId = properties.NUTS_ID as string | undefined;
  if (nutsId && REGION_NAME_OVERRIDES[nutsId]) return REGION_NAME_OVERRIDES[nutsId];

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

function buildCountryColorExpression(fallback: string): unknown[] {
  const entries = Object.entries(COUNTRY_COLORS).flatMap(([code, color]) => [
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
      pitch: 30,
      interactive: !isStatic,
    });

    mapRef.current = map;

    // Mapbox's globe projection doesn't render fill-extrusion height (the
    // hover "lift"), so switch to mercator once zoomed in far enough that
    // the globe's curvature isn't visible anyway and users are hovering
    // individual regions up close.
    const GLOBE_TO_MERCATOR_ZOOM = 5;
    let currentProjection: "globe" | "mercator" = "globe";
    map.on("zoom", () => {
      const shouldBeMercator = map.getZoom() >= GLOBE_TO_MERCATOR_ZOOM;
      const next = shouldBeMercator ? "mercator" : "globe";
      if (next !== currentProjection) {
        currentProjection = next;
        map.setProjection({ name: next });
      }
    });

    map.on("load", () => {
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

      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "city-tooltip",
        offset: 15,
      });

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

      // Eurostat only recognizes the Republic of Cyprus as a single NUTS
      // unit, so the whole island is excluded here in favor of the dedicated
      // "cyprus" source above, which splits it into two regions.
      const cityFilter = [
        "all",
        ["==", ["get", "LEVL_CODE"], 3],
        ["!=", ["get", "CNTR_CODE"], "CY"],
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
        fillColor: unknown;
      };

      const regionLayers: RegionLayer[] = [
        {
          id: "city",
          source: "nuts",
          filter: cityFilter,
          fillColor: buildCountryColorExpression(FALLBACK_REGION_COLOR),
        },
        {
          id: "bosnia",
          source: "bosnia",
          fillColor: COUNTRY_COLORS.BA,
        },
        {
          id: "kosovo",
          source: "kosovo",
          fillColor: COUNTRY_COLORS.XK,
        },
        {
          id: "cyprus",
          source: "cyprus",
          fillColor: [
            "match",
            ["get", "GID_1"],
            "CYN.1_1",
            COUNTRY_COLORS.XCY,
            COUNTRY_COLORS.CY,
          ],
        },
      ];

      for (const { id, source, filter, fillColor } of regionLayers) {
        const colorExpr =
          fillColor as mapboxgl.DataDrivenPropertyValueSpecification<string>;
        const filterProp = filter
          ? { filter: filter as mapboxgl.FilterSpecification }
          : {};

        // Base color + the classic hover brightening (data-driven opacity).
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
        // Sits on top of the fill purely to animate a height "lift" on
        // hover — fill-extrusion-opacity can't be data-driven, so it stays
        // fixed and flush with the fill layer until it rises.
        map.addLayer({
          id: `${id}-extrusion`,
          type: "fill-extrusion",
          source,
          ...filterProp,
          paint: {
            "fill-extrusion-color": colorExpr,
            "fill-extrusion-opacity": 0.75,
            "fill-extrusion-height": HOVER_HEIGHT,
            "fill-extrusion-base": 0,
            "fill-extrusion-vertical-gradient": true,
            "fill-extrusion-height-transition": { duration: 350 },
          } as mapboxgl.FillExtrusionLayerSpecification["paint"],
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

      for (const { id, source } of regionLayers) {
        let hoveredId: number | null = null;
        // Events are wired to the flat fill layer, not the extrusion layer
        // stacked on top of it — its footprint stays put as the extrusion
        // rises, so hit-testing doesn't jitter as the hovered region lifts.
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
