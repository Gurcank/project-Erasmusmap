"use client";

import { useLangContext } from "@/components/LangProvider";
import { localeFor } from "@/lib/lang";

/** The active interface language code, for things the dictionaries do not hold. */
export function useLang() {
  return useLangContext().lang;
}

/** The locale to format dates and numbers with, for the active language. */
export function useLocale() {
  return localeFor(useLang());
}
