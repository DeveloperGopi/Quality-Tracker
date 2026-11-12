/**
 * DATA CHECKS → COMPLETED ASSESSMENTS MISSING VISIT DATES.
 *
 * Read-only preview first; the button fills only the empty actual dates from a
 * non-future scheduled start. Existing dates are never touched. Both writes
 * are audited with source "auto from schedule".
 */

import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  canEditAll,
  requireActivatedUser,
  surveillanceDateAuditRows,
} from "./facilities";
import { documentNameCandidates } from "./documentNames";
import { assessorSplitCandidates } from "./assessorChecks";
import { missingAnnexureCandidates } from "./annexure";
import { activeIgnoreMap } from "./dataCheckIgnores";
import { DATA_CHECK_IDS, filterIgnoredIssues, type DataCheckId } from "../lib/dataCheckIssues";
import { planVisitDatesFill } from "../lib/scheduleVisit";
import {
  RESULT_DECLARED,
  isResultDeclared,
  isResultDeclaredStatus,
} from "../lib/resultDeclared";

export type ResultDeclaredCandidate = {
  saId: string;
  naId: string;
  facilityId: string;
  facility: string;
  block: string;
  facilityType: string | null;
  cycleNumber: number | null;
  certificationStatus: string;
  current: string | null;
  auto: boolean;
};

/** Shared read model — the card query and health summary must agree. */
export async function resultDeclaredCandidates(
  ctx: QueryCtx | MutationCtx,
): Promise<ResultDeclaredCandidate[]> {
  const nas = await ctx.db.query("nationalAssessments").collect();
  const out: ResultDeclaredCandidate[] = [];
  for (const na of nas) {
    if (!isResultDeclaredStatus(na.certificationStatus)) continue;
    const sas = await ctx.db
      .query("stateAssessments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", na.cycleId))
      .collect();
    const sa = sas[0];
    if (!sa) continue;
    if (isResultDeclared(sa.generalDocStatus) && sa.generalDocStatusAuto === true) continue;
    const facility = await ctx.db.get(na.facilityId);
    if (!facility) continue;
    const cycle = await ctx.db.get(sa.cycleId);
    out.push({
      saId: String(sa._id),
      naId: String(na._id),
      facilityId: String(na.facilityId),
      facility: facility.name ?? "Facility",
      block: facility.block ?? "",
      facilityType: facility.facilityType ?? null,
      cycleNumber: cycle?.cycleNumber ?? null,
      certificationStatus: na.certificationStatus ?? "",
      current: sa.generalDocStatus ?? null,
      auto: sa.generalDocStatusAuto === true,
    });
  }
  out.sort((a, b) => a.facility.localeCompare(b.facility));
  return out;
}

/** What WOULD change — nothing is written here. */
export const resultDeclaredAudit = query({
  args: {},
  handler: async (ctx): Promise<ResultDeclaredCandidate[]> => {
    await adminFor(ctx);
    return resultDeclaredCandidates(ctx);
  },
});

/** ONE query for the six tile counts. Lists stay on their own card queries. */
export const healthSummary = query({
  args: {},
  handler: async (ctx) => {
    await adminFor(ctx);
    const [surveillance, visits, documentNames, resultDeclared, assessorNames, annexure, ignored] =
      await Promise.all([
        surveillanceDateAuditRows(ctx),
        previewRows(ctx),
        documentNameCandidates(ctx),
        resultDeclaredCandidates(ctx),
        assessorSplitCandidates(ctx),
        missingAnnexureCandidates(ctx),
        activeIgnoreMap(ctx),
      ]);
    const visible = (check: DataCheckId, rows: object[]) =>
      filterIgnoredIssues(
        check,
        rows as Record<string, unknown>[],
        ignored[check] ?? new Set<string>(),
      ).length;
    return {
      checkedAt: Date.now(),
      counts: {
        surveillance: visible("surveillance", surveillance),
        visitDates: visible("visitDates", visits),
        documentNames: visible("documentNames", documentNames),
        resultDeclared: visible("resultDeclared", resultDeclared),
        assessorNames: visible("assessorNames", assessorNames),
        annexure: visible("annexure", annexure),
      },
      ignoredCounts: Object.fromEntries(
        DATA_CHECK_IDS.map((check) => [check, ignored[check]?.size ?? 0]),
      ),
    };
  },
});

