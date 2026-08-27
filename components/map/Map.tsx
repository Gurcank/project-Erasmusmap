"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "@/lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useRouter } from "next/navigation";
import type { City } from "@/types";

type MapProps = {
  cities?: City[];
  isStatic?: boolean;
};

// Satellite imagery with labels, from which everything except country names is
// hidden below — the app's own markers are the only city labels, so the
// basemap's would compete with them.
const MAP_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";

const INITIAL_CENTER: [number, number] = [12, 50];
const INITIAL_ZOOM = 3.4;
// A tilted camera is what makes a raised city read as height rather than as a
// circle that simply got bigger.
const INITIAL_PITCH = 45;

const CITY_SOURCE = "cities";
const CITY_LAYER = "city-points";
const CITY_LABEL_LAYER = "city-labels";
const HOVER_SOURCE = "hovered-city";
const HOVER_LAYER = "hovered-city-extrusion";

/** Height of the raised pillar, in metres. */
const PILLAR_HEIGHT = 90_000;
const PILLAR_RADIUS_KM = 14;
const PILLAR_SIDES = 36;
const RAISE_DURATION_MS = 260;

// Basemap label layers that would collide with our own markers.
const HIDDEN_LABEL_KEYWORDS = ["settlement", "place", "poi", "transit", "road"];

const ACCENT = "#ee9e23";
const MARKER_STROKE = "#0b0e14";
const LABEL_COLOR = "#f9fafb";

/**
 * Approximates a circle around a point as a polygon so it can be extruded.
 * Only the hovered city needs one, so this runs per hover rather than shipping
 * ~1600 pre-built polygons to the browser.
 */
function circleAround(
  longitude: number,
  latitude: number,
  radiusKm: number,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const latitudeRadians = (latitude * Math.PI) / 180;
  const degreesPerKmLongitude = 1 / (111.32 * Math.cos(latitudeRadians));
  const degreesPerKmLatitude = 1 / 110.574;

  const ring: [number, number][] = [];
  for (let step = 0; step < PILLAR_SIDES; step++) {
    const angle = (step / PILLAR_SIDES) * 2 * Math.PI;
    ring.push([
      longitude + radiusKm * degreesPerKmLongitude * Math.cos(angle),
      latitude + radiusKm * degreesPerKmLatitude * Math.sin(angle),
    ]);
  }
  ring.push(ring[0]);

  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}

const EMPTY_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function toFeatureCollection(cities: City[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: cities
      .filter((city) => city.latitude !== null && city.longitude !== null)
      .map((city) => ({
        type: "Feature",
        properties: { name: city.name, slug: city.slug, country: city.country },
        geometry: {
          type: "Point",
          coordinates: [city.longitude as number, city.latitude as number],
        },
      })),
  };
}

export default function Map({ cities = [], isStatic = false }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const citiesRef = useRef<City[]>(cities);
  const router = useRouter();

  useEffect(() => {
    citiesRef.current = cities;
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const source = map.getSource(CITY_SOURCE) as
      mapboxgl.GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(cities));
  }, [cities]);

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
      // labels go, so our markers are the only city layer.
      for (const layer of map.getStyle().layers ?? []) {
        if (layer.type !== "symbol") continue;
        if (layer.id.includes("country-label")) continue;
        if (
          HIDDEN_LABEL_KEYWORDS.some((keyword) => layer.id.includes(keyword))
        ) {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
      }

      map.addSource(CITY_SOURCE, {
        type: "geojson",
        data: toFeatureCollection(citiesRef.current),
      });
      map.addSource(HOVER_SOURCE, { type: "geojson", data: EMPTY_COLLECTION });

      // Added before the markers so the dot stays readable on top of the pillar.
      map.addLayer({
        id: HOVER_LAYER,
        type: "fill-extrusion",
        source: HOVER_SOURCE,
        paint: {
          "fill-extrusion-color": ACCENT,
          "fill-extrusion-opacity": 0.5,
          "fill-extrusion-height": 0,
          "fill-extrusion-base": 0,
          "fill-extrusion-height-transition": {
            duration: prefersReducedMotion ? 0 : RAISE_DURATION_MS,
            delay: 0,
          },
        },
      });

      map.addLayer({
        id: CITY_LAYER,
        type: "circle",
        source: CITY_SOURCE,
        paint: {
          "circle-color": ACCENT,
          "circle-stroke-color": MARKER_STROKE,
          "circle-stroke-width": 1,
          "circle-opacity": 0.95,
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            2.5,
            6,
            4.5,
            10,
            7,
          ],
        },
      });

      map.addLayer({
        id: CITY_LABEL_LAYER,
        type: "symbol",
        source: CITY_SOURCE,
        // Below this zoom ~1600 labels would be an unreadable wall of text.
        minzoom: 5.5,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": LABEL_COLOR,
          "text-halo-color": MARKER_STROKE,
          "text-halo-width": 1.4,
        },
      });

      // Decorative background maps get no interaction at all.
      if (isStatic) return;

      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "city-tooltip",
        offset: 14,
      });

      let hoveredSlug: string | null = null;

      const clearHover = () => {
        hoveredSlug = null;
        const source = map.getSource(HOVER_SOURCE) as mapboxgl.GeoJSONSource;
        source.setData(EMPTY_COLLECTION);
        map.setPaintProperty(HOVER_LAYER, "fill-extrusion-height", 0);
        popupRef.current?.remove();
        map.getCanvas().style.cursor = "";
      };

      map.on("mousemove", CITY_LAYER, (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;

        const slug = feature.properties?.slug;
        if (typeof slug !== "string" || slug === hoveredSlug) return;
        hoveredSlug = slug;

        const [longitude, latitude] = feature.geometry.coordinates as [
          number,
          number,
        ];
        const source = map.getSource(HOVER_SOURCE) as mapboxgl.GeoJSONSource;
        source.setData({
          type: "FeatureCollection",
          features: [circleAround(longitude, latitude, PILLAR_RADIUS_KM)],
        });
        map.setPaintProperty(
          HOVER_LAYER,
          "fill-extrusion-height",
          PILLAR_HEIGHT,
        );

        popupRef.current
          ?.setLngLat([longitude, latitude])
          .setText(String(feature.properties?.name ?? ""))
          .addTo(map);
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", CITY_LAYER, clearHover);

      map.on("click", CITY_LAYER, (event) => {
        const slug = event.features?.[0]?.properties?.slug;
        if (typeof slug === "string") router.push(`/c/${slug}`);
      });
    });

    return () => {
      popupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Built once; city updates are pushed through the effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="h-screen w-full" />;
}
