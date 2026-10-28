"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authorizeAction } from "@/lib/action-guard";
import type { ActiveUser } from "@/lib/auth-guards";
import { UserFacingError, toActionResult } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";
import { newShareToken, requireTripRole } from "@/lib/trip-access";
import { dayOf } from "@/lib/trip-timeline";
import {
  cityNotesSchema,
  dayToDate,
  itemWithinTrip,
  MAX_EXPENSES_PER_TRIP,
  MAX_ITEMS_PER_TRIP,
  MAX_TODOS_PER_CITY,
  MAX_TRIPS_PER_USER,
  parseExpenseForm,
  parseTripForm,
  parseTripItemForm,
  timeToDate,
  todoTitleSchema,
} from "@/lib/trip-schemas";
import { firstIssueMessage } from "@/lib/schemas";
import type { ExpenseCategory, TripItemType } from "@/lib/trip-types";

// Editing a plan is many small saves in a row, so the limit is generous: it is
// there to stop a script, not a person filling in their trip.
const RATE_LIMIT = 120;

function authorize(key: string): Promise<ActiveUser> {
  return authorizeAction(`trip-${key}`, { limit: RATE_LIMIT });
}

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

function revalidateTrip(tripId: string, username: string | null) {
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  if (username) revalidatePath(`/u/${username}`);
}

/** Foreign key failures here can only mean a city id that does not exist. */
function rethrowMissingCity(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  ) {
    throw new UserFacingError("Şehir bulunamadı");
  }
  throw error;
}

/** Every city an item mentions gets a notes card, appended in trip order. */
async function ensureTripCities(
  tx: Prisma.TransactionClient,
  tripId: string,
  cityIds: (string | null)[],
) {
  const wanted = [...new Set(cityIds.filter((id): id is string => !!id))];
  if (wanted.length === 0) return;

  const existing = await tx.tripCity.findMany({
    where: { tripId },
    select: { cityId: true, position: true },
  });
  const known = new Set(existing.map((entry) => entry.cityId));
  let position = existing.reduce(
    (max, entry) => Math.max(max, entry.position + 1),
    0,
  );
  const missing = wanted.filter((id) => !known.has(id));
  if (missing.length === 0) return;

  await tx.tripCity.createMany({
    data: missing.map((cityId) => ({ tripId, cityId, position: position++ })),
    skipDuplicates: true,
  });
}

const DEFAULT_COST_CATEGORY: Record<TripItemType, ExpenseCategory> = {
  TRANSPORT: "TRANSPORT",
  STAY: "ACCOMMODATION",
  ACTIVITY: "ACTIVITIES",
  NOTE: "OTHER",
};

// ─── Trip ────────────────────────────────────────────────────────────────────

export async function createTrip(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseTripForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  let tripId = "";
  const result = await toActionResult(async () => {
    const user = await authorize("create");
    const count = await prisma.trip.count({ where: { userId: user.id } });
    if (count >= MAX_TRIPS_PER_USER) {
      throw new UserFacingError(
        `En fazla ${MAX_TRIPS_PER_USER} plan oluşturabilirsin`,
      );
    }

    const { startDate, endDate, ...rest } = parsed.data;
    const trip = await prisma.trip.create({
      data: {
        ...rest,
        startDate: dayToDate(startDate),
        endDate: dayToDate(endDate),
        userId: user.id,
      },
      select: { id: true },
    });
    tripId = trip.id;
    revalidateTrip(trip.id, user.username);
  });

  // Outside toActionResult: redirect() throws, and the result has to be known
  // to be a success before navigating away.
  if (result.ok && tripId) redirect(`/trips/${tripId}`);
  return result;
}

export async function updateTrip(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseTripForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  return toActionResult(async () => {
    const user = await authorize("update");
    const trip = await requireTripRole(
      field(formData, "tripId"),
      user.id,
      "owner",
    );
    const { startDate, endDate, ...rest } = parsed.data;

    await prisma.trip.update({
      where: { id: trip.id },
      data: {
        ...rest,
        startDate: dayToDate(startDate),
        endDate: dayToDate(endDate),
      },
    });
    revalidateTrip(trip.id, user.username);
  });
}

export async function setTripVisibility(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("visibility");
    const trip = await requireTripRole(
      field(formData, "tripId"),
      user.id,
      "owner",
    );
    const wanted = field(formData, "visibility");
    const visibility =
      wanted === "PUBLIC" || wanted === "LINK" ? wanted : "PRIVATE";

    // The link exists only while the plan is shared by link. Keeping the token
    // when it is set again means a repeated click does not break links already
    // handed out; leaving link mode always discards it.
    const current = await prisma.trip.findUnique({
      where: { id: trip.id },
      select: { shareToken: true },
    });
    const shareToken =
      visibility === "LINK" ? (current?.shareToken ?? newShareToken()) : null;

    await prisma.trip.update({
      where: { id: trip.id },
      data: { visibility, shareToken },
    });
    revalidateTrip(trip.id, user.username);
  });
}

