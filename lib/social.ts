import { prisma } from "@/lib/prisma";

/**
 * Every user id the viewer must not see: people the viewer has blocked, and
 * people who have blocked the viewer. A block hides the other person's content
 * in both directions, so review lists filter against this set.
 *
 * Returns an empty array for a signed-out viewer, which callers can pass
 * straight into a Prisma `notIn` without a branch.
 */
export async function getHiddenUserIds(
  viewerId: string | null,
): Promise<string[]> {
  if (!viewerId) return [];

  const blocks = await prisma.block.findMany({
    where: {
      OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
    },
    select: { blockerId: true, blockedId: true },
  });

  const ids = new Set<string>();
  for (const block of blocks) {
    ids.add(block.blockerId === viewerId ? block.blockedId : block.blockerId);
  }
  return [...ids];
}

/** Whether a block exists between the two users, in either direction. */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return block !== null;
}
