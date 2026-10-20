"use client";

import { useId, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { useCitySearch } from "@/hooks/useCitySearch";
import { useTripT } from "@/hooks/useTripT";

export type CityChoice = {
  id: string;
  name: string;
  country: string;
};

type Props = {
  label: string;
  /** Name of the hidden field the server reads, e.g. "cityId" or "toCityId". */
  name: string;
  value: CityChoice | null;
  onChange: (city: CityChoice | null) => void;
};

/** Picks one city from the site's own list. */
export default function CityField({ label, name, value, onChange }: Props) {
  const { tt } = useTripT();
  const id = useId();
  const [query, setQuery] = useState("");
  const { results, isSearching } = useCitySearch(query);

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value?.id ?? ""} />
      <label htmlFor={id} className="mb-1 block text-xs text-text-subtle">
        {label}
      </label>

      {value ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-sm text-text">
          <MapPin size={14} aria-hidden="true" />
          {value.name}, {value.country}
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`${label}: ${tt.clearPlace}`}
            className="rounded-full p-0.5 hover:bg-ink-500/20 focus-visible:outline-2 focus-visible:outline-focus"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </span>
      ) : (
        <>
          <input
            id={id}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tt.searchCity}
            autoComplete="off"
            className="field w-full px-3 py-2 text-sm"
          />
          {isSearching && (
            <Loader2
              size={14}
              aria-hidden="true"
              className="absolute top-8 right-3 animate-spin text-text-subtle"
            />
          )}
          {results.length > 0 && query.trim().length >= 2 && (
            <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-card border border-border bg-surface-raised shadow-popover">
              {results.map((city) => (
                <li key={city.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({
                        id: city.id,
                        name: city.name,
                        country: city.country,
                      });
                      setQuery("");
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-text hover:bg-primary/10"
                  >
                    {city.name}
                    <span className="text-text-subtle">, {city.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