/** A new link: every link handed out before stops working at once. */
export async function rotateShareLink(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("visibility");
    const trip = await requireTripRole(
      field(formData, "tripId"),
      user.id,
      "owner",
    );
    // Only a plan shared by link has one; this never turns sharing on.
    const { count } = await prisma.trip.updateMany({
      where: { id: trip.id, visibility: "LINK" },
      data: { shareToken: newShareToken() },
    });
    if (count === 0) throw new UserFacingError("Plan bulunamadı");
    revalidateTrip(trip.id, user.username);
  });
}

export async function deleteTrip(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const result = await toActionResult(async () => {
    const user = await authorize("delete");
    const trip = await requireTripRole(
      field(formData, "tripId"),
      user.id,
      "owner",
    );
    await prisma.trip.delete({ where: { id: trip.id } });
    revalidateTrip(trip.id, user.username);
  });
  if (result.ok) redirect("/trips");
  return result;
}

// ─── Timeline items ──────────────────────────────────────────────────────────

export async function saveTripItem(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseTripItemForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  return toActionResult(async () => {
    const user = await authorize("item");
    const trip = await requireTripRole(
      field(formData, "tripId"),
      user.id,
      "editor",
    );
    const itemId = field(formData, "itemId") || null;
    const { cost, costCategory, startAt, endAt, ...rest } = parsed.data;

    if (!itemWithinTrip({ startAt, endAt }, trip.startDate, trip.endDate)) {
      throw new UserFacingError("Bu saat planın tarihleri dışında");
    }

    const data = {
      ...rest,
      startAt: timeToDate(startAt),
      endAt: endAt ? timeToDate(endAt) : null,
    };

    try {
      await prisma.$transaction(async (tx) => {
        let id: string;
        if (itemId) {
          const updated = await tx.tripItem.updateMany({
            where: { id: itemId, tripId: trip.id },
            data,
          });
          if (updated.count === 0) throw new UserFacingError("Öğe bulunamadı");
          id = itemId;
        } else {
          const count = await tx.tripItem.count({
            where: { tripId: trip.id },
          });
          if (count >= MAX_ITEMS_PER_TRIP) {
            throw new UserFacingError(
              `Bir planda en fazla ${MAX_ITEMS_PER_TRIP} öğe olabilir`,
            );
          }
          id = (
            await tx.tripItem.create({
              data: { ...data, tripId: trip.id },
              select: { id: true },
            })
          ).id;
        }

        // The item's cost lives in TripExpense, the budget's only source.
        if (cost === null) {
          await tx.tripExpense.deleteMany({ where: { itemId: id } });
        } else {
          const expense = {
            date: dayToDate(dayOf(startAt)),
            amount: cost,
            category: costCategory ?? DEFAULT_COST_CATEGORY[rest.type],
            cityId: rest.cityId,
            note: rest.title,
          };
          await tx.tripExpense.upsert({
            where: { itemId: id },
            create: { ...expense, tripId: trip.id, itemId: id },
            update: expense,
          });
        }

        await ensureTripCities(tx, trip.id, [rest.cityId, rest.toCityId]);
      });
    } catch (error) {
      rethrowMissingCity(error);
    }
    revalidateTrip(trip.id, user.username);
  });
}

export async function deleteTripItem(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("item");
    const trip = await requireTripRole(
      field(formData, "tripId"),
      user.id,
      "editor",
    );
    // The linked expense goes with it (onDelete: Cascade).
    await prisma.tripItem.deleteMany({
      where: { id: field(formData, "itemId"), tripId: trip.id },
    });
    revalidateTrip(trip.id, user.username);
  });
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export async function saveTripExpense(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseExpenseForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  return toActionResult(async () => {
    const user = await authorize("expense");
    const trip = await requireTripRole(
      field(formData, "tripId"),
      user.id,
      "editor",
    );
    const expenseId = field(formData, "expenseId") || null;
    const { date, ...rest } = parsed.data;
    if (date < trip.startDate || date > trip.endDate) {
      throw new UserFacingError("Bu gün planın tarihleri dışında");
    }
    const data = { ...rest, date: dayToDate(date) };

    try {
      if (expenseId) {
        // An item's cost is edited on the item, so its expense is left alone.
        const updated = await prisma.tripExpense.updateMany({
          where: { id: expenseId, tripId: trip.id, itemId: null },
          data,
        });
        if (updated.count === 0)
          throw new UserFacingError("Harcama bulunamadı");
      } else {
        const count = await prisma.tripExpense.count({
          where: { tripId: trip.id },
        });
        if (count >= MAX_EXPENSES_PER_TRIP) {
          throw new UserFacingError("Bu plana daha fazla harcama eklenemez");
        }
        await prisma.tripExpense.create({ data: { ...data, tripId: trip.id } });
      }
    } catch (error) {
      rethrowMissingCity(error);
    }
    revalidateTrip(trip.id, user.username);
  });
}

