"use client";

import { useState } from "react";
import type { RefObject } from "react";
import { TramFront, Waypoints } from "lucide-react";
import type mapboxgl from "mapbox-gl";
import { useT } from "@/hooks/useT";
import {
  RAIL_CATEGORY_COLORS,
  RAIL_LEGEND_ORDER,
  type RailCategory,
} from "@/lib/rail-colors";

export type OverlayLayer = "motorways" | "railways";

type Props = {
  mapRef: RefObject<mapboxgl.Map | null>;
  /** Set once the map's style has loaded and its layers can be toggled. */
  ready: boolean;
  /** Trunk-road layer ids, collected by the parent while parsing the style. */
  motorwayLayerIds: string[];
  /** Reports the railway toggle; the parent owns the rail layer itself. */
  onRailwaysToggle: (on: boolean) => void;
};

/**
 * Bottom-left overlay: turn motorways or railways on over the otherwise bare
 * satellite map. Airports are always on and not listed here. Each toggle flips
 * the `visibility` layout property on the matching layers; nothing is shown
 * until asked for.
 */
export default function MapControls({
  mapRef,
  ready,
  motorwayLayerIds,
  onRailwaysToggle,
}: Props) {
  const t = useT();
  const [active, setActive] = useState<Record<OverlayLayer, boolean>>({
    motorways: false,
    railways: false,
  });

  if (!ready) return null;

  const toggle = (key: OverlayLayer) => {
    const map = mapRef.current;
    if (!map) return;
    const next = !active[key];

    if (key === "railways") {
      // The parent owns the rail layer (lazy-added on the first toggle).
      onRailwaysToggle(next);
    } else {
      const visibility = next ? "visible" : "none";
      for (const id of motorwayLayerIds) {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", visibility);
        }
      }
    }

    setActive((current) => ({ ...current, [key]: next }));
  };

  const items: { key: OverlayLayer; label: string; icon: typeof Waypoints }[] =
    [
      { key: "motorways", label: t.layerMotorways, icon: Waypoints },
      { key: "railways", label: t.layerRailways, icon: TramFront },
    ];

  // Explains the line colours, shown only while the rail overlay is on.
  const railLegendLabels: Record<RailCategory, string> = {
    highspeed: t.railLegendHighspeed,
    rail: t.railLegendMainline,
    metro: t.railLegendMetro,
    light_rail: t.railLegendLightRail,
    narrow: t.railLegendNarrow,
  };

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-10 w-44 overflow-hidden rounded-card border border-ink-50/15 bg-ink-950/80 shadow-popover backdrop-blur-md">
      <p className="border-b border-ink-50/10 px-3 py-2 text-[0.65rem] font-semibold tracking-widest text-ink-300 uppercase">
        {t.layersTitle}
      </p>
      <ul>
        {items.map(({ key, label, icon: Icon }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => toggle(key)}
              aria-pressed={active[key]}
              className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink-50 transition-colors hover:bg-ink-50/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
            >
              <Icon
                size={15}
                aria-hidden="true"
                className={active[key] ? "text-accent-400" : "text-ink-400"}
              />
              <span className="flex-1">{label}</span>
              <span
                aria-hidden="true"
                className={`h-3.5 w-6 rounded-full p-0.5 transition-colors ${
                  active[key] ? "bg-primary" : "bg-ink-700"
                }`}
              >
                <span
                  className={`block h-2.5 w-2.5 rounded-full bg-ink-50 transition-transform ${
                    active[key] ? "translate-x-2.5" : "translate-x-0"
                  }`}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {active.railways && (
        <ul className="border-t border-ink-50/10 px-3 py-2.5">
          {RAIL_LEGEND_ORDER.map((category) => (
            <li
              key={category}
              className="flex items-center gap-2.5 py-1 text-xs text-ink-200"
            >
              <span
                aria-hidden="true"
                className="h-0.5 w-4 shrink-0 rounded-full"
                // Map-domain palette, shared with the rail layer in Map.tsx.
                style={{ backgroundColor: RAIL_CATEGORY_COLORS[category] }}
              />
              <span>{railLegendLabels[category]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
