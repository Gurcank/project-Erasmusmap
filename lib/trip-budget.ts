import { tripDays } from "@/lib/trip-timeline";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type TripExpenseView,
} from "@/lib/trip-types";

/** Lump-sum spending — an expense entered without a category. */
export const LUMP = "LUMP" as const;
export type BudgetBucket = ExpenseCategory | typeof LUMP;
export const BUDGET_BUCKETS: BudgetBucket[] = [...EXPENSE_CATEGORIES, LUMP];

export type BudgetDay = {
  date: string;
  total: number;
  byCategory: Record<BudgetBucket, number>;
  /** Running total up to and including this day. */
  cumulative: number;
  overAllowance: boolean;
};

export type BudgetSummary = {
  budget: number;
  total: number;
  /** Negative once the budget is exceeded. */
  remaining: number;
  overBudget: boolean;
  /** How far over, 0 when within budget. */
  overBy: number;
  /** Even share of the budget per day of the trip. */
  dailyAllowance: number;
  byCategory: Record<BudgetBucket, number>;
  byCity: Record<string, number>;
  days: BudgetDay[];
  /** Expenses dated outside the trip — still counted in the total. */
  outsideTrip: number;
};

function emptyBuckets(): Record<BudgetBucket, number> {
  return Object.fromEntries(BUDGET_BUCKETS.map((key) => [key, 0])) as Record<
    BudgetBucket,
    number
  >;
}

/**
 * Everything the budget panel, the charts and the over-budget warning read.
 * Amounts are minor units throughout, so the sums are exact.
 */
export function summarizeBudget(
  budget: number,
  startDate: string,
  endDate: string,
  expenses: Pick<TripExpenseView, "date" | "amount" | "category" | "cityId">[],
): BudgetSummary {
  const dates = tripDays(startDate, endDate);
  const dailyAllowance = dates.length ? Math.floor(budget / dates.length) : 0;

  const dayMap = new Map<string, BudgetDay>(
    dates.map((date) => [
      date,
      {
        date,
        total: 0,
        byCategory: emptyBuckets(),
        cumulative: 0,
        overAllowance: false,
      },
    ]),
  );
  const byCategory = emptyBuckets();
  const byCity: Record<string, number> = {};
  let total = 0;
  let outsideTrip = 0;

  for (const expense of expenses) {
    const bucket: BudgetBucket = expense.category ?? LUMP;
    total += expense.amount;
    byCategory[bucket] += expense.amount;
    if (expense.cityId) {
      byCity[expense.cityId] = (byCity[expense.cityId] ?? 0) + expense.amount;
    }

    const day = dayMap.get(expense.date);
    if (day) {
      day.total += expense.amount;
      day.byCategory[bucket] += expense.amount;
    } else {
      outsideTrip += expense.amount;
    }
  }

  let running = 0;
  const days = [...dayMap.values()];
  for (const day of days) {
    running += day.total;
    day.cumulative = running;
    day.overAllowance = budget > 0 && day.total > dailyAllowance;
  }

  const remaining = budget - total;
  return {
    budget,
    total,
    remaining,
    overBudget: budget > 0 && remaining < 0,
    overBy: budget > 0 ? Math.max(0, -remaining) : 0,
    dailyAllowance,
    byCategory,
    byCity,
    days,
    outsideTrip,
  };
}

/**
 * Parses a money amount typed by a person — "12", "12.5", "12,50", "1.250,00"
 * — into minor units. Returns null for anything that is not a non-negative
 * amount with at most two decimals.
 */
export function parseMoney(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, "");
  if (!text) return null;

  // The last separator followed by one or two digits is the decimal mark;
  // every other dot or comma is a thousands separator.
  const match = text.match(/^(\d{1,3}(?:[.,]?\d{3})*|\d+)(?:[.,](\d{1,2}))?$/);
  if (!match) return null;

  const whole = Number(match[1].replace(/[.,]/g, ""));
  const fraction = match[2] ? Number(match[2].padEnd(2, "0")) : 0;
  const value = whole * 100 + fraction;
  return Number.isSafeInteger(value) ? value : null;
}

/** Minor units → "1.234,50 €" in the given locale. */
export function formatMoney(
  amount: number,
  currency: string,
  locale = "tr-TR",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}
