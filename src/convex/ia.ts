/**
 * QUARTERLY INTERNAL ASSESSMENT (IA) IMPORT — the backend.
 *
 * Storage is `facilityIaQuarters` (one row per facility × FY × quarter, see
 * schema.ts). `applyIaBatch` upserts on (facilityId, fy, quarter) inside ONE
 * Convex transaction — a failure rolls the whole batch back. Undo restores the
 * before-images captured per row, skipping facilities edited since the import.
 * The legacy facilities.nqasIaQ1/Q2 + kayakalpIaQ1/Q2 columns stay untouched;
 * `backfillIaFromLegacy` copies them into the new table once.
 */

import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireActivatedUser, allowedBlockNames, getSettings, markFacilityChanged } from "./facilities";

/* ---- period helpers (server-side, India time) -------------------------- */

/** India has no DST: today's calendar date is UTC+5:30. */
function istToday(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Last day of a quarter, ISO (Apr–Mar fiscal year). */
function quarterEndIso(fy: string, q: number): string {
  const start = Number(fy.slice(0, 4));
  const ends: Record<number, [number, string]> = {
    1: [6, "30"],
    2: [9, "30"],
    3: [12, "31"],
    4: [3, "31"],
  };
  const [mo, d] = ends[q] ?? ends[1];
  const year = q === 4 ? start + 1 : start;
  return `${year}-${String(mo).padStart(2, "0")}-${d}`;
}

/** A quarter that has not finished yet is saved as Provisional. */
function isQuarterProvisional(fy: string, q: number, today: string): boolean {
  return quarterEndIso(fy, q) >= today;
}

/** The FY the LEGACY facilities.nqasIaQ1/Q2 columns are labelled with. */
const LEGACY_IA_FY = "2026-27";

/** Facility NIN length; mirrors lib/iaImport IA_NIN_LENGTH. */
const NIN_LENGTH = 10;

/** Roles allowed to run an IA import: State Admin and District Editor. */
export function canImportIa(me: { appRole?: string | null }): boolean {
  return me.appRole === "admin" || me.appRole === "entry";
}

/* -------------------------------------------------------------------------- */
/* Import context — what the wizard needs, one query                          */
/* -------------------------------------------------------------------------- */

const toIaFacility = (f: Doc<"facilities">) => ({
  id: String(f._id),
  name: f.name,
  block: f.block,
  phc: f.phc,
  facilityType: f.facilityType,
  // The NIN is the new import's master identifier. A blank NIN stays null —
  // never "" and never a made-up value.
  ninNumber: f.ninNumber ?? null,
  facilityKey: f.facilityKey ?? null,
});

export const getIaImportContext = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    if (!canImportIa(me)) throw new Error("You do not have IA import access");
    const allowed = await allowedBlockNames(ctx, me);
    const facilities = await ctx.db.query("facilities").collect();
    const visible = facilities.filter(
      (f) => allowed === null || allowed.has(f.block),
    );
    const aliases = await ctx.db.query("facilityAliases").collect();
    // Previous-quarter columns and duplicate detection compare the import
    // against the STORED quarter rows of the facilities this user can see.
    // (The old filter compared a facility id with block NAMES, so a District
    // Editor saw no history at all.)
    const visibleIds = new Set(visible.map((f) => String(f._id)));
    const quarters = await ctx.db.query("facilityIaQuarters").collect();
    const recent = quarters
      .filter((q) => visibleIds.has(String(q.facilityId)))
      .sort((a, b) => (a.fy + a.quarter).localeCompare(b.fy + b.quarter))
      .slice(-20000);
    // A NIN that exists in the master list but OUTSIDE this editor's blocks:
    // the row is grey "Outside your blocks", never a red "Unknown NIN" and
    // never a data leak (only the NIN string, no name or block).
    const outsideNin = allowed === null
      ? []
      : facilities
          .filter((f) => !allowed.has(f.block) && f.ninNumber)
          .map((f) => String(f.ninNumber))
          .slice(0, 20000);
    return {
      me: { appRole: me.appRole ?? null, name: me.name ?? me.email ?? "Import" },
      facilities: visible.map(toIaFacility),
      facilityCount: visible.length,
      outsideNin,
      // Only the aliases of facilities this user can see — an editor must
      // never learn (or match to) a facility in another block.
      aliases: aliases
        .filter((a) => visibleIds.has(String(a.facilityId)))
        .map((a) => ({
          portalNameNormalized: a.portalNameNormalized,
          facilityType: a.facilityType,
          facilityId: String(a.facilityId),
        })),
      recent: recent.map((q) => ({
        facilityId: String(q.facilityId),
        fy: q.fy,
        quarter: q.quarter,
        nqasIaScore: q.nqasIaScore ?? null,
        kayakalpIaScore: q.kayakalpIaScore ?? null,
        ecoFriendlyScore: q.ecoFriendlyScore ?? null,
        nqasRemark: q.nqasRemark ?? null,
        kayakalpRemark: q.kayakalpRemark ?? null,
        ecoRemark: q.ecoRemark ?? null,
        lockedAt: q.lockedAt ?? null,
        updatedAt: q.updatedAt,
      })),
    };
  },
});

