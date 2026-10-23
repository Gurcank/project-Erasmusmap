/**
 * Keeps Mapbox GL's usage events from being attempted when they are not allowed.
 *
 * The library posts events (a map load, a session) to events.mapbox.com on its
 * own. Mapbox offers no switch for them: its only option,
 * `performanceMetricsCollection: false`, stops the performance measurements and
 * nothing else. They are allowed only for a visitor who accepted the optional
 * statistics, and the Content-Security-Policy leaves the host out for everyone
 * else (proxy.ts), so the browser refuses the request whatever the code does.
 *
 * This is the other half: without it the library would keep trying and the
 * console would fill with blocked-request errors. It points the library's
 * events URL nowhere, which is its own "no telemetry" state; it posts nothing
 * and carries on. Read once when the map module loads, the same moment the page
 * was served with its policy.
 *
 * Mapbox counts map loads through these events. Allowing them only to those who
 * accept is a deliberate trade of an exact count for the visitor's choice.
 */
export function applyTelemetryChoice(
  mapboxConfig: object,
  eventsAllowed: boolean,
): void {
  if (eventsAllowed) return;
  Object.defineProperty(mapboxConfig, "EVENTS_URL", {
    configurable: true,
    get: () => null,
  });
}
