import { type MusicTrack } from "@/lib/music-tracks";

export async function searchMusic(
  query: string,
  signal: AbortSignal,
): Promise<{ tracks: MusicTrack[]; geniusError: string | null }> {
  const response = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Music search failed (${response.status})`);
  }

  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Music search returned an invalid response");
  }

  const body = payload as {
    tracks?: MusicTrack[];
    geniusError?: string | null;
  };

  return {
    tracks: Array.isArray(body.tracks) ? body.tracks : [],
    geniusError: typeof body.geniusError === "string" ? body.geniusError : null,
  };
}
