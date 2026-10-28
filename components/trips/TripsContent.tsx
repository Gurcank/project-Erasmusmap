"use client";

import { Plus, Route } from "lucide-react";
import ActionForm from "@/components/ui/ActionForm";
import { GlassLink } from "@/components/ui/GlassButton";
import SubmitButton from "@/components/ui/SubmitButton";
import TripCard from "@/components/trips/TripCard";
import { fill, useTripT } from "@/hooks/useTripT";
import { acceptTripInvite, declineTripInvite } from "@/lib/trip-member-actions";
import type { TripInviteView, TripSummary } from "@/lib/trip-types";

type Props = {
  trips: TripSummary[];
  invites: TripInviteView[];
  shared: TripSummary[];
};

export default function TripsContent({ trips, invites, shared }: Props) {
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

      {invites.length > 0 && (
        <section aria-labelledby="trip-invites" className="mb-10">
          <h2
            id="trip-invites"
            className="mb-3 font-display text-xl font-bold text-on-backdrop"
          >
            {tt.invitesTitle}
          </h2>
          <ul className="flex flex-col gap-3">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="glass flex flex-wrap items-center gap-3 rounded-panel border border-primary/60 bg-surface px-4 py-3"
              >
                <p className="min-w-0 flex-1 text-sm text-text">
                  {fill(tt.inviteFrom, {
                    name: invite.owner.username
                      ? `@${invite.owner.username}`
                      : (invite.owner.name ?? "—"),
                    trip: invite.tripTitle,
                    role: tt[`role${invite.role}`],
                  })}
                </p>
                <ActionForm action={acceptTripInvite}>
                  <input type="hidden" name="memberId" value={invite.id} />
                  <SubmitButton size="sm" variant="primary">
                    {tt.inviteAccept}
                  </SubmitButton>
                </ActionForm>
                <ActionForm action={declineTripInvite}>
                  <input type="hidden" name="memberId" value={invite.id} />
                  <SubmitButton size="sm" variant="ghost">
                    {tt.inviteDecline}
                  </SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {shared.length > 0 && (
        <section aria-labelledby="trips-shared" className="mt-14">
          <h2
            id="trips-shared"
            className="mb-4 font-display text-xl font-bold text-on-backdrop"
          >
            {tt.sharedWithMe}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shared.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
