"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CalendarDays, Heart, MessageCircle, Star, Trash2 } from "lucide-react";
import { useT } from "@/hooks/useT";
import UserAvatar from "@/components/ui/UserAvatar";
import Rating from "@/components/ui/Rating";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import { formatStayRange } from "@/lib/format";
import { averageRating, toStars } from "@/lib/review";
import { MAX_REPLY_LENGTH } from "@/lib/engagement";
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
  deleteReview: FormAction;
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
  deleteReview,
}: Props) {
  const t = useT();
  const [likeState, likeAction] = useActionState(toggleReviewLike, null);
  const [replyState, replyAction] = useActionState(addReviewComment, null);
  const [showReplies, setShowReplies] = useState(false);

  const author = review.user?.username ?? review.user?.name ?? "—";
  const isSignedIn = viewerId !== null;
  const replyCount = review.replies.length;
  const stayRange = formatStayRange(review.stayStart, review.stayEnd);

  const categories = [
    { label: t.cost, value: review.costOfLiving },
    { label: t.safety, value: review.safety },
    { label: t.social, value: review.socialLife },
    { label: t.culture, value: review.culture },
    { label: t.gastronomy, value: review.gastronomy },
    { label: t.transport, value: review.transport },
  ];

  return (
    <article className="rounded-panel border border-border bg-surface p-6 transition-colors hover:border-border-strong">
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
            size={40}
          />
          <div>
            <p className="font-semibold text-text transition-colors group-hover:text-accent-text">
              {author}
            </p>
            <p className="text-xs text-text-subtle">
              {new Date(review.createdAt).toLocaleDateString("tr-TR")}
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <span className="flex items-center gap-1.5 font-semibold text-text">
            <Star
              size={15}
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
              <input type="hidden" name="reviewId" value={review.id} />
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

      {review.city && (
        <Link
          href={`/c/${review.city.slug}`}
          className="mb-3 inline-block font-display text-lg font-semibold text-text transition-colors hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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

      {review.content && (
        <p className="max-w-prose leading-relaxed text-text-muted">
          {review.content}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map(({ label, value }) => (
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

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <form action={likeAction}>
          <input type="hidden" name="reviewId" value={review.id} />
          <SubmitButton
            disabled={!isSignedIn}
            aria-pressed={review.likedByViewer}
            aria-label={review.likedByViewer ? t.liked : t.like}
            title={isSignedIn ? undefined : t.loginToInteract}
            className={`rounded-control px-2.5 py-1.5 text-sm transition-colors ${
              review.likedByViewer
                ? "text-danger-700 dark:text-danger-400"
                : "text-text-subtle hover:bg-surface-raised hover:text-text"
            }`}
          >
            <Heart
              size={15}
              aria-hidden="true"
              className={review.likedByViewer ? "fill-current" : undefined}
            />
            <span className="tabular-nums">{review.likeCount}</span>
          </SubmitButton>
        </form>

        <button
          type="button"
          onClick={() => setShowReplies((open) => !open)}
          aria-expanded={showReplies}
          className="flex cursor-pointer items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm text-text-subtle transition-colors hover:bg-surface-raised hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <MessageCircle size={15} aria-hidden="true" />
          <span className="tabular-nums">{replyCount}</span>
          <span className="sr-only">{t.replies}</span>
        </button>
      </div>

      <ActionError state={likeState} />

      {showReplies && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {review.replies.map((reply) => {
            const replyAuthor = reply.user?.username ?? reply.user?.name ?? "—";
            const canDelete = isAdmin || reply.user?.id === viewerId;
            return (
              <div key={reply.id} className="flex items-start gap-3">
                <UserAvatar
                  src={reply.user?.image ?? null}
                  label={replyAuthor}
                  size={28}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold text-text">
                      {replyAuthor}
                    </span>
                    <span className="ml-2 text-xs text-text-subtle">
                      {new Date(reply.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </p>
                  <p className="text-sm leading-relaxed text-text-muted">
                    {reply.content}
                  </p>
                </div>
                {canDelete && (
                  <ActionForm
                    action={deleteReviewComment}
                    confirmMessage={t.confirmDeleteReply}
                  >
                    <input type="hidden" name="commentId" value={reply.id} />
                    <SubmitButton
                      title={t.deleteReply}
                      aria-label={t.deleteReply}
                      className="rounded-control p-1 text-text-subtle transition-colors hover:text-danger-700 disabled:opacity-50 dark:hover:text-danger-400"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </SubmitButton>
                  </ActionForm>
                )}
              </div>
            );
          })}

          {isSignedIn ? (
            <form action={replyAction} className="flex items-start gap-2">
              <input type="hidden" name="reviewId" value={review.id} />
              <textarea
                name="content"
                rows={2}
                maxLength={MAX_REPLY_LENGTH}
                aria-label={t.writeReply}
                placeholder={t.writeReply}
                className="flex-1 resize-none rounded-control border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-text-subtle focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
              />
              <SubmitButton
                pendingText={t.sendReply}
                className="rounded-control bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {t.sendReply}
              </SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-text-subtle">{t.loginToInteract}</p>
          )}

          <ActionError state={replyState} />
        </div>
      )}
    </article>
  );
}
