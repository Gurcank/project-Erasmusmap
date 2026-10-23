"use client";

import { useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { dateFnsLocale } from "@/lib/date-locale";
import type { Lang } from "@/lib/i18n";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useT } from "@/hooks/useT";
import { useLang } from "@/hooks/useLang";
import GlassButton from "@/components/ui/GlassButton";
import {
  formatStayDate,
  INPUT_MASK,
  parseStayDate,
  READABLE_MASK,
  stayDatePlaceholder,
} from "@/lib/stay-dates";

export type RangeValue = {
  start: Date | null;
  end: Date | null;
};

/** Which of the two typed fields failed to parse. */
type FieldErrors = { start: boolean; end: boolean };

type Props = {
  value: RangeValue | null;
  onChange: (value: RangeValue | null) => void;
  minValue?: Date;
  maxValue?: Date;
};

const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

// Weekday initials for the grid header. Two letters, not one: the Turkish
// single letters collide — Pazartesi and Perşembe are both P, Cuma and
// Cumartesi both C.
function weekdayLabels(lang: Lang): string[] {
  const first = startOfWeek(new Date(), WEEK_OPTIONS);
  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(first, index), "EEEEEE", { locale: dateFnsLocale(lang) }),
  );
}

const formatDay = (date: Date, mask: string, lang: Lang) =>
  formatStayDate(date, mask, lang);

const inputClass = "field mt-1 w-full px-2.5 py-1.5 text-sm";

/**
 * A range on one line, collapsing whatever the two ends share: a stay inside
 * one month reads "5 – 20 Eyl 2025" rather than repeating the month and year.
 */
function formatDateRange(start: Date, end: Date, lang: Lang): string {
  if (isSameDay(start, end)) return formatDay(start, READABLE_MASK, lang);

  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear && start.getMonth() === end.getMonth()) {
    return `${formatDay(start, "d", lang)} – ${formatDay(end, READABLE_MASK, lang)}`;
  }
  if (sameYear) {
    return `${formatDay(start, "d MMM", lang)} – ${formatDay(end, READABLE_MASK, lang)}`;
  }
  return `${formatDay(start, READABLE_MASK, lang)} – ${formatDay(end, READABLE_MASK, lang)}`;
}

/**
 * The typed half of the picker. Its own state is seeded from the committed
 * range, so the parent remounts it (via `key`) whenever that range changes
 * rather than syncing the two in an effect. What is typed here stays a draft
 * until Apply.
 */
function RangeFields({
  start,
  end,
  onCommit,
  className,
}: {
  start: Date | null;
  end: Date | null;
  /** Applies the typed values, reporting back which of them would not parse. */
  onCommit: (startText: string, endText: string) => FieldErrors;
  className: string;
}) {
  const t = useT();
  const lang = useLang();
  const [startText, setStartText] = useState(() =>
    start ? formatDay(start, INPUT_MASK, lang) : "",
  );
  const [endText, setEndText] = useState(() =>
    end ? formatDay(end, INPUT_MASK, lang) : "",
  );
  const [errors, setErrors] = useState<FieldErrors>({
    start: false,
    end: false,
  });

  const apply = () => setErrors(onCommit(startText, endText));

  const fields = [
    {
      name: "start",
      label: t.dateFrom,
      text: startText,
      setText: setStartText,
      hasError: errors.start,
    },
    {
      name: "end",
      label: t.dateTo,
      text: endText,
      setText: setEndText,
      hasError: errors.end,
    },
  ];

  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        {fields.map(({ name, label, text, setText, hasError }) => (
          <div key={name}>
            <label
              htmlFor={`calendar-${name}`}
              className="text-xs text-text-subtle"
            >
              {label}
            </label>
            <input
              id={`calendar-${name}`}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  apply();
                }
              }}
              placeholder={stayDatePlaceholder(lang)}
              aria-invalid={hasError}
              className={`${inputClass} ${hasError ? "border-danger-600" : ""}`}
            />
          </div>
        ))}
        {(errors.start || errors.end) && (
          <p
            role="alert"
            className="text-xs text-danger-700 dark:text-danger-400"
          >
            {t.invalidDate}
          </p>
        )}
      </div>

      <GlassButton onClick={apply} size="sm">
        {t.applyDates}
      </GlassButton>
    </div>
  );
}

/**
 * Range picker: a month grid with a live hover preview, plus two text inputs
 * for typing the ends directly. Clicking days commits as you go; the inputs
 * commit on Apply. Selection is calendar-day only — a stay has no clock time.
 *
 * Always open. It used to hang off a trigger button in a popover, which put a
 * click between the visitor and the only thing the panel is for.
 */
