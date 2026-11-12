import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import {
  requireActivatedUser,
  canEdit,
  getSettings,
  allowedBlockNames,
  normalizeNin,
  refreshFacilityStatus,
  markFacilityChanged,
} from "./facilities";
import { COUNTED_DOC_KEYS, canonicalDocKey, docType, isCountedDocKey } from "./storage/validation";
import { departmentsForFacility } from "../lib/departments";
import { normalizeDocumentRules, resolveDocumentRequirements } from "../lib/documentRules";
import { latestCompletedQuarter } from "../lib/pending";
import {
  todayIso,
  DEFAULT_SETTINGS,
  computeDerivedNqas,
  computeRecertInfo,
  deriveFireNocStatus,
  deriveIaStatus,
  deriveLifecycleView,
  PIPELINE_STAGES,
  type LifecycleSegment,
  type PipelineStage,
} from "./lifecycle";

// ---------- shared helpers ----------

async function audit(
  ctx: MutationCtx,
  args: {
    table: string;
    recordId: string;
    facilityId?: Id<"facilities">;
    action: string;
    field?: string;
    oldValue?: unknown;
    newValue?: unknown;
    userName?: string;
    userId?: Id<"users">;
  },
) {
  const changedAt = Date.now();
  await ctx.db.insert("auditLogs", {
    table: args.table,
    recordId: args.recordId,
    facilityId: args.facilityId,
    action: args.action,
    field: args.field,
    oldValue: args.oldValue ?? null,
    newValue: args.newValue ?? null,
    changedBy: args.userId,
    changedByName: args.userName,
    changedAt,
  });
  if (args.facilityId) {
    await markFacilityChanged(ctx, args.facilityId, {
      at: changedAt,
      userName: args.userName,
      key: args.field ?? args.table,
    });
  }
}

/* ================================================================
 *  FAST FACILITY ROWS  (replaces facilities.listFacilityRows)
 *  The original ran ~8 indexed queries PER facility (1250+ queries for
 *  157 facilities) which made the Facility Master List crawl. This
 *  version batch-loads every cycle / SA / NA / fund / NOC / building
 *  row in 6 table scans and joins them in memory — identical row shape.
 * ================================================================ */

export const listFacilityRowsFast = query({
  // The ONE cycle scope (Part 3): "current" (default), a cycle number, or
  // "all" for list pages (one row per facility per cycle). Non-list pages
  // never request "all" — summaries would double-count.
  args: {
    cycle: v.optional(v.union(v.literal("current"), v.literal("all"), v.number())),
  },
  handler: async (ctx, { cycle: cycleScope }) => {
    const user = await requireActivatedUser(ctx);
    const blocks = await ctx.db.query("blocks").collect();
    blocks.sort((a, b) => a.name.localeCompare(b.name));
    const allowed = await allowedBlockNames(ctx, user);
    let facilities = await ctx.db.query("facilities").collect();
    if (allowed !== null)
      facilities = facilities.filter((f) => allowed.has(f.block));
    // Ascending hierarchy: Block → PHC → facility name (HSCs sort under
    // their PHC, matching the state facility order).
    facilities.sort(
      (a, b) =>
        a.block.localeCompare(b.block) ||
        a.phc.localeCompare(b.phc) ||
        a.name.localeCompare(b.name),
    );

    const s = await getSettings(ctx);
    const today = todayIso();

    // ---- batch load everything in 7 scans ----
    const idSet = new Set(facilities.map((f) => f._id));
    const allCycles = await ctx.db.query("certificationCycles").collect();
    const cyclesByFacility = new Map<Id<"facilities">, Doc<"certificationCycles">[]>();
    for (const c of allCycles) {
      if (!idSet.has(c.facilityId)) continue;
      const list = cyclesByFacility.get(c.facilityId) ?? [];
      list.push(c);
      cyclesByFacility.set(c.facilityId, list);
    }
    const cycleById = new Map(allCycles.map((c) => [c._id, c]));
    const [
      allSas,
      allNas,
      allFunds,
      allNocs,
      allBuildings,
      allDocs,
      allIa,
      allAnnexure,
      allAnnexureAreas,
      allAnnexureDepartments,
    ] = await Promise.all([
      ctx.db.query("stateAssessments").collect(),
      ctx.db.query("nationalAssessments").collect(),
      ctx.db.query("gapClosureFunds").collect(),
      ctx.db.query("fireNocs").collect(),
      ctx.db.query("buildingDetails").collect(),
      // Documents count — metadata rows only, never a Drive call. One scan,
      // joined below, so the list carries the same n/6 the Documents panel
      // shows (no per-row query, no N+1).
      ctx.db.query("facilityDocuments").collect(),
      // The latest completed quarter's IA row, so the pending IA rule reads
      // the same fact on the page, in the bell and in the Master List.
      ctx.db.query("facilityIaQuarters").collect(),
      // Annexure I scores, one scan each. The exact cycle is joined below so
      // a row shows the scores of ITS cycle — never another cycle's.
      ctx.db.query("annexureScores").collect(),
      ctx.db.query("annexureAreaScores").collect(),
      ctx.db.query("annexureDepartmentScores").collect(),
    ]);
    const docsByFacility = new Map<
      Id<"facilities">,
      Map<string, { name: string; uploadedAt: number }>
    >();
    const docsMissingInDrive = new Map<Id<"facilities">, string[]>();
    for (const d of allDocs) {
      if (!idSet.has(d.facilityId)) continue;
      // A current file the nightly reconciliation could not find in Drive.
      if (d.isCurrent && !d.removedAt && d.missingInDriveAt && isCountedDocKey(d.docKey)) {
        const key = canonicalDocKey(d.docKey);
        const list = docsMissingInDrive.get(d.facilityId) ?? [];
        if (!list.includes(key)) list.push(key);
        docsMissingInDrive.set(d.facilityId, list);
      }
      if (!d.isCurrent || d.removedAt || d.missingInDriveAt) continue;
      if (!isCountedDocKey(d.docKey)) continue;
      const map = docsByFacility.get(d.facilityId) ?? new Map();
      // One key per document: a legacy NQAS_Certificate row counts as the
      // NQAS Result, exactly like the Documents card.
      map.set(canonicalDocKey(d.docKey), {
        name: d.originalName,
        uploadedAt: d.uploadedAt,
      });
      docsByFacility.set(d.facilityId, map);
    }
    const saByCycle = new Map(allSas.map((s) => [s.cycleId, s]));
    const naByCycle = new Map(allNas.map((n) => [n.cycleId, n]));
    const fundsByFacility = new Map<Id<"facilities">, Doc<"gapClosureFunds">[]>();
    for (const r of allFunds) {
      if (!idSet.has(r.facilityId)) continue;
      const list = fundsByFacility.get(r.facilityId) ?? [];
      list.push(r);
      fundsByFacility.set(r.facilityId, list);
    }
    const nocsByFacility = new Map<Id<"facilities">, Doc<"fireNocs">[]>();
    for (const r of allNocs) {
      if (!idSet.has(r.facilityId)) continue;
      const list = nocsByFacility.get(r.facilityId) ?? [];
      list.push(r);
      nocsByFacility.set(r.facilityId, list);
    }
    const buildingByFacility = new Map<Id<"facilities">, Doc<"buildingDetails">>();
    for (const r of allBuildings) {
      if (!idSet.has(r.facilityId)) continue;
      if (!buildingByFacility.has(r.facilityId)) buildingByFacility.set(r.facilityId, r);
    }
    const scoreByCycle = new Map<string, (typeof allAnnexure)[number]>();
    for (const row of allAnnexure) {
      if (!idSet.has(row.facilityId)) continue;
      scoreByCycle.set(String(row.cycleId), row);
    }
    const areasByScore = new Map<string, typeof allAnnexureAreas>();
    for (const row of allAnnexureAreas) {
      if (!idSet.has(row.facilityId)) continue;
      const key = String(row.scoreId);
      const list = areasByScore.get(key) ?? [];
      list.push(row);
      areasByScore.set(key, list);
    }
    const departmentsByScore = new Map<string, typeof allAnnexureDepartments>();
    for (const row of allAnnexureDepartments) {
      if (!idSet.has(row.facilityId)) continue;
      const key = String(row.scoreId);
      const list = departmentsByScore.get(key) ?? [];
      list.push(row);
      departmentsByScore.set(key, list);
    }
    const latestIaPeriod = latestCompletedQuarter(today);
    const iaLatestByFacility = new Map<Id<"facilities">, Doc<"facilityIaQuarters">>();
    for (const q of allIa) {
      if (!idSet.has(q.facilityId)) continue;
      if (q.fy !== latestIaPeriod.fy || q.quarter !== latestIaPeriod.quarter) continue;
      iaLatestByFacility.set(q.facilityId, q);
    }

    const scope = cycleScope ?? "current";
    // Cycle resolution MUST mirror the profile's "Attached files" list
    // (lib/profileSheetRow): "current" = the stored pointer first, then the
    // active (non-superseded) cycle, then the newest cycle. Only ever reading
    // `currentCycleNumber` meant a facility whose pointer was 0 showed
    // "SA Report (PDF) —" and "Documents 0/5" while the uploaded files sat
    // on the active cycle.
    const activeCycleOf = (
      f: Doc<"facilities">,
      cycles: Doc<"certificationCycles">[],
    ): Doc<"certificationCycles"> | null => {
      if (scope === "all")
        return cycles.find((c) => !c.superseded) ?? cycles[cycles.length - 1] ?? null;
      if (scope === "current")
        return (
          cycles.find((c) => c.cycleNumber === f.currentCycleNumber) ??
          cycles.find((c) => !c.superseded) ??
          cycles[cycles.length - 1] ??
          null
        );
      return cycles.find((c) => c.cycleNumber === scope) ?? null;
    };

    // A numeric scope shows only facilities that HAVE that cycle; "all" keeps
    // every facility (one row per cycle, or one empty-cycle row).
    const scopedFacilities =
      scope === "all" || scope === "current"
        ? facilities
        : facilities.filter((f) =>
            (cyclesByFacility.get(f._id) ?? []).some((c) => c.cycleNumber === scope),
          );

    const rows = scopedFacilities.flatMap((f) => {
      const cycles = (cyclesByFacility.get(f._id) ?? []).sort(
        (a, b) => a.cycleNumber - b.cycleNumber,
      );
      const picks: (Doc<"certificationCycles"> | null)[] =
        scope === "all" ? (cycles.length > 0 ? cycles : [null]) : [activeCycleOf(f, cycles)];
      return picks.map((cycle) => {
      const sa = cycle ? (saByCycle.get(cycle._id) ?? null) : null;
      const nqas = cycle ? (naByCycle.get(cycle._id) ?? null) : null;
      const funds = (fundsByFacility.get(f._id) ?? []).sort((a, b) =>
        b.financialYear.localeCompare(a.financialYear),
      );
      const nocs = (nocsByFacility.get(f._id) ?? []).sort((a, b) =>
        (b.expiryDate ?? "").localeCompare(a.expiryDate ?? ""),
      );
      const fund = funds[0] ?? null;
      const noc = nocs[0] ?? null;
      const building = buildingByFacility.get(f._id) ?? null;
      return {
        facility: f,
        // Internal Assessment freshness — one shared date-based rule
        // (deriveIaStatus) so "IA overdue" means the same thing on every
        // surface that reads a tracker row.
        ia: deriveIaStatus(
          { lastDate: f.iaLastDate ?? null, lastScore: f.iaLastScore ?? null },
          s,
          today,
        ),
        cycleNumber: cycle?.cycleNumber ?? null,
        cycleType: cycle?.cycleType ?? null,
        recertStage: cycle?.recertStage ?? null,
        scores: (() => {
          const score = cycle ? scoreByCycle.get(String(cycle._id)) : null;
          if (!score) return null;
          const areaRows = areasByScore.get(String(score._id)) ?? [];
          const departmentRows = departmentsByScore.get(String(score._id)) ?? [];
          return {
            overall: score.overallScore ?? null,
            pss: score.pssScore ?? null,
            letterScore: score.letterScore ?? null,
            areas: areaRows.map((a) => ({
              key: a.areaKey,
              name: a.areaName,
              score: a.score,
            })),
            departments: departmentRows.map((d) => ({
              name: d.name,
              canonicalName: d.canonicalName,
              score: d.score,
              isNew: d.isNew === true,
            })),
          };
        })(),
        // null = the latest completed quarter genuinely has no IA row;
        // undefined would mean "not loaded" and the rule stays silent.
        latestIa: (() => {
          const q = iaLatestByFacility.get(f._id);
          if (!q) return null;
          return {
            fy: q.fy,
            quarter: q.quarter,
            score: q.nqasIaScore ?? null,
            notApplicable: q.notApplicable === true,
          };
        })(),
        docs: (() => {
          const files = docsByFacility.get(f._id) ?? new Map<string, { name: string; uploadedAt: number }>();
          const present = [...files.keys()];
          const presentSet = new Set(present);
          const requirements = resolveDocumentRequirements(
            normalizeDocumentRules((s as { documentRules?: unknown }).documentRules),
            {
              certStatus: nqas?.certificationStatus ?? null,
              gapAmount: fund?.amountSanctioned ?? 0,
              dilapidated: (building?.buildingStatus ?? "").toLowerCase() === "dilapidated",
              fireNocRecorded:
                !!noc &&
                ((noc.nocAvailable ?? "") === "Yes" ||
                  !!noc.issuedDate ||
                  !!noc.attachmentId ||
                  /obtained|valid/i.test(noc.status ?? "")),
            },
          );
          const requiredMissing = Object.keys(requirements)
            .filter((key) => requirements[key].required && !presentSet.has(key))
            .map((key) => ({
              key,
              label: docType(key as never)?.label ?? key.replace(/_/g, " "),
              blocking: requirements[key].blocking,
            }));
          return {
            uploaded: present.length,
            total: COUNTED_DOC_KEYS.length,              // WHICH documents are present — the Needs-attention check needs
              // the keys, not just a count, to say which required file is missing.
              keys: present,
              // Current files the nightly reconciliation could not find in Drive.
              missingInDriveKeys: docsMissingInDrive.get(f._id) ?? [],
              // Original name + upload date per key, for the sheet's
              // "Uploaded 25-Sep-2026 · C2_Kurumbakeri HSC.pdf" line.
              files: Object.fromEntries(files),
              requirements,
            // The label is replaced below with the shared document label.
            requiredMissing,
          };
        })(),
        sa: sa
          ? {
              status: sa.status,
              scheduledDate: sa.scheduledDate ?? null,
              revisedDate: sa.revisedDate ?? null,
              actualStartDate: sa.actualStartDate ?? null,
              actualEndDate: sa.actualEndDate ?? null,
              scorePercent: sa.scorePercent ?? null,
              generalDocStatus: sa.generalDocStatus ?? null,
              assessor1Name: sa.assessor1Name ?? null,
              assessor2Name: sa.assessor2Name ?? null,
              // Per-assessor HUDs; assessorHud is the legacy shared column.
              assessor1Hud: sa.assessor1Hud ?? sa.assessorHud ?? null,
              assessor2Hud: sa.assessor2Hud ?? null,
              reportAttachmentId: sa.reportAttachmentId
                ? String(sa.reportAttachmentId)
                : null,
              reportAttachmentName: sa.reportAttachmentName ?? null,
              checklistAttachmentId: sa.checklistAttachmentId
                ? String(sa.checklistAttachmentId)
                : null,
              checklistAttachmentName: sa.checklistAttachmentName ?? null,
            }
          : null,
        resultDocumentId: nqas?.resultDocumentId
          ? String(nqas.resultDocumentId)
          : null,
        resultDocumentName: nqas?.resultDocumentName ?? null,
        resultDocumentUpdatedAt: nqas?.resultDocumentUpdatedAt ?? null,
        certDocumentId: nqas?.certDocumentId
          ? String(nqas.certDocumentId)
          : null,
        certDocumentName: nqas?.certDocumentName ?? null,
        certDocumentUpdatedAt: nqas?.certDocumentUpdatedAt ?? null,
        nqas: nqas
          ? {
              status: nqas.status,
              scheduledStartDate: nqas.scheduledStartDate ?? null,
              scheduledEndDate: nqas.scheduledEndDate ?? null,
              actualStartDate: nqas.actualStartDate ?? null,
              actualEndDate: nqas.actualEndDate ?? null,
              mode: nqas.mode ?? null,
              checklistVersion: nqas.checklistVersion ?? null,
              departments: nqas.departments ?? null,
              // HWC HSC → the 12 service packages; PHC/CHC → the configured
              // department list. One helper, so the count and the names agree.
              departmentOptions: departmentsForFacility(
                f.facilityType,
                (s.departments as string[] | undefined) ?? DEFAULT_SETTINGS.departments,
                (s as { servicePackages?: string[] }).servicePackages ?? null,
              ),
              departmentsTotal: departmentsForFacility(
                f.facilityType,
                (s.departments as string[] | undefined) ?? DEFAULT_SETTINGS.departments,
                (s as { servicePackages?: string[] }).servicePackages ?? null,
              ).length,
              scorePercent: nqas.scorePercent ?? null,
              certificationStatus: nqas.certificationStatus ?? null,
              certificationDate: nqas.certificationDate ?? null,
              goiLetterDate: nqas.goiLetterDate ?? null,
              validityDate: nqas.validityDate ?? null,
              surveillanceDue1: nqas.surveillanceDue1 ?? null,
              surveillanceDone1: nqas.surveillanceDone1 ?? null,
              surveillanceDue2: nqas.surveillanceDue2 ?? null,
              surveillanceDone2: nqas.surveillanceDone2 ?? null,
              manualScore: nqas.manualScore ?? null,
              recertStatus: nqas.manualRecertStatus ?? null,
              recertYear: nqas.recertYear ?? null,
            }
          : null,
        fund: fund
          ? {
              amountSanctioned: fund.amountSanctioned ?? null,
              financialYear: fund.financialYear,
              procLink: fund.procLink ?? null,
              amountReleased: fund.amountReleased ?? null,
              amountUtilized: fund.amountUtilized ?? null,
              fundAttachmentId: fund.attachmentId
                ? String(fund.attachmentId)
                : null,
              fundAttachmentName: fund.attachmentName ?? null,
              updatedAt: fund.updatedAt ?? null,
              status: fund.status,
            }
          : null,
        noc: noc
          ? {
              nocAvailable: noc.nocAvailable ?? null,
              // "Fire NOC Validity Status" is derived from the validity
              // (expiry) date — Expired / Expiring Soon / Valid — not from
              // the stored dropdown, so the column self-updates daily.
              status: deriveFireNocStatus(
                noc.nocAvailable ?? null,
                noc.expiryDate ?? null,
                noc.status,
                today,
                s.fireNocAlertLeadDays,
              ),
              issuedDate: noc.issuedDate ?? null,
              expiryDate: noc.expiryDate ?? null,
              nocLink: noc.nocLink ?? null,
              nocAttachmentId: noc.attachmentId ? String(noc.attachmentId) : null,
              nocAttachmentName: noc.attachmentName ?? null,
              updatedAt: noc.updatedAt ?? null,
            }
          : null,
        building: building
          ? {
              buildingType: building.buildingType ?? null,
              buildingStatus: building.buildingStatus,
              lastUpdatedAt: building.lastUpdatedAt ?? null,
              condemnedLink: building.condemnedLink ?? null,
              condemnedAttachmentId: building.condemnedAttachmentId
                ? String(building.condemnedAttachmentId)
                : null,
              condemnedAttachmentName: building.condemnedAttachmentName ?? null,
            }
          : null,
      };
      });
    });
    void cycleById;
    return {
      rows,
      blocks: blocks.map((b) => ({ _id: String(b._id), name: b.name })),
      me: { appRole: user.appRole, blockIds: (user.blockIds ?? []).map(String) },
    };
  },
});

