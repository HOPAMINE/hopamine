import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { projectFieldValidator } from "./lib/projectFields";
import { normalizeOptionalProjectUrl } from "./lib/projectUrls";
import { generateUniqueJoinCode, normalizeJoinCode } from "./lib/projectJoinCode";
import { isHackathonDirectoryProject } from "./lib/seedHackathonDirectory";
import { HACKATHON_PROJECT_COUNT } from "./lib/hackathonProjectCount";
import { hackathonIndicesMatchingPrefix } from "../shared/projectPrefixSearch";
import { Doc, Id } from "./_generated/dataModel";

const projectMemberSummaryValidator = v.object({
  userId: v.id("users"),
  name: v.string(),
  username: v.optional(v.string()),
  avatarUrl: v.string(),
  role: v.union(v.literal("owner"), v.literal("member")),
});

const hackathonDirectoryProjectValidator = v.object({
  _id: v.id("projects"),
  hackathonIndex: v.number(),
  field: projectFieldValidator,
  title: v.string(),
  builder: v.string(),
  discord: v.optional(v.string()),
  blurb: v.string(),
  liveUrl: v.optional(v.string()),
  demoUrl: v.optional(v.string()),
  repoUrl: v.optional(v.string()),
});

const projectWithMembersValidator = v.object({
  _id: v.id("projects"),
  _creationTime: v.number(),
  userId: v.id("users"),
  field: projectFieldValidator,
  title: v.string(),
  blurb: v.string(),
  location: v.optional(v.string()),
  liveUrl: v.optional(v.string()),
  demoUrl: v.optional(v.string()),
  repoUrl: v.optional(v.string()),
  joinCode: v.optional(v.string()),
  lookingForContributors: v.optional(v.boolean()),
  lookingToHire: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.number(),
  members: v.array(projectMemberSummaryValidator),
  viewerRole: v.union(v.literal("owner"), v.literal("member"), v.null()),
  hasPendingJoinRequest: v.boolean(),
});

const collaboratorSearchResultValidator = v.object({
  _id: v.id("users"),
  name: v.string(),
  username: v.optional(v.string()),
  avatarUrl: v.string(),
});

const pendingInviteValidator = v.object({
  _id: v.id("projectInvites"),
  projectId: v.id("projects"),
  projectTitle: v.string(),
  projectBlurb: v.string(),
  field: projectFieldValidator,
  inviterName: v.string(),
  inviterAvatarUrl: v.string(),
  createdAt: v.number(),
});

const pendingJoinRequestValidator = v.object({
  _id: v.id("projectJoinRequests"),
  projectId: v.id("projects"),
  projectTitle: v.string(),
  requesterUserId: v.id("users"),
  requesterName: v.string(),
  requesterAvatarUrl: v.string(),
  createdAt: v.number(),
});

function trimText(value: string): string {
  return value.trim();
}

/** Optional city/place; empty clears. Owners set this on create/update. */
function normalizeOptionalProjectLocation(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/\s+/g, " ");
  if (!trimmed) return undefined;
  if (trimmed.length > 80) {
    throw new Error("Project location must be 80 characters or fewer");
  }
  return trimmed;
}

async function getAuthenticatedUser(ctx: MutationCtx | QueryCtx) {
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

  return user;
}

async function getProjectMembers(ctx: QueryCtx | MutationCtx, projectId: Id<"projects">) {
  const rows = await ctx.db
    .query("projectMembers")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  const members = await Promise.all(
    rows.map(async (row) => {
      const memberUser = await ctx.db.get("users", row.userId);
      if (!memberUser) return null;

      return {
        userId: memberUser._id,
        name: memberUser.name,
        username: memberUser.username,
        avatarUrl: memberUser.avatarUrl,
        role: row.role,
      };
    }),
  );

  return members
    .filter((member): member is NonNullable<typeof member> => member !== null)
    .sort((a, b) => {
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (b.role === "owner" && a.role !== "owner") return 1;
      return a.name.localeCompare(b.name);
    });
}

