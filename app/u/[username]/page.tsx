import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProfileContent from "@/components/ui/ProfileContent";
import type { ProfileTab } from "@/components/ui/ProfileContent";
import { deleteReview } from "@/lib/actions";
import { addFavoriteCity, removeFavoriteCity } from "@/lib/profile-actions";
import { toggleBlock, toggleFollow } from "@/lib/social-actions";
import { isBlockedBetween } from "@/lib/social";
import { MAX_FAVORITE_CITIES } from "@/lib/profile";
import { requireActiveUser } from "@/lib/auth-guards";

const TABS: ProfileTab[] = ["visited", "wishlist", "reviews"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { usernameLower: username.toLowerCase() },
    select: { username: true, bio: true },
  });
  // Runs before the shell is streamed, so this is the last point where a real
  // 404 status can still be set.
  if (!user) notFound();

  const title = user.username ?? "";
  const description = user.bio || `${title} — ErasmusMap profili`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ username }, { tab }] = await Promise.all([params, searchParams]);
  if (!username) notFound();

  const activeTab: ProfileTab = TABS.includes(tab as ProfileTab)
    ? (tab as ProfileTab)
    : "visited";

  const [user, viewer] = await Promise.all([
    prisma.user.findUnique({
      where: { usernameLower: username.toLowerCase() },
      include: {
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { city: { select: { name: true, slug: true } } },
        },
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
    }),
    requireActiveUser(),
  ]);

  if (!user) notFound();

  const isOwnProfile = viewer.ok && viewer.user.id === user.id;
  const isAdmin = viewer.ok && viewer.user.role === "ADMIN";

  // A block in either direction hides the profile entirely — 404 rather than a
  // "you are blocked" page, which would just confirm the block.
  if (viewer.ok && !isOwnProfile) {
    if (await isBlockedBetween(viewer.user.id, user.id)) notFound();
  }

  const viewerId = viewer.ok ? viewer.user.id : null;
  const [followerCount, followingCount, viewerFollows] = await Promise.all([
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    viewerId && !isOwnProfile
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: user.id,
            },
          },
          select: { id: true },
        })
      : null,
  ]);

  // The reviews tab shows the stay the user recorded for each reviewed city.
  const stayByCitySlug = new Map(
    user.visits.map((visit) => [
      visit.city.slug,
      { startDate: visit.startDate, endDate: visit.endDate },
    ]),
  );
  const reviews = user.reviews.map((review) => {
    const stay = stayByCitySlug.get(review.city.slug);
    return {
      ...review,
      stayStart: stay?.startDate ?? null,
      stayEnd: stay?.endDate ?? null,
    };
  });

  return (
    <div className="min-h-screen bg-canvas pt-24">
      <ProfileContent
        userId={user.id}
        username={user.username ?? ""}
        image={user.image}
        bio={user.bio}
        isOwnProfile={isOwnProfile}
        isAdmin={isAdmin}
        viewerSignedIn={viewerId !== null}
        isFollowing={Boolean(viewerFollows)}
        followerCount={followerCount}
        followingCount={followingCount}
        toggleFollow={toggleFollow}
        toggleBlock={toggleBlock}
        activeTab={activeTab}
        maxFavorites={MAX_FAVORITE_CITIES}
        favorites={user.favoriteCities.map((favorite) => ({
          cityId: favorite.city.id,
          position: favorite.position,
          name: favorite.city.name,
          slug: favorite.city.slug,
          country: favorite.city.country,
          imageUrl: favorite.city.imageUrl,
        }))}
        visitedCities={user.visits.map((visit) => ({
          ...visit.city,
          startDate: visit.startDate,
          endDate: visit.endDate,
        }))}
        wishlist={user.wishlist.map((item) => item.city)}
        reviews={reviews}
        deleteReview={deleteReview}
        addFavoriteCity={addFavoriteCity}
        removeFavoriteCity={removeFavoriteCity}
      />
    </div>
  );
}
