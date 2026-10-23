/**
 * The facts the legal pages need that only the site's operator knows. Fill them
 * in here and nowhere else: the documents read these values, so there is one
 * place to edit and one place to check.
 *
 * Anything still in square brackets is a placeholder. While one is left, the
 * production deployment does not show the pages or link to them
 * (legalPagesAvailable), so they cannot go live with "[VERİ SORUMLUSU ADI]"
 * printed in them. next.config.ts warns about it at build time, and refuses to
 * build when REQUIRE_LEGAL_CONFIG=1.
 *
 * This file imports nothing on purpose: next.config.ts loads it, and the
 * config file has no path aliases.
 */
export const LEGAL_CONFIG = {
  /** Who decides what happens to the data: a person's name or an organisation. */
  controllerName: "[VERİ SORUMLUSU ADI]",
  /** Where people write to use their rights. Read by humans, so keep it monitored. */
  contactEmail: "[İLETİŞİM E-POSTASI]",
  /** The Upstash database region, shown in the Upstash console. */
  upstashRegion: "[UPSTASH BÖLGESİ]",
  /** Governing law and competent courts, one line per language. */
  governingLaw: {
    tr: "[UYGULANACAK HUKUK VE YETKİLİ MAHKEME]",
    en: "[GOVERNING LAW AND COMPETENT COURTS]",
  },
  /** The date the texts were last changed, shown at the top of each. */
  lastUpdated: { tr: "22 Ekim 2026", en: "22 October 2026" },
};

const PLACEHOLDER = /^\[.+\]$/;

function flatten(value: unknown, path: string): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, inner]) =>
      flatten(inner, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

/**
 * Whether the legal pages, and the links to them, may be shown to the public.
 *
 * A policy with "[VERİ SORUMLUSU ADI]" printed in it is worse than none, so on
 * the production deployment they are withheld until every placeholder is filled;
 * anywhere else (a preview, a local run) they show, so the text can be read and
 * reviewed. The site itself is not held up: leaving them out is exactly how it
 * was before they existed.
 */
export function legalPagesAvailable(
  env: Record<string, string | undefined> = process.env,
  config: unknown = LEGAL_CONFIG,
): boolean {
  return (
    env.VERCEL_ENV !== "production" ||
    legalPlaceholdersLeft(config).length === 0
  );
}

/** Names of the settings that still hold a placeholder. Empty when ready. */
export function legalPlaceholdersLeft(
  config: unknown = LEGAL_CONFIG,
): string[] {
  return flatten(config, "")
    .filter(([, value]) => PLACEHOLDER.test(value.trim()))
    .map(([path]) => path);
}
