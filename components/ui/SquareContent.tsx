"use client";

import Link from "next/link";
import Image from "next/image";
import { ImageOff, MapPin, MessageSquareText, Bookmark } from "lucide-react";
import { useT } from "@/hooks/useT";
import ReviewCard from "@/components/ui/ReviewCard";
import type { EngagedReview } from "@/types";
import type { TrendingCity } from "@/lib/trending";
import type { FormAction } from "@/lib/action-result";

type Props = {
  cities: TrendingCity[];
  reviews: EngagedReview[];
  viewerId: string | null;
  isAdmin: boolean;
  toggleReviewLike: FormAction;
  addReviewComment: FormAction;
  deleteReviewComment: FormAction;
  deleteReview: FormAction;
};

function CityTile({ city, rank }: { city: TrendingCity; rank: number }) {
  const t = useT();
  return (
    <Link
      href={`/c/${city.slug}`}
      className="group flex flex-col overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <div className="relative aspect-[4/3] bg-surface-raised">
        {city.imageUrl ? (
          <Image
            src={city.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 220px, 45vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-text-subtle">
            <ImageOff size={20} aria-hidden="true" />
          </span>
        )}
        <span className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink-950/75 font-display text-xs font-bold text-ink-50 tabular-nums">
          {rank}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="truncate font-semibold text-text">{city.name}</p>
        <p className="text-xs text-text-subtle">{city.country}</p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <MessageSquareText size={12} aria-hidden="true" />
            <span className="tabular-nums">{city.reviewCount}</span>
            <span className="sr-only">{t.reviews}</span>
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={12} aria-hidden="true" />
            <span className="tabular-nums">{city.visitCount}</span>
            <span className="sr-only">{t.tabVisited}</span>
          </span>
          <span className="flex items-center gap-1">
            <Bookmark size={12} aria-hidden="true" />
            <span className="tabular-nums">{city.wishlistCount}</span>
            <span className="sr-only">{t.tabWishlist}</span>
          </span>
        </p>
      </div>
    </Link>
  );
}

export default function SquareContent({
  cities,
  reviews,
  viewerId,
  isAdmin,
  toggleReviewLike,
  addReviewComment,
  deleteReviewComment,
  deleteReview,
}: Props) {
  const t = useT();

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-6 pb-20">
      <header>
        <h1 className="font-display text-display font-bold text-text">
          {t.squareTitle}
        </h1>
        <p className="mt-1 text-text-muted">{t.squareDesc}</p>
      </header>

      <section>
        <h2 className="mb-4 font-display text-lg font-bold text-text">
          {t.trendingCities}
        </h2>
        {cities.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-strong px-4 py-10 text-center text-sm text-text-subtle">
            {t.noTrendingCities}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {cities.map((city, index) => (
              <CityTile key={city.id} city={city} rank={index + 1} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg font-bold text-text">
          {t.trendingReviews}
        </h2>
        {reviews.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-strong px-4 py-10 text-center text-sm text-text-subtle">
            {t.noTrendingReviews}
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                viewerId={viewerId}
                isAdmin={isAdmin}
                toggleReviewLike={toggleReviewLike}
                addReviewComment={addReviewComment}
                deleteReviewComment={deleteReviewComment}
                deleteReview={deleteReview}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
