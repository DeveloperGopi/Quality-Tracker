// Import pipeline for the templated Excel imports (SaQsham documents status,
// Internal Assessment scores). The wizard UI parses the user's sheet and maps
// columns; the server does the authoritative row validation, facility
// matching and writing.
//
// Idempotency contract: an import only ever PATCHES existing records and
// inserts one importLogs history row per run — running the same sheet twice
// converges to the same data state and creates no duplicates.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  allowedBlockNames,
  canEdit,
  getSettings,
  requireActivatedUser,
  refreshFacilityStatus,
  markFacilityChanged,
} from "./facilities";
import { normalizeNameKey, normalizeNinKey, validateIaRow, validateSaqshamRow } from "../lib/importMatch";
import {
  RESULT_DECLARED,
  documentsStatusReportOf,
  importWouldDowngrade,
  isResultDeclaredStatus,
} from "../lib/resultDeclared";
import { buildRecentMap, type RecentAuditEntry, type RecentMap } from "../lib/recentUpdates";
import type { ReportRow, ReportState } from "../lib/saqshamReport";
import {
  DEFAULT_CATEGORY_TYPE_MAP,
  DEFAULT_DISTRICT,
  DEFAULT_REPORT_GROUPS,
  SAQSHAM_STATUS_MAP,
  normalizeFacilityKey,
  normalizeStatusKey,
  normalizeStatusMap,
  reportGroupNames,
  reportStatusFor,
  statusMapIssues,
  type SaqshamReportGroup,
  type StatusMapEntry,
} from "../lib/saqshamImport";

/** Raw template row as sent by the wizard (cells stay untyped: numbers and
 *  text both arrive; Dates are converted client-side before sending). */
const rawRow = v.object({
  rowNo: v.number(),
  nin: v.optional(v.any()),
  name: v.optional(v.any()),
  block: v.optional(v.any()),
  docStatus: v.optional(v.any()),
  assessmentDate: v.optional(v.any()),
  scorePct: v.optional(v.any()),
  tracker: v.optional(v.string()),
});

const rowsArg = v.object({
  kind: v.union(v.literal("saqsham"), v.literal("ia")),
  fileName: v.string(),
  rows: v.array(rawRow),
});

type ImportRow = {
  rowNo: number;
  nin?: unknown;
  name?: unknown;
  block?: unknown;
  docStatus?: unknown;
  assessmentDate?: unknown;
  scorePct?: unknown;
  tracker?: unknown;
};

// ---------------------------------------------------------------------------
// Shared helpers — server-side facility candidate list, scoped by role
// ---------------------------------------------------------------------------

/** Everything the signed-in user may edit (State-wide for admins/DQMO/DQC,
 *  selected blocks for data-entry users). Reused by preview + apply. */
async function loadCandidates<G extends MutationCtx | QueryCtx>(
  ctx: G,
  me: { appRole?: string | null; blockIds?: Id<"blocks">[] },
): Promise<Doc<"facilities">[]> {
  const allowed = await allowedBlockNames(
    ctx as QueryCtx,
    me as never,
  );
  const facilities = await ctx.db.query("facilities").collect();
  return allowed === null
    ? facilities
    : facilities.filter((f) => allowed.has(f.block));
}

export const previewImport = query({
  args: rowsArg,
  handler: async (ctx, { kind, rows }) => {
    const me = await requireActivatedUser(ctx);
    if (!canEdit(me)) throw new Error("You do not have edit access");
    const facilities = await loadCandidates(ctx, me);
    const s = await getSettings(ctx);

    if (kind === "saqsham") {
      const checks = rows.map((r: ImportRow) =>
        validateSaqshamRow(r as never, facilities, (s.generalDocStatuses as string[]) ?? []),
      );
      return { checks, allowedStatuses: s.generalDocStatuses as string[] };
    }
    const checks = rows.map((r: ImportRow) => validateIaRow(r as never, facilities));
    return { checks, allowedStatuses: [] as string[] };
  },
});

/** Resolve a validated row to a facility — same precedence as the shared
 *  matcher (NIN, then name+block). Returns null when no unique match. */
