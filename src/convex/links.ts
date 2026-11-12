/**
 * LINKS ORGANISER — Convex reads and writes.
 *
 * Security is server-side: every query filters `link_item.visibility` before
 * returning a row, and every mutation re-checks the role and visibility.
 * Viewers can read; District Editors (entry/DQMO/DQC) can add/edit/import;
 * State Admin alone can manage categories/owners/config and permanently
 * delete. Every write lands in `auditLogs` with a before/after snapshot.
 *
 * Reads use indexes only (`by_serial`, `by_category`, `by_owner`, `by_status`,
 * `by_next_due`, `by_item`). There is no `.collect()` on an unindexed table in
 * this file.
 */

import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  canEdit,
  requireActivatedUser,
  type AppUser,
} from "./facilities";
import {
  DEFAULT_LINK_STATUSES,
  DEFAULT_LINKS_CONFIG,
  LINK_LEVELS,
  advanceQuarterText,
  canEditLinks,
  canRollForward,
  canSeeLink,
  computeDueState,
  computeNextDue,
  detectLinkType,
  dueStateLabel,
  formatLinkDate,
  linkReminderScope,
  nextQuarterPeriod,
  quarterPeriodOf,
  linkRole,
  normalizeLinkUrl,
  normalizeLinksConfig,
  suggestLinkLabel,
  validateLinkUrl,
  type LinksConfig,
} from "../lib/links";

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                              */
/* -------------------------------------------------------------------------- */

function istToday(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function configOf(ctx: QueryCtx | MutationCtx): Promise<LinksConfig> {
  const row = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", "linksConfig"))
    .first();
  return normalizeLinksConfig(row?.value);
}

async function audit(
  ctx: MutationCtx,
  me: AppUser,
  recordId: string,
  action: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
) {
  await ctx.db.insert("auditLogs", {
    table: "link_item",
    recordId,
    action,
    field,
    oldValue: oldValue === undefined ? undefined : oldValue,
    newValue: newValue === undefined ? undefined : newValue,
    changedBy: me._id,
    changedByName: me.name ?? me.email ?? "Signed-in user",
    changedAt: Date.now(),
    source: "Links Organiser",
  });
}

function assertEditor(me: AppUser) {
  if (!canEdit(me)) throw new Error("Viewers cannot change the Links Organiser");
}

function assertAdmin(me: AppUser) {
  if (me.appRole !== "admin") throw new Error("Only a State Admin can do that");
}

async function requireVisibleItem(
  ctx: QueryCtx | MutationCtx,
  me: AppUser,
  id: Id<"link_item">,
): Promise<Doc<"link_item">> {
  const item = await ctx.db.get(id);
  if (!item) throw new Error("Link not found");
  if (!canSeeLink(item.visibility, linkRole(me.appRole))) {
    throw new Error("Link not found");
  }
  return item;
}

function cleanText(value: string | undefined, max: number): string | undefined {
  if (value === undefined) return undefined;
  const next = value.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  return next === "" ? undefined : next.slice(0, max);
}

function validateDate(value: string | undefined, today = istToday()): string | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Use a real date (DD-MMM-YYYY)");
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Use a real date (DD-MMM-YYYY)");
  }
  if (value > today) throw new Error("Last updated cannot be in the future");
  return value;
}

const DEFAULT_LINK_CATEGORIES = [
  { name: "Basic Data", colour: "teal", icon: "Database" },
  { name: "Quality Status", colour: "blue", icon: "BadgeCheck" },
  { name: "Building Status", colour: "amber", icon: "Building2" },
  { name: "Doc. Collection", colour: "violet", icon: "FolderOpen" },
] as const;
const DEFAULT_LINK_OWNERS = ["NHSRC", "Quality", "State Sheet", "District Sheet"] as const;

const urlInput = v.object({
  label: v.string(),
  url: v.string(),
  kind: v.string(), // link | form
  isPrimary: v.boolean(),
  type: v.optional(v.string()),
});

function validateUrls(
  urls: {
    label: string;
    url: string;
    kind: string;
    isPrimary: boolean;
    type?: string;
  }[],
) {
  if (urls.length === 0) throw new Error("Add at least one link");
  if (urls.length > 10) throw new Error("A report can have at most 10 links");
  const forms = urls.filter((u) => u.kind === "form");
  if (forms.length > 1) throw new Error("Only one Form link is allowed");
  if (forms.length === 1 && forms[0].isPrimary) {
    throw new Error("A Form link cannot be the primary report link");
  }
  const links = urls.filter((u) => u.kind !== "form");
  if (links.length && links.filter((u) => u.isPrimary).length !== 1) {
    throw new Error("Choose one primary report link");
  }
  const normalized: {
    label: string;
    url: string;
    kind: "link" | "form";
    isPrimary: boolean;
    type: string;
    position: number;
  }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < urls.length; i += 1) {
    const candidate = urls[i];
    const kind = candidate.kind === "form" ? "form" : "link";
    const check = validateLinkUrl(candidate.url);
    if (!check.ok) throw new Error(check.error ?? "Invalid link");
    if (seen.has(check.url)) continue;
    seen.add(check.url);
    const label = cleanText(candidate.label, 80) ?? suggestLinkLabel(check.url);
    normalized.push({
      label,
      url: check.url,
      kind,
      isPrimary: !!candidate.isPrimary,
      type: candidate.type && candidate.type.length ? candidate.type : detectLinkType(check.url),
      position: i,
    });
  }
  const primary = normalized.find((u) => u.kind === "link" && u.isPrimary);
  if (!primary && normalized.some((u) => u.kind === "link")) {
    const first = normalized.find((u) => u.kind === "link");
    if (first) first.isPrimary = true;
  }
  return normalized;
}

function nextDueFor(
  input: {
    frequency: string;
    lastUpdated?: string;
    customDays?: number;
  },
  config: LinksConfig,
): string | undefined {
  return (
    computeNextDue(input.lastUpdated, input.frequency, input.customDays, config.frequencies) ??
    undefined
  );
}

async function serialNext(ctx: MutationCtx): Promise<number> {
  const last = await ctx.db.query("link_item").withIndex("by_serial").order("desc").first();
  return (last?.serial ?? 0) + 1;
}

async function categoryItems(ctx: QueryCtx | MutationCtx, categoryId: Id<"link_category">) {
  return ctx.db
    .query("link_item")
    .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
    .collect();
}

async function urlsOf(ctx: QueryCtx | MutationCtx, itemId: Id<"link_item">) {
  return ctx.db
    .query("link_url")
    .withIndex("by_item_position", (q) => q.eq("itemId", itemId))
    .collect();
}

async function nextSortOrder(
  ctx: MutationCtx,
  categoryId: Id<"link_category">,
): Promise<number> {
  const rows = await categoryItems(ctx, categoryId);
  return rows.reduce((max, row) => Math.max(max, row.sortOrder ?? 0), 0) + 1;
}

