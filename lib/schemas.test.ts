import { describe, expect, it } from "vitest";
import { parseVisitDates } from "./schemas";

function dates(start?: string, end?: string): FormData {
  const formData = new FormData();
  if (start !== undefined) formData.set("startDate", start);
  if (end !== undefined) formData.set("endDate", end);
  return formData;
}

describe("parseVisitDates", () => {
  it("parses a day range at midnight UTC", () => {
    const result = parseVisitDates(dates("2024-09-12", "2025-02-03"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.startDate?.toISOString()).toBe(
      "2024-09-12T00:00:00.000Z",
    );
    expect(result.data.endDate?.toISOString()).toBe("2025-02-03T00:00:00.000Z");
  });

  it("treats empty fields as cleared, not invalid", () => {
    const result = parseVisitDates(dates("", ""));
    expect(result).toEqual({
      ok: true,
      data: { startDate: null, endDate: null },
    });
  });

  it("accepts only one end of the range", () => {
    const result = parseVisitDates(dates("2024-09-12", ""));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.startDate).toBeInstanceOf(Date);
    expect(result.data.endDate).toBeNull();
  });

  it("rejects a start after the end", () => {
    const result = parseVisitDates(dates("2025-03-01", "2024-09-01"));
    expect(result).toEqual({
      ok: false,
      error: "Başlangıç tarihi bitişten sonra olamaz",
    });
  });

  it("accepts a single day as both ends", () => {
    expect(parseVisitDates(dates("2024-09-12", "2024-09-12")).ok).toBe(true);
  });

  it("rejects malformed, impossible and out-of-range values", () => {
    for (const value of [
      "2024",
      "2024-09",
      "2024-13-01",
      "2024-00-01",
      "2025-02-30",
      "eylul",
      "1900-01-01",
    ]) {
      expect(parseVisitDates(dates(value, "")).ok).toBe(false);
    }
  });

  it("rejects a year far in the future", () => {
    const tooFar = new Date().getUTCFullYear() + 11;
    expect(parseVisitDates(dates(`${tooFar}-01-01`, "")).ok).toBe(false);
  });
});
