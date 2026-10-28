import { beforeEach, describe, expect, it, vi } from "vitest";

const authorizeAction = vi.hoisted(() => vi.fn());
const userFindUnique = vi.hoisted(() => vi.fn());
const userFindMany = vi.hoisted(() => vi.fn());
const blockFindUnique = vi.hoisted(() => vi.fn());
const blockCreate = vi.hoisted(() => vi.fn());
const followDeleteMany = vi.hoisted(() => vi.fn());
const memberDeleteMany = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/action-guard", () => ({ authorizeAction }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUnique, findMany: userFindMany },
    block: { findUnique: blockFindUnique, create: blockCreate },
    follow: { deleteMany: followDeleteMany },
    tripMember: { deleteMany: memberDeleteMany },
    $transaction: transaction,
  },
}));

import { toggleBlock } from "@/lib/social-actions";

const form = (targetUserId: string) => {
  const data = new FormData();
  data.set("targetUserId", targetUserId);
  return data;
};

beforeEach(() => {
  vi.resetAllMocks();
  authorizeAction.mockResolvedValue({ id: "me", username: "me" });
  userFindUnique.mockResolvedValue({ id: "them" });
  userFindMany.mockResolvedValue([]);
  blockFindUnique.mockResolvedValue(null);
  transaction.mockResolvedValue([]);
});

describe("toggleBlock", () => {
  it("takes both people off each other's plans, in the same transaction", async () => {
    expect(await toggleBlock(null, form("them"))).toEqual({ ok: true });

    // The block, the follows and the memberships go together or not at all.
    expect(transaction.mock.calls[0][0]).toHaveLength(3);
    expect(memberDeleteMany.mock.calls[0][0].where).toEqual({
      OR: [
        { userId: "them", trip: { userId: "me" } },
        { userId: "me", trip: { userId: "them" } },
      ],
    });
  });

  it("leaves plans alone when unblocking", async () => {
    blockFindUnique.mockResolvedValue({ id: "b1" });
    await toggleBlock(null, form("them"));
    expect(memberDeleteMany).not.toHaveBeenCalled();
  });
});
