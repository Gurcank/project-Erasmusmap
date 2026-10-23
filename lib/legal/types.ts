export type LegalSection = {
  heading: string;
  /** Plain paragraphs. */
  paragraphs?: string[];
  /** A bulleted list, after the paragraphs. */
  items?: string[];
  /** Paragraphs that close the section, after the list. */
  after?: string[];
};

export type LegalDocument = {
  title: string;
  /** Rendered under the title, e.g. "Last updated: 22 October 2026". */
  updated: string;
  intro?: string;
  sections: LegalSection[];
};

/** Texts exist in these languages; every other interface language reads English. */
export type LegalLang = "tr" | "en";
