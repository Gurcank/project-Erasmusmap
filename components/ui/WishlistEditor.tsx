"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { useT } from "@/hooks/useT";
import { useCitySearch } from "@/hooks/useCitySearch";
import CityCard from "@/components/ui/CityCard";
import GlassButton from "@/components/ui/GlassButton";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import type { FormAction } from "@/lib/action-result";

export type WishlistCity = {
  id: string;
  slug: string;
  name: string;
  country: string;
};

type Props = {
  cities: WishlistCity[];
  /** Only the owner gets the add tile and the remove buttons. */
  isOwnProfile: boolean;
  /** Adds when absent, removes when present — the same toggle the city page uses. */
  toggleWishlist: FormAction;
};

/**
 * The "want to go" list on a profile, editable in place by its owner.
 *
 * Add and remove are the same server action the city page's button calls, so
 * a city added here and one added from its own page cannot end up in different
 * states.
 */
export default function WishlistEditor({
  cities,
  isOwnProfile,
  toggleWishlist,
}: Props) {
  const t = useT();
  const [addState, addAction] = useActionState(toggleWishlist, null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const { results, isSearching } = useCitySearch(query);

  const alreadyListed = new Set(cities.map((city) => city.id));

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {cities.map((city) => (
          <CityCard
            key={city.id}
            slug={city.slug}
            name={city.name}
            country={city.country}
            action={
              isOwnProfile ? (
                <ActionForm
                  action={toggleWishlist}
                  confirmMessage={t.confirmRemoveWishlist}
                  confirmLabel={t.removeFromWishlist}
                  errorClassName="sr-only"
                >
                  <input type="hidden" name="cityId" value={city.id} />
                  <SubmitButton
                    aria-label={`${city.name} — ${t.removeFromWishlist}`}
                    title={t.removeFromWishlist}
                    variant="ghost"
                    size="iconSm"
                    className="h-6 w-6 bg-surface-raised text-text-muted hover:text-danger-700 dark:hover:text-danger-400"
                  >
                    <X size={14} aria-hidden="true" />
                  </SubmitButton>
                </ActionForm>
              ) : undefined
            }
          />
        ))}

        {isOwnProfile && !picking && (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="glass flex aspect-[3/2] cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-ink-50/25 text-on-backdrop-muted transition-colors hover:border-primary hover:text-on-backdrop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Plus size={20} aria-hidden="true" />
            <span className="text-xs font-medium">{t.addToWishlist}</span>
          </button>
        )}
      </div>

      {isOwnProfile && picking && (
        <div className="glass rounded-card border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-text">{t.addToWishlist}</p>
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
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 animate-spin text-text-subtle motion-reduce:animate-none"
              />
            ) : (
              <Search
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-subtle"
              />
            )}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              autoFocus
              className="field w-full py-2.5 pr-3 pl-9 text-sm"
            />
          </div>

          {results.length > 0 && (
            <ul className="glass mt-2 divide-y divide-border overflow-hidden rounded-control border border-border bg-surface">
              {results.map((city) => (
                <li key={city.id}>
                  <form action={addAction}>
                    <input type="hidden" name="cityId" value={city.id} />
                    <SubmitButton
                      disabled={alreadyListed.has(city.id)}
                      variant="ghost"
                      className="w-full justify-between rounded-none border-0 px-4 py-2.5 text-left text-sm"
                    >
                      <span className="text-text">{city.name}</span>
                      <span className="text-xs text-text-subtle">
                        {alreadyListed.has(city.id)
                          ? t.inWishlist
                          : city.country}
                      </span>
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {query.trim().length >= 2 && !isSearching && results.length === 0 && (
            <p className="mt-2 text-sm text-text-subtle">{t.noResults}</p>
          )}

          {addState && !addState.ok && (
            <p
              role="alert"
              className="mt-2 text-xs text-danger-700 dark:text-danger-400"
            >
              {addState.error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