function resolveFacility(
  facilities: Doc<"facilities">[],
  match: { nin: string | null; name: string | null; block: string | null },
): Doc<"facilities"> | undefined {
  if (match.nin) {
    const ninKey = normalizeNinKey(match.nin);
    const byNin = facilities.filter(
      (f) => f.ninNumber && normalizeNinKey(f.ninNumber) === ninKey,
    );
    if (byNin.length === 1) return byNin[0];
  }
  if (match.name) {
    const nameKey = normalizeNameKey(match.name);
    const blockKey = normalizeNameKey(match.block ?? "");
    const found = facilities.find(
      (f) =>
        normalizeNameKey(f.name) === nameKey &&
        normalizeNameKey(f.block) === blockKey,
    );
    if (found && !found.ninNumber) return found;
    // Prefer the unique name+block match only when it cannot disagree with a
    // known NIN — hand the rest to the same one-or-none rule.
    const byNameBlock = facilities.filter(
      (f) =>
        normalizeNameKey(f.name) === nameKey &&
        normalizeNameKey(f.block) === blockKey,
    );
    if (byNameBlock.length === 1) return byNameBlock[0];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// SaQsham documents status apply
// ---------------------------------------------------------------------------

export const applySaqshamImport = mutation({
  args: rowsArg,
  handler: async (ctx, { fileName, rows }) => {
    const me = await requireActivatedUser(ctx);
    if (!canEdit(me)) throw new Error("You do not have edit access");
    const facilities = await loadCandidates(ctx, me);
    const allowed = ((await getSettings(ctx)).generalDocStatuses as string[]) ?? [];
    const now = Date.now();
    const errors: { rowNo: number; reason: string }[] = [];
    const touched = new Set<string>();
    let updated = 0;

    for (const row of rows) {
      const check = validateSaqshamRow(row as never, facilities, allowed);
      if (check.status === "error") {
        errors.push({ rowNo: row.rowNo, reason: check.reasons.join("; ") });
        continue;
      }
      // Canonical status label (case/spacing-insensitive).
      const docStatus =
        allowed.find(
          (a) => normalizeNameKey(a) === normalizeNameKey(check.payload.docStatus),
        ) ?? check.payload.docStatus!;
      const facility = resolveFacility(facilities, check.payload);
      if (!facility) {
        errors.push({ rowNo: row.rowNo, reason: "Matched facility disappeared before write" });
        continue;
      }
      const cycles = await ctx.db
        .query("certificationCycles")
        .withIndex("by_facility", (q) => q.eq("facilityId", facility._id))
        .collect();
      const cycle = cycles
        .filter((c) => !c.superseded)
        .sort((a, b) => b.cycleNumber - a.cycleNumber)[0];
      if (!cycle) {
        errors.push({
          rowNo: row.rowNo,
          reason: `Row ${row.rowNo}: facility has no certification cycle yet — add one first`,
        });
        continue;
      }
      const sas = await ctx.db
        .query("stateAssessments")
        .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
        .collect();
      const sa = sas[0];
      if (!sa) {
        errors.push({
          rowNo: row.rowNo,
          reason: `Row ${row.rowNo}: facility has no State Assessment record in cycle ${cycle.cycleNumber}`,
        });
        continue;
      }
      // Idempotent: same sheet again ⇒ no change, no duplicate audit row.
      if (sa.generalDocStatus !== docStatus) {
        await ctx.db.patch(sa._id, {
          generalDocStatus: docStatus,
          generalDocUpdatedAt: now,
        });
        await ctx.db.insert("auditLogs", {
          table: "stateAssessments",
          recordId: String(sa._id),
          facilityId: facility._id,
          action: "update",
          field: "SaQsham Documents Status (import)",
          oldValue: sa.generalDocStatus ?? null,
          newValue: docStatus,
          changedBy: me._id as Id<"users">,
          changedByName: me.name ?? me.email ?? "Import",
          changedAt: now,
        });
        updated += 1;
      }
      touched.add(String(facility._id));
    }

    await ctx.db.insert("importLogs", {
      type: "saqsham",
      fileName,
      rowsTotal: rows.length,
      rowsUpdated: updated,
      rowsError: errors.length,
      errorSample: errors.slice(0, 20).map((e) => ({
        rowNo: e.rowNo,
        reason: e.reason,
      })),
      importedBy: me._id as Id<"users">,
      importedByName: me.name ?? me.email ?? undefined,
      importedAt: now,
    });
    return { updated, errors, facilitiesTouched: touched.size };
  },
});

// ---------------------------------------------------------------------------
// Internal Assessment apply
// ---------------------------------------------------------------------------

export const applyIaImport = mutation({
  args: rowsArg,
  handler: async (ctx, { fileName, rows }) => {
    const me = await requireActivatedUser(ctx);
    if (!canEdit(me)) throw new Error("You do not have edit access");
    const facilities = await loadCandidates(ctx, me);
    const now = Date.now();
    const errors: { rowNo: number; reason: string }[] = [];
    const touched = new Set<string>();
    let updated = 0;

    for (const row of rows) {
      const check = validateIaRow(row as never, facilities);
      if (check.status === "error") {
        errors.push({ rowNo: row.rowNo, reason: check.reasons.join("; ") });
        continue;
      }
      const { payload } = check;
      const facility = resolveFacility(facilities, payload);
      if (!facility) {
        errors.push({ rowNo: row.rowNo, reason: "Matched facility disappeared before write" });
        continue;
      }
      // Idempotent quarterly write: Q1/Q2 land in their own column; any other
      // date still records the facility's latest IA + score.
      const quarterField = (
        `${payload.tracker === "Kayakalp" ? "kayakalp" : "nqas"}Ia${payload.quarter}` as const
      ) as "nqasIaQ1" | "nqasIaQ2" | "kayakalpIaQ1" | "kayakalpIaQ2" | "nqasIa";
      const patch: {
        iaLastDate: string;
        iaLastScore: number;
        updatedAt: number;
        nqasIaQ1?: number;
        nqasIaQ2?: number;
        kayakalpIaQ1?: number;
        kayakalpIaQ2?: number;
      } = {
        iaLastDate: payload.assessmentDate!,
        iaLastScore: payload.scorePct!,
        updatedAt: now,
      };
      const quarterChanged =
        payload.quarter &&
        (facility[quarterField as "kayakalpIaQ1" | "kayakalpIaQ2" | "nqasIaQ1" | "nqasIaQ2"] ?? undefined) !==
          payload.scorePct;
      if (payload.quarter && payload.quarter !== undefined) {
        if (payload.tracker === "Kayakalp") {
          patch[quarterField as "kayakalpIaQ1" | "kayakalpIaQ2"] = payload.scorePct!;
        } else {
          patch[quarterField as "nqasIaQ1" | "nqasIaQ2"] = payload.scorePct!;
        }
      }
      const changed =
        (facility.iaLastDate ?? null) !== payload.assessmentDate ||
        (facility.iaLastScore ?? null) !== payload.scorePct ||
        !!quarterChanged;
      if (changed) {
        await ctx.db.patch(facility._id, patch);
        await markFacilityChanged(ctx, facility._id, {
          at: now,
          userName: me.name ?? me.email ?? "Import",
          source: "Internal Assessment import",
          key: "Internal Assessment (import)",
        });
        await ctx.db.insert("auditLogs", {
          table: "facilities",
          recordId: String(facility._id),
          facilityId: facility._id,
          action: "update",
          field: "Internal Assessment (import)",
          oldValue: {
            iaLastDate: facility.iaLastDate ?? null,
            iaLastScore: facility.iaLastScore ?? null,
          },
          newValue: { iaLastDate: patch.iaLastDate, iaLastScore: patch.iaLastScore },
          changedBy: me._id as Id<"users">,
          changedByName: me.name ?? me.email ?? "Import",
          changedAt: now,
        });
        // Keep the auto Current Status consistent with the new IA record.
        await refreshFacilityStatus(ctx, facility._id, me.name ?? "Import", me._id, false);
        updated += 1;
      }
      touched.add(String(facility._id));
    }

    await ctx.db.insert("importLogs", {
      type: "ia",
      fileName,
      rowsTotal: rows.length,
      rowsUpdated: updated,
      rowsError: errors.length,
      errorSample: errors.slice(0, 20).map((e) => ({
        rowNo: e.rowNo,
        reason: e.reason,
      })),
      importedBy: me._id as Id<"users">,
      importedByName: me.name ?? me.email ?? undefined,
      importedAt: now,
    });
    return { updated, errors, facilitiesTouched: touched.size };
  },
});

// ---------------------------------------------------------------------------
// Import history
// ---------------------------------------------------------------------------

export const listImportLogs = query({
  args: {},
  handler: async (ctx) => {
    await requireActivatedUser(ctx);
    const logs = await ctx.db
      .query("importLogs")
      .withIndex("by_time")
      .order("desc")
      .collect();
    return logs.slice(0, 50);
  },
});

/* ===========================================================================
 * SaQsham DOCUMENT STATUS IMPORT
 *
 * New-model import (application-no matching, helper columns, aliases,
 * editable status map, one transactional batch with undo). The old
 * `applySaqshamImport` above is kept for the legacy template wizard; this is
 * the path the Facility Master List → Import → SaQsham wizard uses.
 * ========================================================================= */

/** Roles allowed to run a SaQsham import: State Admin and District Editor. */
export function canImportSaqsham(me: { appRole?: string | null }): boolean {
  return me.appRole === "admin" || me.appRole === "entry";
}

/** The light facility shape the wizard + engine work with. */
function toSaqshamFacility(
  f: Doc<"facilities">,
  sa?: Doc<"stateAssessments"> | null,
  na?: Doc<"nationalAssessments"> | null,
) {
  // The Result Declared rule is read from the SAME source as the server's
  // downgrade guard: the latest SA status + the certification result. Without
  // this the preview showed "Not recorded" for a certified facility whose auto
  // "Result Declared" lives on the SA record (never on facilities).
  const storedStatus = sa?.generalDocStatus ?? f.saqshamStatusRaw ?? null;
  const declared = isResultDeclaredStatus(na?.certificationStatus);
  return {
    id: String(f._id),
    name: f.name,
    block: f.block,
    phc: f.phc,
    facilityType: f.facilityType,
    // Matching step 3 — the shared "Facility for Formula" key (lib/iaImport
    // seeds it; this importer compares the portal name to its segments).
    facilityKey: f.facilityKey ?? null,
    saqshamApplicationNo: f.saqshamApplicationNo ?? null,
    // Part 4: the stored "SaQsham Facility Name / Category" (matching step 2,
    // exact normalized, 100%).
    saqshamNameCategory: f.saqshamCategory ?? null,
    docsStatus: declared ? RESULT_DECLARED : storedStatus,
    docsStatusReport: documentsStatusReportOf(storedStatus, f.documentsStatusReport, na?.certificationStatus),
    saqshamPortalUpdatedOn: f.saqshamPortalUpdatedOn ?? null,
    saqshamImportedAt: f.saqshamImportedAt ?? null,
  };
}

/** The newest row per facility (cycles are created in order). */
function newestByFacility<T extends { facilityId: Id<"facilities">; _creationTime: number }>(rows: T[]) : Map<string, T> {
  const map = new Map<string, T>();
  for (const r of rows) {
    const key = String(r.facilityId);
    const prev = map.get(key);
    if (!prev || r._creationTime > prev._creationTime) map.set(key, r);
  }
  return map;
}

const SAQSHAM_GROUPS_KEY = "saqshamReportGroups";

function normalizeGroups(value: unknown): SaqshamReportGroup[] {
  if (!Array.isArray(value)) return DEFAULT_REPORT_GROUPS.map((g) => ({ ...g }));
  const seen = new Set<string>();
  const groups: SaqshamReportGroup[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Partial<SaqshamReportGroup>;
    const name = String(raw.name ?? "").trim();
    const key = normalizeStatusKey(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    groups.push({
      name,
      color: /^#[0-9a-f]{6}$/i.test(String(raw.color ?? "")) ? String(raw.color) : "#64748B",
      order: Number.isFinite(raw.order) ? Number(raw.order) : groups.length,
      system: raw.system === true || key === normalizeStatusKey("Result Declared"),
    });
  }
  if (!seen.has(normalizeStatusKey("Result Declared"))) {
    groups.push({ ...DEFAULT_REPORT_GROUPS[DEFAULT_REPORT_GROUPS.length - 1] });
  }
  return groups.sort((a, b) => a.order - b.order);
}

async function readReportGroups(ctx: QueryCtx | MutationCtx): Promise<SaqshamReportGroup[]> {
  const row = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", SAQSHAM_GROUPS_KEY))
    .first();
  return normalizeGroups(row?.value);
}

async function storeReportGroups(ctx: MutationCtx, groups: SaqshamReportGroup[]): Promise<void> {
  const row = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", SAQSHAM_GROUPS_KEY))
    .first();
  if (row) await ctx.db.patch(row._id, { value: groups });
  else await ctx.db.insert("appSettings", { key: SAQSHAM_GROUPS_KEY, value: groups });
}

/** The editable portal-status map, falling back to the shipped seed when the
 *  table is still empty (a query cannot seed — the editor persists it). */
async function readStatusMap(
  ctx: QueryCtx | MutationCtx,
): Promise<{ rows: StatusMapEntry[]; version: number }> {
  const rows = await ctx.db.query("saqshamStatusMap").collect();
  if (rows.length === 0) {
    return {
      rows: SAQSHAM_STATUS_MAP.map((r, order) => ({ ...r, version: 0, order })),
      version: 0,
    };
  }
  const version = Math.max(...rows.map((r) => r.version));
  return {
    rows: normalizeStatusMap(rows).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    version,
  };
}

/** Distinct facilities currently holding each portal text / report group. */
async function mappingUsage(ctx: QueryCtx) {
  const [facilities, assessments] = await Promise.all([
    ctx.db.query("facilities").collect(),
    ctx.db.query("stateAssessments").collect(),
  ]);
  const portals = new Map<string, Set<string>>();
  const reports = new Map<string, Set<string>>();
  const add = (map: Map<string, Set<string>>, value: unknown, facilityId: string) => {
    const key = normalizeStatusKey(value);
    if (!key) return;
    const set = map.get(key) ?? new Set<string>();
    set.add(facilityId);
    map.set(key, set);
  };
  for (const f of facilities) {
    add(portals, f.saqshamStatusRaw, String(f._id));
    add(reports, f.documentsStatusReport, String(f._id));
  }
  for (const sa of assessments) {
    add(portals, sa.generalDocStatusPortal, String(sa.facilityId));
    add(portals, sa.generalDocStatus, String(sa.facilityId));
  }
  const count = (map: Map<string, Set<string>>, key: string) => map.get(normalizeStatusKey(key))?.size ?? 0;
  return { portals, reports, count };
}

/** Validate + write the status map and group definitions in one audited step. */
async function persistMappingConfig(
  ctx: MutationCtx,
  me: Doc<"users">,
  rows: readonly StatusMapEntry[],
  groups: readonly SaqshamReportGroup[],
  source: string,
) {
  const normalizedGroups = normalizeGroups(groups);
  const normalizedRows = normalizeStatusMap(rows).map((row, order) => ({ ...row, order }));
  const names = reportGroupNames(normalizedGroups);
  const issues = statusMapIssues(normalizedRows, names);
  if (issues.length > 0) throw new Error(issues.join(" "));
  if (!normalizedGroups.some((g) => normalizeStatusKey(g.name) === normalizeStatusKey("Result Declared"))) {
    throw new Error("Result Declared is a system group and cannot be deleted.");
  }

  const currentRows = await ctx.db.query("saqshamStatusMap").collect();
  const currentGroups = await readReportGroups(ctx);
  const nextNames = new Set(normalizedGroups.map((g) => normalizeStatusKey(g.name)));
  for (const oldGroup of currentGroups) {
    if (nextNames.has(normalizeStatusKey(oldGroup.name))) continue;
    const usedInRows = normalizedRows.filter((r) => normalizeStatusKey(r.report) === normalizeStatusKey(oldGroup.name)).length;
    if (usedInRows > 0) {
      throw new Error(`Move the ${usedInRows} status${usedInRows === 1 ? "" : "es"} in “${oldGroup.name}” before deleting the group.`);
    }
    const usedInFacilities = await ctx.db
      .query("facilities")
      .filter((q) => q.eq(q.field("documentsStatusReport"), oldGroup.name))
      .first();
    if (usedInFacilities) {
      throw new Error(`“${oldGroup.name}” is still used by facilities. Reassign them before deleting the group.`);
    }
  }

  const nextVersion = currentRows.length ? Math.max(...currentRows.map((r) => r.version)) + 1 : 1;
  for (const row of currentRows) await ctx.db.delete(row._id);
  for (const row of normalizedRows) {
    await ctx.db.insert("saqshamStatusMap", {
      portal: row.portal,
      report: row.report,
      version: nextVersion,
      order: row.order,
      ...(row.aliases?.length ? { aliases: row.aliases } : {}),
    });
  }
  await storeReportGroups(ctx, normalizedGroups);
  await ctx.db.insert("auditLogs", {
    table: "saqshamStatusMap",
    recordId: "map",
    action: "update",
    field: `${source} (v${nextVersion})`,
    oldValue: {
      rows: currentRows.map((r) => ({ portal: r.portal, report: r.report, aliases: r.aliases ?? [] })),
      groups: currentGroups,
    },
    newValue: { rows: normalizedRows, groups: normalizedGroups },
    changedBy: me._id as Id<"users">,
    changedByName: me.name ?? me.email ?? "admin",
    changedAt: Date.now(),
    source,
  });
  return { version: nextVersion, count: normalizedRows.length, groups: normalizedGroups };
}

/** Everything the wizard needs to build the preview, in one query. */
export const getSaqshamImportContext = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    if (!canImportSaqsham(me))
      throw new Error("SaQsham import is available to the State Admin and District Editors only");
    const facilities = await loadCandidates(ctx, me);
    const [aliases, statusMap, groups, sas, nas] = await Promise.all([
      ctx.db.query("facilityAliases").collect(),
      readStatusMap(ctx),
      readReportGroups(ctx),
      ctx.db.query("stateAssessments").collect(),
      ctx.db.query("nationalAssessments").collect(),
    ]);
    const latestSa = newestByFacility(sas);
    const latestNa = newestByFacility(nas);
    return {
      me: { appRole: me.appRole ?? null, name: me.name ?? me.email ?? "user" },
      district: DEFAULT_DISTRICT,
      categoryTypeMap: DEFAULT_CATEGORY_TYPE_MAP,
      statusMap: statusMap.rows,
      statusMapVersion: statusMap.version,
      reportGroups: reportGroupNames(groups),
      facilities: facilities.map((f) =>
        toSaqshamFacility(f, latestSa.get(String(f._id)) ?? null, latestNa.get(String(f._id)) ?? null),
      ),
      aliases: aliases.map((a) => ({
        portalNameNormalized: a.portalNameNormalized,
        facilityType: a.facilityType,
        facilityId: String(a.facilityId),
      })),
    };
  },
});

