"use client";

import { useEffect, useState } from "react";
import { getTranslations, OFFERED_LANGUAGES, type Lang } from "@/lib/i18n";

const VALID_CODES = new Set<string>(
  OFFERED_LANGUAGES.map((language) => language.code),
);

export function useT() {
  const [lang, setLang] = useState<Lang>("tr");

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved && VALID_CODES.has(saved)) setLang(saved as Lang);

    const handleLangChange = (event: Event) => {
      const next = (event as CustomEvent<Lang>).detail;
      if (VALID_CODES.has(next)) setLang(next);
    };

    window.addEventListener("langChange", handleLangChange);
    return () => window.removeEventListener("langChange", handleLangChange);
  }, []);

  return getTranslations(lang);
}
