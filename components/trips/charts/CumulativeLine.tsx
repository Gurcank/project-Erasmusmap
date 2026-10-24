"use client";

import { useState } from "react";
import {
  compactMoney,
  niceMax,
  useWidth,
} from "@/components/trips/charts/useWidth";

type Point = { key: string; label: string; shortLabel: string; value: number };

type Props = {
  points: Point[];
  budget: number;
  budgetLabel: string;
  seriesLabel: string;
  remainingLabel: string;
  formatValue: (minor: number) => string;
  locale: string;
  emptyText: string;
};

const HEIGHT = 220;
const MARGIN = { top: 16, right: 16, bottom: 26, left: 40 };

/**
 * Running total of planned spending against the budget line. Going over is
 * said by the budget line turning to danger *and* by the remaining amount in
 * the tooltip going negative — never by colour alone.
 */
export default function CumulativeLine({
  points,
  budget,
  budgetLabel,
  seriesLabel,
  remainingLabel,
  formatValue,
  locale,
  emptyText,
}: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0 || points[points.length - 1].value === 0) {
    return (
      <div ref={ref}>
        <p className="py-10 text-center text-sm text-text-muted">{emptyText}</p>
      </div>
    );
  }

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const max = niceMax(Math.max(budget, ...points.map((point) => point.value)));
  const x = (index: number) =>
    MARGIN.left +
    (points.length === 1
      ? innerWidth / 2
      : (index / (points.length - 1)) * innerWidth);
  const y = (value: number) =>
    MARGIN.top + innerHeight - (value / max) * innerHeight;

  const line = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${x(index)},${y(point.value)}`,
    )
    .join(" ");
  const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const last = points[points.length - 1];
  const hasBudget = budget > 0;
  const over = hasBudget && last.value > budget;
  const labelEvery = Math.ceil(
    points.length / Math.max(1, Math.floor(innerWidth / 44)),
  );
  const hovered = hover !== null ? points[hover] : null;

  const onMove = (event: React.MouseEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const relative = (event.clientX - box.left) / box.width;
    setHover(
      Math.min(
        points.length - 1,
        Math.max(0, Math.round(relative * (points.length - 1))),
      ),
    );
  };

  return (
    <div ref={ref} className="relative">
      <svg width={width} height={HEIGHT} role="img" aria-label={seriesLabel}>
        {[0, max / 2, max].map((tick) => (
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

        <path d={area} fill="var(--series-1)" opacity={0.1} />
        <path
          d={line}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hasBudget && (
          <>
            <line
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={y(budget)}
              y2={y(budget)}
              className={over ? "stroke-danger-500" : "stroke-text"}
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text
              x={MARGIN.left + 4}
              y={y(budget) - 6}
              className="fill-text text-[11px] font-semibold"
            >
              {budgetLabel}: {formatValue(budget)}
            </text>
          </>
        )}

        {/* End label: the final total. */}
        <circle
          cx={x(points.length - 1)}
          cy={y(last.value)}
          r={4.5}
          fill="var(--series-1)"
          stroke="var(--surface)"
          strokeWidth={2}
        />

        {points.map(
          (point, index) =>
            index % labelEvery === 0 && (
              <text
                key={point.key}
                x={x(index)}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-text-subtle text-[11px]"
              >
                {point.shortLabel}
              </text>
            ),
        )}

        {hovered && hover !== null && (
          <g pointerEvents="none">
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={MARGIN.top}
              y2={y(0)}
              className="stroke-text-muted"
              strokeWidth={1}
            />
            <circle
              cx={x(hover)}
              cy={y(hovered.value)}
              r={5}
              fill="var(--series-1)"
              stroke="var(--surface)"
              strokeWidth={2}
            />
          </g>
        )}

        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        />
      </svg>

      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-card border border-border bg-surface-raised px-3 py-2 text-xs shadow-popover"
          style={{
            left: Math.min(width - 170, Math.max(0, x(hover) - 80)),
            top: 0,
          }}
        >
          <p className="font-semibold text-text">{hovered.label}</p>
          <p className="text-text-muted">
            {seriesLabel}:{" "}
            <span className="font-semibold text-text tabular-nums">
              {formatValue(hovered.value)}
            </span>
          </p>
          {hasBudget && (
            <p className="text-text-muted">
              {remainingLabel}:{" "}
              <span className="tabular-nums">
                {formatValue(budget - hovered.value)}
              </span>
            </p>
          )}
        </div>
      )}

      <table className="sr-only">
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.label}</th>
              <td>{formatValue(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
