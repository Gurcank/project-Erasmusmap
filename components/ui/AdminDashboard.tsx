"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Search,
  Star,
  Trash2,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { useT } from "@/hooks/useT";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import UserAvatar from "@/components/ui/UserAvatar";
import type { AdminTab as Tab } from "@/lib/admin-tabs";
import { averageRating } from "@/lib/review";
import type { ReviewRatings } from "@/types";
import type { FormAction } from "@/lib/action-result";

type AdminUser = {
  id: string;
  username: string | null;
  name: string | null;
  email: string;
  avatar: string | null;
  role: string;
  banned: boolean;
  createdAt: Date;
  _count: { reviews: number };
};

type AdminReview = ReviewRatings & {
  id: string;
  content: string;
  createdAt: Date;
  city: { name: string; slug: string };
  user: {
    id: string;
    name: string | null;
    username: string | null;
    avatar: string | null;
  } | null;
};

/** A comment as the panel lists it: enough to judge it and its way back. */
type AdminComment = {
  id: string;
  content: string;
  createdAt: Date;
  flagged: boolean;
  /** Set on a reply; a top-level comment has none. */
  parentAuthor: string | null;
  city: { name: string; slug: string };
  user: {
    id: string;
    name: string | null;
    username: string | null;
    avatar: string | null;
  } | null;
};

type UsersPage = {
  page: number;
  pages: number;
  total: number;
  /** The search text the list was filtered by. */
  query: string;
};

type Props = {
  currentUserEmail: string;
  users: AdminUser[];
  usersPage: UsersPage;
  /** The tab the URL asked for, so a page link keeps the tab open. */
  initialTab: Tab;
  reviews: AdminReview[];
  comments: AdminComment[];
  stats: { userCount: number; cityCount: number; reviewCount: number };
  banUser: FormAction;
  deleteUser: FormAction;
  deleteReview: FormAction;
  deleteReviewComment: FormAction;
};

/** The address of a page of the user list, keeping the search and the tab. */
function usersHref(query: string, page: number): string {
  const params = new URLSearchParams({ tab: "users" });
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  return `/admin?${params.toString()}`;
}

