"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { useT } from "@/hooks/useT";
import { useLang } from "@/hooks/useLang";
import {
  EARLIEST_STAY,
  formatStayDate,
  fromStoredDate,
  parseStayDate,
  stayDatePlaceholder,
  toISODate,
} from "@/lib/stay-dates";

type Props = {
  start: Date | null | undefined;
  end: Date | null | undefined;
};

/**
 * What actually gets posted. A parsed date goes as `YYYY-MM-DD`; text that did
 * not parse is forwarded unchanged so the server rejects the save. Posting an
 * empty string there would read as "clear the dates" and quietly discard a
 * stay the author only mistyped.
 */
function postedValue(text: string, parsed: Date | null | "invalid"): string {
  if (parsed === "invalid") return text.trim();
  return toISODate(parsed);
}

const FIELD_CLASS = "field w-full px-2.5 py-1.5 text-sm";

/**
 * The stay attached to a review, edited inline with the rest of it.
 *
 * Two typed fields rather than the month grid the city page uses: this sits
 * inside a review card in a feed, where a full calendar would be taller than
 * the review. What is typed is parsed here and posted as `YYYY-MM-DD` hidden
 * fields, which is the shape the server action reads.
 */
export default function StayDateFields({ start, end }: Props) {
  const t = useT();
  const lang = useLang();
  const bounds = { min: EARLIEST_STAY, max: new Date() };

  const asText = (date: Date | null | undefined) => {
    const local = fromStoredDate(date);
    return local ? formatStayDate(local) : "";
  };

  const [startText, setStartText] = useState(() => asText(start));
  const [endText, setEndText] = useState(() => asText(end));

  const parsedStart = parseStayDate(startText, bounds, lang);
  const parsedEnd = parseStayDate(endText, bounds, lang);
  const invalid = parsedStart === "invalid" || parsedEnd === "invalid";
  // Only flag the ordering once both ends actually parse.
  const backwards =
    parsedStart instanceof Date &&
    parsedEnd instanceof Date &&
    parsedStart > parsedEnd;

  const fields = [
    {
      name: "startDate",
      label: t.dateFrom,
      text: startText,
      setText: setStartText,
      hasError: parsedStart === "invalid",
      posted: postedValue(startText, parsedStart),
    },
    {
      name: "endDate",
      label: t.dateTo,
      text: endText,
      setText: setEndText,
      hasError: parsedEnd === "invalid",
      posted: postedValue(endText, parsedEnd),
    },
  ];

  return (
    <fieldset className="rounded-card border border-border-strong px-3 py-2.5">
      <legend className="flex items-center gap-1.5 px-1 text-xs text-text-subtle">
        <CalendarDays size={13} aria-hidden="true" />
        {t.stayAriaLabel}
      </legend>

      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(({ name, label, text, setText, hasError, posted }) => (
          <div key={name}>
            {/* The server reads these; the visible field is free-form. */}
            <input type="hidden" name={name} value={posted} />
            <label
              htmlFor={`stay-${name}`}
              className="text-xs text-text-subtle"
            >
              {label}
            </label>
            <input
              id={`stay-${name}`}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={stayDatePlaceholder(lang)}
              inputMode="numeric"
              aria-invalid={hasError}
              className={`mt-1 ${FIELD_CLASS} ${hasError ? "border-danger-600" : ""}`}
            />
          </div>
        ))}
      </div>

      {(invalid || backwards) && (
        <p
          role="alert"
          className="mt-2 text-xs text-danger-700 dark:text-danger-400"
        >
          {invalid ? t.invalidDate : t.dateOrderError}
        </p>
      )}
    </fieldset>
  );
}
