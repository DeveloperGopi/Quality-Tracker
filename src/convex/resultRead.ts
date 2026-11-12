/**
 * RESULT READER — preview context, one audited Accept and its Undo.
 *
 * OCR and parsing happen in the browser (lib/resultOcr). This module never
 * receives PDF bytes: it returns the facilities/cycles and existing values the
 * preview needs, then writes the selected fields and Annexure scores in one
 * transaction with one batch id. The old score rows, preview conflicts and
 * audit trail are preserved.
 */

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { Doc } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  allowedBlockNames,
  canEdit,
  getSettings,
  refreshFacilityStatus,
  requireActivatedUser,
} from "./facilities";
import { canonicalDocKey } from "./storage/validation";
import { computeDerivedNqas, DEFAULT_SETTINGS } from "./lifecycle";
import { DEFAULT_SCORE_BANDS, readScoreBands } from "../lib/scoreBands";
import { AREA_KEYS, type AreaKey } from "../lib/annexureParse";
import { isResultReaderEnabled } from "../lib/readerSettings";
import { RESULT_DECLARED, isResultDeclared, isResultDeclaredStatus } from "../lib/resultDeclared";

const SOURCE = "Result read";
const FIELD_LOG = "Result read — fields";
const SCORE_LOG = "Result read — scores";
const DECLARED_LOG = "Result declared (auto)";

type Fields = {
  certificationDate?: string | null;
  assessmentStartDate?: string | null;
  assessmentEndDate?: string | null;
  mode?: string | null;
  scopeOption?: string | null;
  checklistVersion?: string | null;
  overallScore?: number | null;
  certificationStatus?: string | null;
};

type AreaRead = { key: string; name: string; score: number };
type DepartmentRead = {
  name: string;
  canonicalName: string;
  score: number;
  isNew: boolean;
  kind?: string;
};

const fieldsValidator = v.object({
  certificationDate: v.optional(v.union(v.string(), v.null())),
  assessmentStartDate: v.optional(v.union(v.string(), v.null())),
  assessmentEndDate: v.optional(v.union(v.string(), v.null())),
  mode: v.optional(v.union(v.string(), v.null())),
  scopeOption: v.optional(v.union(v.string(), v.null())),
  checklistVersion: v.optional(v.union(v.string(), v.null())),
  overallScore: v.optional(v.union(v.number(), v.null())),
  certificationStatus: v.optional(v.union(v.string(), v.null())),
});

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function score(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100) / 100;
}

function sameScore(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 0.005;
}

function aliasesFromSettings(settings: Record<string, unknown>) {
  const raw = settings.departmentNames ?? DEFAULT_SETTINGS.departmentNames;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) =>
      item && typeof item === "object"
        ? {
            pdfName: clean((item as Record<string, unknown>).pdfName),
            canonicalName: clean((item as Record<string, unknown>).canonicalName),
          }
        : null,
    )
    .filter(
      (item): item is { pdfName: string; canonicalName: string } =>
        !!item && !!item.pdfName && !!item.canonicalName,
    );
}

function naFields(na: Doc<"nationalAssessments"> | null) {
  if (!na) return null;
  return {
    status: na.status ?? null,
    actualStartDate: na.actualStartDate ?? null,
    actualEndDate: na.actualEndDate ?? null,
    mode: na.mode ?? null,
    scopeOption: na.scopeOption ?? null,
    checklistVersion: na.checklistVersion ?? null,
    certificationStatus: na.certificationStatus ?? null,
    certificationDate: na.certificationDate ?? null,
    goiLetterDate: na.goiLetterDate ?? null,
    scorePercent: na.scorePercent ?? null,
    validityDate: na.validityDate ?? null,
    certifiedMonthYear: na.certifiedMonthYear ?? null,
    certifiedYear: na.certifiedYear ?? null,
    resultReadDocumentId: na.resultReadDocumentId ? String(na.resultReadDocumentId) : null,
  };
}

