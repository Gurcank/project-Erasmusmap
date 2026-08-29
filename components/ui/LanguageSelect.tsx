"use client";

import { useEffect, useState } from "react";
import { OFFERED_LANGUAGES, type Lang } from "@/lib/i18n";

// No flags: a flag names a country, not a language, and the emoji set renders
// inconsistently across platforms.
export default function LanguageSelect() {
  const [current, setCurrent] = useState<Lang>("tr");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (
      saved &&
      OFFERED_LANGUAGES.some((language) => language.code === saved)
    ) {
      setCurrent(saved);
    }
  }, []);

  const changeLang = (lang: Lang) => {
    localStorage.setItem("lang", lang);
    setCurrent(lang);
    window.dispatchEvent(new CustomEvent("langChange", { detail: lang }));
  };

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {OFFERED_LANGUAGES.map((language) => {
        const active = current === language.code;
        return (
          <button
            key={language.code}
            type="button"
            aria-pressed={active}
            onClick={() => changeLang(language.code)}
            className={`cursor-pointer rounded-control border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              active
                ? "border-primary bg-primary text-on-primary"
                : "border-border-strong text-text-muted hover:bg-surface-raised hover:text-text"
            }`}
          >
            {language.label}
          </button>
        );
      })}
    </div>
  );
}
