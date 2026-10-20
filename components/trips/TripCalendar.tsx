"use client";

import { AlertTriangle } from "lucide-react";
import { useTripT } from "@/hooks/useTripT";
import { formatMoney, type BudgetSummary } from "@/lib/trip-budget";
import {
  cityColor,
  dayNumber,
  formatDay,
  weekdayIndex,
} from "@/lib/trip-format";
import { addDays } from "@/lib/trip-timeline";
import type { TripCityView } from "@/lib/trip-types";

type Props = {
  days: string[];
  dayCities: Record<string, string[]>;
  cities: TripCityView[];
  cityIndex: Map<string, number>;
  budget: BudgetSummary;
  currency: string;
  onOpenDay: (day: string) => void;
};

// Monday 2026-01-05, used only to label the weekday header.
const A_MONDAY = "2026-01-05";

/** The months the trip touches, each as a Monday-first grid of days. */
function monthGrids(days: string[]) {
  const months = new Map<string, string[]>();
  for (const day of days) {
    const key = day.slice(0, 7);
    if (!months.has(key)) months.set(key, []);
  }
  return [...months.keys()].map((month) => {
    const first = `${month}-01`;
    const cells: (string | null)[] = Array(weekdayIndex(first)).fill(null);
    for (let day = first; day.slice(0, 7) === month; day = addDays(day, 1)) {
      cells.push(day);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return { month, cells };
  });
}

/**
 * The trip on a month calendar. Each day is tinted with the city colour of
 * where the traveller is; a travel day is split between the two. A small bar
 * shows the day's planned spending against the busiest day.
 */
export default function TripCalendar({
  days,
  dayCities,
  cities,
  cityIndex,
  budget,
  currency,
  onOpenDay,
}: Props) {
  const { tt, locale } = useTripT();
  const inTrip = new Set(days);
  const spendByDay = new Map(budget.days.map((day) => [day.date, day]));
  const busiest = Math.max(1, ...budget.days.map((day) => day.total));
  const cityName = new Map(
    cities.map((entry) => [entry.city.id, entry.city.name]),
  );
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    formatDay(addDays(A_MONDAY, index), locale, { weekday: "short" }),
  );

  return (
    <div className="glass rounded-panel border border-border bg-surface p-5 md:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-text">
            {tt.sectionCalendar}
          </h2>
          <p className="text-sm text-text-muted">{tt.calendarHint}</p>
        </div>
        {/* Legend: colour is always paired with the city's name. */}
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-text-muted">
          {cities.map((entry, index) => (
            <li key={entry.id} className="inline-flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: cityColor(index) }}
                aria-hidden="true"
              />
              {entry.city.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {monthGrids(days).map(({ month, cells }) => (
          <div key={month}>
            <h3 className="mb-3 font-semibold text-text capitalize">
              {formatDay(`${month}-01`, locale, {
                month: "long",
                year: "numeric",
              })}
            </h3>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {weekdays.map((name) => (
                <span key={name} className="pb-1 text-xs text-text-subtle">
                  {name}
                </span>
              ))}
              {cells.map((day, index) => {
                if (!day) return <span key={`blank-${index}`} />;
                if (!inTrip.has(day)) {
                  return (
                    <span
                      key={day}
                      className="flex aspect-square items-start justify-center rounded-control p-1 text-xs text-text-subtle/60"
                    >
                      {dayNumber(day)}
                    </span>
                  );
                }

                const here = dayCities[day] ?? [];
                const colors = here
                  .slice(0, 2)
                  .map((id) => cityColor(cityIndex.get(id) ?? 0));
                const background =
                  colors.length === 0
                    ? undefined
                    : colors.length === 1
                      ? `color-mix(in oklab, ${colors[0]} 28%, transparent)`
                      : `linear-gradient(135deg, color-mix(in oklab, ${colors[0]} 28%, transparent) 50%, color-mix(in oklab, ${colors[1]} 28%, transparent) 50%)`;
                const spend = spendByDay.get(day);
                const names = here
                  .map((id) => cityName.get(id) ?? "")
                  .join(" → ");

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => onOpenDay(day)}
                    title={names || tt.noCity}
                    aria-label={`${formatDay(day, locale, { day: "numeric", month: "long", weekday: "long" })}: ${names || tt.noCity}${
                      spend && spend.total > 0
                        ? `, ${formatMoney(spend.total, currency, locale)}`
                        : ""
                    }`}
                    className="relative flex aspect-square flex-col items-stretch justify-between overflow-hidden rounded-control border border-border-strong p-1 text-left transition-transform hover:scale-[1.04] focus-visible:outline-2 focus-visible:outline-focus motion-reduce:hover:scale-100"
                    style={{ background }}
                  >
                    <span className="flex items-start justify-between text-xs font-semibold text-text">
                      {dayNumber(day)}
                      {spend?.overAllowance && (
                        <AlertTriangle
                          size={11}
                          aria-hidden="true"
                          className="text-danger-600 dark:text-danger-400"
                        />
                      )}
                    </span>
                    <span className="hidden truncate text-[0.6rem] leading-tight text-text-muted sm:block">
                      {names}
                    </span>
                    {spend && spend.total > 0 && (
                      <span
                        className="h-1 rounded-full bg-text/60"
                        style={{
                          width: `${Math.max(12, (spend.total / busiest) * 100)}%`,
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
