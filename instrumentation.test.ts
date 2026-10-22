import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestError } from "@/instrumentation";

afterEach(() => {
  vi.restoreAllMocks();
});

const context = {
  routerKind: "App Router" as const,
  routePath: "/c/[slug]",
  routeType: "render" as const,
  renderSource: "react-server-components" as const,
  revalidateReason: undefined,
};

function report(error: unknown, path = "/c/berlin", headers = {}) {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  onRequestError(error, { path, method: "GET", headers }, context);
  return spy.mock.calls.map((call) => JSON.parse(String(call[0])));
}

describe("onRequestError", () => {
  it("logs where the request failed, in one structured line", () => {
    const [line] = report(new Error("boom"));
    expect(line).toMatchObject({
      level: "error",
      msg: "Request failed",
      method: "GET",
      path: "/c/berlin",
      route: "/c/[slug]",
      routeType: "render",
      renderSource: "react-server-components",
    });
    expect(line.error.name).toBe("Error");
  });

  it("drops the query string from the path", () => {
    const [line] = report(new Error("x"), "/admin?tab=users&q=ada@example.com");
    expect(line.path).toBe("/admin");
    expect(JSON.stringify(line)).not.toContain("ada@example.com");
  });

  it("never reads or logs headers, which hold cookies", () => {
    const [line] = report(new Error("x"), "/", {
      cookie: "next-auth.session-token=SECRET-SESSION",
      authorization: "Bearer SECRET-BEARER",
    });
    const text = JSON.stringify(line);
    expect(text).not.toContain("SECRET-SESSION");
    expect(text).not.toContain("SECRET-BEARER");
    expect(text).not.toContain("cookie");
  });

  it("keeps the person's data out of a failing database call", () => {
    const error = Object.assign(
      new Error('Invalid `prisma.review.create()`: content: "my diary"'),
      {
        name: "PrismaClientKnownRequestError",
        code: "P2003",
        clientVersion: "6",
      },
    );
    const [line] = report(error);
    expect(JSON.stringify(line)).not.toContain("my diary");
    expect(line.error.code).toBe("P2003");
  });

  it("does not throw for something that is not an Error", () => {
    expect(() => report("a string")).not.toThrow();
    expect(() => report(undefined)).not.toThrow();
  });
});
