"use client";

import { useSyncExternalStore } from "react";
import "./globals.css";
import { getTranslations } from "@/lib/i18n";
import { DEFAULT_LANG, readLangCookie, resolveLang } from "@/lib/lang";

// This page replaces the whole document, so the providers that normally carry
// the language are not there. It reads the same cookie and the browser's own
// preference, which is what the layout would have resolved.
function readLanguage() {
  return resolveLang(
    readLangCookie(document.cookie),
    navigator.languages?.join(",") ?? navigator.language,
  );
}
const subscribe = () => () => {};

/**
 * What the visitor sees when the root layout itself fails: the one error that
 * app/error.tsx, which renders inside the layout, cannot catch. It replaces the
 * whole document, so it brings its own <html> and <body> and cannot rely on the
 * navbar, the theme script or any provider being there.
 *
 * The card is the same dark glass as the other error and sign-in pages
 * (components/ui/AuthShell.tsx), written out here because AuthShell expects the
 * layout around it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const lang = useSyncExternalStore(
    subscribe,
    readLanguage,
    () => DEFAULT_LANG,
  );
  const t = getTranslations(lang);

  return (
    <html lang={lang}>
      <body className="bg-ink-950 antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-panel border border-ink-50/15 bg-ink-950/65 p-8 shadow-popover">
            <h1 className="text-center font-display text-2xl font-bold text-ink-50">
              {t.errorTitle}
            </h1>
            <p className="mt-2 text-center text-sm text-ink-300">
              {t.errorPageLoad}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-8 w-full cursor-pointer rounded-full border border-ink-50/25 bg-ink-50/10 px-5 py-3 text-sm font-medium text-ink-50 transition-colors hover:bg-ink-50/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
            >
              {t.errorRetry}
            </button>
            {error.digest && (
              <p className="mt-4 text-center font-mono text-xs text-ink-400">
                {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
