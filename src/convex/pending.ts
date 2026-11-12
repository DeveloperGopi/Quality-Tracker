/**
 * PENDING & FOLLOW-UP — the small read/write layer behind /pending.
 *
 * The issues themselves are NEVER stored: they are recomputed from the cached
 * facility rows by lib/pending.computePendingIssues (in a Web Worker). This
 * module only reads the rule config and the per-issue follow-up state, and
 * writes one row per (facility, rule) when an editor changes the remark,
 * follow-up date, assignee, snooze or status. All writes are block-scoped and
 * audited; viewers can read but not edit.
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  allowedBlockNames,
  audit,
  canEdit,
  getSettings,
  requireActivatedUser,
} from "./facilities";
import {
  ISSUE_STATUSES,
  normalizePendingConfig,
  validateIssueState,
  type IssueStatus,
} from "../lib/pending";

function istToday(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function configOf(ctx: Parameters<typeof getSettings>[0]) {
  const row = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", "pendingRules"))
    .first();
  return normalizePendingConfig(row?.value);
}

/** Everything /pending needs besides the cached facility rows. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    const allowed = await allowedBlockNames(ctx, me);
    const [settings, config, allStates] = await Promise.all([
      getSettings(ctx),
      configOf(ctx),
      // Read the small state table through its block index — never a table scan
      // and never the facilities table. Every write stores the identity
      // snapshot, so a resolved row names its facility without a join.
      allowed
        ? Promise.all(
            [...allowed].map((block) =>
              ctx.db
                .query("issue_state")
                .withIndex("by_block", (q) => q.eq("block", block))
                .collect(),
            ),
          ).then((groups) => groups.flat())
        : ctx.db.query("issue_state").withIndex("by_block").collect(),
    ]);
    const states = allStates.map((state) => ({
      id: String(state._id),
      facilityId: String(state.facilityId),
      ruleId: state.ruleId,
      facilityName: state.facilityName ?? null,
      block: state.block ?? null,
      phc: state.phc ?? null,
      facilityType: state.facilityType ?? null,
      remark: state.remark ?? null,
      followUpDate: state.followUpDate ?? null,
      assignee: state.assignee ?? null,
      status: state.status ?? "open",
      snoozeUntil: state.snoozeUntil ?? null,
      snoozeReason: state.snoozeReason ?? null,
      lastReason: state.lastReason ?? null,
      resolvedAt: state.resolvedAt ?? null,
      updatedAt: state.updatedAt,
      updatedByName: state.updatedByName ?? null,
    }));
    return {
      config,
      settings: settings as unknown as Record<string, unknown>,
      documentRules: (settings as unknown as { documentRules?: unknown }).documentRules ?? null,
      states,
      me: {
        id: String(me._id),
        name: me.name ?? null,
        email: me.email ?? null,
        appRole: me.appRole ?? null,
        canEdit: canEdit(me),
        isAdmin: me.appRole === "admin",
        blockNames: allowed ? [...allowed] : null,
      },
    };
  },
});

/** Save one follow-up edit (remark / date / assignee / status / snooze). */
export const upsertState = mutation({
  args: {
    facilityId: v.id("facilities"),
    ruleId: v.string(),
    remark: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
    assignee: v.optional(v.string()),
    status: v.string(),
    snoozeUntil: v.optional(v.string()),
    snoozeReason: v.optional(v.string()),
    lastReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    if (!canEdit(me)) throw new ConvexError("Only a District Editor or State Admin can update follow-ups");
    const facility = await ctx.db.get(args.facilityId);
    if (!facility) throw new ConvexError("Facility not found");
    const allowed = await allowedBlockNames(ctx, me);
    if (allowed && !allowed.has(facility.block)) {
      throw new ConvexError("This facility is outside your assigned blocks");
    }
    if (!ISSUE_STATUSES.includes(args.status as IssueStatus)) {
      throw new ConvexError("Status is not valid");
    }
    const input = {
      facilityId: String(args.facilityId),
      ruleId: args.ruleId,
      remark: args.remark?.trim() || undefined,
      followUpDate: args.followUpDate || undefined,
      assignee: args.assignee?.trim() || undefined,
      status: args.status as IssueStatus,
      snoozeUntil: args.snoozeUntil || undefined,
      snoozeReason: args.snoozeReason?.trim() || undefined,
      lastReason: args.lastReason,
    };
    const error = validateIssueState(input, istToday());
    if (error) throw new ConvexError(error);

    const existing = await ctx.db
      .query("issue_state")
      .withIndex("by_facility_rule", (q) =>
        q.eq("facilityId", args.facilityId).eq("ruleId", args.ruleId),
      )
      .first();
    const now = Date.now();
    const values = {
      facilityId: args.facilityId,
      ruleId: args.ruleId,
      facilityName: facility.name,
      block: facility.block,
      phc: facility.phc,
      facilityType: facility.facilityType,
      remark: input.remark,
      followUpDate: input.followUpDate,
      assignee: input.assignee,
      status: input.status,
      snoozeUntil: input.status === "snoozed" ? input.snoozeUntil : undefined,
      snoozeReason: input.status === "snoozed" ? input.snoozeReason : undefined,
      lastReason: input.lastReason?.slice(0, 500) ?? existing?.lastReason,
      resolvedAt: input.status === "resolved" ? existing?.resolvedAt ?? now : undefined,
      updatedAt: now,
      updatedBy: me._id,
      updatedByName: me.name ?? me.email ?? "Editor",
    };
    if (existing) await ctx.db.patch(existing._id, values);
    else await ctx.db.insert("issue_state", values);
    await audit(ctx, {
      table: "issue_state",
      recordId: String(args.facilityId) + ":" + args.ruleId,
      facilityId: args.facilityId,
      action: existing ? "update" : "create",
      field: "Follow-up",
      oldValue: existing
        ? JSON.stringify({
            remark: existing.remark ?? null,
            status: existing.status ?? "open",
            followUpDate: existing.followUpDate ?? null,
            assignee: existing.assignee ?? null,
          })
        : "(none)",
      newValue: JSON.stringify({
        remark: input.remark ?? null,
        status: input.status,
        followUpDate: input.followUpDate ?? null,
        assignee: input.assignee ?? null,
      }),
      userName: me.name ?? me.email ?? "Editor",
      userId: me._id,
      source: "Pending & Follow-up",
    });
    return { ok: true as const };
  },
});

