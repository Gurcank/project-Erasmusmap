import { localizedMetadata } from "@/lib/page-meta";
import { redirect } from "next/navigation";
import TripForm from "@/components/trips/TripForm";
import { requireActiveUser } from "@/lib/auth-guards";
import { createTrip } from "@/lib/trip-actions";

export const generateMetadata = () =>
  localizedMetadata((_t, tt) => ({
    title: tt.newTripTitle,
    robots: { index: false, follow: false },
  }));

export default async function NewTripPage() {
  const viewer = await requireActiveUser();
  if (!viewer.ok) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 pt-28 pb-24 sm:px-6">
      <TripForm action={createTrip} />
    </div>
  );
}
