"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Heart,
  ImageOff,
  Lightbulb,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import ActionForm from "@/components/ui/ActionForm";
import GlassButton from "@/components/ui/GlassButton";
import SubmitButton from "@/components/ui/SubmitButton";
import Rating from "@/components/ui/Rating";
import CityField, { type CityChoice } from "@/components/trips/CityField";
import {
  withSuccess,
  type TripActions,
} from "@/components/trips/planner-types";
import { useT } from "@/hooks/useT";
import { fill, useTripT } from "@/hooks/useTripT";
import { toStars } from "@/lib/review";
import { cityColor } from "@/lib/trip-format";
import { CITY_NOTES_MAX, TODO_TITLE_MAX } from "@/lib/trip-schemas";
import type {
  TripCityInspiration,
  TripCityView,
  TripView,
} from "@/lib/trip-types";

type Props = {
  trip: TripView;
  canEdit: boolean;
  cityIndex: Map<string, number>;
  actions: TripActions;
};

const RATING_KEYS = [
  ["culture", "culture"],
  ["gastronomy", "gastronomy"],
  ["socialLife", "social"],
  ["transport", "transport"],
  ["safety", "safety"],
  ["costOfLiving", "cost"],
] as const;

/** One card per city: photo, the traveller's notes and to-dos, and ideas. */
export default function TripCities({
  trip,
  canEdit,
  cityIndex,
  actions,
}: Props) {
  const { tt } = useTripT();
  const [adding, setAdding] = useState(false);
  const inspiration = new Map(
    trip.inspiration.map((entry) => [entry.cityId, entry]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-on-backdrop">
          {tt.sectionCities}
        </h2>
        {canEdit && (
          <GlassButton size="sm" onClick={() => setAdding((open) => !open)}>
            {adding ? (
              <X size={14} aria-hidden="true" />
            ) : (
              <Plus size={14} aria-hidden="true" />
            )}
            {tt.addCity}
          </GlassButton>
        )}
      </div>

      {adding && (
        <AddCityForm
          tripId={trip.id}
          action={withSuccess(actions.addTripCity, () => setAdding(false))}
        />
      )}

      {trip.cities.length === 0 ? (
        <p className="glass rounded-panel border border-border bg-surface p-6 text-sm text-text-muted">
          {tt.noCities}
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {trip.cities.map((entry) => (
            <CityCard
              key={entry.id}
              tripId={trip.id}
              entry={entry}
              color={cityColor(cityIndex.get(entry.city.id) ?? 0)}
              inspiration={inspiration.get(entry.city.id) ?? null}
              canEdit={canEdit}
              actions={actions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddCityForm({
  tripId,
  action,
}: {
  tripId: string;
  action: TripActions["addTripCity"];
}) {
  const { tt } = useTripT();
  const [city, setCity] = useState<CityChoice | null>(null);
  return (
    <ActionForm
      action={action}
      className="glass flex flex-col gap-3 rounded-panel border border-border bg-surface p-5 sm:flex-row sm:items-end"
      errorClassName="text-sm text-danger-700 dark:text-danger-400"
    >
      <input type="hidden" name="tripId" value={tripId} />
      <div className="flex-1">
        <CityField
          label={tt.city}
          name="cityId"
          value={city}
          onChange={setCity}
        />
      </div>
      <SubmitButton variant="primary" disabled={!city}>
        {tt.addCity}
      </SubmitButton>
    </ActionForm>
  );
}

function CityCard({
  tripId,
  entry,
  color,
  inspiration,
  canEdit,
  actions,
}: {
  tripId: string;
  entry: TripCityView;
  color: string;
  inspiration: TripCityInspiration | null;
  canEdit: boolean;
  actions: TripActions;
}) {
  const { tt } = useTripT();
  const t = useT();
  const [todoKey, setTodoKey] = useState(0);
  const done = entry.todos.filter((todo) => todo.done).length;
  const hidden = (
    <>
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="tripCityId" value={entry.id} />
    </>
  );

  return (
    <article className="glass flex flex-col overflow-hidden rounded-panel border border-border bg-surface">
      <div className="relative aspect-[16/7] bg-surface-raised">
        {entry.city.imageUrl ? (
          <Image
            src={entry.city.imageUrl}
            alt={entry.city.name}
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-text-subtle">
            <ImageOff size={24} aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <div>
            <span
              className="mb-1.5 block h-1.5 w-10 rounded-full"
              style={{ background: color }}
              aria-hidden="true"
            />
            <h3 className="font-display text-2xl font-bold text-ink-50">
              {entry.city.name}
            </h3>
            <p className="text-sm text-ink-200">{entry.city.country}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/c/${entry.city.slug}`}
              className="inline-flex items-center gap-1 rounded-full bg-ink-950/60 px-3 py-1.5 text-xs font-medium text-ink-50 hover:bg-ink-950/80"
            >
              {tt.goToCity}
              <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
            {canEdit && (
              <ActionForm
                action={actions.removeTripCity}
                confirmMessage={tt.confirmRemoveCity}
                confirmLabel={tt.removeCity}
              >
                {hidden}
                <button
                  type="submit"
                  aria-label={tt.removeCity}
                  title={tt.removeCity}
                  className="rounded-full bg-ink-950/60 p-2 text-ink-50 hover:bg-danger-600/80"
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </ActionForm>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5">
        {/* Notes */}
        <section>
          <h4 className="mb-2 text-sm font-semibold text-text">
            {tt.cityNotes}
          </h4>
          {canEdit ? (
            <ActionForm
              action={actions.saveTripCityNotes}
              className="flex flex-col gap-2"
            >
              {hidden}
              <textarea
                name="notes"
                rows={3}
                maxLength={CITY_NOTES_MAX}
                defaultValue={entry.notes ?? ""}
                placeholder={tt.cityNotesPlaceholder}
                className="field w-full resize-y px-3 py-2 text-sm"
              />
              <SubmitButton
                size="sm"
                className="self-end"
                pendingText={tt.saving}
              >
                {tt.saveNotes}
              </SubmitButton>
            </ActionForm>
          ) : entry.notes ? (
            <p className="text-sm whitespace-pre-line text-text-muted">
              {entry.notes}
            </p>
          ) : (
            <p className="text-sm text-text-subtle">—</p>
          )}
        </section>

        {/* To-dos */}
        <section>
          <h4 className="mb-2 flex items-center justify-between text-sm font-semibold text-text">
            {tt.todos}
            {entry.todos.length > 0 && (
              <span className="text-xs font-normal text-text-muted tabular-nums">
                {done}/{entry.todos.length}
              </span>
            )}
          </h4>
          <ul className="space-y-1.5">
            {entry.todos.map((todo) => (
              <li key={todo.id} className="group flex items-center gap-2">
                {canEdit ? (
                  <ActionForm action={actions.toggleTripTodo}>
                    {hidden}
                    <input type="hidden" name="todoId" value={todo.id} />
                    <button
                      type="submit"
                      role="checkbox"
                      aria-checked={todo.done}
                      aria-label={todo.title}
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        todo.done
                          ? "border-primary bg-primary text-on-primary"
                          : "border-border-strong"
                      }`}
                    >
                      {todo.done && <Check size={13} aria-hidden="true" />}
                    </button>
                  </ActionForm>
                ) : (
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      todo.done
                        ? "border-primary bg-primary text-on-primary"
                        : "border-border-strong"
                    }`}
                    aria-hidden="true"
                  >
                    {todo.done && <Check size={13} />}
                  </span>
                )}
                <span
                  className={`flex-1 text-sm ${todo.done ? "text-text-subtle line-through" : "text-text"}`}
                >
                  {todo.title}
                </span>
                {canEdit && (
                  <ActionForm action={actions.deleteTripTodo}>
                    {hidden}
                    <input type="hidden" name="todoId" value={todo.id} />
                    <button
                      type="submit"
                      aria-label={tt.delete}
                      className="rounded-full p-1 text-text-subtle opacity-100 hover:text-danger-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
          {canEdit && (
            <ActionForm
              key={todoKey}
              action={withSuccess(actions.addTripTodo, () =>
                setTodoKey((key) => key + 1),
              )}
              className="mt-2 flex gap-2"
            >
              {hidden}
              <input
                name="title"
                required
                maxLength={TODO_TITLE_MAX}
                placeholder={tt.todoPlaceholder}
                aria-label={tt.todos}
                className="field flex-1 px-3 py-1.5 text-sm"
              />
              <SubmitButton size="sm">
                <Plus size={13} aria-hidden="true" />
                {tt.addTodo}
              </SubmitButton>
            </ActionForm>
          )}
        </section>

        {/* What the site's reviewers say about the city. */}
        <section className="rounded-card border border-border bg-surface-raised/50 p-4">
          <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text">
            <Lightbulb size={15} aria-hidden="true" className="text-star" />
            {tt.inspiration}
            {inspiration && inspiration.reviewCount > 0 && (
              <span className="font-normal text-text-muted">
                · {fill(tt.reviewsCount, { n: inspiration.reviewCount })}
              </span>
            )}
          </h4>
          {!inspiration || inspiration.reviewCount === 0 ? (
            <p className="text-sm text-text-muted">{tt.noInspiration}</p>
          ) : (
            <>
              <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {RATING_KEYS.map(([key, labelKey]) => {
                  const value = inspiration.averages[key];
                  if (value === null || value === undefined) return null;
                  const stars = toStars(value);
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2"
                    >
                      <dt className="text-xs text-text-muted">{t[labelKey]}</dt>
                      <dd>
                        <Rating
                          value={stars}
                          label={`${t[labelKey]}: ${stars.toFixed(1)} / 5`}
                          size={12}
                        />
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <ul className="space-y-2">
                {inspiration.topReviews.map((review) => (
                  <li key={review.id} className="text-sm">
                    <p className="line-clamp-3 text-text-muted">
                      “{review.content}”
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-text-subtle">
                      {review.author && <span>@{review.author}</span>}
                      <span className="inline-flex items-center gap-0.5">
                        <Heart size={11} aria-hidden="true" />
                        {review.likeCount}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </article>
  );
}
