import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import CityContent from "@/components/ui/CityContent";
import { parseRatings, parseReviewContent, averageRating } from "@/lib/review";
import type { CategoryRatings } from "@/types";
import { rateLimit } from "@/lib/rate-limit";
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
  toggleVisit,
  toggleWishlist,
} from "@/lib/city-actions";
import { requireActiveUser } from "@/lib/auth-guards";
import { getHiddenUserIds } from "@/lib/social";
import { moderate } from "@/lib/moderation";
import {
  buildCommentTree,
  COMMENT_QUERY,
  getLikedCommentIds,
} from "@/lib/review-shape";
import { fetchCityPhoto } from "@/lib/unsplash";
import { toActionResult } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";

const DUPLICATE_REVIEW_MESSAGE = "Bu şehre zaten yorum yaptınız.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = await prisma.city.findUnique({
    where: { slug },
    select: { name: true, country: true },
  });
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [city, viewer] = await Promise.all([
    prisma.city.findUnique({
      where: { slug },
      include: {
        reviews: {
          include: {
            user: {
              select: { id: true, name: true, image: true, username: true },
            },
            comments: COMMENT_QUERY,
            _count: { select: { likes: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    requireActiveUser(),
  ]);

  if (!city) notFound();

  // Blocked users' reviews and replies never render.
  const hiddenUserIds = new Set(
    await getHiddenUserIds(viewer.ok ? viewer.user.id : null),
  );
  const visibleReviews = city.reviews.filter(
    (review) => !review.user || !hiddenUserIds.has(review.user.id),
  );

  const identity = viewer.ok
    ? { userId_cityId: { userId: viewer.user.id, cityId: city.id } }
    : null;

  const [visit, wishlistItem] = identity
    ? await Promise.all([
        prisma.visit.findUnique({
          where: identity,
          select: { startDate: true, endDate: true },
        }),
        prisma.wishlistItem.findUnique({
          where: identity,
          select: { id: true },
        }),
      ])
    : [null, null];
  const isAdmin = viewer.ok && viewer.user.role === "ADMIN";
  const cityId = city.id;

  async function submitReview(
    _previousState: ActionResult | null,
    formData: FormData,
  ): Promise<ActionResult> {
    "use server";
    return toActionResult(async () => {
      const auth = await requireActiveUser();
      if (!auth.ok) throw new Error(auth.error);

      if (!(await rateLimit(`review:${auth.user.email}`)))
        throw new Error("Çok fazla istek. Lütfen biraz sonra tekrar dene.");

      const ratings = parseRatings(formData);
      const moderated = moderate(parseReviewContent(formData));

      try {
        await prisma.review.create({
          data: {
            cityId,
            userId: auth.user.id,
            ...ratings,
            content: moderated.text,
            flagged: moderated.flagged,
            isApproved: true,
          },
        });
      } catch (error) {
        // The unique index is the real guard against a double submission; a
        // pre-check would still lose the race between two concurrent requests.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error(DUPLICATE_REVIEW_MESSAGE);
        }
        throw error;
      }

      // Reviewing a city implies having been there. upsert keeps any dates
      // the user already recorded for that visit.
      await prisma.visit.upsert({
        where: { userId_cityId: { userId: auth.user.id, cityId } },
        create: { userId: auth.user.id, cityId },
        update: {},
      });
      revalidatePath(`/c/${slug}`);
    });
  }

  // One query for the viewer's likes across every review on the page, rather
  // than one per card.
  const viewerLikes = viewer.ok
    ? await prisma.reviewLike.findMany({
        where: {
          userId: viewer.user.id,
          reviewId: { in: visibleReviews.map((review) => review.id) },
        },
        select: { reviewId: true },
      })
    : [];
  const likedReviewIds = new Set(viewerLikes.map((like) => like.reviewId));
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
  const authorVisits = authorIds.length
    ? await prisma.visit.findMany({
        where: { cityId: city.id, userId: { in: authorIds } },
        select: { userId: true, startDate: true, endDate: true },
      })
    : [];
  // Keyed by a plain object, not a Map — `Map` is the map component here.
  const stayByUser: Record<
    string,
    { startDate: Date | null; endDate: Date | null }
  > = {};
  for (const visit of authorVisits) {
    stayByUser[visit.userId] = {
      startDate: visit.startDate,
      endDate: visit.endDate,
    };
  }

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

  // The photo is cached on the City row so the trending lists and profile
  // favourites have one without a per-request Unsplash call. Fetch and store
  // it the first time someone opens the city; every later view reads the row.
  let cityImage = city.imageUrl;
  if (!cityImage) {
    cityImage = await fetchCityPhoto(city.name);
    if (cityImage) {
      await prisma.city.update({
        where: { id: city.id },
        data: { imageUrl: cityImage },
      });
    }
  }

  const ratingData = await prisma.review.aggregate({
    where: { cityId: city.id },
    _avg: {
      culture: true,
      gastronomy: true,
      safety: true,
      socialLife: true,
      transport: true,
      costOfLiving: true,
    },
    _count: { id: true },
  });

  const reviewCount = ratingData._count.id ?? 0;
  const avg = ratingData._avg;
  const ratings: CategoryRatings = {
    culture: avg.culture ?? 0,
    gastronomy: avg.gastronomy ?? 0,
    safety: avg.safety ?? 0,
    socialLife: avg.socialLife ?? 0,
    transport: avg.transport ?? 0,
    costOfLiving: avg.costOfLiving ?? 0,
  };
  const avgScore = reviewCount > 0 ? (averageRating(ratings) ?? 0) : 0;

  return (
    <div className="min-h-screen pt-16">
      <CityContent
        cityId={city.id}
        cityName={city.name}
        cityImage={cityImage}
        isVisited={visit !== null}
        isWishlisted={wishlistItem !== null}
        visitStartDate={visit?.startDate ?? null}
        visitEndDate={visit?.endDate ?? null}
        toggleVisit={toggleVisit}
        toggleWishlist={toggleWishlist}
        saveVisitDates={saveVisitDates}
        reviewCount={reviewCount}
        avgScore={avgScore}
        categoryRatings={ratings}
        reviews={reviews}
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
