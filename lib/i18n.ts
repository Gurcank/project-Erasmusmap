import { tr } from "@/lib/translations/tr";
import { en } from "@/lib/translations/en";
import { de } from "@/lib/translations/de";
import { fr } from "@/lib/translations/fr";
import { es } from "@/lib/translations/es";
import { it } from "@/lib/translations/it";

export const translations = { tr, en, de, fr, es, it };

/**
 * Every language the picker offers. Only the ones present in `translations`
 * change the interface; the rest fall back to English (see getTranslations).
 */
// Only the languages that are actually translated in `translations` above.
// Adding a language here without a matching entry there would just show English.
export const OFFERED_LANGUAGES = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
] as const;

export type Lang = (typeof OFFERED_LANGUAGES)[number]["code"];
export type TranslationKey = keyof typeof translations.tr;

/** Strings for a language, falling back to English where none are translated. */
export function getTranslations(lang: Lang) {
  return (
    (translations as Record<string, typeof translations.tr>)[lang] ??
    translations.en
  );
}
