import { z } from "zod";
import type { ReviewRatings } from "@/types";
import { UserFacingError } from "@/lib/action-result";
import { firstIssueMessage } from "@/lib/schemas";

export const RATING_FIELDS = [
  "culture",
  "gastronomy",
  "safety",
  "socialLife",
  "transport",
  "costOfLiving",
] as const;

export const MAX_REVIEW_LENGTH = 1000;

/** Highest value stored in the database. 10 stored = 5 stars shown. */
export const MAX_RATING_VALUE = 10;
/** Highest value shown in the interface. */
export const MAX_STARS = 5;

const RATING_ERROR = "Puanlar 0,5 ile 5 yıldız arasında olmalı";

/**
 * Ratings are stored as integers on a 1–10 scale rather than as floats on a
 * 1–5 one: half stars stay exact, and averages never accumulate
 * floating-point error.
 *
 * Empty or absent is stored as null — a review can leave a category, or every
 * category, unrated. A value that is present still has to be an integer 1–10.
 */
const ratingField = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? null : value,
  z.coerce
    .number({ error: RATING_ERROR })
    .int(RATING_ERROR)
    .min(1, RATING_ERROR)
    .max(MAX_RATING_VALUE, RATING_ERROR)
    .nullable(),
);

export const ratingsSchema = z.object(
  Object.fromEntries(
    RATING_FIELDS.map((field) => [field, ratingField]),
  ) as Record<(typeof RATING_FIELDS)[number], typeof ratingField>,
);

// The text is optional: a rating on its own is a valid review, so an empty
// body is stored as "" rather than rejected. Only the length ceiling is a
// hard failure.
export const reviewContentSchema = z
  .string({ error: "Geçersiz yorum" })
  .trim()
  .max(
    MAX_REVIEW_LENGTH,
    `Yorum en fazla ${MAX_REVIEW_LENGTH} karakter olabilir`,
  );

/** Stored value (1–10) to the star count the interface shows (0.5–5). */
export function toStars(ratingValue: number): number {
  return ratingValue / 2;
}

/** Star count from the interface (0.5–5) to the stored value (1–10). */
export function toRatingValue(stars: number): number {
  return Math.round(stars * 2);
}

export function parseRatings(formData: FormData): ReviewRatings {
  const raw = Object.fromEntries(
    RATING_FIELDS.map((field) => [field, formData.get(field)]),
  );

  const result = ratingsSchema.safeParse(raw);
  if (!result.success)
    throw new UserFacingError(firstIssueMessage(result.error));

  return result.data;
}

export function parseReviewContent(formData: FormData): string {
  const result = reviewContentSchema.safeParse(formData.get("content") ?? "");
  if (!result.success)
    throw new UserFacingError(firstIssueMessage(result.error));

  return result.data;
}

/**
 * Average of the rated categories, returned in stars so callers can render it
 * directly. Input is in stored units. Unrated categories are skipped; a review
 * with no ratings at all returns null so the caller can hide the score.
 */
export function averageRating(ratings: ReviewRatings): number | null {
  const values = RATING_FIELDS.map((field) => ratings[field]).filter(
    (value): value is number => value !== null,
  );
  if (values.length === 0) return null;

  const total = values.reduce((sum, value) => sum + value, 0);
  return toStars(total / values.length);
}
