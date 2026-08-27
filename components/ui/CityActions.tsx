"use client";

import { useActionState, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Check,
  MapPin,
} from "lucide-react";
import { useT } from "@/hooks/useT";
import SubmitButton from "@/components/ui/SubmitButton";
import type { ActionResult, FormAction } from "@/lib/action-result";

type Props = {
  cityId: string;
  isVisited: boolean;
  isWishlisted: boolean;
  startDate: Date | null;
  endDate: Date | null;
  toggleVisit: FormAction;
  toggleWishlist: FormAction;
  saveVisitDates: FormAction;
};

/** Date to the YYYY-MM value an `<input type="month">` expects. */
function toMonthValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 7);
}

function ActionError({ state }: { state: ActionResult | null }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="text-xs text-danger-700 dark:text-danger-400">
      {state.error}
    </p>
  );
}

export default function CityActions({
  cityId,
  isVisited,
  isWishlisted,
  startDate,
  endDate,
  toggleVisit,
  toggleWishlist,
  saveVisitDates,
}: Props) {
  const t = useT();
  const [visitState, visitAction] = useActionState(toggleVisit, null);
  const [wishState, wishAction] = useActionState(toggleWishlist, null);
  const [datesState, datesAction] = useActionState(saveVisitDates, null);
  const hasDates = Boolean(startDate || endDate);
  const [datesOpen, setDatesOpen] = useState(hasDates);

  const buttonBase =
    "flex h-11 cursor-pointer items-center gap-2 rounded-control border px-4 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <form action={visitAction}>
          <input type="hidden" name="cityId" value={cityId} />
          <SubmitButton
            aria-pressed={isVisited}
            className={`${buttonBase} ${
              isVisited
                ? "border-visited-600 bg-visited-600/10 text-visited-700 dark:border-visited-500 dark:text-visited-400"
                : "border-border-strong text-text hover:bg-surface-raised"
            }`}
          >
            {isVisited ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <MapPin size={16} aria-hidden="true" />
            )}
            {isVisited ? t.markedVisited : t.markVisited}
          </SubmitButton>
        </form>

        <form action={wishAction}>
          <input type="hidden" name="cityId" value={cityId} />
          <SubmitButton
            aria-pressed={isWishlisted}
            className={`${buttonBase} ${
              isWishlisted
                ? "border-wish-600 bg-wish-600/10 text-wish-700 dark:border-wish-500 dark:text-wish-400"
                : "border-border-strong text-text hover:bg-surface-raised"
            }`}
          >
            {isWishlisted ? (
              <BookmarkCheck size={16} aria-hidden="true" />
            ) : (
              <Bookmark size={16} aria-hidden="true" />
            )}
            {isWishlisted ? t.inWishlist : t.addToWishlist}
          </SubmitButton>
        </form>

        {isVisited && !datesOpen && (
          <button
            type="button"
            onClick={() => setDatesOpen(true)}
            className={`${buttonBase} border-border-strong text-text-muted hover:bg-surface-raised hover:text-text`}
          >
            <CalendarDays size={16} aria-hidden="true" />
            {t.visitDatesTitle}
          </button>
        )}
      </div>

      <ActionError state={visitState} />
      <ActionError state={wishState} />

      {isVisited && datesOpen && (
        <form
          action={datesAction}
          className="space-y-3 rounded-card border border-border bg-surface-raised p-4"
        >
          <input type="hidden" name="cityId" value={cityId} />
          <div>
            <p className="text-sm font-medium text-text">{t.visitDatesTitle}</p>
            <p className="text-xs text-text-subtle">{t.visitDatesHint}</p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              {t.dateFrom}
              <input
                type="month"
                name="startDate"
                defaultValue={toMonthValue(startDate)}
                className="rounded-control border border-border-strong bg-surface px-3 py-2 text-sm text-text focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              {t.dateTo}
              <input
                type="month"
                name="endDate"
                defaultValue={toMonthValue(endDate)}
                className="rounded-control border border-border-strong bg-surface px-3 py-2 text-sm text-text focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
              />
            </label>
            <SubmitButton
              pendingText={t.saveDates}
              className="h-[38px] rounded-control bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {t.saveDates}
            </SubmitButton>
          </div>

          {datesState?.ok && (
            <p className="text-xs text-visited-700 dark:text-visited-400">
              {t.datesSaved}
            </p>
          )}
          <ActionError state={datesState} />
        </form>
      )}
    </div>
  );
}
