import { z } from "zod";
import { firstIssueMessage } from "@/lib/schemas";
import { parseMoney } from "@/lib/trip-budget";
import { addDays, dayOf, tripDays } from "@/lib/trip-timeline";
import {
  EXPENSE_CATEGORIES,
  TRANSPORT_MODES,
  TRIP_CURRENCIES,
  TRIP_ITEM_TYPES,
} from "@/lib/trip-types";

export const MAX_TRIPS_PER_USER = 50;
export const MAX_ITEMS_PER_TRIP = 300;
export const MAX_EXPENSES_PER_TRIP = 500;
export const MAX_PHOTOS_PER_TRIP = 30;
export const MAX_TODOS_PER_CITY = 50;
export const MAX_TRIP_DAYS = 60;
/** 1 000 000.00 in minor units — far above any student trip. */
export const MAX_AMOUNT = 100_000_000;

export const TRIP_TITLE_MAX = 100;
export const TRIP_DESCRIPTION_MAX = 2000;
export const ITEM_TITLE_MAX = 120;
export const ITEM_NOTES_MAX = 2000;
export const PLACE_NAME_MAX = 200;
export const CITY_NOTES_MAX = 5000;
export const TODO_TITLE_MAX = 200;

const DAY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

const read = (formData: FormData, field: string): string =>
  String(formData.get(field) ?? "").trim();

const optional = (value: string): string | null => (value ? value : null);

/** A real calendar day — "2025-02-30" passes the pattern but not this. */
const daySchema = z
  .string()
  .regex(DAY_PATTERN, "Geçerli bir tarih seç")
  .refine(
    (value) =>
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value,
    "Geçerli bir tarih seç",
  );

const timeSchema = z
  .string()
  .regex(TIME_PATTERN, "Geçerli bir saat gir")
  .refine((value) => daySchema.safeParse(dayOf(value)).success, {
    message: "Geçerli bir saat gir",
  });

const coordinate = (min: number, max: number) =>
  z.coerce.number().min(min).max(max).nullable();

function money(raw: string, required: boolean): number | null | "invalid" {
  if (!raw) return required ? "invalid" : null;
  const value = parseMoney(raw);
  if (value === null || value > MAX_AMOUNT) return "invalid";
  return value;
}

/** Stored as a @db.Date anchored at midnight UTC, like Visit dates. */
export function dayToDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

/** Wall-clock time stored as if it were UTC — see schema.prisma. */
export function timeToDate(time: string): Date {
  return new Date(`${time}:00Z`);
}

export function dateToDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dateToTime(date: Date): string {
  return date.toISOString().slice(0, 16);
}

export type TripInput = {
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  visibility: "PRIVATE" | "PUBLIC";
};

const tripSchema = z
  .object({
    title: z
      .string()
      .min(1, "Plan için bir başlık yaz")
      .max(
        TRIP_TITLE_MAX,
        `Başlık en fazla ${TRIP_TITLE_MAX} karakter olabilir`,
      ),
    description: z
      .string()
      .max(
        TRIP_DESCRIPTION_MAX,
        `Açıklama en fazla ${TRIP_DESCRIPTION_MAX} karakter olabilir`,
      )
      .nullable(),
    startDate: daySchema,
    endDate: daySchema,
    currency: z.enum(TRIP_CURRENCIES, { error: "Geçersiz para birimi" }),
    visibility: z.enum(["PRIVATE", "PUBLIC"], { error: "Geçersiz görünürlük" }),
  })
  .refine((trip) => trip.endDate >= trip.startDate, {
    message: "Bitiş tarihi başlangıçtan önce olamaz",
  })
  .refine(
    (trip) => tripDays(trip.startDate, trip.endDate).length <= MAX_TRIP_DAYS,
    { message: `Bir plan en fazla ${MAX_TRIP_DAYS} gün sürebilir` },
  );

export function parseTripForm(formData: FormData): Parsed<TripInput> {
  const budget = money(read(formData, "budget"), true);
  if (budget === "invalid" || budget === null) {
    return { ok: false, error: "Geçerli bir bütçe gir" };
  }
  const result = tripSchema.safeParse({
    title: read(formData, "title"),
    description: optional(read(formData, "description")),
    startDate: read(formData, "startDate"),
    endDate: read(formData, "endDate"),
    currency: read(formData, "currency") || "EUR",
    visibility: read(formData, "visibility") || "PRIVATE",
  });
  if (!result.success)
    return { ok: false, error: firstIssueMessage(result.error) };
  return { ok: true, data: { ...result.data, budget } };
}

export type TripItemInput = {
  type: (typeof TRIP_ITEM_TYPES)[number];
  title: string;
  startAt: string;
  endAt: string | null;
  cityId: string | null;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  toCityId: string | null;
  toPlaceName: string | null;
  toLat: number | null;
  toLng: number | null;
  mode: (typeof TRANSPORT_MODES)[number] | null;
  bookingRef: string | null;
  notes: string | null;
  cost: number | null;
  costCategory: (typeof EXPENSE_CATEGORIES)[number] | null;
};

