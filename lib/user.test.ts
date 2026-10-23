import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const findUnique = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique, update } } }));
vi.mock("@/lib/logger", () => ({ logError: vi.fn() }));

import { USERNAME_PATTERN, getUsernameError } from "@/lib/username";
import {
  assignInitialUsername,
  fallbackUsername,
  setUsername,
} from "@/lib/user";

const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });

beforeEach(() => {
  vi.resetAllMocks();
  findUnique.mockResolvedValue(null);
  update.mockResolvedValue({});
});

describe("setUsername", () => {
  it("writes the name and its lowercase mirror", async () => {
    expect(await setUsername("u1", "Ada_L")).toBe("updated");
    expect(update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { username: "Ada_L", usernameLower: "ada_l" },
    });
  });

  it("looks the name up case-insensitively through the lowercase column", async () => {
    await setUsername("u1", "Ada_L");
    expect(findUnique.mock.calls[0][0].where).toEqual({
      usernameLower: "ada_l",
    });
  });

  it("reports a name another user already has, without writing", async () => {
    findUnique.mockResolvedValue({ id: "someone-else" });
    expect(await setUsername("u1", "ada")).toBe("taken");
    expect(update).not.toHaveBeenCalled();
  });

  it("lets a user re-save their own name or change its casing", async () => {
    findUnique.mockResolvedValue({ id: "u1" });
    expect(await setUsername("u1", "ADA")).toBe("updated");
  });

  it("treats losing the race to the unique index as taken, not as a failure", async () => {
    update.mockRejectedValue(uniqueViolation());
    expect(await setUsername("u1", "ada")).toBe("taken");
  });

  it("still throws on any other database error", async () => {
    update.mockRejectedValue(new Error("connection lost"));
    await expect(setUsername("u1", "ada")).rejects.toThrow("connection lost");
  });
});

describe("fallbackUsername", () => {
  it("is a valid username for any id the database generates", () => {
    for (const id of [
      "clx9a8b7c0000abcd1234efgh",
      "CLX9A8B7C0000ABCD1234EFGH",
    ]) {
      const name = fallbackUsername(id);
      expect(name).toBe("user-1234efgh");
      expect(USERNAME_PATTERN.test(name)).toBe(true);
      expect(getUsernameError(name)).toBeNull();
    }
  });
});

describe("assignInitialUsername", () => {
  it("stores a name derived from the display name, with its lowercase mirror", async () => {
    await assignInitialUsername({ id: "u1", name: "Ömer Şahin" });
    expect(update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { username: "omer-sahin", usernameLower: "omer-sahin" },
    });
  });

  it("falls back to the id-derived name when the search fails", async () => {
    findUnique.mockRejectedValue(new Error("connection lost"));
    await assignInitialUsername({
      id: "clx9a8b7c0000abcd1234efgh",
      name: "Ada",
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "clx9a8b7c0000abcd1234efgh" },
      data: { username: "user-1234efgh", usernameLower: "user-1234efgh" },
    });
  });

  it("copes with a user that has no display name", async () => {
    await assignInitialUsername({ id: "u1", name: null });
    expect(update.mock.calls[0][0].data.username).toBe("user");
  });
});
