"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { tr } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { CalendarDays, X } from "lucide-react";
import { useT } from "@/hooks/useT";

type Props = {
  /** Field names for the hidden inputs the surrounding form submits. */
  startName?: string;
  endName?: string;
  defaultStart: Date | null;
  defaultEnd: Date | null;
};

/** Local calendar day to `YYYY-MM-DD`, without the UTC shift `toISOString` adds. */
function toISO(date: Date | undefined): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** A stored date (midnight UTC) back to the calendar day the user picked. */
function fromStored(date: Date | null): Date | undefined {
  if (!date) return undefined;
  const value = new Date(date);
  return new Date(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  );
}

function label(date: Date): string {
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DateRangePicker({
  startName = "startDate",
  endName = "endDate",
  defaultStart,
  defaultEnd,
}: Props) {
  const t = useT();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = fromStored(defaultStart);
    const to = fromStored(defaultEnd);
    return from || to ? { from, to } : undefined;
  });

  // A stay cannot be in the future.
  const today = new Date();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const summary = range?.from
    ? range.to && range.to.getTime() !== range.from.getTime()
      ? `${label(range.from)} – ${label(range.to)}`
      : label(range.from)
    : t.pickDates;

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={startName} value={toISO(range?.from)} />
      <input type="hidden" name={endName} value={toISO(range?.to)} />

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={panelId}
          className="flex h-10 items-center gap-2 rounded-control border border-border-strong bg-surface px-3 text-sm text-text transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
        >
          <CalendarDays
            size={15}
            aria-hidden="true"
            className="text-text-muted"
          />
          <span className={range?.from ? "text-text" : "text-text-subtle"}>
            {summary}
          </span>
        </button>
        {range?.from && (
          <button
            type="button"
            onClick={() => setRange(undefined)}
            aria-label={t.clearDates}
            className="flex h-8 w-8 items-center justify-center rounded-control text-text-subtle transition-colors hover:bg-surface-raised hover:text-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t.visitDatesTitle}
          className="rdp-theme absolute left-0 z-20 mt-2 rounded-card border border-border bg-surface p-2 shadow-popover"
        >
          <DayPicker
            mode="range"
            locale={tr}
            defaultMonth={range?.from ?? new Date()}
            selected={range}
            onSelect={setRange}
            disabled={{ after: today }}
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={today}
          />
        </div>
      )}
    </div>
  );
}
