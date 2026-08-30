"use client";

import { useState } from "react";
import type { RefObject } from "react";
import { Plane, TramFront, Waypoints } from "lucide-react";
import type mapboxgl from "mapbox-gl";
import { useT } from "@/hooks/useT";
import Knob from "@/components/ui/Knob";
import {
  RAIL_GROUP_COLORS,
  RAIL_LEGEND_ORDER,
  type RailGroup,
} from "@/lib/rail-colors";

export type OverlayLayer = "motorways" | "railways" | "airports";

type Props = {
  mapRef: RefObject<mapboxgl.Map | null>;
  /** Set once the map's style has loaded and its layers can be toggled. */
  ready: boolean;
  /** Trunk-road layer ids, collected by the parent while parsing the style. */
  motorwayLayerIds: string[];
  /** Reports the railway toggle; the parent owns the rail layer itself. */
  onRailwaysToggle: (on: boolean) => void;
  /** Reports the airport toggle; the parent owns the airport layers. */
  onAirportsToggle: (on: boolean) => void;
};

/**
 * Bottom-left overlay: turn major roads, railways or airports on over the
 * otherwise bare satellite map. Each toggle flips the `visibility` layout
 * property on the matching layers; nothing is shown until asked for.
 */
export default function MapControls({
  mapRef,
  ready,
  motorwayLayerIds,
  onRailwaysToggle,
  onAirportsToggle,
}: Props) {
  const t = useT();
  // Every overlay starts hidden — the map opens as bare satellite imagery.
  const [active, setActive] = useState<Record<OverlayLayer, boolean>>({
    motorways: false,
    railways: false,
    airports: false,
  });

  if (!ready) return null;

  const toggle = (key: OverlayLayer) => {
    const map = mapRef.current;
    if (!map) return;
    const next = !active[key];
    const visibility = next ? "visible" : "none";

    if (key === "railways") {
      // The parent owns the rail layer (lazy-added on the first toggle).
      onRailwaysToggle(next);
    } else if (key === "airports") {
      // The parent owns the airport overlay layers.
      onAirportsToggle(next);
    } else {
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
      { key: "airports", label: t.layerAirports, icon: Plane },
    ];

  // Explains the line colours, shown only while the rail overlay is on.
  const railLegendLabels: Record<RailGroup, string> = {
    fast: t.railLegendHighspeed,
    train: t.railLegendTrain,
    urban: t.railLegendUrban,
  };

  return (
    <div className="glass glass-edge pointer-events-auto absolute bottom-4 left-4 z-10 w-48 overflow-hidden rounded-panel bg-ink-950/70 shadow-popover [--glass-border:oklch(1_0_0_/_0.2)] [--glass-highlight:oklch(1_0_0_/_0.55)]">
      <p className="border-b border-ink-50/10 px-3 py-2 text-[0.65rem] font-semibold tracking-widest text-ink-300 uppercase">
        {t.layersTitle}
      </p>
      {/* Above the switches, not below them: the panel is pinned by its bottom
          edge, so anything added after the list grows the panel upwards and
          takes the row you just clicked with it. Opening upwards from here
          leaves the switches exactly where they were. */}
      {active.railways && (
        <ul className="border-b border-ink-50/10 px-3 py-2.5">
          {RAIL_LEGEND_ORDER.map((group) => (
            <li
              key={group}
              className="flex items-center gap-2.5 py-1 text-xs text-ink-200"
            >
              <span
                aria-hidden="true"
                className="h-0.5 w-4 shrink-0 rounded-full"
                // Map-domain palette, shared with the rail layer in Map.tsx.
                style={{ backgroundColor: RAIL_GROUP_COLORS[group] }}
              />
              <span>{railLegendLabels[group]}</span>
            </li>
          ))}
        </ul>
      )}
      <ul>
        {items.map(({ key, label, icon: Icon }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => toggle(key)}
              role="switch"
              aria-checked={active[key]}
              className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink-50 transition-colors hover:bg-ink-50/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
            >
              <Icon
                size={15}
                aria-hidden="true"
                className={active[key] ? "text-accent-400" : "text-ink-400"}
              />
              <span className="flex-1">{label}</span>
              <Knob checked={active[key]} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
