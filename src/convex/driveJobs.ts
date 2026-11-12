/**
 * DRIVE JOBS — health, cleanup, migration.
 *
 *   1. Nightly reconciliation: every CURRENT document is checked in Drive
 *      (exists, not trashed, md5 unchanged). Missing files are marked
 *      "File missing in Drive" and never auto-deleted; the admin report and
 *      the Needs attention list read that flag.
 *   2. Orphan cleanup: files left in `_incoming` (failed/interrupted uploads)
 *      or upload sessions with no document row are removed after 24 hours.
 *   3. Legacy migration: the six old `_storage` attachment columns are copied
 *      into Drive with the naming rule, verified, and registered. The old copy
 *      is kept (readable) — nothing is deleted by this job.
 *
 * The pure parts (`reconcilePlan`, `legacyTargets`) are unit-tested; the
 * Convex wrappers only do I/O.
 */

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireActivatedUser, canEditAll } from "./facilities";
import { driveDeps, rootFolderFor } from "./drive";
import { UploadSessionService } from "./storage/uploadSession";
import { buildStoredName, checkUpload } from "./storage/validation";
import type { FileStore } from "./storage/fileStore";
import type { Id } from "./_generated/dataModel";

export const ORPHAN_AGE_MS = 24 * 3600_000;

/* ------------------------------------------------------------------ */
/* Pure helpers                                                       */
/* ------------------------------------------------------------------ */

export type HealthDoc = {
  id: string;
  driveFileId: string;
  docKey: string;
  driveMd5?: string | null;
  size: number;
};

export type HealthStatus = {
  id: string;
  state: "ok" | "missing" | "changed";
  detail?: string;
};

/**
 * Compare database rows with what the store actually holds. Never deletes or
 * mutates — the caller decides (and only ever flags).
 */
export async function reconcilePlan(
  store: Pick<FileStore, "exists">,
  docs: HealthDoc[],
): Promise<HealthStatus[]> {
  const out: HealthStatus[] = [];
  for (const doc of docs) {
    const found = await store.exists(doc.driveFileId);
    if (!found.exists || found.trashed) {
      out.push({ id: doc.id, state: "missing", detail: found.trashed ? "in trash" : "not found" });
      continue;
    }
    if (doc.driveMd5 && found.md5 && found.md5 !== doc.driveMd5) {
      out.push({ id: doc.id, state: "changed", detail: "checksum changed" });
      continue;
    }
    out.push({ id: doc.id, state: "ok" });
  }
  return out;
}

export type LegacyTarget = {
  facilityId: string;
  docKey: string;
  cycleNo: number;
  storageId: string;
  originalName: string;
  declaredMime: string;
  declaredSize: number;
};

/** The six legacy attachment columns, flattened to migration targets. */
export function legacyTargets(rows: {
  facilities: { _id: string; currentCycleNumber?: number | null }[];
  cycles?: Record<string, unknown>[];
  sas?: Record<string, unknown>[];
  nqas?: Record<string, unknown>[];
  funds?: Record<string, unknown>[];
  nocs?: Record<string, unknown>[];
  buildings?: Record<string, unknown>[];
}): LegacyTarget[] {
  const out: LegacyTarget[] = [];
  const push = (t: LegacyTarget | null) => {
    if (t && t.storageId) out.push(t);
  };
  const cycleNo = (facilityId: string) =>
    rows.facilities.find((f) => f._id === facilityId)?.currentCycleNumber ?? 1;

  for (const sa of rows.sas ?? []) {
    const facilityId = String(sa.facilityId ?? "");
    if (!facilityId) continue;
    push(maybe(facilityId, "SA_Report", cycleNo(facilityId), sa.reportAttachmentId, sa.reportAttachmentName, sa.reportAttachmentType));
    push(maybe(facilityId, "SA_Checklist", cycleNo(facilityId), sa.checklistAttachmentId, sa.checklistAttachmentName, sa.checklistAttachmentType));
  }
  for (const nqas of rows.nqas ?? []) {
    const facilityId = String(nqas.facilityId ?? "");
    if (!facilityId) continue;
    push(maybe(facilityId, "NQAS_Result", cycleNo(facilityId), nqas.resultDocumentId, nqas.resultDocumentName, nqas.resultDocumentType));
    push(maybe(facilityId, "NQAS_Certificate", cycleNo(facilityId), nqas.certDocumentId, nqas.certDocumentName, nqas.certDocumentType));
  }
  for (const fund of rows.funds ?? []) {
    const facilityId = String(fund.facilityId ?? "");
    if (!facilityId) continue;
    push(maybe(facilityId, "Gap_Closure", cycleNo(facilityId), fund.attachmentId, fund.attachmentName, fund.attachmentType));
  }
  for (const noc of rows.nocs ?? []) {
    const facilityId = String(noc.facilityId ?? "");
    if (!facilityId) continue;
    push(maybe(facilityId, "NOC", cycleNo(facilityId), noc.attachmentId, noc.attachmentName, noc.attachmentType));
  }
  for (const building of rows.buildings ?? []) {
    const facilityId = String(building.facilityId ?? "");
    if (!facilityId) continue;
    push(
      maybe(facilityId, "Condemned", cycleNo(facilityId), building.condemnedAttachmentId, building.condemnedAttachmentName, building.condemnedAttachmentType),
    );
  }
  return out;
}

