/**
 * ADMIN → PAGES — custom pages (saved line lists) + built-in overrides.
 *
 * A custom page is a row here: a serialisable line-list definition plus its
 * nav placement and role visibility. Built-in pages are code; their label /
 * role / group / order overrides live in appSettings.pageOverrides so a
 * deploy never overwrites an admin's choice.
 *
 * Every query is role-gated on the SERVER: a page that is not shared with the
 * caller's role is invisible to the nav, the palette and the route.
 * State Admin only for writes; every write is audited.
 */

import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { canEditAll, requireActivatedUser } from "./facilities";
import { roleKeys } from "./roles";
import {
  PROTECTED_PAGE_GROUPS,
  UNGROUPED_PAGE_GROUP,
  fallbackGroupId,
  normalizePageGroups,
  type PageGroupDef,
} from "../lib/pageGroups";

type Role = string;

function roleOfUser(appRole: string | null | undefined): Role {
  return appRole ?? "viewer";
}

async function adminFor(ctx: QueryCtx | MutationCtx) {
  const me = await requireActivatedUser(ctx);
  if (!canEditAll(me)) throw new Error("Only the State Admin can manage pages");
  return me;
}

async function readPageGroups(ctx: QueryCtx | MutationCtx): Promise<PageGroupDef[]> {
  const row = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", "pageGroups"))
    .first();
  return normalizePageGroups(row?.value);
}

/** Group definitions are labelled/ordered admin data, not routes. Any signed-in
 * user needs them for the sidebar; only State Admin can write them. */
export const groups = query({
  args: {},
  handler: async (ctx) => {
    await requireActivatedUser(ctx);
    return await readPageGroups(ctx);
  },
});

export const saveGroups = mutation({
  args: {
    groups: v.array(v.object({ id: v.string(), label: v.string(), order: v.number() })),
  },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    const next = normalizePageGroups(args.groups);
    const nextIds = new Set(next.map((group) => group.id));
    for (const locked of PROTECTED_PAGE_GROUPS) {
      if (!nextIds.has(locked)) {
        throw new Error(`${locked === "main" ? "Main" : "Admin"} group cannot be deleted`);
      }
    }
    const previous = await readPageGroups(ctx);
    const removed = previous.filter((group) => !nextIds.has(group.id)).map((group) => group.id);
    const fallback = fallbackGroupId(next);

    if (removed.length > 0) {
      const pages = await ctx.db.query("customPages").collect();
      for (const page of pages) {
        if (page.deletedAt == null && removed.includes(page.group)) {
          await ctx.db.patch(page._id, { group: fallback, updatedAt: Date.now() });
        }
      }
      const overrideRow = await ctx.db
        .query("appSettings")
        .withIndex("by_key", (q) => q.eq("key", "pageOverrides"))
        .first();
      if (overrideRow?.value && typeof overrideRow.value === "object") {
        const overrides = structuredClone(overrideRow.value) as Record<string, Record<string, unknown>>;
        let changed = false;
        for (const value of Object.values(overrides)) {
          if (value && typeof value.group === "string" && removed.includes(value.group)) {
            value.group = fallback;
            changed = true;
          }
        }
        if (changed) await ctx.db.patch(overrideRow._id, { value: overrides });
      }
    }

    const row = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "pageGroups"))
      .first();
    if (row) await ctx.db.patch(row._id, { value: next });
    else await ctx.db.insert("appSettings", { key: "pageGroups", value: next });
    await ctx.db.insert(
      "auditLogs",
      auditArgs(me, "update", {
        field: "Page groups",
        oldValue: previous.map((group) => group.label).join(", "),
        newValue: next.map((group) => group.label).join(", "),
      }) as never,
    );
    return { groups: next, movedPages: removed.length > 0 };
  },
});

const cleanSlug = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const pageDto = (p: {
  _id: unknown;
  name: string;
  slug: string;
  icon: string;
  group: string;
  order: number;
  roles: string[];
  everyone?: boolean;
  visible?: boolean;
  sourceReportId?: string;
  type: string;
  definition: unknown;
  allowDownload: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}) => ({
  id: String(p._id),
  name: p.name,
  slug: p.slug,
  icon: p.icon,
  group: p.group,
  order: p.order,
  // Legacy empty lists mean Everyone — made explicit here so the client never
  // has to interpret an empty list.
  everyone: p.everyone === true || p.roles.length === 0,
  roles: p.roles,
  visible: p.visible !== false,
  needsMigration: p.roles.length === 0 && p.everyone !== true,
  sourceReportId: p.sourceReportId ?? null,
  type: p.type,
  definition: p.definition,
  allowDownload: p.allowDownload,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  deletedAt: p.deletedAt ?? null,
});

