"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  Copy,
  MoreHorizontal,
  Star,
  Trash2,
  UserMinus,
} from "lucide-react";
import { useT } from "@/hooks/useT";
import { formatStayRange } from "@/lib/format";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import UserAvatar from "@/components/ui/UserAvatar";
import AvatarModal from "@/components/ui/AvatarModal";
import FavoriteCities from "@/components/ui/FavoriteCities";
import type { FavoriteCity } from "@/components/ui/FavoriteCities";
import type { CitySuggestion, ProfileReview } from "@/types";
import { averageRating } from "@/lib/review";
import type { FormAction } from "@/lib/action-result";

export type ProfileTab = "visited" | "wishlist" | "reviews";

export type VisitedCity = CitySuggestion & {
  startDate: Date | null;
  endDate: Date | null;
};

type Props = {
  userId: string;
  username: string;
  image: string | null;
  bio: string | null;
  isOwnProfile: boolean;
  isAdmin: boolean;
  viewerSignedIn: boolean;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  toggleFollow: FormAction;
  toggleBlock: FormAction;
  activeTab: ProfileTab;
  favorites: FavoriteCity[];
  maxFavorites: number;
  visitedCities: VisitedCity[];
  wishlist: CitySuggestion[];
  reviews: ProfileReview[];
  deleteReview: FormAction;
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
        className={`rounded-control px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
          isFollowing
            ? "border border-border-strong text-text hover:border-danger-600 hover:text-danger-700 dark:hover:text-danger-400"
            : "bg-primary text-on-primary hover:bg-primary-hover"
        }`}
      >
        {isFollowing ? t.followingState : t.follow}
      </SubmitButton>
      {state && !state.ok && (
        <span
          role="alert"
          className="text-xs text-danger-700 dark:text-danger-400"
        >
          {state.error}
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
  const [blockState, blockAction] = useActionState(
    block?.toggleBlock ?? (async () => ({ ok: true as const })),
    null,
  );

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
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.profileMenu}
        className="flex h-8 w-8 items-center justify-center rounded-control border border-border-strong text-text-muted transition-colors hover:bg-surface-raised hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-20 mt-1 min-w-[12rem] rounded-control border border-border bg-surface p-1 shadow-popover"
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
            <form
              action={blockAction}
              onSubmit={(event) => {
                if (!window.confirm(t.confirmBlock)) event.preventDefault();
              }}
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
              {blockState && !blockState.ok && (
                <p className="px-3 py-1 text-xs text-danger-700 dark:text-danger-400">
                  {blockState.error}
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function CityLink({
  slug,
  name,
  country,
  meta,
}: {
  slug: string;
  name: string;
  country: string;
  meta?: string;
}) {
  return (
    <Link
      href={`/c/${slug}`}
      className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-text">
          {name}
        </span>
        <span className="text-xs text-text-subtle">{country}</span>
      </span>
      {meta && (
        <span className="shrink-0 text-xs text-text-muted tabular-nums">
          {meta}
        </span>
      )}
    </Link>
  );
}

export default function ProfileContent({
  userId,
  username,
  image,
  bio,
  isOwnProfile,
  isAdmin,
  viewerSignedIn,
  isFollowing,
  followerCount,
  followingCount,
  toggleFollow,
  toggleBlock,
  activeTab,
  favorites,
  maxFavorites,
  visitedCities,
  wishlist,
  reviews,
  deleteReview,
  addFavoriteCity,
  removeFavoriteCity,
}: Props) {
  const t = useT();
  const [avatarOpen, setAvatarOpen] = useState(false);

  const tabs: { key: ProfileTab; label: string; count: number }[] = [
    { key: "visited", label: t.tabVisited, count: visitedCities.length },
    { key: "wishlist", label: t.tabWishlist, count: wishlist.length },
    { key: "reviews", label: t.tabReviews, count: reviews.length },
  ];

  const currentYear = new Date().getUTCFullYear();
  const citiesThisYear = visitedCities.filter(
    (city) =>
      city.startDate &&
      new Date(city.startDate).getUTCFullYear() === currentYear,
  ).length;

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
          <button
            type="button"
            onClick={() => setAvatarOpen(true)}
            aria-label={t.viewPhoto}
            aria-haspopup="dialog"
            className="shrink-0 cursor-pointer rounded-full transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <UserAvatar src={image} label={username} size={96} />
          </button>

          <div className="min-w-0 space-y-3 pt-1">
            <h1 className="font-display text-2xl font-bold break-words text-text sm:text-3xl">
              {username}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              {isOwnProfile ? (
                <Link
                  href="/account"
                  className="rounded-control border border-border-strong px-3 py-1.5 text-xs font-semibold tracking-wide text-text uppercase transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {t.editProfile}
                </Link>
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

            {bio ? (
              <p className="max-w-prose text-sm leading-relaxed text-text-muted">
                {bio}
              </p>
            ) : (
              isOwnProfile && (
                <Link
                  href="/account"
                  className="inline-block text-sm text-accent-text transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {t.noBioClick}
                </Link>
              )
            )}
          </div>
        </div>

        <dl className="flex shrink-0 divide-x divide-border self-start rounded-card border border-border">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center px-4 py-2.5 sm:px-6"
            >
              <dd className="font-display text-xl font-bold text-text tabular-nums">
                {stat.value}
              </dd>
              <dt className="mt-0.5 text-[0.65rem] font-semibold tracking-widest text-text-subtle uppercase">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </header>

      {avatarOpen && (
        <AvatarModal
          image={image}
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
          className="mb-6 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  ? "border-primary text-text"
                  : "border-transparent text-text-subtle hover:text-text"
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visitedCities.map((city) => (
                <CityLink
                  key={city.id}
                  slug={city.slug}
                  name={city.name}
                  country={city.country}
                />
              ))}
            </div>
          ))}

        {activeTab === "wishlist" &&
          (wishlist.length === 0 ? (
            <EmptyState>{t.noWishlist}</EmptyState>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {wishlist.map((city) => (
                <CityLink
                  key={city.id}
                  slug={city.slug}
                  name={city.name}
                  country={city.country}
                />
              ))}
            </div>
          ))}

        {activeTab === "reviews" &&
          (reviews.length === 0 ? (
            <EmptyState>{t.noReviewsProfile}</EmptyState>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-card border border-border bg-surface p-5 transition-colors hover:border-border-strong"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/c/${review.city.slug}`}
                        className="font-display font-semibold text-text transition-colors hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        {review.city.name}
                      </Link>
                      <p className="text-xs text-text-subtle">
                        {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="flex items-center gap-1.5 font-semibold text-text">
                        <Star
                          size={14}
                          aria-hidden="true"
                          className="fill-star text-star"
                        />
                        {averageRating(review).toFixed(1)}
                      </span>
                      {isAdmin && (
                        <ActionForm
                          action={deleteReview}
                          confirmMessage={t.confirmDeleteReview}
                        >
                          <input
                            type="hidden"
                            name="reviewId"
                            value={review.id}
                          />
                          <SubmitButton
                            title={t.adminDeleteReview}
                            aria-label={t.adminDeleteReview}
                            className="rounded-control p-1.5 text-text-subtle transition-colors hover:bg-surface-raised hover:text-danger-700 disabled:opacity-50 dark:hover:text-danger-400"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </SubmitButton>
                        </ActionForm>
                      )}
                    </div>
                  </div>
                  {formatStayRange(review.stayStart, review.stayEnd) && (
                    <p
                      aria-label={t.stayAriaLabel}
                      className="mb-2 flex items-center gap-1.5 text-xs text-text-subtle"
                    >
                      <CalendarDays size={13} aria-hidden="true" />
                      <span className="tabular-nums">
                        {formatStayRange(review.stayStart, review.stayEnd)}
                      </span>
                    </p>
                  )}
                  {review.content && (
                    <p className="leading-relaxed text-text-muted">
                      {review.content}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ))}
      </section>
    </div>
  );
}