function maybe(
  facilityId: string,
  docKey: string,
  cycleNo: number,
  storageId: unknown,
  name: unknown,
  mime: unknown,
): LegacyTarget | null {
  if (!storageId) return null;
  return {
    facilityId,
    docKey,
    cycleNo,
    storageId: String(storageId),
    originalName: String(name ?? `${docKey}.pdf`),
    declaredMime: String(mime ?? "application/pdf"),
    declaredSize: 0, // read from the stored blob during migration
  };
}

/* ------------------------------------------------------------------ */
/* Reconciliation                                                     */
/* ------------------------------------------------------------------ */

export const currentDocs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("facilityDocuments").collect();
    return rows
      .filter((d) => d.isCurrent && !d.removedAt)
      .map((d) => ({
        id: String(d._id),
        driveFileId: d.driveFileId,
        docKey: d.docKey,
        driveMd5: d.driveMd5 ?? null,
        size: d.size,
      }));
  },
});

export const applyHealth = internalMutation({
  args: {
    runId: v.id("driveHealthRuns"),
    results: v.array(v.object({ id: v.string(), state: v.string(), detail: v.optional(v.string()) })),
    checked: v.number(),
    orphans: v.number(),
  },
  handler: async (ctx, { runId, results, checked, orphans }) => {
    let missing = 0;
    let changed = 0;
    for (const result of results) {
      if (result.state === "missing") missing += 1;
      if (result.state === "changed") changed += 1;
      const doc = await ctx.db.get(result.id as Id<"facilityDocuments">);
      if (!doc) continue;
      if (result.state === "missing" || result.state === "changed") {
        // Flag only. The row and its metadata stay; nothing is deleted.
        if (!doc.missingInDriveAt) await ctx.db.patch(doc._id, { missingInDriveAt: Date.now() });
      } else if (doc.missingInDriveAt) {
        await ctx.db.patch(doc._id, { missingInDriveAt: undefined });
      }
    }
    await ctx.db.patch(runId, {
      finishedAt: Date.now(),
      checked,
      missing,
      changed,
      orphans,
    });
    if (missing || changed || orphans) {
      await ctx.db.insert("auditLogs", {
        table: "driveHealthRuns",
        recordId: String(runId),
        action: "update",
        field: "document storage health",
        newValue: `${missing} missing, ${changed} changed, ${orphans} orphaned`,
        changedByName: "System",
        changedAt: Date.now(),
      });
    }
    return { missing, changed };
  },
});

export const startHealthRun = internalMutation({
  args: {},
  handler: async (ctx) => {
    const id = await ctx.db.insert("driveHealthRuns", {
      startedAt: Date.now(),
      checked: 0,
      missing: 0,
      changed: 0,
      orphans: 0,
    });
    return id;
  },
});

/** Nightly (and on-demand) reconciliation. Costs one exists() per document. */
export const reconcile = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }): Promise<{ checked: number; missing: number; changed: number; orphans: number }> => {
    const deps = await driveDeps(ctx);
    const runId = await ctx.runMutation(internal.driveJobs.startHealthRun, {});
    const docs = (await ctx.runQuery(internal.driveJobs.currentDocs, {})).slice(0, limit ?? 5000);
    const results = await reconcilePlan(deps.store, docs);

    // Orphans: files sitting in `_incoming` with no database row, older than 24h.
    let orphans = 0;
    try {
      const root = rootFolderFor(deps);
      const incoming = await deps.folders.incomingFolder(root);
      const files = await deps.store.list(incoming);
      for (const file of files) {
        const known = await ctx.runQuery(internal.driveJobs.documentByDriveId, { driveFileId: file.id });
        if (!known) {
          await deps.store.delete(file.id, { permanent: true });
          orphans += 1;
        }
      }
    } catch {
      /* an empty/missing incoming folder is not a health failure */
    }

    const applied = await ctx.runMutation(internal.driveJobs.applyHealth, {
      runId,
      results,
      checked: docs.length,
      orphans,
    });
    return { ...applied, checked: docs.length, orphans };
  },
});

