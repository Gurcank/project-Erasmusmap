"use client";

import { useT } from "@/hooks/useT";
import Link from "next/link";
import VisitButton from "@/components/ui/VisitButton";
import StarInput from "@/components/ui/StarInput";
import type { CityReview, CategoryRatings } from "@/types";

type Props = {
  cityId: string;
  cityName: string;
  cityImage: string | null;
  isVisited: boolean;
  reviewCount: number;
  avgScore: number;
  categoryRatings: CategoryRatings;
  reviews: CityReview[];
  submitReview: (formData: FormData) => Promise<void>;
};

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-xl ${i <= value ? "text-yellow-400" : "text-gray-300 dark:text-zinc-700"}`}>★</span>
      ))}
    </div>
  );
}

export default function CityContent({ cityId, cityName, cityImage, isVisited, reviewCount, avgScore, categoryRatings, reviews, submitReview }: Props) {
  const t = useT();

  const ratingRows = [
    { key: "costOfLiving", label: t.cost, value: categoryRatings.costOfLiving },
    { key: "safety", label: t.safety, value: categoryRatings.safety },
    { key: "socialLife", label: t.social, value: categoryRatings.socialLife },
    { key: "culture", label: t.culture, value: categoryRatings.culture },
    { key: "gastronomy", label: t.gastronomy, value: categoryRatings.gastronomy },
    { key: "transport", label: t.transport, value: categoryRatings.transport },
  ];

  return (
    <div className="max-w-7xl mx-auto px-8 py-20">
      <div className="grid md:grid-cols-2 gap-16 items-start mb-16">

        <div>
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">{cityName}</h1>
            <VisitButton cityId={cityId} initialVisited={isVisited} />
          </div>
          <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800">
            {cityImage ? (
              <img src={cityImage} alt={cityName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-zinc-900 text-gray-400 dark:text-zinc-500">
                {cityName} — {t.noPhoto}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t.cityRatings}</h2>
          {ratingRows.map(({ key, label, value }) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-white">{label}</span>
              <StarDisplay value={value} />
            </div>
          ))}
          <div className="pt-6 border-t border-gray-200 dark:border-zinc-800">
            <div className="flex items-center gap-4">
              <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                {reviewCount > 0 ? avgScore.toFixed(1) : "—"}
              </span>
              <span className="text-gray-500 dark:text-zinc-400">{reviewCount} {t.reviews}</span>
            </div>
          </div>
        </div>
      </div>

      <form action={submitReview} className="bg-white dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 space-y-8 max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-center tracking-wide text-gray-900 dark:text-white">{t.rateCity}</h2>
        <div className="grid grid-cols-2 gap-5">
          <StarInput label={t.cost} name="costOfLiving" />
          <StarInput label={t.safety} name="safety" />
          <StarInput label={t.social} name="socialLife" />
          <StarInput label={t.culture} name="culture" />
          <StarInput label={t.gastronomy} name="gastronomy" />
          <StarInput label={t.transport} name="transport" />
        </div>
        <textarea
          name="content"
          placeholder={t.writeReview}
          className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 h-24 focus:outline-none focus:border-indigo-500 transition"
        />
        <div className="flex justify-center">
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-indigo-900/20">
            {t.submitReview}
          </button>
        </div>
      </form>

      <div className="mt-20 w-full">
        <div className="bg-white dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 rounded-3xl px-6 py-14">
          <h2 className="text-3xl font-bold tracking-tight mb-12 text-gray-900 dark:text-white">{t.allReviews}</h2>

          {reviews.length === 0 && <p className="text-gray-400 dark:text-zinc-500">{t.noReviews}</p>}

          <div className="flex flex-col gap-10">
            {reviews.map((review) => (
              <div key={review.id} className="bg-gray-50 dark:bg-zinc-950/60 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 hover:border-indigo-400/40 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <Link href={review.user?.username ? `/u/${review.user.username}` : review.user?.name ? `/u/${review.user.name}` : "#"} className="flex items-center gap-3 hover:opacity-80 transition">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-sm text-gray-700 dark:text-white">
                      {(review.user?.username ?? review.user?.name)?.charAt(0).toUpperCase() ?? "U"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{review.user?.username ? `@${review.user.username}` : review.user?.name}</p>
                      <p className="text-gray-400 dark:text-zinc-500 text-xs">{new Date(review.createdAt).toLocaleDateString("tr-TR")}</p>
                    </div>
                  </Link>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg">
                    ⭐ {((review.culture + review.gastronomy + review.safety + review.socialLife + review.transport + review.costOfLiving) / 6).toFixed(1)}
                  </span>
                </div>

                <p className="text-gray-700 dark:text-zinc-300 leading-relaxed text-lg mt-6 max-w-4xl">{review.content}</p>

                <div className="mt-6 flex flex-wrap gap-2 text-xs">
                  {[
                    { label: t.cost, value: review.costOfLiving },
                    { label: t.safety, value: review.safety },
                    { label: t.social, value: review.socialLife },
                    { label: t.culture, value: review.culture },
                    { label: t.gastronomy, value: review.gastronomy },
                    { label: t.transport, value: review.transport },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-white px-3 py-1 rounded-lg flex items-center gap-1">
                      <span>{label}</span>
                      <StarDisplay value={value} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