/** The latest (non-superseded) cycle plus its SA and NQAS records. */
async function latestRecords(ctx: MutationCtx, facilityId: Id<"facilities">) {
  const cycles = await ctx.db
    .query("certificationCycles")
    .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
    .collect();
  const cycle = cycles.filter((c) => !c.superseded).sort((a, b) => b.cycleNumber - a.cycleNumber)[0];
  if (!cycle) return { cycle: null, sa: null, na: null };
  const [sas, nas] = await Promise.all([
    ctx.db.query("stateAssessments").withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id)).collect(),
    ctx.db.query("nationalAssessments").withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id)).collect(),
  ]);
  return { cycle, sa: sas[0] ?? null, na: nas[0] ?? null };
}

const optionalFields = v.object({
  assessmentMode: v.optional(v.union(v.string(), v.null())),
  appliedDepartments: v.optional(v.union(v.array(v.string()), v.null())),
  appliedDate: v.optional(v.union(v.string(), v.null())),
  assessmentType: v.optional(v.union(v.string(), v.null())),
});

const decisionValidator = v.object({
  rowNo: v.number(),
  facilityId: v.id("facilities"),
  applicationNo: v.optional(v.string()),
  statusRaw: v.optional(v.string()),
  reportStatus: v.optional(v.union(v.string(), v.null())),
  keepAsIs: v.optional(v.boolean()),
  portalUpdatedOn: v.optional(v.union(v.string(), v.null())),
  portalUpdatedBy: v.optional(v.union(v.string(), v.null())),
  portalName: v.optional(v.string()),
  facilityType: v.optional(v.string()),
  rememberAlias: v.optional(v.boolean()),
  applyStatusForward: v.optional(v.boolean()),
  overwriteOptional: v.optional(v.boolean()),
  optional: v.optional(optionalFields),
  matchMethod: v.optional(v.string()),
  confidence: v.optional(v.number()),
  raw: v.optional(v.any()),
  cleaned: v.optional(v.any()),
  // Denormalised facility identity + the Notes text the preview computed.
  facilityName: v.optional(v.string()),
  facilityBlock: v.optional(v.string()),
  facilityPhc: v.optional(v.string()),
  notes: v.optional(v.string()),
});