/* -------------------------------------------------------------------------- */
/* Apply — one transactional batch                                            */
/* -------------------------------------------------------------------------- */

const scoreV = v.object({
  value: v.optional(v.union(v.number(), v.null())),
  remark: v.optional(v.union(v.string(), v.null())),
});

const iaDecision = v.object({
  rowNo: v.number(),
  facilityId: v.id("facilities"),
  fy: v.string(),
  quarter: v.number(),
  /** The NIN the file sent (digits) — cross-checked server-side. */
  nin: v.optional(v.union(v.string(), v.null())),
  /** True only when the user accepted an amber NIN cross-check. */
  confirmNin: v.optional(v.boolean()),
  nqas: v.optional(scoreV),
  kayakalp: v.optional(scoreV),
  eco: v.optional(scoreV),
  key: v.optional(v.string()),
  matchMethod: v.optional(v.string()),
  confidence: v.optional(v.number()),
  facilityName: v.optional(v.string()),
  facilityBlock: v.optional(v.string()),
  facilityPhc: v.optional(v.string()),
  notes: v.optional(v.string()),
  raw: v.optional(v.any()),
  cleaned: v.optional(v.any()),
});

export const applyIaBatch = mutation({
  args: {
    fileName: v.string(),
    /** "update" (default) | "fillBlanks" | "addNewOnly" — preview ③ radio. */
    mode: v.optional(v.union(v.literal("update"), v.literal("fillBlanks"), v.literal("addNewOnly"))),
    /** Blank score cells clear the stored value (default OFF). */
    blankClears: v.optional(v.boolean()),
    /** Mandatory when one of the rows targets a LOCKED quarter (State Admin). */
    overrideReason: v.optional(v.string()),
    decisions: v.array(iaDecision),
  },
  handler: async (ctx, { fileName, mode = "update", blankClears = false, overrideReason, decisions }) => {
    const me = await requireActivatedUser(ctx);
    if (!canImportIa(me)) throw new Error("You do not have IA import access");
    const meId = me._id as Id<"users">;
    const byName = me.name ?? me.email ?? "Import";
    const now = Date.now();
    const allowed = await allowedBlockNames(ctx, me);
    const admin = me.appRole === "admin";

    // One DB operation set per batch — Convex mutations are transactional,
    // so any throw below rolls everything back.
    const batchId = await ctx.db.insert("importBatches", {
      kind: "ia",
      fileName,
      status: "applying",
      rowsTotal: decisions.length,
      rowsUpdated: 0,
      rowsNoChange: 0,
      rowsSkipped: 0,
      rowsFailed: 0,
      importedBy: meId,
      importedByName: byName,
      importedAt: now,
    });

    let updated = 0;
    let noChange = 0;
    let skipped = 0;
    let failed = 0;

    for (const d of decisions) {
      const facility = await ctx.db.get(d.facilityId);
      if (!facility || (allowed !== null && !allowed.has(facility.block))) {
        failed += 1;
        await ctx.db.insert("importRows", {
          batchId,
          rowNo: d.rowNo,
          facilityId: d.facilityId,
          facilityName: d.facilityName ?? facility?.name,
          facilityBlock: d.facilityBlock ?? facility?.block ?? "",
          facilityPhc: d.facilityPhc ?? facility?.phc ?? "",
          notes: d.notes,
          matchMethod: d.matchMethod ?? "manual",
          confidence: d.confidence ?? 0,
          decision: "include",
          result: "failed",
          error: !facility ? "Facility no longer exists" : "Facility is outside your block access",
          raw: d.raw,
          cleaned: d.cleaned,
        });
        continue;
      }
      // The NIN is the master identifier: when the file sent one, it must
      // still point at THIS facility on the server. A stale preview (the NIN
      // was corrected meanwhile) can never write to the wrong facility.
      // Both sides are padded the same way the importer pads an Excel number
      // (lib/iaImport IA_NIN_LENGTH — keep the two in step).
      const normNin = (value: string): string => {
        const digits = value.replace(/\D/g, "");
        return digits.length > 0 && digits.length < NIN_LENGTH
          ? digits.padStart(NIN_LENGTH, "0")
          : digits;
      };
      const fileNin = d.nin ? normNin(String(d.nin)) : "";
      const masterNin = normNin(String(facility.ninNumber ?? ""));
      if (fileNin && masterNin && fileNin !== masterNin && !d.confirmNin) {
        failed += 1;
        await ctx.db.insert("importRows", {
          batchId, rowNo: d.rowNo, facilityId: d.facilityId,
          facilityName: d.facilityName ?? facility.name,
          facilityBlock: d.facilityBlock ?? facility.block,
          facilityPhc: d.facilityPhc ?? facility.phc,
          notes: d.notes, matchMethod: d.matchMethod ?? "nin",
          confidence: d.confidence ?? 0, decision: "include", result: "failed",
          error: `NIN ${fileNin} does not belong to this facility (${masterNin}) — reopen the preview and confirm the match`,
          raw: d.raw, cleaned: d.cleaned,
        });
        continue;
      }

      const fy = d.fy.trim();
      const quarter = Math.floor(d.quarter);
      if (!fy || quarter < 1 || quarter > 4) {
        failed += 1;
        await ctx.db.insert("importRows", {
          batchId, rowNo: d.rowNo, facilityId: d.facilityId,
          facilityName: d.facilityName ?? facility.name,
          facilityBlock: d.facilityBlock ?? facility.block,
          facilityPhc: d.facilityPhc ?? facility.phc,
          notes: d.notes, matchMethod: d.matchMethod ?? "manual",
          confidence: d.confidence ?? 0, decision: "include", result: "failed",
          error: `Unrecognised period ${fy || "?"} Q${quarter}`,
          raw: d.raw, cleaned: d.cleaned,
        });
        continue;
      }

      // Existing quarter row → upsert semantics.
      const existing = await ctx.db
        .query("facilityIaQuarters")
        .withIndex("by_facility_period", (q) =>
          q.eq("facilityId", d.facilityId).eq("fy", fy).eq("quarter", quarter),
        )
        .first();

      if (existing?.lockedAt) {
        // Locked quarter: only a State Admin with a real reason gets through.
        if (!admin || !overrideReason || !overrideReason.trim()) {
          failed += 1;
          await ctx.db.insert("importRows", {
            batchId, rowNo: d.rowNo, facilityId: d.facilityId,
            facilityName: d.facilityName ?? facility.name,
            facilityBlock: d.facilityBlock ?? facility.block,
            facilityPhc: d.facilityPhc ?? facility.phc,
            notes: d.notes, matchMethod: d.matchMethod ?? "manual",
            confidence: d.confidence ?? 0, decision: "include", result: "failed",
            error: "Quarter is locked — a State Admin override with a reason is required",
            raw: d.raw, cleaned: d.cleaned,
          });
          continue;
        }
      }
      if (mode !== "update" && existing && mode === "addNewOnly") {
        skipped += 1;
        await ctx.db.insert("importRows", {
          batchId, rowNo: d.rowNo, facilityId: d.facilityId,
          facilityName: d.facilityName ?? facility.name,
          facilityBlock: d.facilityBlock ?? facility.block,
          facilityPhc: d.facilityPhc ?? facility.phc,
          notes: d.notes, matchMethod: d.matchMethod ?? "manual",
          confidence: d.confidence ?? 0, decision: "include", result: "skipped",
          raw: d.raw, cleaned: d.cleaned,
        });
        continue;
      }

      // ---------- per-tracker merge ----------
      // "Fill blanks only" never touches a stored value (even to correct it).
      // Blank + no remark clears the value ONLY when blankClears; a remark
      // ("New facility…") is always a real write because it is not blank.
      const apply = (
        tracker: "nqas" | "kayakalp" | "eco",
        next: { value?: number | null; remark?: string | null } | undefined,
      ): { changed: boolean; before: number | string | null; after: number | string | null; field: string } | null => {
        if (!next) return null;
        const oldRow = existing;
        const oldVal =
          tracker === "nqas"
            ? (oldRow?.nqasIaScore ?? null)
            : tracker === "kayakalp"
              ? (oldRow?.kayakalpIaScore ?? null)
              : (oldRow?.ecoFriendlyScore ?? null);
        const oldRemark =
          tracker === "nqas"
            ? (oldRow?.nqasRemark ?? null)
            : tracker === "kayakalp"
              ? (oldRow?.kayakalpRemark ?? null)
              : (oldRow?.ecoRemark ?? null);
        const newVal = next.value ?? null;
        const newRemark = next.remark ?? null;
        if (mode === "fillBlanks" && oldVal != null) return null; // never overwrite
        const blankWrite = newVal == null && newRemark == null;
        if (blankWrite && !blankClears) return null; // blank never erases
        const valChanged = (oldVal ?? null) !== newVal;
        const remarkChanged = (oldRemark ?? null) !== (newRemark ?? null);
        if (!valChanged && !remarkChanged) return null;
        return {
          changed: true,
          before: oldRemark && oldVal == null ? oldRemark : oldVal,
          after: newRemark && newVal == null ? newRemark : newVal,
          field:
            tracker === "nqas" ? "NQAS IA" : tracker === "kayakalp" ? "Kayakalp IA" : "Legacy IA",
        };
      };

      const changes = [
        apply("nqas", d.nqas),
        apply("kayakalp", d.kayakalp),
        apply("eco", d.eco),
      ].filter((c): c is NonNullable<typeof c> => c != null);

      if (changes.length === 0) {
        noChange += 1;
        await ctx.db.insert("importRows", {
          batchId, rowNo: d.rowNo, facilityId: d.facilityId,
          facilityName: d.facilityName ?? facility.name,
          facilityBlock: d.facilityBlock ?? facility.block,
          facilityPhc: d.facilityPhc ?? facility.phc,
          notes: d.notes, matchMethod: d.matchMethod ?? "manual",
          confidence: d.confidence ?? 0, decision: "include", result: "no_change",
          raw: d.raw, cleaned: d.cleaned,
          oldValue: existing ? snapshot(existing) : null,
          newValue: existing ? snapshot(existing) : null,
        });
        continue;
      }

      // Part 2 ④: data written before the quarter ended is PROVISIONAL until
      // a State Admin marks it final; a later re-upload of an ended quarter
      // clears the flag.
      const provisional = isQuarterProvisional(fy, quarter, istToday());
      const patch: Record<string, unknown> = {
        updatedAt: now,
        updatedBy: meId,
        updatedByName: byName,
        sourceBatchId: batchId,
        provisional: provisional ? true : undefined,
      };
      if (d.nqas) {
        patch.nqasIaScore = d.nqas.value ?? undefined;
        if (d.nqas.remark != null) patch.nqasRemark = d.nqas.remark;
      }
      if (d.kayakalp) {
        patch.kayakalpIaScore = d.kayakalp.value ?? undefined;
        if (d.kayakalp.remark != null) patch.kayakalpRemark = d.kayakalp.remark;
      }
      if (d.eco) {
        patch.ecoFriendlyScore = d.eco.value ?? undefined;
        if (d.eco.remark != null) patch.ecoRemark = d.eco.remark;
      }
      if (existing?.lockedAt && overrideReason?.trim()) {
        // Un-locked by this override — audited below.
        patch.lockedAt = undefined;
        patch.lockedBy = undefined;
      }
      // Part C ③: a text score such as "New PHC", "NA" or "Not assessed"
      // marks the facility NOT APPLICABLE for that quarter (it leaves the
      // denominator); the raw words are kept as the reason.
      const remarks = [d.nqas?.remark, d.kayakalp?.remark].filter(Boolean).join(" · ");
      const noScore = !d.nqas?.value && !d.kayakalp?.value;
      if (noScore && /new\s*phc|^\s*n\/?a\s*$|not\s*assessed|nil/i.test(remarks)) {
        patch.notApplicable = true;
        patch.notApplicableReason = remarks;
        patch.notApplicableBy = meId;
        patch.notApplicableAt = now;
      }
      const before = existing ? snapshot(existing) : null;
      if (existing) {
        await ctx.db.patch(existing._id, patch);
      } else {
        await ctx.db.insert("facilityIaQuarters", {
          facilityId: d.facilityId,
          fy,
          quarter,
          provisional: provisional ? true : undefined,
          nqasIaScore: d.nqas?.value ?? undefined,
          kayakalpIaScore: d.kayakalp?.value ?? undefined,
          ecoFriendlyScore: d.eco?.value ?? undefined,
          nqasRemark: d.nqas?.remark ?? undefined,
          kayakalpRemark: d.kayakalp?.remark ?? undefined,
          ecoRemark: d.eco?.remark ?? undefined,
          notApplicable: patch.notApplicable as boolean | undefined,
          notApplicableReason: patch.notApplicableReason as string | undefined,
          notApplicableBy: patch.notApplicableBy as Id<"users"> | undefined,
          notApplicableAt: patch.notApplicableAt as number | undefined,
          sourceBatchId: batchId,
          updatedBy: meId,
          updatedByName: byName,
          updatedAt: now,
        });
      }
      const after = await ctx.db
        .query("facilityIaQuarters")
        .withIndex("by_facility_period", (q) =>
          q.eq("facilityId", d.facilityId).eq("fy", fy).eq("quarter", quarter),
        )
        .first();

      // One audit entry per changed field, tagged with the batch (Undo reads
      // these too, via importRows.oldValue). The field label carries the
      // period ("NQAS IA (IA 2026-27 Q2)") so the read-time "Recently
      // updated" map (imports.getRecentUpdates) can mark exactly the
      // displayed quarter's columns.
      for (const c of changes) {
        await ctx.db.insert("auditLogs", {
          table: "facilities",
          recordId: String(d.facilityId),
          facilityId: d.facilityId,
          action: "update",
          field: `${c.field} (IA ${fy} Q${quarter})`,
          oldValue: c.before,
          newValue: c.after,
          changedBy: meId,
          changedByName: byName,
          changedAt: now,
          source: "Quarterly IA import",
          fileName,
          batchId: String(batchId),
        });
      }

      // Part 2 — the Master List "Updated" filter reads this stamp; it is
      // written in the same transaction as the IA row and its audit entries.
      await markFacilityChanged(ctx, d.facilityId, {
        at: now,
        userName: byName,
        source: "Quarterly IA import",
        batchId: String(batchId),
        key: `NQAS IA (IA ${fy} Q${quarter})`,
      });

      updated += 1;
      await ctx.db.insert("importRows", {
        batchId, rowNo: d.rowNo, facilityId: d.facilityId,
        facilityName: d.facilityName ?? facility.name,
        facilityBlock: d.facilityBlock ?? facility.block,
        facilityPhc: d.facilityPhc ?? facility.phc,
        notes: d.notes, matchMethod: d.matchMethod ?? "manual",
        confidence: d.confidence ?? 0, decision: "include", result: "updated",
        raw: d.raw, cleaned: d.cleaned,
        oldValue: before,
        newValue: after ? snapshot(after) : null,
      });
    }

    await ctx.db.patch(batchId, {
      status: "applied",
      rowsUpdated: updated,
      rowsNoChange: noChange,
      rowsSkipped: skipped,
      rowsFailed: failed,
    });
    return { batchId: String(batchId), updated, noChange, skipped, failed };
  },
});