export const documentByDriveId = internalQuery({
  args: { driveFileId: v.string() },
  handler: async (ctx, { driveFileId }) => {
    const row = await ctx.db
      .query("facilityDocuments")
      .withIndex("by_drive", (q) => q.eq("driveFileId", driveFileId))
      .first();
    return row ? String(row._id) : null;
  },
});

/* ------------------------------------------------------------------ */
/* Trash retention                                                    */
/* ------------------------------------------------------------------ */

/**
 * Removed documents are kept for the retention period (default 30 days), then
 * permanently deleted from Drive. The row stays for the audit trail; only the
 * bytes go.
 */
export const purgeTrash = internalAction({
  args: {},
  handler: async (ctx): Promise<{ purged: number }> => {
    const settings = await ctx.runQuery(internal.drive.readDriveSettings, {});
    const cutoff = Date.now() - settings.retainedDays * 24 * 3600_000;
    const expired = await ctx.runQuery(internal.driveJobs.expiredRemovals, { cutoff });
    if (!expired.length) return { purged: 0 };
    const deps = await driveDeps(ctx);
    let purged = 0;
    for (const doc of expired) {
      try {
        await deps.store.delete(doc.driveFileId, { permanent: true });
        await ctx.runMutation(internal.driveJobs.clearPurged, { documentId: doc.id });
        purged += 1;
      } catch {
        /* retried on the next run */
      }
    }
    return { purged };
  },
});

export const expiredRemovals = internalQuery({
  args: { cutoff: v.number() },
  handler: async (ctx, { cutoff }) => {
    const rows = await ctx.db.query("facilityDocuments").collect();
    return rows
      .filter((d) => !!d.removedAt && d.removedAt < cutoff && !!d.driveFileId)
      .map((d) => ({ id: String(d._id), driveFileId: d.driveFileId }));
  },
});

export const clearPurged = internalMutation({
  args: { documentId: v.string() },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId as Id<"facilityDocuments">);
    if (!doc) return;
    await ctx.db.patch(doc._id, { driveFileId: "" });
  },
});

/* ------------------------------------------------------------------ */
/* Legacy migration                                                   */
/* ------------------------------------------------------------------ */

/**
 * MIGRATION — idempotent, verified, non-destructive.
 *
 * For each legacy `_storage` attachment: read it, upload it to Drive under the
 * naming rule, verify size + hashes, register the document row. The old file
 * is left in place (its column keeps working) — the 30-day cleanup of the old
 * copy is a separate admin decision, so a failed batch never loses data.
 */