/**
 * Apply a confirmed SaQsham import as ONE transactional batch.
 *
 * Convex runs a mutation in a single transaction: if any write throws, every
 * write in the batch rolls back and the caller sees the cause — the brief's
 * "all or nothing" requirement. Idempotent: a row whose stored values already
 * match is recorded "no_change" and writes nothing.
 */
export const applySaqshamBatch = mutation({
  args: {
    fileName: v.string(),
    decisions: v.array(decisionValidator),
    /** Every pasted row's immutable report snapshot, including rows the user
     * did not apply. Kept separate from the writes so the report is complete. */
    reportRows: v.optional(v.array(v.any())),
  },
  handler: async (ctx, { fileName, decisions, reportRows }) => {
    const me = await requireActivatedUser(ctx);
    if (!canImportSaqsham(me)) throw new Error("You do not have SaQsham import access");
    const allowed = await allowedBlockNames(ctx as QueryCtx, me as never);
    const statusMap = (await readStatusMap(ctx)).rows;
    const byName = me.name ?? me.email ?? "Import";
    const now = Date.now();
    const snapshotRows = (reportRows ?? []) as ReportRow[];
    const outcomes = new Map<number, ReportState>();

    const batchId = await ctx.db.insert("importBatches", {
      kind: "saqsham",
      fileName,
      status: "applying",
      rowsTotal: snapshotRows.length || decisions.length,
      rowsUpdated: 0,
      rowsNoChange: 0,
      rowsSkipped: 0,
      rowsFailed: 0,
      reportRows: snapshotRows.length ? snapshotRows : undefined,
      statusMap: statusMap.map((entry) => ({ portal: entry.portal, report: entry.report })),
      importedBy: me._id as Id<"users">,
      importedByName: byName,
      importedAt: now,
    });

    let updated = 0;
    let noChange = 0;
    let skipped = 0;
    let failed = 0;
    const failures: { rowNo: number; reason: string }[] = [];

    for (const d of decisions) {
      const facility = await ctx.db.get(d.facilityId);
      if (!facility || (allowed !== null && !allowed.has(facility.block))) {
        failed += 1;
        outcomes.set(d.rowNo, "Failed");
        failures.push({
          rowNo: d.rowNo,
          reason: !facility ? "Facility no longer exists" : "Facility is outside your block access",
        });
        await ctx.db.insert("importRows", {
          batchId,
          rowNo: d.rowNo,
          facilityId: d.facilityId,
          applicationNo: d.applicationNo,
          matchMethod: d.matchMethod ?? "manual",
          confidence: d.confidence ?? 0,
          decision: "include",
          result: "failed",
          error: !facility ? "Facility no longer exists" : "Facility is outside your block access",
          raw: d.raw,
          cleaned: d.cleaned,
          facilityName: d.facilityName ?? facility?.name,
          facilityBlock: d.facilityBlock ?? facility?.block ?? "",
          facilityPhc: d.facilityPhc ?? facility?.phc ?? "",
          notes: d.notes,
        });
        continue;
      }

      const { sa, na } = await latestRecords(ctx, facility._id);

      // The server re-derives the Report value from its OWN status map — the
      // client's value can never override the configured mapping.
      const newStatus = (d.statusRaw ?? "").trim()
        ? (d.statusRaw ?? "").trim()
        : (facility.saqshamStatusRaw ?? null);
      // Part B: a facility whose result is DECLARED can never be moved back to
      // an earlier portal status by an import (SaQsham, master edit or bulk).
      // The row is skipped with the honest stale-data reason — no silent loss.
      const storedStatus = sa?.generalDocStatus ?? facility.saqshamStatusRaw ?? null;
      if (importWouldDowngrade(storedStatus, newStatus)) {
        skipped += 1;
        outcomes.set(d.rowNo, "Skipped");
        await ctx.db.insert("importRows", {
          batchId,
          rowNo: d.rowNo,
          facilityId: facility._id,
          applicationNo: d.applicationNo,
          matchMethod: d.matchMethod ?? "manual",
          confidence: d.confidence ?? 0,
          decision: "include",
          result: "skipped",
          error: "Older than current data",
          raw: d.raw,
          cleaned: d.cleaned,
          facilityName: d.facilityName ?? facility.name,
          facilityBlock: d.facilityBlock ?? facility.block ?? "",
          facilityPhc: d.facilityPhc ?? facility.phc ?? "",
          notes: "Result Declared is newer than this portal status — kept.",
          oldValue: snapshotFacility(facility, sa),
          newValue: snapshotFacility(facility, sa),
        });
        continue;
      }
      const keepAsIs = d.keepAsIs === true;
      const derivedReport = keepAsIs
        ? (facility.documentsStatusReport ?? null)
        : newStatus
          ? reportStatusFor(newStatus, statusMap)
          : (facility.documentsStatusReport ?? null);

      const patch: Record<string, unknown> = {};
      const changed: { field: string; oldValue: unknown; newValue: unknown }[] = [];
      const setField = (field: string, key: string, next: unknown, prev: unknown) => {
        if (next === undefined) return;
        // NEVER write a blank over an existing value. “Result declared” is final
        // and a missing portal cell must not erase stored data.
        if (
          String(prev ?? "").trim() !== "" &&
          String(next ?? "").trim() === ""
        )
          return;
        if (String(next ?? "") === String(prev ?? "")) return;
        patch[key] = next;
        changed.push({ field, oldValue: prev ?? null, newValue: next ?? null });
      };

      setField("SaQsham Documents Status", "saqshamStatusRaw", newStatus ?? undefined, facility.saqshamStatusRaw);
      setField(
        "Documents Status (Report)",
        "documentsStatusReport",
        derivedReport ?? undefined,
        facility.documentsStatusReport,
      );
      if (d.applicationNo)
        setField("SaQsham Application No", "saqshamApplicationNo", d.applicationNo, facility.saqshamApplicationNo);
      // Part 4: KEEP the raw portal "Facility Name/Category" text on the
      // facility (stored facilities.saqshamCategory). Fill a blank stored
      // value with the exact portal text; a different stored value survives —
      // it is only replaced when the preview's "Portal name changed" chip was
      // explicitly answered with "Update" (rememberAlias = true).
      if (d.portalName) {
        const prevName = facility.saqshamCategory ?? null;
        if (prevName == null) {
          setField(
            "SaQsham Facility Name / Category",
            "saqshamCategory",
            d.portalName,
            prevName,
          );
        } else if (
          d.rememberAlias === true &&
          String(prevName).trim() !== String(d.portalName).trim()
        ) {
          setField(
            "SaQsham Facility Name / Category",
            "saqshamCategory",
            d.portalName,
            prevName,
          );
        }
      }
      // Part 0.1: a stale (older) portal date is an INFO TAG in the preview,
      // never a decision — and it must never roll the stored date backwards.
      const incomingPortalDate = d.portalUpdatedOn ?? undefined;
      const storedPortalDate = facility.saqshamPortalUpdatedOn ?? undefined;
      const portalDateOk =
        !incomingPortalDate || !storedPortalDate || incomingPortalDate >= storedPortalDate;
      setField(
        "SaQsham Portal Last Updated",
        "saqshamPortalUpdatedOn",
        portalDateOk ? incomingPortalDate : undefined,
        facility.saqshamPortalUpdatedOn,
      );
      setField(
        "SaQsham Portal Updated By",
        "saqshamPortalUpdatedBy",
        d.portalUpdatedBy ?? undefined,
        facility.saqshamPortalUpdatedBy,
      );

      if (changed.length === 0 && !(d.applyStatusForward && sa)) {
        noChange += 1;
        outcomes.set(d.rowNo, "No change");
        await ctx.db.insert("importRows", {
          batchId,
          rowNo: d.rowNo,
          facilityId: facility._id,
          applicationNo: d.applicationNo,
          matchMethod: d.matchMethod ?? "manual",
          confidence: d.confidence ?? 0,
          decision: "include",
          result: "no_change",
          raw: d.raw,
          cleaned: d.cleaned,
          facilityName: d.facilityName ?? facility.name,
          facilityBlock: d.facilityBlock ?? facility.block ?? "",
          facilityPhc: d.facilityPhc ?? facility.phc ?? "",
          notes: d.notes,
          oldValue: snapshotFacility(facility, sa),
          newValue: snapshotFacility(facility, sa),
        });
        continue;
      }

      const oldValue = snapshotFacility(facility, sa);

      // Write the portal text into the SA record too, so the existing
      // "SaQsham Documents Status" master-list column keeps working.
      if (sa && newStatus && sa.generalDocStatus !== newStatus) {
        await ctx.db.patch(sa._id, { generalDocStatus: newStatus, generalDocUpdatedAt: now });
      }

      // Optional extra fields — only fill blanks unless the user ticked Overwrite.
      const overwrite = d.overwriteOptional === true;
      if (d.optional?.assessmentMode && na && (overwrite || !na.mode)) {
        await ctx.db.patch(na._id, { mode: d.optional.assessmentMode });
      }
      if (d.optional?.appliedDepartments?.length && na && (overwrite || !na.departments?.length)) {
        await ctx.db.patch(na._id, { departments: d.optional.appliedDepartments });
      }

      patch.saqshamImportedAt = now;
      patch.saqshamImportBatchId = String(batchId);
      patch.updatedAt = now;
      await ctx.db.patch(facility._id, patch);
      await markFacilityChanged(ctx, facility._id, {
        at: now,
        userName: byName,
        source: "SaQsham import",
        batchId: String(batchId),
        key: changed[0]?.field ?? "SaQsham document status",
      });

      // One audit entry per changed field, tagged with the source + batch.
      for (const c of changed) {
        await ctx.db.insert("auditLogs", {
          table: "facilities",
          recordId: String(facility._id),
          facilityId: facility._id,
          action: "update",
          field: c.field,
          oldValue: c.oldValue,
          newValue: c.newValue,
          changedBy: me._id as Id<"users">,
          changedByName: byName,
          changedAt: now,
          source: "SaQsham import",
          fileName,
          batchId: String(batchId),
        });
      }

      // "Move Facility Current Status forward" — recompute from the new doc
      // stage through the shared lifecycle engine (never hand-set), so the
      // validation rules apply and contradictory statuses cannot be created.
      if (d.applyStatusForward) {
        await refreshFacilityStatus(ctx, facility._id, byName, me._id as Id<"users">, false);
      }

      // Remember the match so the next import is automatic.
      if (d.rememberAlias && d.portalName) {
        const key = normalizeFacilityKey(d.portalName);
        const type = d.facilityType ?? facility.facilityType;
        const existing = await ctx.db
          .query("facilityAliases")
          .withIndex("by_name_type", (q) => q.eq("portalNameNormalized", key).eq("facilityType", type))
          .first();
        if (existing) await ctx.db.patch(existing._id, { facilityId: facility._id, createdBy: me._id as Id<"users"> });
        else
          await ctx.db.insert("facilityAliases", {
            portalNameNormalized: key,
            facilityType: type,
            facilityId: facility._id,
            createdBy: me._id as Id<"users">,
            createdAt: now,
          });
      }

      updated += 1;
      outcomes.set(
        d.rowNo,
        oldValue.saqshamStatusRaw || oldValue.generalDocStatus ? "Updated" : "New",
      );
      await ctx.db.insert("importRows", {
        batchId,
        rowNo: d.rowNo,
        facilityId: facility._id,
        applicationNo: d.applicationNo,
        matchMethod: d.matchMethod ?? "manual",
        confidence: d.confidence ?? 0,
        decision: "include",
        result: "updated",
        raw: d.raw,
        cleaned: d.cleaned,
        facilityName: d.facilityName ?? facility.name,
        facilityBlock: d.facilityBlock ?? facility.block ?? "",
        facilityPhc: d.facilityPhc ?? facility.phc ?? "",
        notes: d.notes,
        oldValue,
        newValue: { ...oldValue, ...patch, generalDocStatus: newStatus ?? sa?.generalDocStatus ?? null },
      });
    }

    const finalReportRows = snapshotRows.map((row) => ({
      ...row,
      state: outcomes.get(row.rowNo) ?? row.state,
      appliedBy: byName,
      appliedAt: now,
    }));
    await ctx.db.patch(batchId, {
      status: "applied",
      rowsUpdated: updated,
      rowsNoChange: noChange,
      rowsSkipped: skipped,
      rowsFailed: failed,
      reportRows: finalReportRows.length ? finalReportRows : undefined,
    });

    return { batchId: String(batchId), updated, noChange, skipped, failed, failures };
  },
});

