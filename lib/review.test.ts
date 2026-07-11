import { describe, expect, it } from "vitest";
import {
  averageRating,
  MAX_REVIEW_LENGTH,
  parseRatings,
  parseReviewContent,
} from "./review";

function ratingsFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const defaults = {
    culture: "5",
    gastronomy: "4",
    safety: "3",
    socialLife: "2",
    transport: "1",
    costOfLiving: "5",
    ...overrides,
  };
  for (const [key, value] of Object.entries(defaults)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseRatings", () => {
  it("parses valid 1-5 integer ratings", () => {
    expect(parseRatings(ratingsFormData())).toEqual({
      culture: 5,
      gastronomy: 4,
      safety: 3,
      socialLife: 2,
      transport: 1,
      costOfLiving: 5,
    });
  });

  it("rejects ratings outside the 1-5 range", () => {
    expect(() => parseRatings(ratingsFormData({ culture: "6" }))).toThrow();
    expect(() => parseRatings(ratingsFormData({ culture: "0" }))).toThrow();
  });

  it("rejects non-integer ratings", () => {
    expect(() => parseRatings(ratingsFormData({ culture: "3.5" }))).toThrow();
    expect(() =>
      parseRatings(ratingsFormData({ culture: "not-a-number" })),
    ).toThrow();
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
  it("averages the 6 category ratings", () => {
    expect(
      averageRating({
        culture: 5,
        gastronomy: 5,
        safety: 5,
        socialLife: 5,
        transport: 5,
        costOfLiving: 5,
      }),
    ).toBe(5);

    expect(
      averageRating({
        culture: 1,
        gastronomy: 2,
        safety: 3,
        socialLife: 4,
        transport: 5,
        costOfLiving: 3,
      }),
    ).toBe(3);
  });
});
