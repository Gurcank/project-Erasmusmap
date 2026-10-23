import type { Lang } from "@/lib/i18n";
import { errorTranslations } from "@/lib/translations/errors";

/**
 * A message from the server, in the language the page is in.
 *
 * The server's messages are written in Turkish (see lib/translations/errors.ts
 * for why they are matched by their wording). A message that is not in the
 * table, such as one from a library, comes back unchanged rather than blank:
 * a Turkish sentence is better than none.
 */
export function localizeError(message: string, lang: Lang): string {
  const exact = errorTranslations[message];
  if (exact) return exact[lang] ?? message;

  // A limit that comes from a constant: lift the numbers out, look the rest up
  // and put them back where the `#` is.
  const numbers: string[] = [];
  const pattern = message.replace(/\d+/g, (digits) => {
    numbers.push(digits);
    return "#";
  });
  const entry = errorTranslations[pattern];
  if (!entry) return message;

  const text = entry[lang];
  if (!text) return message;
  let index = 0;
  return text.replace(/#/g, () => numbers[index++] ?? "#");
}