async function serialize(
  ctx: QueryCtx | MutationCtx,
  item: Doc<"link_item">,
  category: Doc<"link_category"> | null,
  owner: Doc<"link_owner"> | null,
  config: LinksConfig,
) {
  const urls = await urlsOf(ctx, item._id);
  return {
    id: String(item._id),
    serial: item.serial,
    categoryId: String(item.categoryId),
    categoryName: category?.name ?? "Uncategorised",
    categoryColour: category?.colour ?? "slate",
    title: item.title,
    description: item.description ?? null,
    frequency: item.frequency,
    customDays: item.customDays ?? null,
    lastUpdated: item.lastUpdated ?? null,
    nextDue: item.nextDue ?? null,
    ownerId: item.ownerId ? String(item.ownerId) : null,
    ownerName: owner?.name ?? null,
    level: item.level ?? null,
    status: item.status,
    remarks: item.remarks ?? null,
    tags: item.tags ?? [],
    visibility: item.visibility,
    pinned: item.pinned === true,
    sortOrder: item.sortOrder,
    archivedAt: item.archivedAt ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    urls: urls
      .sort((a, b) => a.position - b.position)
      .map((u) => ({
        id: String(u._id),
        label: u.label,
        url: u.url,
        type: u.type,
        kind: u.kind,
        isPrimary: u.isPrimary,
        position: u.position,
        lastCheck: u.lastCheck ?? null,
        checkStatus: u.checkStatus ?? null,
      })),
    due: computeDueState(
      {
        frequency: item.frequency,
        lastUpdated: item.lastUpdated,
        status: item.status,
        archivedAt: item.archivedAt,
        customDays: item.customDays,
      },
      istToday(),
      config,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

export const list = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    const role = linkRole(me.appRole);
    const config = await configOf(ctx);
    const [categories, owners, itemRows] = await Promise.all([
      ctx.db.query("link_category").withIndex("by_order").collect(),
      ctx.db.query("link_owner").withIndex("by_name").collect(),
      ctx.db.query("link_item").withIndex("by_serial").collect(),
    ]);
    const visible = itemRows.filter((item) =>
      canSeeLink(item.visibility, role),
    );
    const categoryById = new Map(categories.map((c) => [String(c._id), c]));
    const ownerById = new Map(owners.map((o) => [String(o._id), o]));
    const items = await Promise.all(
      visible.map((item) =>
        serialize(
          ctx,
          item,
          categoryById.get(String(item.categoryId)) ?? null,
          item.ownerId ? ownerById.get(String(item.ownerId)) ?? null : null,
          config,
        ),
      ),
    );
    const activeItems = items.filter((item) => !item.archivedAt);
    const updatedAt = items.reduce((max, item) => Math.max(max, item.updatedAt), 0) || null;
    return {
      me: {
        id: String(me._id),
        name: me.name ?? me.email ?? "Signed-in user",
        appRole: me.appRole ?? null,
        role,
        canEdit: canEditLinks(role),
        isAdmin: role === "admin",
      },
      config,
      categories: categories.map((c) => ({
        id: String(c._id),
        name: c.name,
        colour: c.colour,
        icon: c.icon ?? null,
        order: c.order,
        active: c.active,
      })),
      owners: owners.map((o) => ({
        id: String(o._id),
        name: o.name,
        active: o.active,
      })),
      items,
      meta: {
        dataAsOf: updatedAt,
        total: activeItems.length,
        due: activeItems.filter((item) => item.due.state === "due-soon").length,
        overdue: activeItems.filter((item) => item.due.state === "overdue" || item.due.state === "never").length,
      },
    };
  },
});

/** Lightweight palette list — titles only, visibility-filtered on the server. */
export const palette = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    const role = linkRole(me.appRole);
    const [categories, items] = await Promise.all([
      ctx.db.query("link_category").withIndex("by_order").collect(),
      ctx.db.query("link_item").withIndex("by_serial").collect(),
    ]);
    const byId = new Map(categories.map((c) => [String(c._id), c.name]));
    return items
      .filter((item) => !item.archivedAt && canSeeLink(item.visibility, role))
      .map((item) => ({
        id: String(item._id),
        title: item.title,
        categoryName: byId.get(String(item.categoryId)) ?? "Uncategorised",
        serial: item.serial,
      }));
  },
});

/** Bell feed: the same visible rows the page's Overdue/Due soon chips show. */
export const reminders = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    const role = linkRole(me.appRole);
    const prefs = (me.notifications ?? {}) as Record<string, unknown>;
    if (prefs.linksDueInApp === false) {
      return { items: [], count: 0, dueSoon: 0, overdue: 0, sidebarBadge: false };
    }
    const config = await configOf(ctx);
    const [categories, owners, items] = await Promise.all([
      ctx.db.query("link_category").withIndex("by_order").collect(),
      ctx.db.query("link_owner").withIndex("by_name").collect(),
      ctx.db.query("link_item").withIndex("by_next_due").collect(),
    ]);
    // Admin → "Bell notifications": "owners" narrows the feed to rows the
    // signed-in person owns; a user matching no owner falls back to all.
    const scope = linkReminderScope(
      config,
      { name: me.name, email: me.email },
      owners.map((o) => ({ name: o.name })),
    );
    const ownerNameById = new Map(owners.map((o) => [String(o._id), o.name]));
    const inScope = (item: { ownerId?: Id<"link_owner"> | null }): boolean => {
      if (scope.mode === "all") return true;
      const name = item.ownerId ? ownerNameById.get(String(item.ownerId)) : undefined;
      return !!name && scope.names.includes(name.trim().toLowerCase());
    };
    const categoryById = new Map(categories.map((c) => [String(c._id), c.name]));
    const alerts = items
      .filter((item) => !item.archivedAt && canSeeLink(item.visibility, role) && inScope(item))
      .map((item) => ({
        id: String(item._id),
        title: item.title,
        categoryName: categoryById.get(String(item.categoryId)) ?? "Uncategorised",
        due: computeDueState(
          {
            frequency: item.frequency,
            lastUpdated: item.lastUpdated,
            status: item.status,
            archivedAt: item.archivedAt,
            customDays: item.customDays,
          },
          istToday(),
          config,
        ),
      }))
      .filter((item) => item.due.state === "overdue" || item.due.state === "never" || item.due.state === "due-soon")
      .sort((a, b) => (a.due.days ?? 9999) - (b.due.days ?? 9999));
    return {
      items: alerts.slice(0, 20).map((a) => ({
        ...a,
        dueLabel: dueStateLabel(a.due, config),
        nextDueLabel: formatLinkDate(a.due.nextDue),
      })),
      count: alerts.length,
      dueSoon: alerts.filter((a) => a.due.state === "due-soon").length,
      overdue: alerts.filter((a) => a.due.state === "overdue" || a.due.state === "never").length,
      sidebarBadge: config.sidebarBadge,
    };
  },
});

export const auditFor = query({
  args: { id: v.id("link_item") },
  handler: async (ctx, { id }) => {
    const me = await requireActivatedUser(ctx);
    await requireVisibleItem(ctx, me, id);
    const rows = await ctx.db
      .query("auditLogs")
      .withIndex("by_record", (q) => q.eq("table", "link_item").eq("recordId", String(id)))
      .order("desc")
      .collect();
    return rows.slice(0, 60).map((r) => ({
      id: String(r._id),
      action: r.action,
      field: r.field ?? null,
      oldValue: r.oldValue ?? null,
      newValue: r.newValue ?? null,
      changedByName: r.changedByName ?? null,
      changedAt: r.changedAt,
      source: r.source ?? null,
    }));
  },
});

