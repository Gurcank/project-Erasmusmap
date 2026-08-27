"use client";

import { useEffect, useState } from "react";
import { Lang } from "@/lib/i18n";

// No flags: a flag names a country, not a language, and the emoji set renders
// inconsistently across platforms.
const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
];

export default function LanguageSelect() {
  const [current, setCurrent] = useState<Lang>("tr");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved) setCurrent(saved);
  }, []);

  const changeLang = (lang: Lang) => {
    localStorage.setItem("lang", lang);
    setCurrent(lang);
    window.dispatchEvent(new CustomEvent("langChange", { detail: lang }));
  };

  return (
    <div className="flex gap-1.5">
      {LANGUAGES.map((lang) => {
        const active = current === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            aria-pressed={active}
            onClick={() => changeLang(lang.code)}
            className={`cursor-pointer rounded-control border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              active
                ? "border-primary bg-primary text-on-primary"
                : "border-border-strong text-text-muted hover:bg-surface-raised hover:text-text"
            }`}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
}
