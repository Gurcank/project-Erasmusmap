"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import LocalizedError from "@/components/ui/LocalizedError";
import Link from "next/link";
import { Check, Copy, MoreHorizontal, UserMinus } from "lucide-react";
import { useT } from "@/hooks/useT";
import SubmitButton from "@/components/ui/SubmitButton";
import GlassButton, { GlassLink } from "@/components/ui/GlassButton";
import ActionForm from "@/components/ui/ActionForm";
import UserAvatar from "@/components/ui/UserAvatar";
import AvatarModal from "@/components/ui/AvatarModal";
import ReviewCard from "@/components/ui/ReviewCard";
import FavoriteCities from "@/components/ui/FavoriteCities";
import CityCard from "@/components/ui/CityCard";
import WishlistEditor from "@/components/ui/WishlistEditor";
import type { FavoriteCity } from "@/components/ui/FavoriteCities";
import type { CitySuggestion, EngagedReview } from "@/types";
import type { ProfileComment } from "@/lib/profile-reviews";
import type { FormAction } from "@/lib/action-result";
import type { TripSummary } from "@/lib/trip-types";
import TripCard from "@/components/trips/TripCard";
import { useTripT } from "@/hooks/useTripT";

export type ProfileTab =
  "visited" | "wishlist" | "reviews" | "comments" | "liked" | "trips";

export type VisitedCity = CitySuggestion & {
  startDate: Date | null;
  endDate: Date | null;
};

type Props = {
  userId: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  isOwnProfile: boolean;
  isAdmin: boolean;
  viewerSignedIn: boolean;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  toggleFollow: FormAction;
  toggleBlock: FormAction;
  toggleWishlist: FormAction;
  activeTab: ProfileTab;
  favorites: FavoriteCity[];
  maxFavorites: number;
  visitedCities: VisitedCity[];
  wishlist: CitySuggestion[];
  /** Only the open tab's list is loaded; the counts below drive both badges. */
  reviews: EngagedReview[];
  comments: ProfileComment[];
  /** Cities engaged with this calendar year — counted on the server. */
  citiesThisYear: number;
  reviewCount: number;
  likedReviews: EngagedReview[];
  likedCount: number;
  /** Public trips, plus private ones on the owner's own profile. */
  trips: TripSummary[];
  tripCount: number;
  /** Null when signed out — likes and replies are then read-only. */
  viewerId: string | null;
  deleteReview: FormAction;
  toggleReviewLike: FormAction;
  addReviewComment: FormAction;
  deleteReviewComment: FormAction;
  toggleCommentLike: FormAction;
  updateOwnReview: FormAction;
  deleteOwnReview: FormAction;
  addFavoriteCity: FormAction;
  removeFavoriteCity: FormAction;
};

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-dashed border-border-strong px-4 py-10 text-center text-sm text-text-subtle">
      {children}
    </p>
  );
}

/** Follow / following toggle shown on another user's profile. */
function FollowButton({
  userId,
  isFollowing,
  toggleFollow,
}: {
  userId: string;
  isFollowing: boolean;
  toggleFollow: FormAction;
}) {
  const t = useT();
  const [state, action] = useActionState(toggleFollow, null);

  return (
    <form action={action} className="contents">
      <input type="hidden" name="targetUserId" value={userId} />
      <SubmitButton
        aria-pressed={isFollowing}
        aria-label={isFollowing ? t.unfollow : t.follow}
        variant={isFollowing ? "secondary" : "primary"}
        size="sm"
        className="tracking-wide uppercase"
      >
        {isFollowing ? t.followingState : t.follow}
      </SubmitButton>
      {state && !state.ok && (
        <span
          role="alert"
          className="text-xs text-danger-700 dark:text-danger-400"
        >
          <LocalizedError message={state.error} />
        </span>
      )}
    </form>
  );
}

/**
 * The "⋯" control next to the name. Always offers "copy link"; on another
 * user's profile it also offers "block".
 */
