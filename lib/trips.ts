import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isBlockedBetween } from "@/lib/social";
import { dateToDay, dateToTime } from "@/lib/trip-schemas";
import type {
  TripCityInspiration,
  TripCityRef,
  TripItemView,
  TripSummary,
  TripView,
} from "@/lib/trip-types";

const CITY_REF = {
  select: {
    id: true,
    name: true,
    slug: true,
    country: true,
    latitude: true,
    longitude: true,
  },
} satisfies Prisma.CityDefaultArgs;

const ITEM_INCLUDE = {
  city: CITY_REF,
  toCity: CITY_REF,
  expense: { select: { amount: true, category: true } },
} satisfies Prisma.TripItemInclude;

type ItemRow = Prisma.TripItemGetPayload<{ include: typeof ITEM_INCLUDE }>;

export function toItemView(row: ItemRow): TripItemView {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    startAt: dateToTime(row.startAt),
    endAt: row.endAt ? dateToTime(row.endAt) : null,
    city: row.city as TripCityRef | null,
    placeName: row.placeName,
    lat: row.lat,
    lng: row.lng,
    toCity: row.toCity as TripCityRef | null,
    toPlaceName: row.toPlaceName,
    toLat: row.toLat,
    toLng: row.toLng,
    mode: row.mode,
    bookingRef: row.bookingRef,
    notes: row.notes,
    cost: row.expense?.amount ?? null,
    costCategory: row.expense?.category ?? null,
  };
}

const TOP_REVIEWS_PER_CITY = 3;

/**
 * What the site's own reviewers say about each city on the trip — category
 * averages and the most-liked reviews — shown beside the traveller's notes as
 * ideas for what to do there.
 */
async function getInspiration(
  cityIds: string[],
  hiddenUserIds: string[],
): Promise<TripCityInspiration[]> {
  if (cityIds.length === 0) return [];

  const authorFilter: Prisma.ReviewWhereInput = hiddenUserIds.length
    ? { OR: [{ userId: null }, { userId: { notIn: hiddenUserIds } }] }
    : {};

  const [averages, topReviews] = await Promise.all([
    prisma.review.groupBy({
      by: ["cityId"],
      where: { cityId: { in: cityIds } },
      _avg: {
        culture: true,
        gastronomy: true,
        safety: true,
        socialLife: true,
        transport: true,
        costOfLiving: true,
      },
      _count: { id: true },
    }),
    // One query per city: "top N per group" has no Prisma form, and a trip has
    // a handful of cities.
    Promise.all(
      cityIds.map((cityId) =>
        prisma.review.findMany({
          where: { cityId, ...authorFilter },
          orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
          take: TOP_REVIEWS_PER_CITY,
          select: {
            id: true,
            content: true,
            cityId: true,
            user: { select: { username: true, name: true } },
            _count: { select: { likes: true } },
          },
        }),
      ),
    ),
  ]);

  const averageByCity = new Map(averages.map((row) => [row.cityId, row]));
  return cityIds.map((cityId, index) => {
    const row = averageByCity.get(cityId);
    return {
      cityId,
      reviewCount: row?._count.id ?? 0,
      averages: { ...(row?._avg ?? {}) },
      topReviews: topReviews[index]
        .filter((review) => review.content.trim().length > 0)
        .map((review) => ({
          id: review.id,
          content: review.content,
          author: review.user?.username ?? review.user?.name ?? null,
          likeCount: review._count.likes,
        })),
    };
  });
}

export type ViewerTrip = { trip: TripView; isOwner: boolean };

/**
 * The trip as the viewer may see it, or null. The owner always sees it; a
 * public trip is visible to everyone except across a block, which answers the
 * same as a missing trip so it does not confirm the block.
 */
export async function getTripForViewer(
  id: string,
  viewerId: string | null,
  hiddenUserIds: string[],
): Promise<ViewerTrip | null> {
  const row = await prisma.trip.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, name: true } },
      items: { include: ITEM_INCLUDE, orderBy: { startAt: "asc" } },
      expenses: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] },
      cities: {
        orderBy: { position: "asc" },
        include: {
          city: { select: { ...CITY_REF.select, imageUrl: true } },
          todos: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
        },
      },
    },
  });
  if (!row) return null;

  const isOwner = viewerId === row.userId;
  if (!isOwner) {
    if (row.visibility !== "PUBLIC") return null;
    if (viewerId && (await isBlockedBetween(viewerId, row.userId))) return null;
  }

  const inspiration = await getInspiration(
    row.cities.map((entry) => entry.cityId),
    hiddenUserIds,
  );

  return {
    isOwner,
    trip: {
      id: row.id,
      title: row.title,
      description: row.description,
      startDate: dateToDay(row.startDate),
      endDate: dateToDay(row.endDate),
      budget: row.budget,
      currency: row.currency,
      visibility: row.visibility,
      owner: row.user,
      items: row.items.map(toItemView),
      expenses: row.expenses.map((expense) => ({
        id: expense.id,
        date: dateToDay(expense.date),
        amount: expense.amount,
        category: expense.category,
        cityId: expense.cityId,
        note: expense.note,
        itemId: expense.itemId,
      })),
      cities: row.cities.map((entry) => ({
        id: entry.id,
        city: entry.city,
        notes: entry.notes,
        todos: entry.todos.map((todo) => ({
          id: todo.id,
          title: todo.title,
          done: todo.done,
        })),
      })),
      inspiration,
    },
  };
}

const COVER_IMAGES = 4;

/** The cards on /trips and the profile tab. */
export async function getUserTrips(
  userId: string,
  includePrivate: boolean,
): Promise<TripSummary[]> {
  const rows = await prisma.trip.findMany({
    where: { userId, ...(includePrivate ? {} : { visibility: "PUBLIC" }) },
    orderBy: { startDate: "desc" },
    include: {
      cities: {
        orderBy: { position: "asc" },
        select: { city: { select: { name: true, imageUrl: true } } },
      },
    },
  });
  if (rows.length === 0) return [];

  const spent = await prisma.tripExpense.groupBy({
    by: ["tripId"],
    where: { tripId: { in: rows.map((row) => row.id) } },
    _sum: { amount: true },
  });
  const spentByTrip = new Map(
    spent.map((row) => [row.tripId, row._sum.amount ?? 0]),
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    startDate: dateToDay(row.startDate),
    endDate: dateToDay(row.endDate),
    budget: row.budget,
    spent: spentByTrip.get(row.id) ?? 0,
    currency: row.currency,
    visibility: row.visibility,
    cityNames: row.cities.map((entry) => entry.city.name),
    coverImages: row.cities
      .map((entry) => entry.city.imageUrl)
      .filter((url): url is string => Boolean(url))
      .slice(0, COVER_IMAGES),
  }));
}
