import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { getCurrentUser } from "./lib/currentUser";

/**
 * The only presence write. Online is never stored; readers derive it from how
 * recently this ran, so there is no offline write and no cleanup job.
 */
export const touchPresence = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const lastSeenAt = Date.now();
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (existing) {
      await ctx.db.patch("presence", existing._id, { lastSeenAt });
    } else {
      await ctx.db.insert("presence", { userId: user._id, lastSeenAt });
    }
    return null;
  },
});

/** Rewrites rows from { isOnline, updatedAt } onto { lastSeenAt }. */
export const migrateLegacyPresence = internalMutation({
  args: {},
  returns: v.object({
    migrated: v.number(),
    alreadyCurrent: v.number(),
  }),
  handler: async (ctx) => {
    const rows = await ctx.db.query("presence").collect();
    let migrated = 0;
    let alreadyCurrent = 0;

    for (const row of rows) {
      const hasLegacy = row.isOnline !== undefined || row.updatedAt !== undefined;
      if (!hasLegacy && row.lastSeenAt !== undefined) {
        alreadyCurrent += 1;
        continue;
      }

      const lastSeenAt = row.lastSeenAt ?? row.updatedAt;
      if (lastSeenAt === undefined) {
        await ctx.db.delete("presence", row._id);
      } else {
        await ctx.db.replace("presence", row._id, {
          userId: row.userId,
          lastSeenAt,
        });
      }
      migrated += 1;
    }

    return { migrated, alreadyCurrent };
  },
});