/* ================================================================
 *  DASHBOARD  (replaces facilities.getDashboard)
 *  Same shape plus: renamed/added KPI totals (qualityCertified,
 *  certifiedWithConditionality, nqasScheduled, dilapidated), the
 *  "Eligible pending" facility list (document-in-progress rows
 *  skipped), PHC-wise progress grouped by PHC name only, and status
 *  counts that never show "NQAS Pending" for certified facilities.
 * ================================================================ */

export const getDashboardV2 = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    const allowed = await allowedBlockNames(ctx, user);
    let facilities = await ctx.db.query("facilities").collect();
    if (allowed !== null)
      facilities = facilities.filter((f) => allowed.has(f.block));
    const s = await getSettings(ctx);
    const today = todayIso();

    // Batch-load lifecycle + building data (6 scans, like listFacilityRowsFast)
    const idSet = new Set(facilities.map((f) => f._id));
    const [allCycles, allSas, allNas, allBuildings, allNocs] = await Promise.all([
      ctx.db.query("certificationCycles").collect(),
      ctx.db.query("stateAssessments").collect(),
      ctx.db.query("nationalAssessments").collect(),
      ctx.db.query("buildingDetails").collect(),
      ctx.db.query("fireNocs").collect(),
    ]);
    const cyclesByFacility = new Map<Id<"facilities">, Doc<"certificationCycles">[]>();
    for (const c of allCycles) {
      if (!idSet.has(c.facilityId)) continue;
      const list = cyclesByFacility.get(c.facilityId) ?? [];
      list.push(c);
      cyclesByFacility.set(c.facilityId, list);
    }
    const naByCycle = new Map(allNas.map((n) => [n.cycleId, n]));
    const saByCycle = new Map(allSas.map((x) => [x.cycleId, x]));
    const buildingByFacility = new Map<Id<"facilities">, Doc<"buildingDetails">>();
    for (const b of allBuildings) {
      if (!idSet.has(b.facilityId)) continue;
      if (!buildingByFacility.has(b.facilityId))
        buildingByFacility.set(b.facilityId, b);
    }
    // NOC rows for the module-level Fire NOC distribution (date-primary
    // status is derived per row below).
    const nocsByFacility = new Map<Id<"facilities">, Doc<"fireNocs">[]>();
    for (const n of allNocs) {
      if (!idSet.has(n.facilityId)) continue;
      const list = nocsByFacility.get(n.facilityId) ?? [];
      list.push(n);
      nocsByFacility.set(n.facilityId, list);
    }

    type BlockStat = {
      total: number; certified: number; conditional: number;
      deferred: number; inProgress: number; notStarted: number; dueSoon: number;
    };
    const perBlock: Record<string, BlockStat> = {};
    // PHC-wise progress — grouped by PHC NAME ONLY (the report is already
    // scoped to the viewer's blocks, so the block prefix carried nothing).
    const perPhc: Record<string, BlockStat> = {};
    const statusCounts: { status: string; count: number }[] = [];
    const statusIndex = new Map<string, number>();
    let certified = 0,
      conditional = 0,
      deferred = 0,
      recertDue = 0,
      eligible = 0,
      nqasScheduled = 0,
      dilapidated = 0;
    // Certification pipeline — mutually-exclusive buckets by the furthest
    // stage each facility has reached, for the dashboard overview strip.
    const pipelineCounts = Object.fromEntries(
      PIPELINE_STAGES.map((s) => [s.key, 0]),
    ) as Record<PipelineStage, number>;
    const eligiblePending: {
      facilityId: string; name: string; block: string; phc: string;
      facilityType: string;
      status: string; docStatus: string | null;
    }[] = [];
    // "Quality Certified with Conditionality List" — facilities holding a
    // conditional certification, with dates/score for follow-up.
    const conditionalityList: {
      facilityId: string; name: string; block: string; phc: string;
      facilityType: string;
      certDate: string | null; validityDate: string | null;
      scorePercent: number | null;
    }[] = [];
    // "Result Awaited Facilities" — results not yet declared after the
    // assessment: assessment completed / docs marked awaiting, with the
    // assessment date for follow-up.
    const resultAwaitedList: {
      facilityId: string; name: string; block: string; phc: string;
      facilityType: string;
      assessmentDate: string | null; docStatus: string | null;
    }[] = [];
    // "Documents Status List" — every facility currently sitting in a
    // SaQsham document pipeline stage, powering the dashboard drill-down
    // list (grouped/filterable by stage).
    const docStatusList: {
      facilityId: string; name: string; block: string; phc: string;
      facilityType: string; docStatus: string;
    }[] = [];
    const alerts: {
      facilityId: string; name: string; block: string; alert: string; tone: string;
    }[] = [];
    // Module-level distributions — the dashboard "Status distribution" and
    // "What to do next" cards cover every report, not just the SA lifecycle:
    // NQAS certification result, NQAS assessment, State Assessment, Building
    // and Fire NOC (date-primary, self-updating).
    const moduleDistributions: {
      key: string; label: string;
      counts: { status: string; count: number }[];
    }[] = [];
    const mkDist = (key: string, label: string) => {
      const d = { key, label, counts: [] as { status: string; count: number }[] };
      moduleDistributions.push(d);
      return d;
    };
    const certDist = mkDist("cert", "NQAS Certification Status");
    const naDist = mkDist("na", "NQAS Assessment");
    const saDist = mkDist("sa", "State Assessment");
    const buildingDist = mkDist("building", "Building");
    const nocDist = mkDist("noc", "Fire NOC");
    const bumpDist = (
      d: { counts: { status: string; count: number }[] },
      status: string,
    ) => {
      const hit = d.counts.find((c) => c.status === status);
      if (hit) hit.count += 1;
      else d.counts.push({ status, count: 1 });
    };

    // Document stages considered "in progress" — eligible-pending skips them
    // (the facility has already moved into the document pipeline).
    const docInProgress = new Set(
      (
        ((s as Record<string, unknown>).generalDocStatuses as string[] | undefined) ??
        DEFAULT_SETTINGS.generalDocStatuses
      ).slice(1),
    );
    docInProgress.add("NA Scheduled");
    docInProgress.add("NA Completed & Awaiting Results");

    // Progress-bar classification — the one shared rule (deriveLifecycleView)
    // the KPI cards, block/PHC tiles and summary tables all read, so they can
    // never disagree about a facility's bucket.
    const bump = (b: BlockStat, seg: LifecycleSegment) => {
      if (seg === "certified") b.certified += 1;
      else if (seg === "conditional") b.conditional += 1;
      else if (seg === "deferred") b.deferred += 1;
      else if (seg === "dueSoon") b.dueSoon += 1;
      else if (seg === "inProgress") b.inProgress += 1;
      else b.notStarted += 1;
    };

    for (const f of facilities) {
      const cycles = (cyclesByFacility.get(f._id) ?? []).sort(
        (a, b) => a.cycleNumber - b.cycleNumber,
      );
      const activeCycle =
        cycles.find((c) => !c.superseded) ??
        cycles.find((c) => c.cycleNumber === f.currentCycleNumber) ??
        null;
      const sa = activeCycle ? (saByCycle.get(activeCycle._id) ?? null) : null;
      const nqas = activeCycle ? (naByCycle.get(activeCycle._id) ?? null) : null;
      const building = buildingByFacility.get(f._id) ?? null;

      // Single source of truth — every lifecycle field this dashboard needs
      // (certified/conditional/deferred, NA scheduled, result awaited, the
      // progress segment) comes from the shared view, so the KPIs, block/PHC
      // bars and status distribution can never drift apart.
      const view = deriveLifecycleView(f, sa, nqas, s, today);
      const certStatus = view.certResult;
      let st = view.currentStatus;
      // Legacy/imported rows can carry a certification result while the NA
      // record still reads Pending — surface the result's status instead of
      // "pending NQAS" once a result exists.
      if (
        certStatus &&
        (st === "SA Completed — NQAS Awaited" ||
          st === "SA Completed — NQAS Pending")
      ) {
        st =
          certStatus === "Result Awaited"
            ? "Result Awaited"
            : certStatus === "Quality Certified"
              ? "Certified — Surveillance Due"
              : certStatus === "Quality Certified with Conditionality"
                ? "Certified with Conditionality"
                : "Deferred — Cooling Period";
      }

      // Certification pipeline bucket — the shared view's stage, no local rule.
      pipelineCounts[view.stage] += 1;

      const b: BlockStat = perBlock[f.block] ?? {
        total: 0, certified: 0, conditional: 0, deferred: 0,
        inProgress: 0, notStarted: 0, dueSoon: 0,
      };
      b.total += 1;
      bump(b, view.segment);
      perBlock[f.block] = b;

      const p: BlockStat = perPhc[f.phc] ?? {
        total: 0, certified: 0, conditional: 0, deferred: 0,
        inProgress: 0, notStarted: 0, dueSoon: 0,
      };
      p.total += 1;
      bump(p, view.segment);
      perPhc[f.phc] = p;

      const idx = statusIndex.get(st);
      if (idx === undefined) {
        statusIndex.set(st, statusCounts.length);
        statusCounts.push({ status: st, count: 1 });
      } else statusCounts[idx].count += 1;

      // --- module-level distributions ---
      // NQAS Certification Status: the stored result is primary; "Deferred"
      // folds in from the auto status when no result exists yet.
      if (certStatus) bumpDist(certDist, certStatus);
      else if (st.startsWith("Deferred")) bumpDist(certDist, "Deferred");
      else bumpDist(certDist, "Not Recorded");
      // State Assessment.
      bumpDist(
        saDist,
        sa
          ? (sa.status ?? "Not Yet Initiated")
          : "No Entry",
      );
      // Building.
      bumpDist(
        buildingDist,
        building?.buildingStatus || "Not Recorded",
      );

      // Exact result match (via the shared view) — "Quality Certified with
      // Conditionality" and a manual status override must never inflate the
      // Quality Certified KPI.
      if (view.isQualityCertified) certified += 1;
      if (view.isConditional) {
        conditional += 1;
        conditionalityList.push({
          facilityId: String(f._id),
          name: f.name,
          block: f.block,
          phc: f.phc,
          facilityType: f.facilityType,
          certDate: nqas?.certificationDate ?? null,
          validityDate: nqas?.validityDate ?? null,
          scorePercent: nqas?.scorePercent ?? null,
        });
      }
      if (view.isDeferred) deferred += 1;
      if (st === "Recertification Due") recertDue += 1;
      // Date-primary NQAS schedule rule — from the shared view.
      const nqasScheduledNow = view.nqasScheduled;
      if (nqasScheduledNow) nqasScheduled += 1;
      // "NA Scheduled" KPI — same date-primary count as nqasScheduled (start
      // date today/upcoming ⇒ Scheduled). It used to be a paperwork-level
      // count of the "NA Scheduled" doc-stage label, which kept counting
      // facilities whose assessment start date was already long past and so
      // disagreed with the Scheduled list / summary counts on this page.
      // NQAS Assessment distribution: date-primary scheduled rule mirrors
      // the KPI (start date today/upcoming ⇒ Scheduled).
      bumpDist(
        naDist,
        nqasScheduledNow
          ? "Scheduled"
          : nqas?.status === "Completed" || (certStatus && nqas?.scorePercent != null)
            ? "Completed"
            : nqas?.certificationStatus === "Result Awaited" || st === "Result Awaited"
              ? "Result Awaited"
              : nqas
                ? "Pending"
                : "Not Started",
      );
      // Fire NOC — date-primary (Expired / Expiring Soon / Valid /
      // Not Obtained), same derivation the master list uses.
      const facNoc = (nocsByFacility.get(f._id) ?? []).sort(
        (a, b2) => (b2.expiryDate ?? "").localeCompare(a.expiryDate ?? ""),
      )[0] ?? null;
      bumpDist(
        nocDist,
        facNoc
          ? deriveFireNocStatus(
              facNoc.nocAvailable ?? null,
              facNoc.expiryDate ?? null,
              facNoc.status,
              today,
              s.fireNocAlertLeadDays,
            )
          : "Not Obtained",
      );
      if (building?.buildingStatus?.includes("Dilapidated")) dilapidated += 1;
      // Result Awaited — from the shared view (stored result first, else the
      // assessment-done / documents-awaiting signals). Never certified rows.
      if (view.isResultAwaited) {
        resultAwaitedList.push({
          facilityId: String(f._id),
          name: f.name,
          block: f.block,
          phc: f.phc,
          facilityType: f.facilityType,
          assessmentDate:
            nqas?.actualStartDate ?? nqas?.scheduledStartDate ??
            sa?.actualStartDate ?? sa?.scheduledDate ?? null,
          docStatus: sa?.generalDocStatus ?? null,
        });
      }
      // Documents Status list row — any facility with a SaQsham document
      // stage recorded (unset rows are not in the pipeline yet).
      const docStage = sa?.generalDocStatus ?? null;
      if (docStage) {
        docStatusList.push({
          facilityId: String(f._id),
          name: f.name,
          block: f.block,
          phc: f.phc,
          facilityType: f.facilityType,
          docStatus: docStage,
        });
      }

      if (f.eligibility === "Eligible") {
        eligible += 1;
        // "Eligible Pending": eligible facilities that have not begun the
        // certification process yet — skipping facilities whose documents
        // are already in progress in the SaQsham pipeline.
        const docStatus = sa?.generalDocStatus ?? null;
        const pendingState =
          st === "SA Not Yet Initiated" || st === "Facility (Future Candidate)";
        if (st === "SA Not Yet Initiated" && !(docStatus && docInProgress.has(docStatus))) {
          eligiblePending.push({
            facilityId: String(f._id),
            name: f.name,
            block: f.block,
            phc: f.phc,
            facilityType: f.facilityType,
            status: st,
            docStatus,
          });
        }
        void pendingState;
      }

      if (nqas?.validityDate) {
        const daysLeft = Math.round(
          (new Date(nqas.validityDate + "T12:00:00").getTime() -
            new Date(today + "T12:00:00").getTime()) / 86400000,
        );
        if (daysLeft >= 0 && daysLeft <= s.recertificationAlertLeadDays) {
          alerts.push({
            facilityId: String(f._id),
            name: f.name,
            block: f.block,
            alert: `Validity ends ${nqas.validityDate} (${daysLeft} days) — recertification due`,
            tone: "amber",
          });
        }
      }
    }
    alerts.sort((a, b2) => a.alert.localeCompare(b2.alert));
    eligiblePending.sort(
      (a, b2) =>
        a.block.localeCompare(b2.block) || a.name.localeCompare(b2.name),
    );
    conditionalityList.sort(
      (a, b2) =>
        a.block.localeCompare(b2.block) || a.name.localeCompare(b2.name),
    );
    resultAwaitedList.sort(
      (a, b2) =>
        a.block.localeCompare(b2.block) || a.name.localeCompare(b2.name),
    );
    const docStageOrder = new Map(
      (((s as Record<string, unknown>).generalDocStatuses as string[] | undefined) ??
        DEFAULT_SETTINGS.generalDocStatuses
      ).map((stage, i) => [stage, i] as const),
    );
    docStatusList.sort(
      (a, b2) =>
        (docStageOrder.get(a.docStatus) ?? 99) -
          (docStageOrder.get(b2.docStatus) ?? 99) ||
        a.block.localeCompare(b2.block) ||
        a.name.localeCompare(b2.name),
    );

    // Overall "last updated" — the freshest change anywhere in the
    // workspace. Starts from the newest audit entry (every mutation writes
    // one) and folds in the auto timestamp on each record this query already
    // reads, so bulk imports / direct row saves are covered too.
    const latestAudit = await ctx.db
      .query("auditLogs")
      .withIndex("by_time")
      .order("desc")
      .first();
    let lastUpdated: number | null = latestAudit?.changedAt ?? null;
    const stamp = (ts?: number | null) => {
      if (ts && (lastUpdated === null || ts > lastUpdated)) lastUpdated = ts;
    };
    for (const f of facilities) stamp(f.updatedAt);
    for (const x of allSas) stamp(x.generalDocUpdatedAt);
    for (const n of allNas) {
      stamp(n.resultDocumentUpdatedAt);
      stamp(n.certDocumentUpdatedAt);
    }
    for (const b of allBuildings) stamp(b.lastUpdatedAt);
    for (const n of allNocs) stamp(n.updatedAt);

    return {
      role: user.appRole,
      myBlockNames:
        user.appRole === "entry"
          ? await (async () => {
              const names: string[] = [];
              for (const id of user.blockIds ?? []) {
                const blk = await ctx.db.get(id);
                if (blk) names.push(blk.name);
              }
              return names.sort();
            })()
          : null,
      totals: {
        facilities: facilities.length,
        eligible,
        certified,
        conditional,
        deferred,
        recertDue,
        // New KPIs — clearer labels requested by the department.
        qualityCertified: certified,
        certifiedWithConditionality: conditional,
        nqasScheduled,
        naScheduled: nqasScheduled,
        dilapidated,
      },
      // Certification pipeline overview — mutually-exclusive facility counts
      // by furthest stage reached (drives the dashboard overview strip).
      // Stage keys, labels and order all come from the shared view module, so
      // the strip, the facility stepper and the deck speak one vocabulary.
      pipeline: PIPELINE_STAGES.map((s) => ({
        key: s.key,
        label: s.label,
        count: pipelineCounts[s.key],
      })),
      statusCounts,
      // Per-module status distributions (NQAS cert, NQAS assessment, SA,
      // Building, Fire NOC) for the dashboard's "Status distribution" and
      // "What to do next" cards — covers every report, not just SA.
      moduleDistributions,
      perBlock: Object.entries(perBlock)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b2) => a.name.localeCompare(b2.name)),
      perPhc: Object.entries(perPhc)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b2) => a.name.localeCompare(b2.name)),
      eligiblePending: {
        items: eligiblePending.slice(0, 200),
        total: eligiblePending.length,
      },
      conditionalityList: {
        items: conditionalityList.slice(0, 200),
        total: conditionalityList.length,
      },
      resultAwaitedList: {
        items: resultAwaitedList.slice(0, 200),
        total: resultAwaitedList.length,
      },
      docStatusList: {
        items: docStatusList.slice(0, 200),
        total: docStatusList.length,
      },
      alerts: alerts.slice(0, 8),
      // Newest change across facilities, assessments, documents and audits —
      // rendered as the dashboard's "Overall last updated" stamp.
      lastUpdated,
      today,
      settings: s,
    };
  },
});

