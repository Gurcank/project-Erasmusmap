import type { Lang } from "@/lib/i18n";

/**
 * Flags for the language picker, drawn inline.
 *
 * Emoji flags are not an option: Windows ships no regional-indicator glyphs, so
 * Chrome and Edge render them as the letter pair ("TR", "GB") instead of a
 * flag. These are geometry, not images — no request, no dependency.
 *
 * English takes the Union Flag. A flag names a country and not a language, so
 * this is a convention rather than a fact; the written name is always beside it.
 */

const SIZE = { width: 21, height: 14 };

/** Turkish flag geometry follows Law 2893: a 30×20 field scaled to 24×16. */
function Turkey() {
  return (
    <>
      <rect width="24" height="16" fill="#e30a17" />
      <circle cx="10" cy="8" r="4" fill="#fff" />
      <circle cx="11" cy="8" r="3.2" fill="#e30a17" />
      <path
        d="M17.00 6.00L17.45 7.38L18.90 7.38L17.73 8.24L18.18 9.62L17.00 8.76L15.82 9.62L16.27 8.24L15.10 7.38L16.55 7.38Z"
        fill="#fff"
      />
    </>
  );
}

/**
 * Union Flag without the saltire counterchange — at 21px wide the offset is
 * under a third of a pixel, so it is drawn as centred crosses.
 */
function UnitedKingdom() {
  return (
    <>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#c8102e" strokeWidth="1.6" />
      <path d="M12 0V16M0 8H24" stroke="#fff" strokeWidth="5.4" />
      <path d="M12 0V16M0 8H24" stroke="#c8102e" strokeWidth="3.2" />
    </>
  );
}

function Germany() {
  return (
    <>
      <rect width="24" height="5.34" fill="#000" />
      <rect y="5.34" width="24" height="5.33" fill="#dd0000" />
      <rect y="10.67" width="24" height="5.33" fill="#ffce00" />
    </>
  );
}

function France() {
  return (
    <>
      <rect width="8" height="16" fill="#002395" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#ed2939" />
    </>
  );
}

function Spain() {
  return (
    <>
      <rect width="24" height="16" fill="#aa151b" />
      <rect y="4" width="24" height="8" fill="#f1bf00" />
    </>
  );
}

function Italy() {
  return (
    <>
      <rect width="8" height="16" fill="#009246" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#ce2b37" />
    </>
  );
}

const FLAGS: Record<Lang, () => React.JSX.Element> = {
  tr: Turkey,
  en: UnitedKingdom,
  de: Germany,
  fr: France,
  es: Spain,
  it: Italy,
};

export default function FlagIcon({ lang }: { lang: Lang }) {
  const Flag = FLAGS[lang];

  return (
    <svg
      {...SIZE}
      viewBox="0 0 24 16"
      aria-hidden="true"
      className="shrink-0 rounded-[0.15rem] ring-1 ring-ink-950/15 dark:ring-ink-50/20"
    >
      <Flag />
    </svg>
  );
}
