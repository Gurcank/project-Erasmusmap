"use client";

import { useActionState, useState } from "react";
import LocalizedError from "@/components/ui/LocalizedError";
import { useT } from "@/hooks/useT";
import SubmitButton from "@/components/ui/SubmitButton";
import Calendar, { type RangeValue } from "@/components/ui/Calendar";
import { EARLIEST_STAY, fromStoredDate, toISODate } from "@/lib/stay-dates";
import type { FormAction } from "@/lib/action-result";

type Props = {
  cityId: string;
  startDate: Date | null;
  endDate: Date | null;
  saveVisitDates: FormAction;
};

/**
 * "When were you there?" — the stay recorded against a visit. Sits beside the
 * review form: both are things you fill in once you have actually been.
 *
 * The calendar is controlled here rather than inside it, because the range has
 * to reach the server action as two `YYYY-MM-DD` form fields.
 */
export default function VisitDates({
  cityId,
  startDate,
  endDate,
  saveVisitDates,
}: Props) {
  const t = useT();
  const [state, action] = useActionState(saveVisitDates, null);
  const [range, setRange] = useState<RangeValue | null>(() => {
    const start = fromStoredDate(startDate);
    const end = fromStoredDate(endDate);
    return start || end ? { start, end } : null;
  });

  return (
    <form
      action={action}
      className="glass flex h-full flex-col gap-4 rounded-panel border border-border bg-surface p-6"
    >
      <input type="hidden" name="cityId" value={cityId} />
      <input type="hidden" name="startDate" value={toISODate(range?.start)} />
      <input type="hidden" name="endDate" value={toISODate(range?.end)} />

      <h2 className="font-display text-lg font-semibold text-text">
        {t.visitDatesTitle}
      </h2>

      <Calendar
        value={range}
        onChange={setRange}
        minValue={EARLIEST_STAY}
        maxValue={new Date()}
      />

      <SubmitButton pendingText={t.saveDates} variant="primary" fullWidth>
        {t.saveDates}
      </SubmitButton>

      {state?.ok && (
        <p className="text-xs text-visited-700 dark:text-visited-400">
          {t.datesSaved}
        </p>
      )}
      {state && !state.ok && (
        <p
          role="alert"
          className="text-xs text-danger-700 dark:text-danger-400"
        >
          <LocalizedError message={state.error} />
        </p>
      )}
    </form>
  );
}
