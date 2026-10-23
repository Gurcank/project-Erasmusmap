"use client";

import { useLang } from "@/hooks/useLang";
import type { Lang } from "@/lib/i18n";
import { tripStrings, type TripStrings } from "@/lib/translations/trips";

const LOCALES: Record<Lang, string> = {
  tr: "tr-TR",
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
};

/** Replaces `{name}` placeholders. */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * The trip planner's strings and the locale to format dates and money with.
 * Same language source as useT, so both switch together.
 */
export function useTripT(): { tt: TripStrings; locale: string; lang: Lang } {
  const lang = useLang();
  return {
    tt: tripStrings[lang] ?? tripStrings.en,
    locale: LOCALES[lang],
    lang,
  };
}
