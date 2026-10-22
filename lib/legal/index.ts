import { LEGAL_CONFIG } from "./config";
import { privacyDocument } from "./privacy";
import { termsDocument } from "./terms";
import type { LegalDocument, LegalLang } from "./types";

export type LegalKind = "privacy" | "terms";

/**
 * The legal texts are written in Turkish and English. Every other interface
 * language reads the English one rather than a machine translation of a legal
 * document nobody has checked.
 */
export function legalLangFor(lang: string): LegalLang {
  return lang === "tr" ? "tr" : "en";
}

export function getLegalDocument(kind: LegalKind, lang: string): LegalDocument {
  const legalLang = legalLangFor(lang);
  const shared = {
    controller: LEGAL_CONFIG.controllerName,
    email: LEGAL_CONFIG.contactEmail,
    updated: LEGAL_CONFIG.lastUpdated[legalLang],
  };

  return kind === "privacy"
    ? privacyDocument(legalLang, {
        ...shared,
        upstashRegion: LEGAL_CONFIG.upstashRegion,
      })
    : termsDocument(legalLang, {
        ...shared,
        law: LEGAL_CONFIG.governingLaw[legalLang],
      });
}
