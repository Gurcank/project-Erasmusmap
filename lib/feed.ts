import { prisma } from "@/lib/prisma";
import { getHiddenUserIds } from "@/lib/social";
import { ENGAGED_REVIEW_INCLUDE, toEngagedReviews } from "@/lib/review-shape";
import type { EngagedReview } from "@/types";

const FEED_LIMIT = 12;

export type FollowingFeed = {
  /** How many people the viewer follows — separates "no follows" from "no reviews". */
  followingCount: number;
  reviews: EngagedReview[];
};

/**
 * Recent reviews written by the people the viewer follows, newest first.
 * Drives the following section on the square. Returns an empty feed for a
 * signed-out viewer.
 */
export async function getFollowingFeed(
  viewerId: string | null,
): Promise<FollowingFeed> {
  if (!viewerId) return { followingCount: 0, reviews: [] };

  const follows = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  const followingIds = follows.map((follow) => follow.followingId);
  if (followingIds.length === 0) {
    return { followingCount: 0, reviews: [] };
  }

  const [rows, hiddenUserIds] = await Promise.all([
    prisma.review.findMany({
      where: { userId: { in: followingIds } },
      orderBy: { createdAt: "desc" },
      take: FEED_LIMIT,
      include: ENGAGED_REVIEW_INCLUDE,
    }),
    getHiddenUserIds(viewerId),
  ]);

  return {
    followingCount: followingIds.length,
    reviews: await toEngagedReviews(rows, viewerId, hiddenUserIds),
  };
}
