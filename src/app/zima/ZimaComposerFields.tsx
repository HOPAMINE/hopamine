"use client";

import { useState, type FormEvent } from "react";
import {
  detectSearchCityInText,
  zimaSearchCityById,
} from "../../../shared/zimaSearchCities";
import type { WorldCity } from "../../../shared/cityPrefixSearch";
import { jetbrainsMono } from "../../../fonts";
// import { ZimaSearchQuickPills } from "./ZimaSearchQuickPills";
import { ZimaSearchFilters } from "./ZimaSearchFilters";
import { useWorldCitySuggestions } from "./useWorldCitySuggestions";
import type { useZimaChat } from "./useZimaChat";
import type { useZimaSearch } from "./useZimaSearch";

const HOPAMINE_BLUE = "#00a6f3";

type Chat = ReturnType<typeof useZimaChat>;
type Search = ReturnType<typeof useZimaSearch>;

type Props = {
  chat: Chat;
  search: Search;
  onEnterChatMode: () => void;
  variant: "landing" | "compact" | "header";
  idSuffix?: string;
};

export function ZimaComposerFields({
  chat,
  search,
  onEnterChatMode,
  variant,
}: Props) {
  const { message, setMessage, inputRef, canSend, isLoading, submit } = chat;
  const [listOpen, setListOpen] = useState(false);
  const { suggestions } = useWorldCitySuggestions(message);
  const recognizedCityId = detectSearchCityInText(message);
  const recognizedCity = recognizedCityId
    ? zimaSearchCityById(recognizedCityId)
    : null;
  const showSuggestions = listOpen && suggestions.length > 0 && !isLoading;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    setListOpen(false);
    void submit(event, onEnterChatMode);
  };

  function pickCity(city: WorldCity) {
    setMessage(city.name);
    setListOpen(false);
    const zimaId = detectSearchCityInText(city.name);
    if (zimaId) {
      search.setFilters({ ...search.filters, city: zimaId });
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const formShellClass =
    variant === "compact"
      ? "bg-neutral-200"
      : "border border-neutral-200 bg-white";

  const horizontalPad = variant === "landing" ? "px-4 md:px-0" : "";

  return (
    <div className={`w-full ${horizontalPad}`}>
      <div className="relative">
        <form
          onSubmit={onSubmit}
          className={`relative m-0 flex h-14 w-full items-center gap-3 rounded-full pl-4 pr-3 shadow-none ${formShellClass}`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-5 w-5 shrink-0 text-neutral-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="7" cy="7" r="4.25" />
            <path d="M10.5 10.5 14 14" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setListOpen(true);
            }}
            onFocus={() => setListOpen(true)}
            onBlur={() => {
              // Delay so suggestion click registers before the list closes.
              window.setTimeout(() => setListOpen(false), 120);
            }}
            placeholder="Find builders near you..."
            aria-label="Find builders near you"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            disabled={isLoading}
            className={`${jetbrainsMono.className} h-10 min-w-0 flex-1 appearance-none border-0 bg-transparent px-2 py-0 text-[15px] text-neutral-800 shadow-none outline-none placeholder:text-[15px] placeholder:text-neutral-400 disabled:opacity-60`}
          />
          <button
            type="submit"
            disabled={isLoading}
            aria-disabled={!canSend}
            aria-label="Send"
            className="relative z-10 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: HOPAMINE_BLUE }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
              strokeLinejoin="miter"
            >
              <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
            </svg>
          </button>
        </form>

        {/* Overlay only — must not grow the composer or the centered landing jumps. */}
        {showSuggestions ? (
          <ul
            role="listbox"
            aria-label="Cities"
            className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-neutral-200 bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          >
            {suggestions.map((city) => (
              <li key={`${city.folded}-${city.country}-${city.lat}`}>
                <button
                  type="button"
                  role="option"
                  className={`${jetbrainsMono.className} flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left text-[13px] text-neutral-800 transition-colors hover:bg-[#f0f9ff]`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pickCity(city)}
                >
                  <span className="min-w-0 truncate font-semibold">
                    {city.name}
                  </span>
                  <span className="shrink-0 text-[11px] uppercase tracking-wide text-neutral-500">
                    {city.country}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {recognizedCity ? (
          <p
            className={`${jetbrainsMono.className} pointer-events-none absolute left-0 right-0 top-full z-30 mt-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[#00a6f3] sm:text-left`}
            aria-live="polite"
          >
            Searching in {recognizedCity.label}
          </p>
        ) : null}
      </div>
      <ZimaSearchFilters
        className="mt-1"
        filters={search.filters}
        onFiltersChange={search.setFilters}
      />
    </div>
  );
}
