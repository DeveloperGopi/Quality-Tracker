/**
 * ANNEXURE I SCORES — read, save and undo.
 *
 * The PDF is parsed by `annexureParse.preview` (a Node action) using the same
 * document stream as the viewer. This module owns the cycle-linked rows, the
 * conflict check, the audited batch and the one query each surface reads.
 */

import { v } from "convex/values";
import {
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  allowedBlockNames,
  canEdit,
  canEditAll,
  getSettings,
  requireActivatedUser,
} from "./facilities";
import { canonicalDocKey } from "./storage/validation";
import { AREA_KEYS, type AreaKey } from "../lib/annexureParse";
import { DEFAULT_SETTINGS } from "./lifecycle";
import { DEFAULT_SCORE_BANDS, readScoreBands } from "../lib/scoreBands";

const SOURCE = "Annexure I read";

type ScoreSnapshot = {
  overallScore?: number;
  pssScore?: number;
  letterScore?: number;
  areas: { areaKey: string; areaName: string; score: number }[];
  departments: {
    name: string;
    canonicalName: string;
    score: number;
    isNew?: boolean;
  }[];
  documentName?: string;
  pageNumber?: number;
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validScore(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100) / 100;
}

function departmentAliases(settings: Record<string, unknown>) {
  const raw = settings.departmentNames ?? DEFAULT_SETTINGS.departmentNames;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) =>
      item && typeof item === "object"
        ? {
            pdfName: cleanText((item as Record<string, unknown>).pdfName),
            canonicalName: cleanText((item as Record<string, unknown>).canonicalName),
          }
        : null,
    )
    .filter(
      (item): item is { pdfName: string; canonicalName: string } =>
        !!item && !!item.pdfName && !!item.canonicalName,
    );
}

/** Context for the parser action: one read, no Drive id sent to the browser. */
export const parseContext = internalQuery({
  args: { documentId: v.string() },
  handler: async (ctx, { documentId }) => {
    const me = await requireActivatedUser(ctx);
    if (!canEdit(me)) return { ok: false as const, reason: "You cannot read assessment scores." };
    const doc = await ctx.db.get(documentId as Id<"facilityDocuments">);
    if (!doc) return { ok: false as const, reason: "Document not found." };
    if (doc.removedAt) return { ok: false as const, reason: "This document was removed." };
    if (!doc.isCurrent) return { ok: false as const, reason: "This is not the current version." };
    if (doc.missingInDriveAt)
      return {
        ok: false as const,
        reason: "This file is missing in storage — re-upload it before reading scores.",
      };
    if (canonicalDocKey(doc.docKey) !== "NQAS_Result")
      return { ok: false as const, reason: "Annexure I is read only from an NQAS Result PDF." };
    if (!/pdf/i.test(doc.mimeType) && !/\.pdf$/i.test(doc.originalName))
      return { ok: false as const, reason: "The NQAS Result must be a PDF." };
    const facility = await ctx.db.get(doc.facilityId);
    if (!facility) return { ok: false as const, reason: "Facility not found." };
    const allowed = await allowedBlockNames(ctx, me);
    if (allowed !== null && !allowed.has(facility.block))
      return { ok: false as const, reason: "This facility is outside your blocks." };

    const [settings, facilitiesAll, cycles, scores] = await Promise.all([
      getSettings(ctx),
      ctx.db.query("facilities").collect(),
      ctx.db.query("certificationCycles").collect(),
      ctx.db.query("annexureScores").collect(),
    ]);
    const facilities = facilitiesAll.filter(
      (f) => allowed === null || allowed.has(f.block),
    );
    const ids = new Set(facilities.map((f) => String(f._id)));
    const scopedScores = scores.filter((s) => ids.has(String(s.facilityId)));
    const scoreIds = new Set(scopedScores.map((s) => String(s._id)));
    const [areas, departments] = await Promise.all([
      ctx.db.query("annexureAreaScores").collect(),
      ctx.db.query("annexureDepartmentScores").collect(),
    ]);
    return {
      ok: true as const,
      document: {
        id: String(doc._id),
        driveFileId: doc.driveFileId,
        originalName: doc.originalName,
        displayName: doc.displayName ?? null,
        cycleNo: doc.cycleNo,
        facilityId: String(doc.facilityId),
      },
      facilities: facilities.map((f) => ({
        _id: String(f._id),
        name: f.name,
        block: f.block,
        phc: f.phc,
        facilityType: f.facilityType,
        currentCycleNumber: f.currentCycleNumber ?? null,
      })),
      cycles: cycles
        .filter((c) => ids.has(String(c.facilityId)))
        .map((c) => ({
          _id: String(c._id),
          facilityId: String(c.facilityId),
          cycleNumber: c.cycleNumber,
          superseded: c.superseded === true,
        })),
      existing: scopedScores.map((s) => ({
        _id: String(s._id),
        facilityId: String(s.facilityId),
        cycleId: String(s.cycleId),
        cycleNumber: s.cycleNumber,
        overallScore: s.overallScore ?? null,
        pssScore: s.pssScore ?? null,
        letterScore: s.letterScore ?? null,
        documentName: s.documentName,
        pageNumber: s.pageNumber,
        areas: areas
          .filter((a) => scoreIds.has(String(a.scoreId)) && String(a.scoreId) === String(s._id))
          .map((a) => ({ key: a.areaKey, name: a.areaName, score: a.score })),
        departments: departments
          .filter((d) => String(d.scoreId) === String(s._id))
          .map((d) => ({
            name: d.name,
            canonicalName: d.canonicalName,
            score: d.score,
            isNew: d.isNew === true,
          })),
      })),
      departmentNames: departmentAliases(settings),
      scoreBands: readScoreBands(
        (settings as { scoreBands?: unknown }).scoreBands ?? DEFAULT_SCORE_BANDS,
      ),
      district: "Tirupathur",
    };
  },
});

