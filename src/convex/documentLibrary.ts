/**
 * DOCUMENT LIBRARY + ZIP EXPORTS
 *
 * `library` is the read model for `/documents` (one row per CURRENT file,
 * scoped to the signed-in user's blocks). `startExport` freezes a selection
 * and schedules `runExport`, which streams Drive → ZIP → Drive in 500 MB
 * parts, then `listExports` reports progress and `getExportLink` mints the
 * audited download link. No Drive id, link or token ever leaves this module
 * (the HTTP handler resolves the bytes server-side).
 */

import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  allowedBlockNames,
  canEditAll,
  getSettings,
  requireActivatedUser,
} from "./facilities";
import { actionUser, driveDeps, rootFolderFor } from "./drive";
import { asFileStoreError } from "./storage/fileStore";
import { randomBytes, signReadToken, toBase64Url } from "./storage/crypto";
import { ACTIVE_DOC_TYPES, canonicalDocKey, docType } from "./storage/validation";
import { normalizeDocumentRules } from "../lib/documentRules";
import { isResultReaderEnabled } from "../lib/readerSettings";
import { unzipSync, zipSync } from "fflate";
import {
  exportBaseName,
  forceUtf8Flags,
  uniqueEntryName,
  ZIP_NAME_MAX,
  zipDocumentPath,
} from "./storage/zip";

/* ------------------------------------------------------------------ */
/* Limits                                                             */
/* ------------------------------------------------------------------ */

/** Every part holds at most this many files (a 200-file part is the cap). */
const PART_FILE_LIMIT = 200;
const PART_LIMIT = PART_FILE_LIMIT;
const UPLOAD_CHUNK = 4 * 1024 * 1024; // Drive requires a multiple of 256 KB
const MAX_FILES = 5000;
const TOKEN_TTL_MS = 5 * 60_000;

const filtersValidator = v.object({
  block: v.optional(v.string()),
  facilityType: v.optional(v.string()),
  docKey: v.optional(v.string()),
  cycleNo: v.optional(v.number()),
  uploadDate: v.optional(v.string()), // yyyy-mm-dd
  uploadedBy: v.optional(v.string()),
  search: v.optional(v.string()),
  state: v.optional(v.union(v.literal("uploaded"), v.literal("missing"))),
});
type ExportFilters = {
  block?: string;
  facilityType?: string;
  docKey?: string;
  cycleNo?: number;
  uploadDate?: string;
  uploadedBy?: string;
  search?: string;
  state?: "uploaded" | "missing";
};

type FacilityRow = {
  _id: Id<"facilities">;
  name: string;
  block: string;
  phc: string;
  facilityType: string;
  ninNumber?: string | null;
  currentCycleNumber?: number | null;
};

type SelectedFile = {
  documentId: Id<"facilityDocuments">;
  driveFileId: string;
  facilityId: Id<"facilities">;
  facilityName: string;
  block: string;
  nin: string | null;
  docKey: string;
  docLabel: string;
  cycleNo: number;
  originalName: string;
  displayName: string;
  size: number;
  mimeType: string;
  uploadedAt: number;
  uploadedByName: string;
  versionNo: number;
  isVersion: boolean;
};

function allowedFacilities(
  facilities: FacilityRow[],
  allowed: Set<string> | null,
): FacilityRow[] {
  return allowed === null ? facilities : facilities.filter((f) => allowed.has(f.block));
}

