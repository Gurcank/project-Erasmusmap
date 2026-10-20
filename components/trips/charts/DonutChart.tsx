"use client";

import { useState } from "react";

export type DonutSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
  display: string;
};

type Props = {
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
  emptyText: string;
};

const SIZE = 200;
const RADIUS = 80;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// The surface gap between segments, in px along the ring.
const GAP = 2;

/**
 * Share of spending by category. A legend with values sits beside the ring
 * (identity never rests on colour alone), and hovering either one highlights
 * the slice.
 */
export default function DonutChart({
  slices,
  centerLabel,
  centerValue,
  emptyText,
}: Props) {
  const [active, setActive] = useState<string | null>(null);
  const shown = slices.filter((slice) => slice.value > 0);
  const total = shown.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-text-muted">{emptyText}</p>
    );
  }

  // Where each slice starts along the ring: the running sum of the ones before.
  const lengths = shown.map((slice) => (slice.value / total) * CIRCUMFERENCE);
  const starts = lengths.map((_, index) =>
    lengths.slice(0, index).reduce((sum, length) => sum + length, 0),
  );
  const arcs = shown.map((slice, index) => ({
    ...slice,
    dash: Math.max(0, lengths[index] - (shown.length > 1 ? GAP : 0)),
    offset: starts[index],
    percent: Math.round((slice.value / total) * 100),
  }));
  const focused = arcs.find((arc) => arc.key === active);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={arc.color}
              strokeWidth={active === arc.key ? STROKE + 6 : STROKE}
              strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
              strokeDashoffset={-arc.offset}
              opacity={active && active !== arc.key ? 0.4 : 1}
              className="cursor-pointer transition-[stroke-width,opacity] duration-150"
              onMouseEnter={() => setActive(arc.key)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-text-muted">
            {focused ? focused.label : centerLabel}
          </span>
          <span className="text-xl font-semibold text-text">
            {focused ? focused.display : centerValue}
          </span>
          {focused && (
            <span className="text-xs text-text-muted">%{focused.percent}</span>
          )}
        </div>
      </div>

      <ul className="w-full space-y-1.5">
        {arcs.map((arc) => (
          <li
            key={arc.key}
            onMouseEnter={() => setActive(arc.key)}
            onMouseLeave={() => setActive(null)}
            className={`flex items-center gap-2.5 rounded-control px-2 py-1 text-sm ${
              active === arc.key ? "bg-surface-raised" : ""
            }`}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ background: arc.color }}
              aria-hidden="true"
            />
            <span className="flex-1 text-text">{arc.label}</span>
            <span className="text-text-muted tabular-nums">%{arc.percent}</span>
            <span className="w-24 text-right font-semibold text-text tabular-nums">
              {arc.display}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
