"use client";

import { useEffect, useState } from "react";
import { translations, Lang } from "@/lib/i18n";

export function useT() {
  const [lang, setLang] = useState<Lang>("tr");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved && translations[saved]) setLang(saved);

    const handleLangChange = (e: Event) => {
      const newLang = (e as CustomEvent<Lang>).detail;
      if (translations[newLang]) setLang(newLang);
    };

    window.addEventListener("langChange", handleLangChange);
    return () => window.removeEventListener("langChange", handleLangChange);
  }, []);

  return translations[lang];
}
