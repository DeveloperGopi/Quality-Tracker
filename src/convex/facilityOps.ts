import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { requireActivatedUser, canEdit, refreshFacilityStatus } from "./facilities";

/** NQAS Eligibility dropdown in the Facility Master List. Changing it
 *  refreshes the auto current status (the lifecycle engine gates everything
 *  on eligibility) and records the old -> new value in the audit trail. */
export const updateFacilityEligibility = mutation({
  args: {
    facilityId: v.id("facilities"),
    eligibility: v.union(
      v.literal("Eligible"),
      v.literal("Not Eligible"),
      v.literal("Possible"),
    ),
  },
  handler: async (ctx, { facilityId, eligibility }) => {
    const user = await requireActivatedUser(ctx);
    if (!canEdit(user)) throw new Error("You do not have edit permission");
    const facility = await ctx.db.get(facilityId);
    if (!facility) throw new Error("Facility not found");
    const old = facility.eligibility;
    if (old === eligibility) return;
    await ctx.db.patch(facilityId, { eligibility });
    await refreshFacilityStatus(
      ctx,
      facilityId,
      user.name ?? "Unknown",
      user._id,
      false,
    );
    await ctx.db.insert("auditLogs", {
      table: "facilities",
      recordId: String(facilityId),
      facilityId,
      action: "update",
      field: "NQAS Eligibility",
      oldValue: old,
      newValue: eligibility,
      changedBy: user._id,
      changedByName: user.name,
      changedAt: Date.now(),
    });
  },
});

/** Upload / replace / clear the NQAS Certified Documents for the active
 *  cycle's NQAS assessment. Pass attachmentId only when a new file was
 *  picked; pass clear to remove the stored document. */
export const updateNqasCertDocument = mutation({
  args: {
    facilityId: v.id("facilities"),
    attachmentId: v.optional(v.id("_storage")),
    attachmentName: v.optional(v.string()),
    attachmentType: v.optional(v.string()),
    clear: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { facilityId, attachmentId, attachmentName, attachmentType, clear },
  ) => {
    await setNqasDocument(ctx, {
      facilityId,
      attachmentId,
      attachmentName,
      attachmentType,
      clear,
      kind: "cert",
    });
  },
});

export const updateNqasResultDocument = mutation({
  args: {
    facilityId: v.id("facilities"),
    attachmentId: v.optional(v.id("_storage")),
    attachmentName: v.optional(v.string()),
    attachmentType: v.optional(v.string()),
    clear: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { facilityId, attachmentId, attachmentName, attachmentType, clear },
  ) => {
    await setNqasDocument(ctx, {
      facilityId,
      attachmentId,
      attachmentName,
      attachmentType,
      clear,
      kind: "result",
    });
  },
});

/** Shared upload/clear logic for the two per-cycle NQAS document columns:
 *  "NQAS Result" (assessment result sheet) and "NQAS Certified Documents"
 *  (certificate / GoI letter). Fully audit-logged. */
async function setNqasDocument(
  ctx: MutationCtx,
  opts: {
    facilityId: Id<"facilities">;
    attachmentId?: Id<"_storage"> | undefined;
    attachmentName?: string | undefined;
    attachmentType?: string | undefined;
    clear?: boolean | undefined;
    kind: "cert" | "result";
  },
) {
  const { facilityId, attachmentId, attachmentName, attachmentType, clear, kind } = opts;
  const user = await requireActivatedUser(ctx);
  if (!canEdit(user)) throw new Error("You do not have edit permission");
  const facility = await ctx.db.get(facilityId);
  if (!facility) throw new Error("Facility not found");
  const cycles = await ctx.db
    .query("certificationCycles")
    .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
    .collect();
  const cycle =
    cycles.find((c) => !c.superseded) ??
    cycles.sort((a, b) => b.cycleNumber - a.cycleNumber)[0] ??
    null;
  if (!cycle) throw new Error("No certification cycle for this facility yet");
  const na = await ctx.db
    .query("nationalAssessments")
    .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
    .first();
  if (!na)
    throw new Error("No NQAS assessment record for this facility yet");

  const fieldLabel = kind === "result" ? "NQAS Result" : "NQAS Certified Documents";
  const oldName = kind === "result" ? (na.resultDocumentName ?? null) : (na.certDocumentName ?? null);
  if (clear) {
    await ctx.db.patch(na._id, {
      ...(kind === "result"
        ? {
            resultDocumentId: undefined,
            resultDocumentName: undefined,
            resultDocumentType: undefined,
            resultDocumentUpdatedAt: Date.now(),
          }
        : {
            certDocumentId: undefined,
            certDocumentName: undefined,
            certDocumentType: undefined,
            certDocumentUpdatedAt: Date.now(),
          }),
    });
  } else {
    if (!attachmentId) throw new Error("No file selected");
    await ctx.db.patch(na._id, {
      ...(kind === "result"
        ? {
            resultDocumentId: attachmentId,
            resultDocumentName: attachmentName,
            resultDocumentType: attachmentType,
            resultDocumentUpdatedAt: Date.now(),
          }
        : {
            certDocumentId: attachmentId,
            certDocumentName: attachmentName,
            certDocumentType: attachmentType,
            certDocumentUpdatedAt: Date.now(),
          }),
    });
  }
  await ctx.db.insert("auditLogs", {
    table: "nationalAssessments",
    recordId: String(na._id),
    facilityId,
    action: "update",
    field: fieldLabel,
    oldValue: oldName,
    newValue: clear ? null : attachmentName ?? attachmentId,
    changedBy: user._id,
    changedByName: user.name,
    changedAt: Date.now(),
  });
}
