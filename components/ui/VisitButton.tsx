"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MapPin } from "lucide-react";
import { useT } from "@/hooks/useT";

export default function VisitButton({
  cityId,
  initialVisited,
}: {
  cityId: string;
  initialVisited: boolean;
}) {
  const t = useT();
  const [visited, setVisited] = useState(initialVisited);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const animatingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    return () => clearTimeout(animatingTimeoutRef.current);
  }, []);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.visitError);

      if (data.added) {
        setAnimating(true);
        animatingTimeoutRef.current = setTimeout(
          () => setAnimating(false),
          600,
        );
        setVisited(true);
      }
      if (data.removed) setVisited(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.visitError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-pressed={visited}
        className={`relative flex h-11 cursor-pointer items-center gap-2 overflow-hidden rounded-control border px-5 text-sm font-semibold whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60 ${
          visited
            ? "border-visited-600 bg-visited-600/10 text-visited-700 dark:border-visited-500 dark:text-visited-400"
            : "border-border-strong text-text hover:bg-surface-raised"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 bg-visited-500/15 transition-[width] duration-500 ease-out motion-reduce:transition-none ${
            animating ? "w-full" : "w-0"
          }`}
        />
        <span className="relative flex items-center gap-2">
          {loading ? (
            <Loader2
              size={16}
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          ) : visited ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <MapPin size={16} aria-hidden="true" />
          )}
          {visited ? t.visited : t.addToList}
        </span>
      </button>
      {error && (
        <p className="text-xs text-danger-700 dark:text-danger-400">{error}</p>
      )}
    </div>
  );
}
