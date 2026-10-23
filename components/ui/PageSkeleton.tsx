"use client";

import { useT } from "@/hooks/useT";

/**
 * A placeholder for something still loading. Decorative: the region that holds
 * it carries the announcement, see LoadingRegion.
 */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-card bg-surface-raised motion-reduce:animate-none ${className}`}
    />
  );
}

/** A panel in the same glass as the real cards, holding placeholders. */
export function SkeletonPanel({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`glass rounded-panel border border-border bg-surface p-5 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * The frame of a route's loading state, in the same wrapper as the page it
 * stands in for so nothing jumps when the page arrives. One screen reader
 * announcement for the whole region instead of one per placeholder.
 */
export default function LoadingRegion({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{t.loadingPage}</span>
      {children}
    </div>
  );
}