export const updateLog = query({
  args: { id: v.id("link_item") },
  handler: async (ctx, { id }) => {
    const me = await requireActivatedUser(ctx);
    await requireVisibleItem(ctx, me, id);
    return ctx.db
      .query("link_update_log")
      .withIndex("by_item_time", (q) => q.eq("itemId", id))
      .order("desc")
      .collect();
  },
});

/* -------------------------------------------------------------------------- */
/* Config                                                                      */
/* -------------------------------------------------------------------------- */

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    let categories = await ctx.db.query("link_category").withIndex("by_order").collect();
    let owners = await ctx.db.query("link_owner").withIndex("by_name").collect();
    let created = 0;
    if (categories.length === 0) {
      for (let i = 0; i < DEFAULT_LINK_CATEGORIES.length; i += 1) {
        const c = DEFAULT_LINK_CATEGORIES[i];
        await ctx.db.insert("link_category", {
          name: c.name,
          colour: c.colour,
          icon: c.icon,
          order: i,
          active: true,
          createdBy: me._id,
          createdAt: Date.now(),
        });
        created += 1;
      }
      categories = await ctx.db.query("link_category").withIndex("by_order").collect();
    }
    if (owners.length === 0) {
      for (const name of DEFAULT_LINK_OWNERS) {
        await ctx.db.insert("link_owner", {
          name,
          active: true,
          createdBy: me._id,
          createdAt: Date.now(),
        });
        created += 1;
      }
      owners = await ctx.db.query("link_owner").withIndex("by_name").collect();
    }
    const configRow = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "linksConfig"))
      .first();
    if (!configRow) {
      await ctx.db.insert("appSettings", { key: "linksConfig", value: DEFAULT_LINKS_CONFIG });
      created += 1;
    }
    if (created > 0) {
      await ctx.db.insert("auditLogs", {
        table: "link_item",
        recordId: "links-config",
        action: "seed",
        field: "Links Organiser defaults",
        newValue: `${categories.length} categories · ${owners.length} owners · default config`,
        changedBy: me._id,
        changedByName: me.name ?? me.email ?? "Signed-in user",
        changedAt: Date.now(),
        source: "Links Organiser",
      });
    }
    return { categories: categories.length, owners: owners.length, created };
  },
});

export const saveConfig = mutation({
  args: { value: v.any() },
  handler: async (ctx, { value }) => {
    const me = await requireActivatedUser(ctx);
    assertAdmin(me);
    const next = normalizeLinksConfig(value);
    if (!DEFAULT_LINK_STATUSES.every((s) => next.statuses.some((n) => n.name === s.name))) {
      throw new Error("Keep the four default statuses (Active, Completed, On hold, Archived)");
    }
    if (!next.statuses.some((s) => s.countsAsOpen)) {
      throw new Error("At least one status must count as open");
    }
    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "linksConfig"))
      .first();
    const old = existing?.value;
    if (existing) await ctx.db.patch(existing._id, { value: next });
    else await ctx.db.insert("appSettings", { key: "linksConfig", value: next });
    await ctx.db.insert("auditLogs", {
      table: "appSettings",
      recordId: "linksConfig",
      action: "update",
      field: "Links config",
      oldValue: old ?? "(default)",
      newValue: next,
      changedBy: me._id,
      changedByName: me.name ?? me.email ?? "Signed-in user",
      changedAt: Date.now(),
      source: "Links Organiser",
    });
    return next;
  },
});

export const saveCategory = mutation({
  args: {
    id: v.optional(v.id("link_category")),
    name: v.string(),
    colour: v.string(),
    icon: v.optional(v.string()),
    order: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertAdmin(me);
    const name = args.name.trim().slice(0, 60);
    if (!name) throw new Error("Category name is required");
    if (!["teal", "blue", "violet", "amber", "rose", "emerald", "slate"].includes(args.colour)) {
      throw new Error("Choose a colour");
    }
    const existing = await ctx.db.query("link_category").withIndex("by_name").collect();
    const clash = existing.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && String(c._id) !== String(args.id),
    );
    if (clash) throw new Error(`Category “${clash.name}” already exists`);
    if (args.id) {
      const before = await ctx.db.get(args.id);
      if (!before) throw new Error("Category not found");
      await ctx.db.patch(args.id, {
        name,
        colour: args.colour,
        icon: args.icon,
        order: args.order ?? before.order,
        active: args.active ?? before.active,
      });
      await bindingAudit(ctx, me, String(args.id), "link_category", "update", before, {
        ...before,
        name,
        colour: args.colour,
        icon: args.icon,
        order: args.order ?? before.order,
        active: args.active ?? before.active,
      });
      return args.id;
    }
    const id = await ctx.db.insert("link_category", {
      name,
      colour: args.colour,
      icon: args.icon,
      order: args.order ?? existing.length,
      active: args.active ?? true,
      createdBy: me._id,
      createdAt: Date.now(),
    });
    await bindingAudit(ctx, me, String(id), "link_category", "create", null, { name, colour: args.colour });
    return id;
  },
});

export const saveOwner = mutation({
  args: {
    id: v.optional(v.id("link_owner")),
    name: v.string(),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertAdmin(me);
    const name = args.name.trim().slice(0, 60);
    if (!name) throw new Error("Owner name is required");
    const existing = await ctx.db.query("link_owner").withIndex("by_name").collect();
    const clash = existing.find(
      (o) => o.name.toLowerCase() === name.toLowerCase() && String(o._id) !== String(args.id),
    );
    if (clash) throw new Error(`Owner “${clash.name}” already exists`);
    if (args.id) {
      const before = await ctx.db.get(args.id);
      if (!before) throw new Error("Owner not found");
      const next = { active: args.active ?? before.active, name };
      await ctx.db.patch(args.id, next);
      await bindingAudit(ctx, me, String(args.id), "link_owner", "update", before, { ...before, ...next });
      return args.id;
    }
    const id = await ctx.db.insert("link_owner", {
      name,
      active: args.active ?? true,
      createdBy: me._id,
      createdAt: Date.now(),
    });
    await bindingAudit(ctx, me, String(id), "link_owner", "create", null, { name });
    return id;
  },
});

async function bindingAudit(
  ctx: MutationCtx,
  me: AppUser,
  recordId: string,
  table: string,
  action: string,
  oldValue: unknown,
  newValue: unknown,
) {
  await ctx.db.insert("auditLogs", {
    table,
    recordId,
    action,
    field: table === "link_category" ? "Category" : "Owner",
    oldValue: oldValue === null ? undefined : oldValue,
    newValue,
    changedBy: me._id,
    changedByName: me.name ?? me.email ?? "Signed-in user",
    changedAt: Date.now(),
    source: "Links Organiser",
  });
}

/* -------------------------------------------------------------------------- */
/* Item writes                                                                 */
/* -------------------------------------------------------------------------- */

