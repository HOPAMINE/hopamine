import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { generateUniqueUsername, resolveUsernameForUser } from "./lib/usernames";

function trimText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(String).join(", ").trim();
  if (value == null) return "";
  return String(value).trim();
}

function normalizeSkills(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    const items = value.map((item) => trimText(item)).filter(Boolean);
    return items.length > 0 ? items : undefined;
  }
  const text = trimText(value);
  if (!text) return undefined;
  return text
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export const getOrCreate = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.string(),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.clerkId) {
      throw new Error("Unauthorized");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      return existingUser._id;
    }

    let finalUsername = args.username?.trim().toLowerCase() || undefined;
    if (finalUsername) {
      const existingUsername = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", finalUsername))
        .unique();

      if (existingUsername) {
        finalUsername = undefined;
      }
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      username: finalUsername,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    username: v.optional(v.string()),
    website: v.optional(v.string()),
    buttonColor: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    location: v.optional(v.string()),
    archetypes: v.optional(v.array(v.string())),
    skills: v.optional(v.array(v.string())),
    interests: v.optional(v.array(v.string())),
    vision: v.optional(v.string()),
    why: v.optional(v.string()),
    learning: v.optional(v.string()),
    discord: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    let normalizedUsername: string | undefined;
    if (args.username !== undefined && trimText(args.username) !== "") {
      normalizedUsername = trimText(args.username).toLowerCase();
      const currentUsernameLower = (user.username ?? "").toLowerCase();

      if (normalizedUsername !== currentUsernameLower) {
        const existingUser = await ctx.db
          .query("users")
          .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
          .unique();

        if (existingUser && existingUser._id !== user._id) {
          throw new Error("Username already taken");
        }
      }
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.bio !== undefined) {
      updates.bio = trimText(args.bio) || undefined;
    }

    if (args.username !== undefined) {
      updates.username = normalizedUsername ?? (trimText(args.username) || undefined);
    }

    if (args.website !== undefined) {
      let website = trimText(args.website) || undefined;
      if (website && !website.startsWith("http://") && !website.startsWith("https://")) {
        website = "https://" + website;
      }
      updates.website = website;
    }

    if (args.buttonColor !== undefined) {
      const color = trimText(args.buttonColor);
      if (color === "" || /^#[0-9A-Fa-f]{6}$/.test(color)) {
        updates.buttonColor = color || undefined;
      } else {
        throw new Error("Invalid color format. Use hex format (e.g., #FF1A00)");
      }
    }

    if (args.storageId !== undefined) {
      const imageUrl = await ctx.storage.getUrl(args.storageId);
      updates.avatarUrl = imageUrl || "";
      updates.avatarStorageId = args.storageId;
    }

    if (args.location !== undefined) {
      updates.location = trimText(args.location) || undefined;
    }

    if (args.archetypes !== undefined) {
      updates.archetypes = args.archetypes;
    }

    if (args.skills !== undefined) {
      updates.skills = normalizeSkills(args.skills);
    }

    if (args.interests !== undefined) {
      updates.interests = normalizeSkills(args.interests);
    }

    if (args.vision !== undefined) {
      updates.vision = trimText(args.vision) || undefined;
    }

    if (args.why !== undefined) {
      updates.why = trimText(args.why) || undefined;
    }

    if (args.learning !== undefined) {
      updates.learning = trimText(args.learning) || undefined;
    }
    if (args.discord !== undefined) {
      const discord = args.discord.trim().replace(/^@/, "");
      if (discord && !/^[a-zA-Z0-9_.]{2,32}(#\d{4})?$/.test(discord)) {
        throw new Error("Invalid Discord username");
      }
      const existing = user.socialLinks ?? {};
      updates.socialLinks = discord ? { ...existing, discord } : (() => {
        const { discord: _removed, ...rest } = existing;
        return Object.keys(rest).length > 0 ? rest : undefined;
      })();
    }

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

export const updateProfilePicture = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.avatarStorageId) {
      await ctx.storage.delete(user.avatarStorageId);
    }

    const imageUrl = await ctx.storage.getUrl(args.storageId);

    await ctx.db.patch(user._id, {
      avatarUrl: imageUrl || "",
      avatarStorageId: args.storageId,
      updatedAt: Date.now(),
    });

    return { success: true, imageUrl };
  },
});

