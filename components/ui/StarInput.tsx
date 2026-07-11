"use client";

import { useId, useState } from "react";

type Props = {
  label: string;
  name: string;
};

export default function StarInput({ label, name }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const labelId = useId();

  return (
    <div className="flex items-center justify-between bg-gray-100 dark:bg-zinc-900/70 border border-gray-200 dark:border-zinc-800 rounded-xl px-5 py-4 transition hover:border-gray-300 dark:hover:border-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-900">
      <label
        id={labelId}
        className="text-sm font-medium text-gray-800 dark:text-white"
      >
        {label}
      </label>
      <div role="radiogroup" aria-labelledby={labelId} className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= (hovered || rating);
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === rating}
              aria-label={`${label}: ${star}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className={`text-2xl transition-all duration-200 ${
                active
                  ? "text-yellow-400 scale-110"
                  : "text-gray-300 dark:text-zinc-600 hover:text-yellow-300"
              }`}
            >
              ★
            </button>
          );
        })}
      </div>
      <input type="hidden" name={name} value={rating} />
    </div>
  );
}
