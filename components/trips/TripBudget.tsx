"use client";

import { useState } from "react";
import { AlertTriangle, Link2, Plus, Trash2 } from "lucide-react";
import ActionForm from "@/components/ui/ActionForm";
import GlassButton from "@/components/ui/GlassButton";
import SubmitButton from "@/components/ui/SubmitButton";
import DonutChart from "@/components/trips/charts/DonutChart";
import DailyBars from "@/components/trips/charts/DailyBars";
import CumulativeLine from "@/components/trips/charts/CumulativeLine";
import {
  withSuccess,
  type TripActions,
} from "@/components/trips/planner-types";
import { fill, useTripT } from "@/hooks/useTripT";
import {
  BUDGET_BUCKETS,
  formatMoney,
  LUMP,
  type BudgetSummary,
} from "@/lib/trip-budget";
import { CATEGORY_COLOR, cityColor, formatDay } from "@/lib/trip-format";
import { EXPENSE_CATEGORIES, type TripView } from "@/lib/trip-types";

type Props = {
  trip: TripView;
  days: string[];
  budget: BudgetSummary;
  isOwner: boolean;
  cityIndex: Map<string, number>;
  dayCities: Record<string, string[]>;
  actions: TripActions;
};

const LABEL = "mb-1 block text-xs text-text-subtle";
const FIELD = "field w-full px-3 py-2 text-sm";

