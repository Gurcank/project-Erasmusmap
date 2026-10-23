"use client";

import { useState } from "react";
import { useLocale } from "@/hooks/useLang";
import Link from "next/link";
import { Heart, Send, Trash2, X } from "lucide-react";
import { useT } from "@/hooks/useT";
import UserAvatar from "@/components/ui/UserAvatar";
import GlassButton from "@/components/ui/GlassButton";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import { MAX_REPLY_LENGTH } from "@/lib/engagement";
import type { ReviewComment } from "@/types";
import type { FormAction } from "@/lib/action-result";

type ReplyTarget = { id: string; name: string };

type Props = {
  reviewId: string;
  comments: ReviewComment[];
  /** Null when signed out — the thread is then read-only. */
  viewerId: string | null;
  isAdmin: boolean;
  addReviewComment: FormAction;
  deleteReviewComment: FormAction;
  toggleCommentLike: FormAction;
};

const nameOf = (comment: ReviewComment) =>
  comment.user?.username ?? comment.user?.name ?? "—";

/** Counts a thread the way the toggle above it reads: comments plus replies. */
function totalComments(comments: ReviewComment[]): number {
  return comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);
}

type RowProps = {
  comment: ReviewComment;
  isReply: boolean;
  viewerId: string | null;
  isAdmin: boolean;
  openThreads: Set<string>;
  onToggleThread: (id: string) => void;
  onReply: (target: ReplyTarget) => void;
  deleteReviewComment: FormAction;
  toggleCommentLike: FormAction;
};

/**
 * One comment, with its replies underneath when they are open.
 *
 * Declared here rather than inside CommentThread: a component defined in a
 * render body is a new type on every render, and React throws the whole
 * subtree away and rebuilds it each time.
 */