/* ================================================================
 *  NQAS SCHEDULED SYNC
 *  "If NA is scheduled, Assessment Start date": a NA start date of
 *  today or later means the NQAS assessment IS scheduled — flip the
 *  NA status from Pending to Scheduled so dashboards and the status
 *  engine reflect it. Never downgrades or touches completed rows.
 * ================================================================ */

export const syncNqasScheduled = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    if (!canEdit(user)) throw new Error("You do not have edit permission");
    const today = todayIso();
    let updated = 0;
    const nas = await ctx.db.query("nationalAssessments").collect();
    for (const na of nas) {
      if (
        na.status === "Pending" &&
        !na.certificationStatus &&
        na.scheduledStartDate &&
        na.scheduledStartDate >= today
      ) {
        await ctx.db.patch(na._id, { status: "Scheduled" });
        updated += 1;
        await audit(ctx, {
          table: "nationalAssessments",
          recordId: String(na._id),
          facilityId: na.facilityId,
          action: "update",
          field: "NQAS Assessment Status (auto)",
          oldValue: "Pending",
          newValue: "Scheduled",
          userName: "System",
          userId: user._id,
        });
      }
    }
    return { updated };
  },
});

/* ================================================================
 *  BULK IMPORT  (replaces modules.bulkImportFacilities with the
 *  seeding fixes requested by the department)
 * ================================================================ */