export const completeOnboarding = mutation({
  args: {
    name: v.string(),
    username: v.optional(v.string()),
    location: v.string(),
    bio: v.optional(v.string()),
    skills: v.array(v.string()),
    vision: v.string(),
    why: v.string(),
    learning: v.optional(v.string()),
    discord: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    alreadyCompleted: v.boolean(),
    username: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const username = await resolveUsernameForUser(ctx, user, args.username);

    // Idempotent — don't overwrite answers if already completed
    if (user.onboardingCompletedAt) {
      if (!user.username?.trim()) {
        await ctx.db.patch(user._id, {
          username,
          updatedAt: Date.now(),
        });
      }
      return {
        success: true,
        alreadyCompleted: true,
        username: user.username?.trim() ? user.username : username,
      };
    }

    const discord = (args.discord?.trim() ?? "").replace(/^@/, "");
    if (discord && !/^[a-zA-Z0-9_.]{2,32}(#\d{4})?$/.test(discord)) {
      throw new Error("Invalid Discord username");
    }
    const socialLinks = discord ? { discord } : undefined;

    await ctx.db.patch(user._id, {
      name: args.name.trim(),
      username,
      location: args.location.trim(),
      bio: trimText(args.bio) || undefined,
      skills: normalizeSkills(args.skills),
      vision: args.vision.trim(),
      why: args.why.trim(),
      learning: args.learning?.trim() || undefined,
      ...(socialLinks !== undefined ? { socialLinks } : {}),
      onboardingCompletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, alreadyCompleted: false, username };
  },
});

/** Zima profile onboarding — separate from Hopamine network onboarding. */
export const completeZimaOnboarding = mutation({
  args: {
    name: v.string(),
    username: v.optional(v.string()),
    location: v.string(),
    bio: v.optional(v.string()),
    nowPlaying: v.optional(v.string()),
    skills: v.array(v.string()),
    interests: v.optional(v.array(v.string())),
    contactEmail: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    alreadyCompleted: v.boolean(),
    username: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const username = await resolveUsernameForUser(ctx, user, args.username);

    if (user.zimaOnboardingCompletedAt) {
      if (!user.username?.trim()) {
        await ctx.db.patch(user._id, {
          username,
          updatedAt: Date.now(),
        });
      }
      return {
        success: true,
        alreadyCompleted: true,
        username: user.username?.trim() ? user.username : username,
      };
    }

    const contactEmail = args.contactEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      throw new Error("Enter a valid email address");
    }

    const now = Date.now();
    const patch: Record<string, unknown> = {
      name: args.name.trim(),
      username,
      location: args.location.trim(),
      bio: trimText(args.bio) || undefined,
      nowPlaying: trimText(args.nowPlaying) || undefined,
      skills: normalizeSkills(args.skills),
      archetypes: normalizeSkills(args.skills),
      ...(args.interests !== undefined
        ? { interests: normalizeSkills(args.interests) }
        : {}),
      contactEmail,
      zimaOnboardingCompletedAt: now,
      updatedAt: now,
    };
    if (!user.onboardingCompletedAt) {
      patch.onboardingCompletedAt = now;
    }

    await ctx.db.patch(user._id, patch);

    return { success: true, alreadyCompleted: false, username };
  },
});

/** Assigns a unique Hopamine username when the user does not have one yet. */
export const ensureUsername = mutation({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    if (user.username?.trim()) {
      return user.username;
    }

    const username = await generateUniqueUsername(ctx, {
      name: user.name,
      email: user.email,
      userId: user._id,
    });

    await ctx.db.patch(user._id, {
      username,
      updatedAt: Date.now(),
    });

    return username;
  },
});

/** Lists users who still need an auto-generated username. */
export const listUserIdsMissingUsername = internalQuery({
  args: {},
  returns: v.array(v.id("users")),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.filter((user) => !user.username?.trim()).map((user) => user._id);
  },
});

