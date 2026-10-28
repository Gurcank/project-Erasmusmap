import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = {
  where?: Record<string, unknown>;
  select?: Record<string, unknown>;
};

const models = vi.hoisted(() => {
  const make = () => vi.fn().mockResolvedValue([]);
  return {
    userFind: vi.fn().mockResolvedValue({ id: "u1", username: "ada" }),
    review: make(),
    comment: make(),
    reviewLike: make(),
    commentLike: make(),
    visit: make(),
    wishlist: make(),
    favorite: make(),
    follow: make(),
    block: make(),
    trip: make(),
    tripMember: make(),
  };
});
const requireActiveUser = vi.hoisted(() => vi.fn());
const rateLimit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: models.userFind },
    review: { findMany: models.review },
    reviewComment: { findMany: models.comment },
    reviewLike: { findMany: models.reviewLike },
    reviewCommentLike: { findMany: models.commentLike },
    visit: { findMany: models.visit },
    wishlistItem: { findMany: models.wishlist },
    favoriteCity: { findMany: models.favorite },
    follow: { findMany: models.follow },
    block: { findMany: models.block },
    trip: { findMany: models.trip },
    tripMember: { findMany: models.tripMember },
  },
}));
vi.mock("@/lib/auth-guards", () => ({ requireActiveUser }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit }));

import { buildAccountExport } from "@/lib/account-export";
import { GET } from "@/app/api/account/export/route";

const scopedQueries = () =>
  [
    models.review,
    models.comment,
    models.reviewLike,
    models.commentLike,
    models.visit,
    models.wishlist,
    models.favorite,
    models.trip,
    models.tripMember,
  ].map((fn) => fn.mock.calls[0][0] as Call);

beforeEach(() => {
  vi.clearAllMocks();
  requireActiveUser.mockResolvedValue({ ok: true, user: { id: "u1" } });
  rateLimit.mockResolvedValue(true);
});

describe("buildAccountExport", () => {
  it("scopes every query to the one user", async () => {
    await buildAccountExport("u1");
    expect(models.userFind.mock.calls[0][0].where).toEqual({ id: "u1" });
    for (const call of scopedQueries()) {
      expect(call.where).toEqual({ userId: "u1" });
    }
    expect(models.follow.mock.calls[0][0].where).toEqual({
      followerId: "u1",
    });
    expect(models.block.mock.calls[0][0].where).toEqual({ blockerId: "u1" });
  });

  it("does not select provider tokens, password-like fields or followers", async () => {
    await buildAccountExport("u1");
    const profileSelect = models.userFind.mock.calls[0][0].select;
    expect(profileSelect.accounts).toEqual({ select: { provider: true } });
    for (const field of ["image", "banned", "usernameLower", "emailVerified"]) {
      expect(profileSelect).not.toHaveProperty(field);
    }
    expect(profileSelect).not.toHaveProperty("followers");
  });

  it("returns every section", async () => {
    const data = await buildAccountExport("u1");
    expect(Object.keys(data)).toEqual([
      "exportedAt",
      "note",
      "profile",
      "reviews",
      "comments",
      "likes",
      "visitedCities",
      "wishlist",
      "favoriteCities",
      "following",
      "blockedUsers",
      "trips",
      "sharedTrips",
    ]);
  });
});

describe("GET /api/account/export", () => {
  it("answers 401 without a session and reads no data", async () => {
    requireActiveUser.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Giriş yapmalısın",
    });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(models.userFind).not.toHaveBeenCalled();
  });

  it("answers 429 when rate limited and reads no data", async () => {
    rateLimit.mockResolvedValue(false);
    const response = await GET();
    expect(response.status).toBe(429);
    expect(models.userFind).not.toHaveBeenCalled();
  });

  it("limits by user id, never by email", async () => {
    await GET();
    expect(rateLimit.mock.calls[0][0]).toBe("account-export:u1");
  });

  it("returns a private, uncached JSON attachment", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="erasmusmap-data-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = JSON.parse(await response.text());
    expect(body.profile.username).toBe("ada");
  });

  it("answers 500 without leaking the error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    models.userFind.mockRejectedValueOnce(new Error("relation does not exist"));
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("relation");
  });
});
