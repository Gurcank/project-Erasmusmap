import { describe, expect, it } from "vitest";
import {
  EARLIEST_STAY,
  formatStayDate,
  fromStoredDate,
  parseStayDate,
  stayDatePlaceholder,
  toISODate,
} from "./stay-dates";

const iso = (value: Date | null | "invalid") =>
  value instanceof Date ? toISODate(value) : value;

describe("parseStayDate", () => {
  it("accepts every shape a person is likely to type", () => {
    for (const text of [
      "7.9.2025",
      "07.09.2025",
      "7/9/2025",
      "7-9-2025",
      "7 Eyl 2025",
      "7 Eylül 2025",
      "2025-09-07",
      "  7.9.2025  ",
    ]) {
      expect(iso(parseStayDate(text))).toBe("2025-09-07");
    }
  });

  it("returns null for an empty field rather than an error", () => {
    expect(parseStayDate("")).toBeNull();
    expect(parseStayDate("   ")).toBeNull();
  });

  it("rejects text that names no real day", () => {
    for (const text of ["abc", "7.13.2025", "32.9.2025", "9.2025", "7.9.25"]) {
      expect(parseStayDate(text)).toBe("invalid");
    }
  });

  it("rejects dates outside the given bounds", () => {
    const bounds = { min: EARLIEST_STAY, max: new Date(2025, 8, 30) };
    expect(parseStayDate("7.9.1999", bounds)).toBe("invalid");
    expect(parseStayDate("7.9.2030", bounds)).toBe("invalid");
    expect(iso(parseStayDate("7.9.2025", bounds))).toBe("2025-09-07");
  });

  it("normalises to the start of the day", () => {
    const parsed = parseStayDate("7.9.2025");
    expect(parsed instanceof Date).toBe(true);
    if (!(parsed instanceof Date)) return;
    expect([
      parsed.getHours(),
      parsed.getMinutes(),
      parsed.getSeconds(),
    ]).toEqual([0, 0, 0]);
  });
});

describe("formatStayDate", () => {
  it("writes back without padding, which is what the fields accept", () => {
    expect(formatStayDate(new Date(2025, 8, 7))).toBe("7.9.2025");
  });

  it("offers an example with a single-digit day and month", () => {
    expect(stayDatePlaceholder()).toBe("5.9.2025");
  });

  it("round-trips through the parser", () => {
    const original = new Date(2024, 11, 31);
    expect(iso(parseStayDate(formatStayDate(original)))).toBe("2024-12-31");
  });
});

describe("toISODate", () => {
  it("uses the local calendar day, not the UTC one", () => {
    // 23:30 local on the 7th is the 8th in UTC for a positive offset; the day
    // the person picked is the one that must survive.
    expect(toISODate(new Date(2025, 8, 7, 23, 30))).toBe("2025-09-07");
  });

  it("is empty for a missing date, which the server reads as cleared", () => {
    expect(toISODate(null)).toBe("");
    expect(toISODate(undefined)).toBe("");
  });
});

describe("fromStoredDate", () => {
  it("brings a midnight-UTC stored date back to the day it names", () => {
    const stored = new Date("2025-09-07T00:00:00.000Z");
    expect(toISODate(fromStoredDate(stored))).toBe("2025-09-07");
  });

  it("passes null through", () => {
    expect(fromStoredDate(null)).toBeNull();
  });
});
