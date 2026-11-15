export type TmdbMovie = {
  id: string;
  title: string;
  year: string | null;
  posterUrl: string | null;
  tmdbUrl: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function isTmdbConfigured(): boolean {
  return Boolean(
    process.env.TMDB_ACCESS_TOKEN?.trim() || process.env.TMDB_API_KEY?.trim(),
  );
}

export function tmdbPosterUrl(posterPath: string | undefined): string | null {
  if (!posterPath) return null;
  return `https://image.tmdb.org/t/p/w500${posterPath}`;
}

export function parseTmdbMovieResults(payload: unknown): TmdbMovie[] {
  const root = asRecord(payload);
  const results = root?.results;
  if (!Array.isArray(results)) return [];

  const movies: TmdbMovie[] = [];
  for (const item of results) {
    const movie = asRecord(item);
    const id = asNumber(movie?.id);
    const title = asString(movie?.title)?.trim() || asString(movie?.name)?.trim();
    if (!id || !title) continue;
    const releaseDate = asString(movie?.release_date) || asString(movie?.first_air_date);
    const year = releaseDate && releaseDate.length >= 4 ? releaseDate.slice(0, 4) : null;
    const posterPath = asString(movie?.poster_path);
    movies.push({
      id: `tmdb-${id}`,
      title,
      year,
      posterUrl: tmdbPosterUrl(posterPath),
      tmdbUrl: `https://www.themoviedb.org/movie/${id}`,
    });
  }
  return movies;
}

export async function searchTmdbMovies(query: string): Promise<TmdbMovie[]> {
  const token = process.env.TMDB_ACCESS_TOKEN?.trim() ?? "";
  const apiKey = process.env.TMDB_API_KEY?.trim() ?? "";
  if (!token && !apiKey) {
    throw new Error("TMDB is not configured");
  }

  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");
  if (!token && apiKey) {
    url.searchParams.set("api_key", apiKey);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(`TMDB search failed (${response.status})`);
  }

  return parseTmdbMovieResults(await response.json());
}
