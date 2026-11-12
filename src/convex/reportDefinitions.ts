/**
 * REPORT DEFINITIONS — the missing server-side piece behind “Create page →
 * Saved report”. A Report Builder view is stored here with an id and a full
 * serialisable snapshot (fields, filters, grouping, layout); a custom page
 * keeps the id so it can warn when the source disappears.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canEdit, canEditAll, requireActivatedUser } from "./facilities";

const dto = (row: {
  _id: unknown;
  name: string;
  view: unknown;
  createdAt: number;
  updatedAt: number;
  createdByName?: string | null;
}) => ({
  id: String(row._id),
  name: row.name,
  view: row.view,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  createdByName: row.createdByName ?? null,
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireActivatedUser(ctx);
    const rows = await ctx.db.query("reportDefinitions").collect();
    return rows
      .filter((r) => r.deletedAt == null)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(dto);
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireActivatedUser(ctx);
    const rows = await ctx.db.query("reportDefinitions").collect();
    const row = rows.find((r) => String(r._id) === id);
    if (!row) return { status: "missing" as const, definition: null };
    if (row.deletedAt != null) return { status: "deleted" as const, definition: null };
    return { status: "ok" as const, definition: dto(row) };
  },
});

export const save = mutation({
  args: { name: v.string(), view: v.any() },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    if (!canEdit(me)) throw new Error("Your role cannot save report definitions");
    const name = args.name.trim();
    if (!name) throw new Error("Give the report definition a name");
    const now = Date.now();
    const id = await ctx.db.insert("reportDefinitions", {
      name,
      view: args.view,
      createdBy: me._id,
      createdByName: me.name ?? me.email ?? "State Admin",
      createdAt: now,
      updatedAt: now,
    });
    return { id: String(id) };
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const me = await requireActivatedUser(ctx);
    const rows = await ctx.db.query("reportDefinitions").collect();
    const row = rows.find((r) => String(r._id) === id);
    if (!row) return { ok: true };
    if (!canEditAll(me) && String(row.createdBy) !== String(me._id)) {
      throw new Error("Only the creator or a State Admin can remove this definition");
    }
    await ctx.db.patch(row._id, { deletedAt: Date.now(), updatedAt: Date.now() });
    await ctx.db.insert("auditLogs", {
      table: "reportDefinitions",
      recordId: id,
      action: "delete",
      oldValue: row.name,
      changedBy: me._id,
      changedByName: me.name ?? "State Admin",
      changedAt: Date.now(),
      source: "Admin → Pages",
    });
    return { ok: true };
  },
});