type ImportRow = { cells: string[]; lineNo: number };

function tokenizeCsv(text: string): ImportRow[] {
  const rows: ImportRow[] = [];
  let cur: string[] = [];
  let cell = "";
  let inQuotes = false;
  let lineNo = 1;
  let rowLine = 1;
  const pushCell = () => { cur.push(cell.trim()); cell = ""; };
  const pushRow = () => {
    pushCell();
    if (cur.some((c) => c.length > 0)) rows.push({ cells: cur, lineNo: rowLine });
    cur = [];
    rowLine = lineNo;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n") lineNo++;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === "," || ch === "\t") pushCell();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      pushRow();
    } else cell += ch;
  }
  if (cell.length > 0 || cur.length > 0) pushRow();
  return rows;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

type ImportCols = {
  facilityName?: number; block?: number; phc?: number; facilityType?: number;
  phaseType?: number; eligibility?: number; saqshamType?: number;
  saqshamCategory?: number; remarks?: number; ninNumber?: number;
  cycleNumber?: number; currentStatus?: number; saStatus?: number; saScore?: number;
  saStartDate?: number; saEndDate?: number; nqasStatus?: number; nqasScore?: number;
  certificationStatus?: number; certificationDate?: number; validTill?: number;
  naScheduledDate?: number; naEndDate?: number; naMode?: number; departments?: number;
  generalDocStatus?: number; surveillanceDone1?: number;
  surveillanceDone2?: number; surveillanceScore2?: number; recertStage?: number;
  nqasIaQ1?: number; nqasIaQ2?: number; kayakalpIaQ1?: number; kayakalpIaQ2?: number;
  gapClosureAmount?: number; gcFundYear?: number; fundProcLink?: number;
  buildingType?: number; buildingStatus?: number; condemnedLink?: number;
  nocAvailable?: number; fireNocStatus?: number; fireNocValidity?: number; nocLink?: number;
  fireNocIssuedDate?: number;
};

const HEADER_ALIASES: [keyof ImportCols, string[]][] = [
  ["facilityName", ["facility_name", "name", "facility", "name_of_facility", "name_of_the_facility", "institution_name", "name_of_institution", "facility_institution_name", "hf_name"]],
  ["block", ["block", "block_name", "name_of_block", "name_of_the_block", "blockname"]],
  ["phc", ["phc", "phc_name", "name_of_phc", "name_of_the_phc", "phc_institution"]],
  ["facilityType", ["facility_type", "type", "facility_category", "institution_type"]],
  ["phaseType", ["phase_type", "phase", "phase_name"]],
  ["eligibility", ["nqas_eligibility", "eligibility", "nqas_eligible", "eligible"]],
  ["saqshamType", ["saqsham_facility_type", "facility_type_saqsham"]],
  ["saqshamCategory", ["saqsham_facility_name_category", "saqsham_category", "facility_name_category_saqsham", "saqsham_name_category"]],
  ["remarks", ["remarks", "general_remarks", "remark", "comments"]],
  ["ninNumber", ["nin", "nin_number", "nin_no", "ninnumber", "facility_nin", "national_identification_number"]],
  ["cycleNumber", ["cycle", "cycle_number", "cycle_no"]],
  ["currentStatus", ["current_status", "status", "facility_status"]],
  ["saStatus", ["sa_status", "state_assessment_status", "sa_state", "state_assessment"]],
  ["saScore", ["sa_score", "sa_score_percent", "sa_percentage", "state_assessment_score"]],
  ["nqasStatus", ["nqas_status", "national_assessment_status", "nqas_assessment_status", "national_assessment"]],
  ["nqasScore", ["nqas_score", "nqas_score_percent", "nqas_percentage", "national_assessment_score", "nqas_certified_score", "nqas_certified_score_percent", "certified_score_percent", "if_certified_enter_score", "if_certified_enter_score_percent"]],
  ["certificationStatus", ["nqas_certification_status", "certification_status", "cert_status", "certification"]],
  ["certificationDate", ["certification_date_goi_letter_date", "certification_date", "cert_date", "date_of_certification", "certified_date", "goi_letter_date"]],
  ["validTill", ["valid_till", "validity", "validity_date", "valid_upto", "valid_until"]],
  ["saStartDate", ["state_assessment_start_date", "sa_start_date", "sa_assessment_start_date"]],
  ["saEndDate", ["state_assessment_end_date", "sa_end_date", "sa_assessment_end_date"]],
  ["naScheduledDate", ["if_na_is_scheduled_assessment_start_date", "nqas_assessment_start_date", "na_scheduled_date", "nqas_scheduled_date", "assessment_start_date"]],
  ["naEndDate", ["nqas_assessment_end_date", "na_end_date", "assessment_end_date", "nqas_end_date"]],
  ["naMode", ["mode_of_assessment", "assessment_mode", "mode"]],
  ["departments", ["departments_packages_certification_criteria", "departments_packages_and_certification_criteria", "departments", "departments_packages", "departments_certification_criteria"]],
  ["generalDocStatus", ["saqsham_documents_status", "documents_status", "general_documents_status", "doc_status"]],
  // Part H root cause (see modules.ts): a due-date header must NEVER map to a
  // done date — that is how future "done" dates appeared after an import.
  ["surveillanceDone1", ["1st_surveillance_assessment_done_date", "first_surveillance_assessment_done_date", "surveillance_1st_year_done_date", "surveillance_assessment_done_date_1"]],
  ["surveillanceDone2", ["2nd_surveillance_assessment_done_date", "second_surveillance_assessment_done_date", "surveillance_2nd_year_done_date", "surveillance_assessment_done_date_2"]],
  ["surveillanceScore2", ["2nd_surveillance_score_percent", "score_percent_2nd_surveillance", "surveillance_score_percent"]],
  ["recertStage", ["if_applied_stage_of_the_application", "stage_of_the_application", "recertification_stage"]],
  ["nqasIaQ1", ["nqas_ia_2026_27_q1", "nqas_ia_q1", "nqas_ia_percent_q1"]],
  ["nqasIaQ2", ["nqas_ia_2026_27_q2", "nqas_ia_q2", "nqas_ia_percent_q2"]],
  ["kayakalpIaQ1", ["kayakalp_ia_2026_27_q1", "kayakalp_ia_q1", "kayakalp_ia_percent_q1"]],
  ["kayakalpIaQ2", ["kayakalp_ia_2026_27_q2", "kayakalp_ia_q2", "kayakalp_ia_percent_q2"]],
  ["gapClosureAmount", ["gap_closure_amount", "gap_closure_fund_amount", "gc_amount"]],
  ["gcFundYear", ["gc_fund_recived_year", "gc_fund_received_year", "gc_fund_year"]],
  ["fundProcLink", ["gap_closure_amount_proc_link", "gc_fund_proc_link", "gap_closure_proc_link"]],
  ["buildingType", ["building_type"]],
  ["buildingStatus", ["facility_building_status", "building_status", "building_status_last_updated_on_14_07_2026"]],
  ["condemnedLink", ["condemned_document_link", "condemned_doc_link", "condemned_link"]],
  ["nocAvailable", ["noc_available", "noc_available_yes_no"]],
  ["fireNocStatus", ["fire_noc_validity_status", "fire_noc_status"]],
  ["fireNocValidity", ["fire_noc_validity", "fire_noc_expiry", "fire_noc_expiry_date"]],
  ["fireNocIssuedDate", ["noc_issue_date", "fire_noc_issue_date", "noc_issued_date", "fire_noc_issued_date", "fire_noc_issue", "noc_issue"]],
  ["nocLink", ["noc_document_link", "fire_noc_document_link", "noc_doc_link"]],
];

