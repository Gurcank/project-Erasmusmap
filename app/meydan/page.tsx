import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import SquareContent from "@/components/ui/SquareContent";
import { getTrendingCities, getTrendingReviews } from "@/lib/trending";
import { getFollowingFeed } from "@/lib/feed";
import { requireActiveUser } from "@/lib/auth-guards";
import { getHiddenUserIds } from "@/lib/social";
import {
  buildCommentTree,
  COMMENT_QUERY,
  COMMENT_SELECT,
  getLikedCommentIds,
  type CommentRow,
} from "@/lib/review-shape";
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

type ReplyRow = {
  id: string;
  reviewId: string;
} & CommentRow;

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

  // Comments and the viewer's own likes are fetched in two queries rather than
  // per review, which would be a query per card.
  const [replies, viewerLikes]: [ReplyRow[], { reviewId: string }[]] =
    await Promise.all([
      reviewIds.length
        ? prisma.reviewComment.findMany({
            where: { reviewId: { in: reviewIds } },
            orderBy: COMMENT_QUERY.orderBy,
            select: { ...COMMENT_SELECT, reviewId: true },
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
  const likedCommentIds = await getLikedCommentIds(
    replies.map((reply) => reply.id),
    viewerId,
  );
  // buildCommentTree drops the hidden authors, so the buckets stay raw.
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
    stayStart: review.stayStart,
    stayEnd: review.stayEnd,
    user: review.authorId
      ? {
          id: review.authorId,
          name: review.authorName,
          username: review.authorUsername,
          avatar: review.authorAvatar,
        }
      : null,
    likeCount: review.likeCount,
    likedByViewer: likedReviewIds.has(review.id),
    comments: buildCommentTree(
      repliesByReview.get(review.id) ?? [],
      likedCommentIds,
      hiddenUserIds,
    ),
  }));

  return (
    <div className="min-h-screen pt-24">
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
        toggleCommentLike={toggleCommentLike}
        deleteReviewComment={deleteReviewComment}
        deleteReview={deleteReview}
        updateOwnReview={updateOwnReview}
        deleteOwnReview={deleteOwnReview}
      />
    </div>
  );
}
