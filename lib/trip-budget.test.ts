import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney, summarizeBudget } from "@/lib/trip-budget";

describe("parseMoney", () => {
  it.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12,50", 1250],
    ["1.250,00", 125000],
    ["1250", 125000],
    ["0", 0],
    [" 40 ", 4000],
    // A dot followed by three digits is a thousands separator, as in Turkish.
    ["12.345", 1234500],
  ])("%s → %d", (raw, expected) => {
    expect(parseMoney(raw)).toBe(expected);
  });

  it.each(["", "-5", "abc", "12.3456", "1,2,3", "12e3"])(
    "rejects %s",
    (raw) => {
      expect(parseMoney(raw)).toBeNull();
    },
  );
});

describe("formatMoney", () => {
  it("drops decimals for whole amounts", () => {
    expect(formatMoney(4000, "EUR", "en-US")).toBe("€40");
  });
  it("keeps cents otherwise", () => {
    expect(formatMoney(1250, "EUR", "en-US")).toBe("€12.50");
  });
});

describe("summarizeBudget", () => {
  const start = "2026-12-23";
  const end = "2026-12-25"; // three days

  it("totals by day, category and city", () => {
    const summary = summarizeBudget(60000, start, end, [
      { date: "2026-12-23", amount: 4000, category: "TRANSPORT", cityId: "h" },
      { date: "2026-12-24", amount: 1000, category: "SHOPPING", cityId: "h" },
      { date: "2026-12-24", amount: 2000, category: "FOOD", cityId: "h" },
      { date: "2026-12-25", amount: 5000, category: null, cityId: "a" },
    ]);

    expect(summary.total).toBe(12000);
    expect(summary.remaining).toBe(48000);
    expect(summary.overBudget).toBe(false);
    expect(summary.overBy).toBe(0);
    expect(summary.byCategory.TRANSPORT).toBe(4000);
    expect(summary.byCategory.LUMP).toBe(5000);
    expect(summary.byCity).toEqual({ h: 7000, a: 5000 });
    expect(summary.days.map((day) => day.total)).toEqual([4000, 3000, 5000]);
    expect(summary.days.map((day) => day.cumulative)).toEqual([
      4000, 7000, 12000,
    ]);
    expect(summary.days[1].byCategory.FOOD).toBe(2000);
    expect(summary.dailyAllowance).toBe(20000);
  });

  it("flags going over the budget and over a day's share", () => {
    const summary = summarizeBudget(9000, start, end, [
      { date: "2026-12-23", amount: 8000, category: "FOOD", cityId: null },
      { date: "2026-12-24", amount: 2000, category: null, cityId: null },
    ]);
    expect(summary.overBudget).toBe(true);
    expect(summary.overBy).toBe(1000);
    expect(summary.remaining).toBe(-1000);
    expect(summary.days[0].overAllowance).toBe(true);
    expect(summary.days[1].overAllowance).toBe(false);
  });

  it("counts expenses outside the trip in the total", () => {
    const summary = summarizeBudget(10000, start, end, [
      { date: "2027-01-10", amount: 3000, category: null, cityId: null },
    ]);
    expect(summary.total).toBe(3000);
    expect(summary.outsideTrip).toBe(3000);
    expect(summary.days.every((day) => day.total === 0)).toBe(true);
  });

  it("treats any spending against a zero budget as over", () => {
    const summary = summarizeBudget(0, start, end, [
      { date: start, amount: 1, category: null, cityId: null },
    ]);
    expect(summary.overBudget).toBe(true);
    expect(summary.dailyAllowance).toBe(0);
  });
});
