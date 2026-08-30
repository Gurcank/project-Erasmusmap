"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImageOff, Loader2, Plus, Search, X } from "lucide-react";
import { useT } from "@/hooks/useT";
import GlassButton from "@/components/ui/GlassButton";
import type { ActionResult, FormAction } from "@/lib/action-result";
import type { CitySuggestion } from "@/types";

export type FavoriteCity = {
  cityId: string;
  position: number;
  name: string;
  slug: string;
  country: string;
  imageUrl: string | null;
};

type Props = {
  favorites: FavoriteCity[];
  isOwnProfile: boolean;
  maxSlots: number;
  addFavoriteCity: FormAction;
  removeFavoriteCity: FormAction;
};

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 220;

function CityCard({ favorite }: { favorite: FavoriteCity }) {
  return (
    <Link
      href={`/c/${favorite.slug}`}
      className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-card border border-border bg-surface-raised">
        {favorite.imageUrl ? (
          <Image
            src={favorite.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 200px, 40vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-text-subtle">
            <ImageOff size={20} aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium text-on-backdrop">
        {favorite.name}
      </p>
      <p className="text-xs text-on-backdrop-muted">{favorite.country}</p>
    </Link>
  );
}

/**
 * The four cities pinned to a profile. Empty slots are the invitation to fill
 * them, so on your own profile they render as add buttons rather than as
 * placeholder text.
 */
export default function FavoriteCities({
  favorites,
  isOwnProfile,
  maxSlots,
  addFavoriteCity,
  removeFavoriteCity,
}: Props) {
  const t = useT();
  const [addState, addAction] = useActionState(addFavoriteCity, null);
  const [removeState, removeAction] = useActionState(removeFavoriteCity, null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CitySuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Close the picker once a city has been added.
  useEffect(() => {
    if (addState?.ok) {
      setPicking(false);
      setQuery("");
      setResults([]);
    }
  }, [addState]);

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

  const slots = Array.from({ length: maxSlots }, (_, position) =>
    favorites.find((favorite) => favorite.position === position),
  );
  const errorState = [addState, removeState].find(
    (state) => state && !state.ok,
  ) as Exclude<ActionResult, { ok: true }> | undefined;

  return (
    <section>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {slots.map((favorite, position) => {
          if (favorite) {
            return (
              <div key={favorite.cityId} className="relative">
                <CityCard favorite={favorite} />
                {isOwnProfile && (
                  <form
                    action={removeAction}
                    className="absolute top-2 right-2"
                  >
                    <input
                      type="hidden"
                      name="cityId"
                      value={favorite.cityId}
                    />
                    <GlassButton
                      type="submit"
                      aria-label={`${favorite.name} — ${t.removeFavorite}`}
                      variant="ghost"
                      size="iconSm"
                      className="h-7 w-7 bg-ink-950/70 text-ink-50 hover:bg-ink-950 hover:text-ink-50"
                    >
                      <X size={14} aria-hidden="true" />
                    </GlassButton>
                  </form>
                )}
              </div>
            );
          }

          if (!isOwnProfile) {
            return (
              <div
                key={position}
                aria-hidden="true"
                className="aspect-[2/3] rounded-card border border-dashed border-ink-50/20"
              />
            );
          }

          return (
            <button
              key={position}
              type="button"
              onClick={() => setPicking(true)}
              className="glass flex aspect-[2/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border-strong text-text-subtle transition-colors hover:border-primary hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <Plus size={20} aria-hidden="true" />
              <span className="text-xs font-medium">{t.addFavorite}</span>
            </button>
          );
        })}
      </div>

      {errorState && (
        <p
          role="alert"
          className="mt-3 text-xs text-danger-700 dark:text-danger-400"
        >
          {errorState.error}
        </p>
      )}

      {picking && (
        <div className="mt-4 rounded-card border border-border bg-surface-raised p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label
              htmlFor="favorite-city-search"
              className="text-sm font-medium text-text"
            >
              {t.pickCity}
            </label>
            <GlassButton
              onClick={() => setPicking(false)}
              aria-label={t.cancel}
              variant="ghost"
              size="iconSm"
            >
              <X size={16} aria-hidden="true" />
            </GlassButton>
          </div>

          <div className="relative">
            {isSearching ? (
              <Loader2
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 animate-spin text-text-subtle motion-reduce:animate-none"
              />
            ) : (
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-subtle"
              />
            )}
            <input
              id="favorite-city-search"
              type="search"
              value={query}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="field w-full py-2.5 pr-3 pl-9 text-sm"
            />
          </div>

          {results.length > 0 && (
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-control glass border border-border bg-surface">
              {results.map((city) => (
                <li key={city.id}>
                  <form action={addAction}>
                    <input type="hidden" name="cityId" value={city.id} />
                    <button
                      type="submit"
                      className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-none"
                    >
                      <span className="text-text">{city.name}</span>
                      <span className="text-xs text-text-subtle">
                        {city.country}
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {query.trim().length >= MIN_QUERY_LENGTH &&
            !isSearching &&
            results.length === 0 && (
              <p className="mt-2 text-sm text-text-subtle">{t.noResults}</p>
            )}
        </div>
      )}
    </section>
  );
}
