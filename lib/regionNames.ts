/**
 * Curated display-name overrides for map regions whose source dataset name
 * doesn't match the actual city (e.g. French NUTS3 units are named after
 * départements — "Rhône" rather than "Lyon"). Keyed by the region's stable
 * source id (NUTS_ID for Eurostat regions, GID_1 for the GADM-sourced
 * Bosnia/Kosovo layers) so it applies consistently wherever that id shows up
 * (seeding, map hover/click, search).
 *
 * This is a best-effort list covering major/capital cities discovered by
 * checking real city coordinates against the actual region polygons — not an
 * exhaustive audit of every European region.
 */
export const REGION_NAME_OVERRIDES: Record<string, string> = {
  // Albania
  AL022: "Tiranë",

  // Switzerland
  CH011: "Lausanne",

  // Czechia
  CZ064: "Brno",
  CZ080: "Ostrava",

  // Denmark
  DK042: "Aarhus",
  DK031: "Odense",

  // Estonia
  EE001: "Tallinn",
  EE008: "Tartu",

  // Greece
  EL303: "Athina",
  EL632: "Patra",

  // Spain
  ES213: "Bilbao",

  // Finland
  FI197: "Tampere",
  FI1C1: "Turku",
  FI1D9: "Oulu",

  // France
  FRK26: "Lyon",
  FRL04: "Marseille",
  FRJ23: "Toulouse",
  FRL03: "Nice",
  FRG01: "Nantes",
  FRF11: "Strasbourg",
  FRJ13: "Montpellier",
  FRI12: "Bordeaux",
  FRE11: "Lille",
  FRH03: "Rennes",
  FRK24: "Grenoble",
  FRC11: "Dijon",

  // Croatia
  HR031: "Rijeka",

  // Hungary
  HU321: "Debrecen",
  HU333: "Szeged",

  // Ireland
  IE053: "Cork",
  IE042: "Galway",

  // Iceland
  IS001: "Reykjavík",

  // Lithuania
  LT011: "Vilnius",
  LT022: "Kaunas",

  // Montenegro
  ME000: "Podgorica",

  // North Macedonia
  MK008: "Skopje",

  // Malta
  MT001: "Valletta",

  // Netherlands
  NL33C: "Rotterdam",
  NL332: "Den Haag",
  NL414: "Eindhoven",
  NL423: "Maastricht",

  // Norway
  NO0A2: "Bergen",
  NO060: "Trondheim",

  // Poland
  PL633: "Gdańsk",

  // Portugal
  PT112: "Braga",

  // Serbia
  RS110: "Beograd",
  RS123: "Novi Sad",

  // Sweden — Malmö and Lund share one NUTS3 unit; Malmö is the larger/more
  // recognizable of the two so it wins the label.
  SE232: "Göteborg",
  SE224: "Malmö",

  // Slovenia
  SI041: "Ljubljana",
  SI032: "Maribor",

  // Slovakia
  SK010: "Bratislava",
  SK042: "Košice",

  // United Kingdom
  UKC22: "Newcastle",
};

/**
 * Bosnia and Kosovo ship as separate GADM-sourced layers (not in the NUTS
 * dataset), keyed by GID_1. Only a handful of their raw NAME_1 values have
 * mechanical bugs (missing spaces, one typo) — this fixes only those,
 * without relabeling anything the source already renders correctly.
 */
export const BALKAN_REGION_NAMES: Record<string, string> = {
  "BIH.2_1": "Federacija Bosna i Hercegovina",
  "BIH.3_1": "Republika Srpska",
  "XKO.3_1": "Kosovska Mitrovica",
  "XKO.4_1": "Peć",
};
