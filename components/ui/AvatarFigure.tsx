import type { ReactNode } from "react";
import type { AvatarKey } from "@/lib/avatars";

// Lines take the text colour of whatever the figure sits in; the one accessory
// per figure takes the brand green, so it follows the theme through the tokens.
const ACCENT = "stroke-primary fill-primary/20";

const FIGURES: Record<AvatarKey, ReactNode> = {
  traveler: (
    <>
      <circle cx="32" cy="19" r="5.5" />
      <path d="M32 25V41M32 30L26 38M32 30L38 37M32 41L25 55M32 41L39 55" />
      <rect className={ACCENT} x="34" y="26" width="9" height="14" rx="2.5" />
    </>
  ),
  cyclist: (
    <>
      <circle cx="34" cy="17" r="5" />
      <path d="M34 23L30 38M34 27L44 35M30 38L37 47" />
      <circle className={ACCENT} cx="17" cy="49" r="8" />
      <circle className={ACCENT} cx="47" cy="49" r="8" />
      <path className={ACCENT} d="M17 49L29 40H44L47 49M44 40V33" />
    </>
  ),
  reader: (
    <>
      <circle cx="32" cy="19" r="5.5" />
      <path d="M32 25V41M32 30L27 35M32 30L37 35M32 41L25 55M32 41L39 55" />
      <rect className={ACCENT} x="25" y="33" width="14" height="9" rx="1.5" />
      <path d="M32 33V42" />
    </>
  ),
  photographer: (
    <>
      <circle cx="32" cy="19" r="5.5" />
      <path d="M32 25V41M32 30L27 34M32 30L37 34M32 41L25 55M32 41L39 55" />
      <rect className={ACCENT} x="25" y="32" width="14" height="9" rx="2" />
      <circle cx="32" cy="36.5" r="2.4" />
    </>
  ),
  waver: (
    <>
      <circle cx="32" cy="19" r="5.5" />
      <path d="M32 25V41M32 30L25 38M32 30L41 21M32 41L25 55M32 41L39 55" />
      <path className={ACCENT} d="M46 17Q49 20 46 23M50 14Q55 20 50 26" />
    </>
  ),
  runner: (
    <>
      <circle cx="35" cy="18" r="5.5" />
      <path d="M34 24L30 40M33 29L41 33L46 28M33 29L26 33L22 40M30 40L38 47L35 56M30 40L21 45L16 54" />
      <path className={ACCENT} d="M6 28H15M8 35H15M10 42H16" />
    </>
  ),
  hiker: (
    <>
      <circle cx="32" cy="21" r="5.5" />
      <path className={ACCENT} d="M24 17H40M27 17Q32 8 37 17Z" />
      <path d="M32 27V42M32 32L41 38M32 42L25 56M32 42L39 56" />
      <path className={ACCENT} d="M44 30L48 57" />
    </>
  ),
  coffee: (
    <>
      <circle cx="32" cy="19" r="5.5" />
      <path d="M32 25V41M32 30L25 38M32 30L38 35M32 41L25 55M32 41L39 55" />
      <rect className={ACCENT} x="37" y="33" width="8" height="9" rx="2" />
      <path
        className={ACCENT}
        d="M45 35Q49 35 49 38Q49 41 45 40M39 30Q41 28 39 25M43 30Q45 28 43 25"
      />
    </>
  ),
  listener: (
    <>
      <circle cx="32" cy="20" r="5.5" />
      <path className={ACCENT} d="M25.5 20A6.5 7.5 0 0 1 38.5 20" />
      <rect className={ACCENT} x="23" y="19" width="3.5" height="6" rx="1.5" />
      <rect
        className={ACCENT}
        x="37.5"
        y="19"
        width="3.5"
        height="6"
        rx="1.5"
      />
      <path d="M32 26V42M32 31L25 39M32 31L39 39M32 42L25 56M32 42L39 56" />
      <path className={ACCENT} d="M52 25V14L58 16" />
      <circle className={ACCENT} cx="49.5" cy="25.5" r="2.6" />
    </>
  ),
  suitcase: (
    <>
      <circle cx="30" cy="17" r="5.5" />
      <path d="M30 23V41M30 28L23 35M30 28L37 34M30 41L43 41L43 55" />
      <rect className={ACCENT} x="14" y="41" width="22" height="15" rx="3" />
      <path d="M14 47H36" />
    </>
  ),
  flag: (
    <>
      <circle cx="30" cy="19" r="5.5" />
      <path d="M30 25V41M30 30L24 38M30 30L42 33M30 41L23 55M30 41L37 55M42 10V44" />
      <path className={ACCENT} d="M42 10L55 15L42 21Z" />
    </>
  ),
  dancer: (
    <>
      <circle cx="32" cy="19" r="5.5" />
      <path d="M32 25V41M32 30L22 22M32 30L42 23M32 41L24 48L20 56M32 41L41 52L41 56" />
      <path className={ACCENT} d="M12 12V20M8 16H16M52 8V14M49 11H55" />
    </>
  ),
};

/**
 * One avatar drawing, sized by its container and coloured by the theme: the
 * strokes inherit `currentColor`, so wrap it in an element that sets the text
 * colour. It carries no label of its own; whoever renders it names it.
 */
export default function AvatarFigure({ avatarKey }: { avatarKey: AvatarKey }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="h-full w-full stroke-current"
    >
      {FIGURES[avatarKey]}
    </svg>
  );
}