async function attachMembersToProject(ctx: QueryCtx, project: Doc<"projects">) {
  return {
    ...project,
    members: await getProjectMembers(ctx, project._id),
  };
}

async function getProjectMembership(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("projectMembers")
    .withIndex("by_project_and_user", (q) =>
      q.eq("projectId", projectId).eq("userId", userId),
    )
    .unique();
}

async function assertIsProjectOwner(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  userId: Id<"users">,
) {
  const membership = await getProjectMembership(ctx, projectId, userId);
  if (!membership || membership.role !== "owner") {
    throw new Error("Only project owners can perform this action");
  }
  return membership;
}

async function deleteProjectAndRelations(ctx: MutationCtx, projectId: Id<"projects">) {
  const members = await ctx.db
    .query("projectMembers")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const member of members) {
    await ctx.db.delete(member._id);
  }

  const invites = await ctx.db
    .query("projectInvites")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const invite of invites) {
    await ctx.db.delete(invite._id);
  }

  const joinRequests = await ctx.db
    .query("projectJoinRequests")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const request of joinRequests) {
    await ctx.db.delete(request._id);
  }

  await ctx.db.delete(projectId);
}

function validateProjectText(title: string, blurb: string) {
  const trimmedTitle = trimText(title);
  const trimmedBlurb = trimText(blurb);

  if (!trimmedTitle) {
    throw new Error("Project title is required");
  }

  if (trimmedTitle.length > 120) {
    throw new Error("Project title must be 120 characters or fewer");
  }

  if (!trimmedBlurb) {
    throw new Error("Project description is required");
  }

  if (trimmedBlurb.length > 500) {
    throw new Error("Project description must be 500 characters or fewer");
  }

  return { title: trimmedTitle, blurb: trimmedBlurb };
}

async function enrichProjectForViewer(
  ctx: QueryCtx,
  project: Doc<"projects">,
  viewerId: Id<"users"> | null,
) {
  const attached = await attachMembersToProject(ctx, project);
  const membership = viewerId
    ? await getProjectMembership(ctx, project._id, viewerId)
    : null;

  let hasPendingJoinRequest = false;
  if (viewerId && !membership) {
    const pendingRequest = await ctx.db
      .query("projectJoinRequests")
      .withIndex("by_project_and_requester", (q) =>
        q.eq("projectId", project._id).eq("requesterUserId", viewerId),
      )
      .unique();
    hasPendingJoinRequest = pendingRequest?.status === "pending";
  }

  const { joinCode: storedJoinCode, ...projectFields } = project;

  return {
    ...projectFields,
    members: attached.members,
    joinCode: membership?.role === "owner" ? storedJoinCode : undefined,
    viewerRole: membership?.role ?? null,
    hasPendingJoinRequest,
  };
}

async function assertCanInviteUser(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  invitedUserId: Id<"users">,
) {
  const existingMember = await ctx.db
    .query("projectMembers")
    .withIndex("by_project_and_user", (q) =>
      q.eq("projectId", projectId).eq("userId", invitedUserId),
    )
    .unique();

  if (existingMember) {
    throw new Error("This builder is already on the project");
  }

  const existingInvite = await ctx.db
    .query("projectInvites")
    .withIndex("by_project_and_invited_user", (q) =>
      q.eq("projectId", projectId).eq("invitedUserId", invitedUserId),
    )
    .unique();

  if (existingInvite?.status === "pending") {
    throw new Error("This builder already has a pending invite");
  }

  if (existingInvite?.status === "accepted") {
    throw new Error("This builder is already on the project");
  }
}

