"use client";

import { useEffect, useRef, useState } from "react";
import { searchMusic } from "@/lib/music-search";
import { type MusicTrack } from "@/lib/music-tracks";
import { robotoFlex } from "../../../fonts";

const searchInputClass = `w-full bg-transparent ${robotoFlex.className} text-xl text-neutral-700 placeholder:text-neutral-300 focus:outline-none border-b border-neutral-200 focus:border-accent-navbar transition-colors pb-2`;

function TrackArtwork({
  track,
  sizeClassName,
}: {
  track: MusicTrack;
  sizeClassName: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!track.artworkUrl || failed) {
    return <div className={`shrink-0 bg-neutral-100 ${sizeClassName}`} aria-hidden />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={track.artworkUrl}
      alt=""
      className={`shrink-0 object-cover ${sizeClassName}`}
      onError={() => setFailed(true)}
    />
  );
}

export function MusicPicker({
  selected,
  onChange,
}: {
  selected: MusicTrack[];
  onChange: (tracks: MusicTrack[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      abortRef.current?.abort();
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    const handle = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      void searchMusic(trimmed, controller.signal)
        .then(({ tracks }) => {
          if (controller.signal.aborted) return;
          setResults(tracks);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setResults([]);
          setSearchError(error instanceof Error ? error.message : "Search failed");
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, 350);

    return () => {
      window.clearTimeout(handle);
      abortRef.current?.abort();
    };
  }, [query]);

  const selectTrack = (track: MusicTrack) => {
    if (selected.some((item) => item.id === track.id)) return;
    onChange([...selected, track]);
    setQuery("");
    setResults([]);
    setSearchError(null);
  };

  const removeTrack = (track: MusicTrack) => {
    onChange(selected.filter((item) => item.id !== track.id));
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search songs or artists"
        className={searchInputClass}
      />

      {query.trim() ? (
        <div className="flex flex-col gap-1">
          {isSearching ? (
            <p className="font-mono text-xs text-neutral-400">Searching…</p>
          ) : null}
          {searchError ? (
            <p className="font-mono text-xs text-red-500">{searchError}</p>
          ) : null}
          {!isSearching && !searchError && results.length === 0 ? (
            <p className="font-mono text-xs text-neutral-400">No songs found</p>
          ) : null}
          {results
            .filter((track) => !selected.some((item) => item.id === track.id))
            .slice(0, 8)
            .map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => selectTrack(track)}
                className="flex w-full cursor-pointer items-center gap-3 border border-neutral-100 bg-neutral-50 px-2 py-2 text-left transition-colors hover:border-accent-navbar/40 hover:bg-white"
              >
                <TrackArtwork track={track} sizeClassName="size-12" />
                <div className="min-w-0 flex-1">
                  <p className={`${robotoFlex.className} truncate text-base text-neutral-800`}>
                    {track.title}
                  </p>
                  <p className="font-mono truncate text-xs text-neutral-400">{track.artist}</p>
                </div>
              </button>
            ))}
        </div>
      ) : null}

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {selected.map((track) => (
            <div
              key={track.id}
              className="relative flex w-[8.5rem] flex-col gap-2 border border-neutral-100 bg-neutral-50 p-2"
            >
              <button
                type="button"
                onClick={() => removeTrack(track)}
                aria-label={`Remove ${track.title}`}
                className="absolute right-1 top-1 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-sm transition-colors hover:bg-white hover:text-neutral-900"
              >
                <span className="text-sm leading-none" aria-hidden>
                  ×
                </span>
              </button>
              <TrackArtwork track={track} sizeClassName="aspect-square w-full" />
              <div className="min-w-0">
                <p
                  className={`${robotoFlex.className} line-clamp-2 text-sm leading-snug text-neutral-800`}
                >
                  {track.title}
                </p>
                <p className="font-mono mt-1 truncate text-xs text-neutral-400">{track.artist}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
