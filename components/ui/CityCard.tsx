import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  slug: string;
  name: string;
  /** ISO 3166-1 alpha-2, which is also the flag filename. */
  country: string;
  /** Stay dates or a count, shown under the name. */
  meta?: string;
  /** A remove button, placed at the end of the caption row. */
  action?: ReactNode;
};

/**
 * A city on a profile, under its country's flag.
 *
 * The flag band has nothing drawn over it. The caption used to sit on the flag
 * behind a dark scrim, which is what kept a white name readable over the white
 * half of a Polish or Austrian flag — at the cost of hiding the bottom third of
 * every flag. Moving the caption onto the card surface below solves both: the
 * flag is shown whole, and the name sits on a known background.
 *
 * `object-contain` rather than `cover`: every file in public/flags is already
 * 3:2, so the two render identically today, but contain is the one that keeps
 * showing the whole flag if a differently proportioned one is ever added.
 */
export default function CityCard({ slug, name, country, meta, action }: Props) {
  return (
    <div className="group relative">
      <Link
        href={`/c/${slug}`}
        className="glass glass-edge block overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {/* Decorative: the country is spelled out in the caption below. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/flags/${country}.svg`}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="aspect-[3/2] w-full object-contain"
        />

        {/* Room on the right for the action, which cannot live inside this
            anchor — a button nested in a link is neither valid nor clickable. */}
        <div className={`px-2.5 py-2 ${action ? "pr-9" : ""}`}>
          <p className="truncate font-display text-sm font-semibold text-text">
            {name}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-subtle">
            <span>{country}</span>
            {meta && <span className="tabular-nums">{meta}</span>}
          </p>
        </div>
      </Link>

      {/* Over the caption rather than the flag, so the flag stays uncovered. */}
      {action && (
        <div className="absolute right-1.5 bottom-1.5 z-10">{action}</div>
      )}
    </div>
  );
}
