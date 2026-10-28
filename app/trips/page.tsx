import { localizedMetadata } from "@/lib/page-meta";
import { redirect } from "next/navigation";
import TripsContent from "@/components/trips/TripsContent";
import { requireActiveUser } from "@/lib/auth-guards";
import { getSharedTrips, getTripInvites, getUserTrips } from "@/lib/trips";

export const generateMetadata = () =>
  localizedMetadata((_t, tt) => ({
    title: tt.myTrips,
    robots: { index: false, follow: false },
  }));

export default async function TripsPage() {
  const viewer = await requireActiveUser();
  if (!viewer.ok) redirect("/login");

  const id = viewer.user.id;
  const [trips, invites, shared] = await Promise.all([
    getUserTrips(id, true),
    getTripInvites(id),
    getSharedTrips(id),
  ]);
  return <TripsContent trips={trips} invites={invites} shared={shared} />;
}
