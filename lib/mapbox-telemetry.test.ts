import { describe, expect, it } from "vitest";
import { applyTelemetryChoice } from "@/lib/mapbox-telemetry";

/** Shaped like mapbox-gl's config: the events URL is a getter, derived from the API URL. */
const libraryConfig = () => ({
  API_URL: "https://api.mapbox.com",
  get EVENTS_URL(): string | null {
    return "https://events.mapbox.com/events/v2";
  },
});

describe("applyTelemetryChoice", () => {
  it("points the events URL nowhere when events are not allowed", () => {
    const config = libraryConfig();
    applyTelemetryChoice(config, false);
    expect(config.EVENTS_URL).toBeNull();
  });

  it("leaves the library untouched when events are allowed", () => {
    const config = libraryConfig();
    applyTelemetryChoice(config, true);
    expect(config.EVENTS_URL).toBe("https://events.mapbox.com/events/v2");
  });

  it("is what the library's own check needs to post nothing", () => {
    // mapbox-gl: `if (!config.EVENTS_URL) return;` before every event it posts.
    const config = libraryConfig();
    const posts: string[] = [];
    const postEvent = () => {
      if (!config.EVENTS_URL) return;
      posts.push(config.EVENTS_URL);
    };

    postEvent();
    expect(posts).toHaveLength(1);

    applyTelemetryChoice(config, false);
    postEvent();
    expect(posts).toHaveLength(1);
  });

  it("does not touch the other settings", () => {
    const config = libraryConfig();
    applyTelemetryChoice(config, false);
    expect(config.API_URL).toBe("https://api.mapbox.com");
  });

  it("can be applied twice", () => {
    const config = libraryConfig();
    applyTelemetryChoice(config, false);
    expect(() => applyTelemetryChoice(config, false)).not.toThrow();
    expect(config.EVENTS_URL).toBeNull();
  });
});
