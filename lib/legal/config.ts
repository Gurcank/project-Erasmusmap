/**
 * The facts the legal pages need that only the site's operator knows. Fill them
 * in here and nowhere else: the documents read these values, so there is one
 * place to edit and one place to check.
 *
 * Anything still in square brackets is a placeholder. A production build refuses
 * to run while one is left (see next.config.ts), so the pages cannot go live
 * with "[VERİ SORUMLUSU ADI]" printed in them.
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

/** Names of the settings that still hold a placeholder. Empty when ready. */
export function legalPlaceholdersLeft(
  config: unknown = LEGAL_CONFIG,
): string[] {
  return flatten(config, "")
    .filter(([, value]) => PLACEHOLDER.test(value.trim()))
    .map(([path]) => path);
}
