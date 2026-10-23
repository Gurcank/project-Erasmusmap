"use client";

import { useLang } from "@/hooks/useLang";
import { localizeError } from "@/lib/error-text";

/**
 * A message the server returned for a form, shown in the language the page is
 * in. Used wherever an action's `error` reaches the screen, so the wording of a
 * failed validation follows the interface like the rest of the text does.
 */
export default function LocalizedError({ message }: { message: string }) {
  return <>{localizeError(message, useLang())}</>;
}
