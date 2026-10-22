import { beforeEach, describe, expect, it, vi } from "vitest";

const count = vi.hoisted(() => vi.fn());
const remove = vi.hoisted(() => vi.fn());
const authorizeAction = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { count, delete: remove } },
}));
vi.mock("@/lib/action-guard", () => ({ authorizeAction }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { LAST_ADMIN_MESSAGE, deleteUserAccount } from "@/lib/account-deletion";
import { deleteOwnAccount } from "@/lib/account-actions";

const form = (confirmation?: string) => {
  const data = new FormData();
  if (confirmation !== undefined) data.set("confirmation", confirmation);
  return data;
};

beforeEach(() => {
  vi.resetAllMocks();
  remove.mockResolvedValue({});
  count.mockResolvedValue(1);
  authorizeAction.mockResolvedValue({
    id: "u1",
    username: "Ada",
    email: "ada@example.com",
    role: "USER",
  });
});

describe("deleteUserAccount", () => {
  it("deletes the user row and relies on the cascade for the rest", async () => {
    await deleteUserAccount({ id: "u1", role: "USER" });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith({ where: { id: "u1" } });
    expect(count).not.toHaveBeenCalled();
  });

  it("refuses to delete the last admin", async () => {
    count.mockResolvedValue(0);
    await expect(
      deleteUserAccount({ id: "a1", role: "ADMIN" }),
    ).rejects.toThrow(LAST_ADMIN_MESSAGE);
    expect(remove).not.toHaveBeenCalled();
    expect(count).toHaveBeenCalledWith({
      where: { role: "ADMIN", id: { not: "a1" } },
    });
  });

  it("lets an admin go when another admin exists", async () => {
    count.mockResolvedValue(1);
    await deleteUserAccount({ id: "a1", role: "ADMIN" });
    expect(remove).toHaveBeenCalledWith({ where: { id: "a1" } });
  });
});

describe("deleteOwnAccount", () => {
  it("deletes the caller's account when the username is typed", async () => {
    expect(await deleteOwnAccount(null, form("Ada"))).toEqual({ ok: true });
    expect(remove).toHaveBeenCalledWith({ where: { id: "u1" } });
    expect(revalidatePath).toHaveBeenCalledWith("/meydan");
  });

  it("ignores case and surrounding space in the confirmation", async () => {
    expect(await deleteOwnAccount(null, form("  aDa "))).toEqual({ ok: true });
  });

  it("refuses a wrong or missing confirmation, without deleting", async () => {
    for (const data of [form("Ada2"), form(""), form()]) {
      expect(await deleteOwnAccount(null, data)).toEqual({
        ok: false,
        error: "Onay metni eşleşmedi",
      });
    }
    expect(remove).not.toHaveBeenCalled();
  });

  it("never takes the target from the request", async () => {
    const data = form("Ada");
    data.set("userId", "someone-else");
    data.set("id", "someone-else");
    await deleteOwnAccount(null, data);
    expect(remove).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("falls back to the email as the confirmation when there is no username", async () => {
    authorizeAction.mockResolvedValue({
      id: "u1",
      username: null,
      email: "ada@example.com",
      role: "USER",
    });
    expect(await deleteOwnAccount(null, form("ada@example.com"))).toEqual({
      ok: true,
    });
  });

  it("is rate limited to three a minute through the shared guard", async () => {
    await deleteOwnAccount(null, form("Ada"));
    expect(authorizeAction).toHaveBeenCalledWith("account-delete", {
      limit: 3,
    });
  });

  it("reports the last-admin refusal to the form", async () => {
    authorizeAction.mockResolvedValue({
      id: "a1",
      username: "Boss",
      email: "boss@example.com",
      role: "ADMIN",
    });
    count.mockResolvedValue(0);
    expect(await deleteOwnAccount(null, form("Boss"))).toEqual({
      ok: false,
      error: LAST_ADMIN_MESSAGE,
    });
    expect(remove).not.toHaveBeenCalled();
  });
});
