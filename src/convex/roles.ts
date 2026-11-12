/**
 * THE role list. The UI must never hard-code "State Admin / Editor / Viewer":
 * it reads this table, seeded once with the five real roles the API knows.
 */

import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { canEditAll, requireActivatedUser } from "./facilities";
import { DEFAULT_ROLES } from "../lib/permissions";

export const DEFAULT_APP_ROLES = DEFAULT_ROLES.map((r) => ({
  key: r.key,
  label: r.label,
  description: r.description,
  sort: r.sort,
  builtin: true,
}));

export function normalizeRoleKey(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

/** Read the roles table. Returns the defaults if it has not been seeded yet,
 *  so a fresh deployment never renders an empty picker. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireActivatedUser(ctx);
    const rows = await ctx.db.query("appRoles").collect();
    const stored = rows.length
      ? rows.sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label))
      : DEFAULT_APP_ROLES;
    return stored.map((r) => ({
      key: r.key,
      label: r.label,
      description: r.description,
      sort: r.sort,
      builtin: r.builtin,
    }));
  },
});

/** Idempotent seed: inserts any default role missing from the table. */
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    if (!canEditAll(me)) throw new Error("Only the State Admin can manage roles");
    const rows = await ctx.db.query("appRoles").collect();
    const have = new Set(rows.map((r) => r.key));
    let added = 0;
    for (const role of DEFAULT_APP_ROLES) {
      if (have.has(role.key)) continue;
      await ctx.db.insert("appRoles", role);
      added += 1;
    }
    return { added };
  },
});

/** Server-side role existence check (migrations, page creation). */
export async function roleKeys(ctx: QueryCtx | MutationCtx): Promise<Set<string>> {
  const rows = await ctx.db.query("appRoles").collect();
  if (rows.length === 0) return new Set(DEFAULT_APP_ROLES.map((r) => r.key));
  return new Set(rows.map((r) => r.key));
}

export const roleCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireActivatedUser(ctx);
    const users = await ctx.db.query("users").collect();
    const out: Record<string, number> = {};
    for (const u of users) {
      if (!u.appRole || u.isAnonymous) continue;
      out[u.appRole] = (out[u.appRole] ?? 0) + 1;
    }
    return out;
  },
});

/** Migration: custom pages with an empty role list become explicit Everyone. */
export const migrateEmptyRolePages = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    if (!canEditAll(me)) throw new Error("Only the State Admin can migrate pages");
    const rows = await ctx.db.query("customPages").collect();
    let changed = 0;
    for (const p of rows) {
      if (p.roles.length === 0 && p.everyone !== true) {
        await ctx.db.patch(p._id, { everyone: true, updatedAt: Date.now() });
        changed += 1;
      }
    }
    if (changed > 0) {
      await ctx.db.insert("auditLogs", {
        table: "customPages",
        recordId: "migration",
        action: "update",
        field: "Empty role lists",
        oldValue: "no roles",
        newValue: `everyone (${changed} page${changed === 1 ? "" : "s"})`,
        changedBy: me._id,
        changedByName: me.name ?? me.email ?? "State Admin",
        changedAt: Date.now(),
        source: "Admin → Pages",
      });
    }
    return { changed };
  },
});