export const applyResultDeclared = mutation({
  args: { saIds: v.array(v.id("stateAssessments")) },
  handler: async (ctx, args): Promise<{ batchId: string; updated: number }> => {
    const me = await adminFor(ctx);
    const batchId = `result-declared:${Date.now()}`;
    let updated = 0;
    for (const saId of args.saIds) {
      const sa = await ctx.db.get(saId);
      if (!sa) continue;
      const nas = await ctx.db
        .query("nationalAssessments")
        .withIndex("by_cycle", (q) => q.eq("cycleId", sa.cycleId))
        .collect();
      const na = nas.find((n) => isResultDeclaredStatus(n.certificationStatus));
      if (!na) continue;
      const before = sa.generalDocStatus ?? null;
      if (isResultDeclared(before) && sa.generalDocStatusAuto === true) continue;
      const portal = sa.generalDocStatusAuto === true ? sa.generalDocStatusPortal : sa.generalDocStatus;
      await ctx.db.patch(saId, {
        generalDocStatus: RESULT_DECLARED,
        generalDocStatusAuto: true,
        generalDocStatusPortal: portal || undefined,
        generalDocUpdatedAt: Date.now(),
      });
      await ctx.db.insert("auditLogs", {
        table: "stateAssessments",
        recordId: String(saId),
        facilityId: sa.facilityId,
        action: "update",
        field: "SaQsham Documents Status (auto: result)",
        oldValue: before ?? "(empty)",
        newValue: RESULT_DECLARED,
        changedBy: me._id,
        changedByName: me.name ?? me.email ?? "State Admin",
        changedAt: Date.now(),
        source: "Result Declared backfill",
        batchId,
      });
      updated += 1;
    }
    return { batchId, updated };
  },
});

export const undoResultDeclared = mutation({
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
      if (log.table !== "stateAssessments" || log.source !== "Result Declared backfill") continue;
      const sa = await ctx.db.get(log.recordId as Id<"stateAssessments">);
      if (!sa) { skipped += 1; continue; }
      if (sa.generalDocStatus !== RESULT_DECLARED || sa.generalDocStatusAuto !== true) {
        skipped += 1;
        continue;
      }
      const before = String(log.oldValue ?? "");
      await ctx.db.patch(sa._id, {
        generalDocStatus: before && before !== "(empty)" ? before : undefined,
        generalDocStatusAuto: false,
        generalDocStatusPortal: undefined,
        generalDocUpdatedAt: Date.now(),
      });
      await ctx.db.insert("auditLogs", {
        table: "stateAssessments",
        recordId: String(sa._id),
        facilityId: sa.facilityId,
        action: "update",
        field: "SaQsham Documents Status",
        oldValue: RESULT_DECLARED,
        newValue: before || "(empty)",
        changedBy: me._id,
        changedByName: me.name ?? me.email ?? "State Admin",
        changedAt: Date.now(),
        source: "Result Declared backfill (undo)",
      });
      restored += 1;
    }
    return { restored, skipped };
  },
});

type Kind = "sa" | "nqas";

export type VisitDatesCandidate = {
  key: string;
  id: string;
  kind: Kind;
  facility: string;
  block: string;
  facilityType: string | null;
  cycleNumber: number | null;
  scheduled: string;
  actualStart: string | null;
  actualEnd: string | null;
  fillStart: string;
  fillEnd: string;
  setStart: boolean;
  setEnd: boolean;
  needsDecision: boolean;
  decisionReason: string | null;
};

