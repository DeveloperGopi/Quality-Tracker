/** Preview + apply human document names. Drive files are never renamed. */

import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { canEditAll, requireActivatedUser } from "./facilities";
import { docType } from "./storage/validation";
import { documentDisplayName } from "./storage/displayName";

export type DocumentNameCandidate = {
  id: string;
  facilityId: string;
  facility: string;
  block: string;
  facilityType: string | null;
  cycleNumber: number | null;
  before: string;
  after: string;
  unknown: string | null;
};

async function adminFor(ctx: MutationCtx | QueryCtx) {
  const me = await requireActivatedUser(ctx);
  if (!canEditAll(me)) throw new ConvexError("State Admin only");
  return me;
}

export async function documentNameCandidates(
  ctx: QueryCtx | MutationCtx,
): Promise<DocumentNameCandidate[]> {
  const [docs, facilities] = await Promise.all([
    ctx.db.query("facilityDocuments").collect(),
    ctx.db.query("facilities").collect(),
  ]);
  const byId = new Map(facilities.map((f) => [String(f._id), f]));
  const nameTypeCount = new Map<string, number>();
  for (const f of facilities) {
    const key = `${f.name.trim().toLowerCase()}|${(f.facilityType ?? "").trim().toLowerCase()}`;
    nameTypeCount.set(key, (nameTypeCount.get(key) ?? 0) + 1);
  }
  const out: DocumentNameCandidate[] = [];
  for (const doc of docs) {
    if (doc.removedAt) continue;
    const facility = byId.get(String(doc.facilityId));
    if (!facility) continue;
    const type = docType(doc.docKey);
    const unknown = !type
      ? `Unknown document type: ${doc.docKey}`
      : !doc.cycleNo
        ? "Unknown cycle"
        : !facility.facilityType
          ? "Unknown facility type"
          : null;
    const key = `${facility.name.trim().toLowerCase()}|${(facility.facilityType ?? "").trim().toLowerCase()}`;
    const after = documentDisplayName({
      facilityName: facility.name,
      facilityType: facility.facilityType ?? "",
      phc: facility.phc,
      duplicateNameAndType: (nameTypeCount.get(key) ?? 0) > 1,
      docKey: doc.docKey,
      cycleNo: doc.cycleNo ?? 1,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      versionNo: doc.versionNo,
      isCurrent: doc.isCurrent,
    });
    const before = doc.displayName ?? doc.originalName;
    if (before === after && !unknown) continue;
    out.push({
      id: String(doc._id),
      facilityId: String(facility._id),
      facility: facility.name,
      block: facility.block,
      facilityType: facility.facilityType ?? null,
      cycleNumber: doc.cycleNo ?? null,
      before,
      after,
      unknown,
    });
  }
  return out.sort((a, b) => a.facility.localeCompare(b.facility) || a.after.localeCompare(b.after));
}

export const preview = query({
  args: {},
  handler: async (ctx): Promise<DocumentNameCandidate[]> => {
    await adminFor(ctx);
    return documentNameCandidates(ctx);
  },
});

export const apply = mutation({
  args: { ids: v.array(v.id("facilityDocuments")) },
  handler: async (ctx, args): Promise<{ updated: number; batchId: string }> => {
    const me = await adminFor(ctx);
    const wanted = new Set(args.ids.map(String));
    const rows = (await documentNameCandidates(ctx)).filter((c) => wanted.has(c.id));
    const batchId = `doc-names:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    let updated = 0;
    for (const row of rows) {
      const doc = await ctx.db.get(row.id as Id<"facilityDocuments">);
      if (!doc || doc.displayName === row.after) continue;
      await ctx.db.patch(doc._id, { displayName: row.after });
      await ctx.db.insert("auditLogs", {
        table: "facilityDocuments",
        recordId: String(doc._id),
        facilityId: doc.facilityId,
        action: "update",
        field: "Display name",
        oldValue: row.before,
        newValue: row.after,
        changedBy: me._id,
        changedByName: me.name ?? me.email ?? "State Admin",
        changedAt: Date.now(),
        source: "Document name migration",
        batchId,
      });
      updated += 1;
    }
    return { updated, batchId };
  },
});

/** Undo one confirmed display-name batch. Drive files are never touched. */
export const undo = mutation({
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
      if (log.table !== "facilityDocuments" || log.field !== "Display name") continue;
      const doc = await ctx.db.get(log.recordId as Id<"facilityDocuments">);
      if (!doc) {
        skipped += 1;
        continue;
      }
      if ((doc.displayName ?? doc.originalName) !== log.newValue) {
        skipped += 1;
        continue;
      }
      const before = String(log.oldValue ?? "");
      await ctx.db.patch(doc._id, {
        displayName: before && before !== "(empty)" ? before : undefined,
      });
      await ctx.db.insert("auditLogs", {
        table: "facilityDocuments",
        recordId: String(doc._id),
        facilityId: doc.facilityId,
        action: "update",
        field: "Display name",
        oldValue: log.newValue,
        newValue: before || "(empty)",
        changedBy: me._id,
        changedByName: me.name ?? me.email ?? "State Admin",
        changedAt: Date.now(),
        source: "Document name migration (undo)",
      });
      restored += 1;
    }
    return { restored, skipped };
  },
});