export default function TripBudget({
  trip,
  days,
  budget,
  isOwner,
  cityIndex,
  dayCities,
  actions,
}: Props) {
  const { tt, locale } = useTripT();
  const money = (minor: number) => formatMoney(minor, trip.currency, locale);
  const [day, setDay] = useState(days[0] ?? "");
  const [formKey, setFormKey] = useState(0);
  const cityName = new Map(
    trip.cities.map((entry) => [entry.city.id, entry.city.name]),
  );
  const bucketLabel = (bucket: string) => tt[`cat${bucket}` as keyof typeof tt];

  const slices = BUDGET_BUCKETS.map((bucket) => ({
    key: bucket,
    label: bucketLabel(bucket),
    value: budget.byCategory[bucket],
    color: CATEGORY_COLOR[bucket],
    display: money(budget.byCategory[bucket]),
  }));

  const barDays = budget.days.map((entry, index) => ({
    key: entry.date,
    label: `${fill(tt.dayLabel, { n: index + 1 })} · ${formatDay(entry.date, locale)}`,
    shortLabel: String(Number(entry.date.slice(8, 10))),
    total: entry.total,
    over: entry.overAllowance,
    segments: BUDGET_BUCKETS.map((bucket) => ({
      key: bucket,
      label: bucketLabel(bucket),
      value: entry.byCategory[bucket],
      color: CATEGORY_COLOR[bucket],
    })),
  }));

  const cityTotals = Object.entries(budget.byCity)
    .map(([cityId, total]) => ({
      cityId,
      total,
      name: cityName.get(cityId) ?? "—",
      color: cityColor(cityIndex.get(cityId) ?? 0),
    }))
    .sort((a, b) => b.total - a.total);
  const cityMax = Math.max(1, ...cityTotals.map((entry) => entry.total));

  const expensesByDay = new Map<string, typeof trip.expenses>();
  for (const expense of trip.expenses) {
    const list = expensesByDay.get(expense.date) ?? [];
    list.push(expense);
    expensesByDay.set(expense.date, list);
  }
  const defaultCity = dayCities[day]?.[dayCities[day].length - 1] ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-on-backdrop">
          {tt.sectionBudget}
        </h2>
        <p className="text-sm text-on-backdrop-muted">
          {tt.dailyAllowance}: <strong>{money(budget.dailyAllowance)}</strong> ·{" "}
          {tt.remaining}:{" "}
          <strong className={budget.overBudget ? "text-danger-400" : ""}>
            {money(budget.remaining)}
          </strong>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={tt.byCategory}>
          <DonutChart
            slices={slices}
            centerLabel={tt.spent}
            centerValue={money(budget.total)}
            emptyText={tt.chartEmpty}
          />
        </Panel>
        <Panel title={tt.cumulative}>
          <CumulativeLine
            points={budget.days.map((entry, index) => ({
              key: entry.date,
              label: `${fill(tt.dayLabel, { n: index + 1 })} · ${formatDay(entry.date, locale)}`,
              shortLabel: String(Number(entry.date.slice(8, 10))),
              value: entry.cumulative,
            }))}
            budget={budget.budget}
            budgetLabel={tt.budgetLabel}
            seriesLabel={tt.spent}
            remainingLabel={tt.remaining}
            formatValue={money}
            locale={locale}
            emptyText={tt.chartEmpty}
          />
        </Panel>
        <Panel title={tt.perDay}>
          <DailyBars
            days={barDays}
            reference={budget.dailyAllowance}
            referenceLabel={tt.dailyAllowance}
            formatValue={money}
            locale={locale}
            emptyText={tt.chartEmpty}
            overLabel={tt.dayOver}
          />
          {/* One legend for the category colours used by both charts. */}
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
            {BUDGET_BUCKETS.filter(
              (bucket) => budget.byCategory[bucket] > 0,
            ).map((bucket) => (
              <li key={bucket} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: CATEGORY_COLOR[bucket] }}
                  aria-hidden="true"
                />
                {bucketLabel(bucket)}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={tt.byCity}>
          {cityTotals.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-muted">
              {tt.chartEmpty}
            </p>
          ) : (
            <ul className="space-y-3">
              {cityTotals.map((entry) => (
                <li key={entry.cityId}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-text">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: entry.color }}
                        aria-hidden="true"
                      />
                      {entry.name}
                    </span>
                    <span className="font-semibold text-text tabular-nums">
                      {money(entry.total)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-ink-500/12">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(entry.total / cityMax) * 100}%`,
                        background: entry.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title={isOwner ? tt.addExpense : tt.perDay}>
        {isOwner && (
          <ActionForm
            key={formKey}
            action={withSuccess(actions.saveTripExpense, () =>
              setFormKey((key) => key + 1),
            )}
            className="mb-6 grid gap-3 rounded-card border border-border-strong p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_0.8fr_1fr_1.2fr_auto] lg:items-end"
            errorClassName="text-sm text-danger-700 dark:text-danger-400 sm:col-span-2 lg:col-span-6"
          >
            <input type="hidden" name="tripId" value={trip.id} />
            <div>
              <label htmlFor="expense-day" className={LABEL}>
                {tt.expenseDate}
              </label>
              <select
                id="expense-day"
                name="date"
                value={day}
                onChange={(event) => setDay(event.target.value)}
                className={FIELD}
              >
                {days.map((date, index) => (
                  <option key={date} value={date}>
                    {fill(tt.dayLabel, { n: index + 1 })} ·{" "}
                    {formatDay(date, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="expense-category" className={LABEL}>
                {tt.category}
              </label>
              <select id="expense-category" name="category" className={FIELD}>
                <option value="">{tt.lumpSum}</option>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {bucketLabel(category)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="expense-amount" className={LABEL}>
                {tt.amount} ({trip.currency})
              </label>
              <input
                id="expense-amount"
                name="amount"
                required
                inputMode="decimal"
                placeholder="20"
                className={`${FIELD} tabular-nums`}
              />
            </div>
            <div>
              <label htmlFor="expense-city" className={LABEL}>
                {tt.city}
              </label>
              <select
                id="expense-city"
                name="cityId"
                key={`${day}-${defaultCity}`}
                defaultValue={defaultCity}
                className={FIELD}
              >
                <option value="">—</option>
                {trip.cities.map((entry) => (
                  <option key={entry.city.id} value={entry.city.id}>
                    {entry.city.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="expense-note" className={LABEL}>
                {tt.note}
              </label>
              <input
                id="expense-note"
                name="note"
                maxLength={200}
                className={FIELD}
              />
            </div>
            <SubmitButton variant="primary">
              <Plus size={15} aria-hidden="true" />
              {tt.addExpense}
            </SubmitButton>
          </ActionForm>
        )}

        {trip.expenses.length === 0 ? (
          <p className="text-sm text-text-muted">{tt.noExpenses}</p>
        ) : (
          <ol className="grid gap-3 md:grid-cols-2">
            {budget.days
              .filter((entry) => expensesByDay.has(entry.date))
              .map((entry) => {
                const index = days.indexOf(entry.date);
                return (
                  <li
                    key={entry.date}
                    className="rounded-card border border-border bg-surface-raised/50 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-text">
                        {fill(tt.dayLabel, { n: index + 1 })} ·{" "}
                        {formatDay(entry.date, locale)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${
                          entry.overAllowance
                            ? "text-danger-700 dark:text-danger-400"
                            : "text-text"
                        }`}
                      >
                        {entry.overAllowance && (
                          <AlertTriangle size={13} aria-label={tt.dayOver} />
                        )}
                        {money(entry.total)}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {(expensesByDay.get(entry.date) ?? []).map((expense) => {
                        const bucket = expense.category ?? LUMP;
                        return (
                          <li
                            key={expense.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-sm"
                              style={{ background: CATEGORY_COLOR[bucket] }}
                              aria-hidden="true"
                            />
                            <span className="text-text">
                              {bucketLabel(bucket)}
                            </span>
                            {expense.cityId && (
                              <span className="text-text-subtle">
                                · {cityName.get(expense.cityId)}
                              </span>
                            )}
                            {expense.note && (
                              <span className="truncate text-text-subtle">
                                · {expense.note}
                              </span>
                            )}
                            <span className="ml-auto font-medium text-text tabular-nums">
                              {money(expense.amount)}
                            </span>
                            {expense.itemId ? (
                              <span
                                title={tt.fromItem}
                                className="text-text-subtle"
                              >
                                <Link2 size={14} aria-label={tt.fromItem} />
                              </span>
                            ) : (
                              isOwner && (
                                <ActionForm
                                  action={actions.deleteTripExpense}
                                  confirmMessage={tt.confirmDeleteExpense}
                                  confirmLabel={tt.delete}
                                >
                                  <input
                                    type="hidden"
                                    name="tripId"
                                    value={trip.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="expenseId"
                                    value={expense.id}
                                  />
                                  <GlassButton
                                    type="submit"
                                    size="iconSm"
                                    variant="ghost"
                                    aria-label={tt.delete}
                                  >
                                    <Trash2 size={13} aria-hidden="true" />
                                  </GlassButton>
                                </ActionForm>
                              )
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
          </ol>
        )}

        {budget.outsideTrip > 0 && (
          <p className="mt-3 text-sm text-text-muted">
            {tt.outsideTripExpenses}: {money(budget.outsideTrip)}
          </p>
        )}
      </Panel>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-panel border border-border bg-surface p-5 md:p-6">
      <h3 className="mb-4 font-semibold text-text">{title}</h3>
      {children}
    </div>
  );
}
