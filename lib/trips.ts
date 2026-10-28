import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getHiddenUserIds, isBlockedBetween } from "@/lib/social";
import {
  memberAccess,
  SHARE_TOKEN_PATTERN,
  type TripAccess,
} from "@/lib/trip-access";
import { dateToDay, dateToTime } from "@/lib/trip-schemas";
import type {
  TripCityInspiration,
  TripCityRef,
  TripInviteView,
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

export type ViewerTrip = {
  trip: TripView;
  access: TripAccess;
  /** Added to the plan by its owner, as opposed to a visitor of a public one. */
  isMember: boolean;
};

const TRIP_INCLUDE = {
  user: { select: { id: true, username: true, name: true } },
  members: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      status: true,
      user: { select: { id: true, username: true, name: true } },
    },
  },
  items: { include: ITEM_INCLUDE, orderBy: { startAt: "asc" } },
  expenses: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] },
  cities: {
    orderBy: { position: "asc" },
    include: {
      city: { select: { ...CITY_REF.select, imageUrl: true } },
      todos: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
    },
  },
} satisfies Prisma.TripInclude;

type TripRow = Prisma.TripGetPayload<{ include: typeof TRIP_INCLUDE }>;

/**
 * The trip as the viewer may see it, or null. The owner and accepted members
 * see it; a public trip is visible to everyone. A block in either direction
 * answers the same as a missing trip so it does not confirm the block. A trip
 * shared by link is NOT readable here by strangers — the link is the key, and
 * it only opens getTripByShareToken.
 */
export async function getTripForViewer(
  id: string,
  viewerId: string | null,
  hiddenUserIds: string[],
): Promise<ViewerTrip | null> {
  const row = await prisma.trip.findUnique({
    where: { id },
    include: TRIP_INCLUDE,
  });
  if (!row) return null;

  let access: TripAccess | null = viewerId
    ? await memberAccess(row, viewerId)
    : null;
  const isMember = access !== null && access !== "owner";
  if (!access) {
    if (row.visibility !== "PUBLIC") return null;
    if (viewerId && (await isBlockedBetween(viewerId, row.userId))) return null;
    access = "viewer";
  }
  return buildViewerTrip(row, access, isMember, hiddenUserIds);
}

/**
 * The trip behind a share link, read-only, or null. The token is checked for
 * its shape before it reaches the database, and the plan must still be in link
 * mode: leaving link mode clears the token, so an old link stops working.
 */
export async function getTripByShareToken(
  token: string,
  viewerId: string | null,
  hiddenUserIds: string[],
): Promise<ViewerTrip | null> {
  if (!SHARE_TOKEN_PATTERN.test(token)) return null;
  const row = await prisma.trip.findUnique({
    where: { shareToken: token },
    include: TRIP_INCLUDE,
  });
  if (!row || row.visibility !== "LINK") return null;
  if (viewerId && (await isBlockedBetween(viewerId, row.userId))) return null;
  return buildViewerTrip(row, "viewer", false, hiddenUserIds);
}

async function buildViewerTrip(
  row: TripRow,
  access: TripAccess,
  isMember: boolean,
  hiddenUserIds: string[],
): Promise<ViewerTrip> {
  const inspiration = await getInspiration(
    row.cities.map((entry) => entry.cityId),
    hiddenUserIds,
  );

  return {
    access,
    isMember,
    trip: {
      id: row.id,
      title: row.title,
      description: row.description,
      startDate: dateToDay(row.startDate),
      endDate: dateToDay(row.endDate),
      budget: row.budget,
      currency: row.currency,
      visibility: row.visibility,
      // The link is a secret for the owner to hand out; nobody else is sent it.
      shareToken: access === "owner" ? row.shareToken : null,
      owner: row.user,
      // Who was invited is the owner's business, not a visitor's or a member's.
      members: access === "owner" ? row.members : [],
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
    include: SUMMARY_INCLUDE,
  });
  return summarize(rows);
}

const SUMMARY_INCLUDE = {
  cities: {
    orderBy: { position: "asc" },
    select: { city: { select: { name: true, imageUrl: true } } },
  },
} satisfies Prisma.TripInclude;

type SummaryRow = Prisma.TripGetPayload<{ include: typeof SUMMARY_INCLUDE }>;

async function summarize(rows: SummaryRow[]): Promise<TripSummary[]> {
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

/** Invitations waiting for the user. Only who invited and to what: no contents. */
export async function getTripInvites(
  userId: string,
): Promise<TripInviteView[]> {
  const rows = await prisma.tripMember.findMany({
    where: { userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      role: true,
      trip: {
        select: {
          title: true,
          user: { select: { id: true, username: true, name: true } },
        },
      },
    },
  });
  const hidden = new Set(await getHiddenUserIds(userId));
  return rows
    .filter((row) => !hidden.has(row.trip.user.id))
    .map((row) => ({
      id: row.id,
      role: row.role,
      tripTitle: row.trip.title,
      owner: { username: row.trip.user.username, name: row.trip.user.name },
    }));
}

/** Plans other people added the user to, as cards. */
export async function getSharedTrips(userId: string): Promise<TripSummary[]> {
  const rows = await prisma.trip.findMany({
    where: { members: { some: { userId, status: "ACCEPTED" } } },
    orderBy: { startDate: "desc" },
    include: SUMMARY_INCLUDE,
  });
  const hidden = new Set(await getHiddenUserIds(userId));
  return summarize(rows.filter((row) => !hidden.has(row.userId)));
}
