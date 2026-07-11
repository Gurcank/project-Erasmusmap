"use client";

import { useT } from "@/hooks/useT";
import Link from "next/link";
import { latinize } from "@/lib/latinize";
import BioEditor from "@/components/ui/BioEditor";
import type { City, ProfileReview } from "@/types";

type Props = {
  username: string;
  name: string | null;
  bio: string | null;
  cityCount: number;
  reviewCount: number;
  visitedCities: City[];
  reviews: ProfileReview[];
  isOwnProfile: boolean;
  updateBio: (formData: FormData) => Promise<void>;
};

export default function ProfileContent({
  username, name, bio, cityCount, reviewCount,
  visitedCities, reviews, isOwnProfile, updateBio,
}: Props) {
  const t = useT();

  return (
    <div className="relative flex max-w-7xl mx-auto gap-8 px-6 pb-20">

      <div className="w-80 bg-white/90 dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-3xl p-8 shadow-xl flex flex-col gap-8">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-gray-200 dark:bg-white/20 flex items-center justify-center text-4xl text-gray-800 dark:text-white font-bold mb-4">
            {username?.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">@{username}</h2>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-100 dark:bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{cityCount}</p>
            <p className="text-gray-500 dark:text-white/60 text-sm">{t.visitedCities}</p>
          </div>
          <div className="bg-gray-100 dark:bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reviewCount}</p>
            <p className="text-gray-500 dark:text-white/60 text-sm">{t.madeReviews}</p>
          </div>
        </div>

        <div>
          {isOwnProfile ? (
            <BioEditor initialBio={bio ?? ""} updateBio={updateBio} />
          ) : (
            <div className="space-y-2">
              <h3 className="text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wider">Bio</h3>
              <p className="text-gray-700 dark:text-white/70 text-sm bg-gray-100 dark:bg-white/10 p-4 rounded-xl leading-relaxed">
                {bio || <span className="italic text-gray-400 dark:text-white/30">{t.noBio}</span>}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-8">
        <div className="bg-white/90 dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-3xl p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{t.visitedCities}</h3>
          <div className="grid grid-cols-3 gap-4">
            {visitedCities.map((city) => (
              <Link
                key={city.id}
                href={`/c/${city.slug}`}
                className="bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white rounded-xl p-4 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition border border-gray-200 dark:border-white/10 hover:border-indigo-400 text-sm font-medium"
              >
                {latinize(city.name)}
              </Link>
            ))}
            {visitedCities.length === 0 && (
              <p className="text-gray-400 dark:text-white/50 col-span-3">{t.noCities}</p>
            )}
          </div>
        </div>

        <div className="bg-white/90 dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-3xl p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{t.madeReviews}</h3>
          <div className="space-y-6">
            {reviews.map((review) => {
              const average = (review.culture + review.gastronomy + review.safety + review.socialLife + review.transport + review.costOfLiving) / 6;
              return (
                <div key={review.id} className="bg-gray-50 dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/15 transition rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Link href={`/c/${review.city.slug}`} className="text-gray-900 dark:text-white font-semibold text-lg hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                        {latinize(review.city.name)}
                      </Link>
                      <p className="text-gray-400 dark:text-white/40 text-xs">{new Date(review.createdAt).toLocaleDateString("tr-TR")}</p>
                    </div>
                    <div className="text-indigo-600 dark:text-indigo-400 font-semibold">⭐ {average.toFixed(1)}</div>
                  </div>
                  <p className="text-gray-700 dark:text-white/80 leading-relaxed">{review.content}</p>
                </div>
              );
            })}
            {reviews.length === 0 && (
              <p className="text-gray-400 dark:text-white/50">{t.noReviewsProfile}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