/** Navigation + palette: only the pages this caller's role may open. */
export const nav = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    const role = roleOfUser(me.appRole);
    // Small table: one read, then role + trash filtering. (An indexed
    // `deletedAt = undefined` would skip every live row — Convex indexes
    // omit documents whose indexed field is absent.)
    const rows = await ctx.db.query("customPages").collect();
    return rows
      .filter(
        (p) =>
          p.deletedAt == null &&
          p.visible !== false &&
          ((p.everyone === true || p.roles.length === 0) || p.roles.includes(role)),
      )
      .sort((a, b) => a.group.localeCompare(b.group) || a.order - b.order || a.name.localeCompare(b.name))
      .map((p) => ({
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        icon: p.icon,
        group: p.group,
        order: p.order,
        type: p.type,
        allowDownload: p.allowDownload,
      }));
  },
});

/** The page itself — role-gated; throws rather than leaking its definition. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const me = await requireActivatedUser(ctx);
    const role = roleOfUser(me.appRole);
    const page = await ctx.db
      .query("customPages")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!page || page.deletedAt != null) return null;
    // Return null instead of throwing: the AppShell route guard renders the
    // 403 with the reason, and this query never has to crash an error boundary.
    if (page.visible === false) return null;
    if (!page.everyone && page.roles.length > 0 && !page.roles.includes(role)) return null;
    return { ...pageDto(page), me: { appRole: role } };
  },
});

/** Built-in overrides (any signed-in user; it is only labels/roles/order). */
export const builtinOverrides = query({
  args: {},
  handler: async (ctx) => {
    await requireActivatedUser(ctx);
    const row = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "pageOverrides"))
      .first();
    const value = row?.value;
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  },
});

