"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requireActiveUser, requireAdmin } from "@/lib/auth-guards";
import { toActionResult } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";
import { MAX_REPLY_LENGTH } from "@/lib/engagement";
import { parseRatings, parseReviewContent } from "@/lib/review";
import { parseVisitDates } from "@/lib/schemas";
import { moderate } from "@/lib/moderation";

const LIKE_RATE_LIMIT = 60;
const REPLY_RATE_LIMIT = 15;
const REVIEW_EDIT_RATE_LIMIT = 20;

async function authorize(key: string, limit: number) {
  const auth = await requireActiveUser();
  if (!auth.ok) throw new Error(auth.error);

  if (!(await rateLimit(`${key}:${auth.user.email}`, limit))) {
    throw new Error("Çok fazla istek. Lütfen biraz sonra tekrar dene.");
  }

  return auth.user;
}

/** Revalidates every surface a review can appear on. */
async function revalidateReview(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { city: { select: { slug: true } } },
  });
  if (review) revalidatePath(`/c/${review.city.slug}`);
  revalidatePath("/meydan");
}

/** Loads a review the signed-in user owns, or throws. */
async function requireOwnReview(reviewId: string, userId: string) {
  if (!reviewId) throw new Error("Yorum bulunamadı");

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      userId: true,
      cityId: true,
      city: { select: { slug: true } },
      user: { select: { username: true } },
    },
  });
  if (!review) throw new Error("Yorum bulunamadı");
  if (review.userId !== userId) {
    throw new Error("Bu işlem için yetkiniz yok");
  }
  return review;
}

/** City, meydan, and the author's profile all list the review. */
function revalidateOwnReview(review: {
  city: { slug: string };
  user: { username: string | null } | null;
}) {
  revalidatePath(`/c/${review.city.slug}`);
  revalidatePath("/meydan");
  if (review.user?.username) revalidatePath(`/u/${review.user.username}`);
}

export async function updateOwnReview(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("review-edit", REVIEW_EDIT_RATE_LIMIT);

    const reviewId = String(formData.get("reviewId") ?? "");
    const review = await requireOwnReview(reviewId, user.id);

    const ratings = parseRatings(formData);
    const content = parseReviewContent(formData);
    const stay = parseVisitDates(formData);
    if (!stay.ok) throw new Error(stay.error);
    const moderated = moderate(content);

    await prisma.review.update({
      where: { id: reviewId },
      data: { ...ratings, content: moderated.text, flagged: moderated.flagged },
    });

    // The stay lives on the visit, not the review, so it is written separately.
    const { startDate, endDate } = stay.data;
    if (startDate || endDate) {
      await prisma.visit.upsert({
        where: { userId_cityId: { userId: user.id, cityId: review.cityId } },
        create: {
          userId: user.id,
          cityId: review.cityId,
          startDate,
          endDate,
        },
        update: { startDate, endDate },
      });
    } else {
      // Clearing both ends only touches a visit that already exists — editing a
      // review without filling the dates must not silently create one.
      await prisma.visit.updateMany({
        where: { userId: user.id, cityId: review.cityId },
        data: { startDate: null, endDate: null },
      });
    }

    revalidateOwnReview(review);
  });
}

export async function deleteOwnReview(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("review-delete", REVIEW_EDIT_RATE_LIMIT);

    const reviewId = String(formData.get("reviewId") ?? "");
    const review = await requireOwnReview(reviewId, user.id);

    await prisma.review.delete({ where: { id: reviewId } });

    revalidateOwnReview(review);
  });
}

export async function toggleReviewLike(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("review-like", LIKE_RATE_LIMIT);

    const reviewId = String(formData.get("reviewId") ?? "");
    if (!reviewId) throw new Error("Yorum bulunamadı");

    const identity = { userId_reviewId: { userId: user.id, reviewId } };
    const existing = await prisma.reviewLike.findUnique({
      where: identity,
      select: { id: true },
    });

    try {
      if (existing) {
        await prisma.reviewLike.delete({ where: { id: existing.id } });
      } else {
        await prisma.reviewLike.create({ data: { userId: user.id, reviewId } });
      }
    } catch (error) {
      // P2003: the review was deleted between the read and the write.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new Error("Yorum bulunamadı");
      }
      throw error;
    }

    await revalidateReview(reviewId);
  });
}

/**
 * Which comment a new reply hangs off. Replying to a reply attaches to that
 * reply's own parent, so the thread stays two levels deep however deep into it
 * someone clicks — the same rule Instagram uses.
 */
async function resolveCommentParent(
  requested: string,
  reviewId: string,
): Promise<string | null> {
  if (!requested) return null;

  const parent = await prisma.reviewComment.findUnique({
    where: { id: requested },
    select: { id: true, reviewId: true, parentId: true },
  });
  if (!parent || parent.reviewId !== reviewId) {
    throw new Error("Yanıt verilecek yorum bulunamadı");
  }
  return parent.parentId ?? parent.id;
}

export async function toggleCommentLike(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("comment-like", LIKE_RATE_LIMIT);

    const commentId = String(formData.get("commentId") ?? "");
    if (!commentId) throw new Error("Yorum bulunamadı");

    const comment = await prisma.reviewComment.findUnique({
      where: { id: commentId },
      select: { reviewId: true },
    });
    if (!comment) throw new Error("Yorum bulunamadı");

    const identity = { userId_commentId: { userId: user.id, commentId } };
    const existing = await prisma.reviewCommentLike.findUnique({
      where: identity,
      select: { id: true },
    });

    try {
      if (existing) {
        await prisma.reviewCommentLike.delete({ where: { id: existing.id } });
      } else {
        await prisma.reviewCommentLike.create({
          data: { userId: user.id, commentId },
        });
      }
    } catch (error) {
      // P2003: the comment was deleted between the read and the write.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        return;
      }
      throw error;
    }

    await revalidateReview(comment.reviewId);
  });
}

export async function addReviewComment(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("review-comment", REPLY_RATE_LIMIT);

    const reviewId = String(formData.get("reviewId") ?? "");
    if (!reviewId) throw new Error("Yorum bulunamadı");

    const content = String(formData.get("content") ?? "").trim();
    if (!content) throw new Error("Yanıt boş olamaz");
    if (content.length > MAX_REPLY_LENGTH) {
      throw new Error(`Yanıt en fazla ${MAX_REPLY_LENGTH} karakter olabilir`);
    }

    const parentId = await resolveCommentParent(
      String(formData.get("parentId") ?? ""),
      reviewId,
    );
    const moderated = moderate(content);

    try {
      await prisma.reviewComment.create({
        data: {
          reviewId,
          userId: user.id,
          content: moderated.text,
          parentId,
          flagged: moderated.flagged,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new Error("Yorum bulunamadı");
      }
      throw error;
    }

    await revalidateReview(reviewId);
  });
}

/** Deletable by its author, or by an admin moderating the thread. */
export async function deleteReviewComment(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("review-comment-delete", REPLY_RATE_LIMIT);

    const commentId = String(formData.get("commentId") ?? "");
    if (!commentId) throw new Error("Yanıt bulunamadı");

    const comment = await prisma.reviewComment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, reviewId: true },
    });
    if (!comment) return;

    if (comment.userId !== user.id) {
      const admin = await requireAdmin();
      if (!admin.ok) throw new Error("Bu işlem için yetkiniz yok");
    }

    await prisma.reviewComment.delete({ where: { id: comment.id } });
    await revalidateReview(comment.reviewId);
  });
}
