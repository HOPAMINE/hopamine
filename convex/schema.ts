import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { badgeKindValidator } from "./lib/badgeKinds";
import { projectFieldValidator } from "./lib/projectFields";

const availabilitySlot = v.object({
  day: v.number(),
  period: v.number(),
});

const projectMemberRoleValidator = v.union(v.literal("owner"), v.literal("member"));

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    username: v.optional(v.string()),
    avatarUrl: v.string(),
    avatarStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    bio: v.optional(v.string()),
    website: v.optional(v.string()),
    buttonColor: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    location: v.optional(v.string()),
    timezone: v.optional(v.string()),
    archetypes: v.optional(v.array(v.string())),
    skills: v.optional(v.array(v.string())),
    interests: v.optional(v.array(v.string())),
    vision: v.optional(v.string()),
    why: v.optional(v.string()),
    learning: v.optional(v.string()),
    availability: v.optional(v.array(availabilitySlot)),
    nowPlaying: v.optional(v.string()),
    lastSeenAt: v.optional(v.number()),
    onboardingCompletedAt: v.optional(v.number()),
    zimaOnboardingCompletedAt: v.optional(v.number()),
    /** Preferred email for reaching the user (may differ from auth email). */
    contactEmail: v.optional(v.string()),
    /** When true, claimed hackathon project card is hidden on the user's dashboard. */
    hiddenClaimedHackathonProjectOnDashboard: v.optional(v.boolean()),
    socialLinks: v.optional(v.record(v.string(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_onboarding_completed_at", ["onboardingCompletedAt"]),

  /** Geocodes for profile locations outside the built-in city list. A row with no coordinates is a recorded miss. */
  locationPoints: defineTable({
    key: v.string(),
    lng: v.optional(v.number()),
    lat: v.optional(v.number()),
  }).index("by_key", ["key"]),

  projects: defineTable({
    userId: v.id("users"),
    field: projectFieldValidator,
    title: v.string(),
    blurb: v.string(),
    liveUrl: v.optional(v.string()),
    demoUrl: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
    joinCode: v.optional(v.string()),
    /** Index into shared/hackathonProjects.ts for directory-seeded projects. */
    hackathonIndex: v.optional(v.number()),
    builderName: v.optional(v.string()),
    builderDiscord: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_join_code", ["joinCode"])
    .index("by_hackathon_index", ["hackathonIndex"]),

  projectMembers: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    role: projectMemberRoleValidator,
    addedAt: v.number(),
    /** When set, this project is hidden from the member's dashboard view only. */
    hiddenOnDashboardAt: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_project_and_user", ["projectId", "userId"]),

  projectInvites: defineTable({
    projectId: v.id("projects"),
    invitedUserId: v.id("users"),
    invitedByUserId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_invited_user_and_status", ["invitedUserId", "status"])
    .index("by_project", ["projectId"])
    .index("by_project_and_invited_user", ["projectId", "invitedUserId"]),

  projectJoinRequests: defineTable({
    projectId: v.id("projects"),
    requesterUserId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_requester", ["requesterUserId"])
    .index("by_project", ["projectId"])
    .index("by_project_and_requester", ["projectId", "requesterUserId"])
    .index("by_project_and_status", ["projectId", "status"]),

  hackathonClaims: defineTable({
    userId: v.id("users"),
    projectIndex: v.number(),
    projectTitle: v.string(),
    builderName: v.string(),
    field: projectFieldValidator,
    blurb: v.string(),
    claimedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project_index", ["projectIndex"])
    .index("by_user_and_project_index", ["userId", "projectIndex"]),

  hackathonParticipations: defineTable({
    userId: v.id("users"),
    builderNumber: v.number(),
    claimedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_builder_number", ["builderNumber"]),

  badges: defineTable({
    userId: v.id("users"),
    kind: badgeKindValidator,
    earnedAt: v.number(),
    hackathonId: v.optional(v.string()),
    hackathonParticipationId: v.optional(v.id("hackathonParticipations")),
    hackathonClaimId: v.optional(v.id("hackathonClaims")),
    projectId: v.optional(v.id("projects")),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_kind", ["userId", "kind"])
    .index("by_hackathon_participation", ["hackathonParticipationId"]),

  presence: defineTable({
    userId: v.id("users"),
    lastSeenAt: v.optional(v.number()),
    /** Previous presence model. Cleared by migrateLegacyPresence. */
    isOnline: v.optional(v.boolean()),
    updatedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  conversations: defineTable({
    kind: v.literal("direct"),
    /** Sorted pair of participant user ids, so get-or-create is idempotent. */
    directKey: v.string(),
    lastMessageAt: v.number(),
    lastMessagePreview: v.string(),
    lastMessageSenderId: v.optional(v.id("users")),
    createdAt: v.number(),
  }).index("by_direct_key", ["directKey"]),

  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    /** Watermark: createdAt of the newest message this member has read. */
    lastReadAt: v.number(),
    unreadCount: v.number(),
    /** Copy of conversations.lastMessageAt so the inbox sorts on one index. */
    lastMessageAt: v.number(),
  })
    .index("by_user_and_last_message_at", ["userId", "lastMessageAt"])
    .index("by_conversation_and_user", ["conversationId", "userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),
});