function resolveImportColumns(headers: string[]): ImportCols {
  const cols: ImportCols = {};
  const claimed = new Set<number>();
  for (const [field, aliases] of HEADER_ALIASES) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && aliases.includes(h));
    if (idx >= 0) { cols[field] = idx; claimed.add(idx); }
  }
  if (cols.facilityName === undefined) {
    const idx = headers.findIndex(
      (h, i) => !claimed.has(i) && h.includes("name") &&
        (h.includes("facility") || h.includes("institution") || h.includes("phc") || h.includes("chc")),
    );
    if (idx >= 0) { cols.facilityName = idx; claimed.add(idx); }
  }
  if (cols.block === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("block"));
    if (idx >= 0) { cols.block = idx; claimed.add(idx); }
  }
  if (cols.phc === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("phc"));
    if (idx >= 0) { cols.phc = idx; claimed.add(idx); }
  }
  if (cols.facilityType === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && (h.includes("type") || h === "category"));
    if (idx >= 0) { cols.facilityType = idx; claimed.add(idx); }
  }
  if (cols.phaseType === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("phase"));
    if (idx >= 0) { cols.phaseType = idx; claimed.add(idx); }
  }
  if (cols.eligibility === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("eligib"));
    if (idx >= 0) { cols.eligibility = idx; claimed.add(idx); }
  }
  if (cols.saqshamCategory === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("saqsham"));
    if (idx >= 0) { cols.saqshamCategory = idx; claimed.add(idx); }
  }
  if (cols.remarks === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && (h.includes("remark") || h.includes("comment")));
    if (idx >= 0) { cols.remarks = idx; claimed.add(idx); }
  }
  if (cols.cycleNumber === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && (h === "cycle" || (h.includes("cycle") && h.includes("no"))));
    if (idx >= 0) { cols.cycleNumber = idx; claimed.add(idx); }
  }
  if (cols.currentStatus === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("status"));
    if (idx >= 0) { cols.currentStatus = idx; claimed.add(idx); }
  }
  if (cols.saStatus === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("sa") && h.includes("status"));
    if (idx >= 0) { cols.saStatus = idx; claimed.add(idx); }
  }
  if (cols.saScore === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("sa") && (h.includes("score") || h.includes("percent")));
    if (idx >= 0) { cols.saScore = idx; claimed.add(idx); }
  }
  if (cols.nqasStatus === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("nqas") && h.includes("status"));
    if (idx >= 0) { cols.nqasStatus = idx; claimed.add(idx); }
  }
  if (cols.nqasScore === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("nqas") && (h.includes("score") || h.includes("percent")));
    if (idx >= 0) { cols.nqasScore = idx; claimed.add(idx); }
  }
  if (cols.certificationStatus === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("certif") && h.includes("status"));
    if (idx >= 0) { cols.certificationStatus = idx; claimed.add(idx); }
  }
  if (cols.certificationDate === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("certif") && h.includes("date"));
    if (idx >= 0) { cols.certificationDate = idx; claimed.add(idx); }
  }
  if (cols.validTill === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && (h.includes("valid") || h.includes("expiry")));
    if (idx >= 0) { cols.validTill = idx; claimed.add(idx); }
  }
  if (cols.gapClosureAmount === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("gap") && h.includes("amount"));
    if (idx >= 0) { cols.gapClosureAmount = idx; claimed.add(idx); }
  }
  if (cols.gcFundYear === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("gc") && h.includes("year"));
    if (idx >= 0) { cols.gcFundYear = idx; claimed.add(idx); }
  }
  if (cols.fundProcLink === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("proc"));
    if (idx >= 0) { cols.fundProcLink = idx; claimed.add(idx); }
  }
  if (cols.buildingType === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("building") && h.includes("type"));
    if (idx >= 0) { cols.buildingType = idx; claimed.add(idx); }
  }
  if (cols.buildingStatus === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("building") && h.includes("status"));
    if (idx >= 0) { cols.buildingStatus = idx; claimed.add(idx); }
  }
  if (cols.condemnedLink === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("condemn"));
    if (idx >= 0) { cols.condemnedLink = idx; claimed.add(idx); }
  }
  if (cols.nocAvailable === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("noc") && h.includes("available"));
    if (idx >= 0) { cols.nocAvailable = idx; claimed.add(idx); }
  }
  if (cols.fireNocStatus === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("noc") && h.includes("status"));
    if (idx >= 0) { cols.fireNocStatus = idx; claimed.add(idx); }
  }
  if (cols.fireNocValidity === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("noc") && (h.includes("valid") || h.includes("certified")));
    if (idx >= 0) { cols.fireNocValidity = idx; claimed.add(idx); }
  }
  if (cols.nocLink === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("noc") && h.includes("link"));
    if (idx >= 0) { cols.nocLink = idx; claimed.add(idx); }
  }
  if (cols.naMode === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("mode"));
    if (idx >= 0) { cols.naMode = idx; claimed.add(idx); }
  }
  if (cols.departments === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("department"));
    if (idx >= 0) { cols.departments = idx; claimed.add(idx); }
  }
  if (cols.naScheduledDate === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("assessment") && h.includes("start"));
    if (idx >= 0) { cols.naScheduledDate = idx; claimed.add(idx); }
  }
  if (cols.naEndDate === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("assessment") && h.includes("end"));
    if (idx >= 0) { cols.naEndDate = idx; claimed.add(idx); }
  }
  if (cols.saStartDate === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && (h.includes("sa") || h.includes("state")) && h.includes("start"));
    if (idx >= 0) { cols.saStartDate = idx; claimed.add(idx); }
  }
  if (cols.saEndDate === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && (h.includes("sa") || h.includes("state")) && h.includes("end"));
    if (idx >= 0) { cols.saEndDate = idx; claimed.add(idx); }
  }
  if (cols.generalDocStatus === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("document") && h.includes("status"));
    if (idx >= 0) { cols.generalDocStatus = idx; claimed.add(idx); }
  }
  if (cols.surveillanceDone1 === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("surveillance") && h.includes("1st"));
    if (idx >= 0) { cols.surveillanceDone1 = idx; claimed.add(idx); }
  }
  if (cols.surveillanceDone2 === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("surveillance") && h.includes("2nd"));
    if (idx >= 0) { cols.surveillanceDone2 = idx; claimed.add(idx); }
  }
  if (cols.surveillanceScore2 === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("score") && !h.includes("sa") && !h.includes("nqas"));
    if (idx >= 0) { cols.surveillanceScore2 = idx; claimed.add(idx); }
  }
  if (cols.recertStage === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("stage"));
    if (idx >= 0) { cols.recertStage = idx; claimed.add(idx); }
  }
  if (cols.nqasIaQ1 === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("nqas") && h.includes("ia") && h.includes("q1"));
    if (idx >= 0) { cols.nqasIaQ1 = idx; claimed.add(idx); }
  }
  if (cols.nqasIaQ2 === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("nqas") && h.includes("ia") && h.includes("q2"));
    if (idx >= 0) { cols.nqasIaQ2 = idx; claimed.add(idx); }
  }
  if (cols.kayakalpIaQ1 === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("kayakalp") && h.includes("ia") && h.includes("q1"));
    if (idx >= 0) { cols.kayakalpIaQ1 = idx; claimed.add(idx); }
  }
  if (cols.kayakalpIaQ2 === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("kayakalp") && h.includes("ia") && h.includes("q2"));
    if (idx >= 0) { cols.kayakalpIaQ2 = idx; claimed.add(idx); }
  }
  return cols;
}

function detectHeader(rows: ImportRow[]): { headerIdx: number; cols: ImportCols } | null {
  const limit = Math.min(10, rows.length);
  for (let h = 0; h < limit; h++) {
    const headers = rows[h].cells.map(normalizeHeader).filter(Boolean);
    const cols = resolveImportColumns(headers);
    if (cols.facilityName !== undefined) return { headerIdx: h, cols };
  }
  return null;
}

function normalizeEligibility(v: string): "Eligible" | "Not Eligible" | "Possible" {
  const s = v.trim().toLowerCase();
  if (s.startsWith("not") || s.startsWith("in-") || s.startsWith("in_") || s === "ineligible" || s === "no")
    return "Not Eligible";
  if (s.startsWith("pos") || s.includes("candidate") || s.includes("future"))
    return "Possible";
  return "Eligible";
}

