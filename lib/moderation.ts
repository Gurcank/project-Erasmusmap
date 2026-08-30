/**
 * Text moderation for reviews and comments.
 *
 * Two lists, deliberately doing different things:
 *
 * - `MASKED_TERMS` is masked in the stored text. These are terms that carry no
 *   meaning here beyond an attack.
 * - `FLAGGED_TERMS` is never masked. Someone writing about suicide or self-harm
 *   may be describing a hard year abroad or pointing another student at help;
 *   starring the word would silence exactly the person who needs reading. The
 *   text is stored as written and the row is flagged so a moderator sees it.
 *
 * Matching is on whole words only, with a boundary on both sides. That is what
 * keeps an innocent word that happens to contain a listed one — the "mal"
 * problem — from being starred. The cost is Turkish suffixes: `tecavüze` is a
 * separate entry rather than something the matcher infers, because inferring it
 * means prefix matching, which is where false positives come from.
 */

/** Masked in the text. Sexual violence and slurs used as attacks. */
const MASKED_TERMS = [
  // Turkish, including the case suffixes that actually turn up in prose.
  "tecavüz",
  "tecavüze",
  "tecavüzü",
  "tecavüzcü",
  "tecavüzcüsü",
  "irzına",
  "orospu",
  "orospunun",
  "piç",
  "piçi",
  "yarrak",
  "amcık",
  "sikeyim",
  // English
  "rape",
  "raped",
  "raping",
  "rapist",
  "whore",
  "slut",
  "faggot",
  "nigger",
  "cunt",
  // German
  "vergewaltigung",
  "vergewaltigen",
  "vergewaltiger",
  "hurensohn",
  "fotze",
  // French
  "viol",
  "violer",
  "violeur",
  "salope",
  "pute",
  "enculé",
  // Spanish
  "violación",
  "violacion",
  "violar",
  "violador",
  "puta",
  "zorra",
  // Italian
  "stupro",
  "stuprare",
  "stupratore",
  "puttana",
  "troia",
];

/** Left in the text, but the row is flagged for a moderator. */
const FLAGGED_TERMS = [
  // Turkish
  "intihar",
  "intihara",
  "intiharı",
  "kendimi öldür",
  "kendime zarar",
  // English
  "suicide",
  "suicidal",
  "kill myself",
  "self-harm",
  "self harm",
  // German
  "selbstmord",
  "suizid",
  "selbstverletzung",
  // French
  "suicider",
  "automutilation",
  // Spanish
  "suicidio",
  "suicidarme",
  "autolesión",
  "autolesion",
  // Italian
  "suicidarmi",
  "autolesionismo",
];

const escapeForRegex = (term: string) =>
  term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whole-word matcher. `\b` is no good here — it treats ü, ı and ç as word
 * boundaries, so it would split Turkish words down the middle. Unicode
 * lookarounds on the letter and number classes do the job properly.
 *
 * Longest first, so `tecavüzcü` wins over `tecavüz` and the mask covers the
 * whole word rather than leaving a tail behind.
 */
function wordListPattern(terms: string[]): RegExp {
  const alternation = terms
    .map(escapeForRegex)
    .sort((a, b) => b.length - a.length)
    .join("|");
  return new RegExp(
    `(?<![\\p{L}\\p{N}])(${alternation})(?![\\p{L}\\p{N}])`,
    "giu",
  );
}

const MASKED_PATTERN = wordListPattern(MASKED_TERMS);
const FLAGGED_PATTERN = wordListPattern(FLAGGED_TERMS);

/** `tecavüz` becomes `t*******`. The first letter stays so the line still reads. */
function mask(term: string): string {
  const letters = [...term];
  return letters[0] + "*".repeat(letters.length - 1);
}

export type Moderated = {
  /** The text to store: masked where it had to be. */
  text: string;
  /** Whether a moderator should look at this row. */
  flagged: boolean;
};

export function moderate(text: string): Moderated {
  // Both patterns are module-level and global, so their lastIndex has to be
  // reset or a second call starts mid-string.
  MASKED_PATTERN.lastIndex = 0;
  FLAGGED_PATTERN.lastIndex = 0;

  const masked = text.replace(MASKED_PATTERN, (match) => mask(match));
  const hadMasked = masked !== text;
  const hasFlaggedTerm = FLAGGED_PATTERN.test(text);

  // Anything that had to be masked is worth a look too, not only the
  // self-harm list.
  return { text: masked, flagged: hadMasked || hasFlaggedTerm };
}
