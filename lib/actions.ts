"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { authorizeAction } from "@/lib/action-guard";
import { UserFacingError, toActionResult } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";

function authorizeAdminAction(key: string, limit = 20) {
  return authorizeAction(key, { limit, admin: true });
}

export async function deleteReview(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    await authorizeAdminAction("delete-review");

    const reviewId = String(formData.get("reviewId") ?? "");
    if (!reviewId) throw new UserFacingError("Geçersiz yorum");

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
    revalidatePath("/admin");
  });
}

export async function banUser(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const admin = await authorizeAdminAction("admin-ban", 30);

    const userId = String(formData.get("userId") ?? "");
    if (!userId) throw new UserFacingError("Geçersiz kullanıcı");

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, banned: true },
    });
    if (!target) return;
    if (target.id === admin.id) {
      throw new UserFacingError("Kendi hesabınızı askıya alamazsınız");
    }
    if (target.role === "ADMIN") {
      throw new UserFacingError("Başka bir admini askıya alamazsınız");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { banned: !target.banned },
    });

    revalidatePath("/admin");
  });
}

export async function deleteUser(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const admin = await authorizeAdminAction("admin-delete-user", 30);

    const userId = String(formData.get("userId") ?? "");
    if (!userId) throw new UserFacingError("Geçersiz kullanıcı");

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target) return;
    if (target.id === admin.id) {
      throw new UserFacingError("Kendi hesabınızı silemezsiniz");
    }
    if (target.role === "ADMIN") {
      throw new UserFacingError("Başka bir admini silemezsiniz");
    }

    await prisma.user.delete({ where: { id: userId } });

    revalidatePath("/admin");
  });
}
