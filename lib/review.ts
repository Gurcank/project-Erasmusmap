import { z } from "zod";
import type { CategoryRatings } from "@/types";

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
 */
const ratingField = z.coerce
  .number({ error: RATING_ERROR })
  .int(RATING_ERROR)
  .min(1, RATING_ERROR)
  .max(MAX_RATING_VALUE, RATING_ERROR);

export const ratingsSchema = z.object(
  Object.fromEntries(
    RATING_FIELDS.map((field) => [field, ratingField]),
  ) as Record<(typeof RATING_FIELDS)[number], typeof ratingField>,
);

export const reviewContentSchema = z
  .string({ error: "Yorum boş olamaz" })
  .trim()
  .min(1, "Yorum boş olamaz")
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

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri";
}

export function parseRatings(formData: FormData): CategoryRatings {
  const raw = Object.fromEntries(
    RATING_FIELDS.map((field) => [field, formData.get(field)]),
  );

  const result = ratingsSchema.safeParse(raw);
  if (!result.success) throw new Error(firstIssueMessage(result.error));

  return result.data;
}

export function parseReviewContent(formData: FormData): string {
  const result = reviewContentSchema.safeParse(formData.get("content") ?? "");
  if (!result.success) throw new Error(firstIssueMessage(result.error));

  return result.data;
}

/**
 * Average of the six categories, returned in stars so callers can render it
 * directly. Input is in stored units.
 */
export function averageRating(ratings: CategoryRatings): number {
  const total = RATING_FIELDS.reduce((sum, field) => sum + ratings[field], 0);
  return toStars(total / RATING_FIELDS.length);
}
