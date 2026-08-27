/**
 * Curated display-name overrides for map regions. Two jobs in one list:
 *
 * 1. Regions whose source dataset name doesn't match the actual city (e.g.
 *    French NUTS3 units are named after départements — "Rhône" rather than
 *    "Lyon").
 * 2. Translating well-known cities to their standard English name where it
 *    genuinely differs from the local one (München -> Munich, Praha ->
 *    Prague). Small towns/rural districts generally don't have a distinct
 *    English exonym, so those are left in their source spelling.
 *
 * Keyed by the region's stable source id (NUTS_ID for Eurostat regions,
 * GID_1 for the GADM-sourced Bosnia/Montenegro/Kosovo layers) so it applies
 * consistently wherever that id shows up (seeding, map hover/click, search).
 * Accents are stripped separately at display time by latinize() — this list
 * only needs to fix actual word differences, not diacritics.
 *
 * Best-effort list covering major/capital cities discovered by checking
 * real city coordinates against the actual region polygons — not an
 * exhaustive audit of every European region.
 */
export const REGION_NAME_OVERRIDES: Record<string, string> = {
  // Albania
  AL022: "Tirana",

  // Austria
  AT130: "Vienna",

  // Switzerland
  CH011: "Lausanne",

  // Czechia
  CZ010: "Prague",
  CZ064: "Brno",
  CZ080: "Ostrava",

  // Denmark
  DK011: "Copenhagen",
  DK042: "Aarhus",
  DK031: "Odense",

  // Estonia
  EE001: "Tallinn",
  EE008: "Tartu",

  // Greece
  EL303: "Athens",
  EL632: "Patras",

  // Spain
  ES618: "Seville",
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

  // Germany — NUTS2 (see NUTS_LEVEL_2_COUNTRIES in prisma/seed.ts and
  // Map.tsx). Most Regierungsbezirke are already named after their seat
  // city; these are the ones that need it (whole-state units, a region
  // name, or an English exonym), set to their capital/largest city.
  DE21: "Munich",
  DE22: "Landshut",
  DE23: "Regensburg",
  DE24: "Bayreuth",
  DE25: "Nuremberg",
  DE26: "Würzburg",
  DE27: "Augsburg",
  DE40: "Potsdam",
  DE80: "Schwerin",
  DE91: "Brunswick",
  DE92: "Hanover",
  DE94: "Oldenburg",
  DEA2: "Cologne",
  DEB3: "Mainz",
  DEC0: "Saarbrücken",
  DEE0: "Magdeburg",
  DEF0: "Kiel",
  DEG0: "Erfurt",

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

  // Italy
  ITI43: "Rome",
  ITC4C: "Milan",
  ITF33: "Naples",
  ITC11: "Turin",
  ITI14: "Florence",
  ITH35: "Venice",
  ITC33: "Genoa",

  // Lithuania
  LT011: "Vilnius",
  LT022: "Kaunas",

  // North Macedonia
  MK008: "Skopje",

  // Malta
  MT001: "Valletta",

  // Netherlands
  NL33C: "Rotterdam",
  NL332: "The Hague",
  NL414: "Eindhoven",
  NL423: "Maastricht",

  // Norway
  NO0A2: "Bergen",
  NO060: "Trondheim",

  // Poland
  PL911: "Warsaw",
  PL633: "Gdańsk",

  // Portugal
  PT112: "Braga",

  // Romania
  RO321: "Bucharest",

  // Serbia
  RS110: "Belgrade",
  RS123: "Novi Sad",

  // Sweden — Malmö and Lund share one NUTS3 unit; Malmö is the larger/more
  // recognizable of the two so it wins the label.
  SE232: "Gothenburg",
  SE224: "Malmö",

  // Slovenia
  SI041: "Ljubljana",
  SI032: "Maribor",

  // Slovakia
  SK010: "Bratislava",
  SK042: "Košice",

  // United Kingdom — NUTS2. London has no single unifying unit at any
  // level (it's split into Inner/Outer London quadrants), so those are
  // left as-is; every other region below has one dominant, well-known city.
  UKD3: "Manchester",
  UKD7: "Liverpool",
  UKG3: "Birmingham",
  UKM8: "Glasgow",
  UKM7: "Edinburgh",
  UKE4: "Leeds",
  UKE3: "Sheffield",
  UKK1: "Bristol",
  UKL2: "Cardiff",
  UKN0: "Belfast",
  UKC2: "Newcastle",
  UKF1: "Nottingham",
  UKJ3: "Southampton",
  UKJ1: "Oxford",
  UKH1: "Cambridge",
};

/**
 * Bosnia, Montenegro, and Kosovo ship as separate GADM-sourced layers (not
 * in the NUTS dataset), keyed by GID_1. Their city names are already the
 * form used in English (there's no separate English exonym for Sarajevo,
 * Podgorica, etc.) — this only fixes mechanical bugs in the source data
 * (missing spaces, one missing diacritic) and, for Bosnia's cantons, points
 * a region name at its actual seat city.
 */
export const BALKAN_REGION_NAMES: Record<string, string> = {
  // Kosovo — mechanical fixes only
  "XKO.3_1": "Kosovska Mitrovica",
  "XKO.4_1": "Peć",

  // Bosnia and Herzegovina (GADM ADM2 — cantons/regions), region name -> its
  // seat city
  "BIH.2.1_1": "Goražde", // Bosnian Podrinje canton
  "BIH.2.2_1": "Livno", // Canton 10
  "BIH.2.3_1": "Travnik", // Central Bosnia canton
  "BIH.2.4_1": "Mostar", // Herzegovina-Neretva canton
  "BIH.2.5_1": "Orašje", // Posavina canton
  "BIH.2.8_1": "Bihać", // Una-Sana canton
  "BIH.2.9_1": "Široki Brijeg", // West Herzegovina canton
  "BIH.2.10_1": "Zenica", // Zenica-Doboj canton
  "BIH.3.1_1": "Banja Luka",
  "BIH.3.5_1": "Istočno Sarajevo",

  // Montenegro (GADM ADM1 — already municipalities/cities); fixing missing
  // spaces and one missing diacritic
  "MNE.4_1": "Bijelo Polje",
  "MNE.8_1": "Herceg Novi",
  "MNE.12_1": "Nikšić",
};
