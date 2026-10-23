import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import CityContent from "@/components/ui/CityContent";
import { deleteReview } from "@/lib/actions";
import {
  addReviewComment,
  toggleCommentLike,
  deleteOwnReview,
  deleteReviewComment,
  toggleReviewLike,
  updateOwnReview,
} from "@/lib/square-actions";
import type { EngagedReview } from "@/types";
import {
  saveVisitDates,
  submitReview as submitCityReview,
  toggleVisit,
  toggleWishlist,
} from "@/lib/city-actions";
import { requireActiveUser } from "@/lib/auth-guards";
import { getHiddenUserIds } from "@/lib/social";
import { buildCommentTree, getLikedCommentIds } from "@/lib/review-shape";
import { cacheCityPhotos } from "@/lib/city-photo";
import {
  getAuthorStays,
  getCityBySlug,
  getCityMeta,
  getCityRatingSummary,
  getCityReviews,
  getLikedReviewIds,
  getViewerCityState,
} from "@/lib/queries/city";

// Reviews are loaded a page at a time; `?reviews=N` asks for the first N pages.
const REVIEWS_PAGE_SIZE = 10;
const MAX_REVIEW_PAGES = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = await getCityMeta(slug);
  // Runs before the loading.tsx shell is streamed, so this is the last
  // point where a real 404 status can still be set.
  if (!city) notFound();

  const name = city.name;
  const description = `${name}, ${city.country} için Erasmus öğrenci değerlendirmeleri, puanları ve fotoğrafları.`;
  return {
    title: name,
    description,
    openGraph: { title: name, description },
    twitter: { title: name, description },
  };
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reviews?: string }>;
}) {
  const { slug } = await params;
  const { reviews: reviewPagesParam } = await searchParams;
  const pages = Math.min(
    MAX_REVIEW_PAGES,
    Math.max(1, Math.floor(Number(reviewPagesParam)) || 1),
  );

  const [city, viewer] = await Promise.all([
    getCityBySlug(slug),
    requireActiveUser(),
  ]);

  if (!city) notFound();

  // Blocked users' reviews and replies never render.
  const hiddenUserIds = new Set(
    await getHiddenUserIds(viewer.ok ? viewer.user.id : null),
  );
  const hiddenList = [...hiddenUserIds];

  // One row more than shown, to know whether another page exists.
  const fetchedReviews = await getCityReviews(
    city.id,
    hiddenList,
    pages * REVIEWS_PAGE_SIZE + 1,
  );
  const hasMoreReviews = fetchedReviews.length > pages * REVIEWS_PAGE_SIZE;
  const visibleReviews = fetchedReviews.slice(0, pages * REVIEWS_PAGE_SIZE);

  const { visit, isWishlisted } = viewer.ok
    ? await getViewerCityState(viewer.user.id, city.id)
    : { visit: null, isWishlisted: false };
  const isAdmin = viewer.ok && viewer.user.role === "ADMIN";
  const submitReview = submitCityReview.bind(null, city.id);

  // One query for the viewer's likes across every review on the page, rather
  // than one per card.
  const likedReviewIds = await getLikedReviewIds(
    viewer.ok ? viewer.user.id : null,
    visibleReviews.map((review) => review.id),
  );
  const likedCommentIds = await getLikedCommentIds(
    visibleReviews.flatMap((review) => review.comments.map((c) => c.id)),
    viewer.ok ? viewer.user.id : null,
  );

  // Each review can show when its author was in this city. One query for every
  // author on the page rather than one per card.
  const authorIds = [
    ...new Set(
      visibleReviews
        .map((review) => review.user?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const stayByUser = await getAuthorStays(city.id, authorIds);

  const reviews: EngagedReview[] = visibleReviews.map((review) => {
    const stay = review.user?.id ? stayByUser[review.user.id] : undefined;
    return {
      id: review.id,
      content: review.content,
      createdAt: review.createdAt,
      culture: review.culture,
      gastronomy: review.gastronomy,
      safety: review.safety,
      socialLife: review.socialLife,
      transport: review.transport,
      costOfLiving: review.costOfLiving,
      user: review.user,
      likeCount: review._count.likes,
      likedByViewer: likedReviewIds.has(review.id),
      comments: buildCommentTree(
        review.comments,
        likedCommentIds,
        hiddenUserIds,
      ),
      stayStart: stay?.startDate ?? null,
      stayEnd: stay?.endDate ?? null,
    };
  });

  // Fetching the photo is deferred until the response has been sent; see
  // cacheCityPhotos.
  const cityImage = city.imageUrl;
  if (!cityImage) {
    const { id, name } = city;
    after(() => cacheCityPhotos([{ id, name }]));
  }

  const { reviewCount, ratings, avgScore } = await getCityRatingSummary(
    city.id,
  );

  return (
    <div className="min-h-screen pt-16">
      <CityContent
        cityId={city.id}
        cityName={city.name}
        cityImage={cityImage}
        isVisited={visit !== null}
        isWishlisted={isWishlisted}
        visitStartDate={visit?.startDate ?? null}
        visitEndDate={visit?.endDate ?? null}
        toggleVisit={toggleVisit}
        toggleWishlist={toggleWishlist}
        saveVisitDates={saveVisitDates}
        reviewCount={reviewCount}
        avgScore={avgScore}
        categoryRatings={ratings}
        reviews={reviews}
        moreReviewsHref={
          hasMoreReviews ? `/c/${slug}?reviews=${pages + 1}` : null
        }
        viewerId={viewer.ok ? viewer.user.id : null}
        toggleReviewLike={toggleReviewLike}
        addReviewComment={addReviewComment}
        toggleCommentLike={toggleCommentLike}
        deleteReviewComment={deleteReviewComment}
        submitReview={submitReview}
        isAdmin={isAdmin}
        deleteReview={deleteReview}
        updateOwnReview={updateOwnReview}
        deleteOwnReview={deleteOwnReview}
      />
    </div>
  );
}