export const createLink = mutation({
  args: {
    /** Optional: the quick-add draft may save without forcing a suggestion. */
    categoryId: v.optional(v.id("link_category")),
    title: v.string(),
    description: v.optional(v.string()),
    frequency: v.string(),
    customDays: v.optional(v.number()),
    lastUpdated: v.optional(v.string()),
    ownerId: v.optional(v.id("link_owner")),
    level: v.optional(v.string()),
    status: v.string(),
    remarks: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    visibility: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
    urls: v.array(urlInput),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const config = await configOf(ctx);
    let category = args.categoryId ? await ctx.db.get(args.categoryId) : null;
    if (args.categoryId && (!category || !category.active)) {
      throw new Error("Choose an active category");
    }
    if (!category) {
      const rows = await ctx.db.query("link_category").withIndex("by_order").collect();
      category = rows.find((c) => c.name.toLowerCase() === "unsorted" && c.active) ?? null;
      if (!category) {
        const id = await ctx.db.insert("link_category", {
          name: "Unsorted",
          colour: "slate",
          icon: "Circle",
          order: rows.length,
          active: true,
          createdBy: me._id,
          createdAt: Date.now(),
        });
        category = await ctx.db.get(id);
      }
    }
    if (!category) throw new Error("Could not create the draft category");
    const categoryId = category._id;
    const title = cleanText(args.title, 200);
    if (!title) throw new Error("Report name is required");
    if (!config.frequencies.some((f) => f.value === args.frequency)) {
      throw new Error("Choose a frequency");
    }
    if (!config.statuses.some((s) => s.name === args.status)) throw new Error("Choose a status");
    const visibility = ["everyone", "editors", "admin"].includes(args.visibility ?? "")
      ? (args.visibility as string)
      : config.defaultVisibility;
    const lastUpdated = validateDate(args.lastUpdated);
    const urls = validateUrls(args.urls);
    const nextDue = nextDueFor(
      { frequency: args.frequency, lastUpdated, customDays: args.customDays },
      config,
    );
    const serial = await serialNext(ctx);
    const sortOrder = await nextSortOrder(ctx, categoryId);
    const now = Date.now();
    const id = await ctx.db.insert("link_item", {
      serial,
      categoryId,
      title,
      description: cleanText(args.description, 500),
      frequency: args.frequency,
      customDays: args.customDays,
      lastUpdated,
      nextDue,
      ownerId: args.ownerId,
      level: args.level && LINK_LEVELS.includes(args.level as never) ? args.level : undefined,
      status: args.status,
      remarks: cleanText(args.remarks, 500),
      tags: (args.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 12),
      visibility,
      pinned: args.pinned === true,
      sortOrder,
      createdBy: me._id,
      createdAt: now,
      updatedBy: me._id,
      updatedAt: now,
    });
    for (const u of urls) {
      await ctx.db.insert("link_url", { itemId: id, ...u });
    }
    await audit(ctx, me, String(id), "create", "Link", undefined, {
      ...args,
      categoryId,
      title,
      serial,
      urls,
      nextDue: nextDue ?? null,
    });
    return { id: String(id), serial };
  },
});

export const updateLink = mutation({
  args: {
    id: v.id("link_item"),
    categoryId: v.id("link_category"),
    title: v.string(),
    description: v.optional(v.string()),
    frequency: v.string(),
    customDays: v.optional(v.number()),
    lastUpdated: v.optional(v.string()),
    ownerId: v.optional(v.id("link_owner")),
    level: v.optional(v.string()),
    status: v.string(),
    remarks: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    visibility: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
    urls: v.array(urlInput),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const item = await requireVisibleItem(ctx, me, args.id);
    if (!canEditLinks(linkRole(me.appRole))) throw new Error("Viewers cannot edit links");
    const config = await configOf(ctx);
    const title = cleanText(args.title, 200);
    if (!title) throw new Error("Report name is required");
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Category not found");
    if (!config.frequencies.some((f) => f.value === args.frequency)) throw new Error("Choose a frequency");
    if (!config.statuses.some((s) => s.name === args.status)) throw new Error("Choose a status");
    const lastUpdated = validateDate(args.lastUpdated);
    const urls = validateUrls(args.urls);
    const visibility = ["everyone", "editors", "admin"].includes(args.visibility ?? "")
      ? (args.visibility as string)
      : item.visibility;
    const beforeUrls = await urlsOf(ctx, item._id);
    const before = { ...item, urls: beforeUrls };
    const nextDue = nextDueFor(
      { frequency: args.frequency, lastUpdated, customDays: args.customDays },
      config,
    );
    const patch = {
      categoryId: args.categoryId,
      title,
      description: cleanText(args.description, 500),
      frequency: args.frequency,
      customDays: args.customDays,
      lastUpdated,
      nextDue,
      ownerId: args.ownerId,
      level: args.level && LINK_LEVELS.includes(args.level as never) ? args.level : undefined,
      status: args.status,
      remarks: cleanText(args.remarks, 500),
      tags: (args.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 12),
      visibility,
      pinned: args.pinned === true,
      updatedBy: me._id,
      updatedAt: Date.now(),
    };
    await ctx.db.patch(item._id, patch);
    // Replace the link set in one transaction. Deleted URLs disappear; a
    // stable id is not needed because links are always edited as a set.
    for (const u of beforeUrls) await ctx.db.delete(u._id);
    for (const u of urls) await ctx.db.insert("link_url", { itemId: item._id, ...u });
    const after = { ...item, ...patch, urls };
    await audit(ctx, me, String(item._id), "update", "Link", before, after);
    return { id: String(item._id), serial: item.serial };
  },
});

export const markUpdated = mutation({
  args: {
    id: v.id("link_item"),
    date: v.optional(v.string()),
    periodNote: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const item = await requireVisibleItem(ctx, me, args.id);
    const config = await configOf(ctx);
    const date = validateDate(args.date ?? istToday());
    if (!date) throw new Error("Choose the date it was updated");
    const period = cleanText(args.periodNote, 120);
    const note = cleanText(args.note, 300);
    const nextDue = nextDueFor(
      { frequency: item.frequency, lastUpdated: date, customDays: item.customDays },
      config,
    );
    const before = { ...item };
    const patch: Record<string, unknown> = {
      lastUpdated: date,
      nextDue,
      updatedBy: me._id,
      updatedAt: Date.now(),
    };
    if (period) patch.remarks = period;
    await ctx.db.patch(item._id, patch);
    const logId = await ctx.db.insert("link_update_log", {
      itemId: item._id,
      updatedOn: date,
      updatedBy: me._id,
      updatedByName: me.name ?? me.email ?? "Signed-in user",
      periodNote: period,
      note,
      createdAt: Date.now(),
    });
    await audit(ctx, me, String(item._id), "update", "Marked updated", before, { ...before, ...patch });
    return {
      id: String(item._id),
      logId: String(logId),
      lastUpdated: date,
      nextDue: nextDue ?? null,
      remarks: period ?? item.remarks ?? null,
      previous: {
        lastUpdated: item.lastUpdated ?? null,
        nextDue: item.nextDue ?? null,
        remarks: item.remarks ?? null,
      },
    };
  },
});

