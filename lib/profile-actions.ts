"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorizeAction } from "@/lib/action-guard";
import { UserFacingError, toActionResult } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";
import { fetchCityPhoto } from "@/lib/unsplash";
import { MAX_FAVORITE_CITIES } from "@/lib/profile";

const RATE_LIMIT = 30;

function authorize(key: string) {
  return authorizeAction(key, { limit: RATE_LIMIT });
}

/**
 * Pins a city to one of the four profile slots.
 *
 * The city's photo is cached on the City row here rather than fetched per
 * render: the favourites grid shows four photos at once, and hitting Unsplash
 * four times on every profile view would be both slow and rate limited.
 */
export async function addFavoriteCity(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("favorite");

    const cityId = String(formData.get("cityId") ?? "");
    if (!cityId) throw new UserFacingError("Şehir bulunamadı");

    const city = await prisma.city.findUnique({
      where: { id: cityId },
      select: { id: true, name: true, imageUrl: true },
    });
    if (!city) throw new UserFacingError("Şehir bulunamadı");

    const taken = await prisma.favoriteCity.findMany({
      where: { userId: user.id },
      select: { position: true, cityId: true },
    });

    if (taken.some((entry) => entry.cityId === cityId)) {
      throw new UserFacingError("Bu şehir zaten listende");
    }

    const position = Array.from(
      { length: MAX_FAVORITE_CITIES },
      (_, i) => i,
    ).find((slot) => !taken.some((entry) => entry.position === slot));
    if (position === undefined) {
      throw new UserFacingError(
        `En fazla ${MAX_FAVORITE_CITIES} şehir seçebilirsin`,
      );
    }

    if (!city.imageUrl) {
      const imageUrl = await fetchCityPhoto(city.name);
      if (imageUrl) {
        await prisma.city.update({
          where: { id: city.id },
          data: { imageUrl },
        });
      }
    }

    try {
      await prisma.favoriteCity.create({
        data: { userId: user.id, cityId, position },
      });
    } catch (error) {
      // Two rapid submissions can race for the same slot.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new UserFacingError("Bu şehir zaten listende");
      }
      throw error;
    }

    if (user.username) revalidatePath(`/u/${user.username}`);
  });
}

export async function removeFavoriteCity(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("favorite");

    const cityId = String(formData.get("cityId") ?? "");
    if (!cityId) throw new UserFacingError("Şehir bulunamadı");

    await prisma.favoriteCity.deleteMany({
      where: { userId: user.id, cityId },
    });

    if (user.username) revalidatePath(`/u/${user.username}`);
  });
}
