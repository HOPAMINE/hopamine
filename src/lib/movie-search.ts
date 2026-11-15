import { type TmdbMovie } from "@/lib/tmdb";

export async function searchMovies(
  query: string,
  signal: AbortSignal,
): Promise<{ movies: TmdbMovie[] }> {
  const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Movie search failed (${response.status})`);
  }

  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Movie search returned an invalid response");
  }

  const body = payload as { movies?: TmdbMovie[] };
  return {
    movies: Array.isArray(body.movies) ? body.movies : [],
  };
}