/** All saved scores for one facility — the Quick View Scores query. */
export const forFacility = query({
  args: { facilityId: v.id("facilities") },
  handler: async (ctx, { facilityId }) => {
    const me = await requireActivatedUser(ctx);
    const facility = await ctx.db.get(facilityId);
    if (!facility) return null;
    const allowed = await allowedBlockNames(ctx, me);
    if (allowed !== null && !allowed.has(facility.block)) return null;

    const [scores, areas, departments, cycles, settings] = await Promise.all([
      ctx.db
        .query("annexureScores")
        .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
        .collect(),
      ctx.db
        .query("annexureAreaScores")
        .withIndex("by_facility_cycle", (q) => q.eq("facilityId", facilityId))
        .collect(),
      ctx.db
        .query("annexureDepartmentScores")
        .withIndex("by_facility_cycle", (q) => q.eq("facilityId", facilityId))
        .collect(),
      ctx.db
        .query("certificationCycles")
        .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
        .collect(),
      getSettings(ctx),
    ]);
    const cycleById = new Map(cycles.map((c) => [String(c._id), c]));
    const rows = scores
      .sort((a, b) => a.cycleNumber - b.cycleNumber)
      .map((score) => {
        const areaRows = areas.filter((a) => String(a.scoreId) === String(score._id));
        const deptRows = departments.filter((d) => String(d.scoreId) === String(score._id));
        return {
          cycleId: String(score.cycleId),
          cycleNumber: score.cycleNumber,
          cycleType: cycleById.get(String(score.cycleId))?.cycleType ?? null,
          overall: score.overallScore ?? null,
          pss: score.pssScore ?? null,
          letterScore: score.letterScore ?? null,
          documentName: score.documentName,
          pageNumber: score.pageNumber,
          parsedAt: score.parsedAt,
          areas: AREA_KEYS.map((key) => {
            const row = areaRows.find((a) => a.areaKey === key);
            return row
              ? { key, name: row.areaName, score: row.score }
              : { key, name: key, score: null };
          }),
          departments: deptRows.map((d) => ({
            name: d.name,
            canonicalName: d.canonicalName,
            score: d.score,
            isNew: d.isNew === true,
          })),
        };
      });
    return {
      facility: { _id: String(facility._id), name: facility.name, block: facility.block },
      rows,
      scoreBands: readScoreBands(
        (settings as { scoreBands?: unknown }).scoreBands ?? DEFAULT_SCORE_BANDS,
      ),
    };
  },
});

/** Certified cycles with an NQAS Result file but no Annexure scores. */
export async function missingAnnexureCandidates(
  ctx: QueryCtx | MutationCtx,
): Promise<
  {
    documentId: string;
    facilityId: string;
    facility: string;
    block: string;
    facilityType: string | null;
    cycleNumber: number;
    certificationStatus: string;
    documentName: string;
  }[]