type ScoreSnapshot = {
  overallScore: number | null;
  pssScore: number | null;
  letterScore: number | null;
  pageNumber: number;
  documentName: string;
  areas: { key: string; name: string; score: number }[];
  departments: {
    name: string;
    canonicalName: string;
    score: number;
    isNew: boolean;
    kind?: string;
  }[];
};

function scoreSnapshot(
  existing: Doc<"annexureScores"> | null,
  areas: Doc<"annexureAreaScores">[],
  departments: Doc<"annexureDepartmentScores">[],
): ScoreSnapshot | null {
  if (!existing) return null;
  return {
    overallScore: existing.overallScore ?? null,
    pssScore: existing.pssScore ?? null,
    letterScore: existing.letterScore ?? null,
    pageNumber: existing.pageNumber,
    documentName: existing.documentName,
    areas: areas.map((area) => ({ key: area.areaKey, name: area.areaName, score: area.score })),
    departments: departments.map((department) => ({
      name: department.name,
      canonicalName: department.canonicalName,
      score: department.score,
      isNew: department.isNew === true,
      kind: department.kind,
    })),
  };
}

/** Latest accepted read for one Result file — badge and status line. */
export const documentStatus = query({
  args: { documentId: v.id("facilityDocuments") },
  handler: async (ctx, { documentId }) => {
    await requireActivatedUser(ctx);
    const row = await ctx.db
      .query("resultReads")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .order("desc")
      .first();
    return row
      ? {
          readAt: row.readAt,
          certifiedDate: row.certifiedDate ?? null,
          overallScore: row.overallScore ?? null,
          certificationStatus: row.certificationStatus ?? null,
          readMs: row.readMs ?? null,
          engine: row.engine ?? null,
        }
      : null;
  },
});

