"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LANG, readLang, subscribeToLang } from "@/lib/lang";

/** The active interface language code, for things the dictionaries do not hold. */
export function useLang() {
  return useSyncExternalStore(subscribeToLang, readLang, () => DEFAULT_LANG);
}