/** Admin list: live + trash. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await adminFor(ctx);
    const rows = await ctx.db.query("customPages").collect();
    return rows
      .map(pageDto)
      .sort((a, b) => a.group.localeCompare(b.group) || a.order - b.order || a.name.localeCompare(b.name));
  },
});

function auditArgs(
  me: { _id: unknown; name?: string | null; email?: string | null },
  action: string,
  detail: { id?: string; field?: string; oldValue?: string; newValue?: string },
) {
  return {
    table: "customPages",
    recordId: detail.id ?? "customPages",
    action,
    field: detail.field,
    oldValue: detail.oldValue,
    newValue: detail.newValue,
    changedBy: me._id,
    changedByName: me.name ?? me.email ?? "State Admin",
    changedAt: Date.now(),
    source: "Admin → Pages",
  };
}

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    icon: v.string(),
    group: v.string(),
    order: v.number(),
    roles: v.array(v.string()),
    everyone: v.optional(v.boolean()),
    visible: v.optional(v.boolean()),
    sourceReportId: v.optional(v.string()),
    type: v.string(),
    definition: v.any(),
    allowDownload: v.boolean(),
  },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    const name = args.name.trim();
    if (args.everyone !== true && args.roles.length === 0)
      throw new Error("A page must be visible to at least one role");
    const slug = cleanSlug(args.slug || args.name);
    if (!name) throw new Error("Page name is required");
    if (!slug) throw new Error("URL slug is required");
    const clash = await ctx.db
      .query("customPages")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (clash) throw new Error("That URL slug is already used by another page");
    const groupIds = new Set((await readPageGroups(ctx)).map((group) => group.id));
    groupIds.add(UNGROUPED_PAGE_GROUP);
    const group = args.group || "tools";
    if (!groupIds.has(group)) throw new Error("That page group no longer exists");
    const now = Date.now();
    const id = await ctx.db.insert("customPages", {
      name,
      slug,
      icon: args.icon || "FileSpreadsheet",
      group,
      order: Number.isFinite(args.order) ? args.order : 100,
      roles: args.roles,
      everyone: args.everyone === true || args.roles.length === 0,
      visible: args.visible !== false,
      sourceReportId: args.sourceReportId,
      type: args.type === "report" ? "report" : "lineList",
      definition: args.definition,
      allowDownload: args.allowDownload,
      createdBy: me._id,
      createdByName: me.name ?? me.email ?? "State Admin",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert(
      "auditLogs",
      auditArgs(me, "create", { id: String(id), field: "Page", newValue: `${name} (/p/${slug})` }) as never,
    );
    return { id: String(id), slug };
  },
});

export const update = mutation({
  args: {
    pageId: v.id("customPages"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    icon: v.optional(v.string()),
    group: v.optional(v.string()),
    order: v.optional(v.number()),
    roles: v.optional(v.array(v.string())),
    everyone: v.optional(v.boolean()),
    visible: v.optional(v.boolean()),
    sourceReportId: v.optional(v.string()),
    type: v.optional(v.string()),
    definition: v.optional(v.any()),
    allowDownload: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Page not found");
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      if (!args.name.trim()) throw new Error("Page name is required");
      patch.name = args.name.trim();
    }
    if (args.slug !== undefined) {
      const slug = cleanSlug(args.slug);
      if (!slug) throw new Error("URL slug is required");
      if (slug !== page.slug) {
        const clash = await ctx.db
          .query("customPages")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .first();
        if (clash) throw new Error("That URL slug is already used by another page");
      }
      patch.slug = slug;
    }
    if (args.icon !== undefined) patch.icon = args.icon;
    if (args.group !== undefined) {
      const allowed = new Set((await readPageGroups(ctx)).map((group) => group.id));
      allowed.add(UNGROUPED_PAGE_GROUP);
      if (!allowed.has(args.group)) throw new Error("That page group no longer exists");
      patch.group = args.group;
    }
    if (args.order !== undefined) patch.order = args.order;
    if (args.roles !== undefined) {
      if (args.everyone !== true && args.roles.length === 0)
        throw new Error("A page must be visible to at least one role");
      patch.roles = args.roles;
    }
    if (args.everyone !== undefined) patch.everyone = args.everyone;
    if (args.visible !== undefined) patch.visible = args.visible;
    if (args.sourceReportId !== undefined) patch.sourceReportId = args.sourceReportId;
    if (args.type !== undefined) patch.type = args.type === "report" ? "report" : "lineList";
    if (args.definition !== undefined) patch.definition = args.definition;
    if (args.allowDownload !== undefined) patch.allowDownload = args.allowDownload;
    await ctx.db.patch(args.pageId, patch);
    await ctx.db.insert(
      "auditLogs",
      auditArgs(me, "update", {
        id: String(args.pageId),
        field: "Page",
        oldValue: page.name,
        newValue: typeof patch.name === "string" ? patch.name : page.name,
      }) as never,
    );
    return { ok: true };
  },
});

export const duplicate = mutation({
  args: { pageId: v.id("customPages") },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Page not found");
    let slug = `${page.slug}-copy`;
    let n = 2;
    while (
      await ctx.db.query("customPages").withIndex("by_slug", (q) => q.eq("slug", slug)).first()
    ) {
      slug = `${page.slug}-copy-${n}`;
      n += 1;
    }
    const now = Date.now();
    const id = await ctx.db.insert("customPages", {
      name: `${page.name} (copy)`,
      slug,
      icon: page.icon,
      group: page.group,
      order: page.order + 1,
      roles: page.roles,
      everyone: page.everyone,
      visible: page.visible,
      sourceReportId: page.sourceReportId,
      type: page.type,
      definition: page.definition,
      allowDownload: page.allowDownload,
      createdBy: me._id,
      createdByName: me.name ?? me.email ?? "State Admin",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert(
      "auditLogs",
      auditArgs(me, "create", { id: String(id), field: "Page duplicate", newValue: `${page.name} → ${slug}` }) as never,
    );
    return { id: String(id), slug };
  },
});

/** Soft delete → Trash. Restorable; never purged automatically. */
export const softDelete = mutation({
  args: { pageId: v.id("customPages") },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Page not found");
    await ctx.db.patch(args.pageId, { deletedAt: Date.now(), updatedAt: Date.now() });
    await ctx.db.insert(
      "auditLogs",
      auditArgs(me, "delete", { id: String(args.pageId), field: "Page", oldValue: page.name, newValue: "Trash" }) as never,
    );
    return { ok: true };
  },
});

export const restore = mutation({
  args: { pageId: v.id("customPages") },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Page not found");
    if (page.deletedAt == null) return { ok: true };
    const clash = await ctx.db
      .query("customPages")
      .withIndex("by_slug", (q) => q.eq("slug", page.slug))
      .first();
    if (clash && clash._id !== args.pageId && clash.deletedAt == null) {
      throw new Error("Another live page now uses its URL — rename it in Trash first");
    }
    await ctx.db.patch(args.pageId, { deletedAt: undefined, updatedAt: Date.now() });
    await ctx.db.insert(
      "auditLogs",
      auditArgs(me, "restore", { id: String(args.pageId), field: "Page", newValue: page.name }) as never,
    );
    return { ok: true };
  },
});

/** Permanent delete — only from Trash. */
export const purge = mutation({
  args: { pageId: v.id("customPages") },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) return { ok: true };
    if (page.deletedAt == null) throw new Error("Move the page to Trash first");
    await ctx.db.delete(args.pageId);
    await ctx.db.insert(
      "auditLogs",
      auditArgs(me, "delete", { id: String(args.pageId), field: "Page permanently deleted", oldValue: page.name }) as never,
    );
    return { ok: true };
  },
});

