"use client";

import { useAction } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { ZimaSearchResult } from "@/lib/zima/searchResults";
import {
  DEFAULT_ZIMA_SEARCH_CITY_ID,
  type ZimaSearchCityId,
} from "../../../shared/zimaSearchCities";
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

type SearchOutcome = {
  /** Serialized args the outcome answers, so a stale outcome reads as "still loading". */
  searchKey: string;
  results: ZimaSearchResult[];
  error: string | null;
};

/** Every search is one Convex action: chips filter in the database, Claude picks the six to show. */
export function useZimaSearch(chat: Chat) {
  const [filters, setFilters] = useState<ZimaSearchFilterState>(
    EMPTY_ZIMA_SEARCH_FILTERS,
  );

  const submittedText = useMemo(() => {
    for (let index = chat.messages.length - 1; index >= 0; index -= 1) {
      const message = chat.messages[index]!;
      if (message.role === "user") return message.content;
    }
    return "";
  }, [chat.messages]);

  const searchArgs = useMemo(
    () => ({
      text: submittedText,
      archetypes: filters.archetypes,
      interests: filters.interests,
      activeOnly: filters.activeOnly,
      city: filters.city,
    }),
    [submittedText, filters],
  );
  const searchKey = JSON.stringify(searchArgs);
  const shouldSearch = chat.hasSearchResults;

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

  return {
    filters,
    setFilters,
    submittedText,
    results: outcome?.results ?? [],
    loadingResults: shouldSearch && !outcomeIsCurrent,
    error: outcomeIsCurrent ? outcome.error : null,
  };
}
