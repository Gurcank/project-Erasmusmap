import { prisma } from "@/lib/prisma";
import { getHiddenUserIds } from "@/lib/social";
import { ENGAGED_REVIEW_INCLUDE, toEngagedReviews } from "@/lib/review-shape";
import type { EngagedReview } from "@/types";

/** How many reviews either profile tab lists before it stops. */
const PROFILE_REVIEW_LIMIT = 50;

/** Reviews this profile wrote, newest first. */
export async function getProfileReviews(
  profileUserId: string,
  viewerId: string | null,
): Promise<EngagedReview[]> {
  const [rows, hiddenUserIds] = await Promise.all([
    prisma.review.findMany({
      where: { userId: profileUserId },
      orderBy: { createdAt: "desc" },
      take: PROFILE_REVIEW_LIMIT,
      include: ENGAGED_REVIEW_INCLUDE,
    }),
    getHiddenUserIds(viewerId),
  ]);

  return toEngagedReviews(rows, viewerId, hiddenUserIds);
}

/**
 * Reviews this profile has liked, most recently liked first. Public, the way a
 * likes tab usually is — the profile itself is already public.
 */
export async function getLikedReviews(
  profileUserId: string,
  viewerId: string | null,
): Promise<EngagedReview[]> {
  const hiddenUserIds = await getHiddenUserIds(viewerId);

  const likes = await prisma.reviewLike.findMany({
    where: {
      userId: profileUserId,
      // A blocked author's review stays hidden even when someone else liked
      // it. `notIn` alone would also drop reviews whose author was deleted,
      // so the null case is spelled out.
      review: hiddenUserIds.length
        ? { OR: [{ userId: null }, { userId: { notIn: hiddenUserIds } }] }
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: PROFILE_REVIEW_LIMIT,
    include: { review: { include: ENGAGED_REVIEW_INCLUDE } },
  });

  return toEngagedReviews(
    likes.map((like) => like.review),
    viewerId,
    hiddenUserIds,
  );
}

/** A comment this profile left, with the review and city it sits on. */
export type ProfileComment = {
  id: string;
  content: string;
  createdAt: Date;
  likeCount: number;
  city: { name: string; slug: string };
};

/** Comments this profile wrote, newest first. */
export async function getProfileComments(
  profileUserId: string,
  viewerId: string | null,
): Promise<ProfileComment[]> {
  const hiddenUserIds = await getHiddenUserIds(viewerId);

  const rows = await prisma.reviewComment.findMany({
    where: {
      userId: profileUserId,
      // A comment on a blocked author's review stays hidden with it.
      review: hiddenUserIds.length
        ? { OR: [{ userId: null }, { userId: { notIn: hiddenUserIds } }] }
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: PROFILE_REVIEW_LIMIT,
    select: {
      id: true,
      content: true,
      createdAt: true,
      _count: { select: { likes: true } },
      review: { select: { city: { select: { name: true, slug: true } } } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    likeCount: row._count.likes,
    city: row.review.city,
  }));
}

/**
 * Cities this profile engaged with in the current calendar year.
 *
 * "Engaged" is deliberately wider than the stay dates it used to read: marking
 * a city visited counts on its own, and so does writing a review or a comment
 * about it. Someone who presses "I went" without filling in dates has still
 * been somewhere this year.
 */
export async function countCitiesThisYear(userId: string): Promise<number> {
  const year = new Date().getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const within = { gte: start, lt: end };

  const [visits, reviews, comments] = await Promise.all([
    prisma.visit.findMany({
      where: {
        userId,
        OR: [{ createdAt: within }, { startDate: within }, { endDate: within }],
      },
      select: { cityId: true },
    }),
    prisma.review.findMany({
      where: { userId, createdAt: within },
      select: { cityId: true },
    }),
    prisma.reviewComment.findMany({
      where: { userId, createdAt: within },
      select: { review: { select: { cityId: true } } },
    }),
  ]);

  const cities = new Set<string>();
  for (const visit of visits) cities.add(visit.cityId);
  for (const review of reviews) cities.add(review.cityId);
  for (const comment of comments) cities.add(comment.review.cityId);
  return cities.size;
}
