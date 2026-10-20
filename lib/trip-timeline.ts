import type {
  TransportMode,
  TripCityRef,
  TripItemView,
} from "@/lib/trip-types";

/*
 * Pure timeline logic shared by the server and the planner UI. Days are
 * "YYYY-MM-DD" strings and times "YYYY-MM-DDTHH:mm" strings in local wall-clock
 * time, so string comparison is chronological comparison and nothing here ever
 * touches a time zone.
 */

const DAY_MS = 86_400_000;

function dayToUtc(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

export function utcToDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function dayOf(time: string): string {
  return time.slice(0, 10);
}

export function timeOf(time: string): string {
  return time.slice(11, 16);
}

/** Every day from start to end inclusive. Empty when end precedes start. */
export function tripDays(startDate: string, endDate: string): string[] {
  const start = dayToUtc(startDate);
  const end = dayToUtc(endDate);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
  const days: string[] = [];
  for (let t = start; t <= end; t += DAY_MS) days.push(utcToDay(t));
  return days;
}

export function addDays(day: string, amount: number): string {
  return utcToDay(dayToUtc(day) + amount * DAY_MS);
}

export function compareItems(a: TripItemView, b: TripItemView): number {
  if (a.startAt !== b.startAt) return a.startAt < b.startAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** True when the item is still going at the start of a later day. */
export function spansNight(item: Pick<TripItemView, "startAt" | "endAt">) {
  return item.endAt !== null && dayOf(item.endAt) > dayOf(item.startAt);
}

export type TimelineDay = {
  date: string;
  /** Items that start on this day, in time order. */
  items: TripItemView[];
  /** Items that started on an earlier day and are still under way. */
  carried: TripItemView[];
};

/**
 * The day-by-day view. An overnight bus that leaves on the 23rd at 22:00 sits
 * under the 23rd and is carried into the 24th, so the morning there reads
 * "still on the bus" before the first stop.
 */
export function groupByDay(
  items: TripItemView[],
  days: string[],
): TimelineDay[] {
  const sorted = [...items].sort(compareItems);
  return days.map((date) => ({
    date,
    items: sorted.filter((item) => dayOf(item.startAt) === date),
    carried: sorted.filter(
      (item) =>
        item.endAt !== null &&
        dayOf(item.startAt) < date &&
        dayOf(item.endAt) >= date,
    ),
  }));
}

/** Items that start outside the trip's days — shown separately, never lost. */
export function itemsOutside(
  items: TripItemView[],
  startDate: string,
  endDate: string,
): TripItemView[] {
  return items.filter((item) => {
    const day = dayOf(item.startAt);
    return day < startDate || day > endDate;
  });
}

export type LatLng = { lat: number; lng: number };

function cityPoint(city: TripCityRef | null): LatLng | null {
  if (!city || city.latitude === null || city.longitude === null) return null;
  return { lat: city.latitude, lng: city.longitude };
}

/** A pin wins over the city centre; a city without coordinates gives nothing. */
export function originOf(item: TripItemView): LatLng | null {
  if (item.lat !== null && item.lng !== null)
    return { lat: item.lat, lng: item.lng };
  return cityPoint(item.city);
}

export function destinationOf(item: TripItemView): LatLng | null {
  if (item.toLat !== null && item.toLng !== null)
    return { lat: item.toLat, lng: item.toLng };
  return cityPoint(item.toCity);
}

export type RouteStep =
  | {
      kind: "point";
      itemId: string;
      index: number;
      type: TripItemView["type"];
      label: string;
      at: LatLng;
    }
  | {
      kind: "leg";
      itemId: string;
      index: number;
      label: string;
      mode: TransportMode;
      from: LatLng;
      to: LatLng;
    };

/**
 * The trip as an ordered list of map steps. A transport item with both ends
 * located is a leg; anything else with a location is a point. Items with no
 * location at all (a plain note) have no step.
 */
export function routeSteps(items: TripItemView[]): RouteStep[] {
  const steps: RouteStep[] = [];
  for (const item of [...items].sort(compareItems)) {
    const from = originOf(item);
    if (item.type === "TRANSPORT") {
      const to = destinationOf(item);
      if (from && to) {
        steps.push({
          kind: "leg",
          itemId: item.id,
          index: steps.length,
          label: item.title,
          mode: item.mode ?? "OTHER",
          from,
          to,
        });
        continue;
      }
      // Only one end is known: still worth a marker where it is.
      const only = from ?? to;
      if (only) {
        steps.push({
          kind: "point",
          itemId: item.id,
          index: steps.length,
          type: item.type,
          label: item.title,
          at: only,
        });
      }
      continue;
    }
    if (from) {
      steps.push({
        kind: "point",
        itemId: item.id,
        index: steps.length,
        type: item.type,
        label: item.title,
        at: from,
      });
    }
  }
  return steps;
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function totalDistanceKm(steps: RouteStep[]): number {
  return Math.round(
    steps.reduce(
      (sum, step) =>
        step.kind === "leg" ? sum + haversineKm(step.from, step.to) : sum,
      0,
    ),
  );
}

/**
 * Points along the great circle from `from` to `to`, for drawing a flight as
 * an arc rather than a straight line on the globe.
 */
export function greatCircle(from: LatLng, to: LatLng, segments = 48): LatLng[] {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lng1 = toRad(from.lng);
  const lat2 = toRad(to.lat);
  const lng2 = toRad(to.lng);
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2,
      ),
    );
  if (d === 0) return [from, to];

  const points: LatLng[] = [];
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x =
      A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y =
      A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    points.push({
      lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
      lng: toDeg(Math.atan2(y, x)),
    });
  }
  return points;
}

