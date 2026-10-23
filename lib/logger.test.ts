import { afterEach, describe, expect, it, vi } from "vitest";
import {
  describeError,
  logError,
  logWarn,
  pathOnly,
  scrub,
} from "@/lib/logger";

afterEach(() => {
  vi.restoreAllMocks();
});

/** A Prisma-shaped error: the message embeds the call and the values sent. */
function prismaError(message: string, code = "P2002") {
  const error = new Error(message) as Error & {
    code: string;
    clientVersion: string;
    meta: { modelName: string; target: string[] };
  };
  error.name = "PrismaClientKnownRequestError";
  error.code = code;
  error.clientVersion = "6.19.3";
  error.meta = { modelName: "User", target: ["email"] };
  return error;
}

describe("scrub", () => {
  it("blanks out emails, tokens and database addresses", () => {
    const text =
      "send to ada@example.com with ya29.a0AfH6SMBxxxxxxxxxxxxxxxx and eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig-nature at postgresql://user:pass@host:5432/db";
    const clean = scrub(text);
    expect(clean).not.toContain("ada@example.com");
    expect(clean).not.toContain("ya29");
    expect(clean).not.toContain("eyJhbGci");
    expect(clean).not.toContain("pass@host");
    expect(clean).toContain("[email]");
    expect(clean).toContain("[token]");
    expect(clean).toContain("[database-url]");
  });

  it("caps the length of what it keeps", () => {
    expect(scrub("x".repeat(5000)).length).toBeLessThanOrEqual(300);
  });

  it("leaves ordinary text alone", () => {
    expect(scrub("Cannot read properties of undefined")).toBe(
      "Cannot read properties of undefined",
    );
  });
});

describe("describeError", () => {
  it("never carries the message of a Prisma error, which holds what was sent", () => {
    const secret = "ada.lovelace@example.com";
    const error = prismaError(
      `Invalid \`prisma.user.create()\` invocation:\n\n  data: { email: "${secret}", bio: "my private note" }\n\nUnique constraint failed`,
    );
    const out = JSON.stringify(describeError(error));
    expect(out).not.toContain(secret);
    expect(out).not.toContain("private note");
    expect(out).not.toContain("invocation");
    expect(describeError(error)).toMatchObject({
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      model: "User",
    });
  });

  it("does not leak a multi-line message through the stack either", () => {
    const error = prismaError("line one\nsecret-value-123\nline three");
    error.stack = `PrismaClientKnownRequestError: line one\nsecret-value-123\nline three\n    at create (/app/lib/user.ts:12:5)\n    at run (/app/lib/a.ts:3:1)`;
    const out = JSON.stringify(describeError(error));
    expect(out).not.toContain("secret-value-123");
    expect(out).toContain("/app/lib/user.ts:12:5");
  });

  it("keeps a plain error's message, scrubbed", () => {
    const out = describeError(new TypeError("bad value for ada@example.com"));
    expect(out).toMatchObject({ name: "TypeError" });
    expect(String(out.message)).toContain("[email]");
    expect(String(out.message)).not.toContain("ada@example.com");
  });

  it("keeps the digest Next.js attaches, so a log line matches the error page", () => {
    const error = Object.assign(new Error("boom"), { digest: "123456789" });
    expect(describeError(error)).toMatchObject({ digest: "123456789" });
  });

  it("limits the stack to a handful of frames", () => {
    const frames = Array.from(
      { length: 40 },
      (_, i) => `    at fn${i} (/app/f${i}.ts:1:1)`,
    );
    const error = new Error("x");
    error.stack = ["Error: x", ...frames].join("\n");
    const stack = String(describeError(error).stack);
    expect(stack.split("\n")).toHaveLength(6);
  });

  it("says only what kind of thing was thrown when it is not an Error", () => {
    expect(describeError("a string with ada@example.com")).toEqual({
      name: "NonError",
      message: "string",
    });
    expect(describeError({ secret: "x" })).toEqual({
      name: "NonError",
      message: "object",
    });
    expect(describeError(undefined)).toEqual({
      name: "NonError",
      message: "undefined",
    });
  });
});

describe("logError and logWarn", () => {
  it("write one JSON object per line, with level, time and message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("It broke", new Error("boom"), { route: "/x", status: 500 });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0][0]);
    expect(line).not.toContain("\n");
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({
      level: "error",
      msg: "It broke",
      route: "/x",
      status: 500,
    });
    expect(new Date(parsed.time).toString()).not.toBe("Invalid Date");
    expect(parsed.error.name).toBe("Error");
  });

  it("logs a warning on the warning channel", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    logWarn("Heads up", { route: "/y" });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    expect(JSON.parse(String(warn.mock.calls[0][0])).level).toBe("warn");
  });

  it("never throws on a circular error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(() => logError("x", loop)).not.toThrow();
  });

  it("never throws on a context that cannot be serialised, and says so", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(() =>
      logError("x", new Error("boom"), { route: loop as unknown as string }),
    ).not.toThrow();
    const parsed = JSON.parse(String(spy.mock.calls[0][0]));
    expect(parsed).toMatchObject({ level: "error", msg: "x" });
    expect(parsed.logError).toMatch(/could not be serialised/);
  });
});

describe("pathOnly", () => {
  it("drops the query string and the fragment", () => {
    expect(pathOnly("/admin?tab=users&q=ada@example.com")).toBe("/admin");
    expect(pathOnly("/c/berlin#reviews")).toBe("/c/berlin");
    expect(pathOnly("/c/berlin")).toBe("/c/berlin");
    expect(pathOnly("/")).toBe("/");
  });
});
