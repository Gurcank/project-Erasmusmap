"use client";

import { useT } from "@/hooks/useT";
import Link from "next/link";
import Image from "next/image";
import { latinize } from "@/lib/latinize";
import BioEditor from "@/components/ui/BioEditor";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import type { FormAction } from "@/lib/action-result";
import type { City, ProfileReview } from "@/types";
import { averageRating } from "@/lib/review";

type Props = {
  username: string;
  image: string | null;
  bio: string | null;
  cityCount: number;
  reviewCount: number;
  visitedCities: City[];
  reviews: ProfileReview[];
  isOwnProfile: boolean;
  updateBio: FormAction;
  isAdmin: boolean;
  deleteReview: FormAction;
};

// Avatars uploaded before the Storage migration are still base64 data URIs,
// which the image optimizer cannot fetch.
function isLegacyDataUri(src: string): boolean {
  return src.startsWith("data:");
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
    <div className="relative flex max-w-7xl mx-auto gap-8 px-6 pb-20">
      <div className="w-80 bg-white/90 dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-3xl p-8 shadow-xl flex flex-col gap-8">
        <div className="text-center">
          {image ? (
            <Image
              src={image}
              alt=""
              width={96}
              height={96}
              unoptimized={isLegacyDataUri(image)}
              className="w-24 h-24 mx-auto rounded-full object-cover mb-4"
            />
          ) : (
            <div className="w-24 h-24 mx-auto rounded-full bg-gray-200 dark:bg-white/20 flex items-center justify-center text-4xl text-gray-800 dark:text-white font-bold mb-4">
              {username?.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            @{username}
          </h1>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-100 dark:bg-white/10 rounded-xl p-4 text-center border-t-2 border-indigo-500/70">
            <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
              {cityCount}
            </p>
            <p className="text-gray-500 dark:text-white/60 text-sm">
              {t.visitedCities}
            </p>
          </div>
          <div className="bg-gray-100 dark:bg-white/10 rounded-xl p-4 text-center border-t-2 border-emerald-500/70">
            <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
              {reviewCount}
            </p>
            <p className="text-gray-500 dark:text-white/60 text-sm">
              {t.madeReviews}
            </p>
          </div>
        </div>

        <div>
          {isOwnProfile ? (
            <BioEditor initialBio={bio ?? ""} updateBio={updateBio} />
          ) : (
            <div className="space-y-2">
              <h2 className="text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wider">
                Bio
              </h2>
              <p className="text-gray-700 dark:text-white/70 text-sm bg-gray-100 dark:bg-white/10 p-4 rounded-xl leading-relaxed">
                {bio || (
                  <span className="italic text-gray-400 dark:text-white/30">
                    {t.noBio}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-8">
        <div className="bg-white/90 dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            {t.visitedCities}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {visitedCities.map((city) => (
              <Link
                key={city.id}
                href={`/c/${city.slug}`}
                className="bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white rounded-xl p-4 border border-gray-200 dark:border-white/10 text-sm font-medium transition-all duration-300 ease-out hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:shadow-[inset_3px_0_0_0_#6366f1] dark:hover:shadow-[inset_3px_0_0_0_#818cf8]"
              >
                {latinize(city.name)}
              </Link>
            ))}
            {visitedCities.length === 0 && (
              <p className="text-gray-400 dark:text-white/50 col-span-3">
                {t.noCities}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white/90 dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            {t.madeReviews}
          </h2>
          <div className="space-y-6">
            {reviews.map((review) => {
              const average = averageRating(review);
              return (
                <div
                  key={review.id}
                  className="bg-gray-50 dark:bg-white/10 rounded-2xl p-6 border border-gray-200 dark:border-white/10 transition-all duration-300 ease-out hover:bg-white dark:hover:bg-white/[0.06] hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:shadow-[inset_3px_0_0_0_#6366f1] dark:hover:shadow-[inset_3px_0_0_0_#818cf8]"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Link
                        href={`/c/${review.city.slug}`}
                        className="text-gray-900 dark:text-white font-semibold text-lg border-b border-transparent pb-0.5 transition-colors duration-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400/60"
                      >
                        {latinize(review.city.name)}
                      </Link>
                      <p className="text-gray-400 dark:text-white/40 text-xs">
                        {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        ⭐ {average.toFixed(1)}
                      </div>
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
                            pendingText="…"
                            title={t.adminDeleteReview}
                            className="text-red-500 hover:text-red-400 text-sm disabled:opacity-50"
                          >
                            🗑
                          </SubmitButton>
                        </ActionForm>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-white/80 leading-relaxed">
                    {review.content}
                  </p>
                </div>
              );
            })}
            {reviews.length === 0 && (
              <p className="text-gray-400 dark:text-white/50">
                {t.noReviewsProfile}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
