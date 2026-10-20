import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import TripPlanner from "@/components/trips/TripPlanner";
import { requireActiveUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getHiddenUserIds } from "@/lib/social";
import { getTripForViewer } from "@/lib/trips";
import { fetchCityPhoto } from "@/lib/unsplash";
import {
  addTripCity,
  addTripTodo,
  deleteTrip,
  deleteTripExpense,
  deleteTripItem,
  deleteTripPhoto,
  deleteTripTodo,
  removeTripCity,
  saveTripCityNotes,
  saveTripExpense,
  saveTripItem,
  setTripVisibility,
  toggleTripTodo,
  updateTrip,
} from "@/lib/trip-actions";
import { isStorageConfigured } from "@/lib/storage";

// Shared by generateMetadata and the page, so one request reads the trip once.
const loadTrip = cache(async (id: string) => {
  const viewer = await requireActiveUser();
  const viewerId = viewer.ok ? viewer.user.id : null;
  const hidden = await getHiddenUserIds(viewerId);
  return getTripForViewer(id, viewerId, hidden);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await loadTrip(id);
  if (!result) notFound();

  const { trip } = result;
  return {
    title: trip.title,
    description: trip.description ?? undefined,
    // Only a public plan is meant to be found; a private one is the owner's.
    robots:
      trip.visibility === "PUBLIC"
        ? undefined
        : { index: false, follow: false },
  };
}

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await loadTrip(id);
  if (!result) notFound();

  const { trip, isOwner } = result;

  // City photos are cached on the City row. Fill any that are missing once the
  // response is out, the same way the city page does, so the next view of the
  // plan has them.
  const missing = trip.cities
    .filter((entry) => !entry.city.imageUrl)
    .map((entry) => entry.city);
  if (missing.length > 0) {
    after(async () => {
      for (const city of missing) {
        const photo = await fetchCityPhoto(city.name);
        if (photo) {
          await prisma.city.update({
            where: { id: city.id },
            data: { imageUrl: photo },
          });
        }
      }
    });
  }

  return (
    <TripPlanner
      trip={trip}
      isOwner={isOwner}
      uploadsEnabled={isOwner && isStorageConfigured()}
      actions={{
        updateTrip,
        deleteTrip,
        setTripVisibility,
        saveTripItem,
        deleteTripItem,
        saveTripExpense,
        deleteTripExpense,
        addTripCity,
        removeTripCity,
        saveTripCityNotes,
        addTripTodo,
        toggleTripTodo,
        deleteTripTodo,
        deleteTripPhoto,
      }}
    />
  );
}
