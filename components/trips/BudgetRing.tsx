"use client";

import { formatMoney } from "@/lib/trip-budget";

type Props = {
  budget: number;
  total: number;
  currency: string;
  locale: string;
  label: string;
};

const SIZE = 132;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Planned spending against the budget as a meter: the fill carries the state
 * (accent while within budget, danger once over), the track is the same ramp
 * one step lighter. The percentage in the middle is the headline.
 */
export default function BudgetRing({
  budget,
  total,
  currency,
  locale,
  label,
}: Props) {
  const ratio = budget > 0 ? total / budget : total > 0 ? Infinity : 0;
  const over = total > budget;
  const shown = Math.min(1, ratio);
  const percent = Number.isFinite(ratio) ? Math.round(ratio * 100) : null;

  return (
    <figure
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
      aria-label={`${label}: ${formatMoney(total, currency, locale)} / ${formatMoney(budget, currency, locale)}`}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className={over ? "stroke-danger-500/25" : "stroke-accent-500/25"}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - shown)}
          className={`transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none ${
            over ? "stroke-danger-500" : "stroke-accent-500"
          }`}
        />
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-2xl font-semibold ${over ? "text-danger-700 dark:text-danger-400" : "text-text"}`}
        >
          {percent === null ? "—" : `%${percent}`}
        </span>
        <span className="text-xs text-text-muted">{label}</span>
      </figcaption>
    </figure>
  );
}