/** The before-image an Undo restores. */
function snapshot(q: Doc<"facilityIaQuarters">) {
  return {
    fy: q.fy,
    quarter: q.quarter,
    nqasIaScore: q.nqasIaScore ?? null,
    kayakalpIaScore: q.kayakalpIaScore ?? null,
    ecoFriendlyScore: q.ecoFriendlyScore ?? null,
    nqasRemark: q.nqasRemark ?? null,
    kayakalpRemark: q.kayakalpRemark ?? null,
    ecoRemark: q.ecoRemark ?? null,
    updatedAt: q.updatedAt,
    lockedAt: q.lockedAt ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Undo                                                                       */
/* -------------------------------------------------------------------------- */

export const undoIaBatch = mutation({
  args: { batchId: v.id("importBatches") },
  handler: async (ctx, { batchId }) => {
    const me = await requireActivatedUser(ctx);
    if (!canImportIa(me)) throw new Error("You do not have IA import access");
    const batch = await ctx.db.get(batchId);
    if (!batch) throw new Error("Import batch not found");
    if (batch.status === "undone") throw new Error("This import has already been undone");
    const rows = await ctx.db
      .query("importRows")
      .withIndex("by_batch", (q) => q.eq("batchId", batchId))
      .collect();
    const byName = me.name ?? me.email ?? "Import";
    const now = Date.now();
    let restored = 0;
    const conflicts: { rowNo: number; facilityId: string; reason: string }[] = [];

    for (const row of rows) {
      if (row.result !== "updated" || !row.facilityId) continue;
      const old = row.oldValue as {
        fy: string;
        quarter: number;
        nqasIaScore?: number | null;
        kayakalpIaScore?: number | null;
        ecoFriendlyScore?: number | null;
        nqasRemark?: string | null;
        kayakalpRemark?: string | null;
        ecoRemark?: string | null;
        updatedAt?: number;
        lockedAt?: number | null;
      } | null;
      const current = await ctx.db
        .query("facilityIaQuarters")
        .withIndex("by_facility_period", (q) =>
          q.eq("facilityId", row.facilityId!).eq("fy", old?.fy ?? "?").eq("quarter", old?.quarter ?? -1),
        )
        .first();
      // Edited since the import? Compare against the stamp the import WROTE
      // (newValue.updatedAt), not the pre-import stamp in oldValue — the old
      // comparison conflicted on every row the import itself had touched.
      const importedStamp = (row.newValue as { updatedAt?: number } | null)?.updatedAt;
      if (current && importedStamp !== undefined && current.updatedAt !== importedStamp) {
        conflicts.push({ rowNo: row.rowNo, facilityId: String(row.facilityId), reason: "Edited after the import" });
        continue;
      }
      if (old == null) {
        // The import CREATED the row — undo deletes it.
        if (current) {
          await ctx.db.delete(current._id);
          restored += 1;
        }
      } else if (current) {
        await ctx.db.patch(current._id, {
          nqasIaScore: old.nqasIaScore ?? undefined,
          kayakalpIaScore: old.kayakalpIaScore ?? undefined,
          ecoFriendlyScore: old.ecoFriendlyScore ?? undefined,
          nqasRemark: old.nqasRemark ?? undefined,
          kayakalpRemark: old.kayakalpRemark ?? undefined,
          ecoRemark: old.ecoRemark ?? undefined,
          lockedAt: old.lockedAt ?? undefined,
          updatedAt: now,
          updatedBy: me._id as Id<"users">,
          updatedByName: byName,
        });
        restored += 1;
      } else {
        conflicts.push({ rowNo: row.rowNo, facilityId: String(row.facilityId), reason: "Removed after the import" });
        continue;
      }

      // Per-field undo entries carrying the SAME tracked labels as the
      // import writes (with the period), sourced "Undo import" — the
      // read-time "Recently updated" map then drops the markers.
      if (old) {
        const restored: { field: string; before: unknown; after: unknown }[] = [];
        const imported = (row.newValue ?? {}) as Record<string, unknown>;
        const pairs: [string, string, string][] = [
          ["NQAS IA", "nqasIaScore", "nqasRemark"],
          ["Kayakalp IA", "kayakalpIaScore", "kayakalpRemark"],
          // Stored legacy values still undo, but under a neutral label so the
          // retired name never appears in an audit line again.
          ["Legacy IA", "ecoFriendlyScore", "ecoRemark"],
        ];
        for (const [label, scoreKey, remarkKey] of pairs) {
          const beforeVal = imported[scoreKey] ?? imported[remarkKey] ?? null;
          const afterVal = old[scoreKey as keyof typeof old] ?? old[remarkKey as keyof typeof old] ?? null;
          if (String(beforeVal ?? "") !== String(afterVal ?? "")) {
            restored.push({ field: `${label} (IA ${old.fy} Q${old.quarter})`, before: beforeVal, after: afterVal });
          }
        }
        for (const f of restored) {
          await ctx.db.insert("auditLogs", {
            table: "facilities",
            recordId: String(row.facilityId),
            facilityId: row.facilityId,
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
      }
      // The audit timeline keeps ONE undo summary entry per row.
      await ctx.db.insert("auditLogs", {
        table: "facilities",
        recordId: String(row.facilityId),
        facilityId: row.facilityId,
        action: "update",
        field: "Quarterly IA import (undo)",
        oldValue: row.newValue ?? null,
        newValue: old ?? null,
        changedBy: me._id as Id<"users">,
        changedByName: byName,
        changedAt: now,
        source: "Undo import",
        fileName: batch.fileName,
        batchId: String(batchId),
      });
      await ctx.db.patch(row._id, { result: "undone" });
    }

    await ctx.db.patch(batchId, {
      status: "undone",
      undoneAt: now,
      undoneBy: me._id as Id<"users">,
    });
    return { restored, conflicts, importedAtSkipped: batch.importedAt };
  },
});

/* -------------------------------------------------------------------------- */
/* Lock / unlock a verified quarter (State Admin, audited)                    */
/* -------------------------------------------------------------------------- */

/** PART 2 ④ — "Mark Q3 final": an ended quarter imported early stops being
 *  provisional. Optionally lock the rows in the same action. State Admin only. */
export const markIaQuarterFinal = mutation({
  args: {
    fy: v.string(),
    quarter: v.number(),
    lock: v.optional(v.boolean()),
  },
  handler: async (ctx, { fy, quarter, lock }) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin") throw new Error("Only a State Admin can mark a quarter final");
    const end = quarterEndIso(fy, Math.floor(quarter));
    if (end >= istToday()) {
      throw new Error("This quarter has not ended yet — it stays provisional");
    }
    const rows = await ctx.db
      .query("facilityIaQuarters")
      .withIndex("by_period", (q) => q.eq("fy", fy).eq("quarter", Math.floor(quarter)))
      .collect();
    const now = Date.now();
    for (const row of rows) {
      await ctx.db.patch(row._id, {
        provisional: undefined,
        ...(lock ? { lockedAt: now, lockedBy: me._id as Id<"users"> } : {}),
      });
    }
    await ctx.db.insert("auditLogs", {
      table: "facilities",
      recordId: "",
      action: "update",
      field: `IA quarter ${fy} Q${quarter} marked final${lock ? " and locked" : ""}`,
      oldValue: true,
      newValue: false,
      changedBy: me._id as Id<"users">,
      changedByName: me.name ?? me.email ?? "Admin",
      changedAt: now,
      source: "Quarterly IA import",
    });
    return { rows: rows.length };
  },
});

export const lockIaQuarter = mutation({
  args: { fy: v.string(), quarter: v.number(), locked: v.boolean(), reason: v.optional(v.string()) },
  handler: async (ctx, { fy, quarter, locked, reason }) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin") throw new Error("Only a State Admin can lock a quarter");
    const rows = await ctx.db
      .query("facilityIaQuarters")
      .withIndex("by_period", (q) => q.eq("fy", fy).eq("quarter", quarter))
      .collect();
    const now = Date.now();
    for (const row of rows) {
      await ctx.db.patch(row._id, {
        lockedAt: locked ? now : undefined,
        lockedBy: locked ? (me._id as Id<"users">) : undefined,
      });
    }
    await ctx.db.insert("auditLogs", {
      table: "facilities",
      recordId: "",
      action: locked ? "update" : "delete",
      field: `IA quarter ${fy} Q${quarter} ${locked ? "lock" : "unlock"}${reason ? ` — ${reason}` : ""}`,
      oldValue: !locked,
      newValue: locked,
      changedBy: me._id as Id<"users">,
      changedByName: me.name ?? me.email ?? "Admin",
      changedAt: now,
      source: "Quarterly IA import",
    });
    return { lockedRows: rows.length };
  },
});

/* -------------------------------------------------------------------------- */
/* Legacy backfill — facilities.nqasIaQ1/Q2, kayakalpIaQ1/Q2 → quarter rows    */
/* -------------------------------------------------------------------------- */

/**
 * Copy the legacy facilities.nqasIaQ1/Q2 columns into facilityIaQuarters as
 * REAL 2026-27 Q1/Q2 rows. Idempotent (a stored row always wins, nothing is
 * deleted) and audited. Until this runs, the IA display merges the legacy
 * values in read-only — the label bug is fixed either way, but the quarterly
 * store is the one place the IA panel/report read from.
 *
 * Shared by the admin mutation and the CLI-only internal wrapper so the
 * deployment can be migrated without signing in.
 */
async function runLegacyIaBackfill(
  ctx: MutationCtx,
  actor: { id: Id<"users"> | null; name: string },
) {
    const facilities = await ctx.db.query("facilities").collect();
    const existing = await ctx.db
      .query("facilityIaQuarters")
      .withIndex("by_period", (q) => q.eq("fy", "2026-27").eq("quarter", 1))
      .collect();
    const existingQ2 = await ctx.db
      .query("facilityIaQuarters")
      .withIndex("by_period", (q) => q.eq("fy", "2026-27").eq("quarter", 2))
      .collect();
    // One row per facility × quarter is enough — never duplicate a backfill.
    const done = new Set<string>(
      [...existing, ...existingQ2].map((e) => `${String(e.facilityId)}|Q${e.quarter}`),
    );
    const now = Date.now();
    let created = 0;
    const report: { facilityId: string; name: string; quarter: number; nqas: number | null; kayakalp: number | null }[] = [];
    for (const f of facilities) {
      if (f.nqasIaQ1 == null && f.kayakalpIaQ1 == null && f.nqasIaQ2 == null && f.kayakalpIaQ2 == null) continue;
      const writes: { quarter: 1 | 2; nqas?: number; kayakalp?: number }[] = [];
      if ((f.nqasIaQ1 != null || f.kayakalpIaQ1 != null) && !done.has(`${String(f._id)}|Q1`))
        writes.push({ quarter: 1, nqas: f.nqasIaQ1 ?? undefined, kayakalp: f.kayakalpIaQ1 ?? undefined });
      if ((f.nqasIaQ2 != null || f.kayakalpIaQ2 != null) && !done.has(`${String(f._id)}|Q2`))
        writes.push({ quarter: 2, nqas: f.nqasIaQ2 ?? undefined, kayakalp: f.kayakalpIaQ2 ?? undefined });
      for (const w of writes) {
        await ctx.db.insert("facilityIaQuarters", {
          facilityId: f._id,
          fy: "2026-27",
          quarter: w.quarter,
          nqasIaScore: w.nqas,
          kayakalpIaScore: w.kayakalp,
          updatedByName: "Legacy backfill",
          updatedBy: actor.id ?? undefined,
          updatedAt: now,
        });
        created += 1;
        report.push({
          facilityId: String(f._id),
          name: f.name,
          quarter: w.quarter,
          nqas: w.nqas ?? null,
          kayakalp: w.kayakalp ?? null,
        });
      }
    }
    if (created > 0) {
      await ctx.db.insert("auditLogs", {
        table: "facilityIaQuarters",
        recordId: "",
        action: "create",
        field: `Legacy IA backfill — ${created} quarter row(s) from facilities.nqasIaQ1/Q2`,
        oldValue: null,
        newValue: { created, fy: LEGACY_IA_FY, report },
        changedBy: actor.id ?? undefined,
        changedByName: actor.name,
        changedAt: now,
        source: "IA quarter migration",
      });
    }
    return { created, fy: LEGACY_IA_FY, rows: report };
}

export const backfillIaFromLegacy = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin") throw new Error("Only a State Admin can run the backfill");
    return runLegacyIaBackfill(ctx, {
      id: me._id as Id<"users">,
      name: me.name ?? me.email ?? "State Admin",
    });
  },
});

