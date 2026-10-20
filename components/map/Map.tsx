"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "@/lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useRouter } from "next/navigation";
import MapControls from "@/components/map/MapControls";
import SpaceParticles from "@/components/ui/SpaceParticles";
import {
  MAP_STYLE,
  INITIAL_CENTER,
  INITIAL_ZOOM,
  INITIAL_PITCH,
  REGION_SOURCE,
  REGION_HIT_LAYER,
  LABEL_SOURCE,
  REGION_LABEL_LAYER,
  LABEL_COLOR,
  LABEL_HALO,
  COUNTRY_BORDER_COLOR,
  HIGHLIGHT_SOURCE,
  HIGHLIGHT_GLOW_LAYER,
  HIGHLIGHT_EDGE_LAYER,
  HOVER_FILL_DURATION_MS,
  HIDDEN_LABEL_KEYWORDS,
  ROAD_LINE_PREFIXES,
  RAIL_SOURCE,
  RAIL_LAYER,
  RAIL_COLOR_EXPRESSION,
  RAIL_SORT_KEY_EXPRESSION,
  RAIL_WIDTH_EXPRESSION,
  BASEMAP_AIRPORT_LAYER,
  AIRPORT_SOURCE,
  AIRPORT_LAYER,
  AIRPORT_ICON,
  AIRPORT_COLOR,
  AIRPORT_ICON_SVG,
  TERRITORY_LABEL_SOURCE,
  TERRITORY_LABEL_LAYER,
  HIDDEN_COUNTRY_LABELS,
  TERRITORY_LABELS,
  HOVER_FILL,
  GLOW_COLOR,
  SHIMMER_SPEED,
  shimmerGradient,
  ringsOf,
  EMPTY_GEOJSON,
} from "@/components/map/map-config";

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
