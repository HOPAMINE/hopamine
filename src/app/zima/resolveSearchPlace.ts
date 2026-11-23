import { findMentionedCity } from "../../../shared/cityPrefixSearch";
import {
  detectSearchCityInText,
  zimaSearchCityById,
} from "../../../shared/zimaSearchCities";
import type { ZimaSearchPlace } from "@/lib/zima/searchPlace";
import { loadWorldCities } from "./useWorldCitySuggestions";

/** The city a search names, or null when the text is not a place. Never substitutes New York. */
export async function resolveSearchPlace(
  text: string,
): Promise<Omit<ZimaSearchPlace, "explicit"> | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const knownId = detectSearchCityInText(trimmed);
  if (knownId) {
    const city = zimaSearchCityById(knownId);
    return {
      label: city.label,
      lng: city.lng,
      lat: city.lat,
      cityId: knownId,
    };
  }

  const mentioned = findMentionedCity(await loadWorldCities(), trimmed);
  if (!mentioned) return null;

  return {
    label: mentioned.name,
    lng: mentioned.lng,
    lat: mentioned.lat,
    cityId: detectSearchCityInText(mentioned.name),
  };
}
