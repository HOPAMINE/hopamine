"use client";

import { useEffect, useMemo, useState } from "react";
import {
  citiesMatchingPrefix,
  type WorldCity,
} from "../../../shared/cityPrefixSearch";

type CitiesModule = { default: WorldCity[] };

let citiesPromise: Promise<WorldCity[]> | null = null;

export function loadWorldCities(): Promise<WorldCity[]> {
  if (!citiesPromise) {
    citiesPromise = import("../../../shared/worldCities50k.json").then(
      (mod: CitiesModule) => mod.default,
    );
  }
  return citiesPromise;
}

/**
 * Binary-search typeahead over ~9k cities (pop ≥ 50k). Index loads once on
 * first non-empty query so the landing bundle stays light.
 */
export function useWorldCitySuggestions(query: string, limit = 6) {
  const [cities, setCities] = useState<WorldCity[] | null>(null);
  const trimmed = query.trim();
  const shouldLoad = trimmed.length >= 2;

  useEffect(() => {
    if (!shouldLoad || cities) return;
    let cancelled = false;
    void loadWorldCities().then((rows) => {
      if (!cancelled) setCities(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [shouldLoad, cities]);

  const suggestions = useMemo(() => {
    if (!cities || trimmed.length < 2) return [];
    return citiesMatchingPrefix(cities, trimmed, limit);
  }, [cities, trimmed, limit]);

  return {
    suggestions,
    ready: cities !== null,
    loading: shouldLoad && cities === null,
  };
}
