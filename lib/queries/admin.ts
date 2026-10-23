import { prisma } from "@/lib/prisma";
import primarySlugList from "@/prisma/data/primary-city-slugs.json";

const AUTHOR = { id: true, name: true, username: true, avatar: true } as const;

/** The newest reviews, for the moderation tab. */
export function getAdminReviews() {
  return prisma.review.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      city: { select: { name: true, slug: true } },
      user: { select: AUTHOR },
    },
  });
}

/** Flagged comments first: those are the ones a moderator is here for. */
export async function getAdminComments() {
  const comments = await prisma.reviewComment.findMany({
    take: 100,
    orderBy: [{ flagged: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      content: true,
      createdAt: true,
      flagged: true,
      user: { select: AUTHOR },
      parent: {
        select: { user: { select: { username: true, name: true } } },
      },
      review: {
        select: { city: { select: { name: true, slug: true } } },
      },
    },
  });

  return comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    flagged: comment.flagged,
    parentAuthor:
      comment.parent?.user?.username ?? comment.parent?.user?.name ?? null,
    city: comment.review.city,
    user: comment.user,
  }));
}

export async function getAdminStats() {
  const [userCount, cityCount, reviewCount] = await Promise.all([
    prisma.user.count(),
    // Only the cities the app can actually reach. The table also holds the
    // rest of the GeoNames dump, which scripts/build-map-regions.ts needs but
    // nothing in the product ever shows.
    prisma.city.count({
      where: { slug: { in: primarySlugList as string[] } },
    }),
    prisma.review.count(),
  ]);
  return { userCount, cityCount, reviewCount };
}
