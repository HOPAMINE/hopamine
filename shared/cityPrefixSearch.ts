/**
 * Prefix search over a sorted world-city index.
 * Binary search finds the first match (O(log n)); then a short linear scan
 * collects contiguous prefix hits — instant at ~12k cities while typing.
 */

export type WorldCity = {
  /** Display name */
  name: string;
  /** Accent-folded lowercase name for binary search */
  folded: string;
  country: string;
  lat: number;
  lng: number;
  population: number;
};

export function foldCityName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** First index where cities[i].folded >= needle (cities sorted by folded). */
export function lowerBoundByFolded(
  cities: readonly WorldCity[],
  needle: string,
): number {
  let lo = 0;
  let hi = cities.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cities[mid]!.folded < needle) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Cities whose folded name starts with the typed prefix.
 * Ranked by population within the prefix slice (biggest first), capped.
 */
export function citiesMatchingPrefix(
  cities: readonly WorldCity[],
  rawPrefix: string,
  limit = 8,
): WorldCity[] {
  const prefix = foldCityName(rawPrefix);
  if (prefix.length < 2) return [];

  const start = lowerBoundByFolded(cities, prefix);
  const hits: WorldCity[] = [];
  for (let i = start; i < cities.length; i += 1) {
    const city = cities[i]!;
    if (!city.folded.startsWith(prefix)) break;
    hits.push(city);
  }

  hits.sort((a, b) => b.population - a.population || a.name.localeCompare(b.name));
  return hits.slice(0, limit);
}

/** Exact folded-name match, preferring highest population (e.g. Paris FR over Paris TX). */
export function bestCityExactMatch(
  cities: readonly WorldCity[],
  rawName: string,
): WorldCity | null {
  const folded = foldCityName(rawName);
  if (!folded) return null;
  const start = lowerBoundByFolded(cities, folded);
  let best: WorldCity | null = null;
  for (let i = start; i < cities.length; i += 1) {
    const city = cities[i]!;
    if (city.folded !== folded) break;
    if (!best || city.population > best.population) best = city;
  }
  return best;
}

/**
 * A city named in free text. The whole string wins first ("Tokyo"), then the
 * longest whole-word mention ("builders in Tokyo" → Tokyo, and "New York"
 * beats "York").
 */
export function findMentionedCity(
  cities: readonly WorldCity[],
  rawText: string,
): WorldCity | null {
  const exact = bestCityExactMatch(cities, rawText);
  if (exact) return exact;

  const folded = foldCityName(rawText);
  if (!folded) return null;
  const padded = ` ${folded} `;

  let best: WorldCity | null = null;
  for (const city of cities) {
    if (city.folded.length < 4) continue;
    if (!padded.includes(` ${city.folded} `)) continue;
    if (
      !best ||
      city.folded.length > best.folded.length ||
      (city.folded.length === best.folded.length &&
        city.population > best.population)
    ) {
      best = city;
    }
  }
  return best;
}
