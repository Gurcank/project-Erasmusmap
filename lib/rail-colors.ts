/**
 * Colour per railway category. Shared by the map layer that paints the lines
 * (components/map/Map.tsx) and the legend that explains them
 * (components/map/MapControls.tsx) so the two can never drift apart.
 *
 * The `c` property on every feature in public/map/railways.geojson is one of
 * these keys (see scripts/build-railways.ts).
 */
export type RailCategory =
  "highspeed" | "rail" | "metro" | "light_rail" | "narrow";

// Tuned for legibility over dark satellite imagery. Mainline is the bulk of the
// network, so it stays a quiet white; the rest take a distinct hue each.
export const RAIL_CATEGORY_COLORS: Record<RailCategory, string> = {
  highspeed: "#ff5252",
  rail: "rgba(255, 255, 255, 0.82)",
  metro: "#ffa726",
  light_rail: "#26c6da",
  narrow: "#b388ff",
};

// Paint order: mainline underneath, the flagship high-speed network on top.
export const RAIL_DRAW_ORDER: RailCategory[] = [
  "rail",
  "narrow",
  "light_rail",
  "metro",
  "highspeed",
];

// The legend lists categories most-prominent first.
export const RAIL_LEGEND_ORDER: RailCategory[] = [
  "highspeed",
  "rail",
  "metro",
  "light_rail",
  "narrow",
];
