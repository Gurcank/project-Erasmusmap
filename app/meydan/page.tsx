import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import SquareContent from "@/components/ui/SquareContent";
import { getTrendingCities, getTrendingReviews } from "@/lib/trending";
import { requireActiveUser } from "@/lib/auth-guards";
import { deleteReview } from "@/lib/actions";
import {
  addReviewComment,
  deleteReviewComment,
  toggleReviewLike,
} from "@/lib/square-actions";
import type { EngagedReview, ReviewAuthor } from "@/types";

type ReplyRow = {
  id: string;
  reviewId: string;
  content: string;
  createdAt: Date;
  user: ReviewAuthor | null;
};

export const metadata: Metadata = {
  title: "Meydan",
  description:
    "Erasmus öğrencilerinin bu ay en çok konuştuğu şehirler ve öne çıkan yorumlar.",
};

export default async function SquarePage() {
  const [cities, trending, viewer] = await Promise.all([
    getTrendingCities(),
    getTrendingReviews(),
    requireActiveUser(),
  ]);

  const viewerId = viewer.ok ? viewer.user.id : null;
  const reviewIds = trending.map((review) => review.id);

  // Replies and the viewer's own likes are fetched in two queries rather than
  // per review, which would be a query per card.
  const [replies, viewerLikes]: [ReplyRow[], { reviewId: string }[]] =
    await Promise.all([
      reviewIds.length
        ? prisma.reviewComment.findMany({
            where: { reviewId: { in: reviewIds } },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              reviewId: true,
              content: true,
              createdAt: true,
              user: {
                select: { id: true, name: true, username: true, image: true },
              },
            },
          })
        : [],
      viewerId && reviewIds.length
        ? prisma.reviewLike.findMany({
            where: { userId: viewerId, reviewId: { in: reviewIds } },
            select: { reviewId: true },
          })
        : [],
    ]);

  const likedReviewIds = new Set(viewerLikes.map((like) => like.reviewId));
  const repliesByReview = new Map<string, ReplyRow[]>();
  for (const reply of replies) {
    const bucket = repliesByReview.get(reply.reviewId);
    if (bucket) bucket.push(reply);
    else repliesByReview.set(reply.reviewId, [reply]);
  }

  const reviews: EngagedReview[] = trending.map((review) => ({
    id: review.id,
    content: review.content,
    createdAt: review.createdAt,
    culture: review.culture,
    gastronomy: review.gastronomy,
    safety: review.safety,
    socialLife: review.socialLife,
    transport: review.transport,
    costOfLiving: review.costOfLiving,
    city: { name: review.cityName, slug: review.citySlug },
    user: review.authorId
      ? {
          id: review.authorId,
          name: review.authorName,
          username: review.authorUsername,
          image: review.authorImage,
        }
      : null,
    likeCount: review.likeCount,
    likedByViewer: likedReviewIds.has(review.id),
    replies: (repliesByReview.get(review.id) ?? []).map((reply) => ({
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      user: reply.user,
    })),
  }));

  return (
    <div className="min-h-screen bg-canvas pt-24">
      <SquareContent
        cities={cities}
        reviews={reviews}
        viewerId={viewerId}
        isAdmin={viewer.ok && viewer.user.role === "ADMIN"}
        toggleReviewLike={toggleReviewLike}
        addReviewComment={addReviewComment}
        deleteReviewComment={deleteReviewComment}
        deleteReview={deleteReview}
      />
    </div>
  );
}