/** Assigns a generated username to one user (safe for concurrent lastSeen updates). */
export const assignGeneratedUsernameForUser = internalMutation({
  args: { userId: v.id("users") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      return null;
    }

    if (user.username?.trim()) {
      return user.username;
    }

    const username = await generateUniqueUsername(ctx, {
      name: user.name,
      email: user.email,
      userId: user._id,
    });

    await ctx.db.patch(user._id, {
      username,
      updatedAt: Date.now(),
    });

    return username;
  },
});

/** Backfills usernames one user at a time to avoid OCC conflicts on the users table. */
export const backfillMissingUsernames = internalAction({
  args: {},
  returns: v.object({
    updated: v.number(),
    attempted: v.number(),
  }),
  handler: async (ctx) => {
    const userIds: Id<"users">[] = await ctx.runQuery(
      internal.users.listUserIdsMissingUsername,
      {},
    );

    let updated = 0;
    for (const userId of userIds) {
      const username: string | null = await ctx.runMutation(
        internal.users.assignGeneratedUsernameForUser,
        { userId },
      );
      if (username) {
        updated += 1;
      }
    }

    return { updated, attempted: userIds.length };
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    if (user.avatarStorageId) {
      await ctx.storage.delete(user.avatarStorageId);
    }

    await ctx.db.delete(user._id);

    return { success: true };
  },
});

export const updateAvailability = mutation({
  args: {
    availability: v.array(v.object({ day: v.number(), period: v.number() })),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { availability: args.availability, timezone: args.timezone });
  },
});

export const updateNowPlaying = mutation({
  args: { nowPlaying: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { nowPlaying: args.nowPlaying });
  },
});

export const listBuilders = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      username: v.optional(v.string()),
      avatarUrl: v.string(),
      bio: v.optional(v.string()),
      skills: v.optional(v.array(v.string())),
      interests: v.optional(v.array(v.string())),
    }),
  ),
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_onboarding_completed_at", (q) => q.gt("onboardingCompletedAt", 0))
      .order("desc")
      .take(100);

    return users.map((user) => ({
      _id: user._id,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      skills: user.skills,
      interests: user.interests,
    }));
  },
});

export const generateImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// One-time migration: convert legacy string skills to string[].
// Run once via the Convex dashboard or `npx convex run users:migrateSkillsToArray`.
export const migrateSkillsToArray = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let migrated = 0;
    for (const user of users) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (user.skills as any) === "string") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const skills = (user.skills as any as string)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
        await ctx.db.patch(user._id, { skills });
        migrated++;
      }
    }
    return { migrated };
  },
});

const publicProfileValidator = v.object({
  _id: v.id("users"),
  name: v.string(),
  username: v.optional(v.string()),
  avatarUrl: v.string(),
  bio: v.optional(v.string()),
  location: v.optional(v.string()),
  skills: v.optional(v.array(v.string())),
  interests: v.optional(v.array(v.string())),
  vision: v.optional(v.string()),
  learning: v.optional(v.string()),
  socialLinks: v.optional(v.record(v.string(), v.string())),
});

function toPublicProfile(user: {
  _id: Id<"users">;
  name: string;
  username?: string;
  avatarUrl: string;
  bio?: string;
  location?: string;
  skills?: string[];
  interests?: string[];
  vision?: string;
  learning?: string;
  socialLinks?: Record<string, string>;
  onboardingCompletedAt?: number;
}) {
  if (!user.onboardingCompletedAt) {
    return null;
  }

  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    location: user.location,
    skills: user.skills,
    interests: user.interests,
    vision: user.vision,
    learning: user.learning,
    socialLinks: user.socialLinks,
  };
}

export const getPublicProfileByUsername = query({
  args: { username: v.string() },
  returns: v.union(publicProfileValidator, v.null()),
  handler: async (ctx, args) => {
    const username = args.username.trim().toLowerCase();
    if (!username) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (!user?.username) {
      return null;
    }

    return toPublicProfile(user);
  },
});

export const getPublicProfileByUserId = query({
  args: { userId: v.id("users") },
  returns: v.union(publicProfileValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      return null;
    }

    return toPublicProfile(user);
  },
});

const publicBadgeValidator = v.object({
  name: v.string(),
  username: v.string(),
  builderNumber: v.optional(v.number()),
  projectTitle: v.optional(v.string()),
  projectBlurb: v.optional(v.string()),
});