export const listMine = query({
  args: {},
  returns: v.array(projectWithMembersValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const visibleMemberships = memberships.filter((row) => row.hiddenOnDashboardAt === undefined);
    const projectIds = [...new Set(visibleMemberships.map((row) => row.projectId))];
    const projects = (
      await Promise.all(projectIds.map((projectId) => ctx.db.get("projects", projectId)))
    ).filter((project): project is NonNullable<typeof project> => project !== null);

    const enriched = await Promise.all(
      projects.map(async (project) => {
        const membership = visibleMemberships.find((row) => row.projectId === project._id);
        const base = await enrichProjectForViewer(ctx, project, user._id);
        return {
          ...base,
          viewerRole: membership?.role ?? "member",
        };
      }),
    );

    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const listForUser = query({
  args: { userId: v.id("users") },
  returns: v.array(projectWithMembersValidator),
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const projectIds = [...new Set(memberships.map((row) => row.projectId))];
    const projects = (
      await Promise.all(projectIds.map((projectId) => ctx.db.get("projects", projectId)))
    ).filter((project): project is NonNullable<typeof project> => project !== null);

    const enriched = await Promise.all(
      projects.map((project) => enrichProjectForViewer(ctx, project, null)),
    );

    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const listPendingInvites = query({
  args: {},
  returns: v.array(pendingInviteValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const invites = await ctx.db
      .query("projectInvites")
      .withIndex("by_invited_user_and_status", (q) =>
        q.eq("invitedUserId", user._id).eq("status", "pending"),
      )
      .collect();

    const enriched = await Promise.all(
      invites.map(async (invite) => {
        const project = await ctx.db.get("projects", invite.projectId);
        const inviter = await ctx.db.get("users", invite.invitedByUserId);
        if (!project || !inviter) return null;

        return {
          _id: invite._id,
          projectId: invite.projectId,
          projectTitle: project.title,
          projectBlurb: project.blurb,
          field: project.field,
          inviterName: inviter.name,
          inviterAvatarUrl: inviter.avatarUrl,
          createdAt: invite.createdAt,
        };
      }),
    );

    return enriched
      .filter((invite): invite is NonNullable<typeof invite> => invite !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const searchCollaborators = query({
  args: { query: v.string() },
  returns: v.array(collaboratorSearchResultValidator),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const search = trimText(args.query).toLowerCase();

    if (search.length < 2) {
      return [];
    }

    const users = await ctx.db.query("users").collect();

    return users
      .filter((candidate) => candidate._id !== user._id)
      .filter((candidate) => {
        const name = candidate.name.toLowerCase();
        const username = candidate.username?.toLowerCase() ?? "";
        return name.includes(search) || username.includes(search);
      })
      .slice(0, 8)
      .map((candidate) => ({
        _id: candidate._id,
        name: candidate.name,
        username: candidate.username,
        avatarUrl: candidate.avatarUrl,
      }));
  },
});

export const getUsersByIds = query({
  args: { userIds: v.array(v.id("users")) },
  returns: v.array(collaboratorSearchResultValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const users = await Promise.all(
      args.userIds.map((userId) => ctx.db.get("users", userId)),
    );

    return users
      .filter((user): user is NonNullable<typeof user> => user !== null)
      .map((user) => ({
        _id: user._id,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
      }));
  },
});

export const create = mutation({
  args: {
    field: projectFieldValidator,
    title: v.string(),
    blurb: v.string(),
    location: v.optional(v.string()),
    liveUrl: v.optional(v.string()),
    lookingForContributors: v.optional(v.boolean()),
    lookingToHire: v.optional(v.boolean()),
    inviteUserIds: v.array(v.id("users")),
  },
  returns: v.id("projects"),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const title = trimText(args.title);
    const blurb = trimText(args.blurb);

    if (!title) {
      throw new Error("Project title is required");
    }

    if (title.length > 120) {
      throw new Error("Project title must be 120 characters or fewer");
    }

    if (!blurb) {
      throw new Error("Project description is required");
    }

    if (blurb.length > 500) {
      throw new Error("Project description must be 500 characters or fewer");
    }

    const uniqueInviteIds = [...new Set(args.inviteUserIds)].filter(
      (inviteUserId) => inviteUserId !== user._id,
    );

    if (uniqueInviteIds.length > 12) {
      throw new Error("You can invite up to 12 builders");
    }

    for (const inviteUserId of uniqueInviteIds) {
      const invitee = await ctx.db.get("users", inviteUserId);
      if (!invitee) {
        throw new Error("One or more selected builders could not be found");
      }
    }

    const now = Date.now();
    const normalizedLocation = normalizeOptionalProjectLocation(args.location);
    const normalizedLiveUrl = args.liveUrl
      ? normalizeOptionalProjectUrl(args.liveUrl)
      : undefined;
    const joinCode = await generateUniqueJoinCode(ctx);
    const lookingForContributors = args.lookingForContributors === true;
    const lookingToHire = args.lookingToHire === true;

    const projectId = await ctx.db.insert("projects", {
      userId: user._id,
      field: args.field,
      title,
      blurb,
      joinCode,
      lookingForContributors,
      lookingToHire,
      ...(normalizedLocation ? { location: normalizedLocation } : {}),
      ...(normalizedLiveUrl ? { liveUrl: normalizedLiveUrl } : {}),
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("projectMembers", {
      projectId,
      userId: user._id,
      role: "owner",
      addedAt: now,
    });

    for (const inviteUserId of uniqueInviteIds) {
      await assertCanInviteUser(ctx, projectId, inviteUserId);

      const existingInvite = await ctx.db
        .query("projectInvites")
        .withIndex("by_project_and_invited_user", (q) =>
          q.eq("projectId", projectId).eq("invitedUserId", inviteUserId),
        )
        .unique();

      if (existingInvite?.status === "declined") {
        await ctx.db.patch(existingInvite._id, {
          invitedByUserId: user._id,
          status: "pending",
          createdAt: now,
          respondedAt: undefined,
        });
        continue;
      }

      await ctx.db.insert("projectInvites", {
        projectId,
        invitedUserId: inviteUserId,
        invitedByUserId: user._id,
        status: "pending",
        createdAt: now,
      });
    }

    return projectId;
  },
});

export const acceptInvite = mutation({
  args: { inviteId: v.id("projectInvites") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const invite = await ctx.db.get("projectInvites", args.inviteId);

    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.invitedUserId !== user._id) {
      throw new Error("Unauthorized");
    }

    if (invite.status !== "pending") {
      throw new Error("This invite is no longer pending");
    }

    const project = await ctx.db.get("projects", invite.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const existingMember = await ctx.db
      .query("projectMembers")
      .withIndex("by_project_and_user", (q) =>
        q.eq("projectId", invite.projectId).eq("userId", user._id),
      )
      .unique();

    const now = Date.now();

    if (!existingMember) {
      await ctx.db.insert("projectMembers", {
        projectId: invite.projectId,
        userId: user._id,
        role: "member",
        addedAt: now,
      });
    }

    await ctx.db.patch(invite._id, {
      status: "accepted",
      respondedAt: now,
    });

    await ctx.db.patch(invite.projectId, {
      updatedAt: now,
    });

    return null;
  },
});

export const declineInvite = mutation({
  args: { inviteId: v.id("projectInvites") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const invite = await ctx.db.get("projectInvites", args.inviteId);

    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.invitedUserId !== user._id) {
      throw new Error("Unauthorized");
    }

    if (invite.status !== "pending") {
      throw new Error("This invite is no longer pending");
    }

    await ctx.db.patch(invite._id, {
      status: "declined",
      respondedAt: Date.now(),
    });

    return null;
  },
});

function toHackathonDirectoryProject(project: Doc<"projects">) {
  return {
    _id: project._id,
    hackathonIndex: project.hackathonIndex!,
    field: project.field,
    title: project.title,
    builder: project.builderName ?? "Green Hackathon",
    discord: project.builderDiscord,
    blurb: project.blurb,
    liveUrl: project.liveUrl,
    demoUrl: project.demoUrl,
    repoUrl: project.repoUrl,
  };
}

async function loadHackathonDirectoryByIndices(
  ctx: QueryCtx,
  indices: readonly number[],
) {
  const projects = await Promise.all(
    indices.map((index) =>
      ctx.db
        .query("projects")
        .withIndex("by_hackathon_index", (q) => q.eq("hackathonIndex", index))
        .unique(),
    ),
  );

  return projects
    .filter((project): project is NonNullable<typeof project> => project !== null)
    .map(toHackathonDirectoryProject);
}

export const listHackathonDirectory = query({
  args: {},
  returns: v.array(hackathonDirectoryProjectValidator),
  handler: async (ctx) => {
    const indices = Array.from({ length: HACKATHON_PROJECT_COUNT }, (_, index) => index);
    const projects = await loadHackathonDirectoryByIndices(ctx, indices);
    return projects.sort((a, b) => a.hackathonIndex - b.hackathonIndex);
  },
});

/**
 * Binary-search prefix match on folded project title / builder, then load
 * matching directory rows from Convex by hackathonIndex.
 */
export const searchHackathonDirectory = query({
  args: {
    query: v.string(),
  },
  returns: v.array(hackathonDirectoryProjectValidator),
  handler: async (ctx, args) => {
    const search = trimText(args.query);
    if (!search) {
      const indices = Array.from({ length: HACKATHON_PROJECT_COUNT }, (_, index) => index);
      const projects = await loadHackathonDirectoryByIndices(ctx, indices);
      return projects.sort((a, b) => a.hackathonIndex - b.hackathonIndex);
    }

    const indices = hackathonIndicesMatchingPrefix(search);
    return await loadHackathonDirectoryByIndices(ctx, indices);
  },
});

export const listDiscoverable = query({
  args: {},
  returns: v.array(projectWithMembersValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    let viewer: Doc<"users"> | null = null;

    if (identity) {
      viewer = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();
    }

    const projects = (await ctx.db.query("projects").collect()).filter(
      (project) => !isHackathonDirectoryProject(project),
    );
    const enriched = await Promise.all(
      projects.map((project) => enrichProjectForViewer(ctx, project, viewer?._id ?? null)),
    );

    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const listPendingJoinRequests = query({
  args: {},
  returns: v.array(pendingJoinRequestValidator),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    const ownedMemberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const ownedProjectIds = ownedMemberships
      .filter((row) => row.role === "owner")
      .map((row) => row.projectId);

    if (ownedProjectIds.length === 0) {
      return [];
    }

    const requestsByProject = await Promise.all(
      ownedProjectIds.map((projectId) =>
        ctx.db
          .query("projectJoinRequests")
          .withIndex("by_project_and_status", (q) =>
            q.eq("projectId", projectId).eq("status", "pending"),
          )
          .collect(),
      ),
    );

    const pending = requestsByProject.flat();
    const enriched = await Promise.all(
      pending.map(async (request) => {
        const project = await ctx.db.get("projects", request.projectId);
        const requester = await ctx.db.get("users", request.requesterUserId);
        if (!project || !requester) return null;

        return {
          _id: request._id,
          projectId: request.projectId,
          projectTitle: project.title,
          requesterUserId: request.requesterUserId,
          requesterName: requester.name,
          requesterAvatarUrl: requester.avatarUrl,
          createdAt: request.createdAt,
        };
      }),
    );

    return enriched
      .filter((request): request is NonNullable<typeof request> => request !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    field: v.optional(projectFieldValidator),
    title: v.optional(v.string()),
    blurb: v.optional(v.string()),
    location: v.optional(v.string()),
    liveUrl: v.optional(v.string()),
    lookingForContributors: v.optional(v.boolean()),
    lookingToHire: v.optional(v.boolean()),
    inviteUserIds: v.optional(v.array(v.id("users"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await assertIsProjectOwner(ctx, args.projectId, user._id);

    const project = await ctx.db.get("projects", args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const nextTitle = args.title ?? project.title;
    const nextBlurb = args.blurb ?? project.blurb;
    const { title, blurb } = validateProjectText(nextTitle, nextBlurb);
    const now = Date.now();

    const patch: {
      field: Doc<"projects">["field"];
      title: string;
      blurb: string;
      updatedAt: number;
      location?: string;
      liveUrl?: string;
      joinCode?: string;
      lookingForContributors?: boolean;
      lookingToHire?: boolean;
    } = {
      field: args.field ?? project.field,
      title,
      blurb,
      updatedAt: now,
    };

    if (args.location !== undefined) {
      patch.location = normalizeOptionalProjectLocation(args.location);
    }

    if (args.liveUrl !== undefined) {
      patch.liveUrl = normalizeOptionalProjectUrl(args.liveUrl);
    }

    if (args.lookingForContributors !== undefined) {
      patch.lookingForContributors = args.lookingForContributors === true;
    }

    if (args.lookingToHire !== undefined) {
      patch.lookingToHire = args.lookingToHire === true;
    }

    if (!project.joinCode) {
      patch.joinCode = await generateUniqueJoinCode(ctx);
    }

    await ctx.db.patch(args.projectId, patch);

    if (args.inviteUserIds) {
      const uniqueInviteIds = [...new Set(args.inviteUserIds)].filter(
        (inviteUserId) => inviteUserId !== user._id,
      );

      if (uniqueInviteIds.length > 12) {
        throw new Error("You can invite up to 12 builders");
      }

      for (const inviteUserId of uniqueInviteIds) {
        const invitee = await ctx.db.get("users", inviteUserId);
        if (!invitee) {
          throw new Error("One or more selected builders could not be found");
        }

        await assertCanInviteUser(ctx, args.projectId, inviteUserId);

        const existingInvite = await ctx.db
          .query("projectInvites")
          .withIndex("by_project_and_invited_user", (q) =>
            q.eq("projectId", args.projectId).eq("invitedUserId", inviteUserId),
          )
          .unique();

        if (existingInvite?.status === "declined") {
          await ctx.db.patch(existingInvite._id, {
            invitedByUserId: user._id,
            status: "pending",
            createdAt: now,
            respondedAt: undefined,
          });
          continue;
        }

        await ctx.db.insert("projectInvites", {
          projectId: args.projectId,
          invitedUserId: inviteUserId,
          invitedByUserId: user._id,
          status: "pending",
          createdAt: now,
        });
      }
    }

    return null;
  },
});

export const hideFromDashboard = mutation({
  args: { projectId: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const membership = await getProjectMembership(ctx, args.projectId, user._id);

    if (!membership) {
      throw new Error("You are not a member of this project");
    }

    if (membership.hiddenOnDashboardAt !== undefined) {
      return null;
    }

    await ctx.db.patch(membership._id, {
      hiddenOnDashboardAt: Date.now(),
    });

    return null;
  },
});

export const leave = mutation({
  args: { projectId: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const membership = await getProjectMembership(ctx, args.projectId, user._id);

    if (!membership) {
      throw new Error("You are not a member of this project");
    }

    if (membership.role === "owner") {
      const allMembers = await ctx.db
        .query("projectMembers")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect();

      if (allMembers.length > 1) {
        throw new Error("Project owners cannot leave while other members remain");
      }

      await deleteProjectAndRelations(ctx, args.projectId);
      return null;
    }

    await ctx.db.delete(membership._id);
    await ctx.db.patch(args.projectId, {
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const remove = mutation({
  args: {
    projectId: v.id("projects"),
    confirmTitle: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await assertIsProjectOwner(ctx, args.projectId, user._id);

    const project = await ctx.db.get("projects", args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (trimText(args.confirmTitle) !== project.title) {
      throw new Error("Project name does not match");
    }

    await deleteProjectAndRelations(ctx, args.projectId);
    return null;
  },
});

export const requestJoin = mutation({
  args: { projectId: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const project = await ctx.db.get("projects", args.projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    const existingMember = await getProjectMembership(ctx, args.projectId, user._id);
    if (existingMember) {
      throw new Error("You are already on this project");
    }

    const existingInvite = await ctx.db
      .query("projectInvites")
      .withIndex("by_project_and_invited_user", (q) =>
        q.eq("projectId", args.projectId).eq("invitedUserId", user._id),
      )
      .unique();

    if (existingInvite?.status === "pending") {
      throw new Error("You already have a pending invite for this project");
    }

    const existingRequest = await ctx.db
      .query("projectJoinRequests")
      .withIndex("by_project_and_requester", (q) =>
        q.eq("projectId", args.projectId).eq("requesterUserId", user._id),
      )
      .unique();

    if (existingRequest?.status === "pending") {
      throw new Error("You already requested to join this project");
    }

    const now = Date.now();

    if (existingRequest?.status === "declined") {
      await ctx.db.patch(existingRequest._id, {
        status: "pending",
        createdAt: now,
        respondedAt: undefined,
      });
      return null;
    }

    await ctx.db.insert("projectJoinRequests", {
      projectId: args.projectId,
      requesterUserId: user._id,
      status: "pending",
      createdAt: now,
    });

    return null;
  },
});

export const joinWithCode = mutation({
  args: { code: v.string() },
  returns: v.object({
    projectId: v.id("projects"),
    projectTitle: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const normalizedCode = normalizeJoinCode(args.code);

    if (normalizedCode.length < 4) {
      throw new Error("Enter a valid project code");
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_join_code", (q) => q.eq("joinCode", normalizedCode))
      .unique();

    if (!project) {
      throw new Error("No project found with that code");
    }

    const existingMember = await getProjectMembership(ctx, project._id, user._id);
    if (existingMember) {
      if (existingMember.hiddenOnDashboardAt !== undefined) {
        await ctx.db.patch(existingMember._id, {
          hiddenOnDashboardAt: undefined,
        });
        return {
          projectId: project._id,
          projectTitle: project.title,
        };
      }
      throw new Error("You are already on this project");
    }

    const now = Date.now();

    await ctx.db.insert("projectMembers", {
      projectId: project._id,
      userId: user._id,
      role: "member",
      addedAt: now,
    });

    const pendingInvite = await ctx.db
      .query("projectInvites")
      .withIndex("by_project_and_invited_user", (q) =>
        q.eq("projectId", project._id).eq("invitedUserId", user._id),
      )
      .unique();

    if (pendingInvite?.status === "pending") {
      await ctx.db.patch(pendingInvite._id, {
        status: "accepted",
        respondedAt: now,
      });
    }

    const pendingRequest = await ctx.db
      .query("projectJoinRequests")
      .withIndex("by_project_and_requester", (q) =>
        q.eq("projectId", project._id).eq("requesterUserId", user._id),
      )
      .unique();

    if (pendingRequest?.status === "pending") {
      await ctx.db.patch(pendingRequest._id, {
        status: "accepted",
        respondedAt: now,
      });
    }

    await ctx.db.patch(project._id, {
      updatedAt: now,
    });

    return {
      projectId: project._id,
      projectTitle: project.title,
    };
  },
});

export const acceptJoinRequest = mutation({
  args: { requestId: v.id("projectJoinRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const request = await ctx.db.get("projectJoinRequests", args.requestId);

    if (!request) {
      throw new Error("Join request not found");
    }

    if (request.status !== "pending") {
      throw new Error("This join request is no longer pending");
    }

    await assertIsProjectOwner(ctx, request.projectId, user._id);

    const existingMember = await getProjectMembership(
      ctx,
      request.projectId,
      request.requesterUserId,
    );

    const now = Date.now();

    if (!existingMember) {
      await ctx.db.insert("projectMembers", {
        projectId: request.projectId,
        userId: request.requesterUserId,
        role: "member",
        addedAt: now,
      });
    }

    await ctx.db.patch(args.requestId, {
      status: "accepted",
      respondedAt: now,
    });

    await ctx.db.patch(request.projectId, {
      updatedAt: now,
    });

    return null;
  },
});

export const declineJoinRequest = mutation({
  args: { requestId: v.id("projectJoinRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const request = await ctx.db.get("projectJoinRequests", args.requestId);

    if (!request) {
      throw new Error("Join request not found");
    }

    if (request.status !== "pending") {
      throw new Error("This join request is no longer pending");
    }

    await assertIsProjectOwner(ctx, request.projectId, user._id);

    await ctx.db.patch(args.requestId, {
      status: "declined",
      respondedAt: Date.now(),
    });

    return null;
  },
});
