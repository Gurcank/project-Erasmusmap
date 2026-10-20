"use client";

import { useState } from "react";
import {
  compactMoney,
  niceMax,
  useWidth,
} from "@/components/trips/charts/useWidth";

export type BarSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};
export type BarDay = {
  key: string;
  label: string;
  shortLabel: string;
  segments: BarSegment[];
  total: number;
  over: boolean;
};

type Props = {
  days: BarDay[];
  reference: number;
  referenceLabel: string;
  formatValue: (minor: number) => string;
  locale: string;
  emptyText: string;
  overLabel: string;
};

const HEIGHT = 220;
const MARGIN = { top: 14, right: 12, bottom: 26, left: 40 };
const MAX_BAR = 24;
const GAP = 2;
const RADIUS = 4;

/**
 * Planned spending per day, stacked by category, with the even daily share of
 * the budget drawn as a reference line. One y-axis; hovering a day shows its
 * breakdown.
 */
export default function DailyBars({
  days,
  reference,
  referenceLabel,
  formatValue,
  locale,
  emptyText,
  overLabel,
}: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  if (days.every((day) => day.total === 0)) {
    return (
      <div ref={ref}>
        <p className="py-10 text-center text-sm text-text-muted">{emptyText}</p>
      </div>
    );
  }

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const max = niceMax(Math.max(reference, ...days.map((day) => day.total)));
  const y = (value: number) =>
    MARGIN.top + innerHeight - (value / max) * innerHeight;
  const band = innerWidth / days.length;
  const barWidth = Math.max(4, Math.min(MAX_BAR, band * 0.62));
  const ticks = [0, max / 2, max];
  // Label every nth day so the axis never crowds.
  const labelEvery = Math.ceil(
    days.length / Math.max(1, Math.floor(innerWidth / 44)),
  );
  const hovered = hover !== null ? days[hover] : null;

  return (
    <div ref={ref} className="relative">
      <svg width={width} height={HEIGHT} role="img" aria-label={referenceLabel}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--chart-grid)"
              strokeWidth={1}
            />
            <text
              x={MARGIN.left - 6}
              y={y(tick)}
              dy="0.32em"
              textAnchor="end"
              className="fill-text-subtle text-[11px] tabular-nums"
            >
              {compactMoney(tick, locale)}
            </text>
          </g>
        ))}

        {days.map((day, index) => {
          const x = MARGIN.left + band * index + (band - barWidth) / 2;
          let top = y(0);
          const parts = day.segments.filter((segment) => segment.value > 0);
          return (
            <g
              key={day.key}
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
              opacity={hover !== null && hover !== index ? 0.55 : 1}
            >
              {/* Hit target: the whole band, taller than any bar. */}
              <rect
                x={MARGIN.left + band * index}
                y={MARGIN.top}
                width={band}
                height={innerHeight}
                fill="transparent"
              />
              {parts.map((segment, partIndex) => {
                const height = (segment.value / max) * innerHeight;
                const isTop = partIndex === parts.length - 1;
                const drawn = Math.max(0, height - (isTop ? 0 : GAP));
                top -= height;
                const rectTop = top + (isTop ? 0 : GAP);
                return isTop ? (
                  <path
                    key={segment.key}
                    fill={segment.color}
                    d={roundedTop(
                      x,
                      top,
                      barWidth,
                      drawn,
                      Math.min(RADIUS, drawn),
                    )}
                  />
                ) : (
                  <rect
                    key={segment.key}
                    x={x}
                    y={rectTop}
                    width={barWidth}
                    height={drawn}
                    fill={segment.color}
                  />
                );
              })}
              {index % labelEvery === 0 && (
                <text
                  x={MARGIN.left + band * index + band / 2}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-text-subtle text-[11px]"
                >
                  {day.shortLabel}
                </text>
              )}
            </g>
          );
        })}

        {reference > 0 && (
          <g>
            <line
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={y(reference)}
              y2={y(reference)}
              className="stroke-text"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text
              x={width - MARGIN.right}
              y={y(reference) - 6}
              textAnchor="end"
              className="fill-text text-[11px] font-semibold"
            >
              {referenceLabel}: {formatValue(reference)}
            </text>
          </g>
        )}
      </svg>

      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute z-10 w-48 rounded-card border border-border bg-surface-raised p-3 text-xs shadow-popover"
          style={{
            left: Math.min(
              width - 196,
              Math.max(0, MARGIN.left + band * hover + band / 2 - 96),
            ),
            top: 0,
          }}
        >
          <p className="mb-1.5 font-semibold text-text">{hovered.label}</p>
          <ul className="space-y-1">
            {hovered.segments
              .filter((segment) => segment.value > 0)
              .map((segment) => (
                <li key={segment.key} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ background: segment.color }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-text-muted">
                    {segment.label}
                  </span>
                  <span className="text-text tabular-nums">
                    {formatValue(segment.value)}
                  </span>
                </li>
              ))}
          </ul>
          <p className="mt-1.5 flex justify-between border-t border-border pt-1.5 font-semibold text-text">
            <span>Σ</span>
            <span className="tabular-nums">{formatValue(hovered.total)}</span>
          </p>
          {hovered.over && (
            <p className="mt-1 text-danger-700 dark:text-danger-400">
              {overLabel}
            </p>
          )}
        </div>
      )}

      {/* The same numbers for screen readers. */}
      <table className="sr-only">
        <tbody>
          {days.map((day) => (
            <tr key={day.key}>
              <th scope="row">{day.label}</th>
              <td>{formatValue(day.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A bar with rounded data-end corners and a square base. */
function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return "";
  return [
    `M${x},${y + h}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + w - r}`,
    `Q${x + w},${y} ${x + w},${y + r}`,
    `V${y + h}`,
    "Z",
  ].join(" ");
}
