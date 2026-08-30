"use client";

import { useSyncExternalStore } from "react";
import { getTranslations } from "@/lib/i18n";
import { DEFAULT_LANG, readLang, subscribeToLang } from "@/lib/lang";

export function useT() {
  // The server cannot read localStorage, so it renders the default and the
  // client swaps in the stored language during hydration.
  const lang = useSyncExternalStore(
    subscribeToLang,
    readLang,
    () => DEFAULT_LANG,
  );

  return getTranslations(lang);
}
