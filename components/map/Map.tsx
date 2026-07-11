"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "@/lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useRouter } from "next/navigation";
import { latinize } from "@/lib/latinize";
import type { City } from "@/types";

type MapProps = {
  cities?: City[];
  isStatic?: boolean;
};

const NUTS_LEVEL_2_COUNTRIES = ["DE", "UK"];

const COUNTRY_COLORS: Record<string, string> = {
  TR: "#dc2626", EL: "#06b6d4", BG: "#16a34a", RO: "#facc15",
  HU: "#6b8e23", AT: "#7f1d1d", SK: "#0ea5e9", CZ: "#1e40af",
  PL: "#dc2626", DE: "#7c3aed", FR: "#2563eb", ES: "#f97316",
  PT: "#166534", IT: "#84cc16", CH: "#b91c1c", BE: "#f59e0b",
  NL: "#ff7a00", LU: "#7dd3fc", UK: "#ec4899", IE: "#059669",
  DK: "#be123c", NO: "#991b1b", SE: "#fde047", FI: "#166534",
  EE: "#0f52ba", LV: "#7f1d1d", LT: "#d4a017", SI: "#a855f7",
  HR: "#724916", RS: "#6b21a8", BA: "#0284c7", ME: "#f59e0b",
  XK: "#1e3a8a", MK: "#fb7185", AL: "#b45309", CY: "#b45309",
};

const FALLBACK_REGION_COLOR = "#e5e7eb";

function normalizeRegionName(name: string): string {
  return latinize(name).toLowerCase().replace(/-/g, " ");
}

function resolveFeatureName(properties: Record<string, unknown>): string {
  return (
    (properties.NAME_LATN as string) ||
    (properties.NUTS_NAME as string) ||
    (properties.NAME_1 as string) ||
    (properties.name as string) ||
    ""
  );
}

function buildCountryColorExpression(fallback: string): unknown[] {
  const entries = Object.entries(COUNTRY_COLORS).flatMap(([code, color]) => [code, color]);
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
      interactive: !isStatic,
    });

    mapRef.current = map;

    map.on("load", () => {
      let hoveredRegionId: number | null = null;

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

      const HIDDEN_LABEL_KEYWORDS = ["settlement", "place", "town", "village", "region"];
      map.getStyle().layers?.forEach((layer) => {
        if (layer.type !== "symbol") return;
        const isPlaceLabel = HIDDEN_LABEL_KEYWORDS.some((kw) => layer.id.includes(kw));
        const isCountryLabel = layer.id.includes("country-label");
        if (isPlaceLabel) map.setLayoutProperty(layer.id, "visibility", "none");
        if (isCountryLabel) map.setLayoutProperty(layer.id, "visibility", "visible");
      });

      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "city-tooltip",
        offset: 15,
      });

      map.addSource("nuts", { type: "geojson", data: "/eu-cities/europe.geojson", generateId: true });
      map.addSource("bosnia", { type: "geojson", data: "/eu-cities/bosnia.json", generateId: true });
      map.addSource("kosovo", { type: "geojson", data: "/eu-cities/kosovo.json", generateId: true });

      const cityFilter = [
        "any",
        ["all", ["in", ["get", "CNTR_CODE"], ["literal", NUTS_LEVEL_2_COUNTRIES]], ["==", ["get", "LEVL_CODE"], 2]],
        ["all", ["!", ["in", ["get", "CNTR_CODE"], ["literal", NUTS_LEVEL_2_COUNTRIES]]], ["==", ["get", "LEVL_CODE"], 3]],
      ];

      map.addLayer({
        id: "country-fill",
        type: "fill",
        source: "nuts",
        filter: ["==", ["get", "LEVL_CODE"], 0],
        paint: { "fill-color": FALLBACK_REGION_COLOR, "fill-opacity": 0.2 },
      });

      map.addLayer({
        id: "city-fill",
        type: "fill",
        source: "nuts",
        filter: cityFilter as mapboxgl.FilterSpecification,
        paint: {
          "fill-color": buildCountryColorExpression(FALLBACK_REGION_COLOR) as mapboxgl.DataDrivenPropertyValueSpecification<string>,
          "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.9, 0.6],
        },
      });

      const staticRegionLayers: Array<{ id: string; source: string; fillColor: string }> = [
        { id: "bosnia", source: "bosnia", fillColor: "#6ee7b7" },
        { id: "kosovo", source: "kosovo", fillColor: "#fde68a" },
      ];

      staticRegionLayers.forEach(({ id, source, fillColor }) => {
        map.addLayer({ id: `${id}-fill`, type: "fill", source, paint: { "fill-color": fillColor, "fill-opacity": 0.6 } });
        map.addLayer({ id: `${id}-outline`, type: "line", source, paint: { "line-color": "#ffffff", "line-width": 0.5 } });
      });

      map.addLayer({
        id: "city-outline",
        type: "line",
        source: "nuts",
        filter: cityFilter as mapboxgl.FilterSpecification,
        paint: { "line-color": "#ffffff", "line-width": 0.5 },
      });

      map.addLayer({
        id: "city-hover",
        type: "line",
        source: "nuts",
        filter: cityFilter as mapboxgl.FilterSpecification,
        paint: {
          "line-color": "#000",
          "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 3, 0],
        },
      });

      function showRegionPopup(e: mapboxgl.MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] }) {
        if (!e.features?.length) return;
        const name = resolveFeatureName(e.features[0].properties ?? {});
        if (name && popupRef.current) {
          popupRef.current.setLngLat(e.lngLat).setHTML(`<strong>${name}</strong>`).addTo(map);
        }
        map.getCanvas().style.cursor = "pointer";
      }

      function hidePopup() {
        popupRef.current?.remove();
        map.getCanvas().style.cursor = "";
      }

      staticRegionLayers.forEach(({ id }) => {
        map.on("mousemove", `${id}-fill`, showRegionPopup);
        map.on("mouseleave", `${id}-fill`, hidePopup);
      });

      map.on("mousemove", "city-fill", (e) => {
        if (!e.features?.length) return;

        const featureId = e.features[0].id as number;
        if (hoveredRegionId !== null) {
          map.setFeatureState({ source: "nuts", id: hoveredRegionId }, { hover: false });
        }
        hoveredRegionId = featureId;
        map.setFeatureState({ source: "nuts", id: featureId }, { hover: true });

        const properties = e.features[0].properties ?? {};
        if (!properties.NUTS_ID) return;

        const rawName = resolveFeatureName(properties);
        const matchedCity = citiesRef.current.find(
          (c) => normalizeRegionName(c.name) === normalizeRegionName(rawName)
        );

        const displayName = matchedCity ? latinize(matchedCity.name) : latinize(rawName);
        popupRef.current?.setLngLat(e.lngLat).setHTML(`<strong>${displayName}</strong>`).addTo(map);
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("click", "city-fill", (e) => {
        if (!e.features?.length) return;
        const rawName = resolveFeatureName(e.features[0].properties ?? {});
        if (!rawName) return;

        const matchedCity = citiesRef.current.find(
          (c) => normalizeRegionName(c.name) === normalizeRegionName(rawName)
        );

        const slug = matchedCity
          ? matchedCity.slug
          : latinize(rawName).toLowerCase().replace(/\s+/g, "-");

        router.push(`/c/${slug}`);
      });

      map.on("mouseleave", "city-fill", () => {
        if (hoveredRegionId !== null) {
          map.setFeatureState({ source: "nuts", id: hoveredRegionId }, { hover: false });
        }
        hoveredRegionId = null;
        hidePopup();
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={mapContainerRef} className="w-full h-screen" />;
}
