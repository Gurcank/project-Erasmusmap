import mapboxgl from "mapbox-gl";
import { analyticsAllowed, readConsentCookie } from "@/lib/consent";
import { applyTelemetryChoice } from "@/lib/mapbox-telemetry";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// Client components are rendered on the server first, where there is no cookie
// to read and no map to load: the choice only matters, and is only read, in the
// browser.
if (typeof document !== "undefined") {
  applyTelemetryChoice(
    mapboxgl.config,
    analyticsAllowed(readConsentCookie(document.cookie)),
  );
}

export default mapboxgl;