> {
  const [nas, cycles, docs, scores, facilities] = await Promise.all([
    ctx.db.query("nationalAssessments").collect(),
    ctx.db.query("certificationCycles").collect(),
    ctx.db.query("facilityDocuments").collect(),
    ctx.db.query("annexureScores").collect(),
    ctx.db.query("facilities").collect(),
  ]);
  const facilityById = new Map(facilities.map((f) => [String(f._id), f]));
  const cycleById = new Map(cycles.map((c) => [String(c._id), c]));
  const scored = new Set(scores.map((s) => `${String(s.facilityId)}:${String(s.cycleId)}`));
  const out: {
    documentId: string;
    facilityId: string;
    facility: string;
    block: string;
    facilityType: string | null;
    cycleNumber: number;
    certificationStatus: string;
    documentName: string;
  }[] = [];
  for (const na of nas) {
    const status = na.certificationStatus ?? "";
    if (!/quality certified|conditionality/i.test(status)) continue;
    if (scored.has(`${String(na.facilityId)}:${String(na.cycleId)}`)) continue;
    const cycle = cycleById.get(String(na.cycleId));
    if (!cycle) continue;
    const doc = docs
      .filter(
        (d) =>
          String(d.facilityId) === String(na.facilityId) &&
          d.cycleNo === cycle.cycleNumber &&
          d.isCurrent &&
          !d.removedAt &&
          canonicalDocKey(d.docKey) === "NQAS_Result",
      )
      .sort((a, b) => b.uploadedAt - a.uploadedAt)[0];
    if (!doc) continue;
    const facility = facilityById.get(String(na.facilityId));
    if (!facility) continue;
    out.push({
      documentId: String(doc._id),
      facilityId: String(facility._id),
      facility: facility.name,
      block: facility.block,
      facilityType: facility.facilityType ?? null,
      cycleNumber: cycle.cycleNumber,
      certificationStatus: status,
      documentName: doc.displayName ?? doc.originalName,
    });
  }
  return out.sort(
    (a, b) => a.facility.localeCompare(b.facility) || a.cycleNumber - b.cycleNumber,
  );
}

export const missing = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    if (!canEditAll(me)) return [];
    return missingAnnexureCandidates(ctx);
  },
});

/**
 * Apply selected facilities from the preview. Existing different scores are
 * only replaced when the caller explicitly sends decision = "replace"; the
 * preview defaults a conflict to "skip".
 */
