import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActiveUser = vi.hoisted(() => vi.fn());
const rateLimit = vi.hoisted(() => vi.fn());
const buildAccountExport = vi.hoisted(() => vi.fn());
const logError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-guards", () => ({ requireActiveUser }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/account-export", () => ({ buildAccountExport }));
vi.mock("@/lib/logger", () => ({ logError }));

import { GET } from "@/app/api/account/export/route";

beforeEach(() => {
  vi.resetAllMocks();
  requireActiveUser.mockResolvedValue({ ok: true, user: { id: "u1" } });
  rateLimit.mockResolvedValue(true);
  buildAccountExport.mockResolvedValue({ user: { id: "u1" } });
});

describe("GET /api/account/export", () => {
  it("refuses a signed-out visitor with the guard's status and an error body", async () => {
    requireActiveUser.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Giriş yapmalısın",
    });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Giriş yapmalısın" });
    expect(buildAccountExport).not.toHaveBeenCalled();
  });

  it("answers 429 with an error body when the user asks too often", async () => {
    rateLimit.mockResolvedValue(false);
    const response = await GET();
    expect(response.status).toBe(429);
    expect(await response.json()).toHaveProperty("error");
    expect(buildAccountExport).not.toHaveBeenCalled();
  });

  it("exports only the session's own id, as a private download", async () => {
    const response = await GET();
    expect(buildAccountExport).toHaveBeenCalledWith("u1");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="erasmusmap-data-\d{4}-\d{2}-\d{2}\.json"$/,
    );
  });

  it("logs a failure through the structured logger and says nothing of the cause", async () => {
    buildAccountExport.mockRejectedValue(new Error("secret db detail"));
    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).not.toContain("secret db detail");
    expect(JSON.parse(body)).toHaveProperty("error");
    expect(logError).toHaveBeenCalledWith(
      "Account export failed",
      expect.any(Error),
      { route: "/api/account/export", routeType: "route" },
    );
  });
});
