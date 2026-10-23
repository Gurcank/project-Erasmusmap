"use client";

import { useLangContext } from "@/components/LangProvider";

/** The active interface language code, for things the dictionaries do not hold. */
export function useLang() {
  return useLangContext().lang;
}
