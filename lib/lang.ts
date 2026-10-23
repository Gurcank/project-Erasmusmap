import { OFFERED_LANGUAGES, type Lang } from "@/lib/i18n";

/**
 * Which language the interface is in.
 *
 * The choice lives in a cookie of its own so the server can read it: the page,
 * its `<html lang>` and its text are then rendered in the right language from
 * the first byte, instead of in a default that the browser swaps out after
 * hydration. It holds nothing but the language code and is only written when the
 * visitor picks a language, so it is a preference cookie, not a tracking one.
 *
 * Someone who has not picked gets the language their browser asks for, or
 * English where it asks for none of ours.
 */
export const LANG_COOKIE = "lang";

/** One year. */
export const LANG_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** Where the choice used to live, before it moved to a cookie. */
export const LANG_STORAGE_KEY = "lang";

export const DEFAULT_LANG: Lang = "en";

const CODES = new Set<string>(
  OFFERED_LANGUAGES.map((language) => language.code),
);

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && CODES.has(value);
}

/** The stored value, or `null` for anything that is not one of our languages. */
export function parseLang(value: string | undefined | null): Lang | null {
  return isLang(value) ? value : null;
}

/**
 * The first language of an `Accept-Language` header that we offer, by the
 * visitor's own order of preference. `de-AT` counts as `de`; `q=0` means
 * "not acceptable" and is skipped.
 */
export function langFromAcceptLanguage(
  header: string | undefined | null,
): Lang | null {
  if (!header) return null;

  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), weight, index };
    })
    .filter(({ tag, weight }) => tag && Number.isFinite(weight) && weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);

  for (const { tag } of ranked) {
    const lang = parseLang(tag.split("-")[0]);
    if (lang) return lang;
  }
  return null;
}

/** The cookie wins, then the browser's language, then English. */
export function resolveLang(
  cookieValue: string | undefined | null,
  acceptLanguage: string | undefined | null,
): Lang {
  return (
    parseLang(cookieValue) ??
    langFromAcceptLanguage(acceptLanguage) ??
    DEFAULT_LANG
  );
}

/** The choice in a cookie string, `document.cookie` in the browser. */
export function readLangCookie(cookieString: string): Lang | null {
  for (const part of cookieString.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === LANG_COOKIE) return parseLang(value.join("="));
  }
  return null;
}

/**
 * The cookie string for document.cookie. Not HttpOnly, because the page itself
 * writes it. `Secure` is added on https, which is everywhere except local
 * development.
 */
export function langCookie(lang: Lang, secure: boolean): string {
  return [
    `${LANG_COOKIE}=${lang}`,
    `Max-Age=${LANG_MAX_AGE_SECONDS}`,
    "Path=/",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

/** The BCP 47 locale each interface language formats dates and numbers with. */
export const LOCALES: Record<Lang, string> = {
  tr: "tr-TR",
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
};

export function localeFor(lang: Lang): string {
  return LOCALES[lang];
}
