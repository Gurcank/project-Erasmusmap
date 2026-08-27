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

const RATING_ERROR = "Puanlar 1 ile 5 arasında olmalı";

const ratingField = z.coerce
  .number({ error: RATING_ERROR })
  .int(RATING_ERROR)
  .min(1, RATING_ERROR)
  .max(5, RATING_ERROR);

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

export function averageRating(ratings: CategoryRatings): number {
  return (
    (ratings.culture +
      ratings.gastronomy +
      ratings.safety +
      ratings.socialLife +
      ratings.transport +
      ratings.costOfLiving) /
    6
  );
}