/** Log one /pending download in the ONE activity log (Admin → Audit and logs). */
export const logExport = mutation({
  args: {
    format: v.string(),
    filters: v.string(),
    rows: v.number(),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    await ctx.db.insert("auditLogs", {
      table: "issue_state",
      recordId: "pending",
      action: "export",
      field: "Pending & Follow-up export",
      newValue: `${args.format.toUpperCase()} · ${args.rows} issues · ${args.filters || "no filters"} · ${args.fileName}`,
      changedBy: me._id,
      changedByName: me.name ?? me.email ?? "Signed-in user",
      changedAt: Date.now(),
      source: "Pending & Follow-up",
    });
    return { logged: true as const };
  },
});

/** Admin → Pending rules: enabled / severity / thresholds / default filters. */
export const saveConfig = mutation({
  args: { value: v.any() },
  handler: async (ctx, { value }) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin") throw new ConvexError("Only the State Admin can change pending rules");
    const config = normalizePendingConfig(value);
    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "pendingRules"))
      .first();
    if (existing) await ctx.db.patch(existing._id, { value: config });
    else await ctx.db.insert("appSettings", { key: "pendingRules", value: config });
    await audit(ctx, {
      table: "appSettings",
      recordId: "pendingRules",
      action: "update",
      field: "pendingRules",
      oldValue: existing ? JSON.stringify(existing.value) : "(default)",
      newValue: JSON.stringify(config),
      userName: me.name ?? me.email ?? "State Admin",
      userId: me._id,
      source: "Admin → Pending rules",
    });
    return config;
  },
});
