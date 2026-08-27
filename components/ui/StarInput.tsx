"use client";

import { useId, useState } from "react";
import Rating from "@/components/ui/Rating";
import { MAX_STARS, toRatingValue } from "@/lib/review";

type Props = {
  label: string;
  name: string;
};

const STEP = 0.5;

/**
 * Half-star rating input.
 *
 * The interaction is a native range input laid transparently over the stars:
 * it brings keyboard support, the correct ARIA role and value announcements
 * for free, and because the track spans exactly the five stars, clicking the
 * left half of a star lands on its half step.
 */
export default function StarInput({ label, name }: Props) {
  const [stars, setStars] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const labelId = useId();

  const shown = preview ?? stars;

  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-surface-raised px-4 py-3 transition-colors hover:border-border-strong sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span id={labelId} className="text-sm font-medium text-text">
        {label}
      </span>

      <div className="relative flex items-center">
        <Rating value={shown} size={22} label="" decorative />
        <input
          type="range"
          min={0}
          max={MAX_STARS}
          step={STEP}
          value={stars}
          aria-labelledby={labelId}
          aria-valuetext={`${shown} / ${MAX_STARS}`}
          onChange={(event) => setStars(Number(event.target.value))}
          onMouseMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const ratio = (event.clientX - bounds.left) / bounds.width;
            const raw = Math.min(MAX_STARS, Math.max(0, ratio * MAX_STARS));
            setPreview(Math.ceil(raw / STEP) * STEP);
          }}
          onMouseLeave={() => setPreview(null)}
          onBlur={() => setPreview(null)}
          className="absolute inset-0 cursor-pointer opacity-0 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        />
      </div>

      {/* Stored on the 1–10 scale; 0 stays empty so the schema rejects it. */}
      <input
        type="hidden"
        name={name}
        value={stars === 0 ? "" : toRatingValue(stars)}
      />
    </div>
  );
}
