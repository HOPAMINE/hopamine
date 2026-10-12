import {
  resolveNycCoordinates,
  type LngLat,
} from "./nycLocationCoordinates";

export const ZIMA_SEARCH_CITIES = [
  {
    id: "new-york-city",
    label: "New York City",
    lng: -73.9712,
    lat: 40.7831,
    matchers: ["new york", "nyc"],
  },
  {
    id: "paris",
    label: "Paris",
    lng: 2.3522,
    lat: 48.8566,
    matchers: ["paris"],
  },
  {
    id: "sydney",
    label: "Sydney",
    lng: 151.2093,
    lat: -33.8688,
    matchers: ["sydney"],
  },
  {
    id: "bangalore",
    label: "Bangalore",
    lng: 77.5946,
    lat: 12.9716,
    matchers: ["bangalore", "bengaluru"],
  },
  {
    id: "london",
    label: "London",
    lng: -0.1278,
    lat: 51.5074,
    matchers: ["london"],
  },
  {
    id: "montreal",
    label: "Montreal",
    lng: -73.5673,
    lat: 45.5017,
    matchers: ["montreal"],
  },
] as const;

export type ZimaSearchCityId = (typeof ZIMA_SEARCH_CITIES)[number]["id"];

export const DEFAULT_ZIMA_SEARCH_CITY_ID: ZimaSearchCityId = "new-york-city";

export function zimaSearchCityById(id: ZimaSearchCityId) {
  const city = ZIMA_SEARCH_CITIES.find((item) => item.id === id);
  if (!city) {
    throw new Error(`Unknown search city: ${id}`);
  }
  return city;
}

function foldLocation(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Last whole-word match, so "Chelsea, London" resolves to London. */
function lastMatcherIndex(folded: string, matchers: readonly string[]): number {
  let last = -1;
  for (const matcher of matchers) {
    const pattern = new RegExp(`\\b${matcher}\\b`, "g");
    let match = pattern.exec(folded);
    while (match) {
      if (match.index > last) last = match.index;
      match = pattern.exec(folded);
    }
  }
  return last;
}

/**
 * Which search city a saved profile location belongs to. Named cities win
 * over the NYC neighborhood table, so "Chelsea, London" stays in London.
 * A bare NYC neighborhood ("Chelsea") still maps to New York City.
 */
export function searchCityIdForLocation(
  location: string | undefined,
): ZimaSearchCityId | null {
  const trimmed = location?.trim();
  if (!trimmed) return null;

  const folded = foldLocation(trimmed);
  let winner: ZimaSearchCityId | null = null;
  let winnerIndex = -1;
  for (const city of ZIMA_SEARCH_CITIES) {
    if (city.id === "new-york-city") continue;
    const index = lastMatcherIndex(folded, city.matchers);
    if (index > winnerIndex) {
      winnerIndex = index;
      winner = city.id;
    }
  }
  if (winner) return winner;

  const nyc = ZIMA_SEARCH_CITIES[0];
  if (
    lastMatcherIndex(folded, nyc.matchers) >= 0 ||
    resolveNycCoordinates(trimmed)
  ) {
    return "new-york-city";
  }
  return null;
}

/** Neighborhood point inside NYC; city centroid everywhere else we search. */
export function coordinatesForSearchLocation(
  location: string | undefined,
): LngLat | null {
  const cityId = searchCityIdForLocation(location);
  if (!cityId) return null;
  if (cityId === "new-york-city") {
    return (
      resolveNycCoordinates(location) ?? {
        lng: ZIMA_SEARCH_CITIES[0].lng,
        lat: ZIMA_SEARCH_CITIES[0].lat,
      }
    );
  }
  const city = zimaSearchCityById(cityId);
  return { lng: city.lng, lat: city.lat };
}
