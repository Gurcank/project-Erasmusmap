type Props = {
  open: boolean;
  /** Matches the button it sits in; the icon scales to fill it. */
  size?: number;
};

// The bar morphs into an S curve and the whole glyph rotates, so the two
// strokes land as the arms of an X. Dash figures are the geometry of that
// curve, not tunable style — changing one without the other breaks the morph.
const CLOSED_DASH = "12 63";
const OPEN_DASH = "20 300";
const OPEN_OFFSET = -32.42;

const MORPH = "duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]";

/**
 * Menu button glyph: three-bar hamburger that folds into a close X. Controlled,
 * because the navbar owns whether the menu is open.
 */
export default function HamburgerIcon({ open, size = 22 }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      className={`transition-transform ${MORPH} motion-reduce:transition-none ${
        open ? "-rotate-45" : "rotate-0"
      }`}
    >
      <path
        d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={open ? OPEN_DASH : CLOSED_DASH}
        strokeDashoffset={open ? OPEN_OFFSET : 0}
        className={`transition-[stroke-dasharray,stroke-dashoffset] ${MORPH} motion-reduce:transition-none`}
      />
      <path
        d="M7 16 27 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
