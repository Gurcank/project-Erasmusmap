"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";

export async function deleteReview(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.role !== "ADMIN") {
    throw new Error("Bu işlem için yetkiniz yok");
  }
  if (!rateLimit(`delete-review:${session.user.email}`, 20)) {
    throw new Error("Çok fazla istek. Lütfen biraz sonra tekrar dene.");
  }

  const reviewId = String(formData.get("reviewId") ?? "");
  if (!reviewId) throw new Error("Geçersiz yorum");

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      city: { select: { slug: true } },
      user: { select: { username: true } },
    },
  });
  if (!review) return;

  await prisma.review.delete({ where: { id: reviewId } });

  revalidatePath(`/c/${review.city.slug}`);
  if (review.user?.username) revalidatePath(`/u/${review.user.username}`);
}