export async function deleteTripExpense(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("expense");
    const trip = await requireTripRole(
      field(formData, "tripId"),
      user.id,
      "editor",
    );
    await prisma.tripExpense.deleteMany({
      where: {
        id: field(formData, "expenseId"),
        tripId: trip.id,
        itemId: null,
      },
    });
    revalidateTrip(trip.id, user.username);
  });
}

// ─── Cities, notes and to-dos ────────────────────────────────────────────────

export async function addTripCity(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("city");
    const trip = await requireTripRole(
      field(formData, "tripId"),
      user.id,
      "editor",
    );
    try {
      await prisma.$transaction((tx) =>
        ensureTripCities(tx, trip.id, [field(formData, "cityId")]),
      );
    } catch (error) {
      rethrowMissingCity(error);
    }
    revalidateTrip(trip.id, user.username);
  });
}

export async function removeTripCity(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("city");
    const trip = await requireTripRole(
      field(formData, "tripId"),
      user.id,
      "editor",
    );
    await prisma.tripCity.deleteMany({
      where: { id: field(formData, "tripCityId"), tripId: trip.id },
    });
    revalidateTrip(trip.id, user.username);
  });
}

export async function saveTripCityNotes(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const notes = cityNotesSchema.safeParse(formData.get("notes") ?? "");
  if (!notes.success)
    return { ok: false, error: firstIssueMessage(notes.error) };

  return toActionResult(async () => {
    const user = await authorize("notes");
    const trip = await requireTripRole(
      field(formData, "tripId"),
      user.id,
      "editor",
    );
    const updated = await prisma.tripCity.updateMany({
      where: { id: field(formData, "tripCityId"), tripId: trip.id },
      data: { notes: notes.data || null },
    });
    if (updated.count === 0) throw new UserFacingError("Şehir bulunamadı");
    revalidateTrip(trip.id, user.username);
  });
}

async function ownedTripCity(formData: FormData, userId: string) {
  const trip = await requireTripRole(
    field(formData, "tripId"),
    userId,
    "editor",
  );
  const tripCity = await prisma.tripCity.findFirst({
    where: { id: field(formData, "tripCityId"), tripId: trip.id },
    select: { id: true },
  });
  if (!tripCity) throw new UserFacingError("Şehir bulunamadı");
  return { trip, tripCity };
}

export async function addTripTodo(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const title = todoTitleSchema.safeParse(formData.get("title") ?? "");
  if (!title.success)
    return { ok: false, error: firstIssueMessage(title.error) };

  return toActionResult(async () => {
    const user = await authorize("todo");
    const { trip, tripCity } = await ownedTripCity(formData, user.id);
    const count = await prisma.tripTodo.count({
      where: { tripCityId: tripCity.id },
    });
    if (count >= MAX_TODOS_PER_CITY) {
      throw new UserFacingError(
        `Bir şehre en fazla ${MAX_TODOS_PER_CITY} madde eklenebilir`,
      );
    }
    await prisma.tripTodo.create({
      data: { tripCityId: tripCity.id, title: title.data, position: count },
    });
    revalidateTrip(trip.id, user.username);
  });
}

export async function toggleTripTodo(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("todo");
    const { trip, tripCity } = await ownedTripCity(formData, user.id);
    const todo = await prisma.tripTodo.findFirst({
      where: { id: field(formData, "todoId"), tripCityId: tripCity.id },
      select: { id: true, done: true },
    });
    if (!todo) throw new UserFacingError("Madde bulunamadı");
    await prisma.tripTodo.update({
      where: { id: todo.id },
      data: { done: !todo.done },
    });
    revalidateTrip(trip.id, user.username);
  });
}

export async function deleteTripTodo(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("todo");
    const { trip, tripCity } = await ownedTripCity(formData, user.id);
    await prisma.tripTodo.deleteMany({
      where: { id: field(formData, "todoId"), tripCityId: tripCity.id },
    });
    revalidateTrip(trip.id, user.username);
  });
}
