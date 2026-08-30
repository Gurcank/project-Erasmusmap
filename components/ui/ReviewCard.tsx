"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Heart,
  MessageCircle,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { useT } from "@/hooks/useT";
import UserAvatar from "@/components/ui/UserAvatar";
import Rating from "@/components/ui/Rating";
import StarInput from "@/components/ui/StarInput";
import StayDateFields from "@/components/ui/StayDateFields";
import CommentThread from "@/components/ui/CommentThread";
import SubmitButton from "@/components/ui/SubmitButton";
import GlassButton from "@/components/ui/GlassButton";
import ActionForm from "@/components/ui/ActionForm";
import { formatStayRange } from "@/lib/format";
import { averageRating, MAX_REVIEW_LENGTH, toStars } from "@/lib/review";
import type { EngagedReview } from "@/types";
import type { ActionResult, FormAction } from "@/lib/action-result";

type Props = {
  review: EngagedReview;
  /** Null when signed out — likes and replies are then read-only. */
  viewerId: string | null;
  isAdmin: boolean;
  toggleReviewLike: FormAction;
  addReviewComment: FormAction;
  deleteReviewComment: FormAction;
  toggleCommentLike: FormAction;
  deleteReview: FormAction;
  /** Author-only: edit and delete their own review. */
  updateOwnReview: FormAction;
  deleteOwnReview: FormAction;
};

function ActionError({ state }: { state: ActionResult | null }) {
  if (!state || state.ok) return null;
  return (
    <p
      role="alert"
      className="mt-1 text-xs text-danger-700 dark:text-danger-400"
    >
      {state.error}
    </p>
  );
}

