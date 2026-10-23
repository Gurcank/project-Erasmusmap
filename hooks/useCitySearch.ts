"use client";

import { useEffect, useState } from "react";
import type { CitySuggestion } from "@/types";

export const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 220;

/**
 * Debounced city search against /api/cities/search.
 *
 * Extracted because the navbar, the favourites picker, the wishlist editor and
 * the trip city field all need it, and every extra copy is where they start
 * disagreeing about the debounce or forgetting to abort.
 *
 * The answer is stored together with the query it answers. What the caller sees
 * is derived from that: results only count while they belong to the current
 * query, and the search is "pending" until an answer for the current query has
 * arrived. So nothing is set while the effect starts a request, only when a
 * response lands, and a short query needs no reset.
 */
export function useCitySearch(query: string) {
  const trimmed = query.trim();
  const enabled = trimmed.length >= MIN_QUERY_LENGTH;
  const [answer, setAnswer] = useState<{
    query: string;
    results: CitySuggestion[];
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/cities/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("search failed");
        setAnswer({ query: trimmed, results: await response.json() });
      } catch (error) {
        // An aborted request is the next keystroke, not a failure.
        if ((error as Error).name === "AbortError") return;
        setAnswer({ query: trimmed, results: [] });
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, trimmed]);

  const answered = enabled && answer?.query === trimmed;
  // While the next answer is on its way, the previous one stays up if it was
  // for a query this one extends or trims (typing, backspacing): a list that
  // blanks on every keystroke flickers. An unrelated one is not worth showing.
  const related =
    enabled &&
    answer !== null &&
    (trimmed.startsWith(answer.query) || answer.query.startsWith(trimmed));
  return {
    results: answer !== null && (answered || related) ? answer.results : [],
    isSearching: enabled && !answered,
  };
}
