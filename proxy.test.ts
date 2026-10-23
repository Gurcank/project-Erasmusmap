import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("proxy and the session cookie", () => {
  const SECRET = "test-secret-for-the-proxy";

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const sessionCookie = async (name: string) =>
    `${name}=${await encode({ token: { email: "ada@example.com" }, secret: SECRET })}`;

  const visit = (url: string, cookie?: string) =>
    proxy(new NextRequest(url, { headers: cookie ? { cookie } : {} }));

  const redirectsToLogin = (response: Response) =>
    response.status === 307 &&
    new URL(response.headers.get("location") ?? "").pathname === "/login";

  // The reported failure: signed in on https, sent to the sign-in page anyway,
  // because NEXTAUTH_URL said http://localhost and so the plain cookie name was
  // looked for instead of the __Secure- one.
  it("recognises the https session cookie even when NEXTAUTH_URL says localhost", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", SECRET);
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    const cookie = await sessionCookie("__Secure-next-auth.session-token");
    expect(
      redirectsToLogin(
        await visit("https://erasmusmap.vercel.app/trips", cookie),
      ),
    ).toBe(false);
  });

  it("recognises the plain session cookie over http", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", SECRET);
    const cookie = await sessionCookie("next-auth.session-token");
    expect(
      redirectsToLogin(await visit("http://localhost:3000/trips", cookie)),
    ).toBe(false);
  });

  it("still sends a visitor without a session to the sign-in page", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", SECRET);
    expect(
      redirectsToLogin(await visit("https://erasmusmap.vercel.app/trips")),
    ).toBe(true);
    expect(
      redirectsToLogin(await visit("https://erasmusmap.vercel.app/account")),
    ).toBe(true);
  });

  it("does not accept a cookie signed with another secret", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", "a-different-secret");
    const cookie = await sessionCookie("__Secure-next-auth.session-token");
    expect(
      redirectsToLogin(
        await visit("https://erasmusmap.vercel.app/trips", cookie),
      ),
    ).toBe(true);
  });
});
