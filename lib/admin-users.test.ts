import { beforeEach, describe, expect, it, vi } from "vitest";

const count = vi.hoisted(() => vi.fn());
const findMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: { user: { count, findMany } } }));

import {
  ADMIN_USERS_PAGE_SIZE,
  getAdminUsers,
  normalizeUserQuery,
  userSearchWhere,
} from "@/lib/admin-users";

beforeEach(() => {
  vi.resetAllMocks();
  count.mockResolvedValue(0);
  findMany.mockResolvedValue([]);
});

describe("normalizeUserQuery", () => {
  it("trims and caps the search text", () => {
    expect(normalizeUserQuery("  ada  ")).toBe("ada");
    expect(normalizeUserQuery("x".repeat(500))).toHaveLength(100);
  });

  it("treats a missing value as no search, and takes the first of several", () => {
    expect(normalizeUserQuery(undefined)).toBe("");
    expect(normalizeUserQuery(["a", "b"])).toBe("a");
  });
});

describe("userSearchWhere", () => {
  it("is no filter for an empty search", () => {
    expect(userSearchWhere("")).toEqual({});
  });

  it("matches name, username and email without regard to case", () => {
    const where = userSearchWhere("ada");
    expect(where.OR).toHaveLength(3);
    for (const clause of where.OR ?? []) {
      const [field] = Object.keys(clause);
      expect(["username", "name", "email"]).toContain(field);
      expect((clause as Record<string, { mode: string }>)[field].mode).toBe(
        "insensitive",
      );
    }
  });
});

describe("getAdminUsers", () => {
  it("reads one page, not every user", async () => {
    count.mockResolvedValue(60);
    await getAdminUsers("", 2);
    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0][0];
    expect(args.take).toBe(ADMIN_USERS_PAGE_SIZE);
    expect(args.skip).toBe(ADMIN_USERS_PAGE_SIZE);
  });

  it("orders newest first with the id as a tiebreaker, so pages do not overlap", async () => {
    await getAdminUsers("", 1);
    expect(findMany.mock.calls[0][0].orderBy).toEqual([
      { createdAt: "desc" },
      { id: "asc" },
    ]);
  });

  it("counts with the same filter it lists with", async () => {
    await getAdminUsers("ada", 1);
    expect(count.mock.calls[0][0].where).toEqual(
      findMany.mock.calls[0][0].where,
    );
    expect(findMany.mock.calls[0][0].where.OR).toBeDefined();
  });

  it("clamps a page past the end to the last page", async () => {
    count.mockResolvedValue(30);
    const result = await getAdminUsers("", 99);
    expect(result.pages).toBe(2);
    expect(result.page).toBe(2);
    expect(findMany.mock.calls[0][0].skip).toBe(ADMIN_USERS_PAGE_SIZE);
  });

  it("returns one empty page when nothing matches", async () => {
    const result = await getAdminUsers("nobody", 3);
    expect(result).toMatchObject({ total: 0, page: 1, pages: 1, users: [] });
  });

  it("never selects a password or a token", async () => {
    await getAdminUsers("", 1);
    const select = findMany.mock.calls[0][0].select;
    for (const field of ["accounts", "sessions", "emailVerified"]) {
      expect(select).not.toHaveProperty(field);
    }
  });
});