/** Deployment-side wrapper for the SAME migration (no user session needed).
 *  Run once with `bunx convex run ia:backfillIaFromLegacyInternal`. */
export const backfillIaFromLegacyInternal = internalMutation({
  args: {},
  handler: async (ctx) =>
    runLegacyIaBackfill(ctx, { id: null, name: "Deployment migration" }),
});

/* -------------------------------------------------------------------------- */
/* Reads — master list / profile / dashboard / reminder                       */
/* -------------------------------------------------------------------------- */

/** Recent quarter rows. The Master List, the Facility Profile and the IA
 *  dashboard all join this onto the facilities they already load. */
export const listIaQuarters = query({
  args: { fys: v.optional(v.array(v.string())), limit: v.optional(v.number()) },
  handler: async (ctx, { fys, limit }) => {
    await requireActivatedUser(ctx);
    const rows = await ctx.db.query("facilityIaQuarters").collect();
    const filtered = fys && fys.length
      ? rows.filter((r) => fys.includes(r.fy))
      : rows;
    return filtered
      .sort((a, b) => (a.fy + a.quarter).localeCompare(b.fy + b.quarter))
      .slice(0, Math.min(limit ?? 5000, 20000))
      .map((q) => ({
        facilityId: String(q.facilityId),
        fy: q.fy,
        quarter: q.quarter,
        nqasIaScore: q.nqasIaScore ?? null,
        kayakalpIaScore: q.kayakalpIaScore ?? null,
        ecoFriendlyScore: q.ecoFriendlyScore ?? null,
        nqasRemark: q.nqasRemark ?? null,
        kayakalpRemark: q.kayakalpRemark ?? null,
        ecoRemark: q.ecoRemark ?? null,
        provisional: q.provisional === true,
        lockedAt: q.lockedAt ?? null,
        updatedByName: q.updatedByName ?? null,
        updatedAt: q.updatedAt,
      }));
  },
});

