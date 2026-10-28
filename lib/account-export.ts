import { prisma } from "@/lib/prisma";

const CITY = { select: { name: true, slug: true, country: true } } as const;

/**
 * Everything the site holds about one person, as plain data for a JSON file.
 *
 * It is what they did and what they wrote: their own profile, reviews,
 * comments, likes, lists, follows, blocks and trip plans. Other people's
 * content is left out, so there are no followers' names and no replies to the
 * person's reviews, and so are the provider's tokens, which the site does not
 * keep at all. Every query is scoped to the one user id passed in.
 */
export async function buildAccountExport(userId: string) {
  const [
    profile,
    reviews,
    comments,
    reviewLikes,
    commentLikes,
    visits,
    wishlist,
    favoriteCities,
    following,
    blocking,
    tripMemberships,
    trips,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        bio: true,
        location: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        accounts: { select: { provider: true } },
      },
    }),
    prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        city: CITY,
        content: true,
        culture: true,
        gastronomy: true,
        safety: true,
        socialLife: true,
        transport: true,
        costOfLiving: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.reviewComment.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        reviewId: true,
        parentId: true,
        content: true,
        createdAt: true,
      },
    }),
    prisma.reviewLike.findMany({
      where: { userId },
      select: { reviewId: true, createdAt: true },
    }),
    prisma.reviewCommentLike.findMany({
      where: { userId },
      select: { commentId: true, createdAt: true },
    }),
    prisma.visit.findMany({
      where: { userId },
      select: { city: CITY, startDate: true, endDate: true },
    }),
    prisma.wishlistItem.findMany({
      where: { userId },
      select: { city: CITY, createdAt: true },
    }),
    prisma.favoriteCity.findMany({
      where: { userId },
      orderBy: { position: "asc" },
      select: { position: true, city: CITY },
    }),
    prisma.follow.findMany({
      where: { followerId: userId },
      select: {
        createdAt: true,
        following: { select: { username: true } },
      },
    }),
    prisma.block.findMany({
      where: { blockerId: userId },
      select: { createdAt: true, blocked: { select: { username: true } } },
    }),
    prisma.tripMember.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        status: true,
        createdAt: true,
        acceptedAt: true,
        trip: { select: { title: true, startDate: true, endDate: true } },
      },
    }),
    prisma.trip.findMany({
      where: { userId },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        budget: true,
        currency: true,
        visibility: true,
        items: {
          orderBy: { startAt: "asc" },
          select: {
            type: true,
            title: true,
            startAt: true,
            endAt: true,
            city: CITY,
            placeName: true,
            toCity: CITY,
            toPlaceName: true,
            mode: true,
            bookingRef: true,
            notes: true,
          },
        },
        expenses: {
          orderBy: { date: "asc" },
          select: { date: true, amount: true, category: true, note: true },
        },
        cities: {
          orderBy: { position: "asc" },
          select: {
            city: CITY,
            notes: true,
            todos: {
              orderBy: { position: "asc" },
              select: { title: true, done: true },
            },
          },
        },
      },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    note: "Money amounts are in minor units (cents) of the trip's currency; ratings are on a 1-10 scale (10 = 5 stars).",
    profile,
    reviews,
    comments,
    likes: { reviews: reviewLikes, comments: commentLikes },
    visitedCities: visits,
    wishlist,
    favoriteCities,
    following,
    blockedUsers: blocking,
    trips,
    sharedTrips: tripMemberships,
  };
}
