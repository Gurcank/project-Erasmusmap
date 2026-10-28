/**
 * Shapes the trip planner passes from the server to the client.
 *
 * Dates and times cross the boundary as strings — "YYYY-MM-DD" for days and
 * "YYYY-MM-DDTHH:mm" for times — rather than Date objects. Times are local
 * wall-clock time (see the Trip models in schema.prisma), and a Date would be
 * shifted into the browser's own time zone the moment it was formatted.
 */

export const TRIP_ITEM_TYPES = [
  "TRANSPORT",
  "STAY",
  "ACTIVITY",
  "NOTE",
] as const;
export type TripItemType = (typeof TRIP_ITEM_TYPES)[number];

export const TRANSPORT_MODES = [
  "BUS",
  "TRAIN",
  "FLIGHT",
  "CAR",
  "FERRY",
  "WALK",
  "OTHER",
] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const EXPENSE_CATEGORIES = [
  "TRANSPORT",
  "ACCOMMODATION",
  "FOOD",
  "ACTIVITIES",
  "SHOPPING",
  "OTHER",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const TRIP_CURRENCIES = [
  "EUR",
  "TRY",
  "USD",
  "GBP",
  "CHF",
  "PLN",
  "CZK",
  "HUF",
  "SEK",
  "NOK",
  "DKK",
] as const;
export type TripCurrency = (typeof TRIP_CURRENCIES)[number];

export type TripVisibility = "PRIVATE" | "PUBLIC" | "LINK";

export type TripCityRef = {
  id: string;
  name: string;
  slug: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
};

export type TripItemView = {
  id: string;
  type: TripItemType;
  title: string;
  startAt: string;
  endAt: string | null;
  city: TripCityRef | null;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  toCity: TripCityRef | null;
  toPlaceName: string | null;
  toLat: number | null;
  toLng: number | null;
  mode: TransportMode | null;
  bookingRef: string | null;
  notes: string | null;
  /** Cost in minor units, from the linked expense. */
  cost: number | null;
  costCategory: ExpenseCategory | null;
};

export type TripExpenseView = {
  id: string;
  date: string;
  amount: number;
  /** null is a lump sum for the day. */
  category: ExpenseCategory | null;
  cityId: string | null;
  note: string | null;
  /** Set when the expense is the cost of a timeline item. */
  itemId: string | null;
};

export type TripTodoView = { id: string; title: string; done: boolean };

export type TripCityView = {
  id: string;
  city: TripCityRef & { imageUrl: string | null };
  notes: string | null;
  todos: TripTodoView[];
};

export type TripCityInspiration = {
  cityId: string;
  reviewCount: number;
  /** 1–10 scale averages, null when nobody rated the category. */
  averages: Record<string, number | null>;
  topReviews: {
    id: string;
    content: string;
    author: string | null;
    likeCount: number;
  }[];
};

export type TripView = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  visibility: TripVisibility;
  owner: { id: string; username: string | null; name: string | null };
  items: TripItemView[];
  expenses: TripExpenseView[];
  cities: TripCityView[];
  inspiration: TripCityInspiration[];
};

export type TripSummary = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  currency: string;
  visibility: TripVisibility;
  cityNames: string[];
  coverImages: string[];
};
