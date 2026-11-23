import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalQuery, query, type QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./lib/currentUser";
import { jitterCoordinates, type LngLat } from "../shared/nycLocationCoordinates";
import {
  coordinatesForSearchLocation,
  searchCityIdForLocation,
  type ZimaSearchCityId,
} from "../shared/zimaSearchCities";
import {
  isExactUsernameQuery,
  normalizeUsernameQuery,
  usernamePrefixEnd,
  usernamePrefixStart,
} from "../shared/usernameQuery";
import { hasAnyMatchingTag } from "../shared/zimaVocabulary";

const zimaSearchCityId = v.union(
  v.literal("new-york-city"),
  v.literal("paris"),
  v.literal("sydney"),
  v.literal("bangalore"),
  v.literal("london"),
  v.literal("montreal"),
);

export const zimaSearchArgs = {
  text: v.string(),
  archetypes: v.array(v.string()),
  interests: v.array(v.string()),
  activeOnly: v.boolean(),
  city: zimaSearchCityId,
};

export const zimaSearchResultValidator = v.object({
  _id: v.id("users"),
  name: v.string(),
  username: v.optional(v.string()),
  avatarUrl: v.string(),
  bio: v.optional(v.string()),
  location: v.string(),
  lng: v.number(),
  lat: v.number(),
  skills: v.array(v.string()),
  interests: v.array(v.string()),
  lastSeenAt: v.optional(v.number()),
});

export type ZimaSearchArgs = {
  text: string;
  archetypes: string[];
  interests: string[];
  activeOnly: boolean;
  city: ZimaSearchCityId;
};

export type ZimaSearchResult = {
  _id: Id<"users">;
  name: string;
  username?: string;
  avatarUrl: string;
  bio?: string;
  location: string;
  lng: number;
  lat: number;
  skills: string[];
  interests: string[];
  lastSeenAt?: number;
};

/** The model reads every candidate, so this bounds prompt size and cost as the table grows. */
export const MAX_CANDIDATES = 300;
/** "Active" is a search filter, not the 15-minute online dot, so a week keeps it useful for a small community. */
const ACTIVE_RECENTLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function toSearchResult(
  user: Doc<"users">,
  lastSeenAt: number | undefined,
): ZimaSearchResult | null {
  const coordinates = coordinatesForSearchLocation(user.location);
  if (!coordinates || !user.location) return null;
  const { lng, lat } = jitterCoordinates(coordinates, user._id);
  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    location: user.location,
    lng,
    lat,
    skills: uniqueLabels([...(user.archetypes ?? []), ...(user.skills ?? [])]),
    interests: user.interests ?? [],
    lastSeenAt,
  };
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

async function loadLastSeenAt(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<number | undefined> {
  const presence = await ctx.db
    .query("presence")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  return presence?.lastSeenAt;
}

/**
 * The newest onboarded users in the selected city, other than the caller,
 * narrowed by the chip filters. Ordering is newest account first; ranking
 * is the model's job.
 */
export const candidates = internalQuery({
  args: zimaSearchArgs,
  returns: v.array(zimaSearchResultValidator),
  handler: async (ctx, args): Promise<ZimaSearchResult[]> => {
    const currentUser = await getCurrentUser(ctx);
    const users = await ctx.db
      .query("users")
      .withIndex("by_onboarding_completed_at", (q) => q.gt("onboardingCompletedAt", 0))
      .order("desc")
      .take(MAX_CANDIDATES);

    const tagFiltered = users.filter((user) => {
      if (currentUser && user._id === currentUser._id) return false;
      const savedArchetypes = [...(user.archetypes ?? []), ...(user.skills ?? [])];
      if (searchCityIdForLocation(user.location) !== args.city) return false;
      if (!hasAnyMatchingTag(savedArchetypes, args.archetypes)) return false;
      return hasAnyMatchingTag(user.interests ?? [], args.interests);
    });

    const results = await Promise.all(
      tagFiltered.map(async (user) => {
        const lastSeenAt = await loadLastSeenAt(ctx, user._id);
        return toSearchResult(user, lastSeenAt);
      }),
    );

    const activeSince = Date.now() - ACTIVE_RECENTLY_WINDOW_MS;
    return results.filter((result): result is ZimaSearchResult => {
      if (!result) return false;
      if (!args.activeOnly) return true;
      return result.lastSeenAt !== undefined && result.lastSeenAt >= activeSince;
    });
  },
});

const usernameSuggestionValidator = v.object({
  _id: v.id("users"),
  name: v.string(),
  username: v.string(),
  avatarUrl: v.string(),
  location: v.optional(v.string()),
});

const usernameHitValidator = v.object({
  result: zimaSearchResultValidator,
  mapped: v.boolean(),
});

function locationPointKey(location: string): string {
  return location
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function coordinatesForUser(
  ctx: QueryCtx,
  user: Doc<"users">,
): Promise<LngLat | null> {
  const location = user.location?.trim();
  if (!location) return null;
  const known = coordinatesForSearchLocation(location);
  if (known) return jitterCoordinates(known, user._id);
  const cached = await ctx.db
    .query("locationPoints")
    .withIndex("by_key", (q) => q.eq("key", locationPointKey(location)))
    .unique();
  if (cached?.lng === undefined || cached.lat === undefined) return null;
  return jitterCoordinates({ lng: cached.lng, lat: cached.lat }, user._id);
}

function usernameResult(
  user: Doc<"users">,
  coordinates: LngLat | null,
  lastSeenAt: number | undefined,
): { result: ZimaSearchResult; mapped: boolean } {
  const placed = coordinates ?? { lng: 0, lat: 0 };
  return {
    mapped: coordinates !== null,
    result: {
      _id: user._id,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location?.trim() || "Unknown",
      lng: placed.lng,
      lat: placed.lat,
      skills: uniqueLabels([...(user.archetypes ?? []), ...(user.skills ?? [])]),
      interests: user.interests ?? [],
      lastSeenAt,
    },
  };
}

/** Prefix matches for the search-bar username dropdown. Public, same as the globe directory. */
export const suggestUsernames = query({
  args: { prefix: v.string() },
  returns: v.array(usernameSuggestionValidator),
  handler: async (ctx, args) => {
    const prefix = usernamePrefixStart(args.prefix);
    if (!prefix) return [];

    const users = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.gte("username", prefix).lt("username", usernamePrefixEnd(prefix)),
      )
      .take(24);

    return users
      .filter((user) => user.username && user.onboardingCompletedAt)
      .slice(0, 6)
      .map((user) => ({
        _id: user._id,
        name: user.name,
        username: user.username!,
        avatarUrl: user.avatarUrl,
        location: user.location,
      }));
  },
});

/** One onboarded builder, matched on the full username. */
export const byExactUsername = query({
  args: { username: v.string() },
  returns: v.union(usernameHitValidator, v.null()),
  handler: async (ctx, args) => {
    if (!isExactUsernameQuery(args.username)) return null;
    const username = normalizeUsernameQuery(args.username);
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!user?.username || !user.onboardingCompletedAt) return null;
    const [coordinates, lastSeenAt] = await Promise.all([
      coordinatesForUser(ctx, user),
      loadLastSeenAt(ctx, user._id),
    ]);
    return usernameResult(user, coordinates, lastSeenAt);
  },
});
