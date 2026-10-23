/**
 * Asks the navigation to focus its city search. The map has no keyboard route to
 * a city of its own, so it points people at the search; the two live in
 * different parts of the tree and talk through this event.
 */
export const CITY_SEARCH_FOCUS_EVENT = "focus-city-search";
