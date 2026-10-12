import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  query,
  type QueryCtx,
} from "./_generated/server";
import { jitterCoordinates, type LngLat } from "../shared/nycLocationCoordinates";
import { coordinatesForSearchLocation } from "../shared/zimaSearchCities";
import {
  zimaSearchResultValidator,
  type ZimaSearchResult,
} from "./zimaSearch";

/** Safety stop so a huge table cannot blow one query. The directory is every onboarded user up to this. */
const MAX_USERS = 2000;
const GEOCODE_BATCH = 20;

function locationPointKey(location: string): string {
  return location
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const label of labels) {
    const trimmed = label.trim();
    const key = trimmed.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(trimmed);
  }
  return unique;
}

async function listOnboardedUsers(ctx: QueryCtx): Promise<Doc<"users">[]> {
  return await ctx.db
    .query("users")
    .withIndex("by_onboarding_completed_at", (q) =>
      q.gt("onboardingCompletedAt", 0),
    )
    .order("desc")
    .take(MAX_USERS);
}

/** Point reads for places the built-in city list does not already place. */
async function cachedPointsForLocations(
  ctx: QueryCtx,
  locations: readonly string[],
): Promise<Map<string, { lng?: number; lat?: number }>> {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const location of locations) {
    if (coordinatesForSearchLocation(location)) continue;
    const key = locationPointKey(location);
    if (seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }

  const rows = await Promise.all(
    keys.map((key) =>
      ctx.db
        .query("locationPoints")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique(),
    ),
  );

  const byKey = new Map<string, { lng?: number; lat?: number }>();
  for (const row of rows) {
    if (!row) continue;
    byKey.set(row.key, { lng: row.lng, lat: row.lat });
  }
  return byKey;
}

function coordinatesForUser(
  location: string,
  cached: { lng?: number; lat?: number } | undefined,
): LngLat | "pending" | null {
  const known = coordinatesForSearchLocation(location);
  if (known) return known;
  if (!cached) return "pending";
  if (cached.lng === undefined || cached.lat === undefined) return null;
  return { lng: cached.lng, lat: cached.lat };
}

function toGlobeProfile(user: Doc<"users">, coordinates: LngLat): ZimaSearchResult {
  const { lng, lat } = jitterCoordinates(coordinates, user._id);
  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    location: user.location ?? "",
    lng,
    lat,
    skills: uniqueLabels([...(user.archetypes ?? []), ...(user.skills ?? [])]),
    interests: user.interests ?? [],
  };
}

/**
 * Every onboarded Hopamine user the globe can place. Built-in cities resolve
 * immediately; other places wait on a cached geocode. Public on purpose: the
 * landing globe is visible before sign-in, and these are the same fields as a
 * public profile plus a point.
 */
export const profiles = query({
  args: {},
  returns: v.object({
    profiles: v.array(zimaSearchResultValidator),
    pendingLocations: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const users = await listOnboardedUsers(ctx);
    const points = await cachedPointsForLocations(
      ctx,
      users.flatMap((user) => {
        const location = user.location?.trim();
        return location ? [location] : [];
      }),
    );

    const profiles: ZimaSearchResult[] = [];
    const pending = new Set<string>();

    for (const user of users) {
      const location = user.location?.trim();
      if (!location) continue;
      const coordinates = coordinatesForUser(
        location,
        points.get(locationPointKey(location)),
      );
      if (coordinates === "pending") {
        pending.add(location);
        continue;
      }
      if (!coordinates) continue;
      profiles.push(toGlobeProfile(user, coordinates));
    }

    return {
      profiles,
      pendingLocations: [...pending].slice(0, GEOCODE_BATCH),
    };
  },
});

export const getLocationPoint = internalQuery({
  args: { key: v.string() },
  returns: v.union(
    v.object({
      lng: v.optional(v.number()),
      lat: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("locationPoints")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (!row) return null;
    return { lng: row.lng, lat: row.lat };
  },
});

export const saveLocationPoint = internalMutation({
  args: {
    key: v.string(),
    lng: v.optional(v.number()),
    lat: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("locationPoints")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (existing) return null;

    const hasPoint = args.lng !== undefined && args.lat !== undefined;
    await ctx.db.insert("locationPoints", {
      key: args.key,
      ...(hasPoint ? { lng: args.lng, lat: args.lat } : {}),
    });
    return null;
  },
});

type GeocodeHit = { lng: number; lat: number };

function readGeocodeHit(body: unknown): GeocodeHit | null {
  if (typeof body !== "object" || body === null || !("results" in body)) {
    return null;
  }
  const results = body.results;
  if (!Array.isArray(results) || results.length === 0) return null;
  const first: unknown = results[0];
  if (typeof first !== "object" || first === null) return null;
  if (!("latitude" in first) || !("longitude" in first)) return null;
  const { latitude, longitude } = first;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { lng: longitude, lat: latitude };
}

async function geocodePlace(location: string): Promise<GeocodeHit | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", location);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding failed (${response.status})`);
  }
  return readGeocodeHit(await response.json());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Fills the coordinate cache for profile locations the built-in city list does not know. */
export const geocodeMissing = action({
  args: { locations: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const locations = [
      ...new Set(
        args.locations
          .map((location) => location.trim())
          .filter((location) => location.length > 1 && location.length <= 80),
      ),
    ].slice(0, GEOCODE_BATCH);

    for (const location of locations) {
      if (coordinatesForSearchLocation(location)) continue;
      const key = locationPointKey(location);
      const existing = await ctx.runQuery(internal.zimaGlobe.getLocationPoint, {
        key,
      });
      if (existing) continue;

      let hit: GeocodeHit | null = null;
      try {
        hit = await geocodePlace(location);
      } catch (error) {
        console.error("Zima globe geocode failed", location, error);
        continue;
      }

      await ctx.runMutation(internal.zimaGlobe.saveLocationPoint, {
        key,
        ...(hit ? { lng: hit.lng, lat: hit.lat } : {}),
      });
      await sleep(120);
    }

    return null;
  },
});
