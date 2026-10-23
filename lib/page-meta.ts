import type { Metadata } from "next";
import { getTranslations, type Lang } from "@/lib/i18n";
import { getRequestLang } from "@/lib/lang-server";
import { tripStrings } from "@/lib/translations/trips";

type Strings = ReturnType<typeof getTranslations>;
type TripText = (typeof tripStrings)["tr"];

/**
 * The metadata of a page, written in the language of the request: tab titles,
 * descriptions. Pass the page's own metadata as a function of the strings, so a
 * title is looked up in the same dictionaries as the text on the page and cannot
 * drift from it.
 */
export async function localizedMetadata(
  build: (t: Strings, tt: TripText, lang: Lang) => Metadata,
): Promise<Metadata> {
  const lang = await getRequestLang();
  return build(
    getTranslations(lang),
    tripStrings[lang] ?? tripStrings.en,
    lang,
  );
}

/** Fills the `{name}`-style placeholders of a translated sentence. */
export function fillText(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}