export const getPublicBadgeByUsername = query({
  args: { username: v.string() },
  returns: v.union(publicBadgeValidator, v.null()),
  handler: async (ctx, args) => {
    const username = args.username.trim().toLowerCase();
    if (!username) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (!user?.username) {
      return null;
    }

    const participation = await ctx.db
      .query("hackathonParticipations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const projectClaim = await ctx.db
      .query("hackathonClaims")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    return {
      name: user.name,
      username: user.username,
      builderNumber: participation?.builderNumber,
      projectTitle: projectClaim?.projectTitle,
      projectBlurb: projectClaim?.blurb,
    };
  },
});

export const hideClaimedHackathonProjectFromDashboard = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      hiddenClaimedHackathonProjectOnDashboard: true,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const showClaimedHackathonProjectOnDashboard = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.hiddenClaimedHackathonProjectOnDashboard) {
      return null;
    }

    await ctx.db.patch(user._id, {
      hiddenClaimedHackathonProjectOnDashboard: undefined,
      updatedAt: Date.now(),
    });

    return null;
  },
});

const onboardingBackfillEntryValidator = v.object({
  userId: v.id("users"),
  name: v.string(),
  location: v.string(),
  bio: v.optional(v.string()),
  skills: v.array(v.string()),
  vision: v.string(),
  why: v.string(),
  learning: v.optional(v.string()),
  discord: v.optional(v.string()),
});

/**
 * Merge a duplicate users row into the keep row: reassign FKs, then delete the duplicate.
 * Intended for prod cutover cleanup when the same email/clerkId had two Convex rows.
 */
