import type { Metadata } from "next";
import { redirect } from "next/navigation";
import TripsContent from "@/components/trips/TripsContent";
import { requireActiveUser } from "@/lib/auth-guards";
import { getUserTrips } from "@/lib/trips";

export const metadata: Metadata = {
  title: "Seyahatlerim",
  robots: { index: false, follow: false },
};

export default async function TripsPage() {
  const viewer = await requireActiveUser();
  if (!viewer.ok) redirect("/login");

  const trips = await getUserTrips(viewer.user.id, true);
  return <TripsContent trips={trips} />;
}
