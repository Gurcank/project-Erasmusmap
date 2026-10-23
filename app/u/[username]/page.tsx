import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProfileContent from "@/components/ui/ProfileContent";
import type { ProfileTab } from "@/components/ui/ProfileContent";
import { deleteReview } from "@/lib/actions";
import { addFavoriteCity, removeFavoriteCity } from "@/lib/profile-actions";
import { toggleBlock, toggleFollow } from "@/lib/social-actions";
import { toggleWishlist } from "@/lib/city-actions";
import {
  addReviewComment,
  toggleCommentLike,
  deleteOwnReview,
  deleteReviewComment,
  toggleReviewLike,
  updateOwnReview,
} from "@/lib/square-actions";
import {
  countCitiesThisYear,
  getLikedReviews,
  getProfileComments,
  getProfileReviews,
} from "@/lib/profile-reviews";
import { isBlockedBetween } from "@/lib/social";
import { MAX_FAVORITE_CITIES } from "@/lib/profile";
import { requireActiveUser } from "@/lib/auth-guards";
import { getUserTrips } from "@/lib/trips";
import { getRequestLang } from "@/lib/lang-server";
import { canonicalFor, socialMetadata } from "@/lib/seo";
import {
  countProfileTrips,
  getFollowStats,
  getProfileByUsername,
  getProfileCounts,
  getProfileMeta,
} from "@/lib/queries/profile";

const TABS: ProfileTab[] = [
  "visited",
  "wishlist",
  "reviews",
  "comments",
  "liked",
  "trips",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await getProfileMeta(username);
  // A real 404 status, which is why this route has no loading.tsx: a loading
  // shell starts the response before the page can say the profile does not exist.
  if (!user) notFound();

  const title = user.username ?? "";
  const description = user.bio || `${title} — ErasmusMap profili`;
  const path = `/u/${title}`;
  return {
    title,
    description,
    ...canonicalFor(path),
    ...socialMetadata({
      lang: await getRequestLang(),
      title,
      description,
      path,
    }),
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
    getProfileByUsername(username),
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
  const { followerCount, followingCount, isFollowing } = await getFollowStats(
    user.id,
    isOwnProfile ? null : viewerId,
  );

  // Counts drive the tab badges, so both are always needed; the lists
  // themselves are heavy, so only the open tab's is actually loaded.
  const { reviewCount, likedCount } = await getProfileCounts(user.id);

  const citiesThisYear = await countCitiesThisYear(user.id);
  const reviews =
    activeTab === "reviews" ? await getProfileReviews(user.id, viewerId) : [];
  const profileComments =
    activeTab === "comments" ? await getProfileComments(user.id, viewerId) : [];
  const likedReviews =
    activeTab === "liked" ? await getLikedReviews(user.id, viewerId) : [];
  // A private plan is only ever listed on its owner's own profile.
  const [trips, tripCount] = await Promise.all([
    activeTab === "trips" ? getUserTrips(user.id, isOwnProfile) : [],
    countProfileTrips(user.id, isOwnProfile),
  ]);

  return (
    <div className="min-h-screen pt-24">
      <ProfileContent
        userId={user.id}
        username={user.username ?? ""}
        avatar={user.avatar}
        bio={user.bio}
        isOwnProfile={isOwnProfile}
        isAdmin={isAdmin}
        viewerSignedIn={viewerId !== null}
        isFollowing={isFollowing}
        followerCount={followerCount}
        followingCount={followingCount}
        toggleFollow={toggleFollow}
        toggleBlock={toggleBlock}
        toggleWishlist={toggleWishlist}
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
        comments={profileComments}
        citiesThisYear={citiesThisYear}
        reviewCount={reviewCount}
        likedReviews={likedReviews}
        likedCount={likedCount}
        trips={trips}
        tripCount={tripCount}
        viewerId={viewerId}
        deleteReview={deleteReview}
        toggleReviewLike={toggleReviewLike}
        addReviewComment={addReviewComment}
        toggleCommentLike={toggleCommentLike}
        deleteReviewComment={deleteReviewComment}
        updateOwnReview={updateOwnReview}
        deleteOwnReview={deleteOwnReview}
        addFavoriteCity={addFavoriteCity}
        removeFavoriteCity={removeFavoriteCity}
      />
    </div>
  );
}