const itemSchema = z
  .object({
    type: z.enum(TRIP_ITEM_TYPES, { error: "Geçersiz tür" }),
    title: z
      .string()
      .min(1, "Bir başlık yaz")
      .max(
        ITEM_TITLE_MAX,
        `Başlık en fazla ${ITEM_TITLE_MAX} karakter olabilir`,
      ),
    startAt: timeSchema,
    endAt: timeSchema.nullable(),
    cityId: z.string().max(64).nullable(),
    placeName: z.string().max(PLACE_NAME_MAX).nullable(),
    lat: coordinate(-90, 90),
    lng: coordinate(-180, 180),
    toCityId: z.string().max(64).nullable(),
    toPlaceName: z.string().max(PLACE_NAME_MAX).nullable(),
    toLat: coordinate(-90, 90),
    toLng: coordinate(-180, 180),
    mode: z.enum(TRANSPORT_MODES).nullable(),
    bookingRef: z.string().max(100).nullable(),
    notes: z
      .string()
      .max(ITEM_NOTES_MAX, `Not en fazla ${ITEM_NOTES_MAX} karakter olabilir`)
      .nullable(),
    costCategory: z.enum(EXPENSE_CATEGORIES).nullable(),
  })
  .refine((item) => !item.endAt || item.endAt >= item.startAt, {
    message: "Bitiş saati başlangıçtan önce olamaz",
  })
  .refine((item) => (item.lat === null) === (item.lng === null), {
    message: "Konum eksik",
  })
  .refine((item) => (item.toLat === null) === (item.toLng === null), {
    message: "Varış konumu eksik",
  });

const numberOrNull = (raw: string) => (raw === "" ? null : raw);

export function parseTripItemForm(formData: FormData): Parsed<TripItemInput> {
  const cost = money(read(formData, "cost"), false);
  if (cost === "invalid") return { ok: false, error: "Geçerli bir tutar gir" };

  const type = read(formData, "type");
  const isTransport = type === "TRANSPORT";
  const result = itemSchema.safeParse({
    type,
    title: read(formData, "title"),
    startAt: read(formData, "startAt"),
    endAt: optional(read(formData, "endAt")),
    cityId: optional(read(formData, "cityId")),
    placeName: optional(read(formData, "placeName")),
    lat: numberOrNull(read(formData, "lat")),
    lng: numberOrNull(read(formData, "lng")),
    // Destination fields only mean something on a transport item.
    toCityId: isTransport ? optional(read(formData, "toCityId")) : null,
    toPlaceName: isTransport ? optional(read(formData, "toPlaceName")) : null,
    toLat: isTransport ? numberOrNull(read(formData, "toLat")) : null,
    toLng: isTransport ? numberOrNull(read(formData, "toLng")) : null,
    mode: isTransport ? optional(read(formData, "mode")) : null,
    bookingRef: optional(read(formData, "bookingRef")),
    notes: optional(read(formData, "notes")),
    costCategory: optional(read(formData, "costCategory")),
  });
  if (!result.success)
    return { ok: false, error: firstIssueMessage(result.error) };
  return { ok: true, data: { ...result.data, cost } };
}

/**
 * Items belong inside the trip. The end may run one day past the last day so
 * an overnight bus home that arrives the next morning still fits.
 */
export function itemWithinTrip(
  item: Pick<TripItemInput, "startAt" | "endAt">,
  startDate: string,
  endDate: string,
): boolean {
  const start = dayOf(item.startAt);
  if (start < startDate || start > endDate) return false;
  if (item.endAt && dayOf(item.endAt) > addDays(endDate, 1)) return false;
  return true;
}

export type ExpenseInput = {
  date: string;
  amount: number;
  category: (typeof EXPENSE_CATEGORIES)[number] | null;
  cityId: string | null;
  note: string | null;
};

const expenseSchema = z.object({
  date: daySchema,
  category: z.enum(EXPENSE_CATEGORIES).nullable(),
  cityId: z.string().max(64).nullable(),
  note: z.string().max(200, "Not en fazla 200 karakter olabilir").nullable(),
});

export function parseExpenseForm(formData: FormData): Parsed<ExpenseInput> {
  const amount = money(read(formData, "amount"), true);
  if (amount === "invalid" || amount === null) {
    return { ok: false, error: "Geçerli bir tutar gir" };
  }
  const result = expenseSchema.safeParse({
    date: read(formData, "date"),
    category: optional(read(formData, "category")),
    cityId: optional(read(formData, "cityId")),
    note: optional(read(formData, "note")),
  });
  if (!result.success)
    return { ok: false, error: firstIssueMessage(result.error) };
  return { ok: true, data: { ...result.data, amount } };
}

export const cityNotesSchema = z
  .string()
  .trim()
  .max(CITY_NOTES_MAX, `Notlar en fazla ${CITY_NOTES_MAX} karakter olabilir`);

export const todoTitleSchema = z
  .string()
  .trim()
  .min(1, "Bir şey yaz")
  .max(TODO_TITLE_MAX, `En fazla ${TODO_TITLE_MAX} karakter olabilir`);

/**
 * Below Vercel's 4.5 MB request body ceiling for functions, so the upload is
 * refused here with a readable message rather than by the platform.
 */
export const TRIP_PHOTO_MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const TRIP_PHOTO_MAX_REQUEST_BYTES =
  TRIP_PHOTO_MAX_UPLOAD_BYTES + 64 * 1024;
export const TRIP_PHOTO_CAPTION_MAX = 200;