export const undoMarkUpdated = mutation({
  args: {
    id: v.id("link_item"),
    lastUpdated: v.optional(v.string()),
    nextDue: v.optional(v.string()),
    remarks: v.optional(v.string()),
    logId: v.optional(v.id("link_update_log")),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const item = await requireVisibleItem(ctx, me, args.id);
    const before = { ...item };
    await ctx.db.patch(args.id, {
      lastUpdated: args.lastUpdated,
      nextDue: args.nextDue,
      remarks: args.remarks,
      updatedBy: me._id,
      updatedAt: Date.now(),
    });
    if (args.logId) {
      const log = await ctx.db.get(args.logId);
      if (log && String(log.itemId) === String(args.id)) await ctx.db.delete(args.logId);
    }
    await audit(ctx, me, String(args.id), "update", "Undo mark updated", before, {
      ...before,
      lastUpdated: args.lastUpdated,
      nextDue: args.nextDue,
      remarks: args.remarks,
    });
    return { restored: true };
  },
});

export const setStatus = mutation({
  args: { id: v.id("link_item"), status: v.string() },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const item = await requireVisibleItem(ctx, me, args.id);
    const config = await configOf(ctx);
    if (!config.statuses.some((s) => s.name === args.status)) throw new Error("Choose a known status");
    const before = { ...item };
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedBy: me._id,
      updatedAt: Date.now(),
      ...(args.status === "Archived"
        ? { archivedAt: Date.now(), archivedBy: me._id }
        : item.archivedAt
          ? { archivedAt: undefined }
          : {}),
    });
    await audit(ctx, me, String(args.id), "update", "Status", before, {
      ...before,
      status: args.status,
    });
    return { status: args.status };
  },
});

export const setPinned = mutation({
  args: { id: v.id("link_item"), pinned: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const item = await requireVisibleItem(ctx, me, args.id);
    await ctx.db.patch(args.id, { pinned: args.pinned, updatedBy: me._id, updatedAt: Date.now() });
    await audit(ctx, me, String(args.id), "update", "Pinned", { pinned: item.pinned ?? false }, { pinned: args.pinned });
    return { pinned: args.pinned };
  },
});

export const archiveLink = mutation({
  args: { id: v.id("link_item") },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const item = await requireVisibleItem(ctx, me, args.id);
    if (item.archivedAt) return { archived: true };
    const before = { ...item };
    await ctx.db.patch(args.id, {
      archivedAt: Date.now(),
      archivedBy: me._id,
      status: "Archived",
      updatedBy: me._id,
      updatedAt: Date.now(),
    });
    await audit(ctx, me, String(args.id), "delete", "Archived", before, { ...before, archivedAt: Date.now(), status: "Archived" });
    return { archived: true };
  },
});

export const restoreLink = mutation({
  args: { id: v.id("link_item") },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Link not found");
    if (!canSeeLink(item.visibility, linkRole(me.appRole))) throw new Error("Link not found");
    const before = { ...item };
    await ctx.db.patch(args.id, {
      archivedAt: undefined,
      archivedBy: undefined,
      status: item.status === "Archived" ? "Active" : item.status,
      updatedBy: me._id,
      updatedAt: Date.now(),
    });
    await audit(ctx, me, String(args.id), "update", "Restored", before, {
      ...before,
      archivedAt: null,
      status: item.status === "Archived" ? "Active" : item.status,
    });
    return { restored: true };
  },
});

export const deleteLinkPermanently = mutation({
  args: { id: v.id("link_item") },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertAdmin(me);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Link not found");
    const before = { ...item, urls: await urlsOf(ctx, args.id) };
    await audit(ctx, me, String(args.id), "delete", "Permanent delete", before, undefined);
    for (const u of await urlsOf(ctx, args.id)) await ctx.db.delete(u._id);
    const logs = await ctx.db
      .query("link_update_log")
      .withIndex("by_item", (q) => q.eq("itemId", args.id))
      .collect();
    for (const log of logs) await ctx.db.delete(log._id);
    await ctx.db.delete(args.id);
    return { deleted: true };
  },
});

export const duplicateLink = mutation({
  args: { id: v.id("link_item") },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const item = await requireVisibleItem(ctx, me, args.id);
    const urls = await urlsOf(ctx, args.id);
    const serial = await serialNext(ctx);
    const now = Date.now();
    const nextDue = nextDueFor(
      { frequency: item.frequency, lastUpdated: item.lastUpdated, customDays: item.customDays },
      await configOf(ctx),
    );
    const id = await ctx.db.insert("link_item", {
      serial,
      categoryId: item.categoryId,
      title: `${item.title} (copy)`.slice(0, 200),
      description: item.description,
      frequency: item.frequency,
      customDays: item.customDays,
      lastUpdated: item.lastUpdated,
      nextDue,
      ownerId: item.ownerId,
      level: item.level,
      status: item.status === "Archived" ? "Active" : item.status,
      remarks: item.remarks,
      tags: item.tags,
      visibility: item.visibility,
      pinned: false,
      sortOrder: await nextSortOrder(ctx, item.categoryId),
      createdBy: me._id,
      createdAt: now,
      updatedBy: me._id,
      updatedAt: now,
    });
    for (const u of urls) {
      await ctx.db.insert("link_url", {
        itemId: id,
        label: u.label,
        url: u.url,
        type: u.type,
        isPrimary: u.isPrimary,
        position: u.position,
        kind: u.kind,
      });
    }
    await audit(ctx, me, String(id), "create", "Duplicated", undefined, { from: item.title, title: `${item.title} (copy)` });
    return { id: String(id), serial };
  },
});

/** One small in-place edit from the table (Enter saves, Tab moves on). */
export const patchLinkField = mutation({
  args: {
    id: v.id("link_item"),
    field: v.union(
      v.literal("category"),
      v.literal("owner"),
      v.literal("frequency"),
      v.literal("status"),
      v.literal("remarks"),
      v.literal("lastUpdated"),
    ),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const item = await requireVisibleItem(ctx, me, args.id);
    const config = await configOf(ctx);
    const before = { ...item };
    const patch: Record<string, unknown> = { updatedBy: me._id, updatedAt: Date.now() };
    const value = args.value.trim();
    if (args.field === "category") {
      const category = await ctx.db.get(value as Id<"link_category">);
      if (!category || !category.active) throw new Error("Choose an active category");
      patch.categoryId = category._id;
    } else if (args.field === "owner") {
      if (value) {
        const owner = await ctx.db.get(value as Id<"link_owner">);
        if (!owner || !owner.active) throw new Error("Choose an active owner");
        patch.ownerId = owner._id;
      } else {
        patch.ownerId = undefined;
      }
    } else if (args.field === "frequency") {
      if (!config.frequencies.some((f) => f.value === value)) throw new Error("Choose a known frequency");
      patch.frequency = value;
      patch.nextDue = nextDueFor(
        { frequency: value, lastUpdated: item.lastUpdated, customDays: item.customDays },
        config,
      );
    } else if (args.field === "status") {
      if (!config.statuses.some((s) => s.name === value)) throw new Error("Choose a known status");
      patch.status = value;
      if (value === "Archived") patch.archivedAt = Date.now();
    } else if (args.field === "remarks") {
      patch.remarks = cleanText(value, 500);
    } else {
      const date = validateDate(value || undefined);
      patch.lastUpdated = date;
      patch.nextDue = nextDueFor(
        { frequency: item.frequency, lastUpdated: date, customDays: item.customDays },
        config,
      );
    }
    await ctx.db.patch(item._id, patch);
    await audit(ctx, me, String(item._id), "update", args.field, before, {
      ...before,
      ...patch,
    });
    return { ok: true as const };
  },
});