function isPlaceholderCell(v: string): boolean {
  const s = v.trim();
  if (!s) return true;
  if (/^[-—–_*#.]+$/.test(s)) return true;
  if (/^(dd[-/. ]?mm[-/. ]?yyyy|mm[-/. ]?dd[-/. ]?yyyy|yyyy[-/. ]?mm[-/. ]?dd)$/i.test(s)) return true;
  if (/^(unassigned|not assigned|nil|na|n\/a|null|phc)$/.test(s.toLowerCase())) return true;
  return false;
}

function parseScore(v: string): number | undefined {
  const s = v.trim().replace("%", "");
  if (!s) return undefined;
  const n = Number(s);
  // ROOT CAUSE of the "Assessment score 0.00%": this parser accepted 0 as a
  // real score, while modules.parseScore already rejected it (`n <= 0`). A
  // blank/zero cell in the import sheet therefore wrote scorePercent = 0 and
  // every renderer formatted it as 0.00% instead of "-". A zero NQAS score is
  // not a possible result (the certification threshold is 70), so 0 is treated
  // as "not recorded" and the sheet raises a data check instead.
  if (!Number.isFinite(n) || n <= 0) return undefined;
  // Decimal scores (e.g. 78.65) are preserved; only clamp the range.
  return Math.min(100, n);
}

function parseAmount(v: string): number | undefined {
  const s = v.replace(/[₹,\s]/g, "").trim();
  if (!s) return undefined;
  const lakh = s.match(/^(\d+(?:\.\d+)?)\s*lakh$/i);
  if (lakh) return Math.round(Number(lakh[1]) * 100000);
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

function parseImportDate(v: string): string | undefined {
  const s = v.trim();
  if (!s || /^(na|n\/a|-|—)$/i.test(s)) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const ym = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (ym) return `${ym[1]}-${ym[2].padStart(2, "0")}-01`;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return undefined;
}

function normalizeSaStatus(v: string): "Not Yet Initiated" | "Scheduled" | "Completed" {
  const s = v.trim().toLowerCase();
  if (s.startsWith("comp") || s === "done" || s === "yes") return "Completed";
  if (s.startsWith("sched") || s === "planned") return "Scheduled";
  return "Not Yet Initiated";
}

function normalizeNqasStatus(v: string): "Pending" | "Scheduled" | "Completed" {
  const s = v.trim().toLowerCase();
  if (s.startsWith("comp") || s === "done" || s === "yes") return "Completed";
  if (s.startsWith("sched") || s === "planned") return "Scheduled";
  return "Pending";
}

function normalizeCertStatus(
  v: string,
): "Result Awaited" | "Quality Certified" | "Quality Certified with Conditionality" | "Deferred" | undefined {
  const s = v.trim().toLowerCase();
  if (!s) return undefined;
  if (s.includes("condition")) return "Quality Certified with Conditionality";
  if (s.includes("defer")) return "Deferred";
  if (s.includes("await")) return "Result Awaited";
  // Only an explicit certification word maps to Quality Certified — unknown
  // text ("Pending", "Applied", "Not certified", stray sheet notes) must
  // never silently certify a facility.
  if (s.includes("certif") || s === "qc" || s === "q.c.")
    return "Quality Certified";
  return undefined;
}

export const bulkImportFacilitiesV2 = mutation({
  args: { csv: v.string() },
  handler: async (ctx, { csv: rawCsv }) => {
    const user = await requireActivatedUser(ctx);
    if (!canEdit(user)) throw new Error("You do not have edit permission");

    const allRows = tokenizeCsv(rawCsv.replace(/^\uFEFF/, ""));
    if (allRows.length < 2)
      throw new Error("CSV must have a header row and at least one data row");

    const detected = detectHeader(allRows);
    if (!detected) {
      const seen = allRows[0].cells.slice(0, 12).join(" | ");
      throw new Error(
        `Could not find a "Facility name" column in the first 10 rows. Detected columns: ${seen}. Make sure the file is CSV (not Excel binary) and one column is the facility name.`,
      );
    }
    const { headerIdx, cols } = detected;
    const headers = allRows[headerIdx].cells.map(normalizeHeader);
    const dataRows: ImportRow[] = allRows.slice(headerIdx + 1);

    const get = (row: ImportRow, col: number | undefined): string => {
      if (col === undefined) return "";
      const v = (row.cells[col] ?? "").trim();
      return isPlaceholderCell(v) ? "" : v;
    };
    const pick = (row: ImportRow, ...candidates: (number | undefined)[]) => {
      for (const c of candidates) {
        const v = get(row, c);
        if (v) return v;
      }
      return "";
    };

    let created = 0;
    let skippedDuplicates = 0;
    let skippedEmpty = 0;
    let skippedJunk = 0;
    const errors: string[] = [];
    const settings = await getSettings(ctx);
    const today = todayIso();

    const blockCache = new Map<string, Id<"blocks">>();
    const getOrCreateBlock = async (name: string): Promise<Id<"blocks">> => {
      const cached = blockCache.get(name);
      if (cached) return cached;
      const existing = await ctx.db
        .query("blocks")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();
      if (existing) { blockCache.set(name, existing._id); return existing._id; }
      const id = await ctx.db.insert("blocks", { name, active: true });
      blockCache.set(name, id);
      return id;
    };

    for (const row of dataRows) {
      const meaningful = row.cells.filter((c) => c.trim() && !isPlaceholderCell(c));
      if (meaningful.length === 0) { skippedEmpty += 1; continue; }
      const name = pick(row, cols.facilityName, cols.phc);
      if (!name) { skippedEmpty += 1; continue; }
      if (name.length > 120) { skippedJunk += 1; continue; }
      const block = pick(row, cols.block) || "Unassigned";
      const phc = pick(row, cols.phc) || block;
      const facilityType = pick(row, cols.facilityType) || "PHC";
      const nin = normalizeNin(get(row, cols.ninNumber));
      const wantsLifecycle = Boolean(
        get(row, cols.certificationStatus) ||
          get(row, cols.certificationDate) ||
          get(row, cols.saStatus) ||
          get(row, cols.saScore) ||
          get(row, cols.nqasStatus) ||
          get(row, cols.naScheduledDate) ||
          get(row, cols.naEndDate) ||
          get(row, cols.naMode) ||
          get(row, cols.departments) ||
          get(row, cols.generalDocStatus) ||
          get(row, cols.surveillanceDone1) ||
          get(row, cols.surveillanceDone2),
      );
      // A facility whose row carries certification / assessment data needs a
      // lifecycle record — but eligibility defaults to Eligible ONLY when the
      // sheet is silent about it; the sheet's own value always wins.
      const effectiveEligibility =
        wantsLifecycle && get(row, cols.eligibility) === ""
          ? ("Eligible" as const)
          : normalizeEligibility(get(row, cols.eligibility));

      // NIN is the only duplicate key — existing NINs are skipped, never
      // overwritten.
      if (nin) {
        const dup = await ctx.db
          .query("facilities")
          .withIndex("by_nin", (q) => q.eq("ninNumber", nin))
          .first();
        if (dup) {
          skippedDuplicates += 1;
          errors.push(
            `Row ${row.lineNo}: skipped — NIN ${get(row, cols.ninNumber)} already exists (${dup.name}, ${dup.block})`,
          );
          continue;
        }
      }

      if (user.appRole === "entry") {
        const allowed = await allowedBlockNames(ctx, user);
        if (allowed === null || !allowed.has(block)) {
          errors.push(`Row ${row.lineNo}: block "${block}" is not in your assigned blocks`);
          continue;
        }
      }

      await getOrCreateBlock(block);

      // ---- parse all lifecycle cells up front ----
      const saStatusRaw = get(row, cols.saStatus);
      const saScoreRaw = get(row, cols.saScore);
      const nqasStatusRaw = get(row, cols.nqasStatus);
      const certStatusRaw = get(row, cols.certificationStatus);
      const certDateRaw = get(row, cols.certificationDate);
      const validTillRaw = get(row, cols.validTill);
      const cycleNumberRaw = get(row, cols.cycleNumber);

      const importedAt = Date.now();
      const facilityId = await ctx.db.insert("facilities", {
        block,
        phc,
        name,
        facilityType,
        phaseType: get(row, cols.phaseType) || undefined,
        eligibility: effectiveEligibility,
        currentStatus: "—",
        currentCycleNumber: 0,
        saqshamFacilityType: get(row, cols.saqshamType) || undefined,
        saqshamCategory: get(row, cols.saqshamCategory) || undefined,
        remarks: get(row, cols.remarks) || undefined,
        ninNumber: nin ?? undefined,
        nqasIaQ1: parseScore(get(row, cols.nqasIaQ1)),
        nqasIaQ2: parseScore(get(row, cols.nqasIaQ2)),
        kayakalpIaQ1: parseScore(get(row, cols.kayakalpIaQ1)),
        kayakalpIaQ2: parseScore(get(row, cols.kayakalpIaQ2)),
        // Part 2 — a new facility is "updated" by the master import too.
        lastChangedAt: importedAt,
        lastChangedBy: user.name ?? "Import",
        lastChangeSource: "master",
        recentChanges: [{ key: "Facility master import", at: importedAt, source: "master" }],
        createdAt: importedAt,
        createdBy: user._id,
      });
      created += 1;
      await refreshFacilityStatus(ctx, facilityId, user.name ?? "Unknown", user._id, true);

      // ---- lifecycle seeding into the active cycle ----
      const certStatus = certStatusRaw ? normalizeCertStatus(certStatusRaw) : undefined;
      const certDate = parseImportDate(certDateRaw);
      const validTill = parseImportDate(validTillRaw);
      const naScheduled = parseImportDate(get(row, cols.naScheduledDate));
      const naEnd = parseImportDate(get(row, cols.naEndDate));
      const naMode = get(row, cols.naMode) || undefined;
      const departmentsRaw = get(row, cols.departments);
      const saStatus = saStatusRaw ? normalizeSaStatus(saStatusRaw) : undefined;
      const saScore = parseScore(saScoreRaw);
      const saStartDate = parseImportDate(get(row, cols.saStartDate));
      const saEndDate = parseImportDate(get(row, cols.saEndDate));
      const genDoc = get(row, cols.generalDocStatus) || undefined;
      const nqasStatus = nqasStatusRaw ? normalizeNqasStatus(nqasStatusRaw) : undefined;
      const nqasScore = parseScore(get(row, cols.nqasScore));
      const surv1 = parseImportDate(get(row, cols.surveillanceDone1));
      const surv2 = parseImportDate(get(row, cols.surveillanceDone2));
      const survScore2 = parseScore(get(row, cols.surveillanceScore2));

      const hasLifecycleData = Boolean(
        saStatusRaw || saScore !== undefined || saStartDate || saEndDate ||
        genDoc || nqasStatus || certStatus || certDate ||
        validTill || naScheduled || naEnd || naMode || departmentsRaw ||
        nqasScore !== undefined || surv1 || surv2 || survScore2 !== undefined || cycleNumberRaw ||
        // Unknown certification-status text still proves NQAS data exists —
        // create the NA record even though no result is mapped.
        certStatusRaw,
      );

      if (hasLifecycleData) {
        const cycles = await ctx.db
          .query("certificationCycles")
          .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
          .collect();
        cycles.sort((a, b) => a.cycleNumber - b.cycleNumber);
        const wanted = Number(cycleNumberRaw) || 0;
        let cycle =
          cycles.find((c) => c.cycleNumber === wanted) ??
          cycles.find((c) => !c.superseded) ??
          cycles[cycles.length - 1] ??
          null;
        // New facilities start with no cycle — create cycle 1 so the sheet's
        // certification / assessment data is never dropped (the seeder used
        // to silently discard it).
        if (!cycle) {
          const cycleId = await ctx.db.insert("certificationCycles", {
            facilityId,
            cycleNumber: 1,
            cycleType: "Initial",
            createdAt: Date.now(),
            createdBy: user._id,
          });
          const created = await ctx.db.get(cycleId);
          if (created) cycle = created;
          await ctx.db.patch(facilityId, { currentCycleNumber: 1 });
        }
        if (cycle) {
          // Seeding inference: a certification result implies the SA (and the
          // NQAS assessment) already happened.
          const effectiveSaStatus =
            saStatus ?? (certStatus ? "Completed" : undefined);
          const completed =
            (effectiveSaStatus === "Completed") ||
            nqasStatus === "Completed" ||
            Boolean(certStatus);

          let sa = await ctx.db
            .query("stateAssessments")
            .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
            .first();
          const saDataPresent =
            effectiveSaStatus !== undefined ||
            saScore !== undefined ||
            Boolean(saStartDate) ||
            Boolean(saEndDate) ||
            Boolean(genDoc);
          // A certification result implies the SA already happened — create
          // the missing SA record instead of silently dropping it.
          if (!sa && (saDataPresent || certStatus)) {
            const saId = await ctx.db.insert("stateAssessments", {
              cycleId: cycle._id,
              facilityId,
              status: effectiveSaStatus ?? "Completed",
            });
            sa = await ctx.db.get(saId);
          }
          if (sa && saDataPresent) {
            await ctx.db.patch(sa._id, {
              ...(effectiveSaStatus ? { status: effectiveSaStatus } : {}),
              ...(saScore !== undefined ? { scorePercent: saScore } : {}),
              ...(!sa.originalScheduledDate && saStartDate
                ? { originalScheduledDate: saStartDate, scheduledDate: saStartDate }
                : {}),
              ...(saEndDate ? { actualEndDate: saEndDate } : {}),
              ...(genDoc ? { generalDocStatus: genDoc, generalDocUpdatedAt: Date.now() } : {}),
            });
          }

          const nqasNeeded =
            nqasStatus || certStatus || certDate || validTill || naScheduled ||
            naEnd || naMode || departmentsRaw || nqasScore !== undefined ||
            surv1 || surv2 || survScore2 !== undefined;
          if (nqasNeeded) {
            let nqas = await ctx.db
              .query("nationalAssessments")
              .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
              .first();
            // Create the NA whenever NQAS data exists — a seeded certification
            // result must never be dropped because the SA column was blank.
            if (!nqas) {
              const id = await ctx.db.insert("nationalAssessments", {
                cycleId: cycle._id,
                facilityId,
                status: "Pending",
              });
              nqas = await ctx.db.get(id);
            }
            if (nqas) {
              // NA status resolution:
              //  - explicit NQAS status column wins;
              //  - a certification result means the assessment completed;
              //  - an upcoming NQAS Assessment Start date means Scheduled.
              let resolvedStatus: "Pending" | "Scheduled" | "Completed" =
                nqasStatus ?? "Pending";
              if (certStatus || nqasStatus === "Completed") resolvedStatus = "Completed";
              else if (resolvedStatus === "Pending" && naScheduled && naScheduled >= today)
                resolvedStatus = "Scheduled";

              const merged = {
                ...nqas,
                ...(certStatus ? { certificationStatus: certStatus } : {}),
                ...(certDate ? { certificationDate: certDate } : {}),
              };
              const derived = computeDerivedNqas(
                certDate ? { ...merged, goiLetterDate: certDate } : merged,
                settings,
              );
              const recert = computeRecertInfo(merged, settings, today);
              // End date lands on the scheduled end while pending, actual end
              // once the assessment is completed.
              const endDatePatch = naEnd
                ? completed
                  ? { actualEndDate: naEnd }
                  : { scheduledEndDate: naEnd }
                : {};
              await ctx.db.patch(nqas._id, {
                status: resolvedStatus,
                ...(certStatus ? { certificationStatus: certStatus } : {}),
                ...(certDate ? { certificationDate: certDate } : {}),
                ...(nqasScore !== undefined ? { scorePercent: nqasScore } : {}),
                ...(validTill
                  ? { validityDate: validTill }
                  : derived.validityDate
                    ? { validityDate: derived.validityDate }
                    : {}),
                ...(naScheduled
                  ? { scheduledStartDate: naScheduled, originalScheduledStartDate: naScheduled }
                  : {}),
                ...endDatePatch,
                ...(naMode ? { mode: naMode } : {}),
                ...(departmentsRaw
                  ? {
                      departments: departmentsRaw
                        .split(",")
                        .map((d) => d.trim())
                        .filter(Boolean),
                    }
                  : {}),
                ...(derived.surveillanceDue1 ? { surveillanceDue1: derived.surveillanceDue1 } : {}),
                ...(derived.surveillanceDue2 ? { surveillanceDue2: derived.surveillanceDue2 } : {}),
                ...(surv1 ? { surveillanceDone1: surv1 } : {}),
                ...(surv2 ? { surveillanceDone2: surv2 } : {}),
                ...(survScore2 !== undefined ? { manualScore: survScore2 } : {}),
                ...(recert.status ? { manualRecertStatus: recert.status } : {}),
                ...(recert.year ? { recertYear: recert.year } : {}),
                ...(certDate
                  ? {
                      certifiedMonthYear: certDate.slice(0, 7),
                      certifiedYear: Number(certDate.slice(0, 4)),
                    }
                  : {}),
              });
              await audit(ctx, {
                table: "nationalAssessments",
                recordId: String(nqas._id),
                facilityId,
                action: "update",
                field: "NQAS (bulk import)",
                newValue: `${resolvedStatus}${certStatus ? ` — ${certStatus}` : ""}`,
                userName: user.name,
                userId: user._id,
              });
            }
          }
          // Recertification application stage (cycle-level)
          const recertStage = get(row, cols.recertStage);
          if (recertStage && recertStage !== cycle.recertStage) {
            await ctx.db.patch(cycle._id, { recertStage });
          }
        }
      }

      // ---- trackers (Gap Closure Fund / Fire NOC / Building) ----
      const gapAmount = parseAmount(get(row, cols.gapClosureAmount));
      const gcYear = get(row, cols.gcFundYear) || undefined;
      const procLink = get(row, cols.fundProcLink) || undefined;
      if (gapAmount !== undefined || gcYear || procLink) {
        await ctx.db.insert("gapClosureFunds", {
          facilityId,
          financialYear: gcYear || "2026-27",
          amountSanctioned: gapAmount,
          status: "Pending",
          procLink,
        });
      }
      const nocAvailRaw = get(row, cols.nocAvailable);
      const nocStatus = get(row, cols.fireNocStatus) || undefined;
      const nocValidity = parseImportDate(get(row, cols.fireNocValidity));
      const nocLink = get(row, cols.nocLink) || undefined;
      if (nocAvailRaw || nocStatus || nocValidity || nocLink) {
        const avail = /^(yes|y|true|1)$/i.test(nocAvailRaw.trim())
          ? "Yes"
          : /^(no|n|false|0)$/i.test(nocAvailRaw.trim())
            ? "No"
            : undefined;
        await ctx.db.insert("fireNocs", {
          facilityId,
          nocAvailable: avail,
          status: nocStatus || (avail === "No" ? "Not Obtained" : "Valid"),
          expiryDate: nocValidity,
          nocLink,
        });
      }
      const bType = get(row, cols.buildingType) || undefined;
      const bStatus = get(row, cols.buildingStatus) || undefined;
      const condemned = get(row, cols.condemnedLink) || undefined;
      if (bType || bStatus || condemned) {
        await ctx.db.insert("buildingDetails", {
          facilityId,
          buildingType: bType,
          buildingStatus: bStatus || "Good",
          condemnedLink: condemned,
        });
      }

      await refreshFacilityStatus(ctx, facilityId, user.name ?? "Unknown", user._id, false);
      await audit(ctx, {
        table: "facilities",
        recordId: String(facilityId),
        facilityId,
        action: "create",
        field: "Bulk import",
        newValue: `${name} (${block} / ${phc})`,
        userName: user.name,
        userId: user._id,
      });
    }
    return {
      created,
      errors,
      total: dataRows.length,
      headers: headers.filter(Boolean),
      skippedDuplicates,
      skippedEmpty,
      skippedJunk,
    };
  },
});

/* ================================================================
 *  ADMIN — remove block / PHC (with safety checks)
 * ================================================================ */

export const removeBlock = mutation({
  args: { blockId: v.id("blocks") },
  handler: async (ctx, { blockId }) => {
    const user = await requireActivatedUser(ctx);
    if (user.appRole !== "admin")
      throw new Error("Only the State Admin can remove blocks");
    const block = await ctx.db.get(blockId);
    if (!block) throw new Error("Block not found");
    const inUse = await ctx.db
      .query("facilities")
      .withIndex("by_block", (q) => q.eq("block", block.name))
      .first();
    if (inUse)
      throw new Error(
        `Block "${block.name}" still has facilities assigned — move or delete them first`,
      );
    // Drop master-data PHC rows pointing at this block too.
    const phcRows = await ctx.db
      .query("phcs")
      .withIndex("by_block", (q) => q.eq("block", block.name))
      .collect();
    for (const p of phcRows) await ctx.db.delete(p._id);
    await ctx.db.delete(blockId);
    await audit(ctx, {
      table: "blocks",
      recordId: String(blockId),
      action: "delete",
      field: "Block",
      oldValue: block.name,
      userName: user.name,
      userId: user._id,
    });
    return { removedPhcs: phcRows.length };
  },
});

/** Rename a block (Admin Settings → Master data → inline rename).
 *
 *  A block name is a *key*: facilities and master-data PHC rows store the
 *  block name as a string (`facilities.block`, `phcs.block`), and user block
 *  scoping resolves block ids to those names. So a rename MUST cascade —
 *  otherwise every facility in the block would point at a name that no longer
 *  exists. The cascade is audited so the activity log shows exactly what moved. */
export const renameBlock = mutation({
  args: { blockId: v.id("blocks"), name: v.string() },
  handler: async (ctx, { blockId, name }) => {
    const user = await requireActivatedUser(ctx);
    if (user.appRole !== "admin")
      throw new Error("Only the State Admin can rename blocks");
    const block = await ctx.db.get(blockId);
    if (!block) throw new Error("Block not found");
    const next = name.trim();
    if (!next) throw new Error("Block name cannot be empty");
    if (next === block.name) return { facilities: 0, phcs: 0 };

    // Case-insensitive duplicate check (two blocks must never share a name).
    const clash = (await ctx.db.query("blocks").collect()).find(
      (b) => b._id !== blockId && b.name.trim().toLowerCase() === next.toLowerCase(),
    );
    if (clash) throw new Error(`A block named "${clash.name}" already exists`);

    await ctx.db.patch(blockId, { name: next });

    // Cascade: facilities + master-data PHC rows keep working under the new name.
    const facilities = await ctx.db
      .query("facilities")
      .withIndex("by_block", (q) => q.eq("block", block.name))
      .collect();
    for (const f of facilities) await ctx.db.patch(f._id, { block: next });
    const phcs = await ctx.db
      .query("phcs")
      .withIndex("by_block", (q) => q.eq("block", block.name))
      .collect();
    for (const p of phcs) await ctx.db.patch(p._id, { block: next });

    await audit(ctx, {
      table: "blocks",
      recordId: String(blockId),
      action: "update",
      field: "Block name",
      oldValue: block.name,
      newValue: next,
      userName: user.name,
      userId: user._id,
    });
    if (facilities.length > 0) {
      await audit(ctx, {
        table: "facilities",
        recordId: String(blockId),
        action: "update",
        field: "Block (renamed with the block)",
        oldValue: `${facilities.length} facilities in ${block.name}`,
        newValue: `moved to ${next}`,
        userName: user.name,
        userId: user._id,
      });
    }
    return { facilities: facilities.length, phcs: phcs.length };
  },
});

/* ================================================================
 *  PER-USER LIST VIEW (columns / order / density)
 *  Stored so the choice follows the user across browsers, not just the one
 *  browser's localStorage. Deliberately NOT audit-logged: saving a view is not
 *  a data change an administrator needs to review, and logging every toggle
 *  would drown the activity log.
 * ================================================================ */

/** The signed-in user's saved view for a scope ("master"), or null.
 *
 *  Read-only for the caller's OWN row — a user never sees another user's view,
 *  and any activated account (viewer included) may save their own. The stored
 *  shape is sanitised by the client (lib/masterView.normalizeView), which falls
 *  back to the default view for anything unknown, so a corrupt row can only
 *  ever restore the defaults. */
export const getMasterView = query({
  args: { scope: v.string() },
  handler: async (ctx, { scope }) => {
    // Deliberately non-throwing: this is a convenience read (it restores the
    // user's column layout), so a signed-out or not-yet-activated caller gets
    // `null` and the page simply falls back to its local/default view. A throw
    // here would reach the browser as the opaque "Server Error" overlay.
    const userId = await getAuthUserId(ctx);
    const me = userId ? await ctx.db.get(userId) : null;
    if (!me || !me.appRole) return null;
    const row = await ctx.db
      .query("masterViews")
      .withIndex("by_user_scope", (q) => q.eq("userId", me._id).eq("scope", scope))
      .unique();
    return row ? { view: row.view as unknown, updatedAt: row.updatedAt } : null;
  },
});

/** Save the signed-in user's view for a scope (upsert: one row per user+scope). */
export const setMasterView = mutation({
  args: { scope: v.string(), view: v.any() },
  handler: async (ctx, { scope, view }) => {
    // Saving is a deliberate action, so this one does require an activated
    // account: a write from an anonymous caller is a bug, not a view fallback.
    const me = await requireActivatedUser(ctx);
    const payload = { view, updatedAt: Date.now() };
    const existing = await ctx.db
      .query("masterViews")
      .withIndex("by_user_scope", (q) => q.eq("userId", me._id).eq("scope", scope))
      .unique();
    if (existing) await ctx.db.patch(existing._id, payload);
    else await ctx.db.insert("masterViews", { userId: me._id, scope, ...payload });
    return { scope, savedAt: payload.updatedAt };
  },
});

/* ================================================================
 *  ADMIN — dropdown option usage + activity log
 * ================================================================ */

/** How many stored records use each dropdown option, per settings key.
 *
 *  Powers the “this option is used by N facilities” warning before an option
 *  is removed in Admin Settings. One table scan per source table (six scans
 *  total), never a query per option.
 *
 *  Two lists are deliberately NOT counted, because their stored values are
 *  canonical codes or free text rather than the editable label:
 *    • eligibilityOptions — stored `facilities.eligibility` is the canonical
 *      Eligible / Not Eligible / Possible value, not the admin label.
 *    • departmentCriteria — free text on the master sheet, no single field.
 *  For those the UI shows the removal warning without a count.
 *
 *  This is an AUXILIARY counter, so it must never be able to take the Admin
 *  page down: a signed-out or non-Administrator caller gets `authorized: false`
 *  with no rows instead of a thrown error (a throw reaches the browser as the
 *  opaque “Server Error”, which Convex React re-throws into the page).
 *
 *  Rows come back as an ARRAY — one { listKey, value, count } per option — and
 *  never as an object keyed by the option value: Convex validates the field
 *  names of every returned object and rejects non-ASCII ones, so a single
 *  option like “Certified — Surveillance Due” (em dash) made the whole result
 *  unserializable and crashed the page. */
type OptionUsageEntry = { listKey: string; value: string; count: number };

export const getAdminOptionUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const me = userId ? await ctx.db.get(userId) : null;
    if (!me || me.appRole !== "admin") {
      return { authorized: false, entries: [] as OptionUsageEntry[] };
    }

    const [facilities, buildings, nocs, funds, sas, nas] = await Promise.all([
      ctx.db.query("facilities").collect(),
      ctx.db.query("buildingDetails").collect(),
      ctx.db.query("fireNocs").collect(),
      ctx.db.query("gapClosureFunds").collect(),
      ctx.db.query("stateAssessments").collect(),
      ctx.db.query("nationalAssessments").collect(),
    ]);

    const counts = new Map<string, OptionUsageEntry>();
    const bump = (listKey: string, value: string | null | undefined) => {
      if (typeof value !== "string" || value.trim() === "") return;
      const rowKey = `${listKey}\u0000${value}`;
      const hit = counts.get(rowKey);
      if (hit) hit.count += 1;
      else counts.set(rowKey, { listKey, value, count: 1 });
    };

    for (const f of facilities) {
      bump("facilityTypes", f.facilityType);
      bump("statusLabels", f.currentStatus);
    }
    for (const b of buildings) {
      bump("buildingTypes", b.buildingType);
      bump("buildingStatuses", b.buildingStatus);
    }
    for (const n of nocs) bump("nocAvailableOptions", n.nocAvailable);
    for (const r of funds) bump("fundStatuses", r.status);
    for (const s of sas) {
      bump("saStatuses", s.status);
      bump("generalDocStatuses", s.generalDocStatus);
      // Legacy shared column counts too — old rows still display it.
      bump("assessorHuds", s.assessor1Hud);
      bump("assessorHuds", s.assessor2Hud);
      bump("assessorHuds", s.assessorHud);
    }
    for (const n of nas) {
      bump("assessmentModes", n.mode);
      bump("nqasStatuses", n.status);
      bump("certificationStatuses", n.certificationStatus);
      bump("checklistVersions", n.checklistVersion);
      for (const d of n.departments ?? []) bump("departments", d);
    }

    const entries = [...counts.values()].sort(
      (a, b) =>
        a.listKey.localeCompare(b.listKey) || a.value.localeCompare(b.value),
    );
    return { authorized: true, entries };
  },
});

