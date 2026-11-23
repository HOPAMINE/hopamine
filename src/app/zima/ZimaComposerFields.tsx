"use client";

import { useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import {
  detectSearchCityInText,
  zimaSearchCityById,
} from "../../../shared/zimaSearchCities";
import type { WorldCity } from "../../../shared/cityPrefixSearch";
import {
  isExactUsernameQuery,
  normalizeUsernameQuery,
  usernamePrefixStart,
} from "../../../shared/usernameQuery";
import { jetbrainsMono } from "../../../fonts";
// import { ZimaSearchQuickPills } from "./ZimaSearchQuickPills";
import { ZimaSearchFilters } from "./ZimaSearchFilters";
import { resolveSearchPlace } from "./resolveSearchPlace";
import { useWorldCitySuggestions } from "./useWorldCitySuggestions";
import type { useZimaChat } from "./useZimaChat";
import type { useZimaSearch } from "./useZimaSearch";

const HOPAMINE_BLUE = "#00a6f3";

function UsernameRows({
  users,
  loading,
  onPick,
}: {
  users: {
    _id: string;
    username: string;
    name: string;
    avatarUrl: string;
    location?: string;
  }[];
  loading: boolean;
  onPick: (username: string) => void;
}) {
  if (loading && users.length === 0) {
    return (
      <li className={`${jetbrainsMono.className} px-4 py-2.5 text-[12px] text-neutral-400`}>
        Looking up usernames…
      </li>
    );
  }

  return (
    <>
      {users.map((user) => (
        <li key={user._id}>
          <button
            type="button"
            role="option"
            className={`${jetbrainsMono.className} flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-[13px] text-neutral-800 transition-colors hover:bg-[#f0f9ff]`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(user.username)}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <img
                src={user.avatarUrl}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full bg-neutral-200 object-cover"
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-[11px] text-neutral-500">
                  @{user.username}
                </span>
              </span>
            </span>
            {user.location ? (
              <span className="shrink-0 truncate text-[11px] uppercase tracking-wide text-neutral-500">
                {user.location.split(",")[0]}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </>
  );
}

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
  const { message, setMessage, inputRef, canSend, isLoading, runSearch } = chat;
  const [listOpen, setListOpen] = useState(false);
  const { suggestions } = useWorldCitySuggestions(message);
  const usernamePrefix = usernamePrefixStart(message);
  const usernameSuggestions = useQuery(
    api.zimaSearch.suggestUsernames,
    usernamePrefix ? { prefix: usernamePrefix } : "skip",
  );
  const users = usernameSuggestions ?? [];
  const peopleFirst = message.trim().startsWith("@");
  const recognizedCityId = detectSearchCityInText(message);
  const recognizedLabel = recognizedCityId
    ? zimaSearchCityById(recognizedCityId).label
    : search.place.explicit &&
        search.place.label.toLowerCase() === message.trim().toLowerCase()
      ? search.place.label
      : null;
  const showSuggestions =
    listOpen &&
    !isLoading &&
    (suggestions.length > 0 ||
      users.length > 0 ||
      (usernamePrefix !== null && usernameSuggestions === undefined));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setListOpen(false);
    const text = message.trim();
    if (!text) return;
    const username = normalizeUsernameQuery(text);
    const exactUser = users.find((user) => user.username === username);
    const namedCity = detectSearchCityInText(text);
    if (exactUser && (text.startsWith("@") || !namedCity)) {
      search.lookUpUsername(exactUser.username);
      void runSearch(exactUser.username, onEnterChatMode);
      return;
    }
    if (text.startsWith("@") && isExactUsernameQuery(text)) {
      search.lookUpUsername(username);
      void runSearch(username, onEnterChatMode);
      return;
    }
    void (async () => {
      const resolved = await resolveSearchPlace(text);
      if (resolved) search.lookUpCity(resolved);
      else search.lookUpUsername("");
      await runSearch(text, onEnterChatMode);
    })();
  };

  function pickCity(city: WorldCity) {
    setMessage(city.name);
    setListOpen(false);
    search.lookUpCity({
      label: city.name,
      lng: city.lng,
      lat: city.lat,
      cityId: detectSearchCityInText(city.name),
    });
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function pickUsername(username: string) {
    setListOpen(false);
    setMessage(username);
    search.lookUpUsername(username);
    void runSearch(username, onEnterChatMode);
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
            aria-label="Cities and usernames"
            className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-neutral-200 bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          >
            {(peopleFirst ? (["people", "cities"] as const) : (["cities", "people"] as const)).map(
              (group) =>
                group === "cities" ? (
                  suggestions.map((city) => (
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
                  ))
                ) : (
                  <UsernameRows
                    key="people"
                    loading={
                      usernamePrefix !== null &&
                      usernameSuggestions === undefined &&
                      suggestions.length === 0
                    }
                    users={users}
                    onPick={pickUsername}
                  />
                ),
            )}
          </ul>
        ) : null}
        {recognizedLabel ? (
          <p
            className={`${jetbrainsMono.className} pointer-events-none absolute left-0 right-0 top-full z-30 mt-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[#00a6f3] sm:text-left`}
            aria-live="polite"
          >
            Searching in {recognizedLabel}
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
