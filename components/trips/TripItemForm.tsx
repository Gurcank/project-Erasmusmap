"use client";

import { useState } from "react";
import {
  Bed,
  Bus,
  Ellipsis,
  Footprints,
  ShoppingBag,
  Utensils,
} from "lucide-react";
import ActionForm from "@/components/ui/ActionForm";
import GlassButton from "@/components/ui/GlassButton";
import SubmitButton from "@/components/ui/SubmitButton";
import CityField, { type CityChoice } from "@/components/trips/CityField";
import { withSuccess } from "@/components/trips/planner-types";
import { useTripT } from "@/hooks/useTripT";
import type { FormAction } from "@/lib/action-result";
import { ITEM_NOTES_MAX, ITEM_TITLE_MAX } from "@/lib/trip-schemas";
import { addDays } from "@/lib/trip-timeline";
import {
  TRANSPORT_MODES,
  type ExpenseCategory,
  type TripCityRef,
  type TripItemType,
  type TripItemView,
} from "@/lib/trip-types";

type Props = {
  tripId: string;
  item: TripItemView | null;
  day: string;
  tripStart: string;
  tripEnd: string;
  action: FormAction;
  onClose: () => void;
};

/**
 * The one choice that shapes an entry. Each kind is also the spending category
 * of its cost, so the budget needs no second dropdown: picking "Yemek" files
 * the entry and its cost under food.
 */
const KINDS: {
  category: ExpenseCategory;
  type: TripItemType;
  icon: typeof Bus;
}[] = [
  { category: "TRANSPORT", type: "TRANSPORT", icon: Bus },
  { category: "ACCOMMODATION", type: "STAY", icon: Bed },
  { category: "ACTIVITIES", type: "ACTIVITY", icon: Footprints },
  { category: "FOOD", type: "ACTIVITY", icon: Utensils },
  { category: "SHOPPING", type: "ACTIVITY", icon: ShoppingBag },
  { category: "OTHER", type: "ACTIVITY", icon: Ellipsis },
];

const LABEL = "mb-1 block text-xs text-text-subtle";
const FIELD = "field w-full px-3 py-2 text-sm";

/** Which kind an existing entry belongs to. */
function kindOf(item: TripItemView | null): ExpenseCategory {
  if (!item) return "ACTIVITIES";
  if (item.type === "TRANSPORT") return "TRANSPORT";
  if (item.type === "STAY") return "ACCOMMODATION";
  if (item.type === "NOTE") return "OTHER";
  const saved = item.costCategory;
  return saved && saved !== "TRANSPORT" && saved !== "ACCOMMODATION"
    ? saved
    : "ACTIVITIES";
}

function toChoice(city: TripCityRef | null): CityChoice | null {
  return city ? { id: city.id, name: city.name, country: city.country } : null;
}

function moneyText(amount: number | null): string {
  if (amount === null) return "";
  return amount % 100 === 0 ? String(amount / 100) : (amount / 100).toFixed(2);
}

/**
 * Adds or edits one timeline entry.
 *
 * Title, kind, when it starts and ends, and the cost are all on show; a title and
 * Enter is a complete entry. A meal or a purchase has no date to pick: it
 * belongs to the day it was added under.
 */
