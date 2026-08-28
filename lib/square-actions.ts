"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requireActiveUser, requireAdmin } from "@/lib/auth-guards";
import { toActionResult } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";
import { MAX_REPLY_LENGTH } from "@/lib/engagement";

const LIKE_RATE_LIMIT = 60;
const REPLY_RATE_LIMIT = 15;

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

    try {
      await prisma.reviewComment.create({
        data: { reviewId, userId: user.id, content },
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
    const auth = await requireActiveUser();
    if (!auth.ok) throw new Error(auth.error);

    const commentId = String(formData.get("commentId") ?? "");
    if (!commentId) throw new Error("Yanıt bulunamadı");

    const comment = await prisma.reviewComment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, reviewId: true },
    });
    if (!comment) return;

    if (comment.userId !== auth.user.id) {
      const admin = await requireAdmin();
      if (!admin.ok) throw new Error("Bu işlem için yetkiniz yok");
    }

    await prisma.reviewComment.delete({ where: { id: comment.id } });
    await revalidateReview(comment.reviewId);
  });
}
