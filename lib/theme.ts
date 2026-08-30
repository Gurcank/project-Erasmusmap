"use client";

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

// The choice lives in localStorage, which React cannot subscribe to on its own.
// Writes go through applyThemeChoice, which announces them on this event so the
// control re-renders; the browser's own `storage` event covers other tabs.
const THEME_CHANGE_EVENT = "themechange";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function isChoice(value: string | null): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}

/** What the operating system is asking for right now. */
export function systemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  return choice === "system" ? systemTheme() : choice;
}

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    // Anything else — including nothing stored — means follow the system.
    return isChoice(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

/** Stores the choice and paints it onto <html>. */
export function applyThemeChoice(choice: ThemeChoice): void {
  const resolved = resolveTheme(choice);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  // Form controls, scrollbars and the caret follow this rather than our tokens.
  root.style.colorScheme = resolved;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // A blocked store only costs the choice on the next load; the page is
    // already showing the right theme.
  }

  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** useSyncExternalStore plumbing, so reading the choice needs no effect. */
export function subscribeToThemeChoice(onChange: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Watches the OS setting while "system" is selected, so a theme flip lands
 * without a reload. Returns an unsubscribe.
 */
export function watchSystemTheme(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
