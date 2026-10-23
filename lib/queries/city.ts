import { prisma } from "@/lib/prisma";
import { averageRating } from "@/lib/review";
import { COMMENT_QUERY } from "@/lib/review-shape";
import type { CategoryRatings } from "@/types";

/** Just what the page title and description need. */
export function getCityMeta(slug: string) {
  return prisma.city.findUnique({
    where: { slug },
    select: { name: true, country: true },
  });
}

export function getCityBySlug(slug: string) {
  return prisma.city.findUnique({ where: { slug } });
}

/**
 * The newest `take` reviews of a city, with their authors, comment trees and
 * like counts. Reviews by `hiddenUserIds` (blocked either way) are left out;
 * anonymous ones (deleted authors) are kept.
 */
export function getCityReviews(
  cityId: string,
  hiddenUserIds: string[],
  take: number,
) {
  return prisma.review.findMany({
    where: {
      cityId,
      ...(hiddenUserIds.length
        ? { OR: [{ userId: null }, { userId: { notIn: hiddenUserIds } }] }
        : {}),
    },
    include: {
      user: {
        select: { id: true, name: true, avatar: true, username: true },
      },
      comments: COMMENT_QUERY,
      _count: { select: { likes: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/** The viewer's own visit dates and wishlist flag for one city. */
export async function getViewerCityState(userId: string, cityId: string) {
  const identity = { userId_cityId: { userId, cityId } };
  const [visit, wishlistItem] = await Promise.all([
    prisma.visit.findUnique({
      where: identity,
      select: { startDate: true, endDate: true },
    }),
    prisma.wishlistItem.findUnique({
      where: identity,
      select: { id: true },
    }),
  ]);
  return { visit, isWishlisted: wishlistItem !== null };
}

/** Which of these reviews the viewer has liked: one query, not one per card. */
export async function getLikedReviewIds(
  userId: string | null,
  reviewIds: string[],
): Promise<Set<string>> {
  if (!userId) return new Set();
  const likes = await prisma.reviewLike.findMany({
    where: { userId, reviewId: { in: reviewIds } },
    select: { reviewId: true },
  });
  return new Set(likes.map((like) => like.reviewId));
}

/**
 * When each author was in this city, for the stay shown on their review. Keyed
 * by a plain object, not a Map: `Map` is the map component here.
 */
export async function getAuthorStays(cityId: string, authorIds: string[]) {
  const stays: Record<
    string,
    { startDate: Date | null; endDate: Date | null }
  > = {};
  if (authorIds.length === 0) return stays;

  const visits = await prisma.visit.findMany({
    where: { cityId, userId: { in: authorIds } },
    select: { userId: true, startDate: true, endDate: true },
  });
  for (const visit of visits) {
    stays[visit.userId] = {
      startDate: visit.startDate,
      endDate: visit.endDate,
    };
  }
  return stays;
}

/** Review count, per-category averages and the overall score of a city. */
export async function getCityRatingSummary(cityId: string) {
  const data = await prisma.review.aggregate({
    where: { cityId },
    _avg: {
      culture: true,
      gastronomy: true,
      safety: true,
      socialLife: true,
      transport: true,
      costOfLiving: true,
    },
    _count: { id: true },
  });

  const reviewCount = data._count.id ?? 0;
  const avg = data._avg;
  const ratings: CategoryRatings = {
    culture: avg.culture ?? 0,
    gastronomy: avg.gastronomy ?? 0,
    safety: avg.safety ?? 0,
    socialLife: avg.socialLife ?? 0,
    transport: avg.transport ?? 0,
    costOfLiving: avg.costOfLiving ?? 0,
  };
  const avgScore = reviewCount > 0 ? (averageRating(ratings) ?? 0) : 0;
  return { reviewCount, ratings, avgScore };
}