/**
 * The cities the traveller is in on each day, in order. The day starts where
 * the previous one ended; a transport item moves them to its destination; any
 * other item with a city puts them there.
 */
export function citiesByDay(
  items: TripItemView[],
  days: string[],
): Record<string, string[]> {
  // Each item becomes "at time T the traveller is in city C" events: a leg
  // contributes its departure and its arrival (an overnight bus lands on the
  // next day), anything else its own city.
  const events: { at: string; cityId: string }[] = [];
  for (const item of items) {
    if (item.type === "TRANSPORT") {
      if (item.city) events.push({ at: item.startAt, cityId: item.city.id });
      if (item.toCity)
        events.push({
          at: item.endAt ?? item.startAt,
          cityId: item.toCity.id,
        });
    } else if (item.city) {
      events.push({ at: item.startAt, cityId: item.city.id });
    }
  }
  events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

  const result: Record<string, string[]> = {};
  let current: string | null = null;
  let cursor = 0;
  for (const date of days) {
    const seen: string[] = current ? [current] : [];
    while (cursor < events.length && dayOf(events[cursor].at) <= date) {
      const { at, cityId } = events[cursor];
      // Events before the first day only set where the trip starts.
      if (dayOf(at) === date && seen[seen.length - 1] !== cityId) {
        seen.push(cityId);
      }
      current = cityId;
      cursor++;
    }
    if (seen.length === 0 && current) seen.push(current);
    result[date] = seen;
  }
  return result;
}

/**
 * Pairs of items whose times overlap. Stays and notes are left out: being
 * booked into a hotel while visiting a museum is the normal case, not a clash.
 */
export function findConflicts(items: TripItemView[]): [string, string][] {
  const timed = items
    .filter(
      (item) =>
        (item.type === "TRANSPORT" || item.type === "ACTIVITY") &&
        item.endAt !== null,
    )
    .sort(compareItems);
  const conflicts: [string, string][] = [];
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      if (timed[j].startAt >= timed[i].endAt!) break;
      conflicts.push([timed[i].id, timed[j].id]);
    }
  }
  return conflicts;
}
