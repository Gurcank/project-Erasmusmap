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

function parseRating(formData: FormData, field: string): number {
  const value = Number(formData.get(field));
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error("Puanlar 1 ile 5 arasında olmalı");
  }
  return value;
}

export function parseRatings(formData: FormData): CategoryRatings {
  const entries = RATING_FIELDS.map((field) => [field, parseRating(formData, field)] as const);
  return Object.fromEntries(entries) as unknown as CategoryRatings;
}

export function parseReviewContent(formData: FormData): string {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) throw new Error("Yorum boş olamaz");
  if (content.length > MAX_REVIEW_LENGTH) throw new Error(`Yorum en fazla ${MAX_REVIEW_LENGTH} karakter olabilir`);
  return content;
}