/** ONE save for the Pages tab: overrides + visibility, in one audited
 *  transaction. The sidebar/palette/route guard are all reactive queries, so
 *  the change lands everywhere at once. */
export const saveAdmin = mutation({
  args: {
    overrides: v.any(),
    hiddenPages: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    const known = await roleKeys(ctx);
    const pageGroups = new Set((await readPageGroups(ctx)).map((group) => group.id));
    pageGroups.add(UNGROUPED_PAGE_GROUP);
    const clean: Record<string, Record<string, unknown>> = {};
    const incoming = (args.overrides ?? {}) as Record<string, unknown>;
    for (const [route, raw] of Object.entries(incoming)) {
      if (!route.startsWith("/") || !raw || typeof raw !== "object") continue;
      const value = raw as Record<string, unknown>;
      const next: Record<string, unknown> = {};
      if (typeof value.label === "string" && value.label.trim()) {
        next.label = value.label.trim().slice(0, 60);
      }
      if (typeof value.order === "number" && Number.isFinite(value.order)) {
        next.order = Math.max(-1000, Math.min(1000, Math.round(value.order)));
      }
      if (typeof value.visible === "boolean") next.visible = value.visible;
      if (typeof value.group === "string" && pageGroups.has(value.group)) {
        next.group = value.group;
      }
      if (value.everyone === true) {
        next.everyone = true;
        next.roles = [];
      } else if (Array.isArray(value.roles)) {
        const kept = [...new Set(value.roles.filter((r): r is string => typeof r === "string"))]
          .filter((r) => known.has(r));
        if (kept.length === 0) throw new Error("A page must be visible to at least one role");
        next.everyone = false;
        next.roles = kept;
      }
      // Admin Settings can never be hidden or re-scoped.
      if (route === "/admin") {
        next.visible = true;
        next.everyone = false;
        next.roles = ["admin"];
        next.group = "admin";
      }
      clean[route] = next;
    }
    const hidden = [
      ...new Set(
        args.hiddenPages.filter((k) => k !== "admin" && !k.startsWith("/")),
      ),
    ];
    // A page hidden while visible stays hidden; this is the one visibility
    // store the shell reads, so the direct URL and the nav agree.
    const row = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "pageOverrides"))
      .first();
    if (row) await ctx.db.patch(row._id, { value: clean });
    else await ctx.db.insert("appSettings", { key: "pageOverrides", value: clean });
    const hiddenRow = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "hiddenPages"))
      .first();
    if (hiddenRow) await ctx.db.patch(hiddenRow._id, { value: hidden });
    else await ctx.db.insert("appSettings", { key: "hiddenPages", value: hidden });
    // One visibility store. Older category toggles are merged into
    // hiddenPages by the Admin table, so clear the legacy list on save.
    const catRow = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "hiddenCategories"))
      .first();
    if (catRow) await ctx.db.patch(catRow._id, { value: [] });
    await ctx.db.insert(
      "auditLogs",
      auditArgs(me, "update", {
        field: "Pages",
        newValue: `${Object.keys(clean).length} overrides, ${hidden.length} hidden`,
      }) as never,
    );
    return { ok: true };
  },
});

/** Built-in page override: label / roles / group / order / icon. */
export const setBuiltinOverride = mutation({
  args: {
    route: v.string(),
    patch: v.object({
      label: v.optional(v.string()),
      icon: v.optional(v.string()),
      group: v.optional(v.string()),
      order: v.optional(v.number()),
      roles: v.optional(v.array(v.string())),
      everyone: v.optional(v.boolean()),
      visible: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    if (args.patch.group) {
      const pageGroups = new Set((await readPageGroups(ctx)).map((group) => group.id));
      pageGroups.add(UNGROUPED_PAGE_GROUP);
      if (!pageGroups.has(args.patch.group)) throw new Error("That page group no longer exists");
    }
    const row = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "pageOverrides"))
      .first();
    const current =
      row?.value && typeof row.value === "object"
        ? ({ ...(row.value as Record<string, unknown>) } as Record<string, unknown>)
        : {};
    const next = { ...(current[args.route] as Record<string, unknown> | undefined), ...args.patch };
    current[args.route] = next;
    if (row) await ctx.db.patch(row._id, { value: current });
    else await ctx.db.insert("appSettings", { key: "pageOverrides", value: current });
    await ctx.db.insert(
      "auditLogs",
      auditArgs(me, "update", {
        field: `Built-in page ${args.route}`,
        newValue: JSON.stringify(next),
      }) as never,
    );
    return { ok: true };
  },
});
