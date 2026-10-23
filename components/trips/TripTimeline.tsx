"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bed,
  Bus,
  Car,
  ChevronDown,
  Footprints,
  MapPin,
  Moon,
  Pencil,
  Plane,
  Plus,
  Ship,
  StickyNote,
  Ticket,
  Train,
  Trash2,
} from "lucide-react";
import ActionForm from "@/components/ui/ActionForm";
import GlassButton from "@/components/ui/GlassButton";
import TripItemForm from "@/components/trips/TripItemForm";
import type { EditorState } from "@/components/trips/TripPlanner";
import type { TripActions } from "@/components/trips/planner-types";
import { fill, useTripT } from "@/hooks/useTripT";
import { formatMoney, type BudgetSummary } from "@/lib/trip-budget";
import { formatDay, formatTime } from "@/lib/trip-format";
import {
  findConflicts,
  groupByDay,
  itemsOutside,
  spansNight,
} from "@/lib/trip-timeline";
import type { TransportMode, TripItemView, TripView } from "@/lib/trip-types";

type Props = {
  trip: TripView;
  days: string[];
  isOwner: boolean;
  budget: BudgetSummary;
  openDay: string | null;
  onOpenDay: (day: string | null) => void;
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
  editor: EditorState;
  onEdit: (editor: EditorState) => void;
  actions: TripActions;
};

const MODE_ICONS: Record<TransportMode, typeof Bus> = {
  BUS: Bus,
  TRAIN: Train,
  FLIGHT: Plane,
  CAR: Car,
  FERRY: Ship,
  WALK: Footprints,
  OTHER: ArrowRight,
};

function iconFor(item: TripItemView) {
  if (item.type === "TRANSPORT") return MODE_ICONS[item.mode ?? "OTHER"];
  if (item.type === "STAY") return Bed;
  if (item.type === "NOTE") return StickyNote;
  return Footprints;
}

function placeLabel(
  city: TripItemView["city"],
  placeName: string | null,
): string | null {
  if (placeName && city) return `${placeName}, ${city.name}`;
  return placeName ?? city?.name ?? null;
}

