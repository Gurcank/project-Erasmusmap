"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import TripHero from "@/components/trips/TripHero";
import TripTimeline from "@/components/trips/TripTimeline";
import TripCalendar from "@/components/trips/TripCalendar";
import TripBudget from "@/components/trips/TripBudget";
import TripCities from "@/components/trips/TripCities";
import type { TripActions } from "@/components/trips/planner-types";
import { useTripT } from "@/hooks/useTripT";
import { summarizeBudget } from "@/lib/trip-budget";
import {
  citiesByDay,
  routeSteps,
  totalDistanceKm,
  tripDays,
} from "@/lib/trip-timeline";
import type { TripItemView, TripView } from "@/lib/trip-types";

// Mapbox touches window at import time, so the map only ever loads in the
// browser; the placeholder keeps the layout from jumping while it does.
const TripMap = dynamic(() => import("@/components/trips/TripMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-panel bg-surface-raised motion-reduce:animate-none" />
  ),
});

type Props = {
  trip: TripView;
  isOwner: boolean;
  actions: TripActions;
};

export type EditorState = { item: TripItemView | null; day: string } | null;

const SECTIONS = [
  ["route", "sectionMap"],
  ["calendar", "sectionCalendar"],
  ["budget", "sectionBudget"],
  ["cities", "sectionCities"],
] as const;

export default function TripPlanner({ trip, isOwner, actions }: Props) {
  const { tt } = useTripT();
  const days = useMemo(
    () => tripDays(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate],
  );
  const steps = useMemo(() => routeSteps(trip.items), [trip.items]);
  const budget = useMemo(
    () =>
      summarizeBudget(trip.budget, trip.startDate, trip.endDate, trip.expenses),
    [trip.budget, trip.startDate, trip.endDate, trip.expenses],
  );
  const dayCities = useMemo(
    () => citiesByDay(trip.items, days),
    [trip.items, days],
  );
  // City colour slots follow the order the cities appear on the trip.
  const cityIndex = useMemo(
    () => new Map(trip.cities.map((entry, index) => [entry.city.id, index])),
    [trip.cities],
  );

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(days[0] ?? null);
  const [editor, setEditor] = useState<EditorState>(null);

  const selectItem = useCallback(
    (itemId: string | null) => {
      setSelectedItemId(itemId);
      const item = trip.items.find((entry) => entry.id === itemId);
      if (item) setOpenDay(item.startAt.slice(0, 10));
    },
    [trip.items],
  );

  const openDayFromCalendar = (day: string) => {
    setOpenDay(day);
    document
      .getElementById(`day-${day}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-24 pb-24 sm:px-6 md:px-8">
      <TripHero
        trip={trip}
        isOwner={isOwner}
        budget={budget}
        dayCount={days.length}
        distanceKm={totalDistanceKm(steps)}
        actions={actions}
      />

      <nav
        aria-label={trip.title}
        className="sticky top-20 z-20 mb-8 flex justify-center"
      >
        {/* One glass bar, so the section links read as a single control. */}
        <ul className="glass flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-surface p-1">
          {SECTIONS.map(([id, key]) => (
            <li key={id} className="shrink-0">
              <a
                href={`#${id}`}
                className="block rounded-full px-4 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-raised hover:text-text focus-visible:outline-2 focus-visible:outline-focus"
              >
                {tt[key]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section
        id="route"
        className="mb-16 grid scroll-mt-36 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
      >
        <div className="h-[60vh] min-h-[22rem] lg:sticky lg:top-36 lg:h-[calc(100vh-11rem)]">
          <TripMap
            steps={steps}
            items={trip.items}
            selectedItemId={selectedItemId}
            onSelectItem={selectItem}
          />
        </div>
        <TripTimeline
          trip={trip}
          days={days}
          isOwner={isOwner}
          budget={budget}
          openDay={openDay}
          onOpenDay={setOpenDay}
          selectedItemId={selectedItemId}
          onSelectItem={selectItem}
          editor={editor}
          onEdit={setEditor}
          actions={actions}
        />
      </section>

      <section id="calendar" className="mb-16 scroll-mt-36">
        <TripCalendar
          days={days}
          dayCities={dayCities}
          cities={trip.cities}
          cityIndex={cityIndex}
          budget={budget}
          currency={trip.currency}
          onOpenDay={openDayFromCalendar}
        />
      </section>

      <section id="budget" className="mb-16 scroll-mt-36">
        <TripBudget
          trip={trip}
          days={days}
          budget={budget}
          isOwner={isOwner}
          cityIndex={cityIndex}
          dayCities={dayCities}
          actions={actions}
        />
      </section>

      <section id="cities" className="scroll-mt-36">
        <TripCities
          trip={trip}
          isOwner={isOwner}
          cityIndex={cityIndex}
          actions={actions}
        />
      </section>
    </div>
  );
}
