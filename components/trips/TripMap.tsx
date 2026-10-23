"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "@/lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Pause,
  Play,
} from "lucide-react";
import { MAP_STYLE } from "@/components/map/map-config";
import { fill, useTripT } from "@/hooks/useTripT";
import { MODE_COLOR } from "@/lib/trip-format";
import { greatCircle, type LatLng, type RouteStep } from "@/lib/trip-timeline";
import type { TripItemView } from "@/lib/trip-types";

type Props = {
  steps: RouteStep[];
  items: TripItemView[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
};

const LEG_SOURCE = "trip-legs";
const POINT_SOURCE = "trip-points";
const LEG_LAYER = "trip-legs-line";
const LEG_FLIGHT_LAYER = "trip-legs-flight";
const POINT_LAYER = "trip-points-circle";
const POINT_LABEL_LAYER = "trip-points-label";

const STEP_INTERVAL_MS = 2600;
const DRAW_DURATION_MS = 1100;
const POINT_COLOR = "#f0efec";
const ACTIVE_COLOR = "#1E8E42";

type LegFeature = GeoJSON.Feature<GeoJSON.LineString>;
type PointFeature = GeoJSON.Feature<GeoJSON.Point>;

const toCoord = (point: LatLng): [number, number] => [point.lng, point.lat];

/** Dense coordinates for every leg, computed once per route. */
function legPath(
  step: Extract<RouteStep, { kind: "leg" }>,
): [number, number][] {
  // A great circle for every mode: over a few hundred kilometres it is
  // indistinguishable from a straight line, and over a flight it is the arc.
  return greatCircle(step.from, step.to, step.mode === "FLIGHT" ? 64 : 24).map(
    toCoord,
  );
}

/**
 * Point markers. Every step gets a numbered dot at its location — a leg's dot
 * sits on its arrival, which is where the traveller is once it is done.
 */
function pointFeatures(
  steps: RouteStep[],
  upTo: number | null,
  active: number | null,
): PointFeature[] {
  return steps
    .filter((step) => upTo === null || step.index <= upTo)
    .map((step) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: toCoord(step.kind === "leg" ? step.to : step.at),
      },
      properties: {
        itemId: step.itemId,
        label: String(step.index + 1),
        active: step.index === active,
      },
    }));
}

function legFeatures(
  steps: RouteStep[],
  paths: Map<string, [number, number][]>,
  upTo: number | null,
  partial: { index: number; fraction: number } | null,
  active: number | null,
): LegFeature[] {
  const features: LegFeature[] = [];
  for (const step of steps) {
    if (step.kind !== "leg") continue;
    if (upTo !== null && step.index > upTo) continue;
    let coordinates = paths.get(step.itemId) ?? [];
    if (partial && partial.index === step.index) {
      const count = Math.max(
        2,
        Math.ceil(coordinates.length * partial.fraction),
      );
      coordinates = coordinates.slice(0, count);
    }
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates },
      properties: {
        itemId: step.itemId,
        color: MODE_COLOR[step.mode],
        flight: step.mode === "FLIGHT",
        active: step.index === active,
      },
    });
  }
  return features;
}

function boundsOf(points: [number, number][]): mapboxgl.LngLatBounds | null {
  if (points.length === 0) return null;
  const bounds = new mapboxgl.LngLatBounds(points[0], points[0]);
  for (const point of points) bounds.extend(point);
  return bounds;
}

const collection = <T extends GeoJSON.Feature>(
  features: T[],
): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features });

