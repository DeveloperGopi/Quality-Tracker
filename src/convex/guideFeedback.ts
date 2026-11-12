/** Admin Guide helpfulness votes — one small row per vote. */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canEditAll, requireActivatedUser } from "./facilities";

export const submit = mutation({
  args: {
    route: v.string(),
    articleTitle: v.string(),
    role: v.optional(v.string()),
    helpful: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireActivatedUser(ctx);
    await ctx.db.insert("guideFeedback", {
      route: args.route.slice(0, 200),
      articleTitle: args.articleTitle.slice(0, 120),
      role: args.role?.slice(0, 40),
      helpful: args.helpful,
      note: args.note?.trim().slice(0, 500) || undefined,
      userId: user._id,
      userName: user.name ?? user.email ?? undefined,
      createdAt: Date.now(),
    });
    return { ok: true as const };
  },
});

/** State Admin's short list: newest unhelpful articles, one row per article. */
export const unhelpful = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user)) return [];
    const rows = await ctx.db.query("guideFeedback").withIndex("by_time").order("desc").take(200);
    const seen = new Set<string>();
    const out: {
      route: string;
      articleTitle: string;
      note: string | null;
      role: string | null;
      userName: string | null;
      createdAt: number;
    }[] = [];
    for (const row of rows) {
      if (row.helpful || seen.has(row.route)) continue;
      seen.add(row.route);
      out.push({
        route: row.route,
        articleTitle: row.articleTitle,
        note: row.note ?? null,
        role: row.role ?? null,
        userName: row.userName ?? null,
        createdAt: row.createdAt,
      });
      if (out.length >= 8) break;
    }
    return out;
  },
});
