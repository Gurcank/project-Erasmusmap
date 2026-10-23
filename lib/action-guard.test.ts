import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.hoisted(() => vi.fn());
const findUnique = vi.hoisted(() => vi.fn());
const rateLimit = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique } } }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit }));

import { authorizeAction, RATE_LIMITED_MESSAGE } from "@/lib/action-guard";
import { requireActiveUser } from "@/lib/auth-guards";
import { UserFacingError } from "@/lib/action-result";

const dbUser = {
  id: "user-1",
  email: "ada@example.com",
  username: "ada",
  role: "USER",
  banned: false,
};

beforeEach(() => {
  vi.resetAllMocks();
  findUnique.mockResolvedValue(dbUser);
  rateLimit.mockResolvedValue(true);
});

describe("requireActiveUser", () => {
  it("rejects a request with no session", async () => {
    getServerSession.mockResolvedValue(null);
    const result = await requireActiveUser();
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("looks the user up by id when the session carries one", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "user-1", email: "ADA@example.com" },
    });
    const result = await requireActiveUser();
    expect(result.ok).toBe(true);
    expect(findUnique.mock.calls[0][0].where).toEqual({ id: "user-1" });
  });

  it("falls back to the normalized email only when there is no id", async () => {
    getServerSession.mockResolvedValue({
      user: { email: "  ADA@Example.com " },
    });
    await requireActiveUser();
    expect(findUnique.mock.calls[0][0].where).toEqual({
      email: "ada@example.com",
    });
  });

  it("does not fall back to the email when the id no longer exists", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "deleted", email: "ada@example.com" },
    });
    findUnique.mockResolvedValue(null);
    const result = await requireActiveUser();
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("rejects a banned user even if the token says otherwise", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "user-1", banned: false },
    });
    findUnique.mockResolvedValue({ ...dbUser, banned: true });
    const result = await requireActiveUser();
    expect(result).toMatchObject({ ok: false, status: 403 });
  });
});

describe("authorizeAction", () => {
  beforeEach(() => {
    getServerSession.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("returns the user and rate limits by id, never by email", async () => {
    const user = await authorizeAction("follow", { limit: 7 });
    expect(user.id).toBe("user-1");
    expect(rateLimit).toHaveBeenCalledWith("follow:user-1", 7);
    expect(rateLimit.mock.calls[0][0]).not.toContain("@");
  });

  it("defaults to 30 requests per minute", async () => {
    await authorizeAction("visit");
    expect(rateLimit).toHaveBeenCalledWith("visit:user-1", 30);
  });

  it("throws a user-facing error when rate limited", async () => {
    rateLimit.mockResolvedValue(false);
    const attempt = authorizeAction("visit");
    await expect(attempt).rejects.toBeInstanceOf(UserFacingError);
    await expect(attempt).rejects.toThrow(RATE_LIMITED_MESSAGE);
  });

  it("throws the guard's message when signed out and skips the limiter", async () => {
    getServerSession.mockResolvedValue(null);
    await expect(authorizeAction("visit")).rejects.toThrow("Giriş yapmalısın");
    expect(rateLimit).not.toHaveBeenCalled();
  });

  it("refuses a non-admin for an admin action", async () => {
    await expect(authorizeAction("admin-ban", { admin: true })).rejects.toThrow(
      "Bu işlem için yetkiniz yok",
    );
    expect(rateLimit).not.toHaveBeenCalled();
  });

  it("lets an admin through", async () => {
    findUnique.mockResolvedValue({ ...dbUser, role: "ADMIN" });
    const user = await authorizeAction("admin-ban", { admin: true });
    expect(user.role).toBe("ADMIN");
  });
});
