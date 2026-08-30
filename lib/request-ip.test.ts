import { describe, expect, it } from "vitest";
import { getClientAddress, UNKNOWN_CLIENT_ADDRESS } from "@/lib/request-ip";

describe("getClientAddress", () => {
  it("prefers the header a proxy on top of Vercel cannot overwrite", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.7",
      "x-real-ip": "198.51.100.2",
      "x-forwarded-for": "192.0.2.9",
    });
    expect(getClientAddress(headers)).toBe("203.0.113.7");
  });

  it("falls back through the header order", () => {
    expect(getClientAddress(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2",
    );
    expect(
      getClientAddress(new Headers({ "x-forwarded-for": "192.0.2.9" })),
    ).toBe("192.0.2.9");
  });

  // The whole point of the helper: a client that prepends its own entries must
  // not get a fresh rate-limit bucket out of it.
  it("ignores client-supplied entries ahead of the real one", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.7",
    });
    expect(getClientAddress(headers)).toBe("203.0.113.7");
  });

  it("reads the plain header object NextAuth passes to authorize", () => {
    expect(getClientAddress({ "x-real-ip": "198.51.100.2" })).toBe(
      "198.51.100.2",
    );
    expect(getClientAddress({ "x-real-ip": ["198.51.100.2"] })).toBe(
      "198.51.100.2",
    );
  });

  it("supports IPv6", () => {
    expect(getClientAddress(new Headers({ "x-real-ip": "2001:db8::1" }))).toBe(
      "2001:db8::1",
    );
  });

  // A forged header must not be able to mint unlimited distinct Redis keys.
  it("rejects anything not shaped like an address", () => {
    expect(getClientAddress(new Headers({ "x-real-ip": "not an ip" }))).toBe(
      UNKNOWN_CLIENT_ADDRESS,
    );
    expect(
      getClientAddress(new Headers({ "x-real-ip": "a".repeat(200) })),
    ).toBe(UNKNOWN_CLIENT_ADDRESS);
    expect(getClientAddress(new Headers({ "x-real-ip": "" }))).toBe(
      UNKNOWN_CLIENT_ADDRESS,
    );
  });

  it("falls back to the shared bucket when no header is present", () => {
    expect(getClientAddress(new Headers())).toBe(UNKNOWN_CLIENT_ADDRESS);
    expect(getClientAddress(undefined)).toBe(UNKNOWN_CLIENT_ADDRESS);
  });
});
