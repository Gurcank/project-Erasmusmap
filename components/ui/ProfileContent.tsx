"use client";

import Link from "next/link";
import { MapPin, MessageSquareText, Star, Trash2 } from "lucide-react";
import { useT } from "@/hooks/useT";
import BioEditor from "@/components/ui/BioEditor";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import UserAvatar from "@/components/ui/UserAvatar";
import AvatarUploader from "@/components/ui/AvatarUploader";
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
  username: string;
  image: string | null;
  bio: string | null;
  isOwnProfile: boolean;
  isAdmin: boolean;
  activeTab: ProfileTab;
  favorites: FavoriteCity[];
  maxFavorites: number;
  visitedCities: VisitedCity[];
  wishlist: CitySuggestion[];
  reviews: ProfileReview[];
  updateBio: FormAction;
  deleteReview: FormAction;
  addFavoriteCity: FormAction;
  removeFavoriteCity: FormAction;
};

/** Whole months between two dates, rounded up, minimum one. */
function stayLengthInMonths(
  start: Date | null,
  end: Date | null,
): number | null {
  if (!start || !end) return null;
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());
  return months > 0 ? months : 1;
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("tr-TR", { month: "short", year: "numeric" });
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-dashed border-border-strong px-4 py-10 text-center text-sm text-text-subtle">
      {children}
    </p>
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
  username,
  image,
  bio,
  isOwnProfile,
  isAdmin,
  activeTab,
  favorites,
  maxFavorites,
  visitedCities,
  wishlist,
  reviews,
  updateBio,
  deleteReview,
  addFavoriteCity,
  removeFavoriteCity,
}: Props) {
  const t = useT();

  const tabs: { key: ProfileTab; label: string; count: number }[] = [
    { key: "visited", label: t.tabVisited, count: visitedCities.length },
    { key: "wishlist", label: t.tabWishlist, count: wishlist.length },
    { key: "reviews", label: t.tabReviews, count: reviews.length },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-6 pb-20">
      <header className="flex flex-col gap-6 rounded-panel border border-border bg-surface p-6 sm:flex-row sm:items-start md:p-8">
        <div className="shrink-0">
          {isOwnProfile ? (
            <div className="space-y-2">
              <AvatarUploader image={image} fallbackLabel={username} />
              <p className="text-xs text-text-subtle">{t.profilePhotoHint}</p>
            </div>
          ) : (
            <UserAvatar src={image} label={username} size={80} />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">
              {username}
            </h1>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} aria-hidden="true" />
                {visitedCities.length} {t.visitedCities.toLowerCase()}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquareText size={14} aria-hidden="true" />
                {reviews.length} {t.tabReviews.toLowerCase()}
              </span>
            </p>
          </div>

          {isOwnProfile ? (
            <BioEditor initialBio={bio ?? ""} updateBio={updateBio} />
          ) : (
            bio && (
              <p className="max-w-prose text-sm leading-relaxed text-text-muted">
                {bio}
              </p>
            )
          )}
        </div>
      </header>

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
              {visitedCities.map((city) => {
                const months = stayLengthInMonths(city.startDate, city.endDate);
                const meta = months
                  ? `${months} ${t.monthShort}`
                  : city.startDate
                    ? formatMonth(city.startDate)
                    : undefined;
                return (
                  <CityLink
                    key={city.id}
                    slug={city.slug}
                    name={city.name}
                    country={city.country}
                    meta={meta}
                  />
                );
              })}
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
                          className="fill-accent-500 text-accent-500"
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
                  <p className="leading-relaxed text-text-muted">
                    {review.content}
                  </p>
                </article>
              ))}
            </div>
          ))}
      </section>
    </div>
  );
}