export default function Calendar({
  value,
  onChange,
  minValue,
  maxValue,
}: Props) {
  const t = useT();
  const lang = useLang();
  const [currentDate, setCurrentDate] = useState<Date>(
    () => value?.start ?? new Date(),
  );
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const days: Date[] = [];
  for (
    let day = startOfWeek(startOfMonth(currentDate), WEEK_OPTIONS);
    day <= endOfWeek(endOfMonth(currentDate), WEEK_OPTIONS);
    day = addDays(day, 1)
  ) {
    days.push(day);
  }

  const isAllowed = (day: Date) =>
    (minValue ? day >= startOfDay(minValue) : true) &&
    (maxValue ? day <= startOfDay(maxValue) : true);

  const handleDayClick = (day: Date) => {
    if (!value?.start || (value.start && value.end)) {
      onChange({ start: startOfDay(day), end: null });
      setHoverDate(day);
      setIsSelecting(true);
      return;
    }
    if (!isSelecting) return;

    // Picking backwards is a legitimate way to choose a range, so the earlier
    // of the two clicks becomes the start rather than being rejected.
    const [start, end] =
      day > value.start ? [value.start, day] : [day, value.start];
    onChange({ start: startOfDay(start), end: startOfDay(end) });
    setIsSelecting(false);
    setHoverDate(null);
  };

  const commitTyped = (startText: string, endText: string): FieldErrors => {
    const read = (text: string) =>
      parseStayDate(text, { min: minValue, max: maxValue }, lang);

    const start = read(startText);
    const end = read(endText);
    if (start === "invalid" || end === "invalid") {
      return { start: start === "invalid", end: end === "invalid" };
    }

    if (start && end && start > end) {
      onChange({ start: end, end: start });
    } else {
      onChange(start || end ? { start, end } : null);
    }
    return { start: false, end: false };
  };

  const summary =
    value?.start && value?.end
      ? formatDateRange(value.start, value.end, lang)
      : value?.start
        ? formatDay(value.start, READABLE_MASK, lang)
        : t.pickDates;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-sm ${value?.start ? "text-text" : "text-text-subtle"}`}
        >
          {summary}
        </span>
        {value?.start && (
          <GlassButton
            onClick={() => onChange(null)}
            aria-label={t.clearDates}
            variant="ghost"
            size="iconSm"
          >
            <X size={15} aria-hidden="true" />
          </GlassButton>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-text">
            {formatDay(currentDate, "MMMM yyyy", lang)}
          </h2>
          <div className="flex gap-0.5">
            <GlassButton
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              aria-label={t.prevMonth}
              variant="ghost"
              size="iconSm"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </GlassButton>
            <GlassButton
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              aria-label={t.nextMonth}
              variant="ghost"
              size="iconSm"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </GlassButton>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center text-xs text-text-subtle">
          {weekdayLabels(lang).map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>

        <div
          className="grid grid-cols-7 gap-y-1"
          onMouseLeave={() => setHoverDate(null)}
        >
          {days.map((day) => {
            const isStart = Boolean(
              value?.start && isSameDay(day, value.start),
            );
            const isEnd = Boolean(value?.end && isSameDay(day, value.end));
            const isHovered = Boolean(
              hoverDate && isSelecting && isSameDay(day, hoverDate),
            );
            const isInRange = Boolean(
              value?.start &&
              ((value.end &&
                isWithinInterval(day, {
                  start: value.start,
                  end: value.end,
                })) ||
                (hoverDate &&
                  hoverDate > value.start &&
                  isWithinInterval(day, {
                    start: value.start,
                    end: hoverDate,
                  }))),
            );
            const allowed = isAllowed(day);
            const isEdge = isStart || isEnd || isHovered;

            return (
              <div
                key={day.toISOString()}
                className={`flex items-center justify-center ${
                  isInRange && !isEdge ? "bg-primary/20" : ""
                }`}
              >
                <button
                  type="button"
                  disabled={!allowed}
                  onMouseEnter={() => {
                    if (value?.start && !value.end) setHoverDate(day);
                  }}
                  onClick={() => handleDayClick(day)}
                  aria-label={formatDay(day, READABLE_MASK, lang)}
                  aria-pressed={isStart || isEnd}
                  className={`flex h-8 w-8 items-center justify-center rounded-control text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus ${
                    isEdge
                      ? "bg-primary font-semibold text-on-primary"
                      : isSameMonth(day, currentDate)
                        ? "text-text"
                        : "text-text-subtle"
                  } ${
                    allowed
                      ? "cursor-pointer hover:bg-surface-raised"
                      : "cursor-not-allowed opacity-40"
                  } ${
                    isToday(day) && !isEdge ? "ring-1 ring-border-strong" : ""
                  }`}
                >
                  {formatDay(day, "d", lang)}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <RangeFields
        key={`${value?.start?.getTime() ?? ""}-${value?.end?.getTime() ?? ""}`}
        start={value?.start ?? null}
        end={value?.end ?? null}
        onCommit={commitTyped}
        className="mt-auto flex flex-col gap-3 border-t border-border pt-3"
      />
    </div>
  );
}