/** The before-image an Undo restores. */
function snapshotFacility(f: Doc<"facilities">, sa: Doc<"stateAssessments"> | null) {
  return {
    facilityId: String(f._id),
    saId: sa ? String(sa._id) : null,
    saqshamApplicationNo: f.saqshamApplicationNo ?? null,
    saqshamStatusRaw: f.saqshamStatusRaw ?? null,
    documentsStatusReport: f.documentsStatusReport ?? null,
    saqshamPortalUpdatedOn: f.saqshamPortalUpdatedOn ?? null,
    saqshamPortalUpdatedBy: f.saqshamPortalUpdatedBy ?? null,
    saqshamImportedAt: f.saqshamImportedAt ?? null,
    generalDocStatus: sa?.generalDocStatus ?? null,
  };
}

/** Undo a batch — restores every changed field, skipping facilities that were
 *  edited after the import (reported as conflicts). */
export const undoSaqshamBatch = mutation({
  args: { batchId: v.id("importBatches") },
  handler: async (ctx, { batchId }) => {
    const me = await requireActivatedUser(ctx);
    if (!canImportSaqsham(me)) throw new Error("You do not have SaQsham import access");
    const batch = await ctx.db.get(batchId);
    if (!batch) throw new Error("Import batch not found");
    if (batch.status === "undone") throw new Error("This import has already been undone");
    const rows = await ctx.db.query("importRows").withIndex("by_batch", (q) => q.eq("batchId", batchId)).collect();
    const byName = me.name ?? me.email ?? "Import";
    const now = Date.now();
    let restored = 0;
    const conflicts: { rowNo: number; facilityId: string; reason: string }[] = [];

    for (const row of rows) {
      if (row.result !== "updated" || !row.facilityId || !row.oldValue) continue;
      const facility = await ctx.db.get(row.facilityId);
      if (!facility) {
        conflicts.push({ rowNo: row.rowNo, facilityId: String(row.facilityId), reason: "Facility deleted" });
        continue;
      }
      const newImportedAt = Number((row.newValue as { saqshamImportedAt?: number })?.saqshamImportedAt ?? 0);
      // Edited since the import? Compare the stamp the import wrote.
      if (newImportedAt && facility.saqshamImportedAt && facility.saqshamImportedAt !== newImportedAt) {
        conflicts.push({ rowNo: row.rowNo, facilityId: String(facility._id), reason: "Edited after the import" });
        continue;
      }
      // `old` = the pre-import snapshot the undo restores.
      const old = row.oldValue as Record<string, unknown>;
      // `imported` = the values the batch wrote (what undo replaces).
      const imported = (row.newValue ?? {}) as Record<string, unknown>;
      await ctx.db.patch(facility._id, {
        saqshamApplicationNo: (old.saqshamApplicationNo as string | null) ?? undefined,
        saqshamStatusRaw: (old.saqshamStatusRaw as string | null) ?? undefined,
        documentsStatusReport: (old.documentsStatusReport as string | null) ?? undefined,
        saqshamPortalUpdatedOn: (old.saqshamPortalUpdatedOn as string | null) ?? undefined,
        saqshamPortalUpdatedBy: (old.saqshamPortalUpdatedBy as string | null) ?? undefined,
        saqshamImportedAt: (old.saqshamImportedAt as number | null) ?? undefined,
        saqshamImportBatchId: undefined,
        updatedAt: now,
      });
      if (old.saId) {
        const saId = old.saId as Id<"stateAssessments">;
        const sa = await ctx.db.get(saId);
        if (sa) await ctx.db.patch(saId, { generalDocStatus: (old.generalDocStatus as string | null) ?? undefined, generalDocUpdatedAt: now });
      }
      // Per-field undo entries whose field is the TRACKED label and whose
      // source is "Undo import" — the read-time "recently updated" map then
      // sees them as the newest entry per field and the markers disappear.
      const restoredFields: { field: string; before: unknown; after: unknown }[] = [
        { field: "SaQsham Application No", before: imported.saqshamApplicationNo, after: old.saqshamApplicationNo },
        { field: "SaQsham Documents Status", before: imported.saqshamStatusRaw ?? imported.generalDocStatus, after: old.saqshamStatusRaw },
        { field: "Documents Status (Report)", before: imported.documentsStatusReport, after: old.documentsStatusReport },
        { field: "SaQsham Portal Last Updated", before: imported.saqshamPortalUpdatedOn, after: old.saqshamPortalUpdatedOn },
        { field: "SaQsham Portal Updated By", before: imported.saqshamPortalUpdatedBy, after: old.saqshamPortalUpdatedBy },
      ].filter((f) => String(f.before ?? "") !== String(f.after ?? ""));
      for (const f of restoredFields) {
        await ctx.db.insert("auditLogs", {
          table: "facilities",
          recordId: String(facility._id),
          facilityId: facility._id,
          action: "update",
          field: f.field,
          oldValue: f.before,
          newValue: f.after ?? null,
          changedBy: me._id as Id<"users">,
          changedByName: byName,
          changedAt: now,
          source: "Undo import",
          fileName: batch.fileName,
          batchId: String(batchId),
        });
      }
      // The audit timeline keeps ONE undo summary entry per row.
      await ctx.db.insert("auditLogs", {
        table: "facilities",
        recordId: String(facility._id),
        facilityId: facility._id,
        action: "update",
        field: "SaQsham import (undo)",
        oldValue: row.newValue,
        newValue: row.oldValue,
        changedBy: me._id as Id<"users">,
        changedByName: byName,
        changedAt: now,
        source: "Undo import",
        fileName: batch.fileName,
        batchId: String(batchId),
      });
      await ctx.db.patch(row._id, { result: "undone" });
      restored += 1;
    }

    await ctx.db.patch(batchId, { status: "undone", undoneAt: now, undoneBy: me._id as Id<"users"> });
    return { restored, conflicts, importedAtSkipped: batch.importedAt };
  },
});

