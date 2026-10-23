import type { Metadata } from "next";
import type { Lang } from "@/lib/i18n";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/** The Open Graph locale for each interface language. */
export const OG_LOCALES: Record<Lang, string> = {
  tr: "tr_TR",
  en: "en_GB",
  de: "de_DE",
  fr: "fr_FR",
  es: "es_ES",
  it: "it_IT",
};

/**
 * The Open Graph and Twitter cards of a page.
 *
 * A page that sets `openGraph` replaces the root layout's object rather than
 * merging into it, so every field the card needs is repeated here instead of
 * being lost on the pages that override only a title. With a `path`, the card
 * also names the page's own address.
 */
export function socialMetadata({
  lang,
  title,
  description,
  path,
}: {
  lang: Lang;
  title: string;
  description: string;
  path?: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      title,
      description,
      url: path ? `${SITE_URL}${path}` : SITE_URL,
      siteName: SITE_NAME,
      locale: OG_LOCALES[lang],
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * The canonical address of a page, for pages that can be reached under more
 * than one URL (`?reviews=2`, `?tab=trips`). Relative: it resolves against the
 * root layout's `metadataBase`.
 */
export function canonicalFor(path: string): Pick<Metadata, "alternates"> {
  return { alternates: { canonical: path } };
}