export const contexts = query({
  args: {
    documentIds: v.array(v.id("facilityDocuments")),
    facilityId: v.optional(v.id("facilities")),
  },
  handler: async (ctx, { documentIds, facilityId }) => {
    const me = await requireActivatedUser(ctx);
    if (!canEdit(me)) throw new Error("You cannot read NQAS results.");
    const allowed = await allowedBlockNames(ctx, me);
    const facilitiesAll = await ctx.db.query("facilities").collect();
    // `facilityId` is only the page's pre-filled choice. Keep every permitted
    // facility in the context so the dialog can switch to another row in the
    // same letter without a second query.
    const facilities = facilitiesAll.filter(
      (facility) => allowed === null || allowed.has(facility.block),
    );
    const ids = new Set(facilities.map((facility) => String(facility._id)));
    const [settings, cyclesAll, nasAll, scoresAll, areasAll, departmentsAll] =
      await Promise.all([
        getSettings(ctx),
        ctx.db.query("certificationCycles").collect(),
        ctx.db.query("nationalAssessments").collect(),
        ctx.db.query("annexureScores").collect(),
        ctx.db.query("annexureAreaScores").collect(),
        ctx.db.query("annexureDepartmentScores").collect(),
      ]);
    if (!isResultReaderEnabled(settings as unknown as Record<string, unknown>))
      throw new Error("The NQAS result reader is turned off in Admin → Documents.");
    const cycles = cyclesAll.filter((cycle) => ids.has(String(cycle.facilityId)));
    const nas = nasAll.filter((na) => ids.has(String(na.facilityId)));
    const scores = scoresAll.filter((row) => ids.has(String(row.facilityId)));
    const scoreIds = new Set(scores.map((row) => String(row._id)));
    const documents = [];
    for (const documentId of documentIds) {
      const doc = await ctx.db.get(documentId);
      if (
        !doc ||
        doc.removedAt ||
        !doc.isCurrent ||
        canonicalDocKey(doc.docKey) !== "NQAS_Result" ||
        !ids.has(String(doc.facilityId))
      ) {
        documents.push({
          id: String(documentId),
          ok: false as const,
          reason: !doc
            ? "Document not found."
            : doc.removedAt || !doc.isCurrent
              ? "This is not the current version."
              : canonicalDocKey(doc.docKey) !== "NQAS_Result"
                ? "This is not an NQAS Result file."
                : "This facility is outside your blocks.",
        });
        continue;
      }
      documents.push({
        id: String(doc._id),
        ok: true as const,
        facilityId: String(doc.facilityId),
        name: doc.displayName ?? doc.originalName,
        originalName: doc.originalName,
        cycleNo: doc.cycleNo,
        sha256: doc.sha256,
        pageCount: 0,
      });
    }
    return {
      documents,
      facilities: facilities.map((facility) => ({
        _id: String(facility._id),
        name: facility.name,
        block: facility.block,
        phc: facility.phc,
        facilityType: facility.facilityType,
        currentCycleNumber: facility.currentCycleNumber ?? null,
      })),
      cycles: cycles.map((cycle) => ({
        _id: String(cycle._id),
        facilityId: String(cycle.facilityId),
        cycleNumber: cycle.cycleNumber,
        superseded: cycle.superseded === true,
      })),
      existing: cycles.map((cycle) => {
        const na = nas.find((row) => String(row.cycleId) === String(cycle._id)) ?? null;
        const existingScore =
          scores.find(
            (row) =>
              String(row.facilityId) === String(cycle.facilityId) &&
              String(row.cycleId) === String(cycle._id),
          ) ?? null;
        const scoreRows = existingScore
          ? {
              overallScore: existingScore.overallScore ?? null,
              pssScore: existingScore.pssScore ?? null,
              letterScore: existingScore.letterScore ?? null,
              pageNumber: existingScore.pageNumber,
              documentName: existingScore.documentName,
              areas: areasAll
                .filter((area) => String(area.scoreId) === String(existingScore._id))
                .map((area) => ({ key: area.areaKey, name: area.areaName, score: area.score })),
              departments: departmentsAll
                .filter((department) => String(department.scoreId) === String(existingScore._id))
                .map((department) => ({
                  name: department.name,
                  canonicalName: department.canonicalName,
                  score: department.score,
                  isNew: department.isNew === true,
                  kind: department.kind ?? "department",
                })),
            }
          : null;
        return {
          facilityId: String(cycle.facilityId),
          cycleId: String(cycle._id),
          cycleNumber: cycle.cycleNumber,
          fields: naFields(na),
          scores: scoreRows,
        };
      }),
      departmentNames: aliasesFromSettings(settings),
      scopeOptions:
        ((settings as { scopeOptions?: unknown }).scopeOptions as string[] | undefined) ??
        DEFAULT_SETTINGS.scopeOptions,
      certificationStatuses:
        ((settings as { certificationStatuses?: unknown }).certificationStatuses as
          | string[]
          | undefined) ?? DEFAULT_SETTINGS.certificationStatuses,
      scoreBands: readScoreBands(
        (settings as { scoreBands?: unknown }).scoreBands ?? DEFAULT_SCORE_BANDS,
      ),
      district: "Tirupathur",
    };
  },
});

type ApplyItem = {
  documentId: string;
  facilityId: string;
  cycleId: string;
  pageNumber: number;
  annexureFacilityName: string;
  district?: string | null;
  fileHash: string;
  fields: Fields;
  saveScores: boolean;
  decision: "skip" | "replace";
  warnings: string[];
  overallScore: number | null;
  pssScore: number | null;
  letterScore: number | null;
  areas: AreaRead[];
  departments: DepartmentRead[];
  /** Real reader timing, kept in the audit trail and the read badge row. */
  readMs?: number | null;
  engine?: string | null;
};

type FieldSnapshot = ReturnType<typeof naFields>;

