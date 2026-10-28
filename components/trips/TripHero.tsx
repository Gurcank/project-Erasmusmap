"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Globe2,
  Link2,
  Lock,
  MapPin,
  Pencil,
  Route,
  Trash2,
} from "lucide-react";
import ActionForm from "@/components/ui/ActionForm";
import GlassButton from "@/components/ui/GlassButton";
import SubmitButton from "@/components/ui/SubmitButton";
import BudgetRing from "@/components/trips/BudgetRing";
import ShareLink from "@/components/trips/ShareLink";
import TripForm from "@/components/trips/TripForm";
import {
  withSuccess,
  type TripActions,
} from "@/components/trips/planner-types";
import { fill, useTripT } from "@/hooks/useTripT";
import { formatMoney, type BudgetSummary } from "@/lib/trip-budget";
import { formatRange } from "@/lib/trip-format";
import type { TripView } from "@/lib/trip-types";

type Props = {
  trip: TripView;
  isOwner: boolean;
  budget: BudgetSummary;
  dayCount: number;
  distanceKm: number;
  actions: TripActions;
};

const MAX_COVER = 5;

export default function TripHero({
  trip,
  isOwner,
  budget,
  dayCount,
  distanceKm,
  actions,
}: Props) {
  const { tt, locale } = useTripT();
  const [editing, setEditing] = useState(false);
  const covers = trip.cities
    .map((entry) => entry.city.imageUrl)
    .filter((url): url is string => Boolean(url))
    .slice(0, MAX_COVER);

  return (
    <header className="mb-8">
      {/* Photo strip of the cities on the route, darkened under the title. */}
      <div className="relative overflow-hidden rounded-panel border border-border">
        <div className="absolute inset-0 flex">
          {covers.length === 0 ? (
            <div className="h-full w-full bg-gradient-to-br from-accent-700 via-ink-800 to-ink-950" />
          ) : (
            covers.map((src) => (
              <div key={src} className="relative h-full flex-1">
                <Image
                  src={src}
                  alt=""
                  fill
                  priority
                  sizes={`${Math.round(100 / covers.length)}vw`}
                  className="object-cover"
                />
              </div>
            ))
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/60 to-ink-950/20" />

        <div className="relative flex min-h-[18rem] flex-col justify-end gap-6 p-6 md:min-h-[22rem] md:p-10">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-50">
            <span className="inline-flex items-center gap-1 rounded-full bg-ink-950/60 px-2.5 py-1">
              {trip.visibility === "PUBLIC" ? (
                <Globe2 size={12} aria-hidden="true" />
              ) : (
                <Lock size={12} aria-hidden="true" />
              )}
              {trip.visibility === "PUBLIC" ? tt.public : tt.private}
            </span>
            {!isOwner && (
              <span className="rounded-full bg-ink-950/60 px-2.5 py-1">
                {trip.owner.username ? (
                  <Link
                    href={`/u/${trip.owner.username}`}
                    className="underline"
                  >
                    {fill(tt.plannedBy, { name: trip.owner.username })}
                  </Link>
                ) : (
                  fill(tt.plannedBy, { name: trip.owner.name ?? "—" })
                )}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <h1 className="font-display text-display font-bold text-ink-50 lg:text-hero">
                {trip.title}
              </h1>
              {trip.description && (
                <p className="mt-3 max-w-2xl whitespace-pre-line text-ink-200">
                  {trip.description}
                </p>
              )}
              <ul className="mt-5 flex flex-wrap gap-2 text-sm text-ink-50">
                {[
                  [
                    CalendarDays,
                    formatRange(trip.startDate, trip.endDate, locale),
                  ],
                  [CalendarDays, fill(tt.daysCount, { n: dayCount })],
                  [MapPin, fill(tt.citiesCount, { n: trip.cities.length })],
                  [
                    Route,
                    fill(tt.kmCount, { n: distanceKm.toLocaleString(locale) }),
                  ],
                ].map(([Icon, text], index) => {
                  const IconComponent = Icon as typeof MapPin;
                  return (
                    <li
                      key={index}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ink-50/20 bg-ink-950/40 px-3 py-1.5"
                    >
                      <IconComponent size={14} aria-hidden="true" />
                      {text as string}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="glass flex items-center gap-5 rounded-panel border border-border bg-surface p-4 pr-6">
              {budget.budget > 0 && (
                <BudgetRing
                  budget={budget.budget}
                  total={budget.total}
                  currency={trip.currency}
                  locale={locale}
                  label={tt.budgetLabel}
                />
              )}
              <dl className="space-y-2 text-sm">
                {budget.budget > 0 && (
                  <div>
                    <dt className="text-text-muted">{tt.budgetLabel}</dt>
                    <dd className="text-lg font-semibold text-text tabular-nums">
                      {formatMoney(budget.budget, trip.currency, locale)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-text-muted">{tt.spent}</dt>
                  <dd
                    className={`tabular-nums ${budget.budget > 0 ? "font-semibold" : "text-lg font-semibold"} text-text`}
                  >
                    {formatMoney(budget.total, trip.currency, locale)}
                  </dd>
                </div>
                {budget.budget > 0 && (
                  <div>
                    <dt className="text-text-muted">{tt.remaining}</dt>
                    <dd
                      className={`font-semibold tabular-nums ${budget.overBudget ? "text-danger-700 dark:text-danger-400" : "text-accent-text"}`}
                    >
                      {formatMoney(budget.remaining, trip.currency, locale)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {budget.overBudget && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-card border border-danger-600/50 bg-danger-600/15 p-4 text-on-backdrop"
        >
          <AlertTriangle
            size={20}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-danger-400"
          />
          <div>
            <p className="font-semibold">
              {fill(tt.overBudget, {
                amount: formatMoney(budget.overBy, trip.currency, locale),
              })}
            </p>
            <p className="text-sm text-on-backdrop-muted">
              {tt.overBudgetHint}
            </p>
          </div>
        </div>
      )}

      {isOwner && (
        // One toolbar: edit on the left, who-can-see-it in the middle, the
        // destructive action pushed to the far end so it is never next to Save.
        <div className="glass mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-panel border border-border bg-surface px-4 py-3">
          <GlassButton size="sm" onClick={() => setEditing((open) => !open)}>
            <Pencil size={14} aria-hidden="true" />
            {tt.editTrip}
          </GlassButton>

          <ActionForm
            action={actions.setTripVisibility}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="tripId" value={trip.id} />
            <span className="text-xs text-text-muted">{tt.visibility}</span>
            <div
              role="group"
              aria-label={tt.visibility}
              className="inline-flex rounded-full border border-border-strong p-0.5"
            >
              {(
                [
                  ["PRIVATE", Lock, tt.private],
                  ["LINK", Link2, tt.linkOnly],
                  ["PUBLIC", Globe2, tt.public],
                ] as const
              ).map(([value, Icon, label]) => {
                const current = trip.visibility === value;
                return (
                  <button
                    key={value}
                    type="submit"
                    name="visibility"
                    value={value}
                    aria-pressed={current}
                    disabled={current}
                    className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-focus ${
                      current
                        ? "bg-primary text-on-primary"
                        : "text-text-muted hover:bg-surface-raised hover:text-text"
                    }`}
                  >
                    <Icon size={13} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          </ActionForm>

          {trip.visibility === "LINK" && trip.shareToken && (
            <>
              <p className="w-full text-xs text-text-muted">
                {tt.visibilityLinkHint}
              </p>
              <ShareLink
                tripId={trip.id}
                token={trip.shareToken}
                actions={actions}
              />
            </>
          )}

          <ActionForm
            action={actions.deleteTrip}
            confirmMessage={tt.confirmDeleteTrip}
            confirmLabel={tt.deleteTrip}
            className="ml-auto"
          >
            <input type="hidden" name="tripId" value={trip.id} />
            <SubmitButton size="sm" variant="danger">
              <Trash2 size={14} aria-hidden="true" />
              {tt.deleteTrip}
            </SubmitButton>
          </ActionForm>
        </div>
      )}

      {editing && (
        <div className="mt-4 max-w-2xl">
          <TripForm
            action={withSuccess(actions.updateTrip, () => setEditing(false))}
            initial={trip}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
    </header>
  );
}
