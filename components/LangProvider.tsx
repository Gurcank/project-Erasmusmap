"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  startTransition,
} from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import {
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  langCookie,
  parseLang,
  readLangCookie,
} from "@/lib/lang";

type LangContextValue = { lang: Lang; setLang: (lang: Lang) => void };

const LangContext = createContext<LangContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
});

export function useLangContext(): LangContextValue {
  return useContext(LangContext);
}

function writeCookie(lang: Lang) {
  document.cookie = langCookie(lang, window.location.protocol === "https:");
}

/**
 * Hands the language the server rendered with to every client component, so the
 * first paint is already in it.
 *
 * Picking a language writes the cookie and asks the server to render again; the
 * optimistic value shows the new language straight away and gives way to the
 * server's once that render arrives.
 */
export default function LangProvider({
  lang: serverLang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [lang, setOptimisticLang] = useOptimistic(serverLang);

  const setLang = useCallback(
    (next: Lang) => {
      writeCookie(next);
      startTransition(() => {
        setOptimisticLang(next);
        router.refresh();
      });
    },
    [router, setOptimisticLang],
  );

  // The choice used to be kept in local storage. Carry it over once, for
  // someone who has not got the cookie yet, then let go of it.
  useEffect(() => {
    let legacy: Lang | null = null;
    try {
      legacy = parseLang(localStorage.getItem(LANG_STORAGE_KEY));
      if (legacy !== null) localStorage.removeItem(LANG_STORAGE_KEY);
    } catch {
      return;
    }
    if (legacy === null || readLangCookie(document.cookie) !== null) return;

    writeCookie(legacy);
    if (legacy !== serverLang) router.refresh();
  }, [router, serverLang]);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