async function applyFields(
  ctx: MutationCtx,
  args: {
    na: Doc<"nationalAssessments">;
    fields: Fields;
    documentId: Id<"facilityDocuments">;
    settings: Record<string, unknown>;
    cycleId: Id<"certificationCycles">;
    facilityId: Id<"facilities">;
  },
): Promise<{ oldValue: FieldSnapshot; newValue: FieldSnapshot } | null> {
  const oldValue = naFields(args.na);
  const patch: Record<string, unknown> = {};
  const set = (key: keyof Fields, column: string, transform?: (value: string) => unknown) => {
    if (!(key in args.fields)) return;
    const raw = args.fields[key];
    const value =
      raw == null
        ? undefined
        : transform
          ? transform(String(raw))
          : typeof raw === "number"
            ? raw
            : String(raw).trim() || undefined;
    patch[column] = value;
  };

  if (!oldValue) return null;
  set("certificationDate", "certificationDate");
  set("certificationDate", "goiLetterDate");
  set("assessmentStartDate", "actualStartDate");
  set("assessmentEndDate", "actualEndDate");
  set("mode", "mode");
  set("scopeOption", "scopeOption");
  set("checklistVersion", "checklistVersion");
  set("overallScore", "scorePercent");
  set("certificationStatus", "certificationStatus");
  if (args.fields.certificationStatus !== undefined || args.fields.overallScore !== undefined) {
    const status = String(args.fields.certificationStatus ?? args.na.certificationStatus ?? "");
    if (isResultDeclaredStatus(status) || args.fields.overallScore != null) {
      patch.status = "Completed";
    }
  }
  patch.resultReadDocumentId = args.documentId;

  const candidate = { ...args.na, ...patch } as Doc<"nationalAssessments">;
  const derived = computeDerivedNqas(candidate, args.settings as never);
  patch.validityDate = derived.validityDate ?? undefined;
  patch.certifiedMonthYear = candidate.certificationDate
    ? candidate.certificationDate.slice(0, 7)
    : undefined;
  patch.certifiedYear = candidate.certificationDate
    ? Number(candidate.certificationDate.slice(0, 4))
    : undefined;

  await ctx.db.patch(args.na._id, patch);
  return { oldValue, newValue: naFields({ ...args.na, ...patch } as Doc<"nationalAssessments">) };
}

async function applyResultDeclared(
  ctx: MutationCtx,
  args: {
    cycleId: Id<"certificationCycles">;
    facilityId: Id<"facilities">;
    certificationStatus: string | null;
    userName: string;
    userId: Id<"users">;
    batchId: string;
  },
): Promise<{
  saId: Id<"stateAssessments">;
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
} | null> {
  const sa = await ctx.db
    .query("stateAssessments")
    .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
    .first();
  if (!sa || args.certificationStatus === null) return null;
  const declared = isResultDeclaredStatus(args.certificationStatus);
  if (declared && !isResultDeclared(sa.generalDocStatus)) {
    const portal =
      sa.generalDocStatusAuto === true ? sa.generalDocStatusPortal : sa.generalDocStatus;
    const patch = {
      generalDocStatus: RESULT_DECLARED,
      generalDocStatusAuto: true,
      generalDocStatusPortal: portal || undefined,
      generalDocUpdatedAt: Date.now(),
    };
    await ctx.db.patch(sa._id, patch);
    return {
      saId: sa._id,
      oldValue: {
        generalDocStatus: sa.generalDocStatus ?? null,
        generalDocStatusAuto: sa.generalDocStatusAuto ?? null,
        generalDocStatusPortal: sa.generalDocStatusPortal ?? null,
      },
      newValue: {
        generalDocStatus: RESULT_DECLARED,
        generalDocStatusAuto: true,
        generalDocStatusPortal: portal || null,
      },
    };
  }
  if (!declared && sa.generalDocStatusAuto === true) {
    const restore = sa.generalDocStatusPortal ?? undefined;
    await ctx.db.patch(sa._id, {
      generalDocStatus: restore,
      generalDocStatusAuto: false,
      generalDocStatusPortal: undefined,
      generalDocUpdatedAt: Date.now(),
    });
    return {
      saId: sa._id,
      oldValue: {
        generalDocStatus: sa.generalDocStatus ?? null,
        generalDocStatusAuto: true,
        generalDocStatusPortal: sa.generalDocStatusPortal ?? null,
      },
      newValue: {
        generalDocStatus: restore ?? null,
        generalDocStatusAuto: false,
        generalDocStatusPortal: null,
      },
    };
  }
  return null;
}

