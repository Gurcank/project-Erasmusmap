"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requireActiveUser } from "@/lib/auth-guards";
import { UserFacingError, toActionResult } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";

const RATE_LIMIT = 30;

async function authorize(key: string) {
  const auth = await requireActiveUser();
  if (!auth.ok) throw new UserFacingError(auth.error);

  if (!(await rateLimit(`${key}:${auth.user.email}`, RATE_LIMIT))) {
    throw new UserFacingError(
      "Çok fazla istek. Lütfen biraz sonra tekrar dene.",
    );
  }

  return auth.user;
}

function targetIdOf(formData: FormData): string {
  const id = String(formData.get("targetUserId") ?? "");
  if (!id) throw new UserFacingError("Kullanıcı bulunamadı");
  return id;
}

async function revalidateProfiles(...userIds: string[]) {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { username: true },
  });
  for (const user of users) {
    if (user.username) revalidatePath(`/u/${user.username}`);
  }
}

/** Follows the target, or unfollows if already followed. */
export async function toggleFollow(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("follow");
    const targetId = targetIdOf(formData);

    if (targetId === user.id)
      throw new UserFacingError("Kendini takip edemezsin");

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) throw new UserFacingError("Kullanıcı bulunamadı");

    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: user.id, blockedId: targetId },
          { blockerId: targetId, blockedId: user.id },
        ],
      },
      select: { id: true },
    });
    if (blocked) throw new UserFacingError("Bu kullanıcıyı takip edemezsin");

    const identity = {
      followerId_followingId: { followerId: user.id, followingId: targetId },
    };
    const existing = await prisma.follow.findUnique({
      where: identity,
      select: { id: true },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
    } else {
      await prisma.follow.create({
        data: { followerId: user.id, followingId: targetId },
      });
    }

    await revalidateProfiles(user.id, targetId);
  });
}

/**
 * Blocks the target, or unblocks if already blocked. Blocking also tears down
 * any follow edge in either direction — a blocked pair cannot be connected.
 */
export async function toggleBlock(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("block");
    const targetId = targetIdOf(formData);

    if (targetId === user.id)
      throw new UserFacingError("Kendini engelleyemezsin");

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) throw new UserFacingError("Kullanıcı bulunamadı");

    const identity = {
      blockerId_blockedId: { blockerId: user.id, blockedId: targetId },
    };
    const existing = await prisma.block.findUnique({
      where: identity,
      select: { id: true },
    });

    if (existing) {
      await prisma.block.delete({ where: { id: existing.id } });
    } else {
      await prisma.$transaction([
        prisma.block.create({
          data: { blockerId: user.id, blockedId: targetId },
        }),
        prisma.follow.deleteMany({
          where: {
            OR: [
              { followerId: user.id, followingId: targetId },
              { followerId: targetId, followingId: user.id },
            ],
          },
        }),
      ]);
    }

    await revalidateProfiles(user.id, targetId);
    revalidatePath("/settings");
    revalidatePath("/meydan");
  });
}
