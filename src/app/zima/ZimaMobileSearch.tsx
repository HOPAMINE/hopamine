"use client";

import { useEffect, useState } from "react";
import ZimaSearchMap from "@/components/zima/ZimaSearchMap";
import {
  findSearchResultById,
  type ZimaSearchResult,
} from "@/lib/zima/searchResults";
import { zimaSearchCityById } from "../../../shared/zimaSearchCities";
import { ZimaComposerFields } from "./ZimaComposerFields";
import { ZimaMobileResultsDrawer } from "./ZimaMobileResultsDrawer";
import { ZimaSearchProfilePanel } from "./ZimaSearchProfilePanel";
import type { useZimaChat } from "./useZimaChat";
import type { useZimaSearch } from "./useZimaSearch";

type Chat = ReturnType<typeof useZimaChat>;
type Search = ReturnType<typeof useZimaSearch>;

type Props = {
  chat: Chat;
  search: Search;
  profiles: ZimaSearchResult[];
  onFirstSend: () => void;
};

export function ZimaMobileSearch({
  chat,
  search,
  profiles,
  onFirstSend,
}: Props) {
  const { hasSearchResults } = chat;
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const selectedResult =
    findSearchResultById(profiles, selectedResultId) ??
    findSearchResultById(search.results, selectedResultId);

  useEffect(() => {
    setSelectedResultId(null);
  }, [search.filters.city]);

  return (
    <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="shrink-0 border-b border-neutral-200 bg-white">
        <div
          className="py-2 pt-[max(12px,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
        >
          <ZimaComposerFields
            chat={chat}
            search={search}
            onEnterChatMode={onFirstSend}
            variant="header"
            idSuffix="-mobile-header"
          />
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <ZimaSearchMap
          showPins={hasSearchResults}
          cityId={search.filters.city}
          directory={profiles}
          layoutKey="mobile-results"
          className="absolute inset-0 z-0 overflow-hidden"
          selectedResultId={selectedResultId}
          onSelectResult={setSelectedResultId}
        />

        {selectedResult ? (
          <div className="absolute inset-0 z-40 overflow-y-auto bg-white">
            <ZimaSearchProfilePanel
              result={selectedResult}
              onBack={() => setSelectedResultId(null)}
            />
          </div>
        ) : hasSearchResults ? (
          <ZimaMobileResultsDrawer
            results={search.results}
            loadingResults={search.loadingResults}
            errorMessage={search.error}
            cityLabel={zimaSearchCityById(search.filters.city).label}
            selectedResultId={selectedResultId}
            onSelectResult={setSelectedResultId}
          />
        ) : null}
      </main>
    </div>
  );
}
