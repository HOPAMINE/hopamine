"use client";

import { useEffect, useRef, useState } from "react";
import { searchMovies } from "@/lib/movie-search";
import { type TmdbMovie } from "@/lib/tmdb";
import { robotoFlex } from "../../../fonts";

const searchInputClass = `w-full bg-transparent ${robotoFlex.className} text-xl text-neutral-700 placeholder:text-neutral-300 focus:outline-none border-b border-neutral-200 focus:border-accent-navbar transition-colors pb-2`;

function MoviePoster({
  movie,
  sizeClassName,
}: {
  movie: TmdbMovie;
  sizeClassName: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!movie.posterUrl || failed) {
    return <div className={`shrink-0 bg-neutral-100 ${sizeClassName}`} aria-hidden />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={movie.posterUrl}
      alt=""
      className={`shrink-0 object-cover ${sizeClassName}`}
      onError={() => setFailed(true)}
    />
  );
}

export function MoviePicker({
  selected,
  onChange,
}: {
  selected: TmdbMovie[];
  onChange: (movies: TmdbMovie[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbMovie[]>([]);
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

      void searchMovies(trimmed, controller.signal)
        .then(({ movies }) => {
          if (controller.signal.aborted) return;
          setResults(movies);
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

  const selectMovie = (movie: TmdbMovie) => {
    if (selected.some((item) => item.id === movie.id)) return;
    onChange([...selected, movie]);
    setQuery("");
    setResults([]);
    setSearchError(null);
  };

  const removeMovie = (movie: TmdbMovie) => {
    onChange(selected.filter((item) => item.id !== movie.id));
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search movies"
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
            <p className="font-mono text-xs text-neutral-400">No movies found</p>
          ) : null}
          {results
            .filter((movie) => !selected.some((item) => item.id === movie.id))
            .slice(0, 8)
            .map((movie) => (
              <button
                key={movie.id}
                type="button"
                onClick={() => selectMovie(movie)}
                className="flex w-full cursor-pointer items-center gap-3 border border-neutral-100 bg-neutral-50 px-2 py-2 text-left transition-colors hover:border-accent-navbar/40 hover:bg-white"
              >
                <MoviePoster movie={movie} sizeClassName="size-12" />
                <div className="min-w-0 flex-1">
                  <p className={`${robotoFlex.className} truncate text-base text-neutral-800`}>
                    {movie.title}
                  </p>
                  <p className="font-mono truncate text-xs text-neutral-400">
                    {movie.year ?? "Movie"}
                  </p>
                </div>
              </button>
            ))}
        </div>
      ) : null}

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {selected.map((movie) => (
            <button
              key={movie.id}
              type="button"
              onClick={() => removeMovie(movie)}
              className="flex w-[8.5rem] cursor-pointer flex-col gap-2 border border-neutral-100 bg-neutral-50 p-2 text-left transition-colors hover:border-neutral-300"
            >
              <MoviePoster movie={movie} sizeClassName="aspect-[2/3] w-full" />
              <div className="min-w-0">
                <p
                  className={`${robotoFlex.className} line-clamp-2 text-sm leading-snug text-neutral-800`}
                >
                  {movie.title}
                </p>
                <p className="font-mono mt-1 truncate text-xs text-neutral-400">
                  {movie.year ?? "Movie"}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
