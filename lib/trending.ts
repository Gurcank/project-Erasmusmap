import { prisma } from "@/lib/prisma";
import {
  TRENDING_CITY_LIMIT,
  TRENDING_REVIEW_LIMIT,
  TRENDING_WINDOW_DAYS,
} from "@/lib/engagement";

export type TrendingCity = {
  id: string;
  name: string;
  slug: string;
  country: string;
  imageUrl: string | null;
  reviewCount: number;
  visitCount: number;
  wishlistCount: number;
};

/**
 * Cities ranked by recent activity — visits, reviews and wishlist additions in
 * the last month — with all-time totals as a tiebreaker. Without the totals a
 * quiet month would leave the section empty, which is worse than showing the
 * cities people actually engage with.
 */
export async function getTrendingCities(): Promise<TrendingCity[]> {
  return prisma.$queryRaw<TrendingCity[]>`
    WITH activity AS (
      SELECT
        c.id,
        COUNT(DISTINCT r.id)::int AS "reviewCount",
        COUNT(DISTINCT v.id)::int AS "visitCount",
        COUNT(DISTINCT w.id)::int AS "wishlistCount",
        COUNT(DISTINCT r.id) FILTER (
          WHERE r."createdAt" > NOW() - (${TRENDING_WINDOW_DAYS} || ' days')::interval
        )::int AS "recentReviews",
        COUNT(DISTINCT v.id) FILTER (
          WHERE v."createdAt" > NOW() - (${TRENDING_WINDOW_DAYS} || ' days')::interval
        )::int AS "recentVisits",
        COUNT(DISTINCT w.id) FILTER (
          WHERE w."createdAt" > NOW() - (${TRENDING_WINDOW_DAYS} || ' days')::interval
        )::int AS "recentWishlist"
      FROM "City" c
      LEFT JOIN "Review" r ON r."cityId" = c.id
      LEFT JOIN "Visit" v ON v."cityId" = c.id
      LEFT JOIN "WishlistItem" w ON w."cityId" = c.id
      GROUP BY c.id
    )
    SELECT
      c.id, c.name, c.slug, c.country, c."imageUrl",
      a."reviewCount", a."visitCount", a."wishlistCount"
    FROM activity a
    JOIN "City" c ON c.id = a.id
    WHERE a."reviewCount" + a."visitCount" + a."wishlistCount" > 0
    ORDER BY
      (a."recentReviews" * 3 + a."recentVisits" * 2 + a."recentWishlist") DESC,
      (a."reviewCount" * 3 + a."visitCount" * 2 + a."wishlistCount") DESC,
      c.population DESC NULLS LAST
    LIMIT ${TRENDING_CITY_LIMIT}
  `;
}

type TrendingReviewRow = {
  id: string;
  content: string;
  createdAt: Date;
  culture: number | null;
  gastronomy: number | null;
  safety: number | null;
  socialLife: number | null;
  transport: number | null;
  costOfLiving: number | null;
  citySlug: string;
  cityName: string;
  authorId: string | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatar: string | null;
  stayStart: Date | null;
  stayEnd: Date | null;
  likeCount: number;
  commentCount: number;
};

/**
 * Reviews ranked by engagement. Replies weigh more than likes because they
 * take more effort; recency breaks ties so a fresh thread is not buried under
 * an old popular one. A signed-in viewer never sees reviews by someone in a
 * block relationship with them, in either direction.
 */
export async function getTrendingReviews(
  viewerId: string | null,
): Promise<TrendingReviewRow[]> {
  return prisma.$queryRaw<TrendingReviewRow[]>`
    SELECT
      r.id, r.content, r."createdAt",
      r.culture, r.gastronomy, r.safety, r."socialLife", r.transport, r."costOfLiving",
      c.slug AS "citySlug", c.name AS "cityName",
      u.id AS "authorId", u.name AS "authorName",
      u.username AS "authorUsername", u.avatar AS "authorAvatar",
      v."startDate" AS "stayStart", v."endDate" AS "stayEnd",
      COUNT(DISTINCT l.id)::int AS "likeCount",
      COUNT(DISTINCT cm.id)::int AS "commentCount"
    FROM "Review" r
    JOIN "City" c ON c.id = r."cityId"
    LEFT JOIN "User" u ON u.id = r."userId"
    LEFT JOIN "Visit" v ON v."userId" = r."userId" AND v."cityId" = r."cityId"
    LEFT JOIN "ReviewLike" l ON l."reviewId" = r.id
    LEFT JOIN "ReviewComment" cm ON cm."reviewId" = r.id
    WHERE ${viewerId}::text IS NULL OR NOT EXISTS (
      SELECT 1 FROM "Block" b
      WHERE (b."blockerId" = ${viewerId} AND b."blockedId" = r."userId")
         OR (b."blockerId" = r."userId" AND b."blockedId" = ${viewerId})
    )
    GROUP BY r.id, c.slug, c.name, u.id, u.name, u.username, u.avatar,
      v."startDate", v."endDate"
    ORDER BY
      (COUNT(DISTINCT l.id) * 2 + COUNT(DISTINCT cm.id) * 3) DESC,
      r."createdAt" DESC
    LIMIT ${TRENDING_REVIEW_LIMIT}
  `;
}
