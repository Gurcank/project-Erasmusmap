import { prisma } from "@/lib/prisma";
import { fetchCityPhoto } from "@/lib/unsplash";

/**
 * Fetches and stores the photo of each city that has none yet.
 *
 * The photo is cached on the City row so the trending lists and profile
 * favourites have one without a per-request Unsplash call. Callers run this
 * from `after()`, so a first visitor does not wait on Unsplash; the photo shows
 * from the next view on.
 */
export async function cacheCityPhotos(
  cities: { id: string; name: string }[],
): Promise<void> {
  for (const city of cities) {
    const photo = await fetchCityPhoto(city.name);
    if (photo) {
      await prisma.city.update({
        where: { id: city.id },
        data: { imageUrl: photo },
      });
    }
  }
}
