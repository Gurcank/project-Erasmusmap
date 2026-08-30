"use client";

import { OFFERED_LANGUAGES, type Lang } from "@/lib/i18n";

export const LANG_STORAGE_KEY = "lang";

// localStorage is not something React can subscribe to, so writes announce
// themselves. The name is kept from the original implementation because it is
// what the rest of the app already listens for.
const LANG_CHANGE_EVENT = "langChange";

const CODES = new Set<string>(
  OFFERED_LANGUAGES.map((language) => language.code),
);

export const DEFAULT_LANG: Lang = "tr";

export function readLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored && CODES.has(stored) ? (stored as Lang) : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function applyLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // A blocked store only costs the choice on the next load.
  }
  window.dispatchEvent(
    new CustomEvent<Lang>(LANG_CHANGE_EVENT, { detail: lang }),
  );
}

/** useSyncExternalStore plumbing, so reading the language needs no effect. */
export function subscribeToLang(onChange: () => void): () => void {
  window.addEventListener(LANG_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(LANG_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