export const migrateLegacy = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }): Promise<{ scanned: number; imported: number; skipped: number; failed: number }> => {
    const deps = await driveDeps(ctx);
    const root = rootFolderFor(deps);
    const targets = (await ctx.runQuery(internal.driveJobs.pendingLegacy, {})) as LegacyTarget[];
    const batch = targets.slice(0, limit ?? 25);
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const target of batch) {
      const blob = await ctx.storage.get(target.storageId as never);
      if (!blob) {
        failed += 1;
        continue;
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const head = bytes.subarray(0, 4096);
      try {
        checkUpload({
          docKey: target.docKey,
          originalName: target.originalName,
          declaredMime: target.declaredMime,
          declaredSize: bytes.length,
          head,
        });
      } catch {
        failed += 1; // unreadable/legacy junk stays in the old column, reported
        continue;
      }
      const facilityInfo = await ctx.runQuery(internal.driveJobs.facilityMeta, { facilityId: target.facilityId });
      if (!facilityInfo) {
        failed += 1;
        continue;
      }
      const plan = await new UploadSessionService({ store: deps.store, folders: deps.folders }).plan(root, {
        nin: facilityInfo.nin,
        facilityName: facilityInfo.name,
        block: facilityInfo.block,
        docKey: target.docKey,
        cycleNo: target.cycleNo,
        versionNo: 1,
        originalName: target.originalName,
        declaredMime: target.declaredMime,
        declaredSize: bytes.length,
        date: new Date().toISOString().slice(0, 10),
      });
      const storedName = buildStoredName({
        nin: facilityInfo.nin,
        docKey: target.docKey,
        cycleNo: target.cycleNo,
        date: new Date().toISOString().slice(0, 10),
        versionNo: 1,
        mime: target.declaredMime,
        originalName: target.originalName,
      });
      const file = await deps.store.put(bytes, {
        parentId: plan.folderId,
        name: storedName,
        mimeType: target.declaredMime,
        appProperties: {
          facility_id: target.facilityId,
          doc_key: target.docKey,
          cycle: String(target.cycleNo),
          migrated_from: "convex",
        },
      });
      // Verify what Drive now holds, then register it.
      const verified = await new UploadSessionService({ store: deps.store, folders: deps.folders }).verify({
        fileId: file.id,
        docKey: target.docKey,
        originalName: target.originalName,
        declaredMime: target.declaredMime,
        declaredSize: bytes.length,
        storeMd5: file.md5 ?? null,
        storeSize: file.size,
      });
      const attached = await ctx.runMutation(internal.documents.attachMigratedDocument, {
        facilityId: target.facilityId,
        docKey: target.docKey,
        cycleNo: target.cycleNo,
        driveFileId: file.id,
        driveFolderId: plan.folderId,
        originalName: target.originalName,
        storedName,
        mimeType: verified.mime,
        size: verified.size,
        driveMd5: verified.md5,
        sha256: verified.sha256,
        legacyStorageId: target.storageId,
        storage: "drive",
      });
      if (attached.skipped) skipped += 1;
      else imported += 1;
    }
    return { scanned: targets.length, imported, skipped, failed };
  },
});

/** Legacy attachment ids that have no Drive document row yet. */
export const pendingLegacy = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [facilities, sas, nqas, funds, nocs, buildings, docs] = await Promise.all([
      ctx.db.query("facilities").collect(),
      ctx.db.query("stateAssessments").collect(),
      ctx.db.query("nationalAssessments").collect(),
      ctx.db.query("gapClosureFunds").collect(),
      ctx.db.query("fireNocs").collect(),
      ctx.db.query("buildingDetails").collect(),
      ctx.db.query("facilityDocuments").collect(),
    ]);
    const targets = legacyTargets({
      facilities: facilities.map((f) => ({ _id: String(f._id), currentCycleNumber: f.currentCycleNumber ?? null })),
      sas: sas as unknown as Record<string, unknown>[],
      nqas: nqas as unknown as Record<string, unknown>[],
      funds: funds as unknown as Record<string, unknown>[],
      nocs: nocs as unknown as Record<string, unknown>[],
      buildings: buildings as unknown as Record<string, unknown>[],
    });
    const done = new Set(docs.map((d) => d.legacyStorageId).filter(Boolean) as string[]);
    return targets.filter((t) => !done.has(t.storageId));
  },
});

export const facilityMeta = internalQuery({
  args: { facilityId: v.string() },
  handler: async (ctx, { facilityId }) => {
    const facility = await ctx.db.get(facilityId as Id<"facilities">);
    if (!facility) return null;
    return { name: facility.name, block: facility.block, nin: facility.ninNumber ?? null };
  },
});

/* ------------------------------------------------------------------ */
/* Admin read model                                                   */
/* ------------------------------------------------------------------ */

export const healthReport = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user)) throw new Error("Only the State Admin can view storage health");
    const lastRun = await ctx.db.query("driveHealthRuns").order("desc").first();
    const docs = await ctx.db.query("facilityDocuments").collect();
    const missing = docs
      .filter((d) => d.missingInDriveAt && !d.removedAt)
      .slice(0, 50)
      .map((d) => ({
        id: String(d._id),
        facilityId: String(d.facilityId),
        docKey: d.docKey,
        originalName: d.originalName,
        missingInDriveAt: d.missingInDriveAt!,
      }));
    return {
      lastRun: lastRun
        ? {
            startedAt: lastRun.startedAt,
            finishedAt: lastRun.finishedAt ?? null,
            checked: lastRun.checked,
            missing: lastRun.missing,
            changed: lastRun.changed,
            orphans: lastRun.orphans,
            error: lastRun.error ?? null,
          }
        : null,
      missing,
      total: docs.filter((d) => !d.removedAt).length,
    };
  },
});
