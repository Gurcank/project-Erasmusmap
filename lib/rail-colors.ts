/**
 * Railway styling for the map overlay (components/map/Map.tsx) and its legend
 * (components/map/MapControls.tsx), kept here so the two never drift apart.
 *
 * scripts/build-railways.ts tags every line with a `c` of one of five raw OSM
 * categories. For the map those collapse into three groups an Erasmus student
 * recognises without a rail glossary:
 *
 *   fast   – high-speed intercity lines (TGV, AVE, ICE, YHT)
 *   train  – every other heavy-rail line, whatever the gauge
 *   urban  – metros, trams and light rail
 */

export type RawRailCategory =
  "highspeed" | "rail" | "metro" | "light_rail" | "narrow";

export type RailGroup = "fast" | "train" | "urban";

export const RAIL_GROUP_OF: Record<RawRailCategory, RailGroup> = {
  highspeed: "fast",
  rail: "train",
  narrow: "train",
  metro: "urban",
  light_rail: "urban",
};

// Legible over dark satellite imagery. `train` is the quiet backbone; `fast`
// and `urban` each take one clear hue.
export const RAIL_GROUP_COLORS: Record<RailGroup, string> = {
  fast: "#f43f5e",
  train: "rgba(255, 255, 255, 0.82)",
  urban: "#fbbf24",
};

// Relative line width, multiplied onto the zoom ramp in Map.tsx so the
// high-speed network reads as the headline layer and urban lines stay fine.
export const RAIL_GROUP_WIDTH_SCALE: Record<RailGroup, number> = {
  fast: 1.3,
  train: 1,
  urban: 0.85,
};

// Paint order: the backbone underneath, the flagship high-speed network on top.
export const RAIL_DRAW_ORDER: RailGroup[] = ["train", "urban", "fast"];

// The legend lists groups most-prominent first.
export const RAIL_LEGEND_ORDER: RailGroup[] = ["fast", "train", "urban"];