export default function TripTimeline({
  trip,
  days,
  isOwner,
  budget,
  openDay,
  onOpenDay,
  selectedItemId,
  onSelectItem,
  editor,
  onEdit,
  actions,
}: Props) {
  const { tt, locale } = useTripT();
  const timeline = useMemo(
    () => groupByDay(trip.items, days),
    [trip.items, days],
  );
  const outside = useMemo(
    () => itemsOutside(trip.items, trip.startDate, trip.endDate),
    [trip.items, trip.startDate, trip.endDate],
  );
  const conflicted = useMemo(
    () => new Set(findConflicts(trip.items).flat()),
    [trip.items],
  );
  const budgetByDay = new Map(budget.days.map((day) => [day.date, day]));

  const closeEditor = () => {
    onEdit(null);
  };

  const form = editor && (
    <TripItemForm
      key={editor.item?.id ?? `new-${editor.day}`}
      tripId={trip.id}
      item={editor.item}
      day={editor.day}
      tripStart={trip.startDate}
      tripEnd={trip.endDate}
      action={actions.saveTripItem}
      onClose={closeEditor}
    />
  );

  const renderItem = (item: TripItemView) => {
    if (editor?.item?.id === item.id) return <li key={item.id}>{form}</li>;

    const Icon = iconFor(item);
    const selected = item.id === selectedItemId;
    const fromLabel = placeLabel(item.city, item.placeName);
    const toLabel = placeLabel(item.toCity, item.toPlaceName);

    return (
      <li key={item.id}>
        <article
          className={`group relative flex gap-3 rounded-card border p-3.5 transition-colors ${
            selected
              ? "border-primary bg-primary/10"
              : "border-border bg-surface-raised/60 hover:bg-surface-raised"
          }`}
        >
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                selected
                  ? "bg-primary text-on-primary"
                  : "bg-ink-500/15 text-text"
              }`}
            >
              <Icon size={17} aria-hidden="true" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onSelectItem(item.id)}
              className="block w-full text-left focus-visible:outline-2 focus-visible:outline-focus"
            >
              <p className="text-xs text-text-muted tabular-nums">
                {formatTime(item.startAt)}
                {item.endAt &&
                  ` – ${
                    spansNight(item)
                      ? `${formatDay(item.endAt.slice(0, 10), locale, { day: "numeric", month: "short" })} `
                      : ""
                  }${formatTime(item.endAt)}`}
                {" · "}
                {tt[`type${item.type}`]}
                {item.mode && ` · ${tt[`mode${item.mode}`]}`}
              </p>
              <h4 className="font-semibold text-text">{item.title}</h4>
              {(fromLabel || toLabel) && (
                <p className="mt-0.5 flex flex-wrap items-center gap-1 text-sm text-text-muted">
                  <MapPin size={13} aria-hidden="true" />
                  {fromLabel}
                  {item.type === "TRANSPORT" && toLabel && (
                    <>
                      <ArrowRight size={13} aria-hidden="true" />
                      {toLabel}
                    </>
                  )}
                </p>
              )}
            </button>
            {item.notes && (
              <p className="mt-1.5 text-sm whitespace-pre-line text-text-muted">
                {item.notes}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {spansNight(item) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-series-7/15 px-2 py-0.5 text-text">
                  <Moon size={12} aria-hidden="true" />
                  {tt.overnight}
                </span>
              )}
              {item.bookingRef && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ink-500/15 px-2 py-0.5 text-text-muted">
                  <Ticket size={12} aria-hidden="true" />
                  {item.bookingRef}
                </span>
              )}
              {conflicted.has(item.id) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-wish-500/15 px-2 py-0.5 text-wish-700 dark:text-wish-400">
                  <AlertTriangle size={12} aria-hidden="true" />
                  {tt.conflict}
                </span>
              )}
              {item.cost !== null && (
                <span className="ml-auto font-semibold text-text tabular-nums">
                  {formatMoney(item.cost, trip.currency, locale)}
                </span>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              <GlassButton
                size="iconSm"
                variant="ghost"
                aria-label={tt.edit}
                onClick={() => onEdit({ item, day: item.startAt.slice(0, 10) })}
              >
                <Pencil size={14} aria-hidden="true" />
              </GlassButton>
              <ActionForm
                action={actions.deleteTripItem}
                confirmMessage={tt.confirmDeleteItem}
                confirmLabel={tt.delete}
              >
                <input type="hidden" name="tripId" value={trip.id} />
                <input type="hidden" name="itemId" value={item.id} />
                <GlassButton
                  type="submit"
                  size="iconSm"
                  variant="ghost"
                  aria-label={tt.delete}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </GlassButton>
              </ActionForm>
            </div>
          )}
        </article>
      </li>
    );
  };

  const cityNames = new Map(
    trip.cities.map((entry) => [entry.city.id, entry.city.name]),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-on-backdrop">
          {tt.sectionTimeline}
        </h2>
      </div>

      {!isOwner && (
        <p className="text-sm text-on-backdrop-muted">{tt.readOnly}</p>
      )}

      <ol className="flex flex-col gap-3">
        {timeline.map(({ date, items, carried }, index) => {
          const open = openDay === date;
          const dayBudget = budgetByDay.get(date);
          const newHere = editor && !editor.item && editor.day === date;
          const titles = [
            ...new Set(
              items
                .flatMap((item) => [item.city?.id, item.toCity?.id])
                .filter((id): id is string => Boolean(id))
                .map((id) => cityNames.get(id) ?? ""),
            ),
          ].filter(Boolean);

          return (
            <li
              key={date}
              id={`day-${date}`}
              className="glass scroll-mt-36 overflow-hidden rounded-panel border border-border bg-surface"
            >
              <button
                type="button"
                onClick={() => onOpenDay(open ? null : date)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-raised/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
              >
                <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-card bg-primary/12 text-accent-text">
                  <span className="text-[0.65rem] leading-none font-semibold uppercase">
                    {formatDay(date, locale, { month: "short" })}
                  </span>
                  <span className="text-lg leading-tight font-bold">
                    {Number(date.slice(8, 10))}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text">
                    {fill(tt.dayLabel, { n: index + 1 })} ·{" "}
                    {formatDay(date, locale, { weekday: "long" })}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {titles.join(" → ")}
                    {carried.length > 0 &&
                      ` · ${tt.carriedOver}: ${carried.map((item) => item.title).join(", ")}`}
                  </span>
                </span>
                {dayBudget && dayBudget.total > 0 && (
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      dayBudget.overAllowance
                        ? "text-danger-700 dark:text-danger-400"
                        : "text-text"
                    }`}
                    title={dayBudget.overAllowance ? tt.dayOver : undefined}
                  >
                    {formatMoney(dayBudget.total, trip.currency, locale)}
                  </span>
                )}
                {items.length > 0 && (
                  <span className="rounded-full bg-ink-500/15 px-2 py-0.5 text-xs text-text-muted tabular-nums">
                    {items.length}
                  </span>
                )}
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>

              {(open || newHere) && (
                <div className="border-t border-border px-4 py-4">
                  {carried.map((item) => (
                    <button
                      key={`carried-${item.id}`}
                      type="button"
                      onClick={() => onSelectItem(item.id)}
                      className="mb-3 flex w-full items-center gap-2 rounded-card border border-dashed border-border-strong px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-raised"
                    >
                      <Moon size={14} aria-hidden="true" />
                      <span className="font-medium text-text">
                        {tt.carriedOver}:
                      </span>
                      <span className="truncate">{item.title}</span>
                      {item.endAt && (
                        <span className="ml-auto tabular-nums">
                          → {formatTime(item.endAt)}
                        </span>
                      )}
                    </button>
                  ))}

                  {newHere && <div className="mb-3">{form}</div>}

                  {items.length === 0 && !newHere ? (
                    <p className="text-sm text-text-muted">
                      {tt.nothingPlanned}
                    </p>
                  ) : (
                    <ol className="relative flex flex-col gap-2.5">
                      {items.map(renderItem)}
                    </ol>
                  )}

                  {isOwner && !newHere && (
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      className="mt-3"
                      onClick={() => onEdit({ item: null, day: date })}
                    >
                      <Plus size={14} aria-hidden="true" />
                      {tt.addItem}
                    </GlassButton>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {outside.length > 0 && (
        <div className="glass rounded-panel border border-wish-500/50 bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
            <AlertTriangle size={15} aria-hidden="true" />
            {tt.outsideItems}
          </h3>
          <ol className="flex flex-col gap-2.5">{outside.map(renderItem)}</ol>
        </div>
      )}
    </div>
  );
}
