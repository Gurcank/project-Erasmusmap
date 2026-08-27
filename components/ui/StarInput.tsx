"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";

type Props = {
  label: string;
  name: string;
};

const MAX_STARS = 5;
const STARS = [1, 2, 3, 4, 5];

export default function StarInput({ label, name }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const labelId = useId();

  // Arrow-key support: a radiogroup that can only be set with the mouse is not
  // operable by keyboard, which the star buttons previously were not.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setRating((current) => Math.min(MAX_STARS, current + 1));
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setRating((current) => Math.max(0, current - 1));
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface-raised px-4 py-3 transition-colors hover:border-border-strong">
      <label id={labelId} className="text-sm font-medium text-text">
        {label}
      </label>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={handleKeyDown}
        className="flex gap-1"
      >
        {STARS.map((star) => {
          const active = star <= (hovered || rating);
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === rating}
              aria-label={`${label}: ${star}`}
              // Roving tabindex: the group takes one tab stop, arrows move inside.
              tabIndex={star === (rating || 1) ? 0 : -1}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="cursor-pointer p-0.5 transition-transform duration-150 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              <Star
                size={22}
                aria-hidden="true"
                className={
                  active
                    ? "fill-accent-500 text-accent-500"
                    : "text-border-strong"
                }
              />
            </button>
          );
        })}
      </div>
      <input type="hidden" name={name} value={rating} />
    </div>
  );
}
