/**
 * ADMIN → DATA CHECKS → IGNORE.
 *
 * Ignoring is a REVIEW decision, not a data edit: no assessment field is
 * touched. Each active row hides one stable issue key from its card; restore
 * removes it from the ignored view. Both actions are audited, and the ignored
 * row keeps who/when/why metadata for the restore list.
 */

import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { canEditAll, requireActivatedUser } from "./facilities";
import { isDataCheckId } from "../lib/dataCheckIssues";
import { DATA_CHECK_IDS } from "../lib/dataCheckIssues";

export type IgnoredIssue = {
  _id: string;
  check: string;
  issueKey: string;
  label: string;
  detail: string | null;
  ignoredBy: string;
  ignoredByName: string;
  ignoredAt: number;
};

async function adminFor(ctx: QueryCtx | MutationCtx) {
  const me = await requireActivatedUser(ctx);
  if (!canEditAll(me)) throw new Error("Only the State Admin can review data checks");
  return me;
}

/** One read for the health summary (all six checks). */
export async function activeIgnoreRows(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("dataCheckIgnores")
    .withIndex("by_active", (q) => q.eq("active", true))
    .collect();
}

export async function activeIgnoreMap(
  ctx: QueryCtx | MutationCtx,
): Promise<Record<string, Set<string>>> {
  const rows = await activeIgnoreRows(ctx);
  const map = Object.fromEntries(DATA_CHECK_IDS.map((id) => [id, new Set<string>()])) as Record<
    string,
    Set<string>
  >;
  for (const row of rows) {
    if (!isDataCheckId(row.check)) continue;
    map[row.check]!.add(row.issueKey);
  }
  return map;
}

/** The ignored drawer. Admin-only, active rows only, newest first. */
export const list = query({
  args: {},
  handler: async (ctx): Promise<IgnoredIssue[]> => {
    await adminFor(ctx);
    const rows = await activeIgnoreRows(ctx);
    return rows
      .filter((row) => isDataCheckId(row.check))
      .sort((a, b) => b.ignoredAt - a.ignoredAt)
      .map((row) => ({
        _id: String(row._id),
        check: row.check,
        issueKey: row.issueKey,
        label: row.label,
        detail: row.detail ?? null,
        ignoredBy: String(row.ignoredBy),
        ignoredByName: row.ignoredByName,
        ignoredAt: row.ignoredAt,
      }));
  },
});

export const ignore = mutation({
  args: {
    check: v.string(),
    rows: v.array(
      v.object({
        issueKey: v.string(),
        label: v.string(),
        detail: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    if (!isDataCheckId(args.check)) throw new Error("Unknown data check");
    if (args.rows.length === 0) return { ids: [] as string[], ignored: 0 };
    if (args.rows.length > 300) throw new Error("Ignore at most 300 issues at a time");

    const name = me.name ?? me.email ?? "State Admin";
    const now = Date.now();
    const seen = new Set<string>();
    const ids: string[] = [];
    let ignored = 0;

    for (const input of args.rows) {
      const issueKey = input.issueKey.trim();
      const label = input.label.trim();
      if (!issueKey || !label || seen.has(issueKey)) continue;
      seen.add(issueKey);
      const existing = await ctx.db
        .query("dataCheckIgnores")
        .withIndex("by_check_key", (q) =>
          q.eq("check", args.check).eq("issueKey", issueKey),
        )
        .unique();
      if (existing?.active) {
        ids.push(String(existing._id));
        continue;
      }
      const detail = input.detail?.trim() || undefined;
      if (existing) {
        await ctx.db.patch(existing._id, {
          label,
          detail,
          ignoredBy: me._id,
          ignoredByName: name,
          ignoredAt: now,
          active: true,
          restoredAt: undefined,
          restoredBy: undefined,
          restoredByName: undefined,
        });
        ids.push(String(existing._id));
      } else {
        const id = await ctx.db.insert("dataCheckIgnores", {
          check: args.check,
          issueKey,
          label,
          detail,
          ignoredBy: me._id,
          ignoredByName: name,
          ignoredAt: now,
          active: true,
        });
        ids.push(String(id));
      }
      ignored += 1;
      await ctx.db.insert("auditLogs", {
        table: "dataCheckIgnores",
        recordId: `${args.check}:${issueKey}`,
        action: "ignore",
        field: args.check,
        oldValue: "active",
        newValue: label,
        changedBy: me._id,
        changedByName: name,
        changedAt: now,
        source: "Admin → Data checks",
      });
    }
    return { ids, ignored };
  },
});

export const restore = mutation({
  args: { ids: v.array(v.id("dataCheckIgnores")) },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    const name = me.name ?? me.email ?? "State Admin";
    const now = Date.now();
    let restored = 0;
    for (const id of args.ids) {
      const row = await ctx.db.get(id);
      if (!row || !row.active) continue;
      await ctx.db.patch(id, {
        active: false,
        restoredAt: now,
        restoredBy: me._id,
        restoredByName: name,
      });
      restored += 1;
      await ctx.db.insert("auditLogs", {
        table: "dataCheckIgnores",
        recordId: `${row.check}:${row.issueKey}`,
        action: "restore",
        field: row.check,
        oldValue: row.label,
        newValue: "active",
        changedBy: me._id,
        changedByName: name,
        changedAt: now,
        source: "Admin → Data checks (restore)",
      });
    }
    return { restored };
  },
});
