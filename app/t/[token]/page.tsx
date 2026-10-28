import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import TripPlanner from "@/components/trips/TripPlanner";
import { requireActiveUser } from "@/lib/auth-guards";
import { rateLimit } from "@/lib/rate-limit";
import { getClientAddress } from "@/lib/request-ip";
import { getHiddenUserIds } from "@/lib/social";
import {
  addTripCity,
  addTripTodo,
  deleteTrip,
  deleteTripExpense,
  deleteTripItem,
  deleteTripTodo,
  removeTripCity,
  rotateShareLink,
  saveTripCityNotes,
  saveTripExpense,
  saveTripItem,
  setTripVisibility,
  toggleTripTodo,
  updateTrip,
} from "@/lib/trip-actions";
import { memberAccess } from "@/lib/trip-access";
import { getTripByShareToken } from "@/lib/trips";

// A link opens a plan for reading only, and the link itself is a secret: the
// page is never indexed, never cached, and never passes the address on.
const REQUESTS_PER_MINUTE = 30;

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Per address, so a script cannot walk the token space. Over the limit looks
  // the same as a link that does not work.
  const address = getClientAddress(await headers());
  if (!(await rateLimit(`trip-link:${address}`, REQUESTS_PER_MINUTE))) {
    notFound();
  }

  const viewer = await requireActiveUser();
  const viewerId = viewer.ok ? viewer.user.id : null;
  const hidden = await getHiddenUserIds(viewerId);
  const result = await getTripByShareToken(token, viewerId, hidden);
  if (!result) notFound();

  // The owner and the members have the full plan at its own address.
  if (viewerId) {
    const trip = { id: result.trip.id, userId: result.trip.owner.id };
    if (await memberAccess(trip, viewerId)) redirect(`/trips/${trip.id}`);
  }

  return (
    <TripPlanner
      trip={result.trip}
      isOwner={false}
      actions={{
        updateTrip,
        deleteTrip,
        setTripVisibility,
        rotateShareLink,
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
      }}
    />
  );
}