/** Import history for the IA kind — the shared batch list (Import history). */
export const listIaBatches = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireActivatedUser(ctx);
    const rows = await ctx.db
      .query("importBatches")
      .withIndex("by_time")
      .order("desc")
      .collect();
    return rows
      .filter((b) => b.kind === "ia")
      .slice(0, Math.min(limit ?? 50, 100));
  },
});

/* -------------------------------------------------------------------------- */
/* Reads — one facility's quarterly history (the Facility Profile panel)       */
/* -------------------------------------------------------------------------- */

export const listFacilityIaQuarters = query({
  args: { facilityId: v.id("facilities") },
  handler: async (ctx, { facilityId }) => {
    await requireActivatedUser(ctx);
    const rows = await ctx.db
      .query("facilityIaQuarters")
      .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
      .collect();
    const out = rows.map((q) => ({
      _id: String(q._id),
      fy: q.fy,
      quarter: q.quarter,
      nqasIaScore: q.nqasIaScore ?? null,
      kayakalpIaScore: q.kayakalpIaScore ?? null,
      ecoFriendlyScore: q.ecoFriendlyScore ?? null,
      nqasRemark: q.nqasRemark ?? null,
      kayakalpRemark: q.kayakalpRemark ?? null,
      ecoRemark: q.ecoRemark ?? null,
      lockedAt: q.lockedAt ?? null,
      updatedByName: q.updatedByName ?? null,
      updatedAt: q.updatedAt,
    }));

    // The master list still falls back to the legacy facilities columns when
    // the quarterly store has no row for 2026-27 Q1/Q2. The profile card must
    // show the same numbers, so add those two read-only periods here too.
    const hasPeriod = (q: number) =>
      rows.some((row) => row.fy === LEGACY_IA_FY && row.quarter === q);
    const facility = await ctx.db.get(facilityId);
    if (facility) {
      const legacy = [
        { quarter: 1, nqas: facility.nqasIaQ1 ?? null, kayakalp: facility.kayakalpIaQ1 ?? null },
        { quarter: 2, nqas: facility.nqasIaQ2 ?? null, kayakalp: facility.kayakalpIaQ2 ?? null },
      ];
      for (const slot of legacy) {
        if (hasPeriod(slot.quarter)) continue;
        if (slot.nqas == null && slot.kayakalp == null) continue;
        out.push({
          _id: `legacy-q${slot.quarter}`,
          fy: LEGACY_IA_FY,
          quarter: slot.quarter,
          nqasIaScore: slot.nqas,
          kayakalpIaScore: slot.kayakalp,
          ecoFriendlyScore: null,
          nqasRemark: null,
          kayakalpRemark: null,
          ecoRemark: null,
          lockedAt: null,
          updatedByName: null,
          updatedAt: 0,
        });
      }
    }

    // Report-old-first: the newest quarter last (table reads top-down).
    return out.sort((a, b) => a.fy.localeCompare(b.fy) || a.quarter - b.quarter);
  },
});

