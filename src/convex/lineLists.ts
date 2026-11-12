/**
 * LINE LIST REPORTS — saved definitions and sharing.
 *
 * Storage decision: the definitions live in the EXISTING per-user `masterViews`
 * table (one row per user per scope, index `by_user_scope`) under the scope
 * prefix `linelist:`. No schema change, no DB column renamed, and the same
 * "the saved thing follows the user across browsers" guarantee the column
 * layouts already have.
 *
 * What is shared is the DEFINITION only — columns, filters, sort, group-by and
 * the template id. A viewer's data is read with THEIR role and block scope by
 * the page's own query, so sharing a report can never show another district's
 * facilities. Sign-out clears the client cache; nothing here returns a Drive id
 * or a token.
 *
 * Exports are logged into `auditLogs` (who, what, filters, rows, when) — the
 * Activity log IS the export log for this app.
 */

import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireActivatedUser } from "./facilities";

const PREFIX = "linelist:";

type Definition = {
  id: string;
  name?: string;
  ownerId?: string;
  ownerName?: string;
  pinned?: boolean;
  sharedWithRoles?: string[];
  sharedWithUserIds?: string[];
  [k: string]: unknown;
};

type Row = {
  _id: unknown;
  userId: string;
  scope: string;
  view: unknown;
  updatedAt: number;
};

function definitionOf(row: Row): Definition | null {
  const view = row.view as Definition | null;
  if (!view || typeof view !== "object") return null;
  if (typeof view.id !== "string" || !view.id) return null;
  return view;
}

/** The signed-in user's own saved line lists (newest first). */
export const myLineLists = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const userId = await getAuthUserId(ctx);
    const me = userId ? await ctx.db.get(userId) : null;
    if (!me || !me.appRole) return [];
    const rows = (await ctx.db
      .query("masterViews")
      .withIndex("by_user_scope", (q) => q.eq("userId", me._id))
      .collect()) as unknown as Row[];
    return rows
      .filter((r) => r.scope.startsWith(PREFIX))
      .map((r) => ({ definition: definitionOf(r), updatedAt: r.updatedAt }))
      .filter((r): r is { definition: Definition; updatedAt: number } => !!r.definition)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Reports other people shared with me — by user id or by my role.
 *
 * Bounded by construction: `masterViews` holds at most one row per user per
 * saved scope, so this is a small table, and the prefix test runs in memory.
 * (The index is (userId, scope); a scope-only index would be needed to seek by
 * prefix, which is not worth a schema change for a few hundred rows.)
 */
export const sharedLineLists = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const userId = await getAuthUserId(ctx);
    const me = userId ? await ctx.db.get(userId) : null;
    if (!me || !me.appRole) return [];
    const rows = (await ctx.db.query("masterViews").collect()) as unknown as Row[];
    return rows
      .filter((r) => r.scope.startsWith(PREFIX))
      .map((r) => definitionOf(r))
      .filter((d): d is Definition => !!d)
      .filter((d) => d.ownerId !== String(me._id))
      .filter(
        (d) =>
          (d.sharedWithUserIds ?? []).includes(String(me._id)) ||
          (d.sharedWithRoles ?? []).includes(me.appRole as string),
      )
      .map((d) => ({ definition: d }));
  },
});

/** Save (upsert) a definition as MY report. One row per report id per user. */
export const saveLineList = mutation({
  args: { definition: v.any() },
  handler: async (ctx: MutationCtx, { definition }) => {
    const me = await requireActivatedUser(ctx);
    const incoming = definition as Definition;
    if (!incoming || typeof incoming.id !== "string" || !incoming.id) {
      throw new Error("A line list needs an id");
    }
    const scope = PREFIX + incoming.id;
    const view: Definition = {
      ...incoming,
      ownerId: String(me._id),
      ownerName: me.name ?? me.email ?? "Signed-in user",
    };
    const payload = { view, updatedAt: Date.now() };
    const existing = await ctx.db
      .query("masterViews")
      .withIndex("by_user_scope", (q) => q.eq("userId", me._id).eq("scope", scope))
      .unique();
    if (existing) await ctx.db.patch(existing._id, payload);
    else await ctx.db.insert("masterViews", { userId: me._id, scope, ...payload });
    return { id: incoming.id, savedAt: payload.updatedAt };
  },
});

/** Delete one of MY reports (a shared copy elsewhere is untouched). */
export const deleteLineList = mutation({
  args: { id: v.string() },
  handler: async (ctx: MutationCtx, { id }) => {
    const me = await requireActivatedUser(ctx);
    const existing = await ctx.db
      .query("masterViews")
      .withIndex("by_user_scope", (q) =>
        q.eq("userId", me._id).eq("scope", PREFIX + id),
      )
      .unique();
    if (!existing) return { deleted: false };
    await ctx.db.delete(existing._id);
    return { deleted: true };
  },
});

/**
 * Export log entry — who exported what, with which filters and how many rows,
 * at what time. Written to `auditLogs` so the Admin → Activity log shows it
 * next to the data edits (one log, not a second parallel one).
 */
export const logLineListExport = mutation({
  args: {
    topic: v.string(),
    format: v.string(),
    filters: v.string(),
    rows: v.number(),
    fileName: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const me = await requireActivatedUser(ctx);
    await ctx.db.insert("auditLogs", {
      table: "lineLists",
      recordId: args.topic,
      action: "export",
      field: "Line list export",
      newValue: `${args.format.toUpperCase()} · ${args.rows} rows · ${args.filters || "no filters"} · ${args.fileName}`,
      changedBy: me._id,
      changedByName: me.name ?? me.email ?? "Signed-in user",
      changedAt: Date.now(),
      source: "Line lists",
    });
    return { logged: true };
  },
});
