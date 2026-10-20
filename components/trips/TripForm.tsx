"use client";

import { useState } from "react";
import { Globe2, Lock } from "lucide-react";
import ActionForm from "@/components/ui/ActionForm";
import SubmitButton from "@/components/ui/SubmitButton";
import GlassButton from "@/components/ui/GlassButton";
import { useTripT } from "@/hooks/useTripT";
import type { FormAction } from "@/lib/action-result";
import {
  MAX_TRIP_DAYS,
  TRIP_DESCRIPTION_MAX,
  TRIP_TITLE_MAX,
} from "@/lib/trip-schemas";
import { addDays } from "@/lib/trip-timeline";
import { TRIP_CURRENCIES, type TripVisibility } from "@/lib/trip-types";

export type TripFormValues = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  visibility: TripVisibility;
};

type Props = {
  action: FormAction;
  /** Present when editing; the form then posts tripId too. */
  initial?: TripFormValues;
  onCancel?: () => void;
};

const LABEL = "mb-1.5 block text-sm font-medium text-text";
const FIELD = "field w-full px-3.5 py-2.5";

/** Minor units back to the plain number the field shows. */
function budgetText(amount: number): string {
  return amount % 100 === 0 ? String(amount / 100) : (amount / 100).toFixed(2);
}

/**
 * Creates or edits a plan's frame: name, dates, budget, currency, visibility.
 * Native date fields post exactly the YYYY-MM-DD the server reads.
 */
export default function TripForm({ action, initial, onCancel }: Props) {
  const { tt } = useTripT();
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [visibility, setVisibility] = useState<TripVisibility>(
    initial?.visibility ?? "PRIVATE",
  );

  return (
    <ActionForm
      action={action}
      className="glass flex flex-col gap-5 rounded-panel border border-border bg-surface p-6 md:p-8"
      errorClassName="text-sm text-danger-700 dark:text-danger-400"
    >
      <h1 className="font-display text-2xl font-bold text-text">
        {initial ? tt.editTrip : tt.newTripTitle}
      </h1>
      {initial && <input type="hidden" name="tripId" value={initial.id} />}

      <div>
        <label htmlFor="trip-title" className={LABEL}>
          {tt.tripTitle}
        </label>
        <input
          id="trip-title"
          name="title"
          required
          maxLength={TRIP_TITLE_MAX}
          defaultValue={initial?.title}
          placeholder={tt.tripTitlePlaceholder}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="trip-description" className={LABEL}>
          {tt.description}
        </label>
        <textarea
          id="trip-description"
          name="description"
          rows={3}
          maxLength={TRIP_DESCRIPTION_MAX}
          defaultValue={initial?.description ?? ""}
          placeholder={tt.descriptionPlaceholder}
          className={`${FIELD} resize-none`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="trip-start" className={LABEL}>
            {tt.startDate}
          </label>
          <input
            id="trip-start"
            type="date"
            name="startDate"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="trip-end" className={LABEL}>
            {tt.endDate}
          </label>
          <input
            id="trip-end"
            type="date"
            name="endDate"
            required
            defaultValue={initial?.endDate}
            min={startDate || undefined}
            max={startDate ? addDays(startDate, MAX_TRIP_DAYS - 1) : undefined}
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <div>
          <label htmlFor="trip-budget" className={LABEL}>
            {tt.budget}
          </label>
          <input
            id="trip-budget"
            name="budget"
            required
            inputMode="decimal"
            defaultValue={initial ? budgetText(initial.budget) : ""}
            placeholder="600"
            className={`${FIELD} tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor="trip-currency" className={LABEL}>
            {tt.currency}
          </label>
          <select
            id="trip-currency"
            name="currency"
            defaultValue={initial?.currency ?? "EUR"}
            className={FIELD}
          >
            {TRIP_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className={LABEL}>{tt.visibility}</legend>
        <input type="hidden" name="visibility" value={visibility} />
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["PRIVATE", Lock, tt.private, tt.visibilityPrivateHint],
              ["PUBLIC", Globe2, tt.public, tt.visibilityPublicHint],
            ] as const
          ).map(([value, Icon, label, hint]) => (
            <button
              key={value}
              type="button"
              aria-pressed={visibility === value}
              onClick={() => setVisibility(value)}
              className={`flex items-start gap-3 rounded-card border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-focus ${
                visibility === value
                  ? "border-primary bg-primary/10"
                  : "border-border-strong hover:bg-surface-raised"
              }`}
            >
              <Icon size={18} aria-hidden="true" className="mt-0.5 text-text" />
              <span>
                <span className="block text-sm font-semibold text-text">
                  {label}
                </span>
                <span className="block text-xs text-text-muted">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <GlassButton variant="ghost" onClick={onCancel}>
            {tt.cancel}
          </GlassButton>
        )}
        <SubmitButton
          variant="primary"
          pendingText={initial ? tt.saving : tt.creating}
        >
          {initial ? tt.save : tt.createTrip}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
