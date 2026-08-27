import { describe, expect, it } from "vitest";
import { parseVisitDates } from "./schemas";

function dates(start?: string, end?: string): FormData {
  const formData = new FormData();
  if (start !== undefined) formData.set("startDate", start);
  if (end !== undefined) formData.set("endDate", end);
  return formData;
}

describe("parseVisitDates", () => {
  it("parses a month range to the first of each month, in UTC", () => {
    const result = parseVisitDates(dates("2024-09", "2025-02"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.startDate?.toISOString()).toBe(
      "2024-09-01T00:00:00.000Z",
    );
    expect(result.data.endDate?.toISOString()).toBe("2025-02-01T00:00:00.000Z");
  });

  it("treats empty fields as cleared, not invalid", () => {
    const result = parseVisitDates(dates("", ""));
    expect(result).toEqual({
      ok: true,
      data: { startDate: null, endDate: null },
    });
  });

  it("accepts only one end of the range", () => {
    const result = parseVisitDates(dates("2024-09", ""));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.startDate).toBeInstanceOf(Date);
    expect(result.data.endDate).toBeNull();
  });

  it("rejects a start after the end", () => {
    const result = parseVisitDates(dates("2025-03", "2024-09"));
    expect(result).toEqual({
      ok: false,
      error: "Başlangıç tarihi bitişten sonra olamaz",
    });
  });

  it("accepts a single month as both ends", () => {
    expect(parseVisitDates(dates("2024-09", "2024-09")).ok).toBe(true);
  });

  it("rejects malformed and out-of-range values", () => {
    for (const value of ["2024", "2024-13", "2024-00", "eylul", "1900-01"]) {
      expect(parseVisitDates(dates(value, "")).ok).toBe(false);
    }
  });

  it("rejects a year far in the future", () => {
    const tooFar = new Date().getUTCFullYear() + 11;
    expect(parseVisitDates(dates(`${tooFar}-01`, "")).ok).toBe(false);
  });
});
