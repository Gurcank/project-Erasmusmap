"use client";

import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { useT } from "@/hooks/useT";
import CityActions from "@/components/ui/CityActions";
import StarInput from "@/components/ui/StarInput";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import ReviewCard from "@/components/ui/ReviewCard";
import VisitDates from "@/components/ui/VisitDates";
import Rating from "@/components/ui/Rating";
import type { EngagedReview, CategoryRatings } from "@/types";
import { toStars } from "@/lib/review";
import type { FormAction } from "@/lib/action-result";

type Props = {
  cityId: string;
  cityName: string;
  cityImage: string | null;
  isVisited: boolean;
  isWishlisted: boolean;
  visitStartDate: Date | null;
  visitEndDate: Date | null;
  toggleVisit: FormAction;
  toggleWishlist: FormAction;
  saveVisitDates: FormAction;
  reviewCount: number;
  avgScore: number;
  categoryRatings: CategoryRatings;
  reviews: EngagedReview[];
  moreReviewsHref: string | null;
  submitReview: FormAction;
  isAdmin: boolean;
  viewerId: string | null;
  deleteReview: FormAction;
  toggleReviewLike: FormAction;
  addReviewComment: FormAction;
  deleteReviewComment: FormAction;
  toggleCommentLike: FormAction;
  updateOwnReview: FormAction;
  deleteOwnReview: FormAction;
};

export default function CityContent({
  cityId,
  cityName,
  cityImage,
  isVisited,
  isWishlisted,
  visitStartDate,
  visitEndDate,
  toggleVisit,
  toggleWishlist,
  saveVisitDates,
  reviewCount,
  avgScore,
  categoryRatings,
  reviews,
  moreReviewsHref,
  submitReview,
  isAdmin,
  viewerId,
  deleteReview,
  toggleReviewLike,
  addReviewComment,
  deleteReviewComment,
  toggleCommentLike,
  updateOwnReview,
  deleteOwnReview,
}: Props) {
  const t = useT();

  const ratingRows = [
    { key: "costOfLiving", label: t.cost, value: categoryRatings.costOfLiving },
    { key: "safety", label: t.safety, value: categoryRatings.safety },
    { key: "socialLife", label: t.social, value: categoryRatings.socialLife },
    { key: "culture", label: t.culture, value: categoryRatings.culture },
    {
      key: "gastronomy",
      label: t.gastronomy,
      value: categoryRatings.gastronomy,
    },
    { key: "transport", label: t.transport, value: categoryRatings.transport },
  ].map((row) => ({ ...row, stars: toStars(row.value) }));

  return (
    <div className="mx-auto max-w-7xl px-6 pt-24 pb-16 md:px-8">
      {/* City name and the visited / wishlist actions share the top row; the
          actions stay above the ratings, never beside the photo. */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <h1 className="font-display text-display font-bold text-on-backdrop lg:text-hero">
          {cityName}
        </h1>
        <CityActions
          cityId={cityId}
          isVisited={isVisited}
          isWishlisted={isWishlisted}
          toggleVisit={toggleVisit}
          toggleWishlist={toggleWishlist}
        />
      </div>

      {/* Photo and ratings are one row of equal-height panels. */}
      <div className="mb-16 grid gap-10 md:grid-cols-2 lg:gap-16">
        <div className="relative min-h-[22rem] w-full overflow-hidden rounded-panel border border-border">
          {cityImage ? (
            <Image
              src={cityImage}
              alt={cityName}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-raised text-text-subtle">
              <ImageOff size={22} aria-hidden="true" />
              <span className="text-sm">
                {cityName} {t.noPhoto}
              </span>
            </div>
          )}
        </div>

        <div className="flex min-h-[22rem] flex-col gap-5 rounded-panel glass border border-border bg-surface p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold text-text">
            {t.cityRatings}
          </h2>
          {ratingRows.map(({ key, label, stars }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-text-muted">{label}</span>
              <Rating
                value={stars}
                label={`${label}: 5 üzerinden ${stars.toFixed(1)}`}
                size={17}
              />
            </div>
          ))}
          <div className="mt-auto flex items-baseline gap-3 border-t border-border pt-5">
            <span className="font-display text-4xl font-bold text-text tabular-nums">
              {reviewCount > 0 ? avgScore.toFixed(1) : "—"}
            </span>
            <span className="text-sm text-text-subtle">
              {reviewCount} {t.reviews}
            </span>
          </div>
        </div>
      </div>

      {/* The review form and the stay dates are one row from lg up and stack
          below it. Both are always there: recording when you were somewhere is
          not gated on having pressed "I went", and the panel matching the
          form's height is what makes the row read as one block. */}
      <div className="mx-auto grid max-w-6xl items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ActionForm
          action={submitReview}
          className="glass flex flex-col gap-6 rounded-panel border border-border bg-surface p-6 md:p-8"
          errorClassName="text-center text-sm text-danger-700 dark:text-danger-400"
        >
          <h2 className="text-center font-display text-xl font-semibold text-text">
            {t.rateCity}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <StarInput label={t.cost} name="costOfLiving" />
            <StarInput label={t.safety} name="safety" />
            <StarInput label={t.social} name="socialLife" />
            <StarInput label={t.culture} name="culture" />
            <StarInput label={t.gastronomy} name="gastronomy" />
            <StarInput label={t.transport} name="transport" />
          </div>
          <textarea
            name="content"
            aria-label={t.writeReview}
            placeholder={t.writeReview}
            rows={4}
            className="field min-h-32 w-full flex-1 resize-none rounded-card px-4 py-3"
          />
          <div className="flex justify-center">
            <SubmitButton pendingText={t.submittingReview} variant="primary">
              {t.submitReview}
            </SubmitButton>
          </div>
        </ActionForm>

        <VisitDates
          cityId={cityId}
          startDate={visitStartDate}
          endDate={visitEndDate}
          saveVisitDates={saveVisitDates}
        />
      </div>

      <section className="mt-16">
        <h2 className="mb-8 font-display text-2xl font-bold text-on-backdrop">
          {t.allReviews}
        </h2>

        {reviews.length === 0 ? (
          <p className="rounded-panel border border-dashed border-ink-50/25 px-6 py-12 text-center text-on-backdrop-muted">
            {t.noReviews}
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-5">
              {reviews.map((review) => (
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
            {moreReviewsHref && (
              <div className="mt-6 text-center">
                <Link
                  href={moreReviewsHref}
                  scroll={false}
                  className="inline-block rounded-full border border-ink-50/25 px-5 py-2 text-sm font-medium text-on-backdrop transition hover:bg-ink-50/10"
                >
                  {t.showMoreReviews}
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