export default function TripItemForm({
  tripId,
  item,
  day,
  tripStart,
  tripEnd,
  action,
  onClose,
}: Props) {
  const { tt } = useTripT();
  const [category, setCategory] = useState<ExpenseCategory>(kindOf(item));
  const [startAt, setStartAt] = useState(item?.startAt ?? `${day}T09:00`);
  const [from, setFrom] = useState<CityChoice | null>(
    toChoice(item?.city ?? null),
  );
  const [to, setTo] = useState<CityChoice | null>(
    toChoice(item?.toCity ?? null),
  );
  const kind = KINDS.find((entry) => entry.category === category) ?? KINDS[2];
  const isTransport = kind.type === "TRANSPORT";
  // A meal or a purchase belongs to the day it was added under; no date to pick.
  const hasDay = category !== "FOOD" && category !== "SHOPPING";

  return (
    <ActionForm
      action={withSuccess(action, onClose)}
      className="glass flex flex-col gap-3.5 rounded-panel border border-primary/60 bg-surface p-4 shadow-popover sm:p-5"
      errorClassName="text-sm text-danger-700 dark:text-danger-400"
    >
      <h3 className="font-display text-lg font-semibold text-text">
        {item ? tt.editItem : tt.addItem}
      </h3>
      <input type="hidden" name="tripId" value={tripId} />
      {item && <input type="hidden" name="itemId" value={item.id} />}
      <input type="hidden" name="type" value={kind.type} />
      <input type="hidden" name="costCategory" value={category} />
      {/* The day-and-time field edits this one value. */}
      <input type="hidden" name="startAt" value={startAt} />

      <div
        role="radiogroup"
        aria-label={tt.itemType}
        className="grid grid-cols-3 gap-1.5"
      >
        {KINDS.map(({ category: value, icon: Icon }) => {
          const selected = category === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setCategory(value)}
              className={`flex items-center justify-center gap-1.5 rounded-control border px-2 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-focus ${
                selected
                  ? "border-primary bg-primary/12 font-semibold text-text"
                  : "border-border-strong text-text-muted hover:bg-surface-raised"
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {tt[`cat${value}`]}
            </button>
          );
        })}
      </div>

      <div>
        <label htmlFor="item-title" className="sr-only">
          {tt.itemTitle}
        </label>
        <input
          id="item-title"
          name="title"
          required
          autoFocus
          maxLength={ITEM_TITLE_MAX}
          defaultValue={item?.title}
          placeholder={tt.itemTitlePlaceholder}
          className={`${FIELD} text-base`}
        />
      </div>

      <div className={hasDay ? "grid gap-3 sm:grid-cols-2" : ""}>
        {hasDay && (
          <div>
            <label htmlFor="item-date" className={LABEL}>
              {tt.expenseDate}
            </label>
            <input
              id="item-date"
              type="datetime-local"
              required
              value={startAt}
              onChange={(event) =>
                event.target.value && setStartAt(event.target.value)
              }
              min={`${tripStart}T00:00`}
              max={`${tripEnd}T23:59`}
              className={FIELD}
            />
          </div>
        )}
        <div>
          <label htmlFor="item-end" className={LABEL}>
            {tt.endAt}
          </label>
          <input
            id="item-end"
            type="datetime-local"
            name="endAt"
            defaultValue={item?.endAt ?? ""}
            min={startAt}
            max={`${addDays(tripEnd, 1)}T23:59`}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label htmlFor="item-cost" className={LABEL}>
          {tt.cost}
        </label>
        <input
          id="item-cost"
          name="cost"
          inputMode="decimal"
          defaultValue={moneyText(item?.cost ?? null)}
          placeholder="0"
          className={`${FIELD} tabular-nums`}
        />
      </div>

      <div className={isTransport ? "grid gap-3 sm:grid-cols-2" : ""}>
        <CityField
          label={isTransport ? tt.from : tt.city}
          name="cityId"
          value={from}
          onChange={setFrom}
        />
        {isTransport && (
          <CityField
            label={tt.to}
            name="toCityId"
            value={to}
            onChange={setTo}
          />
        )}
      </div>

      {isTransport && (
        <div>
          <label htmlFor="item-mode" className={LABEL}>
            {tt.mode}
          </label>
          <select
            id="item-mode"
            name="mode"
            defaultValue={item?.mode ?? "BUS"}
            className={FIELD}
          >
            {TRANSPORT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {tt[`mode${mode}`]}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="item-notes" className={LABEL}>
          {tt.notes}
        </label>
        <textarea
          id="item-notes"
          name="notes"
          rows={2}
          maxLength={ITEM_NOTES_MAX}
          defaultValue={item?.notes ?? ""}
          className={`${FIELD} resize-y`}
        />
      </div>

      <div className="flex justify-end gap-2">
        <GlassButton variant="ghost" onClick={onClose}>
          {tt.cancel}
        </GlassButton>
        <SubmitButton variant="primary" pendingText={tt.saving}>
          {tt.save}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
