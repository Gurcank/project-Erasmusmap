"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "@/lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useRouter } from "next/navigation";

type MapProps = {
  isStatic?: boolean;
};

// Satellite imagery with labels, from which everything except country names is
// hidden below — the region layer carries the city names.
const MAP_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";

const INITIAL_CENTER: [number, number] = [12, 50];
const INITIAL_ZOOM = 3.6;
// A tilted camera is what makes a raised region read as height rather than as
// a shape that simply changed colour.
const INITIAL_PITCH = 45;

const REGION_SOURCE = "regions";
const REGION_FILL_LAYER = "region-fill";
const REGION_DIM_LAYER = "region-dim";
const REGION_OUTLINE_LAYER = "region-outline";
const REGION_LABEL_LAYER = "region-label";

/** How far a hovered region rises, in metres. */
const RAISED_HEIGHT = 60_000;
const RAISE_DURATION_MS = 250;

// Basemap label layers that would compete with the region names.
const HIDDEN_LABEL_KEYWORDS = ["settlement", "place", "poi", "transit", "road"];

// Regions sit on top of satellite imagery, so their fill stays nearly
// transparent — the boundary and the raise carry the interaction, not a wash
// of colour that would hide the terrain underneath.
const REGION_FILL = "rgba(255, 255, 255, 0.10)";
const REGION_FILL_HOVER = "rgba(238, 158, 35, 0.62)";
const REGION_DIM_FILL = "rgba(8, 11, 18, 0.32)";
const OUTLINE_COLOR = "rgba(255, 255, 255, 0.42)";
const LABEL_COLOR = "#f9fafb";
const LABEL_HALO = "#0b0e14";

export default function Map({ isStatic = false }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const router = useRouter();

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
      interactive: !isStatic,
    });

    mapRef.current = map;

    map.on("load", () => {
      map.setFog({
        color: "#0b0e14",
        "high-color": "#132033",
        "horizon-blend": 0.04,
        "space-color": "#05070b",
        "star-intensity": 0.5,
      });

      // Country names stay for orientation; the basemap's city, road and POI
      // labels go, so the region layer is the only city labelling.
      for (const layer of map.getStyle().layers ?? []) {
        if (layer.type !== "symbol") continue;
        if (layer.id.includes("country-label")) continue;
        if (
          HIDDEN_LABEL_KEYWORDS.some((keyword) => layer.id.includes(keyword))
        ) {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
      }

      map.addSource(REGION_SOURCE, {
        type: "geojson",
        data: "/map/regions.geojson",
        // Required for feature-state, which drives the hover.
        generateId: true,
      });

      // Regions with no city inside are context only: dimmed, never raised,
      // never clickable.
      map.addLayer({
        id: REGION_DIM_LAYER,
        type: "fill",
        source: REGION_SOURCE,
        filter: ["!", ["has", "citySlug"]],
        paint: { "fill-color": REGION_DIM_FILL },
      });

      map.addLayer({
        id: REGION_FILL_LAYER,
        type: "fill-extrusion",
        source: REGION_SOURCE,
        filter: ["has", "citySlug"],
        paint: {
          "fill-extrusion-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            REGION_FILL_HOVER,
            REGION_FILL,
          ],
          "fill-extrusion-height": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            RAISED_HEIGHT,
            0,
          ],
          "fill-extrusion-base": 0,
          "fill-extrusion-height-transition": {
            duration: prefersReducedMotion ? 0 : RAISE_DURATION_MS,
            delay: 0,
          },
        },
      });

      map.addLayer({
        id: REGION_OUTLINE_LAYER,
        type: "line",
        source: REGION_SOURCE,
        paint: {
          "line-color": OUTLINE_COLOR,
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.4, 8, 1.1],
        },
      });

      map.addLayer({
        id: REGION_LABEL_LAYER,
        type: "symbol",
        source: REGION_SOURCE,
        filter: ["has", "citySlug"],
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 8, 14],
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": LABEL_COLOR,
          "text-halo-color": LABEL_HALO,
          "text-halo-width": 1.4,
        },
      });

      // Decorative background maps get no interaction at all.
      if (isStatic) return;

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "city-tooltip",
        offset: 12,
      });

      let hoveredId: number | null = null;

      const clearHover = () => {
        if (hoveredId !== null) {
          map.setFeatureState(
            { source: REGION_SOURCE, id: hoveredId },
            { hover: false },
          );
        }
        hoveredId = null;
        popup.remove();
        map.getCanvas().style.cursor = "";
      };

      map.on("mousemove", REGION_FILL_LAYER, (event) => {
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
        }

        popup
          .setLngLat(event.lngLat)
          .setText(String(feature.properties?.name ?? ""))
          .addTo(map);
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", REGION_FILL_LAYER, clearHover);

      map.on("click", REGION_FILL_LAYER, (event) => {
        const slug = event.features?.[0]?.properties?.citySlug;
        if (typeof slug === "string") router.push(`/c/${slug}`);
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Built once — the region data is a static file, not a prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="h-screen w-full" />;
}
