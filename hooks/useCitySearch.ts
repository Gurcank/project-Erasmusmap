"use client";

import { useEffect, useState } from "react";
import type { CitySuggestion } from "@/types";

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 220;

/**
 * Debounced city search against /api/cities/search.
 *
 * Extracted because three surfaces need it — the navbar, the favourites picker
 * and the wishlist editor — and the third copy is where they start disagreeing
 * about the debounce or forgetting to abort.
 */
export function useCitySearch(query: string) {
  const [results, setResults] = useState<CitySuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/cities/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("search failed");
        setResults(await response.json());
      } catch (error) {
        // An aborted request is the next keystroke, not a failure.
        if ((error as Error).name === "AbortError") return;
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  return { results, isSearching };
}
