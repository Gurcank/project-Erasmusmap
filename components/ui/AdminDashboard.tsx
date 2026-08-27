"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, Star, Trash2, Undo2 } from "lucide-react";
import { useT } from "@/hooks/useT";
import { latinize } from "@/lib/latinize";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import UserAvatar from "@/components/ui/UserAvatar";
import { averageRating } from "@/lib/review";
import type { CategoryRatings } from "@/types";
import type { FormAction } from "@/lib/action-result";

type AdminUser = {
  id: string;
  username: string | null;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  banned: boolean;
  createdAt: Date;
  _count: { reviews: number };
};

type AdminReview = CategoryRatings & {
  id: string;
  content: string;
  createdAt: Date;
  city: { name: string; slug: string };
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  } | null;
};

type Props = {
  currentUserEmail: string;
  users: AdminUser[];
  reviews: AdminReview[];
  stats: { userCount: number; cityCount: number; reviewCount: number };
  banUser: FormAction;
  deleteUser: FormAction;
  deleteReview: FormAction;
};

type Tab = "overview" | "users" | "reviews";

export default function AdminDashboard({
  currentUserEmail,
  users,
  reviews,
  stats,
  banUser,
  deleteUser,
  deleteReview,
}: Props) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("overview");

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: t.tabOverview },
    { key: "users", label: t.tabUsers },
    { key: "reviews", label: t.tabReviews },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-display font-bold text-text">
          {t.adminPanel}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{t.adminPanelDesc}</p>
      </div>

      <div
        role="tablist"
        aria-label={t.adminPanel}
        className="flex gap-1 border-b border-border"
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
                ? "border-primary text-text"
                : "border-transparent text-text-subtle hover:text-text"
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
              className="rounded-card border border-border bg-surface p-6 text-center"
            >
              <p className="font-display text-3xl font-bold text-text tabular-nums">
                {value}
              </p>
              <p className="mt-1 text-sm text-text-muted">{label}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          {users.length === 0 ? (
            <p className="p-8 text-center text-text-subtle">{t.noUsersFound}</p>
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
                        src={user.image}
                        label={displayName}
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
                            user.banned ? t.confirmUnbanUser : t.confirmBanUser
                          }
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <SubmitButton className="rounded-control border border-border-strong px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent-600 hover:text-accent-text disabled:opacity-50">
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
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <SubmitButton className="rounded-control border border-border-strong px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-danger-600 hover:text-danger-700 disabled:opacity-50 dark:hover:text-danger-400">
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
      )}

      {tab === "reviews" && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <p className="rounded-card border border-border bg-surface p-8 text-center text-text-subtle">
              {t.noReviewsFound}
            </p>
          ) : (
            reviews.map((review) => {
              const displayName =
                review.user?.username ?? review.user?.name ?? "—";
              return (
                <div
                  key={review.id}
                  className="rounded-card border border-border bg-surface p-6 transition-colors hover:border-border-strong"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        src={review.user?.image ?? null}
                        label={displayName}
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
                          {latinize(review.city.name)}
                        </Link>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-text">
                        <Star
                          size={14}
                          aria-hidden="true"
                          className="fill-accent-500 text-accent-500"
                        />
                        {averageRating(review).toFixed(1)}
                      </span>
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
    </div>
  );
}
