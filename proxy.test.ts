import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

const policyFor = async (cookie?: string) => {
  const request = new NextRequest("http://localhost:3000/", {
    headers: cookie ? { cookie } : {},
  });
  const response = await proxy(request);
  return response.headers.get("content-security-policy") ?? "";
};

const connectSrc = (policy: string) =>
  policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("connect-src")) ?? "";

describe("proxy and Mapbox usage events", () => {
  it("leaves events.mapbox.com out of the policy with no choice made", async () => {
    expect(connectSrc(await policyFor())).not.toContain("events.mapbox.com");
  });

  it("leaves it out after a refusal", async () => {
    expect(connectSrc(await policyFor("consent=denied"))).not.toContain(
      "events.mapbox.com",
    );
  });

  it("leaves it out for a cookie it does not recognise", async () => {
    for (const cookie of ["consent=true", "consent=GRANTED", "consent="]) {
      expect(connectSrc(await policyFor(cookie))).not.toContain(
        "events.mapbox.com",
      );
    }
  });

  it("adds it only after an acceptance", async () => {
    expect(connectSrc(await policyFor("consent=granted"))).toContain(
      "https://events.mapbox.com",
    );
  });

  it("keeps the map itself working in every case", async () => {
    for (const cookie of [undefined, "consent=denied", "consent=granted"]) {
      const value = connectSrc(await policyFor(cookie));
      expect(value).toContain("https://api.mapbox.com");
      expect(value).toContain("https://*.tiles.mapbox.com");
    }
  });

  it("never lets the events host be an image source", async () => {
    const policy = await policyFor("consent=granted");
    const img =
      policy
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("img-src")) ?? "";
    expect(img).not.toContain("events.mapbox.com");
  });
});
