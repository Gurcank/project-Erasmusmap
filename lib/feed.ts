import { prisma } from "@/lib/prisma";
import type { EngagedReview } from "@/types";

const FEED_LIMIT = 12;

export type FollowingFeed = {
  /** How many people the viewer follows — separates "no follows" from "no reviews". */
  followingCount: number;
  reviews: EngagedReview[];
};

/**
 * Recent reviews written by the people the viewer follows, newest first. Drives
 * the "Çevrendeki Rotalar" section on the square. Returns an empty feed for a
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

  const rows = await prisma.review.findMany({
    where: { userId: { in: followingIds } },
    orderBy: { createdAt: "desc" },
    take: FEED_LIMIT,
    include: {
      city: { select: { name: true, slug: true } },
      user: { select: { id: true, name: true, image: true, username: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, image: true, username: true },
          },
        },
      },
      _count: { select: { likes: true } },
    },
  });

  const reviewIds = rows.map((row) => row.id);
  const authorCityPairs = rows.map((row) => ({
    userId: row.userId ?? "",
    cityId: row.cityId,
  }));

  const [viewerLikes, stays] = await Promise.all([
    prisma.reviewLike.findMany({
      where: { userId: viewerId, reviewId: { in: reviewIds } },
      select: { reviewId: true },
    }),
    prisma.visit.findMany({
      where: { OR: authorCityPairs },
      select: {
        userId: true,
        cityId: true,
        startDate: true,
        endDate: true,
      },
    }),
  ]);

  const likedIds = new Set(viewerLikes.map((like) => like.reviewId));
  const stayByKey = new Map(
    stays.map((stay) => [`${stay.userId}:${stay.cityId}`, stay]),
  );

  const reviews: EngagedReview[] = rows.map((row) => {
    const stay = stayByKey.get(`${row.userId}:${row.cityId}`);
    return {
      id: row.id,
      content: row.content,
      createdAt: row.createdAt,
      culture: row.culture,
      gastronomy: row.gastronomy,
      safety: row.safety,
      socialLife: row.socialLife,
      transport: row.transport,
      costOfLiving: row.costOfLiving,
      user: row.user,
      city: { name: row.city.name, slug: row.city.slug },
      likeCount: row._count.likes,
      likedByViewer: likedIds.has(row.id),
      replies: row.comments,
      stayStart: stay?.startDate ?? null,
      stayEnd: stay?.endDate ?? null,
    };
  });

  return { followingCount: followingIds.length, reviews };
}
