/**
 * DATA CHECKS → ASSESSOR NAMES THAT END IN A DESIGNATION.
 *
 * "Dr. Peranandham QMO" or "Abilash Kumar DQC" are listed here with a
 * proposed name/designation split. Nothing changes until the State Admin
 * presses Apply on a row; the write is audited.
 */

import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { canEditAll, requireActivatedUser } from "./facilities";

const DESIGNATION_SUFFIXES = new Set([
  "QMO", "DQC", "DCO", "RMO", "CHO", "MO", "ANM", "GNM", "BPM", "MPHW",
  "DHO", "DDHS", "DPM", "DEO", "SNO", "PHN", "STS", "STLS", "LT",
]);

export type AssessorSplitCandidate = {
  saId: string;
  facilityId: string;
  facility: string;
  block: string;
  facilityType: string | null;
  cycleNumber: number | null;
  slot: number;
  currentName: string;
  proposedName: string;
  proposedDesignation: string;
};

export function proposeAssessorSplit(
  name: string,
): { name: string; designation: string } | null {
  const cleaned = name.trim().replace(/\s+/g, " ");
  const m = cleaned.match(/^(.*\S)\s+([A-Za-z][A-Za-z&/.-]{1,9})$/);
  if (!m) return null;
  const token = m[2].replace(/[^A-Za-z]/g, "").toUpperCase();
  if (!DESIGNATION_SUFFIXES.has(token)) return null;
  return { name: m[1], designation: m[2].toUpperCase() };
}

async function adminFor(ctx: Parameters<typeof requireActivatedUser>[0]) {
  const me = await requireActivatedUser(ctx);
  if (!canEditAll(me)) throw new ConvexError("State Admin only");
  return me;
}

/** Shared read model — the card query and the health summary must agree. */
export async function assessorSplitCandidates(
  ctx: QueryCtx | MutationCtx,
): Promise<AssessorSplitCandidate[]> {
  const rows = await ctx.db.query("stateAssessments").collect();
  const out: AssessorSplitCandidate[] = [];
  for (const sa of rows) {
    const facility = await ctx.db.get(sa.facilityId);
    if (!facility) continue;
    const cycle = await ctx.db.get(sa.cycleId);
    for (const slot of [1, 2] as const) {
      const name = slot === 1 ? sa.assessor1Name : sa.assessor2Name;
      const designation =
        slot === 1 ? sa.assessor1Designation : sa.assessor2Designation;
      if (!name || designation) continue;
      const split = proposeAssessorSplit(name);
      if (!split) continue;
      out.push({
        saId: String(sa._id),
        facilityId: String(facility._id),
        facility: facility.name,
        block: facility.block,
        facilityType: facility.facilityType ?? null,
        cycleNumber: cycle?.cycleNumber ?? null,
        slot,
        currentName: name,
        proposedName: split.name,
        proposedDesignation: split.designation,
      });
    }
  }
  return out;
}

/** READ-ONLY: what a name/designation split would look like. */
export const assessorSplitAudit = query({
  args: {},
  handler: async (ctx): Promise<AssessorSplitCandidate[]> => {
    await adminFor(ctx);
    return assessorSplitCandidates(ctx);
  },
});

/** One confirmed split. Never runs without the admin pressing Apply. */
export const applyAssessorSplit = mutation({
  args: {
    saId: v.id("stateAssessments"),
    slot: v.number(),
    name: v.string(),
    designation: v.string(),
    currentName: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    const sa = await ctx.db.get(args.saId);
    if (!sa) throw new ConvexError("State assessment not found");
    const isOne = args.slot === 1;
    await ctx.db.patch(
      args.saId,
      isOne
        ? { assessor1Name: args.name, assessor1Designation: args.designation }
        : { assessor2Name: args.name, assessor2Designation: args.designation },
    );
    await ctx.db.insert("auditLogs", {
      table: "stateAssessments",
      recordId: String(args.saId),
      facilityId: sa.facilityId,
      action: "update",
      field: `Assessor ${args.slot} name/designation split`,
      oldValue: args.currentName,
      newValue: `${args.name} · ${args.designation}`,
      changedBy: me._id,
      changedByName: me.name ?? me.email ?? "State Admin",
      changedAt: Date.now(),
      source: "Assessor name split",
    });
    return { ok: true };
  },
});

/** One confirmed batch, one audit id, one Undo. */
export const applyAssessorSplits = mutation({
  args: {
    entries: v.array(
      v.object({
        saId: v.id("stateAssessments"),
        slot: v.number(),
        name: v.string(),
        designation: v.string(),
        currentName: v.string(),
      }),
    ),
  },
  handler: async (ctx, args): Promise<{ updated: number; batchId: string }> => {
    const me = await adminFor(ctx);
    const batchId = `assessor-names:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    let updated = 0;
    for (const entry of args.entries) {
      const sa = await ctx.db.get(entry.saId);
      if (!sa) continue;
      const isOne = entry.slot === 1;
      await ctx.db.patch(
        entry.saId,
        isOne
          ? { assessor1Name: entry.name, assessor1Designation: entry.designation }
          : { assessor2Name: entry.name, assessor2Designation: entry.designation },
      );
      await ctx.db.insert("auditLogs", {
        table: "stateAssessments",
        recordId: String(entry.saId),
        facilityId: sa.facilityId,
        action: "update",
        field: `Assessor ${entry.slot} name/designation split`,
        oldValue: entry.currentName,
        newValue: `${entry.name} · ${entry.designation}`,
        changedBy: me._id,
        changedByName: me.name ?? me.email ?? "State Admin",
        changedAt: Date.now(),
        source: "Assessor name split",
        batchId,
      });
      updated += 1;
    }
    return { updated, batchId };
  },
});

export const undoAssessorSplits = mutation({
  args: { batchId: v.string() },
  handler: async (ctx, args): Promise<{ restored: number; skipped: number }> => {
    const me = await adminFor(ctx);
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();
    let restored = 0;
    let skipped = 0;
    for (const log of logs) {
      if (log.table !== "stateAssessments" || log.source !== "Assessor name split") continue;
      const sa = await ctx.db.get(log.recordId as Id<"stateAssessments">);
      if (!sa) {
        skipped += 1;
        continue;
      }
      const slot = String(log.field ?? "").includes("Assessor 1") ? 1 : 2;
      const current = slot === 1 ? sa.assessor1Name : sa.assessor2Name;
      const expected = String(log.newValue ?? "").split(" · ")[0];
      if ((current ?? "") !== expected) {
        skipped += 1;
        continue;
      }
      await ctx.db.patch(
        sa._id,
        slot === 1
          ? { assessor1Name: String(log.oldValue ?? ""), assessor1Designation: undefined }
          : { assessor2Name: String(log.oldValue ?? ""), assessor2Designation: undefined },
      );
      await ctx.db.insert("auditLogs", {
        table: "stateAssessments",
        recordId: String(sa._id),
        facilityId: sa.facilityId,
        action: "update",
        field: `Assessor ${slot} name/designation split`,
        oldValue: log.newValue,
        newValue: String(log.oldValue ?? ""),
        changedBy: me._id,
        changedByName: me.name ?? me.email ?? "State Admin",
        changedAt: Date.now(),
        source: "Assessor name split (undo)",
      });
      restored += 1;
    }
    return { restored, skipped };
  },
});