/** Non-destructive merge: copy the links to the kept row and archive the
 *  others. Undo = restoreLink, so nothing is silently destroyed. */
export const mergeLinks = mutation({
  args: {
    keepId: v.id("link_item"),
    otherIds: v.array(v.id("link_item")),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const keep = await requireVisibleItem(ctx, me, args.keepId);
    const others = await Promise.all(args.otherIds.map((id) => requireVisibleItem(ctx, me, id)));
    if (others.some((item) => String(item._id) === String(keep._id))) {
      throw new Error("Keep one row and merge the others");
    }
    const config = await configOf(ctx);
    const keepUrls = await urlsOf(ctx, keep._id);
    const all = [keep, ...others];
    const newest = all.reduce(
      (best, item) => ((item.lastUpdated ?? "") > (best.lastUpdated ?? "") ? item : best),
      keep,
    );
    const seen = new Set(keepUrls.map((u) => normalizeLinkUrl(u.url)));
    let position = keepUrls.reduce((max, u) => Math.max(max, u.position), -1) + 1;
    for (const item of others) {
      for (const url of await urlsOf(ctx, item._id)) {
        const normalized = normalizeLinkUrl(url.url);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        await ctx.db.insert("link_url", {
          itemId: keep._id,
          label: url.label,
          url: url.url,
          type: url.type,
          kind: url.kind,
          isPrimary: false,
          position: position++,
        });
      }
    }
    const lastUpdated = newest.lastUpdated ?? keep.lastUpdated;
    const nextDue = nextDueFor(
      { frequency: keep.frequency, lastUpdated, customDays: keep.customDays },
      config,
    );
    await ctx.db.patch(keep._id, {
      lastUpdated,
      nextDue,
      tags: [...new Set(all.flatMap((item) => item.tags ?? []))].slice(0, 12),
      updatedBy: me._id,
      updatedAt: Date.now(),
    });
    for (const item of others) {
      await ctx.db.patch(item._id, {
        archivedAt: Date.now(),
        archivedBy: me._id,
        status: "Archived",
        updatedBy: me._id,
        updatedAt: Date.now(),
      });
    }
    await audit(ctx, me, String(keep._id), "update", "Merged duplicates", all, {
      keepId: String(keep._id),
      archived: others.map((item) => String(item._id)),
      lastUpdated,
    });
    return {
      keptId: String(keep._id),
      archivedIds: others.map((item) => String(item._id)),
    };
  },
});

/** Completed quarter report → the next period's row, same links. */
export const rollForwardLink = mutation({
  args: { id: v.id("link_item") },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const item = await requireVisibleItem(ctx, me, args.id);
    const today = istToday();
    if (!canRollForward(item, today)) {
      throw new Error("This quarter is not closed yet, or the row is not Completed");
    }
    const period = quarterPeriodOf(item);
    if (!period) throw new Error("No quarter period found in the title or remarks");
    const next = nextQuarterPeriod(period);
    const urls = await urlsOf(ctx, item._id);
    const serial = await serialNext(ctx);
    const now = Date.now();
    const title = advanceQuarterText(item.title, period)?.slice(0, 200) ?? item.title;
    const remarks = advanceQuarterText(item.remarks, period)?.slice(0, 500);
    const status = configStatus(ctx, "Active");
    const id = await ctx.db.insert("link_item", {
      serial,
      categoryId: item.categoryId,
      title,
      description: item.description,
      frequency: item.frequency,
      customDays: item.customDays,
      ownerId: item.ownerId,
      level: item.level,
      status: await status,
      remarks,
      tags: item.tags,
      visibility: item.visibility,
      pinned: false,
      sortOrder: await nextSortOrder(ctx, item.categoryId),
      createdBy: me._id,
      createdAt: now,
      updatedBy: me._id,
      updatedAt: now,
    });
    for (const url of urls) {
      await ctx.db.insert("link_url", {
        itemId: id,
        label: url.label,
        url: url.url,
        type: url.type,
        isPrimary: url.isPrimary,
        position: url.position,
        kind: url.kind,
      });
    }
    await audit(ctx, me, String(id), "create", "Roll forward", undefined, {
      from: String(item._id),
      title,
      period: next.text,
      lastUpdated: null,
    });
    return { id: String(id), serial, title, period: next.text };
  },
});

/** First configured status matching `name`, never a hard-coded label. */
async function configStatus(ctx: MutationCtx, name: string): Promise<string> {
  const config = await configOf(ctx);
  return config.statuses.find((s) => s.name === name)?.name ?? config.statuses[0].name;
}

export const reorderLinks = mutation({
  args: { ids: v.array(v.id("link_item")) },
  handler: async (ctx, { ids }) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const items: Doc<"link_item">[] = [];
    for (const id of ids) items.push(await requireVisibleItem(ctx, me, id));
    const now = Date.now();
    for (let i = 0; i < items.length; i += 1) {
      await ctx.db.patch(items[i]._id, { sortOrder: i, updatedBy: me._id, updatedAt: now });
    }
    await audit(ctx, me, "links-order", "update", "Manual order", undefined, ids.map(String));
    return { reordered: ids.length };
  },
});

/* -------------------------------------------------------------------------- */
/* Import                                                                      */
/* -------------------------------------------------------------------------- */

const importRowInput = v.object({
  rowNo: v.number(),
  serial: v.optional(v.number()),
  title: v.string(),
  categoryName: v.string(),
  ownerName: v.optional(v.string()),
  level: v.optional(v.string()),
  frequency: v.string(),
  customDays: v.optional(v.number()),
  lastUpdated: v.optional(v.string()),
  status: v.string(),
  remarks: v.optional(v.string()),
  visibility: v.optional(v.string()),
  existingId: v.optional(v.string()),
  links: v.array(
    v.object({
      label: v.string(),
      url: v.string(),
      type: v.string(),
      kind: v.string(),
      isPrimary: v.boolean(),
    }),
  ),
});

async function ensureCategory(
  ctx: MutationCtx,
  me: AppUser,
  name: string,
): Promise<Doc<"link_category">> {
  const rows = await ctx.db.query("link_category").withIndex("by_name").collect();
  const found = rows.find((r) => r.name.toLowerCase() === name.trim().toLowerCase());
  if (found) return found;
  const id = await ctx.db.insert("link_category", {
    name: name.trim().slice(0, 60) || "Uncategorised",
    colour: ["teal", "blue", "violet", "amber", "rose"][rows.length % 5],
    order: rows.length,
    active: true,
    createdBy: me._id,
    createdAt: Date.now(),
  });
  return (await ctx.db.get(id))!;
}

async function ensureOwner(ctx: MutationCtx, me: AppUser, name: string) {
  const clean = name.trim();
  if (!clean) return null;
  const rows = await ctx.db.query("link_owner").withIndex("by_name").collect();
  const found = rows.find((r) => r.name.toLowerCase() === clean.toLowerCase());
  if (found) return found;
  const id = await ctx.db.insert("link_owner", {
    name: clean.slice(0, 60),
    active: true,
    createdBy: me._id,
    createdAt: Date.now(),
  });
  return await ctx.db.get(id);
}

