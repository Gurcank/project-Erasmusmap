import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MAX_COMMENTS_PER_REVIEW } from "@/lib/engagement";
import type { EngagedReview, ReviewComment } from "@/types";

const AUTHOR_SELECT = {
  select: { id: true, name: true, avatar: true, username: true },
} as const;

/**
 * One comment row. Both the city page and every list away from it read comments
 * through this, so the two cannot drift on what a comment carries.
 */
export const COMMENT_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  parentId: true,
  user: AUTHOR_SELECT,
  _count: { select: { likes: true } },
} as const;

export const COMMENT_QUERY = {
  // Newest first, so that when a thread is longer than the cap it is the oldest
  // comments that are left out. buildCommentTree puts them back in reading order.
  orderBy: { createdAt: "desc" },
  take: MAX_COMMENTS_PER_REVIEW,
  select: COMMENT_SELECT,
} as const;

export type CommentRow = Prisma.ReviewCommentGetPayload<{
  select: typeof COMMENT_SELECT;
}>;

/**
 * Everything the shared review card renders, in one include. Used by every
 * list that shows reviews away from a city's own page — the following feed and
 * both profile tabs — so they cannot drift apart.
 */
export const ENGAGED_REVIEW_INCLUDE = {
  city: { select: { name: true, slug: true } },
  user: AUTHOR_SELECT,
  comments: COMMENT_QUERY,
  _count: { select: { likes: true } },
} satisfies Prisma.ReviewInclude;

export type EngagedReviewRow = Prisma.ReviewGetPayload<{
  include: typeof ENGAGED_REVIEW_INCLUDE;
}>;

/** Which of these comments the viewer has liked. One query for the whole page. */
export async function getLikedCommentIds(
  commentIds: string[],
  viewerId: string | null,
): Promise<Set<string>> {
  if (!viewerId || commentIds.length === 0) return new Set();

  const likes = await prisma.reviewCommentLike.findMany({
    where: { userId: viewerId, commentId: { in: commentIds } },
    select: { commentId: true },
  });
  return new Set(likes.map((like) => like.commentId));
}

/**
 * Flat comment rows into the two-level thread the card renders: top-level
 * comments, each carrying its own replies.
 *
 * A reply whose parent was hidden or deleted would otherwise vanish from the
 * page while still being counted, so it is promoted to the top level rather
 * than dropped.
 */
export function buildCommentTree(
  rows: CommentRow[],
  likedCommentIds: Set<string>,
  hiddenUserIds: Set<string> = new Set(),
): ReviewComment[] {
  // Oldest first: a thread reads top to bottom, and replies follow their parent.
  // The rows arrive newest first (see COMMENT_QUERY).
  const visible = rows
    .filter((row) => !row.user || !hiddenUserIds.has(row.user.id))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const toComment = (row: CommentRow): ReviewComment => ({
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    user: row.user,
    likeCount: row._count.likes,
    likedByViewer: likedCommentIds.has(row.id),
    replies: [],
  });

  const byId = new Map(visible.map((row) => [row.id, toComment(row)]));
  const roots: ReviewComment[] = [];

  for (const row of visible) {
    const comment = byId.get(row.id);
    if (!comment) continue;
    const parent = row.parentId ? byId.get(row.parentId) : undefined;
    if (parent) parent.replies.push(comment);
    else roots.push(comment);
  }

  return roots;
}

/**
 * Adds the things a review row cannot carry on its own: whether the viewer has
 * liked it, its comment thread, and when its author was in that city. All are
 * looked up once for the whole list rather than once per card.
 *
 * `hiddenUserIds` drops comments written by people the viewer has blocked (or
 * who blocked them); filtering the reviews themselves is the caller's job,
 * since each list expresses that differently in its own `where`.
 */
export async function toEngagedReviews(
  rows: EngagedReviewRow[],
  viewerId: string | null,
  hiddenUserIds: string[] = [],
): Promise<EngagedReview[]> {
  if (rows.length === 0) return [];

  const hidden = new Set(hiddenUserIds);
  const authorCityPairs = rows.map((row) => ({
    userId: row.userId ?? "",
    cityId: row.cityId,
  }));
  const commentIds = rows.flatMap((row) =>
    row.comments.map((comment) => comment.id),
  );

  const [viewerLikes, likedCommentIds, stays] = await Promise.all([
    viewerId
      ? prisma.reviewLike.findMany({
          where: { userId: viewerId, reviewId: { in: rows.map((r) => r.id) } },
          select: { reviewId: true },
        })
      : [],
    getLikedCommentIds(commentIds, viewerId),
    prisma.visit.findMany({
      where: { OR: authorCityPairs },
      select: { userId: true, cityId: true, startDate: true, endDate: true },
    }),
  ]);

  const likedIds = new Set(viewerLikes.map((like) => like.reviewId));
  const stayByKey = new Map(
    stays.map((stay) => [`${stay.userId}:${stay.cityId}`, stay]),
  );

  return rows.map((row) => {
    const stay = stayByKey.get(`${row.userId}:${row.cityId}`);
    return {
      id: row.id,
      content: row.content,
      createdAt: row.createdAt,
      culture: row.culture,
      gastronomy: row.gastronomy,
      safety: row.safety,
      socialLife: row.socialLife,
      transport: row.transport,
      costOfLiving: row.costOfLiving,
      user: row.user,
      city: { name: row.city.name, slug: row.city.slug },
      likeCount: row._count.likes,
      likedByViewer: likedIds.has(row.id),
      comments: buildCommentTree(row.comments, likedCommentIds, hidden),
      stayStart: stay?.startDate ?? null,
      stayEnd: stay?.endDate ?? null,
    };
  });
}
