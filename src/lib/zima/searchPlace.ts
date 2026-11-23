import { foldCityName } from "../../../shared/cityPrefixSearch";
import {
  zimaSearchCityById,
  type ZimaSearchCityId,
} from "../../../shared/zimaSearchCities";

/** Where the map should sit for a lookup. cityId is set only for the built-in search cities. */
export type ZimaSearchPlace = {
  label: string;
  lng: number;
  lat: number;
  cityId: ZimaSearchCityId | null;
  /** The user named a city. An empty result stays here instead of falling back to New York. */
  explicit: boolean;
};

const nyc = zimaSearchCityById("new-york-city");

export const DEFAULT_SEARCH_PLACE: ZimaSearchPlace = {
  label: nyc.label,
  lng: nyc.lng,
  lat: nyc.lat,
  cityId: nyc.id,
  explicit: false,
};

/** People shown for a city the built-in list does not search. ~80km covers a metro, not the next country. */
const CITY_RADIUS_KM = 80;

function cityName(label: string): string {
  return foldCityName(label.split(",")[0] ?? label);
}

function haversineKm(
  latA: number,
  lngA: number,
  latB: number,
  lngB: number,
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** A profile belongs to a looked-up city by name ("Lisbon, Portugal") or by being in that metro. */
export function profileIsInCity(
  profile: { location: string; lng: number; lat: number },
  place: { label: string; lng: number; lat: number },
): boolean {
  const name = cityName(place.label);
  if (name) {
    const named = profile.location
      .split(",")
      .some((segment) => foldCityName(segment) === name);
    if (named) return true;
  }
  return haversineKm(profile.lat, profile.lng, place.lat, place.lng) <= CITY_RADIUS_KM;
}