export const apply = mutation({
  args: {
    documentId: v.string(),
    reads: v.array(
      v.object({
        facilityId: v.string(),
        cycleId: v.string(),
        pageNumber: v.number(),
        overallScore: v.union(v.number(), v.null()),
        pssScore: v.union(v.number(), v.null()),
        letterScore: v.union(v.number(), v.null()),
        annexureFacilityName: v.string(),
        district: v.union(v.string(), v.null()),
        warnings: v.array(v.string()),
        decision: v.union(v.literal("skip"), v.literal("replace")),
        areas: v.array(
          v.object({
            key: v.string(),
            name: v.string(),
            score: v.number(),
          }),
        ),
        departments: v.array(
          v.object({
            name: v.string(),
            canonicalName: v.string(),
            score: v.number(),
            isNew: v.boolean(),
          }),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    if (!canEdit(me)) throw new Error("You cannot save assessment scores.");
    const doc = await ctx.db.get(args.documentId as Id<"facilityDocuments">);
    if (!doc) throw new Error("Document not found.");
    if (doc.removedAt || !doc.isCurrent) throw new Error("This document is not current.");
    const allowed = await allowedBlockNames(ctx, me);
    const batchId = `annexure:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    let applied = 0;
    let skipped = 0;

    for (const read of args.reads) {
      const facility = await ctx.db.get(read.facilityId as Id<"facilities">);
      if (!facility) {
        skipped += 1;
        continue;
      }
      if (allowed !== null && !allowed.has(facility.block)) {
        skipped += 1;
        continue;
      }
      const cycle = await ctx.db.get(read.cycleId as Id<"certificationCycles">);
      if (!cycle || String(cycle.facilityId) !== String(facility._id)) {
        skipped += 1;
        continue;
      }
      const existing = await ctx.db
        .query("annexureScores")
        .withIndex("by_facility_cycle", (q) =>
          q.eq("facilityId", facility._id).eq("cycleId", cycle._id),
        )
        .first();
      if (existing && read.decision !== "replace") {
        skipped += 1;
        continue;
      }

      const oldAreas = existing
        ? await ctx.db
            .query("annexureAreaScores")
            .withIndex("by_score", (q) => q.eq("scoreId", existing._id))
            .collect()
        : [];
      const oldDepartments = existing
        ? await ctx.db
            .query("annexureDepartmentScores")
            .withIndex("by_score", (q) => q.eq("scoreId", existing._id))
            .collect()
        : [];
      const snapshot: ScoreSnapshot | null = existing
        ? {
            overallScore: existing.overallScore,
            pssScore: existing.pssScore,
            letterScore: existing.letterScore,
            documentName: existing.documentName,
            pageNumber: existing.pageNumber,
            areas: oldAreas.map((a) => ({
              areaKey: a.areaKey,
              areaName: a.areaName,
              score: a.score,
            })),
            departments: oldDepartments.map((d) => ({
              name: d.name,
              canonicalName: d.canonicalName,
              score: d.score,
              isNew: d.isNew,
            })),
          }
        : null;

      if (existing) {
        for (const row of oldAreas) await ctx.db.delete(row._id);
        for (const row of oldDepartments) await ctx.db.delete(row._id);
        await ctx.db.delete(existing._id);
      }

      const overall = validScore(read.overallScore);
      const pss = validScore(read.pssScore);
      const letter = validScore(read.letterScore);
      const scoreId = await ctx.db.insert("annexureScores", {
        facilityId: facility._id,
        cycleId: cycle._id,
        cycleNumber: cycle.cycleNumber,
        documentId: doc._id,
        documentName: doc.displayName ?? doc.originalName,
        pageNumber: Math.max(1, Math.round(read.pageNumber)),
        overallScore: overall ?? undefined,
        pssScore: pss ?? undefined,
        letterScore: letter ?? undefined,
        annexureFacilityName: cleanText(read.annexureFacilityName) || facility.name,
        district: cleanText(read.district) || undefined,
        warnings: read.warnings.slice(0, 20).map((w) => w.slice(0, 240)),
        batchId,
        parsedAt: now,
        parsedBy: me._id,
        parsedByName: me.name ?? me.email ?? "User",
      });

      const seenAreas = new Set<string>();
      for (const area of read.areas) {
        const key = area.key.toUpperCase();
        const score = validScore(area.score);
        if (!(AREA_KEYS as readonly string[]).includes(key) || score == null) continue;
        if (seenAreas.has(key)) continue;
        seenAreas.add(key);
        await ctx.db.insert("annexureAreaScores", {
          scoreId,
          facilityId: facility._id,
          cycleId: cycle._id,
          cycleNumber: cycle.cycleNumber,
          areaKey: key,
          areaName: cleanText(area.name) || key,
          score,
        });
      }
      const seenDepartments = new Set<string>();
      for (const department of read.departments) {
        const name = cleanText(department.name);
        const score = validScore(department.score);
        if (!name || score == null) continue;
        const dedupe = name.toLowerCase();
        if (seenDepartments.has(dedupe)) continue;
        seenDepartments.add(dedupe);
        await ctx.db.insert("annexureDepartmentScores", {
          scoreId,
          facilityId: facility._id,
          cycleId: cycle._id,
          cycleNumber: cycle.cycleNumber,
          name,
          canonicalName: cleanText(department.canonicalName) || name,
          score,
          isNew: department.isNew === true,
        });
      }

      await ctx.db.insert("auditLogs", {
        table: "annexureScores",
        recordId: String(scoreId),
        facilityId: facility._id,
        action: existing ? "update" : "create",
        field: "Annexure I scores",
        oldValue: snapshot,
        newValue: {
          overallScore: overall,
          pssScore: pss,
          areas: read.areas.length,
          departments: read.departments.length,
          documentName: doc.displayName ?? doc.originalName,
          pageNumber: read.pageNumber,
        },
        changedBy: me._id,
        changedByName: me.name ?? me.email ?? "User",
        changedAt: now,
        source: SOURCE,
        fileName: doc.displayName ?? doc.originalName,
        batchId,
      });
      applied += 1;
    }
    return { batchId, applied, skipped };
  },
});

/** Undo one preview batch, restoring a replaced snapshot exactly. */
export const undo = mutation({
  args: { batchId: v.string() },
  handler: async (ctx, { batchId }) => {
    const me = await requireActivatedUser(ctx);
    if (!canEdit(me)) throw new Error("You cannot undo assessment scores.");
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_batch", (q) => q.eq("batchId", batchId))
      .collect();
    let restored = 0;
    let removed = 0;
    let skipped = 0;
    const now = Date.now();

    for (const log of logs) {
      if (log.table !== "annexureScores" || log.source !== SOURCE) continue;
      const current = await ctx.db.get(log.recordId as Id<"annexureScores">);
      if (!current) {
        // The row was already removed (or a newer undo); nothing to restore.
        skipped += 1;
        continue;
      }
      const old =
        log.oldValue && typeof log.oldValue === "object"
          ? (log.oldValue as ScoreSnapshot)
          : null;
      const currentAreas = await ctx.db
        .query("annexureAreaScores")
        .withIndex("by_score", (q) => q.eq("scoreId", current._id))
        .collect();
      const currentDepartments = await ctx.db
        .query("annexureDepartmentScores")
        .withIndex("by_score", (q) => q.eq("scoreId", current._id))
        .collect();
      const facilityId = current.facilityId;
      const cycleId = current.cycleId;
      const cycleNumber = current.cycleNumber;
      for (const row of currentAreas) await ctx.db.delete(row._id);
      for (const row of currentDepartments) await ctx.db.delete(row._id);
      await ctx.db.delete(current._id);

      if (old) {
        const scoreId = await ctx.db.insert("annexureScores", {
          facilityId,
          cycleId,
          cycleNumber,
          documentId: current.documentId,
          documentName: old.documentName ?? current.documentName,
          pageNumber: old.pageNumber ?? current.pageNumber,
          overallScore: validScore(old.overallScore) ?? undefined,
          pssScore: validScore(old.pssScore) ?? undefined,
          letterScore: validScore(old.letterScore) ?? undefined,
          annexureFacilityName: current.annexureFacilityName,
          district: current.district,
          warnings: current.warnings,
          batchId: current.batchId,
          parsedAt: current.parsedAt,
          parsedBy: current.parsedBy,
          parsedByName: current.parsedByName,
        });
        for (const area of old.areas ?? []) {
          const score = validScore(area.score);
          if (score == null) continue;
          await ctx.db.insert("annexureAreaScores", {
            scoreId,
            facilityId,
            cycleId,
            cycleNumber,
            areaKey: area.areaKey,
            areaName: area.areaName,
            score,
          });
        }
        for (const department of old.departments ?? []) {
          const score = validScore(department.score);
          if (score == null) continue;
          await ctx.db.insert("annexureDepartmentScores", {
            scoreId,
            facilityId,
            cycleId,
            cycleNumber,
            name: department.name,
            canonicalName: department.canonicalName,
            score,
            isNew: department.isNew === true,
          });
        }
      }

      await ctx.db.insert("auditLogs", {
        table: "annexureScores",
        recordId: old ? String(facilityId) : log.recordId,
        facilityId,
        action: old ? "update" : "delete",
        field: "Annexure I scores",
        oldValue: "Annexure I scores",
        newValue: old ? "Previous scores restored" : "Scores removed",
        changedBy: me._id,
        changedByName: me.name ?? me.email ?? "User",
        changedAt: now,
        source: `${SOURCE} (undo)`,
        batchId,
      });
      if (old) restored += 1;
      else removed += 1;
    }
    return { restored, removed, skipped };
  },
});

/** Shared row shape for other server modules (Master List, sheet history). */
export async function scoresForCycles(
  ctx: QueryCtx,
  facilityId: Id<"facilities">,
  cycleIds: Id<"certificationCycles">[],
) {
  if (cycleIds.length === 0) return new Map<string, ScoreSnapshot>();
  const out = new Map<string, ScoreSnapshot>();
  for (const cycleId of cycleIds) {
    const score = await ctx.db
      .query("annexureScores")
      .withIndex("by_facility_cycle", (q) =>
        q.eq("facilityId", facilityId).eq("cycleId", cycleId),
      )
      .first();
    if (!score) continue;
    const [areas, departments] = await Promise.all([
      ctx.db
        .query("annexureAreaScores")
        .withIndex("by_score", (q) => q.eq("scoreId", score._id))
        .collect(),
      ctx.db
        .query("annexureDepartmentScores")
        .withIndex("by_score", (q) => q.eq("scoreId", score._id))
        .collect(),
    ]);
    out.set(String(cycleId), {
      overallScore: score.overallScore,
      pssScore: score.pssScore,
      letterScore: score.letterScore,
      documentName: score.documentName,
      pageNumber: score.pageNumber,
      areas: areas.map((a) => ({
        areaKey: a.areaKey as AreaKey,
        areaName: a.areaName,
        score: a.score,
      })),
      departments: departments.map((d) => ({
        name: d.name,
        canonicalName: d.canonicalName,
        score: d.score,
        isNew: d.isNew,
      })),
    });
  }
  return out;
}