function ProfileMenu({
  username,
  block,
}: {
  username: string;
  block?: { userId: string; toggleBlock: FormAction };
}) {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/u/${username}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is unavailable (insecure context, denied permission) — the
      // menu simply does nothing rather than throwing at the user.
    }
  };

  const itemClass =
    "flex w-full items-center gap-2 rounded-[0.4rem] px-3 py-2 text-left text-sm transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

  return (
    <div ref={rootRef} className="relative">
      <GlassButton
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.profileMenu}
        size="iconSm"
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </GlassButton>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-20 mt-1 min-w-[12rem] rounded-control glass border border-border bg-surface p-1 shadow-popover"
        >
          <button
            type="button"
            role="menuitem"
            onClick={copyLink}
            className={`${itemClass} text-text`}
          >
            {copied ? (
              <Check
                size={14}
                aria-hidden="true"
                className="text-visited-600"
              />
            ) : (
              <Copy size={14} aria-hidden="true" />
            )}
            {copied ? t.linkCopied : t.copyLink}
          </button>

          {block && (
            <ActionForm
              action={block.toggleBlock}
              confirmMessage={t.confirmBlock}
              confirmLabel={t.blockUser}
              errorClassName="px-3 pb-1 text-xs text-danger-700 dark:text-danger-400"
            >
              <input type="hidden" name="targetUserId" value={block.userId} />
              <button
                type="submit"
                role="menuitem"
                className={`${itemClass} text-danger-700 dark:text-danger-400`}
              >
                <UserMinus size={14} aria-hidden="true" />
                {t.blockUser}
              </button>
            </ActionForm>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfileContent({
  userId,
  username,
  avatar,
  bio,
  isOwnProfile,
  isAdmin,
  viewerSignedIn,
  isFollowing,
  followerCount,
  followingCount,
  toggleFollow,
  toggleBlock,
  toggleWishlist,
  activeTab,
  favorites,
  maxFavorites,
  visitedCities,
  wishlist,
  reviews,
  comments,
  citiesThisYear,
  reviewCount,
  likedReviews,
  likedCount,
  trips,
  tripCount,
  viewerId,
  deleteReview,
  toggleReviewLike,
  addReviewComment,
  deleteReviewComment,
  toggleCommentLike,
  updateOwnReview,
  deleteOwnReview,
  addFavoriteCity,
  removeFavoriteCity,
}: Props) {
  const t = useT();
  const { tt, locale } = useTripT();
  const [avatarOpen, setAvatarOpen] = useState(false);

  const tabs: { key: ProfileTab; label: string; count: number }[] = [
    { key: "visited", label: t.tabVisited, count: visitedCities.length },
    { key: "wishlist", label: t.tabWishlist, count: wishlist.length },
    { key: "reviews", label: t.tabReviews, count: reviewCount },
    { key: "comments", label: t.tabComments, count: comments.length },
    { key: "liked", label: t.tabLiked, count: likedCount },
    { key: "trips", label: tt.tabTrips, count: tripCount },
  ];

  // Both review tabs render the same card with the same actions.
  const reviewList = (items: EngagedReview[]) => (
    <div className="space-y-4">
      {items.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          viewerId={viewerId}
          isAdmin={isAdmin}
          toggleReviewLike={toggleReviewLike}
          addReviewComment={addReviewComment}
          deleteReviewComment={deleteReviewComment}
          toggleCommentLike={toggleCommentLike}
          deleteReview={deleteReview}
          updateOwnReview={updateOwnReview}
          deleteOwnReview={deleteOwnReview}
        />
      ))}
    </div>
  );

  const stats = [
    { label: t.statCities, value: visitedCities.length },
    { label: t.statThisYear, value: citiesThisYear },
    { label: t.statFollowing, value: followingCount },
    { label: t.statFollowers, value: followerCount },
  ];

  // Another signed-in user's profile gets follow + block controls.
  const showSocialControls = viewerSignedIn && !isOwnProfile;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-6 pb-20">
      <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4 sm:gap-5">
          <GlassButton
            onClick={() => setAvatarOpen(true)}
            aria-label={t.viewPhoto}
            aria-haspopup="dialog"
            variant="ghost"
            size="icon"
            className="h-24 w-24 shrink-0 border-transparent p-0 hover:border-border-strong"
          >
            <UserAvatar avatar={avatar} seed={userId} size={96} />
          </GlassButton>

          <div className="min-w-0 space-y-3 pt-1">
            <h1 className="font-display text-2xl font-bold break-words text-on-backdrop sm:text-3xl">
              {username}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              {isOwnProfile ? (
                <GlassLink
                  href="/account"
                  size="sm"
                  className="tracking-wide uppercase"
                >
                  {t.editProfile}
                </GlassLink>
              ) : (
                showSocialControls && (
                  <FollowButton
                    userId={userId}
                    isFollowing={isFollowing}
                    toggleFollow={toggleFollow}
                  />
                )
              )}
              <ProfileMenu
                username={username}
                block={showSocialControls ? { userId, toggleBlock } : undefined}
              />
            </div>

            {bio && (
              <p className="max-w-prose text-sm leading-relaxed text-on-backdrop-muted">
                {bio}
              </p>
            )}
          </div>
        </div>

        <dl className="flex shrink-0 divide-x divide-ink-50/15 self-start rounded-card border border-ink-50/15">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center px-4 py-2.5 sm:px-6"
            >
              <dd className="font-display text-xl font-bold text-on-backdrop tabular-nums">
                {stat.value}
              </dd>
              <dt className="mt-0.5 text-[0.65rem] font-semibold tracking-widest text-on-backdrop-muted uppercase">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </header>

      {avatarOpen && (
        <AvatarModal
          avatar={avatar}
          seed={userId}
          label={username}
          isOwn={isOwnProfile}
          onClose={() => setAvatarOpen(false)}
        />
      )}

      <FavoriteCities
        favorites={favorites}
        isOwnProfile={isOwnProfile}
        maxSlots={maxFavorites}
        addFavoriteCity={addFavoriteCity}
        removeFavoriteCity={removeFavoriteCity}
      />

      <section>
        <div
          role="tablist"
          aria-label={t.profile}
          // Scrolls within itself on narrow screens rather than pushing the page wide.
          className="mb-6 flex gap-1 overflow-x-auto border-b border-ink-50/15 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map(({ key, label, count }) => (
            <Link
              key={key}
              href={`/u/${username}?tab=${key}`}
              role="tab"
              aria-selected={activeTab === key}
              scroll={false}
              className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                activeTab === key
                  ? "border-primary text-on-backdrop"
                  : "border-transparent text-on-backdrop-muted hover:text-on-backdrop"
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs tabular-nums opacity-70">
                {count}
              </span>
            </Link>
          ))}
        </div>

        {activeTab === "visited" &&
          (visitedCities.length === 0 ? (
            <EmptyState>{t.noCities}</EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {visitedCities.map((city) => (
                <CityCard
                  key={city.id}
                  slug={city.slug}
                  name={city.name}
                  country={city.country}
                />
              ))}
            </div>
          ))}

        {activeTab === "wishlist" &&
          (wishlist.length === 0 && !isOwnProfile ? (
            <EmptyState>{t.noWishlist}</EmptyState>
          ) : (
            <WishlistEditor
              cities={wishlist}
              isOwnProfile={isOwnProfile}
              toggleWishlist={toggleWishlist}
            />
          ))}

        {activeTab === "comments" &&
          (comments.length === 0 ? (
            <EmptyState>{t.noComments}</EmptyState>
          ) : (
            <ul className="space-y-3">
              {comments.map((comment) => (
                <li
                  key={comment.id}
                  className="glass rounded-card border border-border bg-surface p-4"
                >
                  <Link
                    href={`/c/${comment.city.slug}`}
                    className="font-display text-sm font-semibold text-text transition-colors hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    {comment.city.name}
                  </Link>
                  <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-text-muted">
                    {comment.content}
                  </p>
                  <p className="mt-2 flex items-center gap-3 text-xs text-text-subtle">
                    <span>
                      {new Date(comment.createdAt).toLocaleDateString(locale)}
                    </span>
                    {comment.likeCount > 0 && (
                      <span className="tabular-nums">
                        {comment.likeCount} {t.likesLabel}
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          ))}

        {activeTab === "reviews" &&
          (reviews.length === 0 ? (
            <EmptyState>{t.noReviewsProfile}</EmptyState>
          ) : (
            reviewList(reviews)
          ))}

        {activeTab === "trips" &&
          (trips.length === 0 ? (
            <EmptyState>
              {isOwnProfile ? tt.noTrips : tt.noPublicTrips}
            </EmptyState>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          ))}

        {activeTab === "liked" &&
          (likedReviews.length === 0 ? (
            <EmptyState>{t.noLikedReviews}</EmptyState>
          ) : (
            reviewList(likedReviews)
          ))}
      </section>
    </div>
  );
}
