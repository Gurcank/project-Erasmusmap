import { Star } from "lucide-react";

type Props = {
  /** 0–5, any fraction. Halves render as half-filled stars. */
  value: number;
  /** Star size in pixels. */
  size?: number;
  /** Accessible label, e.g. "Güvenlik: 5 üzerinden 3,5". */
  label: string;
  className?: string;
  /** Hides it from assistive tech, for when a labelled control wraps it. */
  decorative?: boolean;
};

const MAX_STARS = 5;

/**
 * Read-only star display. The filled layer is clipped to a percentage rather
 * than rounded to whole stars, so half — and any other fraction — is exact.
 */
export default function Rating({
  value,
  size = 16,
  label,
  className = "",
  decorative = false,
}: Props) {
  const clamped = Math.min(MAX_STARS, Math.max(0, value));
  const filledWidth = `${(clamped / MAX_STARS) * 100}%`;
  const stars = Array.from({ length: MAX_STARS }, (_, index) => index);

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={`relative inline-flex shrink-0 ${className}`}
    >
      <span className="flex gap-0.5" aria-hidden="true">
        {stars.map((index) => (
          <Star key={index} size={size} className="text-border-strong" />
        ))}
      </span>
      <span
        className="absolute inset-0 flex gap-0.5 overflow-hidden"
        style={{ width: filledWidth }}
        aria-hidden="true"
      >
        {stars.map((index) => (
          <Star
            key={index}
            size={size}
            className="shrink-0 fill-star text-star"
          />
        ))}
      </span>
    </span>
  );
}