/** Import history — the batch list for the Import history page. */
export const listImportBatches = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireActivatedUser(ctx);
    const rows = await ctx.db.query("importBatches").withIndex("by_time").order("desc").collect();
    return rows.slice(0, Math.min(limit ?? 50, 100)).map(({ reportRows: _reportRows, ...batch }) => ({
      ...batch,
      hasReportDetail: !!_reportRows?.length,
    }));
  },
});

/** The immutable report snapshot for one batch. */
export const getSaqshamReport = query({
  args: { batchId: v.id("importBatches") },
  handler: async (ctx, { batchId }) => {
    await requireActivatedUser(ctx);
    const batch = await ctx.db.get(batchId);
    if (!batch) return null;
    return {
      _id: batch._id,
      fileName: batch.fileName,
      importedByName: batch.importedByName ?? "",
      importedAt: batch.importedAt,
      rowsTotal: batch.rowsTotal,
      rowsUpdated: batch.rowsUpdated,
      rowsNoChange: batch.rowsNoChange,
      rowsSkipped: batch.rowsSkipped,
      rowsFailed: batch.rowsFailed,
      reportRows: batch.reportRows ?? null,
      statusMap: batch.statusMap ?? [],
    };
  },
});

/** One batch's rows — for the downloadable import report and the detail view. */
export const listImportBatchRows = query({
  args: { batchId: v.id("importBatches") },
  handler: async (ctx, { batchId }) => {
    await requireActivatedUser(ctx);
    return ctx.db.query("importRows").withIndex("by_batch", (q) => q.eq("batchId", batchId)).collect();
  },
});

