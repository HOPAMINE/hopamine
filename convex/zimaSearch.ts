import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalQuery, type QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./lib/currentUser";
import { jitterCoordinates } from "../shared/nycLocationCoordinates";
import {
  coordinatesForSearchLocation,
  searchCityIdForLocation,
  type ZimaSearchCityId,
} from "../shared/zimaSearchCities";
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
