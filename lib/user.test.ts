import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const findUnique = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique, update } } }));

import { setUsername } from "@/lib/user";

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
