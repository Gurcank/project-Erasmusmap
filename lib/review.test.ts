import { describe, expect, it } from "vitest";
import {
  averageRating,
  MAX_RATING_VALUE,
  MAX_REVIEW_LENGTH,
  parseRatings,
  parseReviewContent,
  toRatingValue,
  toStars,
} from "./review";

/** Values here are in stored units (1–10), where 10 means 5 stars. */
function ratingsFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const defaults = {
    culture: "10",
    gastronomy: "8",
    safety: "6",
    socialLife: "4",
    transport: "2",
    costOfLiving: "10",
    ...overrides,
  };
  for (const [key, value] of Object.entries(defaults)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseRatings", () => {
  it("parses valid stored-unit ratings", () => {
    expect(parseRatings(ratingsFormData())).toEqual({
      culture: 10,
      gastronomy: 8,
      safety: 6,
      socialLife: 4,
      transport: 2,
      costOfLiving: 10,
    });
  });

  it("accepts odd values, which are the half stars", () => {
    expect(parseRatings(ratingsFormData({ culture: "7" })).culture).toBe(7);
  });

  it("rejects ratings outside the stored range", () => {
    expect(() => parseRatings(ratingsFormData({ culture: "11" }))).toThrow();
    expect(() => parseRatings(ratingsFormData({ culture: "0" }))).toThrow();
  });

  it("rejects non-integer ratings", () => {
    expect(() => parseRatings(ratingsFormData({ culture: "3.5" }))).toThrow();
    expect(() =>
      parseRatings(ratingsFormData({ culture: "not-a-number" })),
    ).toThrow();
  });

  it("rejects an unrated category", () => {
    expect(() => parseRatings(ratingsFormData({ culture: "" }))).toThrow();
  });
});

describe("star conversion", () => {
  it("maps stored units to stars", () => {
    expect(toStars(10)).toBe(5);
    expect(toStars(7)).toBe(3.5);
    expect(toStars(1)).toBe(0.5);
  });

  it("maps stars back to stored units", () => {
    expect(toRatingValue(5)).toBe(MAX_RATING_VALUE);
    expect(toRatingValue(3.5)).toBe(7);
    expect(toRatingValue(0.5)).toBe(1);
  });

  it("round-trips every half step without drift", () => {
    for (let stored = 1; stored <= MAX_RATING_VALUE; stored++) {
      expect(toRatingValue(toStars(stored))).toBe(stored);
    }
  });
});

describe("parseReviewContent", () => {
  it("returns the trimmed content", () => {
    const formData = new FormData();
    formData.set("content", "  Harika bir şehir!  ");
    expect(parseReviewContent(formData)).toBe("Harika bir şehir!");
  });

  it("rejects empty content", () => {
    const formData = new FormData();
    formData.set("content", "   ");
    expect(() => parseReviewContent(formData)).toThrow(/boş olamaz/);
  });

  it("rejects content longer than the max length", () => {
    const formData = new FormData();
    formData.set("content", "a".repeat(MAX_REVIEW_LENGTH + 1));
    expect(() => parseReviewContent(formData)).toThrow(/en fazla/);
  });
});

describe("averageRating", () => {
  it("averages the six categories and returns stars", () => {
    expect(
      averageRating({
        culture: 10,
        gastronomy: 10,
        safety: 10,
        socialLife: 10,
        transport: 10,
        costOfLiving: 10,
      }),
    ).toBe(5);

    expect(
      averageRating({
        culture: 2,
        gastronomy: 4,
        safety: 6,
        socialLife: 8,
        transport: 10,
        costOfLiving: 6,
      }),
    ).toBe(3);
  });

  it("keeps half-star precision in the average", () => {
    expect(
      averageRating({
        culture: 7,
        gastronomy: 7,
        safety: 7,
        socialLife: 7,
        transport: 7,
        costOfLiving: 7,
      }),
    ).toBe(3.5);
  });
});