export const mergeDuplicateUser = internalMutation({
  args: {
    keepUserId: v.id("users"),
    dropUserId: v.id("users"),
  },
  returns: v.object({
    keepUserId: v.id("users"),
    dropUserId: v.id("users"),
    reassigned: v.object({
      projects: v.number(),
      projectMembers: v.number(),
      projectInvitesInvited: v.number(),
      projectInvitesInvitedBy: v.number(),
      projectJoinRequests: v.number(),
      hackathonClaims: v.number(),
      hackathonParticipations: v.number(),
      badges: v.number(),
    }),
    deleted: v.object({
      presence: v.number(),
      duplicateProjectMembers: v.number(),
      dropUser: v.boolean(),
    }),
  }),
  handler: async (ctx, args) => {
    if (args.keepUserId === args.dropUserId) {
      throw new Error("keepUserId and dropUserId must differ");
    }

    const keep = await ctx.db.get("users", args.keepUserId);
    const drop = await ctx.db.get("users", args.dropUserId);
    if (!keep) throw new Error("keep user not found");
    if (!drop) throw new Error("drop user not found");
    if (!keep.onboardingCompletedAt) {
      throw new Error("keep user must be onboarded");
    }
    if (drop.onboardingCompletedAt) {
      throw new Error("drop user is onboarded — refusing to merge");
    }
    if ((keep.email || "").toLowerCase() !== (drop.email || "").toLowerCase()) {
      throw new Error("emails do not match");
    }

    const reassigned = {
      projects: 0,
      projectMembers: 0,
      projectInvitesInvited: 0,
      projectInvitesInvitedBy: 0,
      projectJoinRequests: 0,
      hackathonClaims: 0,
      hackathonParticipations: 0,
      badges: 0,
    };
    const deleted = {
      presence: 0,
      duplicateProjectMembers: 0,
      dropUser: false,
    };

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.dropUserId))
      .collect();
    for (const project of projects) {
      await ctx.db.patch(project._id, { userId: args.keepUserId });
      reassigned.projects += 1;
    }

    const dropMembers = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.dropUserId))
      .collect();
    for (const member of dropMembers) {
      const existing = await ctx.db
        .query("projectMembers")
        .withIndex("by_project_and_user", (q) =>
          q.eq("projectId", member.projectId).eq("userId", args.keepUserId),
        )
        .unique();
      if (existing) {
        await ctx.db.delete(member._id);
        deleted.duplicateProjectMembers += 1;
      } else {
        await ctx.db.patch(member._id, { userId: args.keepUserId });
        reassigned.projectMembers += 1;
      }
    }

    const invitesAsInvitee = await ctx.db
      .query("projectInvites")
      .withIndex("by_invited_user_and_status", (q) =>
        q.eq("invitedUserId", args.dropUserId),
      )
      .collect();
    for (const invite of invitesAsInvitee) {
      await ctx.db.patch(invite._id, { invitedUserId: args.keepUserId });
      reassigned.projectInvitesInvited += 1;
    }

    // invitedByUserId has no dedicated index — scan invitees of keep/drop projects is heavy;
    // full-table scan is OK at ~100 users for a one-off merge.
    const allInvites = await ctx.db.query("projectInvites").collect();
    for (const invite of allInvites) {
      if (invite.invitedByUserId === args.dropUserId) {
        await ctx.db.patch(invite._id, { invitedByUserId: args.keepUserId });
        reassigned.projectInvitesInvitedBy += 1;
      }
    }

    const joinRequests = await ctx.db
      .query("projectJoinRequests")
      .withIndex("by_requester", (q) => q.eq("requesterUserId", args.dropUserId))
      .collect();
    for (const request of joinRequests) {
      await ctx.db.patch(request._id, { requesterUserId: args.keepUserId });
      reassigned.projectJoinRequests += 1;
    }

    const claims = await ctx.db
      .query("hackathonClaims")
      .withIndex("by_user", (q) => q.eq("userId", args.dropUserId))
      .collect();
    for (const claim of claims) {
      await ctx.db.patch(claim._id, { userId: args.keepUserId });
      reassigned.hackathonClaims += 1;
    }

    const participations = await ctx.db
      .query("hackathonParticipations")
      .withIndex("by_user", (q) => q.eq("userId", args.dropUserId))
      .collect();
    for (const participation of participations) {
      await ctx.db.patch(participation._id, { userId: args.keepUserId });
      reassigned.hackathonParticipations += 1;
    }

    const badges = await ctx.db
      .query("badges")
      .withIndex("by_user", (q) => q.eq("userId", args.dropUserId))
      .collect();
    for (const badge of badges) {
      await ctx.db.patch(badge._id, { userId: args.keepUserId });
      reassigned.badges += 1;
    }

    const presenceRows = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", args.dropUserId))
      .collect();
    for (const row of presenceRows) {
      await ctx.db.delete(row._id);
      deleted.presence += 1;
    }

    await ctx.db.delete(args.dropUserId);
    deleted.dropUser = true;

    return {
      keepUserId: args.keepUserId,
      dropUserId: args.dropUserId,
      reassigned,
      deleted,
    };
  },
});

/** One-off recovery for onboarding submissions rejected before bio was in the validator. */
export const backfillFailedOnboarding = internalMutation({
  args: {
    entries: v.array(onboardingBackfillEntryValidator),
  },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      status: v.union(v.literal("applied"), v.literal("skipped"), v.literal("not_found")),
    }),
  ),
  handler: async (ctx, args) => {
    const results: Array<{
      userId: Id<"users">;
      status: "applied" | "skipped" | "not_found";
    }> = [];

    for (const entry of args.entries) {
      const user = await ctx.db.get("users", entry.userId);

      if (!user) {
        results.push({ userId: entry.userId, status: "not_found" });
        continue;
      }

      if (user.onboardingCompletedAt) {
        results.push({ userId: entry.userId, status: "skipped" });
        continue;
      }

      const discord = (entry.discord?.trim() ?? "").replace(/^@/, "");
      const socialLinks = discord ? { discord } : undefined;
      const username = await resolveUsernameForUser(ctx, user, undefined);

      await ctx.db.patch(entry.userId, {
        name: entry.name.trim(),
        username,
        location: entry.location.trim(),
        bio: trimText(entry.bio) || undefined,
        skills: normalizeSkills(entry.skills),
        vision: entry.vision.trim(),
        why: entry.why.trim(),
        learning: entry.learning?.trim() || undefined,
        ...(socialLinks !== undefined ? { socialLinks } : {}),
        onboardingCompletedAt: Date.now(),
        updatedAt: Date.now(),
      });

      results.push({ userId: entry.userId, status: "applied" });
    }

    return results;
  },
});