export default function ReviewCard({
  review,
  viewerId,
  isAdmin,
  toggleReviewLike,
  addReviewComment,
  deleteReviewComment,
  toggleCommentLike,
  deleteReview,
  updateOwnReview,
  deleteOwnReview,
}: Props) {
  const t = useT();
  const [likeState, likeAction] = useActionState(toggleReviewLike, null);
  const [editState, editAction] = useActionState(updateOwnReview, null);
  const [showReplies, setShowReplies] = useState(false);
  const [editing, setEditing] = useState(false);

  // A saved edit revalidates the page; collapse the form once it lands.
  useEffect(() => {
    if (editState?.ok) setEditing(false);
  }, [editState]);

  const author = review.user?.username ?? review.user?.name ?? "—";
  const isSignedIn = viewerId !== null;
  const isOwner = isSignedIn && review.user?.id === viewerId;
  const commentCount = review.comments.reduce(
    (sum, comment) => sum + 1 + comment.replies.length,
    0,
  );
  const stayRange = formatStayRange(review.stayStart, review.stayEnd);
  const avg = averageRating(review);

  const editFields = [
    { label: t.cost, name: "costOfLiving", value: review.costOfLiving },
    { label: t.safety, name: "safety", value: review.safety },
    { label: t.social, name: "socialLife", value: review.socialLife },
    { label: t.culture, name: "culture", value: review.culture },
    { label: t.gastronomy, name: "gastronomy", value: review.gastronomy },
    { label: t.transport, name: "transport", value: review.transport },
  ];
  const ratedCategories = editFields.filter(
    (category): category is { label: string; name: string; value: number } =>
      category.value !== null,
  );

  return (
    <article className="rounded-panel glass border border-border bg-surface p-6 transition-colors hover:border-border-strong">
      <div className="mb-4 flex items-start justify-between gap-4">
        <Link
          href={review.user?.username ? `/u/${review.user.username}` : "#"}
          onClick={(event) => {
            if (!review.user?.username) event.preventDefault();
          }}
          className="group flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <UserAvatar
            src={review.user?.image ?? null}
            label={author}
            size={36}
          />
          <div>
            <p className="text-sm font-semibold text-text transition-colors group-hover:text-accent-text">
              {author}
            </p>
            <p className="text-xs text-text-subtle">
              {new Date(review.createdAt).toLocaleDateString("tr-TR")}
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          {avg !== null && (
            <span className="flex items-center gap-1.5 rounded-full bg-surface-raised/70 px-2.5 py-1 font-display text-lg font-semibold text-text tabular-nums">
              <Star
                size={17}
                aria-hidden="true"
                className="fill-star text-star"
              />
              {avg.toFixed(1)}
            </span>
          )}
          {isOwner && !editing && (
            <GlassButton
              onClick={() => setEditing(true)}
              title={t.editReview}
              aria-label={t.editReview}
              variant="ghost"
              size="iconSm"
            >
              <Pencil size={15} aria-hidden="true" />
            </GlassButton>
          )}
          {(isAdmin || (isOwner && !editing)) && (
            <ActionForm
              action={isAdmin ? deleteReview : deleteOwnReview}
              confirmMessage={t.confirmDeleteReview}
              confirmLabel={t.adminDeleteReview}
            >
              <input type="hidden" name="reviewId" value={review.id} />
              <SubmitButton
                title={t.adminDeleteReview}
                aria-label={t.adminDeleteReview}
                variant="ghost"
                size="iconSm"
                className="hover:text-danger-700 dark:hover:text-danger-400"
              >
                <Trash2 size={15} aria-hidden="true" />
              </SubmitButton>
            </ActionForm>
          )}
        </div>
      </div>

      {review.city && (
        <Link
          href={`/c/${review.city.slug}`}
          className="mb-2 inline-block font-display text-lg font-bold text-text transition-colors hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {review.city.name}
        </Link>
      )}

      {stayRange && (
        <p
          aria-label={t.stayAriaLabel}
          className="mb-3 flex items-center gap-1.5 text-xs text-text-subtle"
        >
          <CalendarDays size={13} aria-hidden="true" />
          <span className="tabular-nums">{stayRange}</span>
        </p>
      )}

      {editing ? (
        <form action={editAction} className="mt-4 space-y-4">
          <input type="hidden" name="reviewId" value={review.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            {editFields.map(({ label, name, value }) => (
              <StarInput
                key={name}
                label={label}
                name={name}
                defaultStars={value === null ? 0 : toStars(value)}
              />
            ))}
          </div>
          <textarea
            name="content"
            defaultValue={review.content}
            rows={4}
            maxLength={MAX_REVIEW_LENGTH}
            aria-label={t.writeReview}
            placeholder={t.writeReview}
            className="field w-full resize-none rounded-card px-4 py-3 text-sm"
          />
          <StayDateFields start={review.stayStart} end={review.stayEnd} />
          <div className="flex items-center gap-2">
            <SubmitButton pendingText={t.submittingReview} variant="primary">
              {t.saveReview}
            </SubmitButton>
            <GlassButton onClick={() => setEditing(false)} variant="ghost">
              {t.cancel}
            </GlassButton>
          </div>
          <ActionError state={editState} />
        </form>
      ) : (
        <>
          {review.content && (
            <p className="max-w-prose leading-relaxed whitespace-pre-line text-text-muted">
              {review.content}
            </p>
          )}

          {ratedCategories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {ratedCategories.map(({ label, value }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 rounded-control bg-surface-raised px-2.5 py-1 text-xs text-text-muted"
                >
                  {label}
                  <Rating
                    value={toStars(value)}
                    label={`${label}: 5 üzerinden ${toStars(value)}`}
                    size={11}
                  />
                </span>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <form action={likeAction}>
          <input type="hidden" name="reviewId" value={review.id} />
          <SubmitButton
            disabled={!isSignedIn}
            aria-pressed={review.likedByViewer}
            aria-label={review.likedByViewer ? t.liked : t.like}
            title={isSignedIn ? undefined : t.loginToInteract}
            variant="ghost"
            size="sm"
            className={
              review.likedByViewer
                ? "text-danger-700 dark:text-danger-400"
                : undefined
            }
          >
            <Heart
              size={15}
              aria-hidden="true"
              className={review.likedByViewer ? "fill-current" : undefined}
            />
            <span className="tabular-nums">{review.likeCount}</span>
          </SubmitButton>
        </form>

        <GlassButton
          onClick={() => setShowReplies((open) => !open)}
          aria-expanded={showReplies}
          variant="ghost"
          size="sm"
        >
          <MessageCircle size={15} aria-hidden="true" />
          <span className="tabular-nums">{commentCount}</span>
          <span className="sr-only">{t.replies}</span>
        </GlassButton>
      </div>

      <ActionError state={likeState} />

      {showReplies && (
        <CommentThread
          reviewId={review.id}
          comments={review.comments}
          viewerId={viewerId}
          isAdmin={isAdmin}
          addReviewComment={addReviewComment}
          deleteReviewComment={deleteReviewComment}
          toggleCommentLike={toggleCommentLike}
        />
      )}
    </article>
  );
}
