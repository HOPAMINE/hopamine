import { NextRequest, NextResponse } from "next/server";
import { isTmdbConfigured, searchTmdbMovies } from "@/lib/tmdb";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  if (!isTmdbConfigured()) {
    return NextResponse.json({ error: "TMDB is not configured" }, { status: 503 });
  }

  try {
    const movies = await searchTmdbMovies(query);
    return NextResponse.json({ movies });
  } catch (error) {
    console.error("[movies/search]", error);
    return NextResponse.json({ error: "TMDB search failed" }, { status: 502 });
  }
}
