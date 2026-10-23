import { prisma } from "@/lib/prisma";

/** What the page title and description of a profile need. */
export function getProfileMeta(username: string) {
  return prisma.user.findUnique({
    where: { usernameLower: username.toLowerCase() },
    select: { username: true, bio: true },
  });
}

/** A profile with the lists its overview tabs show. */
export function getProfileByUsername(username: string) {
  return prisma.user.findUnique({
    where: { usernameLower: username.toLowerCase() },
    include: {
      visits: {
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
        select: {
          startDate: true,
          endDate: true,
          city: {
            select: { id: true, name: true, slug: true, country: true },
          },
        },
      },
      wishlist: {
        orderBy: { createdAt: "desc" },
        select: {
          city: {
            select: { id: true, name: true, slug: true, country: true },
          },
        },
      },
      favoriteCities: {
        orderBy: { position: "asc" },
        select: {
          position: true,
          city: {
            select: {
              id: true,
              name: true,
              slug: true,
              country: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });
}

/** Follower and following totals, and whether the viewer follows this user. */
export async function getFollowStats(userId: string, viewerId: string | null) {
  const [followerCount, followingCount, viewerFollows] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
    viewerId
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: userId,
            },
          },
          select: { id: true },
        })
      : null,
  ]);
  return { followerCount, followingCount, isFollowing: Boolean(viewerFollows) };
}

/** Counts behind the tab badges. */
export async function getProfileCounts(userId: string) {
  const [reviewCount, likedCount] = await Promise.all([
    prisma.review.count({ where: { userId } }),
    prisma.reviewLike.count({ where: { userId } }),
  ]);
  return { reviewCount, likedCount };
}

/** A private plan is only ever counted on its owner's own profile. */
export function countProfileTrips(userId: string, isOwnProfile: boolean) {
  return prisma.trip.count({
    where: {
      userId,
      ...(isOwnProfile ? {} : { visibility: "PUBLIC" as const }),
    },
  });
}

/** The signed-in user's own row, for the account page. */
export function getAccountUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}
