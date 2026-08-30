"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useT } from "@/hooks/useT";
import {
  applyThemeChoice,
  readThemeChoice,
  subscribeToThemeChoice,
  watchSystemTheme,
  type ThemeChoice,
} from "@/lib/theme";

// Order runs light → system → dark so the middle option is the one that defers,
// and the two ends are the two things it can defer to.
const ORDER: ThemeChoice[] = ["light", "system", "dark"];

const ICONS = { light: Sun, system: Monitor, dark: Moon } as const;

/**
 * Theme picker: three segments on one glass track with a sliding thumb.
 *
 * A two-state switch cannot carry "system", and "system" is the default — so
 * this is a radiogroup rather than a toggle. The sun and moon stay, because
 * that is what a theme control looks like.
 */
export default function ThemeSelect() {
  const t = useT();

  // The server cannot know the stored choice; useSyncExternalStore renders the
  // default during hydration and swaps to the real one straight after, without
  // the mismatch a state-in-effect read would risk.
  const choice = useSyncExternalStore(
    subscribeToThemeChoice,
    readThemeChoice,
    () => "system" as const,
  );

  useEffect(() => {
    if (choice !== "system") return;
    return watchSystemTheme(() => applyThemeChoice("system"));
  }, [choice]);

  const labels: Record<ThemeChoice, string> = {
    light: t.themeLight,
    system: t.themeSystem,
    dark: t.themeDark,
  };

  return (
    <div
      role="radiogroup"
      aria-label={t.themeLabel}
      className="glass glass-edge relative flex shrink-0 rounded-full border border-border-strong bg-surface-raised/60 p-1"
    >
      {ORDER.map((option) => {
        const Icon = ICONS[option];
        const selected = choice === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            title={labels[option]}
            onClick={() => applyThemeChoice(option)}
            className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-focus ${
              selected
                ? "bg-primary text-on-primary"
                : "text-text-muted hover:text-text"
            }`}
          >
            <Icon size={14} aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{labels[option]}</span>
          </button>
        );
      })}
    </div>
  );
}