export const apply = mutation({
  args: {
    items: v.array(
      v.object({
        documentId: v.string(),
        facilityId: v.string(),
        cycleId: v.string(),
        pageNumber: v.number(),
        annexureFacilityName: v.string(),
        district: v.optional(v.union(v.string(), v.null())),
        fileHash: v.string(),
        fields: fieldsValidator,
        saveScores: v.boolean(),
        decision: v.union(v.literal("skip"), v.literal("replace")),
        warnings: v.array(v.string()),
        overallScore: v.union(v.number(), v.null()),
        pssScore: v.union(v.number(), v.null()),
        letterScore: v.union(v.number(), v.null()),
        areas: v.array(
          v.object({ key: v.string(), name: v.string(), score: v.number() }),
        ),
        departments: v.array(
          v.object({
            name: v.string(),
            canonicalName: v.string(),
            score: v.number(),
            isNew: v.boolean(),
            kind: v.optional(v.string()),
          }),
        ),
        readMs: v.optional(v.union(v.number(), v.null())),
        engine: v.optional(v.union(v.string(), v.null())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    if (!canEdit(me)) throw new Error("You cannot save NQAS results.");
    const allowed = await allowedBlockNames(ctx, me);
    const settings = await getSettings(ctx);
    if (!isResultReaderEnabled(settings as unknown as Record<string, unknown>))
      throw new Error("The NQAS result reader is turned off in Admin → Documents.");
    const batchId = `result:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    let applied = 0;
    let skipped = 0;
    const touched = new Set<string>();

    for (const item of args.items as ApplyItem[]) {
      const facility = await ctx.db.get(item.facilityId as Id<"facilities">);
      if (!facility || (allowed !== null && !allowed.has(facility.block))) {
        skipped += 1;
        continue;
      }
      const cycle = await ctx.db.get(item.cycleId as Id<"certificationCycles">);
      if (!cycle || String(cycle.facilityId) !== String(facility._id)) {
        skipped += 1;
        continue;
      }
      const doc = await ctx.db.get(item.documentId as Id<"facilityDocuments">);
      if (
        !doc ||
        doc.removedAt ||
        !doc.isCurrent ||
        canonicalDocKey(doc.docKey) !== "NQAS_Result"
      ) {
        skipped += 1;
        continue;
      }

      let na = await ctx.db
        .query("nationalAssessments")
        .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
        .first();
      if (!na) {
        const naId = await ctx.db.insert("nationalAssessments", {
          cycleId: cycle._id,
          facilityId: facility._id,
          status: "Pending",
        });
        na = (await ctx.db.get(naId))!;
      }

      const fieldResult = await applyFields(ctx, {
        na,
        fields: item.fields,
        documentId: doc._id,
        settings: settings as unknown as Record<string, unknown>,
        cycleId: cycle._id,
        facilityId: facility._id,
      });
      if (fieldResult) {
        await ctx.db.insert("auditLogs", {
          table: "nationalAssessments",
          recordId: String(na._id),
          facilityId: facility._id,
          action: "update",
          field: FIELD_LOG,
          oldValue: fieldResult.oldValue,
          newValue: {
            ...(fieldResult.newValue ?? {}),
            readMs: item.readMs ?? null,
            engine: item.engine ?? null,
          },
          changedBy: me._id,
          changedByName: me.name ?? me.email ?? "User",
          changedAt: now,
          source: SOURCE,
          fileName: doc.displayName ?? doc.originalName,
          batchId,
        });
      }

      const declared = await applyResultDeclared(ctx, {
        cycleId: cycle._id,
        facilityId: facility._id,
        certificationStatus:
          fieldResult?.newValue?.certificationStatus ??
          item.fields.certificationStatus ??
          null,
        userName: me.name ?? me.email ?? "User",
        userId: me._id,
        batchId,
      });
      if (declared) {
        await ctx.db.insert("auditLogs", {
          table: "stateAssessments",
          recordId: String(declared.saId),
          facilityId: facility._id,
          action: "update",
          field: DECLARED_LOG,
          oldValue: declared.oldValue,
          newValue: declared.newValue,
          changedBy: me._id,
          changedByName: me.name ?? me.email ?? "User",
          changedAt: now,
          source: "auto: result",
          fileName: doc.displayName ?? doc.originalName,
          batchId,
        });
      }

      if (item.saveScores) {
        const existing = await ctx.db
          .query("annexureScores")
          .withIndex("by_facility_cycle", (q) =>
            q.eq("facilityId", facility._id).eq("cycleId", cycle._id),
          )
          .first();
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
        if (existing && item.decision !== "replace") {
          skipped += 1;
        } else {
          const oldValue = scoreSnapshot(existing, oldAreas, oldDepartments);
          if (existing) {
            for (const row of oldAreas) await ctx.db.delete(row._id);
            for (const row of oldDepartments) await ctx.db.delete(row._id);
            await ctx.db.delete(existing._id);
          }
          const overall = score(item.overallScore);
          const pss = score(item.pssScore);
          const letter = score(item.letterScore);
          const scoreId = await ctx.db.insert("annexureScores", {
            facilityId: facility._id,
            cycleId: cycle._id,
            cycleNumber: cycle.cycleNumber,
            documentId: doc._id,
            documentName: doc.displayName ?? doc.originalName,
            pageNumber: Math.max(1, Math.round(item.pageNumber)),
            overallScore: overall ?? undefined,
            pssScore: pss ?? undefined,
            letterScore: letter ?? undefined,
            annexureFacilityName: clean(item.annexureFacilityName) || facility.name,
            district: clean(item.district) || undefined,
            warnings: item.warnings.slice(0, 20).map((warning) => warning.slice(0, 240)),
            batchId,
            parsedAt: now,
            parsedBy: me._id,
            parsedByName: me.name ?? me.email ?? "User",
          });
          const seenAreas = new Set<string>();
          for (const area of item.areas) {
            const key = area.key.toUpperCase();
            const value = score(area.score);
            if (!(AREA_KEYS as readonly string[]).includes(key) || value == null) continue;
            if (seenAreas.has(key)) continue;
            seenAreas.add(key);
            await ctx.db.insert("annexureAreaScores", {
              scoreId,
              facilityId: facility._id,
              cycleId: cycle._id,
              cycleNumber: cycle.cycleNumber,
              areaKey: key,
              areaName: clean(area.name) || key,
              score: value,
            });
          }
          const seenDepartments = new Set<string>();
          for (const department of item.departments) {
            const name = clean(department.name);
            const value = score(department.score);
            if (!name || value == null) continue;
            const dedupe = name.toLowerCase();
            if (seenDepartments.has(dedupe)) continue;
            seenDepartments.add(dedupe);
            await ctx.db.insert("annexureDepartmentScores", {
              scoreId,
              facilityId: facility._id,
              cycleId: cycle._id,
              cycleNumber: cycle.cycleNumber,
              name,
              canonicalName: clean(department.canonicalName) || name,
              score: value,
              isNew: department.isNew === true,
              kind: clean(department.kind) || undefined,
            });
          }
          await ctx.db.insert("auditLogs", {
            table: "annexureScores",
            recordId: String(scoreId),
            facilityId: facility._id,
            action: existing ? "update" : "create",
            field: SCORE_LOG,
            oldValue: oldValue ?? { note: "No earlier scores for this cycle" },
            newValue: {
              overallScore: overall,
              pssScore: pss,
              letterScore: letter,
              areas: item.areas.length,
              departments: item.departments.length,
              pageNumber: item.pageNumber,
              documentName: doc.displayName ?? doc.originalName,
              readMs: item.readMs ?? null,
              engine: item.engine ?? null,
            },
            changedBy: me._id,
            changedByName: me.name ?? me.email ?? "User",
            changedAt: now,
            source: SOURCE,
            fileName: doc.displayName ?? doc.originalName,
            batchId,
          });
        }
      }

      // Read status is independent of whether a conflicting score was saved:
      // the file really was read, and the badge must say so.
      const previousRead = await ctx.db
        .query("resultReads")
        .withIndex("by_document", (q) => q.eq("documentId", doc._id))
        .collect();
      const same = previousRead.find(
        (row) =>
          String(row.facilityId) === String(facility._id) &&
          String(row.cycleId) === String(cycle._id),
      );
      const readRow = {
        documentId: doc._id,
        facilityId: facility._id,
        cycleId: cycle._id,
        cycleNumber: cycle.cycleNumber,
        fileHash: item.fileHash,
        certifiedDate: fieldResult?.newValue?.certificationDate ?? undefined,
        overallScore: fieldResult?.newValue?.scorePercent ?? item.overallScore ?? undefined,
        certificationStatus: fieldResult?.newValue?.certificationStatus ?? undefined,
        readMs: item.readMs ?? undefined,
        engine: item.engine ?? undefined,
        batchId,
        readAt: now,
        readBy: me._id,
        readByName: me.name ?? me.email ?? "User",
      };
      if (same) await ctx.db.patch(same._id, readRow);
      else await ctx.db.insert("resultReads", readRow);

      touched.add(String(facility._id));
      applied += 1;
    }

    for (const facilityId of touched) {
      await refreshFacilityStatus(
        ctx,
        facilityId as Id<"facilities">,
        me.name ?? "Unknown",
        me._id,
        false,
      );
    }
    return { batchId, applied, skipped };
  },
});

/** Restore one result batch: fields, scores, Result Declared and read badges. */
export const undo = mutation({
  args: { batchId: v.string() },
  handler: async (ctx, { batchId }) => {
    const me = await requireActivatedUser(ctx);
    if (!canEdit(me)) throw new Error("You cannot undo this read.");
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_batch", (q) => q.eq("batchId", batchId))
      .collect();
    let fields = 0;
    let scores = 0;
    let skipped = 0;
    const facilities = new Set<string>();

    for (const log of logs) {
      if (log.source !== SOURCE && log.source !== "auto: result") continue;
      if (log.table === "nationalAssessments" && log.field === FIELD_LOG) {
        const na = await ctx.db.get(log.recordId as Id<"nationalAssessments">);
        const old = log.oldValue as Record<string, unknown> | null;
        if (!na || !old) {
          skipped += 1;
          continue;
        }
        const patch: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(old)) {
          if (key === "resultReadDocumentId") {
            patch.resultReadDocumentId = value ? (value as Id<"facilityDocuments">) : undefined;
          } else if (key === "certifiedYear") {
            patch.certifiedYear = value == null ? undefined : Number(value);
          } else {
            patch[key] = value == null ? undefined : value;
          }
        }
        await ctx.db.patch(na._id, patch);
        facilities.add(String(na.facilityId));
        fields += 1;
      } else if (log.table === "annexureScores" && log.field === SCORE_LOG) {
        const current = await ctx.db.get(log.recordId as Id<"annexureScores">);
        const old = log.oldValue as ScoreSnapshot | null;
        if (!current || !old || current.batchId !== batchId) {
          skipped += 1;
          continue;
        }
        const currentAreas = await ctx.db
          .query("annexureAreaScores")
          .withIndex("by_score", (q) => q.eq("scoreId", current._id))
          .collect();
        const currentDepartments = await ctx.db
          .query("annexureDepartmentScores")
          .withIndex("by_score", (q) => q.eq("scoreId", current._id))
          .collect();
        for (const row of currentAreas) await ctx.db.delete(row._id);
        for (const row of currentDepartments) await ctx.db.delete(row._id);
        await ctx.db.delete(current._id);
        if (!("note" in old)) {
          const scoreId = await ctx.db.insert("annexureScores", {
            facilityId: current.facilityId,
            cycleId: current.cycleId,
            cycleNumber: current.cycleNumber,
            documentId: current.documentId,
            documentName: old.documentName || current.documentName,
            pageNumber: old.pageNumber || current.pageNumber,
            overallScore: score(old.overallScore) ?? undefined,
            pssScore: score(old.pssScore) ?? undefined,
            letterScore: score(old.letterScore) ?? undefined,
            annexureFacilityName: current.annexureFacilityName,
            district: current.district,
            warnings: current.warnings,
            batchId: current.batchId,
            parsedAt: current.parsedAt,
            parsedBy: current.parsedBy,
            parsedByName: current.parsedByName,
          });
          for (const area of old.areas ?? []) {
            const value = score(area.score);
            if (value == null) continue;
            await ctx.db.insert("annexureAreaScores", {
              scoreId,
              facilityId: current.facilityId,
              cycleId: current.cycleId,
              cycleNumber: current.cycleNumber,
              areaKey: area.key,
              areaName: area.name,
              score: value,
            });
          }
          for (const department of old.departments ?? []) {
            const value = score(department.score);
            if (value == null) continue;
            await ctx.db.insert("annexureDepartmentScores", {
              scoreId,
              facilityId: current.facilityId,
              cycleId: current.cycleId,
              cycleNumber: current.cycleNumber,
              name: department.name,
              canonicalName: department.canonicalName,
              score: value,
              isNew: department.isNew === true,
              kind: department.kind,
            });
          }
        }
        facilities.add(String(current.facilityId));
        scores += 1;
      } else if (log.table === "stateAssessments" && log.field === DECLARED_LOG) {
        const sa = await ctx.db.get(log.recordId as Id<"stateAssessments">);
        const old = log.oldValue as Record<string, unknown> | null;
        if (!sa || !old) {
          skipped += 1;
          continue;
        }
        await ctx.db.patch(sa._id, {
          generalDocStatus: (old.generalDocStatus as string | null) ?? undefined,
          generalDocStatusAuto: old.generalDocStatusAuto === true,
          generalDocStatusPortal: (old.generalDocStatusPortal as string | null) ?? undefined,
          generalDocUpdatedAt: Date.now(),
        });
        facilities.add(String(sa.facilityId));
      }
    }

    const reads = await ctx.db
      .query("resultReads")
      .withIndex("by_batch", (q) => q.eq("batchId", batchId))
      .collect();
    for (const row of reads) await ctx.db.delete(row._id);

    for (const facilityId of facilities) {
      await refreshFacilityStatus(
        ctx,
        facilityId as Id<"facilities">,
        me.name ?? "Unknown",
        me._id,
        false,
      );
    }
    if (fields + scores > 0) {
      await ctx.db.insert("auditLogs", {
        table: "nationalAssessments",
        recordId: "result-read",
        action: "update",
        field: "Result read undo",
        oldValue: `${fields} field record(s), ${scores} score record(s)`,
        newValue: "Restored the values before this read",
        changedBy: me._id,
        changedByName: me.name ?? me.email ?? "User",
        changedAt: Date.now(),
        source: `${SOURCE} (undo)`,
      });
    }
    return { restored: fields + scores, skipped };
  },
});

/** Small read used by the Document Library badge/filter extension. */
export async function readStatusByDocument(
  ctx: QueryCtx,
  documentIds: string[],
): Promise<Map<string, { readAt: number; certifiedDate: string | null; overallScore: number | null }>> {
  const out = new Map<
    string,
    { readAt: number; certifiedDate: string | null; overallScore: number | null }
  >();
  for (const documentId of documentIds) {
    const row = await ctx.db
      .query("resultReads")
      .withIndex("by_document", (q) => q.eq("documentId", documentId as Id<"facilityDocuments">))
      .order("desc")
      .first();
    if (row) {
      out.set(documentId, {
        readAt: row.readAt,
        certifiedDate: row.certifiedDate ?? null,
        overallScore: row.overallScore ?? null,
      });
    }
  }
  return out;
}
