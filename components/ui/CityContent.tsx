"use client";

import Link from "next/link";
import Image from "next/image";
import { ImageOff, Star, Trash2 } from "lucide-react";
import { useT } from "@/hooks/useT";
import VisitButton from "@/components/ui/VisitButton";
import StarInput from "@/components/ui/StarInput";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import UserAvatar from "@/components/ui/UserAvatar";
import Rating from "@/components/ui/Rating";
import type { CityReview, CategoryRatings } from "@/types";
import { averageRating } from "@/lib/review";
import type { FormAction } from "@/lib/action-result";

type Props = {
  cityId: string;
  cityName: string;
  cityImage: string | null;
  isVisited: boolean;
  reviewCount: number;
  avgScore: number;
  categoryRatings: CategoryRatings;
  reviews: CityReview[];
  submitReview: FormAction;
  isAdmin: boolean;
  deleteReview: FormAction;
};

export default function CityContent({
  cityId,
  cityName,
  cityImage,
  isVisited,
  reviewCount,
  avgScore,
  categoryRatings,
  reviews,
  submitReview,
  isAdmin,
  deleteReview,
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
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 md:px-8">
      <div className="mb-16 grid items-start gap-10 md:grid-cols-2 lg:gap-16">
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-display text-display font-bold text-text lg:text-hero">
              {cityName}
            </h1>
            <VisitButton cityId={cityId} initialVisited={isVisited} />
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
          {ratingRows.map(({ key, label, value }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-text-muted">{label}</span>
              <Rating
                value={value}
                label={`${label}: 5 üzerinden ${value.toFixed(1)}`}
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
            {reviews.map((review) => {
              const author = review.user?.username ?? review.user?.name ?? "—";
              return (
                <article
                  key={review.id}
                  className="rounded-panel border border-border bg-surface p-6 transition-colors hover:border-border-strong md:p-8"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <Link
                      href={
                        review.user?.username
                          ? `/u/${review.user.username}`
                          : "#"
                      }
                      onClick={(event) => {
                        if (!review.user?.username) event.preventDefault();
                      }}
                      className="group flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      <UserAvatar
                        src={review.user?.image ?? null}
                        label={author}
                        size={44}
                      />
                      <div>
                        <p className="font-semibold text-text transition-colors group-hover:text-accent-text">
                          {author}
                        </p>
                        <p className="text-xs text-text-subtle">
                          {new Date(review.createdAt).toLocaleDateString(
                            "tr-TR",
                          )}
                        </p>
                      </div>
                    </Link>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="flex items-center gap-1.5 font-semibold text-text">
                        <Star
                          size={15}
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
                            <Trash2 size={15} aria-hidden="true" />
                          </SubmitButton>
                        </ActionForm>
                      )}
                    </div>
                  </div>

                  <p className="max-w-prose leading-relaxed text-text-muted">
                    {review.content}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {[
                      { label: t.cost, value: review.costOfLiving },
                      { label: t.safety, value: review.safety },
                      { label: t.social, value: review.socialLife },
                      { label: t.culture, value: review.culture },
                      { label: t.gastronomy, value: review.gastronomy },
                      { label: t.transport, value: review.transport },
                    ].map(({ label, value }) => (
                      <span
                        key={label}
                        className="flex items-center gap-1.5 rounded-control bg-surface-raised px-2.5 py-1 text-xs text-text-muted"
                      >
                        {label}
                        <Rating
                          value={value}
                          label={`${label}: 5 üzerinden ${value}`}
                          size={11}
                        />
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
