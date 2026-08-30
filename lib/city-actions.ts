"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requireActiveUser } from "@/lib/auth-guards";
import { toActionResult, actionError } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";
import { parseVisitDates } from "@/lib/schemas";

const RATE_LIMIT = 30;

async function authorize(key: string) {
  const auth = await requireActiveUser();
  if (!auth.ok) throw new Error(auth.error);

  if (!(await rateLimit(`${key}:${auth.user.email}`, RATE_LIMIT))) {
    throw new Error("Çok fazla istek. Lütfen biraz sonra tekrar dene.");
  }

  return auth.user;
}

function cityIdOf(formData: FormData): string {
  const cityId = String(formData.get("cityId") ?? "");
  if (!cityId) throw new Error("Şehir bulunamadı");
  return cityId;
}

async function revalidateCity(cityId: string, username: string | null) {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    select: { slug: true },
  });
  if (city) revalidatePath(`/c/${city.slug}`);
  if (username) revalidatePath(`/u/${username}`);
}

/**
 * Adds or removes the visit. Dates on an existing visit are preserved.
 *
 * Marking a city visited also drops it from the wishlist — having been
 * somewhere answers wanting to go. The reverse is not true: removing a visit
 * leaves the wishlist alone, and the wishlist can be set again afterwards.
 */
export async function toggleVisit(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("visit");
    const cityId = cityIdOf(formData);
    const identity = { userId_cityId: { userId: user.id, cityId } };

    const existing = await prisma.visit.findUnique({
      where: identity,
      select: { id: true },
    });

    try {
      if (existing) {
        await prisma.visit.delete({ where: { id: existing.id } });
      } else {
        // One transaction, so a city is never both visited and wishlisted
        // because the second statement failed. deleteMany rather than delete:
        // there may be no wishlist row to remove.
        await prisma.$transaction([
          prisma.visit.create({ data: { userId: user.id, cityId } }),
          prisma.wishlistItem.deleteMany({
            where: { userId: user.id, cityId },
          }),
        ]);
      }
    } catch (error) {
      // P2003 is a foreign key violation — the city id does not exist.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new Error("Şehir bulunamadı");
      }
      throw error;
    }

    await revalidateCity(cityId, user.username);
  });
}

export async function toggleWishlist(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("wishlist");
    const cityId = cityIdOf(formData);
    const identity = { userId_cityId: { userId: user.id, cityId } };

    const existing = await prisma.wishlistItem.findUnique({
      where: identity,
      select: { id: true },
    });

    try {
      if (existing) {
        await prisma.wishlistItem.delete({ where: { id: existing.id } });
      } else {
        await prisma.wishlistItem.create({ data: { userId: user.id, cityId } });
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new Error("Şehir bulunamadı");
      }
      throw error;
    }

    await revalidateCity(cityId, user.username);
  });
}

/**
 * Stores the months of a stay. Empty fields clear the dates, so the same form
 * both sets and removes them.
 */
export async function saveVisitDates(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseVisitDates(formData);
  if (!parsed.ok) return actionError(parsed.error);

  return toActionResult(async () => {
    const user = await authorize("visit-dates");
    const cityId = cityIdOf(formData);

    // upsert rather than update: saving dates on a city the user has not marked
    // yet is a reasonable thing to do, and implies the visit.
    await prisma.visit.upsert({
      where: { userId_cityId: { userId: user.id, cityId } },
      create: {
        userId: user.id,
        cityId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
      },
      update: {
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
      },
    });

    await revalidateCity(cityId, user.username);
  });
}