function CommentRow({
  comment,
  isReply,
  viewerId,
  isAdmin,
  openThreads,
  onToggleThread,
  onReply,
  deleteReviewComment,
  toggleCommentLike,
}: RowProps) {
  const t = useT();
  const locale = useLocale();
  const name = nameOf(comment);
  const isSignedIn = viewerId !== null;
  const canDelete = isAdmin || (isSignedIn && comment.user?.id === viewerId);
  const isOpen = openThreads.has(comment.id);

  return (
    <li className="flex gap-2.5">
      <UserAvatar
        avatar={comment.user?.avatar ?? null}
        seed={comment.user?.id ?? ""}
        size={isReply ? 26 : 32}
      />

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          {comment.user?.username ? (
            <Link
              href={`/u/${comment.user.username}`}
              className="text-sm font-semibold text-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {name}
            </Link>
          ) : (
            <span className="text-sm font-semibold text-text">{name}</span>
          )}
          <span className="text-xs text-text-subtle">
            {new Date(comment.createdAt).toLocaleDateString(locale)}
          </span>
        </p>

        <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-line text-text-muted">
          {comment.content}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-subtle">
          {comment.likeCount > 0 && (
            <span className="tabular-nums">
              {comment.likeCount} {t.likesLabel}
            </span>
          )}
          {isSignedIn && (
            <button
              type="button"
              onClick={() => onReply({ id: comment.id, name })}
              className="cursor-pointer font-semibold transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {t.reply}
            </button>
          )}
          {canDelete && (
            <ActionForm
              action={deleteReviewComment}
              confirmMessage={t.confirmDeleteReply}
              confirmLabel={t.deleteReply}
              errorClassName="text-xs text-danger-700 dark:text-danger-400"
            >
              <input type="hidden" name="commentId" value={comment.id} />
              <SubmitButton
                title={t.deleteReply}
                aria-label={t.deleteReply}
                variant="ghost"
                size="iconSm"
                className="h-6 w-6 hover:text-danger-700 dark:hover:text-danger-400"
              >
                <Trash2 size={12} aria-hidden="true" />
              </SubmitButton>
            </ActionForm>
          )}
        </div>

        {comment.replies.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => onToggleThread(comment.id)}
              aria-expanded={isOpen}
              className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-semibold text-text-subtle transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {/* The rule that ties a thread to the comment it hangs off. */}
              <span aria-hidden="true" className="h-px w-6 bg-border-strong" />
              {isOpen
                ? t.hideReplies
                : t.viewReplies.replace(
                    "{count}",
                    String(comment.replies.length),
                  )}
            </button>

            {isOpen && (
              <ul className="mt-3 space-y-3">
                {comment.replies.map((reply) => (
                  <CommentRow
                    key={reply.id}
                    comment={reply}
                    isReply
                    viewerId={viewerId}
                    isAdmin={isAdmin}
                    openThreads={openThreads}
                    onToggleThread={onToggleThread}
                    onReply={onReply}
                    deleteReviewComment={deleteReviewComment}
                    toggleCommentLike={toggleCommentLike}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <ActionForm action={toggleCommentLike} errorClassName="sr-only">
        <input type="hidden" name="commentId" value={comment.id} />
        <SubmitButton
          disabled={!isSignedIn}
          aria-pressed={comment.likedByViewer}
          aria-label={comment.likedByViewer ? t.liked : t.like}
          title={isSignedIn ? undefined : t.loginToInteract}
          variant="ghost"
          size="iconSm"
          className={
            comment.likedByViewer
              ? "text-danger-700 dark:text-danger-400"
              : undefined
          }
        >
          <Heart
            size={13}
            aria-hidden="true"
            className={comment.likedByViewer ? "fill-current" : undefined}
          />
        </SubmitButton>
      </ActionForm>
    </li>
  );
}

/**
 * The comment thread under a review: comments, one level of replies beneath
 * each, and a like on every one of them.
 *
 * Two levels rather than arbitrary nesting — a reply aimed at a reply lands
 * next to it under the same parent, so the thread stays readable however deep
 * the conversation goes and the indent never runs off a phone screen.
 */
export default function CommentThread({
  reviewId,
  comments,
  viewerId,
  isAdmin,
  addReviewComment,
  deleteReviewComment,
  toggleCommentLike,
}: Props) {
  const t = useT();
  const isSignedIn = viewerId !== null;
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [openThreads, setOpenThreads] = useState<Set<string>>(new Set());

  const toggleThread = (id: string) =>
    setOpenThreads((open) => {
      const next = new Set(open);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      {comments.length > 0 && (
        <>
          <p className="text-xs font-semibold tracking-widest text-text-subtle uppercase">
            {totalComments(comments)} {t.replies}
          </p>
          <ul className="space-y-4">
            {comments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                isReply={false}
                viewerId={viewerId}
                isAdmin={isAdmin}
                openThreads={openThreads}
                onToggleThread={toggleThread}
                onReply={setReplyTo}
                deleteReviewComment={deleteReviewComment}
                toggleCommentLike={toggleCommentLike}
              />
            ))}
          </ul>
        </>
      )}

      {isSignedIn ? (
        <ActionForm
          action={addReviewComment}
          className="space-y-2"
          errorClassName="text-xs text-danger-700 dark:text-danger-400"
        >
          <input type="hidden" name="reviewId" value={reviewId} />
          <input type="hidden" name="parentId" value={replyTo?.id ?? ""} />

          {replyTo && (
            <p className="flex items-center gap-2 text-xs text-text-subtle">
              {t.replyingTo.replace("{name}", replyTo.name)}
              <GlassButton
                onClick={() => setReplyTo(null)}
                aria-label={t.cancelReply}
                variant="ghost"
                size="iconSm"
                className="h-5 w-5"
              >
                <X size={11} aria-hidden="true" />
              </GlassButton>
            </p>
          )}

          <div className="field flex items-end gap-2 p-1.5">
            <textarea
              name="content"
              rows={1}
              maxLength={MAX_REPLY_LENGTH}
              aria-label={t.writeReply}
              placeholder={t.writeReply}
              // field-sizing grows the box with the text instead of scrolling
              // one line at a time; rows={1} is the floor where it is missing.
              className="max-h-32 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm text-text field-sizing-content placeholder:text-text-subtle focus:outline-none"
            />
            <SubmitButton
              aria-label={t.sendReply}
              title={t.sendReply}
              variant="primary"
              size="iconSm"
            >
              <Send size={14} aria-hidden="true" />
            </SubmitButton>
          </div>
        </ActionForm>
      ) : (
        <p className="text-sm text-text-subtle">{t.loginToInteract}</p>
      )}
    </div>
  );
}
