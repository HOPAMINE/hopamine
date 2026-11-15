import { NextRequest, NextResponse } from "next/server";
import { getGeniusAccessToken, isGeniusConfigured } from "@/lib/genius-server";
import {
  mergeCatalogTracks,
  parseGeniusHits,
  searchItunesCatalog,
} from "@/lib/music-catalog";
import { type MusicTrack } from "@/lib/music-tracks";

export const runtime = "nodejs";

async function searchGeniusSongs(
  query: string,
  token: string,
): Promise<MusicTrack[]> {
  const pages = [1, 2];
  const batches = await Promise.all(
    pages.map(async (page) => {
      const url = new URL("https://api.genius.com/search");
      url.searchParams.set("q", query);
      url.searchParams.set("per_page", "5");
      url.searchParams.set("page", String(page));
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Genius search failed (${response.status})`);
      }
      return parseGeniusHits(await response.json());
    }),
  );
  return batches.flat();
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const itunes = await searchItunesCatalog(query).catch(() => [] as MusicTrack[]);

  if (!isGeniusConfigured()) {
    return NextResponse.json({
      tracks: itunes,
      geniusError: "notConfigured",
    });
  }

  const token = await getGeniusAccessToken();
  if (!token) {
    return NextResponse.json({
      tracks: itunes,
      geniusError: "geniusFailed",
    });
  }

  try {
    const genius = await searchGeniusSongs(query, token);
    return NextResponse.json({
      tracks: mergeCatalogTracks(itunes, genius),
      geniusError: null,
    });
  } catch {
    return NextResponse.json({
      tracks: itunes,
      geniusError: "geniusFailed",
    });
  }
}