/**
 * RECENTLY UPDATED — the read-time marker map (Part C).
 *
 * No flag is stored per row: the newest qualifying audit entry per
 * (facility, tracked field) marks the cell for N × 24 h from now. Changing
 * N (or the highlight scope) in Admin takes effect on the next load without
 * re-importing anything, and an undo write ("Undo import") clears the
 * markers for its facility fields by simply being the newest entry.
 */
export const getRecentUpdates = query({
  args: {
    /** The Admin "Recently updated: days" setting (0 = off → empty map). */
    days: v.optional(v.number()),
    /** Admin "Highlight scope": "imports" (default) or "importsEdits". */
    scope: v.optional(v.string()),
  },
  handler: async (ctx, { days, scope }): Promise<RecentMap> => {
    await requireActivatedUser(ctx);
    const n = Math.max(0, Math.min(30, Math.floor(days ?? 1)));
    if (n === 0) return {};
    const now = Date.now();
    const cutoff = now - n * 24 * 60 * 60 * 1000; // N × 24 h, IST-agnostic
    const rows = await ctx.db
      .query("auditLogs")
      .withIndex("by_time", (q) => q.gte("changedAt", cutoff))
      .collect();
    const entries: RecentAuditEntry[] = rows.map((r) => ({
      facilityId: r.facilityId ? String(r.facilityId) : null,
      table: r.table,
      field: r.field ?? null,
      changedAt: r.changedAt,
      source: r.source ?? null,
      changedByName: r.changedByName ?? null,
      oldValue: r.oldValue,
      fileName: r.fileName ?? null,
      batchId: r.batchId ?? null,
    }));
    return buildRecentMap(entries, {
      cutoff,
      now,
      scope: scope === "importsEdits" ? "importsEdits" : "imports",
    });
  },
});

