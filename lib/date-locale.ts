import { de, enGB, es, fr, it, tr } from "date-fns/locale";
import type { Locale } from "date-fns";
import type { Lang } from "@/lib/i18n";

const DATE_FNS_LOCALES: Record<Lang, Locale> = { tr, en: enGB, de, fr, es, it };

/** The date-fns locale for an interface language: month and weekday names. */
export function dateFnsLocale(lang: Lang): Locale {
  return DATE_FNS_LOCALES[lang];
}