/* -------------------------------------------------------------------------- */
/* Reads — the reminder context (the dashboard / import-page banner)           */
/* -------------------------------------------------------------------------- */

/**
 * Everything the reminder rule needs, computed server-side once.
 *
 * PART 2 ROOT CAUSE FIX: this used to return only "which quarters have ANY
 * row", so the banner treated a no-batch quarter as missing entirely. Coverage
 * is now per quarter: the number of DISTINCT facilities with at least one IA
 * score in `facilityIaQuarters` (plus the legacy facilities.nqasIaQ1/Q2
 * columns, so a quarter whose scores live there is not reported as missing).
 */
export const getIaReminderContext = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    const [facilities, quarters, settings] = await Promise.all([
      ctx.db.query("facilities").collect(),
      ctx.db.query("facilityIaQuarters").collect(),
      getSettings(ctx),
    ]);
    const totalFacilities = facilities.length;
    const today = istToday();

    type Bucket = { reported: Set<string>; notApplicable: Set<string>; provisional: boolean };
    const buckets = new Map<string, Bucket>();
    const bucketOf = (fy: string, q: number): Bucket => {
      const key = `${fy}|Q${q}`;
      let b = buckets.get(key);
      if (!b) {
        b = { reported: new Set(), notApplicable: new Set(), provisional: false };
        buckets.set(key, b);
      }
      return b;
    };

    for (const q of quarters) {
      const b = bucketOf(q.fy, q.quarter);
      // A blank is never counted: only a real IA score means "reported".
      if (q.nqasIaScore != null || q.kayakalpIaScore != null) {
        b.reported.add(String(q.facilityId));
      }
      // Part C ③: an explicit Not applicable row leaves the denominator.
      if (q.notApplicable === true) b.notApplicable.add(String(q.facilityId));
      if (q.provisional === true && isQuarterProvisional(q.fy, q.quarter, today)) {
        b.provisional = true;
      }
    }

    // Legacy columns (the values the Master List shows when the quarterly
    // store is empty) count as coverage for the FY they are labelled with.
    for (const f of facilities) {
      const legacy: [number, number | undefined][] = [
        [1, f.nqasIaQ1 ?? f.kayakalpIaQ1 ?? undefined],
        [2, f.nqasIaQ2 ?? f.kayakalpIaQ2 ?? undefined],
      ];
      for (const [q, score] of legacy) {
        if (score == null) continue;
        bucketOf(LEGACY_IA_FY, q).reported.add(String(f._id));
      }
    }

    const coverage = [...buckets.entries()]
      .map(([key, b]) => {
        const i = key.lastIndexOf("|Q");
        return {
          fy: key.slice(0, i),
          q: Number(key.slice(i + 2)) as 1 | 2 | 3 | 4,
          reported: b.reported.size,
          // Applicability, not a raw facility count. Blank = applicable.
          total: Math.max(0, totalFacilities - b.notApplicable.size),
          provisional: b.provisional,
        };
      })
      .filter((c) => c.reported > 0);

    const grace = Number(settings.iaGraceDays);
    const threshold = Number(settings.iaCompleteThreshold);
    return {
      totalFacilities,
      today,
      graceDays: Number.isFinite(grace) ? Math.min(30, Math.max(0, Math.round(grace))) : 5,
      threshold: Number.isFinite(threshold)
        ? Math.min(100, Math.max(50, Math.round(threshold)))
        : 95,
      coverage,
      canFinalise: me.appRole === "admin",
    };
  },
});
