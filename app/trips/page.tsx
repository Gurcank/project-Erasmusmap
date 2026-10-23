import { localizedMetadata } from "@/lib/page-meta";
import { redirect } from "next/navigation";
import TripsContent from "@/components/trips/TripsContent";
import { requireActiveUser } from "@/lib/auth-guards";
import { getUserTrips } from "@/lib/trips";

export const generateMetadata = () =>
  localizedMetadata((_t, tt) => ({
    title: tt.myTrips,
    robots: { index: false, follow: false },
  }));

export default async function TripsPage() {
  const viewer = await requireActiveUser();
  if (!viewer.ok) redirect("/login");

  const trips = await getUserTrips(viewer.user.id, true);
  return <TripsContent trips={trips} />;
}
