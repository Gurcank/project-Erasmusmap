"use client";

import { useEffect, useState } from "react";
import { Lang } from "@/lib/i18n";

const LANGUAGES = [
  { code: "tr" as Lang, label: "Türkçe", flag: "🇹🇷" },
  { code: "en" as Lang, label: "English", flag: "🇬🇧" },
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
    <div className="flex gap-2">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLang(lang.code)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
            current === lang.code
              ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300"
              : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/10"
          }`}
        >
          <span>{lang.flag}</span>
          <span>{lang.label}</span>
        </button>
      ))}
    </div>
  );
}
