"use client";

import Link from "next/link";
import { MapPin, MessageSquareText, Star, Trash2 } from "lucide-react";
import { useT } from "@/hooks/useT";
import BioEditor from "@/components/ui/BioEditor";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import UserAvatar from "@/components/ui/UserAvatar";
import type { CitySuggestion, ProfileReview } from "@/types";
import { averageRating } from "@/lib/review";
import type { FormAction } from "@/lib/action-result";

type Props = {
  username: string;
  image: string | null;
  bio: string | null;
  cityCount: number;
  reviewCount: number;
  visitedCities: CitySuggestion[];
  reviews: ProfileReview[];
  isOwnProfile: boolean;
  updateBio: FormAction;
  isAdmin: boolean;
  deleteReview: FormAction;
};

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-card bg-surface-raised p-4 text-center">
      <span className="mb-1 flex items-center justify-center gap-1.5 text-text-subtle">
        {icon}
      </span>
      <p className="font-display text-2xl font-bold text-text tabular-nums">
        {value}
      </p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}

export default function ProfileContent({
  username,
  image,
  bio,
  cityCount,
  reviewCount,
  visitedCities,
  reviews,
  isOwnProfile,
  updateBio,
  isAdmin,
  deleteReview,
}: Props) {
  const t = useT();

  return (
    <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-6 pb-20 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-8 rounded-panel border border-border bg-surface p-8 lg:w-80">
        <div className="text-center">
          <UserAvatar
            src={image}
            label={username}
            size={96}
            className="mx-auto mb-4"
          />
          <h1 className="font-display text-xl font-bold text-text">
            {username}
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <StatCard
            icon={<MapPin size={14} aria-hidden="true" />}
            value={cityCount}
            label={t.visitedCities}
          />
          <StatCard
            icon={<MessageSquareText size={14} aria-hidden="true" />}
            value={reviewCount}
            label={t.madeReviews}
          />
        </div>

        {isOwnProfile ? (
          <BioEditor initialBio={bio ?? ""} updateBio={updateBio} />
        ) : (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold tracking-widest text-text-subtle uppercase">
              Bio
            </h2>
            <p className="rounded-card bg-surface-raised p-4 text-sm leading-relaxed text-text-muted">
              {bio || (
                <span className="text-text-subtle italic">{t.noBio}</span>
              )}
            </p>
          </div>
        )}
      </aside>

      <div className="flex-1 space-y-8">
        <section className="rounded-panel border border-border bg-surface p-6 md:p-8">
          <h2 className="mb-5 font-display text-lg font-bold text-text">
            {t.visitedCities}
          </h2>
          {visitedCities.length === 0 ? (
            <p className="rounded-card border border-dashed border-border-strong px-4 py-8 text-center text-sm text-text-subtle">
              {t.noCities}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visitedCities.map((city) => (
                <Link
                  key={city.id}
                  href={`/c/${city.slug}`}
                  className="flex items-center gap-2 rounded-card border border-border bg-surface-raised p-4 text-sm font-medium text-text transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <MapPin
                    size={14}
                    aria-hidden="true"
                    className="shrink-0 text-text-subtle"
                  />
                  <span className="truncate">{city.name}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-panel border border-border bg-surface p-6 md:p-8">
          <h2 className="mb-5 font-display text-lg font-bold text-text">
            {t.madeReviews}
          </h2>
          {reviews.length === 0 ? (
            <p className="rounded-card border border-dashed border-border-strong px-4 py-8 text-center text-sm text-text-subtle">
              {t.noReviewsProfile}
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-card border border-border bg-surface-raised p-5 transition-colors hover:border-border-strong"
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
                            className="rounded-control p-1.5 text-text-subtle transition-colors hover:bg-surface hover:text-danger-700 disabled:opacity-50 dark:hover:text-danger-400"
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
          )}
        </section>
      </div>
    </div>
  );
}
