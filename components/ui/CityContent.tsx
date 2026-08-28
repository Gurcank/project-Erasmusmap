"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useT } from "@/hooks/useT";
import CityActions from "@/components/ui/CityActions";
import StarInput from "@/components/ui/StarInput";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import ReviewCard from "@/components/ui/ReviewCard";
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
  submitReview: FormAction;
  isAdmin: boolean;
  viewerId: string | null;
  deleteReview: FormAction;
  toggleReviewLike: FormAction;
  addReviewComment: FormAction;
  deleteReviewComment: FormAction;
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
  submitReview,
  isAdmin,
  viewerId,
  deleteReview,
  toggleReviewLike,
  addReviewComment,
  deleteReviewComment,
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
    <div className="mx-auto max-w-7xl px-6 py-16 md:px-8">
      <div className="mb-16 grid items-start gap-10 md:grid-cols-2 lg:gap-16">
        <div>
          <h1 className="mb-5 font-display text-display font-bold text-text lg:text-hero">
            {cityName}
          </h1>
          <div className="mb-6">
            <CityActions
              cityId={cityId}
              isVisited={isVisited}
              isWishlisted={isWishlisted}
              startDate={visitStartDate}
              endDate={visitEndDate}
              toggleVisit={toggleVisit}
              toggleWishlist={toggleWishlist}
              saveVisitDates={saveVisitDates}
            />
          </div>
          <div className="relative h-[320px] w-full overflow-hidden rounded-panel border border-border md:h-[400px]">
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
        </div>

        <div className="space-y-5 rounded-panel border border-border bg-surface p-6 md:p-8">
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
          <div className="flex items-baseline gap-3 border-t border-border pt-5">
            <span className="font-display text-4xl font-bold text-text tabular-nums">
              {reviewCount > 0 ? avgScore.toFixed(1) : "—"}
            </span>
            <span className="text-sm text-text-subtle">
              {reviewCount} {t.reviews}
            </span>
          </div>
        </div>
      </div>

      <ActionForm
        action={submitReview}
        className="mx-auto max-w-4xl space-y-6 rounded-panel border border-border bg-surface p-6 md:p-8"
        errorClassName="text-center text-sm text-danger-700 dark:text-danger-400"
      >
        <h2 className="text-center font-display text-xl font-semibold text-text">
          {t.rateCity}
        </h2>
        <p className="text-center text-xs text-text-subtle">{t.ratingHint}</p>
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
          className="w-full resize-none rounded-card border border-border-strong bg-surface-raised px-4 py-3 text-text transition-colors placeholder:text-text-subtle focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
        />
        <div className="flex justify-center">
          <SubmitButton
            pendingText={t.submittingReview}
            className="rounded-control bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {t.submitReview}
          </SubmitButton>
        </div>
      </ActionForm>

      <section className="mt-16">
        <h2 className="mb-8 font-display text-2xl font-bold text-text">
          {t.allReviews}
        </h2>

        {reviews.length === 0 ? (
          <p className="rounded-panel border border-dashed border-border-strong px-6 py-12 text-center text-text-subtle">
            {t.noReviews}
          </p>
        ) : (
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
                deleteReview={deleteReview}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