export default function AdminDashboard({
  currentUserEmail,
  users,
  usersPage,
  initialTab,
  reviews,
  comments,
  stats,
  banUser,
  deleteUser,
  deleteReview,
  deleteReviewComment,
}: Props) {
  const t = useT();
  const [tab, setTab] = useState<Tab>(initialTab);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: t.tabOverview },
    { key: "users", label: t.tabUsers },
    { key: "reviews", label: t.tabReviews },
    { key: "comments", label: t.tabComments },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-display font-bold text-on-backdrop">
          {t.adminPanel}
        </h1>
        <p className="mt-1 text-sm text-on-backdrop-muted">
          {t.adminPanelDesc}
        </p>
      </div>

      <div
        role="tablist"
        aria-label={t.adminPanel}
        className="flex gap-1 border-b border-ink-50/15"
      >
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              tab === key
                ? "border-primary text-on-backdrop"
                : "border-transparent text-on-backdrop-muted hover:text-on-backdrop"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: t.statTotalUsers, value: stats.userCount },
            { label: t.statTotalCities, value: stats.cityCount },
            { label: t.statTotalReviews, value: stats.reviewCount },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-card glass border border-border bg-surface p-6 text-center"
            >
              <p className="font-display text-3xl font-bold text-text tabular-nums">
                {value.toLocaleString("tr-TR")}
              </p>
              <p className="mt-1 text-sm text-text-muted">{label}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <form
            action="/admin"
            method="get"
            role="search"
            className="flex gap-2"
          >
            <input type="hidden" name="tab" value="users" />
            <label htmlFor="admin-user-search" className="sr-only">
              {t.usersSearchPlaceholder}
            </label>
            <input
              id="admin-user-search"
              name="q"
              type="search"
              defaultValue={usersPage.query}
              maxLength={100}
              placeholder={t.usersSearchPlaceholder}
              className="field min-w-0 flex-1 px-4 py-2.5 text-sm"
            />
            <SubmitButton size="sm" className="shrink-0">
              <Search size={14} aria-hidden="true" />
              {t.usersSearchBtn}
            </SubmitButton>
          </form>
          <p className="px-1 text-xs text-on-backdrop-muted">
            {t.usersTotal.replace("{n}", String(usersPage.total))}
          </p>
          <div className="overflow-hidden rounded-card glass border border-border bg-surface">
            {users.length === 0 ? (
              <p className="p-8 text-center text-text-subtle">
                {t.noUsersFound}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {users.map((user) => {
                  const isSelf = user.email === currentUserEmail;
                  const isAdminTarget = user.role === "ADMIN";
                  const locked = isSelf || isAdminTarget;
                  const displayName = user.username ?? user.name ?? user.email;
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-surface-raised"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar
                          avatar={user.avatar}
                          seed={user.id}
                          size={40}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={user.username ? `/u/${user.username}` : "#"}
                              onClick={(event) => {
                                if (!user.username) event.preventDefault();
                              }}
                              className="truncate text-sm font-semibold text-text transition-colors hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                            >
                              {displayName}
                            </Link>
                            {isAdminTarget && (
                              <span className="shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium text-accent-text">
                                {t.admin}
                              </span>
                            )}
                            {user.banned && (
                              <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium text-danger-700 dark:text-danger-400">
                                <Ban size={11} aria-hidden="true" />
                                {t.statusBanned}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-text-subtle">
                            {user.email} · {user._count.reviews} {t.reviews}
                          </p>
                        </div>
                      </div>

                      {!locked && (
                        <div className="flex shrink-0 items-center gap-2">
                          <ActionForm
                            action={banUser}
                            confirmMessage={
                              user.banned
                                ? t.confirmUnbanUser
                                : t.confirmBanUser
                            }
                            confirmLabel={
                              user.banned ? t.unbanAction : t.banAction
                            }
                          >
                            <input
                              type="hidden"
                              name="userId"
                              value={user.id}
                            />
                            <SubmitButton
                              size="sm"
                              className="hover:border-accent-600 hover:text-accent-text"
                            >
                              {user.banned ? (
                                <Undo2 size={12} aria-hidden="true" />
                              ) : (
                                <Ban size={12} aria-hidden="true" />
                              )}
                              {user.banned ? t.unbanAction : t.banAction}
                            </SubmitButton>
                          </ActionForm>
                          <ActionForm
                            action={deleteUser}
                            confirmMessage={t.confirmDeleteUser}
                            confirmLabel={t.deleteUserAction}
                          >
                            <input
                              type="hidden"
                              name="userId"
                              value={user.id}
                            />
                            <SubmitButton size="sm" variant="danger">
                              <Trash2 size={12} aria-hidden="true" />
                              {t.deleteUserAction}
                            </SubmitButton>
                          </ActionForm>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {usersPage.pages > 1 && (
            <nav
              aria-label={t.usersPagination}
              className="flex items-center justify-between gap-3"
            >
              {usersPage.page > 1 ? (
                <Link
                  href={usersHref(usersPage.query, usersPage.page - 1)}
                  rel="prev"
                  className="inline-flex items-center gap-1 rounded-full glass border border-border bg-surface px-4 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  {t.prevPage}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-xs text-on-backdrop-muted">
                {t.usersPageLabel
                  .replace("{page}", String(usersPage.page))
                  .replace("{pages}", String(usersPage.pages))}
              </span>
              {usersPage.page < usersPage.pages ? (
                <Link
                  href={usersHref(usersPage.query, usersPage.page + 1)}
                  rel="next"
                  className="inline-flex items-center gap-1 rounded-full glass border border-border bg-surface px-4 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {t.nextPage}
                  <ChevronRight size={14} aria-hidden="true" />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      )}

      {tab === "reviews" && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <p className="rounded-card glass border border-border bg-surface p-8 text-center text-text-subtle">
              {t.noReviewsFound}
            </p>
          ) : (
            reviews.map((review) => {
              const displayName =
                review.user?.username ?? review.user?.name ?? "—";
              const avg = averageRating(review);
              return (
                <div
                  key={review.id}
                  className="rounded-card glass border border-border bg-surface p-6 transition-colors hover:border-border-strong"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        avatar={review.user?.avatar ?? null}
                        seed={review.user?.id ?? ""}
                        size={36}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text">
                          {displayName}
                        </p>
                        <Link
                          href={`/c/${review.city.slug}`}
                          className="text-xs text-accent-text transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                          {review.city.name}
                        </Link>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {avg !== null && (
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-text">
                          <Star
                            size={14}
                            aria-hidden="true"
                            className="fill-accent-500 text-accent-500"
                          />
                          {avg.toFixed(1)}
                        </span>
                      )}
                      <ActionForm
                        action={deleteReview}
                        confirmMessage={t.confirmDeleteReview}
                        confirmLabel={t.adminDeleteReview}
                      >
                        <input
                          type="hidden"
                          name="reviewId"
                          value={review.id}
                        />
                        <SubmitButton
                          title={t.adminDeleteReview}
                          aria-label={t.adminDeleteReview}
                          variant="ghost"
                          size="iconSm"
                          className="hover:text-danger-700 dark:hover:text-danger-400"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </SubmitButton>
                      </ActionForm>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-text-muted">
                    {review.content}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "comments" && (
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="glass rounded-card border border-border bg-surface p-8 text-center text-text-subtle">
              {t.noComments}
            </p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`glass rounded-card border bg-surface p-4 ${
                  comment.flagged ? "border-danger-600" : "border-border"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      avatar={comment.user?.avatar ?? null}
                      seed={comment.user?.id ?? ""}
                      size={32}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        {comment.user?.username ?? comment.user?.name ?? "—"}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-text-subtle">
                        <Link
                          href={`/c/${comment.city.slug}`}
                          className="hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                          {comment.city.name}
                        </Link>
                        <span>
                          {new Date(comment.createdAt).toLocaleDateString(
                            "tr-TR",
                          )}
                        </span>
                        {comment.parentAuthor && (
                          <span>
                            {t.replyingTo.replace(
                              "{name}",
                              comment.parentAuthor,
                            )}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {comment.flagged && (
                      <span className="flex items-center gap-1 rounded-full bg-danger-600/12 px-2 py-0.5 text-xs font-semibold text-danger-700 dark:text-danger-400">
                        <TriangleAlert size={12} aria-hidden="true" />
                        {t.flaggedLabel}
                      </span>
                    )}
                    <ActionForm
                      action={deleteReviewComment}
                      confirmMessage={t.confirmDeleteReply}
                      confirmLabel={t.deleteReply}
                    >
                      <input
                        type="hidden"
                        name="commentId"
                        value={comment.id}
                      />
                      <SubmitButton
                        title={t.deleteReply}
                        aria-label={t.deleteReply}
                        variant="ghost"
                        size="iconSm"
                        className="hover:text-danger-700 dark:hover:text-danger-400"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </SubmitButton>
                    </ActionForm>
                  </div>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line text-text-muted">
                  {comment.content}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
