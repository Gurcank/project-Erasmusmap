"use client";

import { getTranslations } from "@/lib/i18n";
import { useLang } from "@/hooks/useLang";

/** The interface strings in the language the server rendered the page with. */
export function useT() {
  return getTranslations(useLang());
}