/** Remember a portal-name → facility match (asked when the user confirms a
 *  fuzzy/manual pick; default ON). */
export const saveFacilityAlias = mutation({
  args: { portalName: v.string(), facilityType: v.string(), facilityId: v.id("facilities") },
  handler: async (ctx, { portalName, facilityType, facilityId }) => {
    const me = await requireActivatedUser(ctx);
    if (!canImportSaqsham(me)) throw new Error("You do not have SaQsham import access");
    const key = normalizeFacilityKey(portalName);
    const existing = await ctx.db
      .query("facilityAliases")
      .withIndex("by_name_type", (q) => q.eq("portalNameNormalized", key).eq("facilityType", facilityType))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { facilityId, createdBy: me._id as Id<"users"> });
      return { id: String(existing._id) };
    }
    const id = await ctx.db.insert("facilityAliases", {
      portalNameNormalized: key,
      facilityType,
      facilityId,
      createdBy: me._id as Id<"users">,
      createdAt: Date.now(),
    });
    return { id: String(id) };
  },
});

/** The editable status map + group list, with live facility counts. */
export const getSaqshamStatusMap = query({
  args: {},
  handler: async (ctx) => {
    await requireActivatedUser(ctx);
    const [{ rows, version }, groups, usage] = await Promise.all([
      readStatusMap(ctx),
      readReportGroups(ctx),
      mappingUsage(ctx),
    ]);
    const countPortal = (row: StatusMapEntry) => {
      const keys = [row.portal, ...(row.aliases ?? [])];
      const ids = new Set<string>();
      for (const key of keys) {
        for (const id of usage.portals.get(normalizeStatusKey(key)) ?? []) ids.add(id);
      }
      return ids.size;
    };
    return {
      version,
      groups: groups.map((g) => ({ ...g, usage: usage.count(usage.reports, g.name) })),
      rows: rows.map((row) => ({
        ...row,
        portalUsage: countPortal(row),
        reportUsage: usage.count(usage.reports, row.report),
      })),
    };
  },
});

const mappingRowArg = v.object({
  portal: v.string(),
  report: v.string(),
  aliases: v.optional(v.array(v.string())),
  order: v.optional(v.number()),
});
const mappingGroupArg = v.object({
  name: v.string(),
  color: v.string(),
  order: v.number(),
  system: v.optional(v.boolean()),
});

/** Save both columns + group definitions (State Admin only). Audited. */
export const setSaqshamMappingConfig = mutation({
  args: { rows: v.array(mappingRowArg), groups: v.array(mappingGroupArg) },
  handler: async (ctx, { rows, groups }) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin") throw new Error("Only the State Admin can edit the status mapping");
    return persistMappingConfig(ctx, me, rows, groups, "SaQsham status mapping");
  },
});

/** Rename a report group and cascade to mapping rows + stored facility values. */
export const renameSaqshamReportGroup = mutation({
  args: { from: v.string(), to: v.string(), color: v.optional(v.string()) },
  handler: async (ctx, { from, to, color }) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin") throw new Error("Only the State Admin can edit report groups");
    const currentGroups = await readReportGroups(ctx);
    const current = currentGroups.find((g) => normalizeStatusKey(g.name) === normalizeStatusKey(from));
    if (!current) throw new Error("That report group no longer exists.");
    if (current.system || normalizeStatusKey(from) === normalizeStatusKey("Result Declared")) {
      throw new Error("Result Declared is a system group and cannot be renamed.");
    }
    const name = to.trim();
    if (!name) throw new Error("Enter a report group name.");
    if (currentGroups.some((g) => g !== current && normalizeStatusKey(g.name) === normalizeStatusKey(name))) {
      throw new Error("A report group with that name already exists.");
    }
    const groups = currentGroups.map((g) =>
      g === current ? { ...g, name, color: color ?? g.color, system: false } : g,
    );
    const map = await readStatusMap(ctx);
    const rows = map.rows.map((row) =>
      normalizeStatusKey(row.report) === normalizeStatusKey(current.name)
        ? { ...row, report: name }
        : row,
    );
    const facilities = await ctx.db.query("facilities").collect();
    let updatedFacilities = 0;
    for (const facility of facilities) {
      if (facility.documentsStatusReport !== current.name) continue;
      await ctx.db.patch(facility._id, { documentsStatusReport: name });
      updatedFacilities += 1;
    }
    const result = await persistMappingConfig(ctx, me, rows, groups, "Rename SaQsham report group");
    await ctx.db.insert("auditLogs", {
      table: "facilities",
      recordId: "documentsStatusReport",
      action: "update",
      field: `Documents Status (Report): ${current.name} → ${name}`,
      oldValue: current.name,
      newValue: name,
      changedBy: me._id as Id<"users">,
      changedByName: me.name ?? me.email ?? "admin",
      changedAt: Date.now(),
      source: "Rename SaQsham report group",
    });
    return { ...result, updatedFacilities };
  },
});

/** Backwards-compatible single-map write, now validated against the groups. */
export const setSaqshamStatusMap = mutation({
  args: { rows: v.array(mappingRowArg) },
  handler: async (ctx, { rows }) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin") throw new Error("Only the State Admin can edit the status mapping");
    const groups = await readReportGroups(ctx);
    return persistMappingConfig(ctx, me, rows, groups, "SaQsham status mapping");
  },
});