export default function TripMap({
  steps,
  items,
  selectedItemId,
  onSelectItem,
}: Props) {
  const { tt } = useTripT();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);
  // null = the whole route; a number = the player is on that step.
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const paths = useMemo(() => {
    const map = new Map<string, [number, number][]>();
    for (const step of steps) {
      if (step.kind === "leg") map.set(step.itemId, legPath(step));
    }
    return map;
  }, [steps]);

  // Everything the route covers, for "show all" and the first view.
  const allPoints = useMemo(() => {
    const points: [number, number][] = [];
    for (const step of steps) {
      if (step.kind === "leg") points.push(...(paths.get(step.itemId) ?? []));
      else points.push(toCoord(step.at));
    }
    return points;
  }, [steps, paths]);

  // Latest callbacks for the handlers registered once on the map.
  const handlers = useRef({ onSelectItem });
  useEffect(() => {
    handlers.current = { onSelectItem };
  });

  // ── Map setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      projection: "globe",
      center: [12, 50],
      zoom: 3.4,
      attributionControl: true,
      performanceMetricsCollection: false,
    });
    mapRef.current = map;
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.on("load", () => {
      map.setFog({
        color: "#0b0e14",
        "high-color": "#132033",
        "space-color": "#05070b",
        "horizon-blend": 0.04,
      });

      map.addSource(LEG_SOURCE, { type: "geojson", data: collection([]) });
      map.addSource(POINT_SOURCE, { type: "geojson", data: collection([]) });

      // Ground legs solid, flights dashed: the dash says "not on the ground"
      // without leaning on colour alone.
      map.addLayer({
        id: LEG_LAYER,
        type: "line",
        source: LEG_SOURCE,
        filter: ["!", ["get", "flight"]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["get", "active"], 5, 3],
          "line-opacity": 0.95,
        },
      });
      map.addLayer({
        id: LEG_FLIGHT_LAYER,
        type: "line",
        source: LEG_SOURCE,
        filter: ["get", "flight"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["get", "active"], 4, 2.5],
          "line-dasharray": [1.5, 1.5],
        },
      });
      map.addLayer({
        id: POINT_LAYER,
        type: "circle",
        source: POINT_SOURCE,
        paint: {
          "circle-radius": ["case", ["get", "active"], 13, 10],
          "circle-color": ["case", ["get", "active"], ACTIVE_COLOR, "#0b0e14"],
          "circle-stroke-width": 2,
          "circle-stroke-color": POINT_COLOR,
        },
      });
      map.addLayer({
        id: POINT_LABEL_LAYER,
        type: "symbol",
        source: POINT_SOURCE,
        layout: {
          "text-field": ["get", "label"],
          "text-size": 11,
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: { "text-color": POINT_COLOR },
      });

      for (const layer of [POINT_LAYER, LEG_LAYER, LEG_FLIGHT_LAYER]) {
        map.on("click", layer, (event) => {
          const itemId = event.features?.[0]?.properties?.itemId;
          if (typeof itemId === "string") handlers.current.onSelectItem(itemId);
        });
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // An item picked in the timeline moves the player to its step.
  useEffect(() => {
    if (!selectedItemId) return;
    const step = steps.find((entry) => entry.itemId === selectedItemId);
    // Syncing to a selection made outside the map; not derivable during render
    // because the player can also move on its own.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (step) setStepIndex(step.index);
  }, [selectedItemId, steps]);

  // A step index past the end of a shorter route resets to the whole route.
  const current =
    stepIndex !== null && stepIndex < steps.length ? stepIndex : null;

  // ── Drawing ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const legs = map.getSource(LEG_SOURCE) as mapboxgl.GeoJSONSource;
    const points = map.getSource(POINT_SOURCE) as mapboxgl.GeoJSONSource;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    points.setData(collection(pointFeatures(steps, current, current)));

    const step = current !== null ? steps[current] : null;
    if (!step || step.kind !== "leg" || reduceMotion) {
      legs.setData(
        collection(legFeatures(steps, paths, current, null, current)),
      );
    } else {
      // Draw the current leg out from its departure.
      let frame = 0;
      const startedAt = performance.now();
      const tick = (now: number) => {
        const fraction = Math.min(1, (now - startedAt) / DRAW_DURATION_MS);
        legs.setData(
          collection(
            legFeatures(
              steps,
              paths,
              current,
              { index: step.index, fraction },
              current,
            ),
          ),
        );
        if (fraction < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }
  }, [steps, paths, current, ready]);

  // ── Camera ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const animate = !reduceMotion;
    const padding = { top: 60, bottom: 110, left: 50, right: 50 };

    if (current === null) {
      const bounds = boundsOf(allPoints);
      if (bounds) map.fitBounds(bounds, { padding, maxZoom: 11, animate });
      return;
    }
    const step = steps[current];
    if (step.kind === "leg") {
      const bounds = boundsOf(paths.get(step.itemId) ?? []);
      if (bounds) map.fitBounds(bounds, { padding, maxZoom: 10, animate });
    } else {
      map.flyTo({
        center: toCoord(step.at),
        zoom: Math.max(map.getZoom(), 11),
        essential: true,
        animate,
      });
    }
  }, [current, steps, paths, allPoints, ready]);

  // ── Player ────────────────────────────────────────────────────────────────
  // One timeout per step rather than an interval, so the last step stops the
  // player and every advance also selects the item in the timeline.
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      const next = current === null ? 0 : current + 1;
      if (next >= steps.length) {
        setPlaying(false);
        return;
      }
      setStepIndex(next);
      onSelectItem(steps[next].itemId);
    }, STEP_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [playing, current, steps, onSelectItem]);

  const go = (index: number | null) => {
    setPlaying(false);
    setStepIndex(index);
    const step = index === null ? null : steps[index];
    onSelectItem(step ? step.itemId : null);
  };

  const activeItem =
    current !== null
      ? items.find((item) => item.id === steps[current].itemId)
      : null;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-panel border border-border">
      <div ref={containerRef} className="h-full w-full" />

      {steps.length === 0 ? (
        <div className="absolute inset-x-4 bottom-4 rounded-card bg-ink-950/80 p-4 text-center text-sm text-ink-50">
          {tt.noRoute}
        </div>
      ) : (
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-card bg-ink-950/85 p-2 text-ink-50 backdrop-blur">
          <MapButton
            label={tt.prev}
            onClick={() =>
              go(current === null ? steps.length - 1 : Math.max(0, current - 1))
            }
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </MapButton>
          <MapButton
            label={playing ? tt.pause : tt.play}
            onClick={() => {
              if (playing) {
                setPlaying(false);
                return;
              }
              if (current === null || current >= steps.length - 1) {
                setStepIndex(0);
                onSelectItem(steps[0].itemId);
              }
              setPlaying(true);
            }}
          >
            {playing ? (
              <Pause size={18} aria-hidden="true" />
            ) : (
              <Play size={18} aria-hidden="true" />
            )}
          </MapButton>
          <MapButton
            label={tt.next}
            onClick={() =>
              go(current === null ? 0 : Math.min(steps.length - 1, current + 1))
            }
          >
            <ChevronRight size={18} aria-hidden="true" />
          </MapButton>

          <div className="min-w-0 flex-1 px-1" aria-live="polite">
            {activeItem ? (
              <>
                <p className="text-xs text-ink-300 tabular-nums">
                  {fill(tt.stepOf, { i: (current ?? 0) + 1, n: steps.length })}{" "}
                  · {activeItem.startAt.slice(0, 10)}{" "}
                  {activeItem.startAt.slice(11, 16)}
                </p>
                <p className="truncate text-sm font-semibold">
                  {activeItem.title}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold">
                {tt.showAll} ·{" "}
                {fill(tt.stepOf, { i: steps.length, n: steps.length })}
              </p>
            )}
          </div>

          <MapButton label={tt.showAll} onClick={() => go(null)}>
            <Maximize2 size={16} aria-hidden="true" />
          </MapButton>
        </div>
      )}
    </div>
  );
}

function MapButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-ink-50/15 focus-visible:outline-2 focus-visible:outline-accent-400"
    >
      {children}
    </button>
  );
}
