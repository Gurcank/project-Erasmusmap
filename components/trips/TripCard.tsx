"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Globe2, Link2, Lock, MapPin } from "lucide-react";
import { fill, useTripT } from "@/hooks/useTripT";
import { formatMoney } from "@/lib/trip-budget";
import { formatRange } from "@/lib/trip-format";
import { tripDays } from "@/lib/trip-timeline";
import type { TripSummary } from "@/lib/trip-types";

/** One plan on /trips and on the profile's trips tab. */
export default function TripCard({ trip }: { trip: TripSummary }) {
  const { tt, locale } = useTripT();
  const days = tripDays(trip.startDate, trip.endDate).length;
  const ratio =
    trip.budget > 0 ? trip.spent / trip.budget : trip.spent > 0 ? 2 : 0;
  const hasBudget = trip.budget > 0;
  const over = hasBudget && trip.spent > trip.budget;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group glass flex flex-col overflow-hidden rounded-panel border border-border bg-surface transition-shadow hover:shadow-popover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {/* Cover: up to four city photos as a mosaic. */}
      <div className="relative grid aspect-[16/9] grid-cols-2 grid-rows-2 gap-0.5 bg-surface-raised">
        {trip.coverImages.length === 0 ? (
          <div className="col-span-2 row-span-2 flex items-center justify-center text-text-subtle">
            <MapPin size={28} aria-hidden="true" />
          </div>
        ) : (
          trip.coverImages.map((src, index) => (
            <div
              key={src}
              className={`relative overflow-hidden ${
                trip.coverImages.length === 1
                  ? "col-span-2 row-span-2"
                  : trip.coverImages.length === 2
                    ? "row-span-2"
                    : trip.coverImages.length === 3 && index === 0
                      ? "row-span-2"
                      : ""
              }`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(min-width: 1024px) 20vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
              />
            </div>
          ))
        )}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-ink-950/70 px-2.5 py-1 text-xs font-medium text-ink-50">
          {trip.visibility === "PUBLIC" ? (
            <Globe2 size={12} aria-hidden="true" />
          ) : trip.visibility === "LINK" ? (
            <Link2 size={12} aria-hidden="true" />
          ) : (
            <Lock size={12} aria-hidden="true" />
          )}
          {trip.visibility === "PUBLIC"
            ? tt.public
            : trip.visibility === "LINK"
              ? tt.linkOnly
              : tt.private}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-lg font-semibold text-text">
          {trip.title}
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-text-muted">
          <CalendarDays size={14} aria-hidden="true" />
          {formatRange(trip.startDate, trip.endDate, locale)} ·{" "}
          {fill(tt.daysCount, { n: days })}
        </p>
        {trip.cityNames.length > 0 && (
          <p className="line-clamp-1 text-sm text-text-subtle">
            {trip.cityNames.join(" → ")}
          </p>
        )}

        <div className="mt-auto pt-2">
          <div className="mb-1 flex justify-between text-xs text-text-muted">
            <span>{hasBudget ? tt.budgetLabel : tt.spent}</span>
            <span
              className={`tabular-nums ${over ? "font-semibold text-danger-700 dark:text-danger-400" : ""}`}
            >
              {hasBudget
                ? fill(tt.budgetOf, {
                    spent: formatMoney(trip.spent, trip.currency, locale),
                    budget: formatMoney(trip.budget, trip.currency, locale),
                  })
                : formatMoney(trip.spent, trip.currency, locale)}
            </span>
          </div>
          {hasBudget && (
            <div
              className="h-1.5 overflow-hidden rounded-full bg-ink-500/25"
              role="presentation"
            >
              <div
                className={`h-full rounded-full ${over ? "bg-danger-500" : "bg-primary"}`}
                style={{ width: `${Math.min(100, ratio * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
