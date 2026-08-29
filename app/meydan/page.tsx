import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import MapBackground from "@/components/map/Map";
import SquareContent from "@/components/ui/SquareContent";
import { getTrendingCities, getTrendingReviews } from "@/lib/trending";
import { getFollowingFeed } from "@/lib/feed";
import { requireActiveUser } from "@/lib/auth-guards";
import { getHiddenUserIds } from "@/lib/social";
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
  const viewer = await requireActiveUser();
  const viewerId = viewer.ok ? viewer.user.id : null;

  const [cities, trending, hiddenUserIds, feed] = await Promise.all([
    getTrendingCities(),
    getTrendingReviews(viewerId),
    getHiddenUserIds(viewerId).then((ids) => new Set(ids)),
    getFollowingFeed(viewerId),
  ]);

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
    if (reply.user && hiddenUserIds.has(reply.user.id)) continue;
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
    stayStart: review.stayStart,
    stayEnd: review.stayEnd,
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
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10">
        <MapBackground isStatic />
      </div>
      <div className="relative z-10 min-h-screen bg-canvas/90 pt-24 backdrop-blur-sm">
        <SquareContent
          cities={cities}
          reviews={reviews}
          feed={feed.reviews}
          feedFollowingCount={feed.followingCount}
          viewerSignedIn={viewerId !== null}
          viewerId={viewerId}
          isAdmin={viewer.ok && viewer.user.role === "ADMIN"}
          toggleReviewLike={toggleReviewLike}
          addReviewComment={addReviewComment}
          deleteReviewComment={deleteReviewComment}
          deleteReview={deleteReview}
        />
      </div>
    </div>
  );
}
