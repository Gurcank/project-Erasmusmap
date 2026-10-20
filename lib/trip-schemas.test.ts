import { describe, expect, it } from "vitest";
import {
  itemWithinTrip,
  parseExpenseForm,
  parseTripForm,
  parseTripItemForm,
} from "@/lib/trip-schemas";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe("parseTripForm", () => {
  const valid = {
    title: "Kış turu",
    startDate: "2026-12-23",
    endDate: "2027-01-06",
    budget: "600",
    currency: "EUR",
    visibility: "PRIVATE",
  };

  it("parses the budget into minor units", () => {
    const result = parseTripForm(form(valid));
    expect(result.ok && result.data.budget).toBe(60000);
  });

  it("rejects a reversed range", () => {
    const result = parseTripForm(form({ ...valid, endDate: "2026-12-01" }));
    expect(result.ok).toBe(false);
  });

  it("rejects an impossible day", () => {
    const result = parseTripForm(form({ ...valid, startDate: "2026-02-30" }));
    expect(result.ok).toBe(false);
  });

  it("rejects a trip longer than the limit", () => {
    const result = parseTripForm(form({ ...valid, endDate: "2027-06-01" }));
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown currency", () => {
    const result = parseTripForm(form({ ...valid, currency: "XYZ" }));
    expect(result.ok).toBe(false);
  });
});

describe("parseTripItemForm", () => {
  it("drops destination fields from a non-transport item", () => {
    const result = parseTripItemForm(
      form({
        type: "ACTIVITY",
        title: "Müze",
        startAt: "2026-12-24T10:00",
        toCityId: "abc",
        mode: "BUS",
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.toCityId).toBeNull();
      expect(result.data.mode).toBeNull();
    }
  });

  it("rejects an end before the start", () => {
    const result = parseTripItemForm(
      form({
        type: "ACTIVITY",
        title: "x",
        startAt: "2026-12-24T10:00",
        endAt: "2026-12-24T09:00",
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects half a coordinate", () => {
    const result = parseTripItemForm(
      form({
        type: "ACTIVITY",
        title: "x",
        startAt: "2026-12-24T10:00",
        lat: "53.5",
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("reads an optional cost", () => {
    const result = parseTripItemForm(
      form({
        type: "TRANSPORT",
        title: "Otobüs",
        startAt: "2026-12-23T22:00",
        cost: "40",
        costCategory: "TRANSPORT",
        mode: "BUS",
      }),
    );
    expect(result.ok && result.data.cost).toBe(4000);
  });
});

describe("itemWithinTrip", () => {
  it("lets an overnight return end the morning after the last day", () => {
    expect(
      itemWithinTrip(
        { startAt: "2027-01-06T22:00", endAt: "2027-01-07T08:00" },
        "2026-12-23",
        "2027-01-06",
      ),
    ).toBe(true);
  });

  it("rejects an item starting after the trip", () => {
    expect(
      itemWithinTrip(
        { startAt: "2027-01-07T10:00", endAt: null },
        "2026-12-23",
        "2027-01-06",
      ),
    ).toBe(false);
  });
});

describe("parseExpenseForm", () => {
  it("accepts a lump sum", () => {
    const result = parseExpenseForm(form({ date: "2026-12-24", amount: "70" }));
    expect(result.ok && result.data).toMatchObject({
      amount: 7000,
      category: null,
    });
  });

  it("requires an amount", () => {
    expect(parseExpenseForm(form({ date: "2026-12-24" })).ok).toBe(false);
  });
});