/** Live counts for the Danger zone: exactly what a “delete all facilities”
 *  wipe removes, and what it keeps. Only runs when the admin opens the danger
 *  zone (the query is skipped until then), because it scans every table. */
export const getDeletePreview = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin")
      throw new Error("Only the State Admin can preview the wipe");
    const [
      facilities,
      cycles,
      sas,
      nas,
      funds,
      nocs,
      buildings,
      audits,
      blocks,
      phcs,
      users,
      settings,
    ] = await Promise.all([
      ctx.db.query("facilities").collect(),
      ctx.db.query("certificationCycles").collect(),
      ctx.db.query("stateAssessments").collect(),
      ctx.db.query("nationalAssessments").collect(),
      ctx.db.query("gapClosureFunds").collect(),
      ctx.db.query("fireNocs").collect(),
      ctx.db.query("buildingDetails").collect(),
      ctx.db.query("auditLogs").collect(),
      ctx.db.query("blocks").collect(),
      ctx.db.query("phcs").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("appSettings").collect(),
    ]);
    return {
      deleted: {
        facilities: facilities.length,
        cycles: cycles.length,
        stateAssessments: sas.length,
        nationalAssessments: nas.length,
        funds: funds.length,
        nocs: nocs.length,
        buildings: buildings.length,
        audits: audits.length,
      },
      kept: {
        blocks: blocks.length,
        phcs: phcs.length,
        users: users.filter((u) => !u.isAnonymous).length,
        settings: settings.length,
      },
    };
  },
});