export const applyImport = mutation({
  args: {
    fileName: v.string(),
    mode: v.union(v.literal("add"), v.literal("update")),
    rows: v.array(importRowInput),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const config = await configOf(ctx);
    const batchId = await ctx.db.insert("importBatches", {
      kind: "links",
      fileName: args.fileName.slice(0, 180) || "links paste",
      status: "applied",
      rowsTotal: args.rows.length,
      rowsUpdated: 0,
      rowsNoChange: 0,
      rowsSkipped: 0,
      rowsFailed: 0,
      importedBy: me._id,
      importedByName: me.name ?? me.email ?? "Signed-in user",
      importedAt: Date.now(),
    });
    let updated = 0;
    let noChange = 0;
    let skipped = 0;
    let failed = 0;
    let nextSerial = await serialNext(ctx);
    const now = Date.now();

    for (const row of args.rows) {
      const title = row.title.trim().slice(0, 200);
      const category = title ? await ensureCategory(ctx, me, row.categoryName) : null;
      const owner = row.ownerName ? await ensureOwner(ctx, me, row.ownerName) : null;
      const safeLinks = row.links.filter((l) => validateLinkUrl(l.url).ok);
      if (!title || !category || safeLinks.length === 0) {
        skipped += 1;
        await ctx.db.insert("importRows", {
          batchId,
          rowNo: row.rowNo,
          matchMethod: "none",
          confidence: 0,
          decision: "skip",
          result: "skipped",
          error: !title
            ? "Report name is required"
            : !category
              ? "Category is required"
              : "No safe link",
          raw: row,
        });
        continue;
      }
      const status = config.statuses.some((s) => s.name === row.status)
        ? row.status
        : config.statuses[0].name;
      const frequency = config.frequencies.some((f) => f.value === row.frequency)
        ? row.frequency
        : "one-time";
      const lastUpdated = row.lastUpdated && /^\d{4}-\d{2}-\d{2}$/.test(row.lastUpdated)
        ? row.lastUpdated
        : undefined;
      if (lastUpdated && lastUpdated > istToday()) {
        failed += 1;
        await ctx.db.insert("importRows", {
          batchId,
          rowNo: row.rowNo,
          matchMethod: "none",
          confidence: 0,
          decision: "skip",
          result: "failed",
          error: "Last updated cannot be in the future",
          raw: row,
        });
        continue;
      }
      const urls = validateUrls(
        safeLinks.map((l) => ({
          label: l.label,
          url: l.url,
          kind: l.kind,
          isPrimary: l.isPrimary,
          type: l.type,
        })),
      );
      const nextDue = nextDueFor(
        { frequency, lastUpdated, customDays: row.customDays },
        config,
      );
      const normalizedUrls = urls.map((u) => ({ ...u, url: normalizeLinkUrl(u.url) }));
      const categoryId = category._id;
      const serialLookup = row.serial;

      let existing: Doc<"link_item"> | undefined;
      if (args.mode === "update") {
        if (serialLookup != null) {
          existing =
            (await ctx.db
              .query("link_item")
              .withIndex("by_serial", (q) => q.eq("serial", serialLookup))
              .first()) ?? undefined;
        }
        if (!existing) {
          const sameCategory = await categoryItems(ctx, categoryId);
          existing = sameCategory.find((i) => i.title.trim().toLowerCase() === title.toLowerCase());
        }
      } else {
        // Idempotency for the SAME paste: an identical row is a no-change.
        const sameCategory = await categoryItems(ctx, categoryId);
        for (const candidate of sameCategory) {
          if (candidate.title.trim().toLowerCase() !== title.toLowerCase()) continue;
          if (candidate.lastUpdated !== lastUpdated || candidate.status !== status) continue;
          if (candidate.frequency !== frequency) continue;
          const candidateUrls = await urlsOf(ctx, candidate._id);
          if (candidateUrls.length !== normalizedUrls.length) continue;
          if (
            candidateUrls.every((u) =>
              normalizedUrls.some((n) => normalizeLinkUrl(n.url) === normalizeLinkUrl(u.url)),
            )
          ) {
            existing = candidate;
            break;
          }
        }
      }

      if (existing && args.mode === "add") {
        noChange += 1;
        await ctx.db.insert("importRows", {
          batchId,
          rowNo: row.rowNo,
          matchMethod: "title+category",
          confidence: 1,
          decision: "include",
          result: "no_change",
          raw: row,
          cleaned: { title, categoryName: category.name, links: normalizedUrls },
        });
        continue;
      }

      if (existing) {
        const before = { ...existing, urls: await urlsOf(ctx, existing._id) };
        await ctx.db.patch(existing._id, {
          categoryId: category._id,
          title,
          frequency,
          customDays: row.customDays,
          lastUpdated,
          nextDue,
          ownerId: owner?._id,
          level: row.level && LINK_LEVELS.includes(row.level as never) ? row.level : undefined,
          status,
          remarks: row.remarks ? row.remarks.slice(0, 500) : undefined,
          visibility: row.visibility && ["everyone", "editors", "admin"].includes(row.visibility)
            ? row.visibility
            : config.defaultVisibility,
          updatedBy: me._id,
          updatedAt: now,
        });
        for (const old of before.urls) await ctx.db.delete(old._id);
        for (const u of normalizedUrls) await ctx.db.insert("link_url", { itemId: existing._id, ...u });
        await audit(ctx, me, String(existing._id), "import", "Link", before, {
          ...before,
          title,
          categoryId: category._id,
          lastUpdated,
          nextDue,
          status,
          urls: normalizedUrls,
        });
        await ctx.db.insert("importRows", {
          batchId,
          rowNo: row.rowNo,
          matchMethod: "title+category",
          confidence: 1,
          decision: "include",
          result: "updated",
          raw: row,
          cleaned: { title, categoryName: category.name, importedAt: now, links: normalizedUrls },
          oldValue: before,
          newValue: { itemId: String(existing._id), updatedAt: now },
        });
        updated += 1;
      } else {
        const id = await ctx.db.insert("link_item", {
          serial: nextSerial++,
          categoryId: category._id,
          title,
          frequency,
          customDays: row.customDays,
          lastUpdated,
          nextDue,
          ownerId: owner?._id,
          level: row.level && LINK_LEVELS.includes(row.level as never) ? row.level : undefined,
          status,
          remarks: row.remarks ? row.remarks.slice(0, 500) : undefined,
          tags: [],
          visibility: row.visibility && ["everyone", "editors", "admin"].includes(row.visibility)
            ? row.visibility
            : config.defaultVisibility,
          pinned: false,
          sortOrder: await nextSortOrder(ctx, category._id),
          createdBy: me._id,
          createdAt: now,
          updatedBy: me._id,
          updatedAt: now,
        });
        for (const u of normalizedUrls) await ctx.db.insert("link_url", { itemId: id, ...u });
        await audit(ctx, me, String(id), "import", "Link", undefined, {
          title,
          categoryId: category._id,
          urls: normalizedUrls,
        });
        await ctx.db.insert("importRows", {
          batchId,
          rowNo: row.rowNo,
          matchMethod: "title+category",
          confidence: 1,
          decision: "include",
          result: "updated",
          raw: row,
          cleaned: { title, categoryName: category.name, importedAt: now, links: normalizedUrls },
          newValue: { itemId: String(id), updatedAt: now, created: true },
        });
        updated += 1;
      }
    }

    await ctx.db.patch(batchId, {
      rowsUpdated: updated,
      rowsNoChange: noChange,
      rowsSkipped: skipped,
      rowsFailed: failed,
    });
    return {
      batchId: String(batchId),
      imported: updated,
      noChange,
      skipped,
      failed,
      total: args.rows.length,
    };
  },
});

