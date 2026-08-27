"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useT } from "@/hooks/useT";
import { latinize } from "@/lib/latinize";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import type { FormAction } from "@/lib/action-result";
import { averageRating } from "@/lib/review";
import type { CategoryRatings } from "@/types";

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

// Avatars uploaded before the Storage migration are still base64 data URIs,
// which the image optimizer cannot fetch.
function isLegacyDataUri(src: string): boolean {
  return src.startsWith("data:");
}

function Avatar({
  image,
  label,
  size = 10,
}: {
  image: string | null;
  label: string;
  size?: number;
}) {
  const dim = `${size * 0.25}rem`;
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={size * 4}
        height={size * 4}
        unoptimized={isLegacyDataUri(image)}
        style={{ width: dim, height: dim }}
        className="rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: dim, height: dim }}
      className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0"
    >
      {label.charAt(0).toUpperCase()}
    </div>
  );
}

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t.adminPanel}
        </h1>
        <p className="text-gray-500 dark:text-white/40 text-sm mt-1">
          {t.adminPanelDesc}
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-zinc-800">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors duration-150 ${
              tab === key
                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                : "text-gray-500 dark:text-white/40 hover:text-gray-800 dark:hover:text-white/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: t.statTotalUsers, value: stats.userCount },
            { label: t.statTotalCities, value: stats.cityCount },
            { label: t.statTotalReviews, value: stats.reviewCount },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 border-t-2 border-t-indigo-500/70 rounded-2xl p-6 text-center transition-all duration-300 ease-out hover:bg-gray-50 dark:hover:bg-white/[0.04]"
            >
              <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                {value}
              </p>
              <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          {users.length === 0 ? (
            <p className="p-8 text-center text-gray-400 dark:text-white/40">
              {t.noUsersFound}
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
              {users.map((user) => {
                const isSelf = user.email === currentUserEmail;
                const isAdminTarget = user.role === "ADMIN";
                const locked = isSelf || isAdminTarget;
                const displayName = user.username ?? user.name ?? user.email;
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition-all duration-300 ease-out hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:shadow-[inset_3px_0_0_0_#6366f1] dark:hover:shadow-[inset_3px_0_0_0_#818cf8]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar image={user.image} label={displayName} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={user.username ? `/u/${user.username}` : "#"}
                            className="font-semibold text-gray-900 dark:text-white text-sm truncate border-b border-transparent pb-0.5 transition-colors duration-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400/60"
                          >
                            {user.username ? `@${user.username}` : displayName}
                          </Link>
                          {user.role === "ADMIN" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium shrink-0">
                              {t.admin}
                            </span>
                          )}
                          {user.banned && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium shrink-0">
                              {t.statusBanned}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-white/40 truncate">
                          {user.email} · {user._count.reviews} {t.reviews}
                        </p>
                      </div>
                    </div>

                    {!locked && (
                      <div className="flex items-center gap-2 shrink-0">
                        <ActionForm
                          action={banUser}
                          confirmMessage={
                            user.banned ? t.confirmUnbanUser : t.confirmBanUser
                          }
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <SubmitButton
                            pendingText="…"
                            className="text-xs px-3 py-1.5 rounded-lg font-medium border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-white/70 transition-colors duration-150 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 dark:hover:bg-amber-500/10 dark:hover:text-amber-400 disabled:opacity-50"
                          >
                            {user.banned ? t.unbanAction : t.banAction}
                          </SubmitButton>
                        </ActionForm>
                        <ActionForm
                          action={deleteUser}
                          confirmMessage={t.confirmDeleteUser}
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <SubmitButton
                            pendingText="…"
                            className="text-xs px-3 py-1.5 rounded-lg font-medium border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-white/70 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-400 disabled:opacity-50"
                          >
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
            <p className="p-8 text-center text-gray-400 dark:text-white/40 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl">
              {t.noReviewsFound}
            </p>
          ) : (
            reviews.map((review) => {
              const displayName =
                review.user?.username ?? review.user?.name ?? "—";
              return (
                <div
                  key={review.id}
                  className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 transition-all duration-300 ease-out hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-[inset_3px_0_0_0_#6366f1] dark:hover:shadow-[inset_3px_0_0_0_#818cf8]"
                >
                  <div className="flex justify-between items-start mb-3 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        image={review.user?.image ?? null}
                        label={displayName}
                        size={9}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                          {review.user?.username
                            ? `@${displayName}`
                            : displayName}
                        </p>
                        <Link
                          href={`/c/${review.city.slug}`}
                          className="text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
                        >
                          {latinize(review.city.name)}
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                        ⭐ {averageRating(review).toFixed(1)}
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
                          pendingText="…"
                          title={t.adminDeleteReview}
                          className="text-red-500 hover:text-red-400 text-sm transition-colors duration-150 disabled:opacity-50"
                        >
                          🗑
                        </SubmitButton>
                      </ActionForm>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-zinc-300 text-sm leading-relaxed">
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