/** Admin activity log — the newest audit entries (who changed what, when).
 *  Values are truncated: settings values can be long JSON blobs. */
export const listAdminActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin")
      throw new Error("Only the State Admin can read the activity log");
    const take = Math.min(Math.max(limit ?? 60, 1), 200);
    const rows = await ctx.db
      .query("auditLogs")
      .withIndex("by_time")
      .order("desc")
      .take(take);
    const trunc = (v: unknown): string | null => {
      if (v === null || v === undefined) return null;
      const s = typeof v === "string" ? v : JSON.stringify(v);
      return s.length > 200 ? `${s.slice(0, 197)}…` : s;
    };
    return rows.map((r) => ({
      _id: String(r._id),
      table: r.table,
      recordId: r.recordId,
      action: r.action,
      field: r.field ?? null,
      oldValue: trunc(r.oldValue),
      newValue: trunc(r.newValue),
      changedByName: r.changedByName ?? null,
      changedAt: r.changedAt,
    }));
  },
});

export const removePhc = mutation({
  args: { phcId: v.id("phcs") },
  handler: async (ctx, { phcId }) => {
    const user = await requireActivatedUser(ctx);
    if (user.appRole !== "admin")
      throw new Error("Only the State Admin can remove PHCs");
    const phc = await ctx.db.get(phcId);
    if (!phc) throw new Error("PHC not found");
    // A PHC row is removable only when no facility uses that block+PHC pair.
    const facilities = await ctx.db
      .query("facilities")
      .withIndex("by_block", (q) => q.eq("block", phc.block))
      .collect();
    const inUse = facilities.find((f) => f.phc === phc.name);
    if (inUse)
      throw new Error(
        `PHC "${phc.name}" still has facilities in block ${phc.block} — move or delete them first`,
      );
    await ctx.db.delete(phcId);
    await audit(ctx, {
      table: "phcs",
      recordId: String(phcId),
      action: "delete",
      field: "PHC",
      oldValue: `${phc.name} (${phc.block})`,
      userName: user.name,
      userId: user._id,
    });
  },
});

/**
 * ONE-TIME BACKFILL (Part 2.1) — seed `lastChangedAt`, `lastChangedBy`,
 * `lastChangeSource`, `lastBatchId` and `recentChanges` from the existing
 * audit log. Admin-only and idempotent: run it once after deploying the
 * schema; facilities with no audit history are reported, never invented.
 *
 * No read path scans auditLogs — this mutation is the only reader.
 */
export const backfillLastChanged = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin")
      throw new Error("Only the State Admin can backfill last-changed stamps");
    const facilities = await ctx.db.query("facilities").collect();
    let updated = 0;
    const withoutHistory: string[] = [];
    for (const f of facilities) {
      if (f.lastChangedAt) continue;
      const logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_facility", (q) => q.eq("facilityId", f._id))
        .collect();
      if (logs.length === 0) {
        withoutHistory.push(f.name);
        continue;
      }
      logs.sort((a, b) => b.changedAt - a.changedAt);
      const newest = logs[0];
      const recent: { key: string; at: number; source: string }[] = [];
      for (const log of logs) {
        const key = log.field ?? log.table;
        if (recent.some((r) => r.key === key)) continue;
        recent.push({
          key,
          at: log.changedAt,
          source: markFacilityChangedSource(log.source),
        });
        if (recent.length >= 10) break;
      }
      updated += 1;
      if (!dryRun) {
        await ctx.db.patch(f._id, {
          lastChangedAt: newest.changedAt,
          lastChangedBy: newest.changedByName ?? "system",
          lastChangeSource: markFacilityChangedSource(newest.source),
          lastBatchId: newest.batchId,
          recentChanges: recent,
        });
      }
    }
    await audit(ctx, {
      table: "facilities",
      recordId: "backfill",
      action: "update",
      field: "Last changed backfill",
      userName: me.name,
      userId: me._id,
      newValue: { updated, withoutHistory: withoutHistory.length },
    });
    return {
      scanned: facilities.length,
      updated,
      withoutHistory: withoutHistory.length,
      namesWithoutHistory: withoutHistory.slice(0, 50),
    };
  },
});

/** Same mapping as convex/facilities.lastChangeSourceOf (kept local so this
 *  module never needs a second import cycle). */
function markFacilityChangedSource(source: string | undefined): string {
  const s = (source ?? "").toLowerCase();
  if (s.includes("saqsham")) return "saqsham";
  if (s.includes("internal assessment") || s.includes("quarterly ia") || s.startsWith("ia")) return "ia";
  if (s.includes("facility master") || s.includes("master import") || s.includes("bulk import")) return "master";
  if (s.includes("auto") || s.includes("system") || s.includes("engine")) return "system";
  return "manual";
}