async function adminFor(ctx: MutationCtx | QueryCtx) {
  const me = await requireActivatedUser(ctx);
  if (!canEditAll(me)) throw new ConvexError("State Admin only");
  return me;
}

function todayIso(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

async function previewRows(ctx: QueryCtx | MutationCtx): Promise<VisitDatesCandidate[]> {
  const today = todayIso();
  const [sas, nas, facilities] = await Promise.all([
    ctx.db.query("stateAssessments").collect(),
    ctx.db.query("nationalAssessments").collect(),
    ctx.db.query("facilities").collect(),
  ]);
  const byId = new Map(facilities.map((f) => [String(f._id), f]));
  const out: VisitDatesCandidate[] = [];
  const add = (
    key: string,
    id: string,
    kind: Kind,
    facilityId: Id<"facilities">,
    scheduled: string | undefined,
    actualStart: string | undefined,
    actualEnd: string | undefined,
    scheduledEnd: string | undefined,
    cycleNumber: number | null,
  ) => {
    if (!scheduled || scheduled > today) return;
    if (actualStart && actualEnd) return;
    const plan = planVisitDatesFill({
      scheduledStart: scheduled,
      actualStart: actualStart ?? "",
      actualEnd: actualEnd ?? "",
      today,
    });
    if (!plan.needsDecision && !plan.setStart && !plan.setEnd) return;
    const facility = byId.get(String(facilityId));
    if (!facility) return;
    out.push({
      key,
      id,
      kind,
      facility: facility.name,
      block: facility.block,
      facilityType: facility.facilityType ?? null,
      cycleNumber,
      scheduled,
      actualStart: actualStart ?? null,
      actualEnd: actualEnd ?? null,
      fillStart: plan.fillStart,
      fillEnd: plan.fillEnd,
      setStart: plan.setStart,
      setEnd: plan.setEnd,
      needsDecision: plan.needsDecision,
      decisionReason: plan.reason,
    });
  };

  for (const sa of sas) {
    if (sa.status !== "Completed") continue;
    const cycle = await ctx.db.get(sa.cycleId);
    add(
      `sa:${sa._id}`,
      String(sa._id),
      "sa",
      sa.facilityId,
      sa.scheduledDate,
      sa.actualStartDate,
      sa.actualEndDate,
      undefined,
      cycle?.cycleNumber ?? null,
    );
  }
  for (const na of nas) {
    if (na.status !== "Completed") continue;
    const cycle = await ctx.db.get(na.cycleId);
    add(
      `nqas:${na._id}`,
      String(na._id),
      "nqas",
      na.facilityId,
      na.scheduledStartDate,
      na.actualStartDate,
      na.actualEndDate,
      na.scheduledEndDate,
      cycle?.cycleNumber ?? null,
    );
  }
  return out.sort((a, b) => a.facility.localeCompare(b.facility) || a.kind.localeCompare(b.kind));
}

/** Nothing is written here. */
export const visitDatesPreview = query({
  args: {},
  handler: async (ctx): Promise<VisitDatesCandidate[]> => {
    await adminFor(ctx);
    return previewRows(ctx);
  },
});

export const fillVisitDates = mutation({
  args: { keys: v.array(v.string()) },
  handler: async (ctx, args): Promise<{ updated: number; batchId: string }> => {
    const me = await adminFor(ctx);
    const wants = new Set(args.keys);
    const rows = (await previewRows(ctx)).filter((row) => wants.has(row.key));
    const batchId = `visit-dates:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    let updated = 0;
    for (const row of rows) {
      if (row.kind === "sa") {
        const sa = await ctx.db.get(row.id as Id<"stateAssessments">);
        if (!sa || sa.status !== "Completed") continue;
        if (row.needsDecision) continue;
        const patch: Record<string, unknown> = {};
        if (row.setStart && !sa.actualStartDate) patch.actualStartDate = row.fillStart;
        if (row.setEnd && !sa.actualEndDate) patch.actualEndDate = row.fillEnd;
        if (!Object.keys(patch).length) continue;
        await ctx.db.patch(sa._id, patch);
        await ctx.db.insert("auditLogs", {
          table: "stateAssessments",
          recordId: String(sa._id),
          facilityId: sa.facilityId,
          action: "update",
          field: "SA visit dates",
          oldValue: `${sa.actualStartDate ?? "(empty)"} → ${sa.actualEndDate ?? "(empty)"}`,
          newValue: `${patch.actualStartDate ?? sa.actualStartDate} → ${patch.actualEndDate ?? sa.actualEndDate}`,
          changedBy: me._id,
          changedByName: me.name ?? me.email ?? "State Admin",
          changedAt: Date.now(),
          source: "auto from schedule",
          batchId,
        });
        updated += 1;
      } else {
        const na = await ctx.db.get(row.id as Id<"nationalAssessments">);
        if (!na || na.status !== "Completed") continue;
        if (row.needsDecision) continue;
        const patch: Record<string, unknown> = {};
        if (row.setStart && !na.actualStartDate) patch.actualStartDate = row.fillStart;
        if (row.setEnd && !na.actualEndDate) patch.actualEndDate = row.fillEnd;
        if (!Object.keys(patch).length) continue;
        await ctx.db.patch(na._id, patch);
        await ctx.db.insert("auditLogs", {
          table: "nationalAssessments",
          recordId: String(na._id),
          facilityId: na.facilityId,
          action: "update",
          field: "NQAS visit dates",
          oldValue: `${na.actualStartDate ?? "(empty)"} → ${na.actualEndDate ?? "(empty)"}`,
          newValue: `${patch.actualStartDate ?? na.actualStartDate} → ${patch.actualEndDate ?? na.actualEndDate}`,
          changedBy: me._id,
          changedByName: me.name ?? me.email ?? "State Admin",
          changedAt: Date.now(),
          source: "auto from schedule",
          batchId,
        });
        updated += 1;
      }
    }
    return { updated, batchId };
  },
});

/** Undo one confirmed visit-date batch, restoring both dates exactly. */
export const undoVisitDates = mutation({
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
      if (log.source !== "auto from schedule" || !log.table) continue;
      const table = log.table === "stateAssessments" ? "stateAssessments" : log.table === "nationalAssessments" ? "nationalAssessments" : null;
      if (!table) continue;
      const doc =
        table === "stateAssessments"
          ? await ctx.db.get(log.recordId as Id<"stateAssessments">)
          : await ctx.db.get(log.recordId as Id<"nationalAssessments">);
      if (!doc) {
        skipped += 1;
        continue;
      }
      const oldParts = String(log.oldValue ?? "").split(" → ");
      const newParts = String(log.newValue ?? "").split(" → ");
      if (oldParts.length !== 2 || newParts.length !== 2) {
        skipped += 1;
        continue;
      }
      if (
        String(doc.actualStartDate ?? "(empty)") !== newParts[0] ||
        String(doc.actualEndDate ?? "(empty)") !== newParts[1]
      ) {
        skipped += 1;
        continue;
      }
      await ctx.db.patch(doc._id, {
        actualStartDate: oldParts[0] === "(empty)" ? undefined : oldParts[0],
        actualEndDate: oldParts[1] === "(empty)" ? undefined : oldParts[1],
      });
      await ctx.db.insert("auditLogs", {
        table,
        recordId: String(doc._id),
        facilityId: doc.facilityId,
        action: "update",
        field: table === "stateAssessments" ? "SA visit dates" : "NQAS visit dates",
        oldValue: log.newValue,
        newValue: log.oldValue,
        changedBy: me._id,
        changedByName: me.name ?? me.email ?? "State Admin",
        changedAt: Date.now(),
        source: "auto from schedule (undo)",
      });
      restored += 1;
    }
    return { restored, skipped };
  },
});