export const listImports = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireActivatedUser(ctx);
    const rows = await ctx.db.query("importBatches").withIndex("by_time").order("desc").collect();
    return rows
      .filter((r) => r.kind === "links")
      .slice(0, Math.min(limit ?? 12, 50))
      .map((r) => ({
        id: String(r._id),
        fileName: r.fileName,
        status: r.status,
        rowsTotal: r.rowsTotal,
        rowsUpdated: r.rowsUpdated,
        rowsNoChange: r.rowsNoChange,
        rowsSkipped: r.rowsSkipped,
        rowsFailed: r.rowsFailed,
        importedByName: r.importedByName ?? null,
        importedAt: r.importedAt,
        undoneAt: r.undoneAt ?? null,
      }));
  },
});

export const undoImport = mutation({
  args: { batchId: v.id("importBatches") },
  handler: async (ctx, { batchId }) => {
    const me = await requireActivatedUser(ctx);
    assertEditor(me);
    const batch = await ctx.db.get(batchId);
    if (!batch || batch.kind !== "links") throw new Error("Import not found");
    if (batch.status === "undone") return { restored: 0, archived: 0 };
    const rows = await ctx.db
      .query("importRows")
      .withIndex("by_batch", (q) => q.eq("batchId", batchId))
      .collect();
    let restored = 0;
    let archived = 0;
    for (const row of rows) {
      if (row.result === "no_change" || row.result === "skipped" || row.result === "failed") continue;
      const newValue = row.newValue as { itemId?: string; updatedAt?: number; created?: boolean } | null;
      const itemId = newValue?.itemId;
      if (!itemId) continue;
      const item = await ctx.db.get(itemId as Id<"link_item">);
      if (!item) continue;
      if (newValue?.created) {
        if (item.archivedAt) continue;
        await ctx.db.patch(item._id, {
          archivedAt: Date.now(),
          archivedBy: me._id,
          status: "Archived",
          updatedBy: me._id,
          updatedAt: Date.now(),
        });
        archived += 1;
        continue;
      }
      if (newValue?.updatedAt != null && item.updatedAt > newValue.updatedAt) continue;
      const oldValue = row.oldValue as
        | (Partial<Doc<"link_item">> & {
            urls?: { label: string; url: string; type: string; isPrimary: boolean; position: number; kind: string }[];
          })
        | null;
      if (!oldValue) continue;
      const patch: Record<string, unknown> = {
        categoryId: oldValue.categoryId,
        title: oldValue.title,
        description: oldValue.description,
        frequency: oldValue.frequency,
        customDays: oldValue.customDays,
        lastUpdated: oldValue.lastUpdated,
        nextDue: oldValue.nextDue,
        ownerId: oldValue.ownerId,
        level: oldValue.level,
        status: oldValue.status,
        remarks: oldValue.remarks,
        tags: oldValue.tags,
        visibility: oldValue.visibility,
        pinned: oldValue.pinned,
        sortOrder: oldValue.sortOrder,
        updatedAt: Date.now(),
        updatedBy: me._id,
      };
      await ctx.db.patch(item._id, patch);
      for (const u of await urlsOf(ctx, item._id)) await ctx.db.delete(u._id);
      for (const u of oldValue.urls ?? []) {
        await ctx.db.insert("link_url", { itemId: item._id, ...u });
      }
      await audit(ctx, me, String(item._id), "update", "Undo import", item, { ...item, ...patch });
      restored += 1;
    }
    await ctx.db.patch(batchId, {
      status: "undone",
      undoneAt: Date.now(),
      undoneBy: me._id,
    });
    await ctx.db.insert("auditLogs", {
      table: "importBatches",
      recordId: String(batchId),
      action: "update",
      field: "Undo links import",
      oldValue: batch.status,
      newValue: "undone",
      changedBy: me._id,
      changedByName: me.name ?? me.email ?? "Signed-in user",
      changedAt: Date.now(),
      source: "Links Organiser",
    });
    return { restored, archived };
  },
});

/** Internal settings for the optional link-check action (never the client). */
export const linkCheckSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "linksConfig"))
      .first();
    const raw = (row?.value ?? {}) as Record<string, unknown>;
    return {
      enabled: raw.linkCheckEnabled === true,
      weekly: raw.linkCheckWeekly === true,
      lastRunAt: typeof raw.lastLinkCheckAt === "number" ? raw.lastLinkCheckAt : 0,
    };
  },
});

/** Stale, public link targets for the checker. Login-gated hosts are skipped
 *  by the action; fresh results are cached for 24 hours. */
export const linkCheckTargets = internalQuery({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("link_item").withIndex("by_serial").collect();
    const active = items.filter((item) => !item.archivedAt);
    const now = Date.now();
    const out: { id: Id<"link_url">; url: string; title: string }[] = [];
    for (const item of active) {
      const urls = await ctx.db
        .query("link_url")
        .withIndex("by_item_position", (q) => q.eq("itemId", item._id))
        .collect();
      for (const row of urls) {
        if (row.lastCheck != null && now - row.lastCheck < 24 * 60 * 60 * 1000) continue;
        out.push({ id: row._id, url: row.url, title: item.title });
      }
    }
    return { targets: out.slice(0, 400) };
  },
});

/** Record the weekly run timestamp without changing any item. */
export const markLinkCheckRun = internalMutation({
  args: { at: v.number() },
  handler: async (ctx, { at }) => {
    const row = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "linksConfig"))
      .first();
    const value = { ...(((row?.value ?? {}) as Record<string, unknown>)), lastLinkCheckAt: at };
    if (row) await ctx.db.patch(row._id, { value });
    else await ctx.db.insert("appSettings", { key: "linksConfig", value });
    return { at };
  },
});

/** Cached optional link-check result. Only the server action writes this. */
export const setCheckResult = mutation({
  args: {
    urls: v.array(
      v.object({
        id: v.id("link_url"),
        status: v.string(),
        checkedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { urls }) => {
    const me = await requireActivatedUser(ctx);
    assertAdmin(me);
    for (const u of urls) {
      const row = await ctx.db.get(u.id);
      if (!row) continue;
      await ctx.db.patch(u.id, { lastCheck: u.checkedAt, checkStatus: u.status });
    }
    return { checked: urls.length };
  },
});

/** Internal twin used by the Node action (cron runs have no signed-in user). */
export const setCheckResultInternal = internalMutation({
  args: {
    urls: v.array(
      v.object({
        id: v.id("link_url"),
        status: v.string(),
        checkedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { urls }) => {
    for (const u of urls) {
      const row = await ctx.db.get(u.id);
      if (!row) continue;
      await ctx.db.patch(u.id, { lastCheck: u.checkedAt, checkStatus: u.status });
    }
    return { checked: urls.length };
  },
});
