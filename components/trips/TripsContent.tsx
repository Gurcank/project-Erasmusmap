"use client";

import { Plus, Route } from "lucide-react";
import { GlassLink } from "@/components/ui/GlassButton";
import TripCard from "@/components/trips/TripCard";
import { useTripT } from "@/hooks/useTripT";
import type { TripSummary } from "@/lib/trip-types";

export default function TripsContent({ trips }: { trips: TripSummary[] }) {
  const { tt } = useTripT();

  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-24 sm:px-6 md:px-8">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-display font-bold text-on-backdrop">
            {tt.tripsTitle}
          </h1>
          <p className="mt-3 text-on-backdrop-muted">{tt.tripsIntro}</p>
        </div>
        <GlassLink href="/trips/new" variant="primary" size="lg">
          <Plus size={16} aria-hidden="true" className="mr-1.5" />
          {tt.newTrip}
        </GlassLink>
      </div>

      {trips.length === 0 ? (
        <div className="glass flex flex-col items-center gap-4 rounded-panel border border-border bg-surface px-6 py-16 text-center">
          <Route size={36} aria-hidden="true" className="text-accent-text" />
          <p className="text-text-muted">{tt.noTrips}</p>
          <GlassLink href="/trips/new" variant="primary">
            {tt.noTripsCta}
          </GlassLink>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
