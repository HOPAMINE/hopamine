import { type MusicTrack } from "@/lib/music-tracks";

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

function largerItunesArtwork(url: string): string {
  return url.replace(/100x100bb/, "600x600bb");
}

export function parseItunesResults(payload: unknown): MusicTrack[] {
  const root = asRecord(payload);
  const results = root?.results;
  if (!Array.isArray(results)) return [];

  const tracks: MusicTrack[] = [];
  for (const item of results) {
    const song = asRecord(item);
    const trackId = asNumber(song?.trackId);
    const title = asString(song?.trackName);
    const artist = asString(song?.artistName);
    if (!trackId || !title || !artist) continue;
    const artworkUrl100 = asString(song?.artworkUrl100);
    tracks.push({
      id: `itunes-${trackId}`,
      title,
      artist,
      album: asString(song?.collectionName),
      artworkUrl: artworkUrl100 ? largerItunesArtwork(artworkUrl100) : null,
      previewUrl: asString(song?.previewUrl) ?? null,
      geniusUrl: `https://genius.com/search?q=${encodeURIComponent(`${title} ${artist}`)}`,
    });
  }
  return tracks;
}

export function parseGeniusHits(payload: unknown): MusicTrack[] {
  const root = asRecord(payload);
  const response = asRecord(root?.response);
  const hits = response?.hits;
  if (!Array.isArray(hits)) return [];

  const tracks: MusicTrack[] = [];
  for (const hit of hits) {
    const song = asRecord(asRecord(hit)?.result);
    const id = asNumber(song?.id);
    const title = asString(song?.title);
    if (!id || !title) continue;
    const primaryArtist = asRecord(song?.primary_artist);
    const artist =
      asString(song?.artist_names)?.trim() ||
      asString(primaryArtist?.name)?.trim() ||
      "Unknown artist";
    tracks.push({
      id: `genius-${id}`,
      title,
      artist,
      artworkUrl:
        asString(song?.song_art_image_url) ??
        asString(song?.song_art_image_thumbnail_url) ??
        null,
      previewUrl: null,
      geniusUrl: asString(song?.url) ?? `https://genius.com/songs/${id}`,
    });
  }
  return tracks;
}

export function trackMatchKey(title: string, artist: string): string {
  return `${title}|${artist}`.toLowerCase().replace(/[^a-z0-9|]+/g, "");
}

export function mergeCatalogTracks(itunes: MusicTrack[], genius: MusicTrack[]): MusicTrack[] {
  const itunesByKey = new Map(
    itunes.map((track) => [trackMatchKey(track.title, track.artist), track]),
  );
  const seen = new Set<string>();
  const merged: MusicTrack[] = [];

  for (const geniusTrack of genius) {
    const key = trackMatchKey(geniusTrack.title, geniusTrack.artist);
    const itunesMatch = itunesByKey.get(key);
    seen.add(key);
    merged.push({
      ...geniusTrack,
      album: itunesMatch?.album ?? geniusTrack.album,
      artworkUrl: geniusTrack.artworkUrl ?? itunesMatch?.artworkUrl ?? null,
      previewUrl: itunesMatch?.previewUrl ?? geniusTrack.previewUrl,
    });
  }

  for (const itunesTrack of itunes) {
    const key = trackMatchKey(itunesTrack.title, itunesTrack.artist);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(itunesTrack);
  }

  return merged;
}

export async function searchItunesCatalog(
  query: string,
  signal?: AbortSignal,
): Promise<MusicTrack[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`iTunes search failed (${response.status})`);
  }
  return parseItunesResults(await response.json());
}
