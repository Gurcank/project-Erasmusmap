import { describe, expect, it } from "vitest";
import {
  citiesByDay,
  findConflicts,
  greatCircle,
  groupByDay,
  routeSteps,
  totalDistanceKm,
  tripDays,
} from "@/lib/trip-timeline";
import type { TripCityRef, TripItemView } from "@/lib/trip-types";

const city = (
  id: string,
  latitude: number,
  longitude: number,
): TripCityRef => ({
  id,
  name: id,
  slug: id,
  country: "X",
  latitude,
  longitude,
});

const istanbul = city("istanbul", 41.01, 28.97);
const hamburg = city("hamburg", 53.55, 9.99);
const amsterdam = city("amsterdam", 52.37, 4.9);

let counter = 0;
function item(overrides: Partial<TripItemView>): TripItemView {
  counter++;
  return {
    id: `item-${String(counter).padStart(3, "0")}`,
    type: "ACTIVITY",
    title: "x",
    startAt: "2026-12-23T10:00",
    endAt: null,
    city: null,
    placeName: null,
    lat: null,
    lng: null,
    toCity: null,
    toPlaceName: null,
    toLat: null,
    toLng: null,
    mode: null,
    bookingRef: null,
    notes: null,
    cost: null,
    costCategory: null,
    ...overrides,
  };
}

// The scenario from the brief: overnight bus to Hamburg, a day there, another
// overnight bus on to Amsterdam.
const busToHamburg = item({
  type: "TRANSPORT",
  title: "Bus to Hamburg",
  startAt: "2026-12-23T22:00",
  endAt: "2026-12-24T08:00",
  city: istanbul,
  toCity: hamburg,
  mode: "BUS",
});
const harbour = item({
  title: "Harbour",
  startAt: "2026-12-24T10:00",
  endAt: "2026-12-24T13:00",
  city: hamburg,
  lat: 53.54,
  lng: 9.98,
});
const busToAmsterdam = item({
  type: "TRANSPORT",
  title: "Bus to Amsterdam",
  startAt: "2026-12-24T21:00",
  endAt: "2026-12-25T07:00",
  city: hamburg,
  toCity: amsterdam,
  mode: "BUS",
});
const hotel = item({
  type: "STAY",
  title: "Hostel",
  startAt: "2026-12-25T15:00",
  endAt: "2026-12-27T11:00",
  city: amsterdam,
});
const scenario = [hotel, busToAmsterdam, harbour, busToHamburg];

describe("tripDays", () => {
  it("is inclusive and crosses the year", () => {
    expect(tripDays("2026-12-30", "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });
  it("is empty when the range is reversed", () => {
    expect(tripDays("2026-12-30", "2026-12-29")).toEqual([]);
  });
});

describe("groupByDay", () => {
  it("files an overnight bus under its departure day and carries it", () => {
    const days = groupByDay(scenario, tripDays("2026-12-23", "2026-12-25"));
    expect(days[0].items.map((i) => i.id)).toEqual([busToHamburg.id]);
    expect(days[1].carried.map((i) => i.id)).toEqual([busToHamburg.id]);
    expect(days[1].items.map((i) => i.id)).toEqual([
      harbour.id,
      busToAmsterdam.id,
    ]);
    expect(days[2].carried.map((i) => i.id)).toEqual([busToAmsterdam.id]);
    expect(days[2].items.map((i) => i.id)).toEqual([hotel.id]);
  });
});

describe("routeSteps", () => {
  it("orders steps chronologically and uses pins over city centres", () => {
    const steps = routeSteps(scenario);
    expect(steps.map((s) => s.itemId)).toEqual([
      busToHamburg.id,
      harbour.id,
      busToAmsterdam.id,
      hotel.id,
    ]);
    expect(steps[0].kind).toBe("leg");
    const harbourStep = steps[1];
    expect(harbourStep.kind === "point" && harbourStep.at).toEqual({
      lat: 53.54,
      lng: 9.98,
    });
    const hotelStep = steps[3];
    expect(hotelStep.kind === "point" && hotelStep.at).toEqual({
      lat: 52.37,
      lng: 4.9,
    });
  });

  it("skips items with no location", () => {
    expect(routeSteps([item({ type: "NOTE" })])).toEqual([]);
  });

  it("measures the legs", () => {
    const km = totalDistanceKm(routeSteps(scenario));
    // Istanbul–Hamburg ≈ 1990 km, Hamburg–Amsterdam ≈ 365 km, as the crow flies.
    expect(km).toBeGreaterThan(2250);
    expect(km).toBeLessThan(2450);
  });
});

describe("citiesByDay", () => {
  it("follows the traveller from city to city", () => {
    const result = citiesByDay(scenario, tripDays("2026-12-23", "2026-12-26"));
    expect(result["2026-12-23"]).toEqual(["istanbul"]);
    expect(result["2026-12-24"]).toEqual(["istanbul", "hamburg"]);
    expect(result["2026-12-25"]).toEqual(["hamburg", "amsterdam"]);
    expect(result["2026-12-26"]).toEqual(["amsterdam"]);
  });
});

describe("findConflicts", () => {
  it("reports overlapping activities but not a stay", () => {
    const clash = item({
      startAt: "2026-12-24T12:00",
      endAt: "2026-12-24T14:00",
    });
    const conflicts = findConflicts([...scenario, clash]);
    expect(conflicts).toEqual([[harbour.id, clash.id]]);
  });
});

describe("greatCircle", () => {
  it("starts and ends at the endpoints", () => {
    const points = greatCircle({ lat: 41, lng: 29 }, { lat: 52, lng: 5 }, 10);
    expect(points).toHaveLength(11);
    expect(points[0].lat).toBeCloseTo(41);
    expect(points[10].lng).toBeCloseTo(5);
  });
});
