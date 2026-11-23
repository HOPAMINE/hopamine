"use client";

import { useAction, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { normalizeUsernameQuery } from "../../../shared/usernameQuery";
import type { ZimaSearchResult } from "@/lib/zima/searchResults";
import {
  DEFAULT_SEARCH_PLACE,
  profileIsInCity,
  type ZimaSearchPlace,
} from "@/lib/zima/searchPlace";
import {
  DEFAULT_ZIMA_SEARCH_CITY_ID,
  detectSearchCityInText,
  zimaSearchCityById,
  type ZimaSearchCityId,
} from "../../../shared/zimaSearchCities";
import { hasAnyMatchingTag } from "../../../shared/zimaVocabulary";
import type { useZimaChat } from "./useZimaChat";

type Chat = ReturnType<typeof useZimaChat>;

export type ZimaSearchFilterState = {
  archetypes: string[];
  interests: string[];
  activeOnly: boolean;
  city: ZimaSearchCityId;
};

export const EMPTY_ZIMA_SEARCH_FILTERS: ZimaSearchFilterState = {
  archetypes: [],
  interests: [],
  activeOnly: false,
  city: DEFAULT_ZIMA_SEARCH_CITY_ID,
};

/** Chip toggles arrive in bursts; wait for them to settle before paying for a model call. */
const SEARCH_DEBOUNCE_MS = 400;
/** Same window as the database search: "active" means seen in the last week. */
const ACTIVE_RECENTLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type SearchOutcome = {
  /** Serialized args the outcome answers, so a stale outcome reads as "still loading". */
  searchKey: string;
  results: ZimaSearchResult[];
  error: string | null;
};

/** City search is unchanged. An exact username lookup is a separate result. */
export function useZimaSearch(chat: Chat, profiles: ZimaSearchResult[] = []) {
  const [filters, setFilters] = useState<ZimaSearchFilterState>(
    EMPTY_ZIMA_SEARCH_FILTERS,
  );
  const [place, setPlace] = useState<ZimaSearchPlace>(DEFAULT_SEARCH_PLACE);
  const [usernameQuery, setUsernameQuery] = useState<string | null>(null);

  const lookUpCity = useCallback((next: Omit<ZimaSearchPlace, "explicit">) => {
    setUsernameQuery(null);
    setPlace({ ...next, explicit: true });
    const cityId = next.cityId;
    if (!cityId) return;
    setFilters((prev) => (prev.city === cityId ? prev : { ...prev, city: cityId }));
  }, []);

  const lookUpUsername = useCallback((raw: string) => {
    const username = normalizeUsernameQuery(raw);
    if (!username) {
      setUsernameQuery(null);
      setPlace((prev) => (prev.cityId !== null ? prev : { ...prev, explicit: false }));
      return;
    }
    setUsernameQuery(username);
  }, []);

  const submittedText = useMemo(() => {
    for (let index = chat.messages.length - 1; index >= 0; index -= 1) {
      const message = chat.messages[index]!;
      if (message.role === "user") return message.content;
    }
    return "";
  }, [chat.messages]);

  // A built-in city named in the query ("Montreal") moves the map there.
  // Cities outside that list are set by lookUpCity and must not fall back to New York.
  const cityFromQuery = useMemo(
    () => detectSearchCityInText(submittedText),
    [submittedText],
  );

  useEffect(() => {
    if (usernameQuery || !cityFromQuery) return;
    const city = zimaSearchCityById(cityFromQuery);
    setPlace({
      label: city.label,
      lng: city.lng,
      lat: city.lat,
      cityId: cityFromQuery,
      explicit: true,
    });
    setFilters((prev) =>
      prev.city === cityFromQuery ? prev : { ...prev, city: cityFromQuery },
    );
  }, [cityFromQuery, usernameQuery]);

  const usernameHit = useQuery(
    api.zimaSearch.byExactUsername,
    usernameQuery ? { username: usernameQuery } : "skip",
  );

  useEffect(() => {
    if (!usernameQuery || !usernameHit?.mapped) return;
    const { location, lng, lat, name } = usernameHit.result;
    const label = location === "Unknown" ? name : location;
    setPlace((prev) => {
      if (
        prev.explicit &&
        prev.cityId === null &&
        prev.label === label &&
        prev.lng === lng &&
        prev.lat === lat
      ) {
        return prev;
      }
      return { label, lng, lat, cityId: null, explicit: true };
    });
  }, [usernameQuery, usernameHit]);

  const searchCity: ZimaSearchCityId | null = place.explicit
    ? place.cityId
    : (cityFromQuery ?? filters.city);

  const nearby = useMemo(() => {
    if (searchCity !== null || !place.explicit) return null;
    const activeSince = Date.now() - ACTIVE_RECENTLY_WINDOW_MS;
    return profiles.filter((profile) => {
      if (!profileIsInCity(profile, place)) return false;
      if (!hasAnyMatchingTag(profile.skills, filters.archetypes)) return false;
      if (!hasAnyMatchingTag(profile.interests, filters.interests)) return false;
      if (!filters.activeOnly) return true;
      return profile.lastSeenAt !== undefined && profile.lastSeenAt >= activeSince;
    });
  }, [filters.activeOnly, filters.archetypes, filters.interests, place, profiles, searchCity]);

  const searchArgs = useMemo(
    () => ({
      text: submittedText,
      archetypes: filters.archetypes,
      interests: filters.interests,
      activeOnly: filters.activeOnly,
      city: searchCity ?? filters.city,
    }),
    [submittedText, filters.archetypes, filters.interests, filters.activeOnly, searchCity, filters.city],
  );
  const searchKey = JSON.stringify(searchArgs);
  const shouldSearch =
    !usernameQuery && chat.hasSearchResults && searchCity !== null;

  const runSearch = useAction(api.zimaSearchLlm.search);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);

  useEffect(() => {
    if (!shouldSearch) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const results = await runSearch(searchArgs);
        if (!cancelled) setOutcome({ searchKey, results, error: null });
      } catch (searchError) {
        if (cancelled) return;
        setOutcome({
          searchKey,
          results: [],
          error: searchError instanceof Error ? searchError.message : "Search failed",
        });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [shouldSearch, searchArgs, searchKey, runSearch]);

  const outcomeIsCurrent = outcome?.searchKey === searchKey;

  const usernameActive = usernameQuery !== null;
  const usernameLoading = usernameActive && usernameHit === undefined;

  return {
    filters,
    setFilters,
    place,
    lookUpCity,
    lookUpUsername,
    submittedText,
    results: usernameActive
      ? usernameHit
        ? [usernameHit.result]
        : []
      : (nearby ?? outcome?.results ?? []),
    loadingResults: usernameActive
      ? usernameLoading
      : nearby
        ? false
        : shouldSearch && !outcomeIsCurrent,
    error: usernameActive || nearby || !outcomeIsCurrent ? null : outcome.error,
    loadingLabel: usernameActive ? `Looking up @${usernameQuery}…` : null,
    emptyLabel: usernameActive
      ? `No builder with username @${usernameQuery}.`
      : null,
    summaryLabel: usernameActive
      ? usernameLoading
        ? `looking up @${usernameQuery}…`
        : usernameHit
          ? "we found 1 builder"
          : "no username match"
      : null,
  };
}