function dayIso(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function matchesFilters(row: SelectedFile, facilityType: string, filters: ExportFilters): boolean {
  if (filters.block && row.block !== filters.block) return false;
  if (filters.facilityType && facilityType !== filters.facilityType) return false;
  if (filters.docKey && row.docKey !== canonicalDocKey(filters.docKey)) return false;
  if (filters.cycleNo != null && row.cycleNo !== filters.cycleNo) return false;
  if (filters.uploadedBy && row.uploadedByName !== filters.uploadedBy) return false;
  if (filters.uploadDate && dayIso(row.uploadedAt) !== filters.uploadDate) return false;
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    if (q) {
      const hay =
      `${row.facilityName} ${row.nin ?? ""} ${row.originalName} ${row.displayName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
  }
  return true;
}

/**
 * The frozen export selection. Current-only unless `includeVersions`; removed
 * rows and files missing in Drive never have bytes to include.
 */
async function selectExportFiles(
  ctx: QueryCtx | MutationCtx,
  facilities: FacilityRow[],
  filters: ExportFilters,
  includeVersions: boolean,
): Promise<SelectedFile[]> {
  if (filters.state === "missing") return [];
  const allowedIds = new Set(facilities.map((f) => String(f._id)));
  const facilityById = new Map(facilities.map((f) => [String(f._id), f]));
  const docs = await ctx.db.query("facilityDocuments").collect();

  // Newest current row per (facility, canonical type, cycle) — the SAME rule
  // the Documents card and the library count use.
  const currentKey = new Map<string, string>(); // group -> document id
  for (const d of docs) {
    if (!allowedIds.has(String(d.facilityId))) continue;
    if (!d.isCurrent || d.removedAt || d.missingInDriveAt) continue;
    const group = `${d.facilityId}|${canonicalDocKey(d.docKey)}|${d.cycleNo}`;
    const at = currentKey.get(group);
    if (!at) {
      currentKey.set(group, String(d._id));
      continue;
    }
    const prev = docs.find((x) => String(x._id) === at);
    if (!prev || d.uploadedAt > prev.uploadedAt) currentKey.set(group, String(d._id));
  }
  const currentIds = new Set(currentKey.values());

  const out: SelectedFile[] = [];
  for (const d of docs) {
    if (!allowedIds.has(String(d.facilityId))) continue;
    if (d.removedAt || d.missingInDriveAt) continue;
    const isVersion = !currentIds.has(String(d._id));
    if (isVersion && (!includeVersions || d.isCurrent)) continue;
    const facility = facilityById.get(String(d.facilityId));
    if (!facility) continue;
    const key = canonicalDocKey(d.docKey);
    const type = docType(key);
    const row: SelectedFile = {
      documentId: d._id,
      driveFileId: d.driveFileId,
      facilityId: d.facilityId,
      facilityName: facility.name,
      block: facility.block,
      nin: facility.ninNumber ?? null,
      docKey: key,
      docLabel: type?.label ?? key,
      cycleNo: d.cycleNo ?? 1,
      originalName: d.originalName,
      displayName: d.displayName ?? d.originalName,
      size: d.size,
      mimeType: d.mimeType,
      uploadedAt: d.uploadedAt,
      uploadedByName: d.uploadedByName ?? "System",
      versionNo: d.versionNo ?? 1,
      isVersion,
    };
    if (!matchesFilters(row, facility.facilityType, filters)) continue;
    out.push(row);
  }
  out.sort(
    (a, b) =>
      a.block.localeCompare(b.block) ||
      a.facilityName.localeCompare(b.facilityName) ||
      a.docLabel.localeCompare(b.docLabel) ||
      b.versionNo - a.versionNo,
  );
  return out;
}

/* ------------------------------------------------------------------ */
/* Library read model                                                 */
/* ------------------------------------------------------------------ */

export const library = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    const allowed = await allowedBlockNames(ctx, user);
    const facilities = (await ctx.db.query("facilities").collect()) as FacilityRow[];
    const scoped = allowedFacilities(facilities, allowed);
    const fetchedAt = Date.now();
    const allowedIds = new Set(scoped.map((f) => String(f._id)));

    /* One cached read for the whole page: every table the requirement rules
       evaluate against is joined here, so rendering the matrix, the coverage
       strip and the files list never makes a per-row query or a Drive call. */
    const [docs, settings, cycles, nationalAssessments, funds, buildings, nocs, resultReads] =
      await Promise.all([
        ctx.db.query("facilityDocuments").collect(),
        getSettings(ctx),
        ctx.db.query("certificationCycles").collect(),
        ctx.db.query("nationalAssessments").collect(),
        ctx.db.query("gapClosureFunds").collect(),
        ctx.db.query("buildingDetails").collect(),
        ctx.db.query("fireNocs").collect(),
        ctx.db.query("resultReads").collect(),
      ]);

    /* Latest accepted read per Result file powers the library badge, filter
       and "Read result" menu without a query per row. */
    const readByDocument = new Map<string, (typeof resultReads)[number]>();
    for (const read of resultReads) {
      if (!allowedIds.has(String(read.facilityId))) continue;
      const key = String(read.documentId);
      const previous = readByDocument.get(key);
      if (!previous || read.readAt > previous.readAt) readByDocument.set(key, read);
    }

    /* The active cycle per facility — the SAME precedence the Master List uses
       (stored pointer, then the non-superseded cycle, then the newest), so the
       coverage strip and "Needs attention" evaluate the rule on one cycle. */
    const cyclesByFacility = new Map<string, typeof cycles>();
    for (const cycle of cycles) {
      if (!allowedIds.has(String(cycle.facilityId))) continue;
      const key = String(cycle.facilityId);
      const list = cyclesByFacility.get(key) ?? [];
      list.push(cycle);
      cyclesByFacility.set(key, list);
    }
    const naByCycle = new Map(nationalAssessments.map((n) => [String(n.cycleId), n]));
    const activeCycleByFacility = new Map<string, (typeof cycles)[number]>();
    for (const facility of scoped) {
      const list = cyclesByFacility.get(String(facility._id)) ?? [];
      const active =
        list.find((c) => c.cycleNumber === facility.currentCycleNumber) ??
        list.find((c) => !c.superseded) ??
        list[list.length - 1];
      if (active) activeCycleByFacility.set(String(facility._id), active);
    }

    const latestFundByFacility = new Map<string, (typeof funds)[number]>();
    for (const fund of funds) {
      if (!allowedIds.has(String(fund.facilityId))) continue;
      const key = String(fund.facilityId);
      const prev = latestFundByFacility.get(key);
      if (!prev || fund.financialYear.localeCompare(prev.financialYear) > 0)
        latestFundByFacility.set(key, fund);
    }

    const newestNocByFacility = new Map<string, (typeof nocs)[number]>();
    for (const noc of nocs) {
      if (!allowedIds.has(String(noc.facilityId))) continue;
      const key = String(noc.facilityId);
      const prev = newestNocByFacility.get(key);
      if (!prev || (noc.expiryDate ?? "").localeCompare(prev.expiryDate ?? "") > 0)
        newestNocByFacility.set(key, noc);
    }

    const buildingByFacility = new Map<string, (typeof buildings)[number]>();
    for (const row of buildings) {
      if (!allowedIds.has(String(row.facilityId))) continue;
      const key = String(row.facilityId);
      if (!buildingByFacility.has(key)) buildingByFacility.set(key, row);
    }

    /* Every non-removed row, with the newest row in each (facility, type,
       cycle) group marked current. Previous versions are included so the
       "Include previous versions" option needs no second request. */
    const newest = new Map<string, (typeof docs)[number]>();
    for (const d of docs) {
      if (!allowedIds.has(String(d.facilityId)) || d.removedAt) continue;
      const group = `${d.facilityId}|${canonicalDocKey(d.docKey)}|${d.cycleNo}`;
      const prev = newest.get(group);
      if (!prev || d.uploadedAt > prev.uploadedAt) newest.set(group, d);
    }
    const currentIds = new Set(Array.from(newest.values(), (d) => String(d._id)));

    return {
      fetchedAt,
      facilities: scoped.map((f) => {
        const id = String(f._id);
        const cycle = activeCycleByFacility.get(id);
        const na = cycle ? naByCycle.get(String(cycle._id)) : undefined;
        const fund = latestFundByFacility.get(id);
        const noc = newestNocByFacility.get(id);
        return {
          id,
          name: f.name,
          block: f.block,
          phc: f.phc,
          facilityType: f.facilityType,
          nin: f.ninNumber ?? null,
          cycleNo: f.currentCycleNumber || cycle?.cycleNumber || 1,
          cycles: Array.from(
            new Set(
              (cyclesByFacility.get(id) ?? [])
                .map((row) => row.cycleNumber)
                .concat(f.currentCycleNumber || cycle?.cycleNumber || 1),
            ),
          )
            .filter((n) => n > 0)
            .sort((a, b) => a - b),
          certStatus: na?.certificationStatus ?? null,
          gapAmount: fund?.amountSanctioned ?? 0,
          dilapidated: (buildingByFacility.get(id)?.buildingStatus ?? "").toLowerCase() === "dilapidated",
          fireNocRecorded:
            !!noc &&
            ((noc.nocAvailable ?? "") === "Yes" ||
              !!noc.issuedDate ||
              !!noc.attachmentId ||
              /obtained|valid/i.test(noc.status ?? "")),
        };
      }),
      documents: docs
        .filter((d) => allowedIds.has(String(d.facilityId)) && !d.removedAt)
        .map((d) => ({
          id: String(d._id),
          facilityId: String(d.facilityId),
          docKey: canonicalDocKey(d.docKey),
          docLabel: docType(canonicalDocKey(d.docKey))?.label ?? d.docKey,
          cycleNo: d.cycleNo ?? 1,
          originalName: d.originalName,
          displayName: d.displayName ?? d.originalName,
          size: d.size,
          mimeType: d.mimeType,
          uploadedAt: d.uploadedAt,
          uploadedByName: d.uploadedByName ?? "System",
          versionNo: d.versionNo ?? 1,
          isCurrent: currentIds.has(String(d._id)),
          missingInDrive: !!d.missingInDriveAt,
          resultReadAt: readByDocument.get(String(d._id))?.readAt ?? null,
          resultCertifiedDate: readByDocument.get(String(d._id))?.certifiedDate ?? null,
          resultOverallScore: readByDocument.get(String(d._id))?.overallScore ?? null,
        })),
      definitions: ACTIVE_DOC_TYPES.map((type) => ({ key: type.key, label: type.label })),
      rules: normalizeDocumentRules(
        (settings as unknown as { documentRules?: unknown }).documentRules,
      ),
      readerEnabled: isResultReaderEnabled(
        (settings as unknown as Record<string, unknown>) ?? null,
      ),
    };
  },
});

/* ------------------------------------------------------------------ */
/* Start a ZIP job                                                    */
/* ------------------------------------------------------------------ */

export const startExport = mutation({
  args: {
    facilityId: v.optional(v.id("facilities")),
    filters: v.optional(filtersValidator),
    includeVersions: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ jobId: string; files: number; baseName: string }> => {
    const user = await requireActivatedUser(ctx);
    const allowed = await allowedBlockNames(ctx, user);
    let facilities = (await ctx.db.query("facilities").collect()) as FacilityRow[];
    facilities = allowedFacilities(facilities, allowed);
    if (args.facilityId) {
      facilities = facilities.filter((f) => String(f._id) === String(args.facilityId));
      if (facilities.length === 0)
        throw new Error("This facility is outside your assigned blocks");
    }
    if (facilities.length === 0) throw new Error("No facilities are in your scope");

    const filters: ExportFilters = { ...(args.filters ?? {}) };
    if (args.facilityId) {
      // A facility export ignores block/type filters from another page.
      filters.block = undefined;
    }
    const selected = await selectExportFiles(ctx, facilities, filters, args.includeVersions);
    if (selected.length === 0)
      throw new Error("No uploaded documents match this selection — nothing to put in the ZIP");
    if (selected.length > MAX_FILES)
      throw new Error(
        `This selection has ${selected.length} files — narrow it down (a block or a document type) to stay under ${MAX_FILES}`,
      );

    const settings = await getSettings(ctx);
    const district = String(
      (settings as unknown as Record<string, unknown>).districtName ?? "District",
    );
    const scope =
      args.facilityId && facilities[0]
        ? facilities[0].name
        : filters.block
          ? `Block ${filters.block}`
          : "All Blocks";
    const baseName = exportBaseName({ district, scope, date: new Date() });
    const jobId = `exp-${Date.now().toString(36)}-${toBase64Url(randomBytes(4))}`;

    await ctx.db.insert("documentExports", {
      jobId,
      requestedBy: user._id as Id<"users">,
      requestedByName: user.name ?? user.email ?? "User",
      facilityId: args.facilityId,
      scopeLabel: scope,
      baseName,
      includeVersions: args.includeVersions,
      status: "queued",
      filesCount: selected.length,
      cursor: 0,
      partNo: 1,
      partStart: 0,
      partEnd: 0,
      partName: "",
      partSessionUri: "",
      partTotalSize: 0,
      partOffset: 0,
      partEntries: [],
      parts: [],
      partLimit: PART_LIMIT,
      retryCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    for (let i = 0; i < selected.length; i += 1) {
      const file = selected[i];
      await ctx.db.insert("documentExportFiles", {
        jobId,
        idx: i,
        documentId: file.documentId,
        driveFileId: file.driveFileId,
        facilityId: file.facilityId,
        facilityName: file.facilityName,
        block: file.block,
        nin: file.nin ?? undefined,
        docKey: file.docKey,
        docLabel: file.docLabel,
        cycleNo: file.cycleNo,
        originalName: file.originalName,
        displayName: file.displayName,
        size: file.size,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        uploadedByName: file.uploadedByName,
        versionNo: file.versionNo,
        isVersion: file.isVersion,
      });
    }

    await ctx.db.insert("auditLogs", {
      table: "documentExports",
      recordId: jobId,
      facilityId: args.facilityId,
      action: "create",
      field: "ZIP export",
      newValue: `${baseName} (${selected.length} file${selected.length === 1 ? "" : "s"})`,
      changedBy: user._id as Id<"users">,
      changedByName: user.name ?? user.email ?? "User",
      changedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.documentLibrary.runExport, { jobId });
    return { jobId, files: selected.length, baseName };
  },
});

/* ------------------------------------------------------------------ */
/* Internal state                                                     */
/* ------------------------------------------------------------------ */

export const exportJob = internalQuery({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) =>
    (await ctx.db
      .query("documentExports")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .first()) ?? null,
});

export const exportFileAt = internalQuery({
  args: { jobId: v.string(), idx: v.number() },
  handler: async (ctx, { jobId, idx }) =>
    (await ctx.db
      .query("documentExportFiles")
      .withIndex("by_job_idx", (q) => q.eq("jobId", jobId).eq("idx", idx))
      .first()) ?? null,
});

export const exportFileRange = internalQuery({
  args: { jobId: v.string(), start: v.number(), count: v.number() },
  handler: async (ctx, { jobId, start, count }) => {
    const out = [];
    for (let i = start; i < start + count; i += 1) {
      const row = await ctx.db
        .query("documentExportFiles")
        .withIndex("by_job_idx", (q) => q.eq("jobId", jobId).eq("idx", i))
        .first();
      if (!row) break;
      out.push(row);
    }
    return out;
  },
});

export const patchExport = internalMutation({
  args: {
    jobId: v.string(),
    status: v.string(),
    cursor: v.number(),
    partNo: v.number(),
    partStart: v.number(),
    partEnd: v.number(),
    partName: v.string(),
    partSessionUri: v.string(),
    partTotalSize: v.number(),
    partOffset: v.number(),
    partEntries: v.array(
      v.object({ name: v.string(), size: v.number(), crc: v.number(), offset: v.number() }),
    ),
    parts: v.array(v.object({ name: v.string(), driveFileId: v.string(), size: v.number() })),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("documentExports")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .first();
    if (!job) return;
    await ctx.db.patch(job._id, {
      status: args.status,
      cursor: args.cursor,
      partNo: args.partNo,
      partStart: args.partStart,
      partEnd: args.partEnd,
      partName: args.partName,
      partSessionUri: args.partSessionUri,
      partTotalSize: args.partTotalSize,
      partOffset: args.partOffset,
      partEntries: args.partEntries,
      parts: args.parts,
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const failExport = internalMutation({
  args: { jobId: v.string(), error: v.string() },
  handler: async (ctx, { jobId, error }) => {
    const job = await ctx.db
      .query("documentExports")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .first();
    if (!job) return;
    await ctx.db.patch(job._id, {
      status: "failed",
      error: error.slice(0, 300),
      updatedAt: Date.now(),
    });
  },
});

/** First failure → one automatic retry with 200 MB parts; second → fallback. */
export const retryExport = internalMutation({
  args: { jobId: v.string(), error: v.string() },
  handler: async (ctx, { jobId, error }): Promise<{ retried: boolean }> => {
    const job = await ctx.db
      .query("documentExports")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .first();
    if (!job) return { retried: false };
    if ((job.retryCount ?? 0) < 1) {
      await ctx.db.patch(job._id, {
        status: "queued",
        cursor: 0,
        partNo: 1,
        partStart: 0,
        partEnd: 0,
        partName: "",
        partSessionUri: "",
        partTotalSize: 0,
        partOffset: 0,
        partEntries: [],
        parts: [],
        partLimit: PART_LIMIT,
        retryCount: 1,
        error: `The first ZIP did not verify; rebuilding it with 200-file parts. ${error}`.slice(0, 300),
        updatedAt: Date.now(),
      });
      return { retried: true };
    }
    await ctx.db.patch(job._id, {
      status: "failed",
      error: error.slice(0, 300),
      updatedAt: Date.now(),
    });
    return { retried: false };
  },
});

export const failedExportFiles = query({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    const user = await requireActivatedUser(ctx);
    const job = await ctx.db
      .query("documentExports")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .first();
    if (!job || job.status !== "failed") return [];
    if (String(job.requestedBy) !== String(user._id) && !canEditAll(user)) return [];
    return (
      await ctx.db
        .query("documentExportFiles")
        .withIndex("by_job_idx", (q) => q.eq("jobId", jobId))
        .collect()
    ).map((file) => ({
      documentId: String(file.documentId),
      name: file.displayName || file.originalName,
      facility: file.facilityName,
      size: file.size,
    }));
  },
});

/* ------------------------------------------------------------------ */
/* Progress + links                                                   */
/* ------------------------------------------------------------------ */

/** Browser ZIP completed with some failures: Admin → Audit and logs gets one
 *  safe line (file names + short reasons only — never a URL, Drive id/token). */
export const logBrowserZipFailure = mutation({
  args: {
    total: v.number(),
    added: v.number(),
    failures: v.array(
      v.object({ name: v.string(), reason: v.string() }),
    ),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    const failed = Math.max(0, Math.round(args.failures.length));
    if (failed === 0) return;
    await ctx.db.insert("auditLogs", {
      table: "documentExports",
      recordId: "browser-zip",
      action: "update",
      field: `Document Library ZIP — ${failed} of ${Math.max(0, Math.round(args.total))} files failed`,
      oldValue: `${Math.max(0, Math.round(args.added))} files added`,
      newValue: args.failures
        .slice(0, 20)
        .map((f) => `${f.name.slice(0, 120)}: ${f.reason.slice(0, 100)}`)
        .join(" · "),
      changedBy: me._id,
      changedByName: me.name ?? me.email ?? "User",
      changedAt: Date.now(),
    });
  },
});

export const listExports = query({
  args: {
    facilityId: v.optional(v.id("facilities")),
    /** The library's own jobs (no facility) — never a profile ZIP. */
    libraryOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { facilityId, libraryOnly }) => {
    const user = await requireActivatedUser(ctx);
    const rows = await ctx.db
      .query("documentExports")
      .withIndex("by_requester", (q) => q.eq("requestedBy", user._id as Id<"users">))
      .order("desc")
      .take(12);
    return rows
      .filter((row) => !facilityId || String(row.facilityId) === String(facilityId))
      .filter((row) => !libraryOnly || !row.facilityId)
      .map((row) => ({
        jobId: row.jobId,
        baseName: row.baseName,
        scopeLabel: row.scopeLabel,
        status: row.status,
        filesCount: row.filesCount,
        cursor: row.cursor,
        partNo: row.partNo,
        partLimit: row.partLimit ?? null,
        includeVersions: row.includeVersions,
        parts: row.parts.map((p) => ({ name: p.name, size: p.size })),
        error: row.error ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
  },
});

export const getExportLink = action({
  args: { jobId: v.string(), part: v.number() },
  handler: async (ctx, { jobId, part }): Promise<{ url: string; name: string }> => {
    const user = await actionUser(ctx);
    if (!user) throw new Error("Sign in again — this action needs a signed-in account.");
    if (!user.appRole) throw new Error("Account is not activated for this app yet");
    const job = await ctx.runQuery(internal.documentLibrary.exportJob, { jobId });
    if (!job) throw new Error("This export no longer exists");
    if (job.status !== "done") throw new Error("This export is not ready yet");
    if (String(job.requestedBy) !== String(user._id) && !canEditAll(user as never))
      throw new Error("This export belongs to another user");
    const target = job.parts[part];
    if (!target) throw new Error("This part does not exist");
    // The HTTP handler's exact precedence (DOC_TOKEN_KEY, then the resolved
    // Drive/Admin key) — a different key would invalidate every download.
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process;
    const key =
      proc?.env?.DOC_TOKEN_KEY?.trim() ??
      (await ctx.runQuery(internal.drive.configForServer, {})).tokenKey;
    if (!key)
      throw new Error(
        "Download is not available yet: ask the administrator to save the Google Drive settings.",
      );
    const token = await signReadToken(
      {
        d: `export:${jobId}`,
        u: String(user._id),
        e: Date.now() + TOKEN_TTL_MS,
        m: "attachment",
      },
      key,
    );
    return {
      name: target.name,
      url: `/api/exports/content?job=${encodeURIComponent(jobId)}&part=${part}&token=${encodeURIComponent(token)}`,
    };
  },
});

/* ------------------------------------------------------------------ */
/* Streaming metadata + audit                                         */
/* ------------------------------------------------------------------ */

export const exportForStream = internalQuery({
  args: { jobId: v.string(), part: v.number(), userId: v.string() },
  handler: async (ctx, { jobId, part, userId }) => {
    const job = await ctx.db
      .query("documentExports")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .first();
    if (!job || job.status !== "done") return { ok: false as const, reason: "This export is not ready" };
    const target = job.parts[part];
    if (!target) return { ok: false as const, reason: "This part does not exist" };
    const user = await ctx.db.get(userId as Id<"users">);
    if (!user || !user.appRole) return { ok: false as const, reason: "Not signed in" };
    if (String(job.requestedBy) !== userId && !canEditAll(user)) {
      return { ok: false as const, reason: "This export belongs to another user" };
    }
    return {
      ok: true as const,
      driveFileId: target.driveFileId,
      name: target.name,
      size: target.size,
      baseName: job.baseName,
      facilityId: job.facilityId ?? null,
      requestedByName: job.requestedByName,
    };
  },
});

export const recordExportDownload = internalMutation({
  args: { jobId: v.string(), userId: v.string(), part: v.number() },
  handler: async (ctx, { jobId, userId, part }) => {
    const job = await ctx.db
      .query("documentExports")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .first();
    if (!job) return;
    const user = await ctx.db.get(userId as Id<"users">);
    await ctx.db.insert("auditLogs", {
      table: "documentExports",
      recordId: jobId,
      facilityId: job.facilityId,
      action: "view",
      field: "download",
      newValue: job.parts[part]?.name ?? job.baseName,
      changedBy: userId as Id<"users">,
      changedByName: user?.name ?? job.requestedByName,
      changedAt: Date.now(),
    });
  },
});

/* ------------------------------------------------------------------ */
/* 24-hour ZIP retention                                              */
/* ------------------------------------------------------------------ */

export const oldExportJobs = internalQuery({
  args: { before: v.number() },
  handler: async (ctx, { before }) => {
    const rows = await ctx.db.query("documentExports").collect();
    return rows
      .filter((row) => row.updatedAt < before && row.status === "done")
      .slice(0, 50)
      .map((row) => ({
        jobId: row.jobId,
        driveFileIds: row.parts.map((p) => p.driveFileId),
      }));
  },
});

export const deleteExportJob = internalMutation({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    const files = await ctx.db
      .query("documentExportFiles")
      .withIndex("by_job_idx", (q) => q.eq("jobId", jobId))
      .collect();
    for (const file of files) await ctx.db.delete(file._id);
    const job = await ctx.db
      .query("documentExports")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .first();
    if (job) await ctx.db.delete(job._id);
  },
});

/** Delete finished ZIP parts 24 hours after the job last changed. */
export const pruneExportZips = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const jobs = await ctx.runQuery(internal.documentLibrary.oldExportJobs, {
      before: Date.now() - 24 * 3600_000,
    });
    if (jobs.length === 0) return;
    try {
      const deps = await driveDeps(ctx);
      for (const job of jobs) {
        for (const id of job.driveFileIds) {
          try {
            await deps.store.delete(id, { permanent: true });
          } catch {
            // A missing file is already deleted; keep pruning the rest.
          }
        }
        await ctx.runMutation(internal.documentLibrary.deleteExportJob, { jobId: job.jobId });
      }
    } catch {
      // Drive unavailable — retry on the next run, keep the records.
    }
  },
});

/* ------------------------------------------------------------------ */
/* ZIP streaming                                                      */
/* ------------------------------------------------------------------ */

function readAll(stream: ReadableStream<Uint8Array> | null, cap = 60 * 1024 * 1024): Promise<Uint8Array> {
  if (!stream) return Promise.resolve(new Uint8Array());
  return (async () => {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.length;
      if (total > cap) throw new Error("A document is too large to add to the ZIP");
      chunks.push(value);
    }
    const out = new Uint8Array(total);
    let at = 0;
    for (const chunk of chunks) {
      out.set(chunk, at);
      at += chunk.length;
    }
    return out;
  })();
}

class PartUploader {
  private readonly sessionUri: string;
  private readonly total: number;
  private readonly parentId: string;
  offset = 0;
  /** Logical bytes handed to write(), advanced immediately even while the
   *  current chunk is still buffered. Central-directory offsets MUST use this,
   *  never `offset` (which only moves on flush). */
  position = 0;
  private buffer = new Uint8Array(UPLOAD_CHUNK);
  private used = 0;
  private lastBody: { id?: string } | null = null;

  constructor(sessionUri: string, total: number, parentId: string) {
    this.sessionUri = sessionUri;
    this.total = total;
    this.parentId = parentId;
  }

  async write(bytes: Uint8Array): Promise<void> {
    let at = 0;
    while (at < bytes.length) {
      const take = Math.min(this.buffer.length - this.used, bytes.length - at);
      this.buffer.set(bytes.subarray(at, at + take), this.used);
      this.used += take;
      this.position += take;
      at += take;
      if (this.used === this.buffer.length) await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.used === 0) return;
    const end = this.offset + this.used - 1;
    const final = end === this.total - 1;
    const body = this.buffer.slice(0, this.used);
    const res = await fetch(this.sessionUri, {
      method: "PUT",
      headers: {
        "Content-Type": "application/zip",
        "Content-Range": `bytes ${this.offset}-${end}/${this.total}`,
        "Content-Length": String(this.used),
      },
      body: body as unknown as BodyInit,
    });
    if (final) {
      if (res.status !== 200 && res.status !== 201)
        throw new Error(`Drive could not finish the ZIP (${res.status})`);
      try {
        this.lastBody = (await res.json()) as { id?: string };
      } catch {
        this.lastBody = null;
      }
    } else if (res.status !== 308 && res.status !== 200) {
      throw new Error(`Drive rejected a ZIP chunk (${res.status})`);
    }
    this.offset += this.used;
    this.used = 0;
    this.buffer = new Uint8Array(UPLOAD_CHUNK);
  }

  /** Persist buffered bytes now. Called between entries and before a resume
   *  point: without this, a paused job lost its trailing buffer and the ZIP
   *  central directory pointed at bytes that were never uploaded. */
  async checkpoint(): Promise<void> {
    await this.flush();
  }

  /** Flush the last bytes and return the stored Drive id (may be null). */
  async finish(): Promise<{ id: string | null; parentId: string }> {
    await this.flush();
    return { id: this.lastBody?.id ?? null, parentId: this.parentId };
  }
}

/** Build the deterministic, sanitized, duplicate-free entry names for a part. */
function partNames(rows: ExportFileLike[]): string[] {
  const used = new Set<string>();
  return rows.map((row) =>
    uniqueEntryName(
      zipDocumentPath({
        block: row.block,
        facility: row.facilityName,
        fileName: row.displayName ?? row.originalName,
      }),
      used,
    ),
  );
}

/** "Part 1 of 3" (or the plain base name when there is only one part). */
function exportPartName(baseName: string, partNo: number, totalParts: number): string {
  const base = (baseName || "documents.zip").replace(/\.zip$/i, "");
  const suffix = totalParts > 1 ? ` Part ${partNo} of ${totalParts}` : "";
  const room = Math.max(1, ZIP_NAME_MAX - suffix.length - 4);
  return `${base.slice(0, room).replace(/[. ]+$/g, "")}${suffix}.zip`;
}

type ExportFileLike = {
  driveFileId: string;
  block: string;
  facilityName: string;
  docLabel: string;
  cycleNo: number;
  originalName: string;
  displayName?: string;
  size: number;
  versionNo: number;
  isVersion?: boolean;
  uploadedAt: number;
  uploadedByName: string;
  nin?: string | null;
};

/**
 * One complete part per invocation: fetch every file in the part, build the
 * archive with fflate (standard DEFLATE, UTF-8 names), verify it, then upload
 * the finished bytes. A part is never sent while it is still being written.
 */
export const runExport = internalAction({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }): Promise<void> => {
    const job = await ctx.runQuery(internal.documentLibrary.exportJob, { jobId });
    if (!job || job.status === "done" || job.status === "failed") return;

    let deps: Awaited<ReturnType<typeof driveDeps>>;
    try {
      deps = await driveDeps(ctx);
      const root = rootFolderFor(deps);
      const exportFolder = await deps.folders.ensure(root, "_exports");

      const cursor = job.cursor;
      const partNo = job.partNo;
      const parts = (job.parts ?? []).map((p) => ({ ...p }));
      const totalParts = Math.max(1, Math.ceil(job.filesCount / PART_FILE_LIMIT));

      if (cursor >= job.filesCount) {
        await ctx.runMutation(internal.documentLibrary.patchExport, {
          jobId,
          status: "done",
          cursor,
          partNo,
          partStart: 0,
          partEnd: 0,
          partName: "",
          partSessionUri: "",
          partTotalSize: 0,
          partOffset: 0,
          partEntries: [],
          parts,
        });
        return;
      }

      const count = Math.min(PART_FILE_LIMIT, job.filesCount - cursor);
      const rows = (await ctx.runQuery(internal.documentLibrary.exportFileRange, {
        jobId,
        start: cursor,
        count,
      })) as ExportFileLike[];
      if (rows.length !== count) throw new Error("The export selection changed");

      const names = partNames(rows);
      const files: Record<string, Uint8Array> = {};
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const media = await deps.store.getStream(row.driveFileId);
        const bytes = await readAll(media.stream);
        if (bytes.length !== row.size)
          throw new Error(
            "A stored document changed while the ZIP was being built — start the export again",
          );
        files[names[i]] = bytes;
      }

      // Standard ZIP: DEFLATE entries + UTF-8 file-name flag on every header.
      const archive = forceUtf8Flags(zipSync(files, { level: 6 }));
      const checked = unzipSync(archive);
      const checkedNames = Object.keys(checked);
      if (
        checkedNames.length !== names.length ||
        names.some((name) => !(name in checked))
      ) {
        throw new Error("The ZIP failed its internal check — start the export again");
      }

      const partName = exportPartName(job.baseName, partNo, totalParts);
      const sessionUri = await deps.client.createResumableSession({
        parentId: exportFolder,
        name: partName,
        mimeType: "application/zip",
        size: archive.length,
        appProperties: { export_job: jobId, part: String(partNo) },
      });
      await ctx.runMutation(internal.documentLibrary.patchExport, {
        jobId,
        status: "running",
        cursor,
        partNo,
        partStart: cursor,
        partEnd: cursor + count,
        partName,
        partSessionUri: sessionUri,
        partTotalSize: archive.length,
        partOffset: 0,
        partEntries: [],
        parts,
      });

      // The archive is complete in memory. Upload the exact bytes, then finish.
      const uploader = new PartUploader(sessionUri, archive.length, exportFolder);
      await uploader.write(archive);
      const finished = await uploader.finish();
      let driveFileId = finished.id;
      if (!driveFileId) {
        const found = await deps.client.listFiles({ parentId: exportFolder, pageSize: 200 });
        driveFileId =
          found.files.find((f) => f.name === partName)?.id ??
          found.files.find((f) => f.appProperties?.export_job === jobId)?.id ??
          null;
      }
      if (!driveFileId) throw new Error("Drive did not return the finished ZIP");

      parts.push({ name: partName, driveFileId, size: archive.length });
      const nextCursor = cursor + count;
      const done = nextCursor >= job.filesCount;
      await ctx.runMutation(internal.documentLibrary.patchExport, {
        jobId,
        status: done ? "done" : "running",
        cursor: nextCursor,
        partNo: partNo + 1,
        partStart: 0,
        partEnd: 0,
        partName: "",
        partSessionUri: "",
        partTotalSize: 0,
        partOffset: 0,
        partEntries: [],
        parts,
      });
      if (!done) await ctx.scheduler.runAfter(0, internal.documentLibrary.runExport, { jobId });
    } catch (err) {
      const message = asFileStoreError(err).message.replace(/session[^,;]*/gi, "upload session");
      const outcome = await ctx.runMutation(internal.documentLibrary.retryExport, {
        jobId,
        error: message,
      });
      if (outcome.retried) {
        await ctx.scheduler.runAfter(0, internal.documentLibrary.runExport, { jobId });
      }
    }
  },
});
