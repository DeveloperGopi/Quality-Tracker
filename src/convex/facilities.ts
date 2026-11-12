import { v } from "convex/values";
import axios from "axios";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import {
  computeCurrentStatus,
  computeDerivedNqas,
  computeRecertInfo,
  deriveLifecycleView,
  todayIso,
  addMonthsToIso,
  addYearsToIso,
  CYCLE_TYPE_BY_TRIGGER,
  DEFAULT_SETTINGS,
  SUPER_ADMIN_EMAILS,
  type LifecycleSettings,
  type CycleTrigger,
} from "./lifecycle";
import { APP_ROLES } from "./schema";
import { validateNqasDraft, validateSaDraft } from "../lib/facilityProfileRules";
import { normalizeDocumentRules, resolveDocumentRequirements } from "../lib/documentRules";
import { hasCurrentNqasResultDocument } from "../lib/nqasResultDocument";
import { normalizePhone } from "../lib/phone";
import {
  REPORT_TYPE_LABELS_KEY,
  resolveReportTypeLabels,
  sameReportName,
} from "../lib/reportNaming";
import {
  RESULT_DECLARED,
  isResultDeclared,
  isResultDeclaredStatus,
} from "../lib/resultDeclared";
import { getAuthUserId } from "@convex-dev/auth/server";
import { saveFailure } from "./saveResult";

export type AppUser = Doc<"users">;
type Settings = LifecycleSettings;

// ---------- auth + scoping helpers ----------

export async function requireUser(
  ctx: MutationCtx | QueryCtx,
): Promise<AppUser> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not signed in");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User record not found");
  return user;
}

export async function requireActivatedUser(
  ctx: MutationCtx | QueryCtx,
): Promise<AppUser> {
  const user = await requireUser(ctx);
  if (!user.appRole) throw new Error("Account is not activated for this app yet");
  if (user.disabled) throw new Error("This account is disabled. Ask a State Admin to enable it.");
  return user;
}

export async function getSettings(
  ctx: MutationCtx | QueryCtx,
): Promise<Settings> {
  const rows = await ctx.db.query("appSettings").collect();
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows) out[row.key] = row.value;
  return out as Settings;
}

/** State Admin only — settings, user management, danger zone. */
export function canEditAll(user: AppUser): boolean {
  return user.appRole === "admin";
}

/** Anyone who can create/edit records. DQMO (District Quality Medical
 *  Officer) and DQC (District Quality Consultant) are district quality
 *  roles: state-wide read/edit across all blocks, without admin settings. */
export function canEdit(user: AppUser): boolean {
  return (
    user.appRole === "admin" ||
    user.appRole === "entry" ||
    user.appRole === "dqmo" ||
    user.appRole === "dqc"
  );
}

/** null = unrestricted (admin, viewer, DQMO and DQC read across all blocks);
 *  otherwise the set of block names the user may touch. */
export async function allowedBlockNames(
  ctx: QueryCtx,
  user: AppUser,
): Promise<Set<string> | null> {
  if (
    user.appRole === "admin" ||
    user.appRole === "viewer" ||
    user.appRole === "dqmo" ||
    user.appRole === "dqc"
  )
    return null;
  if (!user.blockIds || user.blockIds.length === 0) return new Set<string>();
  const names = new Set<string>();
  for (const id of user.blockIds) {
    const b = await ctx.db.get(id);
    if (b) names.add(b.name);
  }
  return names;
}

export async function canEditFacility(
  ctx: MutationCtx | QueryCtx,
  user: AppUser,
  facility: Doc<"facilities">,
): Promise<boolean> {
  if (user.appRole === "admin") return true;
  if (user.appRole !== "entry") return false;
  if (!user.blockIds || user.blockIds.length === 0) return false;
  const block = await ctx.db
    .query("blocks")
    .withIndex("by_name", (q) => q.eq("name", facility.block))
    .first();
  return !!block && user.blockIds.some((id) => String(id) === String(block._id));
}

/**
 * Map a free-text audit source to the four values the "Updated" filter and
 * the Last updated column show. Anything unrecognised is a manual edit.
 */
export function lastChangeSourceOf(source: string | undefined): string {
  const s = (source ?? "").toLowerCase();
  if (s.includes("saqsham")) return "saqsham";
  if (s.includes("internal assessment") || s.includes("quarterly ia") || s.includes(" ia") || s.startsWith("ia"))
    return "ia";
  if (s.includes("facility master") || s.includes("master import") || s.includes("bulk import"))
    return "master";
  if (s.includes("auto") || s.includes("system") || s.includes("engine")) return "system";
  return "manual";
}

/** Human label for a source key (shared by the filter and the column). */
export const LAST_CHANGE_SOURCE_LABEL: Record<string, string> = {
  manual: "Manual edit",
  saqsham: "SaQsham import",
  ia: "IA import",
  master: "Facility master import",
  system: "Automatic",
};

/**
 * Stamp a facility's last-changed fields. Called from EVERY audit writer in
 * the same transaction, so the Master List "Updated" filter never scans the
 * audit log. `recentChanges` keeps the last 10 field keys.
 */
export async function markFacilityChanged(
  ctx: MutationCtx,
  facilityId: Id<"facilities">,
  args: { at: number; userName?: string; source?: string; batchId?: string; key: string },
): Promise<void> {
  const facility = await ctx.db.get(facilityId);
  if (!facility) return;
  const sourceKey = lastChangeSourceOf(args.source);
  const recent = [...(facility.recentChanges ?? [])];
  if (recent[recent.length - 1]?.key !== args.key || recent[recent.length - 1]?.at !== args.at) {
    recent.push({ key: args.key, at: args.at, source: sourceKey });
  }
  await ctx.db.patch(facilityId, {
    lastChangedAt: args.at,
    lastChangedBy: args.userName ?? "system",
    lastChangeSource: sourceKey,
    lastBatchId: args.batchId,
    recentChanges: recent.slice(-10),
  });
}

export async function audit(
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
    /** Where the change came from ("auto: result", an import, …). */
    source?: string;
    /** Groups the rows of one confirmed batch so it can be undone as a unit. */
    batchId?: string;
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
    source: args.source,
    batchId: args.batchId,
  });

  // LAST CHANGED (Part 2): written in the same transaction as the audit row.
  if (!args.facilityId) return;
  await markFacilityChanged(ctx, args.facilityId, {
    at: changedAt,
    userName: args.userName,
    source: args.source,
    batchId: args.batchId,
    key: args.field ?? args.table,
  });
}

const FIELD_LABELS: Record<string, string> = {
  block: "Block name",
  phc: "PHC name",
  name: "Facility name",
  facilityType: "Facility Type",
  phaseType: "Phase Type",
  eligibility: "NQAS Eligibility",
  saqshamFacilityType: "SaQsham Facility_Type",
  saqshamCategory: "SaQsham Facility Name/Category",
  remarks: "General Remarks",
  ninNumber: "NIN Number",
};

/** Normalize a NIN for comparison — digits only, case-insensitive. */
export function normalizeNin(nin: string | undefined | null): string | null {
  if (!nin) return null;
  const cleaned = String(nin).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned || null;
}

// ---------- bootstrap ----------

/** Returns true if this user just claimed State Admin (no admin existed). */
export const claimAccess = mutation({
  args: { name: v.string(), designation: v.optional(v.string()) },
  handler: async (ctx, { name, designation }) => {
    const user = await requireUser(ctx);
    if (user.disabled) throw new Error("This account is disabled. Ask a State Admin to enable it.");
    // An invitation pre-approves the sign-up: activate with the role and
    // blocks the State Admin chose, before the generic approval gate runs.
    if (!user.appRole && user.email) {
      const email = user.email.trim().toLowerCase();
      const invites = await ctx.db.query("invitations").collect();
      const invite = invites.find(
        (i) => i.email === email && i.acceptedAt == null && i.revokedAt == null,
      );
      if (invite) {
        await ctx.db.patch(user._id, {
          appRole: invite.appRole,
          blockIds: invite.blockIds,
          name: name.trim() || user.name,
        });
        await ctx.db.patch(invite._id, { acceptedAt: Date.now() });
        await audit(ctx, {
          table: "users",
          recordId: String(user._id),
          action: "update",
          field: "Invitation accepted",
          newValue: `${name || user.email} → ${invite.appRole}`,
          userName: name || user.name || user.email,
          userId: user._id,
        });
        return { claimed: true, appRole: invite.appRole };
      }
    }
    const isSuperAdmin =
      user.email != null &&
      SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
    // Already activated: designated super-admins are upgraded to State Admin
    // even if they previously claimed as viewer/entry.
    if (user.appRole) {
      if (isSuperAdmin && user.appRole !== "admin") {
        await ctx.db.patch(user._id, { appRole: "admin" });
        await audit(ctx, {
          table: "users",
          recordId: String(user._id),
          action: "update",
          field: "Role",
          oldValue: user.appRole,
          newValue: "admin",
          userName: user.name || user.email || "System",
          userId: user._id,
        });
        return { claimed: true, appRole: "admin" };
      }
      return { claimed: false, appRole: user.appRole };
    }
    const users = await ctx.db.query("users").collect();
    const hasAdmin = users.some((u) => u.appRole === "admin");
    // Designated super-admin emails always get State Admin. Other new
    // registrations require approval by an existing State Admin — unless no
    // admin exists yet (first-user bootstrap).
    if (!isSuperAdmin && hasAdmin) {
      throw new Error(
        "Your registration is awaiting approval by a State Admin. You will get access once an admin approves your account.",
      );
    }
    const appRole = "admin";
    await ctx.db.patch(user._id, {
      appRole,
      name: name.trim() || user.name,
      designation: designation ?? undefined,
    });
    await audit(ctx, {
      table: "users",
      recordId: String(user._id),
      action: "update",
      field: "Account activated",
      newValue: `${name || user.email} → ${appRole}${isSuperAdmin ? " (designated admin)" : hasAdmin ? "" : " (first user — State Admin)"}`,
      userName: name || user.name || user.email,
      userId: user._id,
    });
    return { claimed: true, appRole };
  },
});

/** Activation info for the signed-in user — powers the RequireAuth gate. */
export const getActivationState = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const users = await ctx.db.query("users").collect();
    const hasAdmin = users.some((u) => u.appRole === "admin");
    const isSuperAdmin =
      user.email != null &&
      SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
    const invitations = user.appRole
      ? []
      : await ctx.db.query("invitations").collect();
    const invited = invitations.some(
      (i) =>
        i.email === (user.email ?? "").trim().toLowerCase() &&
        i.acceptedAt == null &&
        i.revokedAt == null,
    );
    return {
      email: user.email ?? null,
      name: user.name ?? null,
      appRole: user.appRole ?? null,
      disabled: user.disabled === true,
      isSuperAdmin,
      hasAdmin,
      canSelfActivate: isSuperAdmin || !hasAdmin || invited,
      invited,
    };
  },
});

// ---------- lifecycle engine (server side) ----------

/** Recompute the facility auto-status; ensure eligible facilities have an active cycle. */
export async function refreshFacilityStatus(
  ctx: MutationCtx,
  facilityId: Id<"facilities">,
  actorName: string,
  actorId: Id<"users"> | undefined,
  allowBootstrap: boolean,
): Promise<string> {
  const facilityDoc = await ctx.db.get(facilityId);
  if (!facilityDoc) throw new Error("Facility not found");
  let facility = facilityDoc;
  const s = await getSettings(ctx);
  const today = todayIso();

  const loadCycles = async () => {
    const list = await ctx.db
      .query("certificationCycles")
      .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
      .collect();
    list.sort((a, b) => a.cycleNumber - b.cycleNumber);
    return list;
  };

  let cycles = await loadCycles();

  if (allowBootstrap && facility.eligibility === "Eligible" && cycles.length === 0) {
    const cycleId = await ctx.db.insert("certificationCycles", {
      facilityId,
      cycleNumber: 1,
      cycleType: CYCLE_TYPE_BY_TRIGGER.initial,
      createdAt: Date.now(),
      createdBy: actorId,
    });
    await ctx.db.insert("stateAssessments", {
      cycleId,
      facilityId,
      status: "Not Yet Initiated",
    });
    await audit(ctx, {
      table: "certificationCycles",
      recordId: String(cycleId),
      facilityId,
      action: "create",
      field: "Certification Cycle",
      newValue: "Cycle #1 (Initial) auto-created — facility marked NQAS Eligible",
      userName: actorName,
      userId: actorId,
    });
    cycles = await loadCycles();
  }

  const activeCycle = cycles.find((c) => !c.superseded) ?? null;
  let sa: Doc<"stateAssessments"> | null = null;
  let nqas: Doc<"nationalAssessments"> | null = null;
  if (activeCycle) {
    sa =
      (await ctx.db
        .query("stateAssessments")
        .withIndex("by_cycle", (q) => q.eq("cycleId", activeCycle._id))
        .first()) ?? null;
    nqas =
      (await ctx.db
        .query("nationalAssessments")
        .withIndex("by_cycle", (q) => q.eq("cycleId", activeCycle._id))
        .first()) ?? null;
  }

  // Heal the auto-validity on rows saved before the Deferred rule: a
  // Deferred result must still show a 3-month (cooling-period) validity,
  // and a certification date combined with a GoI letter date must prefer
  // the letter date.
  // Fill-only — never clears or overwrites values on healthy rows.
  if (nqas && nqas.certificationStatus) {
    const rederived = computeDerivedNqas(nqas, s);
    if (
      rederived.validityDate &&
      rederived.validityDate !== (nqas.validityDate ?? null) &&
      (!nqas.validityDate ||
        nqas.certificationStatus === "Deferred")
    ) {
      await ctx.db.patch(nqas._id, { validityDate: rederived.validityDate });
      nqas = { ...nqas, validityDate: rederived.validityDate };
    }
  }

  // Legacy spellings of the eligibility label fold into the new one so old
  // rows display (and filter) under the current name after each refresh.
  // Legacy status labels fold into their current names so old rows display
  // (and filter) under the renamed status after each refresh.
  const LEGACY_CANDIDATE_LABELS = new Set([
    "Possible (future candidate)",
    "Possible Future Candidate",
    "Candidate",
  ]);
  const LEGACY_NA_SCHEDULED = "NQAS Assessment Scheduled"; // renamed "NA Scheduled"
  if (
    LEGACY_CANDIDATE_LABELS.has(facility.currentStatus) ||
    LEGACY_CANDIDATE_LABELS.has(facility.statusOverride ?? "") ||
    facility.currentStatus === LEGACY_NA_SCHEDULED ||
    facility.statusOverride === LEGACY_NA_SCHEDULED
  ) {
    const patch0: Record<string, unknown> = {};
    if (LEGACY_CANDIDATE_LABELS.has(facility.currentStatus))
      patch0.currentStatus = "Facility (Future Candidate)";
    if (facility.statusOverride &&
        LEGACY_CANDIDATE_LABELS.has(facility.statusOverride))
      patch0.statusOverride = "Facility (Future Candidate)";
    if (facility.currentStatus === LEGACY_NA_SCHEDULED)
      patch0.currentStatus = "NA Scheduled";
    if (facility.statusOverride === LEGACY_NA_SCHEDULED)
      patch0.statusOverride = "NA Scheduled";
    await ctx.db.patch(facilityId, patch0);
    facility = { ...facility, ...patch0 } as typeof facility;
  }

  const autoStatus = computeCurrentStatus(facility, sa, nqas, s, today);
  // The tracker's "Facility Current Status" column is both editable and
  // auto-updated: a manual override wins until (a) the user clears it, or
  // (b) the facility reaches a definitive lifecycle result (certified /
  // deferred / result awaited), which resets the column to the engine.
  const definitive =
    autoStatus.startsWith("Certified") ||
    autoStatus.startsWith("Deferred") ||
    autoStatus === "Result Awaited" ||
    autoStatus === "Recertification Due";
  let status = autoStatus;
  if (facility.statusOverride && !definitive) {
    status = facility.statusOverride;
  } else if (facility.statusOverride && definitive) {
    await ctx.db.patch(facilityId, { statusOverride: undefined });
  }
  if (status !== facility.currentStatus) {
    await ctx.db.patch(facilityId, { currentStatus: status });
    await audit(ctx, {
      table: "facilities",
      recordId: String(facilityId),
      facilityId,
      action: "update",
      field: facility.statusOverride && !definitive
        ? "Facility Current Status (manual)"
        : "Current Status (auto)",
      oldValue: facility.currentStatus,
      newValue: status,
      userName: facility.statusOverride && !definitive
        ? "Manual override"
        : "System",
    });
  }
  if ((facility.currentCycleNumber ?? 0) !== (activeCycle?.cycleNumber ?? 0)) {
    await ctx.db.patch(facilityId, {
      currentCycleNumber: activeCycle?.cycleNumber ?? 0,
    });
  }
  return status;
}

// ---------- facilities ----------

export const createFacility = mutation({
  args: {
    block: v.string(),
    phc: v.string(),
    name: v.string(),
    facilityType: v.string(),
    phaseType: v.optional(v.string()),
    eligibility: v.union(
      v.literal("Eligible"),
      v.literal("Not Eligible"),
      v.literal("Possible"),
    ),
    saqshamFacilityType: v.optional(v.string()),
    saqshamCategory: v.optional(v.string()),
    remarks: v.optional(v.string()),
    ninNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireActivatedUser(ctx);
    if (!canEdit(user)) throw new Error("You do not have edit permission");
    if (user.appRole === "entry") {
      const allowed = await allowedBlockNames(ctx, user);
      if (allowed === null || !allowed.has(args.block))
        throw new Error("You can only add facilities in your assigned blocks");
    }
    // NIN is the primary key for de-duplication — reject exact duplicates.
    const nin = normalizeNin(args.ninNumber);
    if (nin) {
      const dup = await ctx.db
        .query("facilities")
        .withIndex("by_nin", (q) => q.eq("ninNumber", nin))
        .first();
      if (dup)
        throw new Error(
          `A facility with NIN ${args.ninNumber} already exists: ${dup.name} (${dup.block}). Each facility must have a unique NIN number.`,
        );
    }
    const facilityId = await ctx.db.insert("facilities", {
      ...args,
      ninNumber: nin ?? undefined,
      currentStatus: "—",
      currentCycleNumber: 0,
      createdAt: Date.now(),
      createdBy: user._id,
    });
    const status = await refreshFacilityStatus(
      ctx, facilityId, user.name ?? "Unknown", user._id, true,
    );
    await audit(ctx, {
      table: "facilities",
      recordId: String(facilityId),
      facilityId,
      action: "create",
      newValue: `${args.name} (${args.block} / ${args.phc}, ${args.facilityType}) — status ${status}`,
      userName: user.name,
      userId: user._id,
    });
    return facilityId;
  },
});

export const updateFacility = mutation({
  args: {
    facilityId: v.id("facilities"),
    block: v.optional(v.string()),
    phc: v.optional(v.string()),
    name: v.optional(v.string()),
    facilityType: v.optional(v.string()),
    phaseType: v.optional(v.string()),
    eligibility: v.optional(
      v.union(
        v.literal("Eligible"),
        v.literal("Not Eligible"),
        v.literal("Possible"),
      ),
    ),
    saqshamFacilityType: v.optional(v.string()),
    saqshamCategory: v.optional(v.string()),
    remarks: v.optional(v.string()),
    ninNumber: v.optional(v.string()),
  },
  handler: async (ctx, { facilityId, ...changes }) => {
    try {
    const user = await requireActivatedUser(ctx);
    if (!canEdit(user)) throw new Error("You do not have edit permission");
    const facility = await ctx.db.get(facilityId);
    if (!facility) throw new Error("Facility not found");
    if (!(await canEditFacility(ctx, user, facility)))
      throw new Error("This facility is outside your assigned blocks");

    // Uniqueness guard when the NIN is being set/changed.
    if (changes.ninNumber !== undefined) {
      const nin = normalizeNin(changes.ninNumber);
      if (nin) {
        const dup = await ctx.db
          .query("facilities")
          .withIndex("by_nin", (q) => q.eq("ninNumber", nin))
          .first();
        if (dup && String(dup._id) !== String(facilityId))
          throw new Error(
            `NIN ${changes.ninNumber} is already used by ${dup.name} (${dup.block})`,
          );
        changes.ninNumber = nin ?? undefined;
      } else {
        changes.ninNumber = undefined;
      }
    }

    let changed = false;
    for (const [field, newValue] of Object.entries(changes)) {
      if (newValue === undefined) continue;
      const oldValue = (facility as unknown as Record<string, unknown>)[field];
      if (String(oldValue ?? "") === String(newValue)) continue;
      await ctx.db.patch(facilityId, { [field]: newValue });
      changed = true;
      await audit(ctx, {
        table: "facilities",
        recordId: String(facilityId),
        facilityId,
        action: "update",
        field: FIELD_LABELS[field] ?? field,
        oldValue: oldValue ?? "(empty)",
        newValue: newValue,
        userName: user.name,
        userId: user._id,
      });
    }
    if (changed) {
      // Auto "Last Updated" stamp — mirrors the master-list row save.
      await ctx.db.patch(facilityId, { updatedAt: Date.now() });
      await refreshFacilityStatus(
        ctx, facilityId, user.name ?? "Unknown", user._id, true,
      );
    }
    } catch (error) {
      return saveFailure(error);
    }
  },
});

export const deleteFacility = mutation({
  args: { facilityId: v.id("facilities") },
  handler: async (ctx, { facilityId }) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user))
      throw new Error("Only the State Admin can delete facilities");
    const facility = await ctx.db.get(facilityId);
    if (!facility) throw new Error("Facility not found");
    const cycles = await ctx.db
      .query("certificationCycles")
      .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
      .collect();
    for (const cycle of cycles) {
      for (const table of ["stateAssessments", "nationalAssessments"] as const) {
        const rows = await ctx.db
          .query(table)
          .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
          .collect();
        for (const row of rows) await ctx.db.delete(row._id);
      }
      await ctx.db.delete(cycle._id);
    }
    // Module records (Gap Closure Fund / Fire NOC / Building)
    for (const table of [
      "gapClosureFunds",
      "fireNocs",
      "buildingDetails",
    ] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
    const audits = await ctx.db
      .query("auditLogs")
      .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
      .collect();
    for (const a of audits) await ctx.db.delete(a._id);
    await ctx.db.delete(facilityId);
    await audit(ctx, {
      table: "facilities",
      recordId: String(facilityId),
      action: "delete",
      oldValue: `${facility.name} (${facility.block} / ${facility.phc})`,
      userName: user.name,
      userId: user._id,
    });
  },
});

// ---------- state assessment ----------

export const updateStateAssessment = mutation({
  args: {
    facilityId: v.id("facilities"),
    cycleId: v.id("certificationCycles"),
    status: v.optional(
      v.union(
        v.literal("Not Yet Initiated"),
        v.literal("Scheduled"),
        v.literal("Completed"),
      ),
    ),
    scheduledDate: v.optional(v.string()),
    rescheduleReason: v.optional(v.string()),
    actualStartDate: v.optional(v.string()),
    actualEndDate: v.optional(v.string()),
    /** Audit provenance for dates the schedule filled. */
    dateSource: v.optional(v.string()),
    scopeOption: v.optional(v.string()),
    scorePercent: v.optional(v.number()),
    generalDocStatus: v.optional(v.string()),
    assessorHud: v.optional(v.string()),
    // Assessment team + visit documents (mirror updateTrackerRow's sa args).
    assessor1Name: v.optional(v.string()),
    assessor2Name: v.optional(v.string()),
    assessor1Designation: v.optional(v.string()),
    assessor1Phone: v.optional(v.string()),
    assessor2Designation: v.optional(v.string()),
    assessor2Phone: v.optional(v.string()),
    assessor1Hud: v.optional(v.string()),
    assessor2Hud: v.optional(v.string()),
    reportAttachmentId: v.optional(v.id("_storage")),
    reportAttachmentName: v.optional(v.string()),
    reportAttachmentType: v.optional(v.string()),
    checklistAttachmentId: v.optional(v.id("_storage")),
    checklistAttachmentName: v.optional(v.string()),
    checklistAttachmentType: v.optional(v.string()),
    clearReportAttachment: v.optional(v.boolean()),
    clearChecklistAttachment: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
    const user = await requireActivatedUser(ctx);
    if (!canEdit(user)) throw new Error("You do not have edit permission");
    const facility = await ctx.db.get(args.facilityId);
    if (!facility) throw new Error("Facility not found");
    if (!(await canEditFacility(ctx, user, facility)))
      throw new Error("This facility is outside your assigned blocks");
    const cycle = await ctx.db.get(args.cycleId);
    if (!cycle || String(cycle.facilityId) !== String(args.facilityId))
      throw new Error("Cycle does not belong to this facility");

    const sa = await ctx.db
      .query("stateAssessments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .first();
    if (!sa) throw new Error("State Assessment record not found");

    const patch: Record<string, unknown> = {};

    // --- reschedule capture (no silent overwrites) ---
    if (args.scheduledDate !== undefined) {
      if (!sa.originalScheduledDate) {
        patch.originalScheduledDate = args.scheduledDate;
        patch.scheduledDate = args.scheduledDate;
        await audit(ctx, {
          table: "stateAssessments",
          recordId: String(sa._id),
          facilityId: args.facilityId,
          action: "update",
          field: "SA Originally Scheduled Date",
          oldValue: "(empty)",
          newValue: args.scheduledDate,
          userName: user.name,
          userId: user._id,
        });
      } else if (args.scheduledDate !== sa.scheduledDate && sa.status !== "Completed") {
        patch.scheduledDate = args.scheduledDate;
        patch.revisedDate = args.scheduledDate;
        patch.revisedReason = args.rescheduleReason ?? sa.revisedReason;
        patch.rescheduleCount = (sa.rescheduleCount ?? 0) + 1;
        await audit(ctx, {
          table: "stateAssessments",
          recordId: String(sa._id),
          facilityId: args.facilityId,
          action: "update",
          field: "SA Scheduled Date (revised)",
          oldValue: sa.scheduledDate ?? sa.originalScheduledDate,
          newValue: args.scheduledDate,
          userName: user.name,
          userId: user._id,
        });
      }
    }

    const fieldMap: Record<string, string> = {
      status: "SA Status",
      actualStartDate: "SA Actual Start Date",
      actualEndDate: "SA Actual End Date",
      scopeOption: "Scope",
      scorePercent: "SA Score %",
      generalDocStatus: "General Documents Status",
      assessorHud: "Assessors HUD",
      assessor1Name: "Name of Assessor 1",
      assessor2Name: "Name of Assessor 2",
      assessor1Designation: "Assessor 1 designation",
      assessor1Phone: "Assessor 1 contact number",
      assessor2Designation: "Assessor 2 designation",
      assessor2Phone: "Assessor 2 contact number",
      assessor1Hud: "Assessors 1 HUD",
      assessor2Hud: "Assessors 2 HUD",
    };
    for (const [key, rawValue] of Object.entries(args)) {
      // Contact numbers are stored in E.164 (+91…), never raw text.
      let newValue: unknown = rawValue;
      if (key === "assessor1Phone" || key === "assessor2Phone") {
        const phone = normalizePhone(String(rawValue ?? ""));
        if (String(rawValue ?? "").trim() && !phone) {
          throw new Error(
            "Contact number must be a 10-digit mobile number starting 6–9",
          );
        }
        newValue = phone ?? undefined;
      }
      if (
        [
          "facilityId",
          "cycleId",
          "scheduledDate",
          "rescheduleReason",
          "dateSource",
          // Attachments are handled by the dedicated staged-upload block
          // below (id + name + type commit / clear flag) so the loop must
          // not double-audit or write flag fields onto the document.
          "reportAttachmentId",
          "reportAttachmentName",
          "reportAttachmentType",
          "checklistAttachmentId",
          "checklistAttachmentName",
          "checklistAttachmentType",
          "clearReportAttachment",
          "clearChecklistAttachment",
        ].includes(key)
      )
        continue;
      if (newValue === undefined) continue;
      const oldValue = (sa as unknown as Record<string, unknown>)[key];
      if (String(oldValue ?? "") === String(newValue)) continue;
      (patch as Record<string, unknown>)[key] = newValue;
      await audit(ctx, {
        table: "stateAssessments",
        recordId: String(sa._id),
        facilityId: args.facilityId,
        action: "update",
        field: fieldMap[key] ?? key,
        oldValue: oldValue ?? "(empty)",
        newValue: newValue,
        userName: user.name,
        userId: user._id,
        ...(args.dateSource &&
        ["actualStartDate", "actualEndDate"].includes(key)
          ? { source: args.dateSource }
          : {}),
      });
    }

    // SA Report (PDF) — staged upload commit / removal.
    if (
      args.reportAttachmentId !== undefined &&
      String(sa.reportAttachmentId ?? "") !== String(args.reportAttachmentId)
    ) {
      patch.reportAttachmentId = args.reportAttachmentId;
      patch.reportAttachmentName = args.reportAttachmentName;
      patch.reportAttachmentType = args.reportAttachmentType;
      await audit(ctx, {
        table: "stateAssessments",
        recordId: String(sa._id),
        facilityId: args.facilityId,
        action: "update",
        field: "SA Report (PDF)",
        oldValue: sa.reportAttachmentName ?? "(empty)",
        newValue: args.reportAttachmentName,
        userName: user.name,
        userId: user._id,
      });
    }
    if (args.clearReportAttachment && sa.reportAttachmentId) {
      patch.reportAttachmentId = undefined;
      patch.reportAttachmentName = undefined;
      patch.reportAttachmentType = undefined;
      await audit(ctx, {
        table: "stateAssessments",
        recordId: String(sa._id),
        facilityId: args.facilityId,
        action: "update",
        field: "SA Report (PDF)",
        oldValue: sa.reportAttachmentName ?? "(empty)",
        newValue: "(removed)",
        userName: user.name,
        userId: user._id,
      });
    }
    // SA Checklist (Excel) — staged upload commit / removal.
    if (
      args.checklistAttachmentId !== undefined &&
      String(sa.checklistAttachmentId ?? "") !== String(args.checklistAttachmentId)
    ) {
      patch.checklistAttachmentId = args.checklistAttachmentId;
      patch.checklistAttachmentName = args.checklistAttachmentName;
      patch.checklistAttachmentType = args.checklistAttachmentType;
      await audit(ctx, {
        table: "stateAssessments",
        recordId: String(sa._id),
        facilityId: args.facilityId,
        action: "update",
        field: "SA Checklist (Excel)",
        oldValue: sa.checklistAttachmentName ?? "(empty)",
        newValue: args.checklistAttachmentName,
        userName: user.name,
        userId: user._id,
      });
    }
    if (args.clearChecklistAttachment && sa.checklistAttachmentId) {
      patch.checklistAttachmentId = undefined;
      patch.checklistAttachmentName = undefined;
      patch.checklistAttachmentType = undefined;
      await audit(ctx, {
        table: "stateAssessments",
        recordId: String(sa._id),
        facilityId: args.facilityId,
        action: "update",
        field: "SA Checklist (Excel)",
        oldValue: sa.checklistAttachmentName ?? "(empty)",
        newValue: "(removed)",
        userName: user.name,
        userId: user._id,
      });
    }
    if (args.generalDocStatus !== undefined && args.generalDocStatus !== sa.generalDocStatus) {
      patch.generalDocUpdatedAt = Date.now();
    }
    if (Object.keys(patch).length > 0) {
      const nextStatus = String(patch.status ?? sa.status);
      if (
        nextStatus === "Completed" &&
        (!(patch.actualStartDate ?? sa.actualStartDate) ||
          !(patch.actualEndDate ?? sa.actualEndDate))
      ) {
        throw new Error(
          "A completed visit needs both actual dates. Enter the actual start date and actual end date before saving.",
        );
      }
      // --- consistency rules, mirrored server-side ---
      // The form runs the SAME validator before calling this mutation, so a
      // UI-initiated save passes; this mirror only stops direct API misuse
      // writing what the request asked to prevent (contradictory states).
      const saIssues = validateSaDraft(
        {
          scheduledDate: String(patch.scheduledDate ?? sa.scheduledDate ?? ""),
          actualStartDate: String(patch.actualStartDate ?? sa.actualStartDate ?? ""),
          actualEndDate: String(patch.actualEndDate ?? sa.actualEndDate ?? ""),
          scorePercent:
            patch.scorePercent != null
              ? String(patch.scorePercent)
              : sa.scorePercent != null
                ? String(sa.scorePercent)
                : "",
          generalDocStatus: "",
          assessor1Name: "",
          assessor1Designation: "",
          assessor1Phone: "",
          assessor1Hud: "",
          assessor2Name: "",
          assessor2Designation: "",
          assessor2Phone: "",
          assessor2Hud: "",
        },
        todayIso(),
      );
      if (saIssues.length > 0) {
        throw new Error(saIssues.map((i) => i.message).join(" "));
      }
      await ctx.db.patch(sa._id, patch);
    }

    if (patch.status === "Completed") {
      await audit(ctx, {
        table: "stateAssessments",
        recordId: String(sa._id),
        facilityId: args.facilityId,
        action: "update",
        field: "SA Completed",
        newValue: `Score ${patch.scorePercent ?? sa.scorePercent ?? "—"}% — NQAS record can now be created for this cycle`,
        userName: user.name,
        userId: user._id,
      });
    }
    await refreshFacilityStatus(ctx, args.facilityId, user.name ?? "Unknown", user._id, false);
    } catch (error) {
      return saveFailure(error);
    }
  },
});

// ---------- national assessment ----------

export const ensureNqasRecord = mutation({
  args: {
    facilityId: v.id("facilities"),
    cycleId: v.id("certificationCycles"),
  },
  handler: async (ctx, args) => {
    const user = await requireActivatedUser(ctx);
    if (!canEdit(user)) throw new Error("You do not have edit permission");
    const facility = await ctx.db.get(args.facilityId);
    if (!facility) throw new Error("Facility not found");
    if (!(await canEditFacility(ctx, user, facility)))
      throw new Error("This facility is outside your assigned blocks");
    const sa = await ctx.db
      .query("stateAssessments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .first();
    if (!sa || sa.status !== "Completed")
      throw new Error("State Assessment must be completed before the NQAS record is created");
    const existing = await ctx.db
      .query("nationalAssessments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .first();
    if (existing) return existing._id;
    const id = await ctx.db.insert("nationalAssessments", {
      cycleId: args.cycleId,
      facilityId: args.facilityId,
      status: "Pending",
    });
    await audit(ctx, {
      table: "nationalAssessments",
      recordId: String(id),
      facilityId: args.facilityId,
      action: "create",
      field: "NQAS Record",
      newValue: "Created after State Assessment completion",
      userName: user.name,
      userId: user._id,
    });
    await refreshFacilityStatus(ctx, args.facilityId, user.name ?? "Unknown", user._id, false);
    return id;
  },
});

/** The SAME NQAS Result gate the profile form uses.
 *
 * The uploaded file lives in `facilityDocuments`; the old `nationalAssessments`
 * storage column is only a legacy alias. Reading both here (for the assessment
 * cycle) stops a valid uploaded PDF from being rejected as missing.
 */
async function nqasResultDocumentGate(
  ctx: MutationCtx,
  args: {
    facilityId: Id<"facilities">;
    cycleNo: number;
    certStatus: string;
    legacyStorageId?: Id<"_storage">;
  },
) {
  const [rulesRow, docs, funds, building, nocs] = await Promise.all([
    ctx.db.query("appSettings").withIndex("by_key", (q) => q.eq("key", "documentRules")).first(),
    ctx.db.query("facilityDocuments").withIndex("by_facility", (q) => q.eq("facilityId", args.facilityId)).collect(),
    ctx.db.query("gapClosureFunds").withIndex("by_facility", (q) => q.eq("facilityId", args.facilityId)).collect(),
    ctx.db.query("buildingDetails").withIndex("by_facility", (q) => q.eq("facilityId", args.facilityId)).first(),
    ctx.db.query("fireNocs").withIndex("by_facility", (q) => q.eq("facilityId", args.facilityId)).collect(),
  ]);
  const rules = normalizeDocumentRules(rulesRow?.value);
  const requirements = resolveDocumentRequirements(rules, {
    certStatus: args.certStatus,
    gapAmount: funds.reduce((max, f) => Math.max(max, f.amountSanctioned ?? 0), 0),
    dilapidated: (building?.buildingStatus ?? "").toLowerCase() === "dilapidated",
    fireNocRecorded: nocs.some(
      (n) => !!n.nocNumber || !!n.issuedDate || !!n.attachmentId || /obtained|valid/i.test(n.status ?? ""),
    ),
  });
  const rule = requirements.NQAS_Result;
  const uploadedInDocuments = hasCurrentNqasResultDocument(
    docs,
    args.cycleNo,
    rule.rule.scope,
  );
  return {
    rule: {
      required: rule.required,
      blocking: rule.blocking,
      label: "NQAS Result",
    },
    uploaded: !!args.legacyStorageId || uploadedInDocuments,
  };
}

export const updateNationalAssessment = mutation({
  args: {
    facilityId: v.id("facilities"),
    cycleId: v.id("certificationCycles"),
    status: v.optional(
      v.union(
        v.literal("Pending"),
        v.literal("Scheduled"),
        v.literal("Completed"),
      ),
    ),
    scheduledStartDate: v.optional(v.string()),
    scheduledEndDate: v.optional(v.string()),
    rescheduleReason: v.optional(v.string()),
    actualStartDate: v.optional(v.string()),
    actualEndDate: v.optional(v.string()),
    dateSource: v.optional(v.string()),
    mode: v.optional(v.string()),
    departments: v.optional(v.array(v.string())),
    scopeOption: v.optional(v.string()),
    checklistVersion: v.optional(v.string()),
    certificationStatus: v.optional(v.string()), // certificationStatuses list (admin-editable)
    certificationDate: v.optional(v.string()),
    goiLetterDate: v.optional(v.string()),
    scorePercent: v.optional(v.number()),
    // NQAS Result document (uploaded from the profile NQAS tab; the master
    // list / category pages upload the same file via updateTrackerRow).
    resultAttachmentId: v.optional(v.id("_storage")),
    resultAttachmentName: v.optional(v.string()),
    resultAttachmentType: v.optional(v.string()),
    clearResultAttachment: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
    const user = await requireActivatedUser(ctx);
    if (!canEdit(user)) throw new Error("You do not have edit permission");
    const facility = await ctx.db.get(args.facilityId);
    if (!facility) throw new Error("Facility not found");
    if (!(await canEditFacility(ctx, user, facility)))
      throw new Error("This facility is outside your assigned blocks");
    const cycle = await ctx.db.get(args.cycleId);
    if (!cycle || String(cycle.facilityId) !== String(args.facilityId))
      throw new Error("Cycle does not belong to this facility");

    let nqas = await ctx.db
      .query("nationalAssessments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .first();
    if (!nqas) {
      const sa = await ctx.db
        .query("stateAssessments")
        .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
        .first();
      if (!sa || sa.status !== "Completed")
        throw new Error("Complete the State Assessment before recording NQAS details");
      const id = await ctx.db.insert("nationalAssessments", {
        cycleId: args.cycleId,
        facilityId: args.facilityId,
        status: "Pending",
      });
      nqas = (await ctx.db.get(id))!;
    }

    const patch: Record<string, unknown> = {};

    // --- reschedule capture ---
    if (args.scheduledStartDate !== undefined) {
      if (!nqas.originalScheduledStartDate) {
        patch.originalScheduledStartDate = args.scheduledStartDate;
        patch.scheduledStartDate = args.scheduledStartDate;
        await audit(ctx, {
          table: "nationalAssessments",
          recordId: String(nqas._id),
          facilityId: args.facilityId,
          action: "update",
          field: "NQAS Originally Scheduled Start Date",
          oldValue: "(empty)",
          newValue: args.scheduledStartDate,
          userName: user.name,
          userId: user._id,
        });
      } else if (
        args.scheduledStartDate !== nqas.scheduledStartDate
      ) {
        patch.scheduledStartDate = args.scheduledStartDate;
        patch.revisedDate = args.scheduledStartDate;
        patch.revisedReason = args.rescheduleReason ?? nqas.revisedReason;
        patch.rescheduleCount = (nqas.rescheduleCount ?? 0) + 1;
        await audit(ctx, {
          table: "nationalAssessments",
          recordId: String(nqas._id),
          facilityId: args.facilityId,
          action: "update",
          field: "NQAS Scheduled Start Date (revised)",
          oldValue: nqas.scheduledStartDate ?? nqas.originalScheduledStartDate,
          newValue: args.scheduledStartDate,
          userName: user.name,
          userId: user._id,
        });
      }
    }

    const fieldMap: Record<string, string> = {
      status: "NQAS Status",
      scheduledEndDate: "NQAS Scheduled End Date",
      actualStartDate: "NQAS Actual Start Date",
      actualEndDate: "NQAS Actual End Date",
      mode: "Mode of Assessment",
      departments: "Departments / Service Areas Assessed",
      scopeOption: "Scope",
      checklistVersion: "Certification Criteria / Checklist Version",
      certificationStatus: "Certification Status",
      certificationDate: "Certification Date",
      goiLetterDate: "GoI Letter Date",
      scorePercent: "NQAS Score %",
    };
    for (const [key, newValue] of Object.entries(args)) {
      if (
        ["facilityId", "cycleId", "scheduledStartDate", "rescheduleReason", "dateSource"].includes(key)
      )
        continue;
      if (newValue === undefined) continue;
      const oldValue = (nqas as unknown as Record<string, unknown>)[key];
      if (JSON.stringify(oldValue ?? null) === JSON.stringify(newValue)) continue;
      patch[key] = newValue;
      await audit(ctx, {
        table: "nationalAssessments",
        recordId: String(nqas._id),
        facilityId: args.facilityId,
        action: "update",
        field: fieldMap[key] ?? key,
        oldValue: Array.isArray(oldValue) ? oldValue.join(", ") : (oldValue ?? "(empty)"),
        newValue: Array.isArray(newValue) ? newValue.join(", ") : newValue,
        userName: user.name,
        userId: user._id,
        ...(args.dateSource &&
        ["actualStartDate", "actualEndDate"].includes(key)
          ? { source: args.dateSource }
          : {}),
      });
    }

    if (args.resultAttachmentId !== undefined && String(nqas.resultDocumentId ?? "") !== String(args.resultAttachmentId)) {
      patch.resultDocumentId = args.resultAttachmentId;
      patch.resultDocumentName = args.resultAttachmentName;
      patch.resultDocumentType = args.resultAttachmentType;
      patch.resultDocumentUpdatedAt = Date.now();
      await audit(ctx, {
        table: "nationalAssessments",
        recordId: String(nqas._id),
        facilityId: args.facilityId,
        action: "update",
        field: "NQAS Result",
        oldValue: nqas.resultDocumentName ?? "(empty)",
        newValue: args.resultAttachmentName,
        userName: user.name,
        userId: user._id,
      });
    }
    if (args.clearResultAttachment && nqas.resultDocumentId) {
      patch.resultDocumentId = undefined;
      patch.resultDocumentName = undefined;
      patch.resultDocumentType = undefined;
      patch.resultDocumentUpdatedAt = Date.now();
      await audit(ctx, {
        table: "nationalAssessments",
        recordId: String(nqas._id),
        facilityId: args.facilityId,
        action: "update",
        field: "NQAS Result",
        oldValue: nqas.resultDocumentName ?? "(empty)",
        newValue: "(removed)",
        userName: user.name,
        userId: user._id,
      });
    }

    if (Object.keys(patch).length === 0) {
      await refreshFacilityStatus(ctx, args.facilityId, user.name ?? "Unknown", user._id, false);
      return;
    }

    // Auto-derive: certified month/year, validity date.
    const candidate = { ...nqas, ...patch } as Doc<"nationalAssessments">;
    if (
      (candidate.certificationStatus === "Quality Certified" ||
        candidate.certificationStatus === "Quality Certified with Conditionality") &&
      !candidate.certificationDate &&
      candidate.actualEndDate
    ) {
      patch.certificationDate = candidate.actualEndDate;
      candidate.certificationDate = candidate.actualEndDate;
    }
    const derived = computeDerivedNqas(candidate, await getSettings(ctx));
    const derivedCertDate =
      candidate.goiLetterDate || candidate.certificationDate || candidate.actualEndDate;
    if (derived.validityDate) {
      patch.validityDate = derived.validityDate;
      const certDate = derivedCertDate!;
      patch.certifiedMonthYear = certDate.slice(0, 7);
      patch.certifiedYear = Number(certDate.slice(0, 4));
      await audit(ctx, {
        table: "nationalAssessments",
        recordId: String(nqas._id),
        facilityId: args.facilityId,
        action: "create",
        field: "Validity auto-calculated",
        newValue: `Valid till ${derived.validityDate}; surveillance due ${derived.surveillanceDue1 ?? "—"} (Y1)${derived.surveillanceDue2 ? `, ${derived.surveillanceDue2} (Y2)` : ""}`,
        userName: "System",
      });
    } else if (
      (args.certificationStatus !== undefined &&
        candidate.certificationStatus !== "Quality Certified" &&
        candidate.certificationStatus !== "Quality Certified with Conditionality" &&
        candidate.certificationStatus !== "Deferred") ||
      (args.goiLetterDate !== undefined &&
        (candidate.certificationStatus === "Quality Certified" ||
          candidate.certificationStatus === "Quality Certified with Conditionality"))
    ) {
      // Result reversed / no longer certifying — drop the stale auto validity.
      patch.validityDate = undefined;
      await audit(ctx, {
        table: "nationalAssessments",
        recordId: String(nqas._id),
        facilityId: args.facilityId,
        action: "update",
        field: "NQAS Certificate Validity Date (auto)",
        oldValue: nqas.validityDate,
        newValue: "(cleared)",
        userName: "System",
      });
    }
    // --- consistency rules, mirrored server-side (same validator the NQAS
    // form runs) — validated against the record AS IT WOULD BE after this
    // write, including the cross-record gate on the cycle's SA status. ---
    const saOfCycle = await ctx.db
      .query("stateAssessments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .first();
    const after = { ...nqas, ...patch } as Record<string, unknown>;
    if (
      String(after.status ?? nqas.status) === "Completed" &&
      (!after.actualStartDate || !after.actualEndDate)
    ) {
      throw new Error(
        "A completed assessment needs both actual dates. Enter the actual start date and actual end date before saving.",
      );
    }
    const docGate = await nqasResultDocumentGate(ctx, {
      facilityId: args.facilityId,
      cycleNo: cycle.cycleNumber,
      certStatus: String(after.certificationStatus ?? ""),
      legacyStorageId: after.resultDocumentId as Id<"_storage"> | undefined,
    });
    const nqasIssues = validateNqasDraft(
      {
        scheduledStartDate: String(after.scheduledStartDate ?? ""),
        scheduledEndDate: String(after.scheduledEndDate ?? ""),
        actualStartDate: String(after.actualStartDate ?? ""),
        actualEndDate: String(after.actualEndDate ?? ""),
        mode: "",
        checklistVersion: "",
        departments: [],
        certificationStatus: String(after.certificationStatus ?? ""),
        certificationDate: String(
          after.certificationDate ?? after.goiLetterDate ?? "",
        ),
        scorePercent: after.scorePercent != null ? String(after.scorePercent) : "",
        resultDocumentId:
          after.resultDocumentId != null ? String(after.resultDocumentId) : "",
      },
      {
        today: todayIso(),
        saCompleted: saOfCycle?.status === "Completed",
        resultDocRule: docGate.rule,
        resultDocUploaded: docGate.uploaded,
      },
    );
    if (nqasIssues.length > 0) {
      throw new Error(nqasIssues.map((i) => i.message).join(" "));
    }
    await ctx.db.patch(nqas._id, patch);
    await refreshFacilityStatus(ctx, args.facilityId, user.name ?? "Unknown", user._id, false);
    } catch (error) {
      return saveFailure(error);
    }
  },
});

// ---------- new cycle trigger ----------

export const startNewCycle = mutation({
  args: {
    facilityId: v.id("facilities"),
    trigger: v.union(v.literal("recertification"), v.literal("deferred")),
  },
  handler: async (ctx, { facilityId, trigger }) => {
    const user = await requireActivatedUser(ctx);
    if (!canEdit(user)) throw new Error("You do not have edit permission");
    const facility = await ctx.db.get(facilityId);
    if (!facility) throw new Error("Facility not found");
    if (!(await canEditFacility(ctx, user, facility)))
      throw new Error("This facility is outside your assigned blocks");

    const cycles = await ctx.db
      .query("certificationCycles")
      .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
      .collect();
    const nextNumber = cycles.reduce((max, c) => Math.max(max, c.cycleNumber), 0) + 1;
    const cycleType: (typeof CYCLE_TYPE_BY_TRIGGER)[CycleTrigger] =
      CYCLE_TYPE_BY_TRIGGER[trigger];

    for (const c of cycles) {
      if (!c.superseded) await ctx.db.patch(c._id, { superseded: true });
    }
    const cycleId = await ctx.db.insert("certificationCycles", {
      facilityId,
      cycleNumber: nextNumber,
      cycleType,
      createdAt: Date.now(),
      createdBy: user._id,
    });
    await ctx.db.insert("stateAssessments", {
      cycleId,
      facilityId,
      status: "Not Yet Initiated",
    });
    await audit(ctx, {
      table: "certificationCycles",
      recordId: String(cycleId),
      facilityId,
      action: "create",
      field: "Certification Cycle",
      newValue: `Cycle #${nextNumber} (${cycleType}) started — schedule the State Assessment`,
      userName: user.name,
      userId: user._id,
    });
    await refreshFacilityStatus(ctx, facilityId, user.name ?? "Unknown", user._id, false);
    return cycleId;
  },
});

// ---------- cycle history management ----------

/** Remove one certification cycle (and its SA / NQAS assessment records)
 *  from a facility's history. Admin-only cleanup for accidentally started
 *  cycles. When no active cycle remains, the highest remaining cycle is
 *  promoted to active so the tracker always has a current cycle. */
export const deleteCycle = mutation({
  args: {
    facilityId: v.id("facilities"),
    cycleId: v.id("certificationCycles"),
  },
  handler: async (ctx, { facilityId, cycleId }) => {
    const user = await requireActivatedUser(ctx);
    if (user.appRole !== "admin")
      throw new Error("Only the State Admin can remove cycle history");
    const facility = await ctx.db.get(facilityId);
    if (!facility) throw new Error("Facility not found");
    if (!(await canEditFacility(ctx, user, facility)))
      throw new Error("This facility is outside your assigned blocks");
    const cycle = await ctx.db.get(cycleId);
    if (!cycle || String(cycle.facilityId) !== String(facilityId))
      throw new Error("Cycle does not belong to this facility");

    for (const sa of await ctx.db
      .query("stateAssessments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", cycleId))
      .collect()) {
      await ctx.db.delete(sa._id);
    }
    for (const na of await ctx.db
      .query("nationalAssessments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", cycleId))
      .collect()) {
      await ctx.db.delete(na._id);
    }
    await ctx.db.delete(cycleId);

    // Keep exactly one active cycle when any remain.
    const remaining = await ctx.db
      .query("certificationCycles")
      .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
      .collect();
    remaining.sort((a, b) => b.cycleNumber - a.cycleNumber);
    if (!remaining.some((c) => !c.superseded) && remaining[0]) {
      await ctx.db.patch(remaining[0]._id, { superseded: false });
    }

    await audit(ctx, {
      table: "certificationCycles",
      recordId: String(cycleId),
      facilityId,
      action: "delete",
      field: "Certification Cycle",
      oldValue: `Cycle #${cycle.cycleNumber} (${cycle.cycleType})`,
      newValue: "(deleted)",
      userName: user.name,
      userId: user._id,
    });
    await refreshFacilityStatus(ctx, facilityId, user.name ?? "Unknown", user._id, false);
  },
});

// ---------- inline tracker-row editing (Facility Master List) ----------

/** One spreadsheet-style row edit from the Facility Master List. Every
 *  tracker column is optional; provided values are routed to the right
 *  table (facility / cycle / SA / NA / fund / NOC / building), creating the
 *  needed records on the fly. Each changed field is audit-logged. */
export const updateTrackerRow = mutation({
  args: {
    facilityId: v.id("facilities"),
    // facilities
    remarks: v.optional(v.string()),
    nqasIaQ1: v.optional(v.number()),
    nqasIaQ2: v.optional(v.number()),
    kayakalpIaQ1: v.optional(v.number()),
    kayakalpIaQ2: v.optional(v.number()),
    // Manual "Facility Current Status" — wins over the auto engine until
    // cleared or until the facility reaches a definitive result.
    statusOverride: v.optional(v.string()), // "" clears
    // gap closure fund (single current record per facility)
    gapClosureAmount: v.optional(v.number()),
    gcFundYear: v.optional(v.string()),
    fundProcLink: v.optional(v.string()),
    fundStatus: v.optional(v.string()),
    fundAttachmentId: v.optional(v.id("_storage")),
    fundAttachmentName: v.optional(v.string()),
    fundAttachmentType: v.optional(v.string()),
    // certification cycle
    recertStage: v.optional(v.string()),
    // state assessment
    saStatus: v.optional(
      v.union(
        v.literal("Not Yet Initiated"),
        v.literal("Scheduled"),
        v.literal("Completed"),
      ),
    ),
    saScore: v.optional(v.number()),
    saStartDate: v.optional(v.string()),
    saEndDate: v.optional(v.string()),
    saAssessor1Name: v.optional(v.string()),
    saAssessor2Name: v.optional(v.string()),
    // Per-assessor HUD units (admin-managed dropdown list).
    saAssessor1Hud: v.optional(v.string()),
    saAssessor2Hud: v.optional(v.string()),
    saReportAttachmentId: v.optional(v.id("_storage")),
    saReportAttachmentName: v.optional(v.string()),
    saReportAttachmentType: v.optional(v.string()),
    saChecklistAttachmentId: v.optional(v.id("_storage")),
    saChecklistAttachmentName: v.optional(v.string()),
    saChecklistAttachmentType: v.optional(v.string()),
    clearSaReportAttachment: v.optional(v.boolean()),
    clearSaChecklistAttachment: v.optional(v.boolean()),
    generalDocStatus: v.optional(v.string()),
    // national assessment
    naStatus: v.optional(
      v.union(
        v.literal("Pending"),
        v.literal("Scheduled"),
        v.literal("Completed"),
      ),
    ),
    naScheduledDate: v.optional(v.string()),
    naEndDate: v.optional(v.string()),
    naMode: v.optional(v.string()),
    naDepartments: v.optional(v.string()), // comma-separated → array
    certStatus: v.optional(v.string()), // certificationStatuses list (admin-editable)
    certScore: v.optional(v.number()),
    certDate: v.optional(v.string()),
    // NQAS Result document (assessment result sheet) — staged in-row and
    // applied only when the row's Update button is pressed (Remove sets
    // clearResultAttachment).
    resultAttachmentId: v.optional(v.id("_storage")),
    resultAttachmentName: v.optional(v.string()),
    resultAttachmentType: v.optional(v.string()),
    clearResultAttachment: v.optional(v.boolean()),
    goiLetterDate: v.optional(v.string()),
    surveillanceDone1: v.optional(v.string()),
    surveillanceDone2: v.optional(v.string()),
    // Manual "Score" column next to the 2nd surveillance done date — stored
    // on the certification cycle and shown ahead of the computed NQAS score.
    manualScore: v.optional(v.number()),
    // fire NOC
    nocAvailable: v.optional(v.string()), // Yes / No
    fireNocStatus: v.optional(v.string()),
    fireNocIssuedDate: v.optional(v.string()), // "NOC Issue Date"
    fireNocValidity: v.optional(v.string()), // expiry date
    nocLink: v.optional(v.string()),
    nocAttachmentId: v.optional(v.id("_storage")),
    nocAttachmentName: v.optional(v.string()),
    nocAttachmentType: v.optional(v.string()),
    // building
    buildingType: v.optional(v.string()),
    buildingStatus: v.optional(v.string()),
    condemnedLink: v.optional(v.string()),
    condemnedAttachmentId: v.optional(v.id("_storage")),
    condemnedAttachmentName: v.optional(v.string()),
    condemnedAttachmentType: v.optional(v.string()),
    clearCondemnedAttachment: v.optional(v.boolean()),
    // explicit removal of the fund/NOC attachments (Remove button)
    clearFundAttachment: v.optional(v.boolean()),
    clearNocAttachment: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireActivatedUser(ctx);
    if (!canEdit(user)) throw new Error("You do not have edit permission");
    const facility = await ctx.db.get(args.facilityId);
    if (!facility) throw new Error("Facility not found");
    if (!(await canEditFacility(ctx, user, facility)))
      throw new Error("This facility is outside your assigned blocks");
  const s = await getSettings(ctx);
  const today = todayIso();
  // Part H — surveillance done dates are REAL visit dates. They are never
  // auto-filled from the due date and can never be in the future.
  for (const [key, text] of [
    [args.surveillanceDone1, "1st"],
    [args.surveillanceDone2, "2nd"],
  ] as const) {
    if (!key) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      throw new Error(`${text} Surveillance Assessment Done Date is not a valid date`);
    }
    if (key > today) {
      throw new Error(
        `${text} Surveillance Assessment Done Date cannot be in the future - record it after the visit`,
      );
    }
  }
  if (args.manualScore !== undefined) {
    if (Number.isNaN(args.manualScore) || args.manualScore < 0 || args.manualScore > 100) {
      throw new Error("Surveillance score must be between 0 and 100");
    }
    // Part H — "a score needs a done date": the score sits beside the 2nd
    // surveillance visit, so it cannot exist without that visit's date.
    const clearingDone2 = args.surveillanceDone2 === "";
    let hasDone2 = !!args.surveillanceDone2;
    if (!clearingDone2 && !hasDone2) {
      const nas = await ctx.db
        .query("nationalAssessments")
        .withIndex("by_facility", (q) => q.eq("facilityId", args.facilityId))
        .collect();
      hasDone2 = nas.some((n) => !!n.surveillanceDone2);
    }
    if (!hasDone2) {
      throw new Error(
        "A surveillance score needs the 2nd Surveillance Assessment Done Date — enter the visit date first",
      );
    }
  }
  const label = (f: string, ov: unknown, nv: unknown) => ({
    table: "facilities", recordId: String(args.facilityId),
    facilityId: args.facilityId, action: "update" as const,
    field: f, oldValue: ov ?? "(empty)", newValue: nv ?? "(empty)",
    userName: user.name, userId: user._id,
  });
    const changed = <T extends Record<string, unknown>>(
      old: T, key: keyof T & string, nv: unknown,
    ): boolean => String(old[key] ?? "") !== String(nv ?? "");

    // --- 1. facility-level fields ---
    const facPatch: Record<string, unknown> = {};
    for (const k of [
      "remarks", "nqasIaQ1", "nqasIaQ2", "kayakalpIaQ1", "kayakalpIaQ2",
    ] as const) {
      const nv = args[k];
      if (nv === undefined) continue;
      if (changed(facility, k, nv)) {
        facPatch[k] = nv;
        await audit(ctx, label(FIELD_LABELS[k] ?? k, facility[k], nv));
      }
    }
    // Manual "Facility Current Status" (editable + auto): setting it pins
    // the status; choosing "Auto (system)" or clearing removes the pin.
    if (args.statusOverride !== undefined) {
      const nv = args.statusOverride.trim() || undefined;
      if (String(facility.statusOverride ?? "") !== String(nv ?? "")) {
        facPatch.statusOverride = nv;
        await audit(
          ctx,
          label(
            "Facility Current Status (manual)",
            facility.statusOverride ?? "Auto (system)",
            nv ?? "Auto (system)",
          ),
        );
      }
    }
    if (Object.keys(facPatch).length > 0)
      await ctx.db.patch(facility._id, facPatch);

    // --- 2. active cycle (creates cycle #1 for eligible facilities) ---
    // Status recompute is skipped when nothing but the manual status column
    // changed — the full engine re-run (settings + cycles + SA + NA loads)
    // dominated update latency for single-cell edits.
    const touchesLifecycle =
      (args.statusOverride === undefined || facPatch.statusOverride !== undefined) ||
      args.saStatus !== undefined || args.saScore !== undefined ||
      args.saStartDate !== undefined || args.saEndDate !== undefined ||
      args.generalDocStatus !== undefined ||
      args.naStatus !== undefined || args.naScheduledDate !== undefined ||
      args.naEndDate !== undefined || args.naMode !== undefined ||
      args.naDepartments !== undefined || args.certStatus !== undefined ||
      args.certScore !== undefined || args.certDate !== undefined ||
      args.goiLetterDate !== undefined || args.surveillanceDone1 !== undefined ||
      args.surveillanceDone2 !== undefined || args.manualScore !== undefined;
    if (touchesLifecycle) {
      await refreshFacilityStatus(
        ctx, args.facilityId, user.name ?? "Unknown", user._id, true,
      );
    }
    const cycles = await ctx.db
      .query("certificationCycles")
      .withIndex("by_facility", (q) => q.eq("facilityId", args.facilityId))
      .collect();
    cycles.sort((a, b) => a.cycleNumber - b.cycleNumber);
    const activeCycle =
      cycles.find((c) => !c.superseded) ?? cycles[cycles.length - 1] ?? null;

    if (activeCycle && args.recertStage !== undefined) {
      if (changed(activeCycle, "recertStage", args.recertStage)) {
        await ctx.db.patch(activeCycle._id, { recertStage: args.recertStage });
        await audit(ctx, {
          ...label("Recertification — Stage of Application", activeCycle.recertStage, args.recertStage),
          table: "certificationCycles",
          recordId: String(activeCycle._id),
        });
      }
    }

    let sa: Doc<"stateAssessments"> | null = null;
    let nqas: Doc<"nationalAssessments"> | null = null;
    if (activeCycle) {
      sa =
        (await ctx.db
          .query("stateAssessments")
          .withIndex("by_cycle", (q) => q.eq("cycleId", activeCycle._id))
          .first()) ?? null;
      nqas =
        (await ctx.db
          .query("nationalAssessments")
          .withIndex("by_cycle", (q) => q.eq("cycleId", activeCycle._id))
          .first()) ?? null;
    }

    // Facilities imported without lifecycle rows (or created before SA
    // bootstrap) get an SA row lazily here — otherwise SA Score/Start/End
    // saves silently do nothing and "SA Completed" never triggers. Created
    // BEFORE the patch section below so those fields land on the new row.
    if (activeCycle && !sa &&
      (args.saStatus !== undefined || args.saScore !== undefined ||
        args.saStartDate !== undefined || args.saEndDate !== undefined ||
        args.saAssessor1Name !== undefined || args.saAssessor2Name !== undefined ||
        args.saAssessor1Hud !== undefined || args.saAssessor2Hud !== undefined ||
        args.saReportAttachmentId !== undefined || args.saChecklistAttachmentId !== undefined ||
        args.generalDocStatus !== undefined)) {
      const id = await ctx.db.insert("stateAssessments", {
        cycleId: activeCycle._id,
        facilityId: args.facilityId,
        status: args.saStatus ?? "Completed",
      });
      sa = (await ctx.db.get(id))!;
      await audit(ctx, {
        table: "stateAssessments", recordId: String(id),
        facilityId: args.facilityId, action: "create",
        field: "State Assessment", newValue: "Created from the Facility Master List row (SA data entered)",
        userName: user.name, userId: user._id,
      });
    }

    // --- 3. state assessment ---
    if (sa) {
      const saPatch: Record<string, unknown> = {};
      const saAudit = (field: string, oldValue: unknown, nv: unknown) =>
        audit(ctx, {
          ...label(field, oldValue, nv),
          table: "stateAssessments", recordId: String(sa!._id),
        });
      if (args.saStatus !== undefined && changed(sa, "status", args.saStatus)) {
        saPatch.status = args.saStatus;
        await saAudit("State Assessment Status", "status", args.saStatus);
      }
      // Marking Completed fills empty visit dates from a non-future plan.
      if (args.saStatus === "Completed") {
        const plan = args.saStartDate || sa.scheduledDate;
        if (plan && plan <= todayIso()) {
          if (!sa.actualStartDate) saPatch.actualStartDate = plan;
          if (!sa.actualEndDate) saPatch.actualEndDate = plan;
        }
      }
      if (args.saScore !== undefined && changed(sa, "scorePercent", args.saScore)) {
        saPatch.scorePercent = args.saScore;
        await saAudit("SA Score", "scorePercent", args.saScore);
      }
      // "If NA is scheduled, Assessment Start date" pattern also applies to
      // the SA step: first date set becomes the original; later edits revise.
      if (args.saStartDate !== undefined && args.saStartDate) {
        if (!sa.originalScheduledDate) {
          saPatch.originalScheduledDate = args.saStartDate;
          saPatch.scheduledDate = args.saStartDate;
          await saAudit("State Assessment Start Date", "scheduledDate", args.saStartDate);
        } else if (args.saStartDate !== sa.scheduledDate) {
          saPatch.scheduledDate = args.saStartDate;
          saPatch.revisedDate = args.saStartDate;
          saPatch.rescheduleCount = (sa.rescheduleCount ?? 0) + 1;
          await saAudit("State Assessment Start Date (revised)", sa.scheduledDate ?? sa.originalScheduledDate, args.saStartDate);
        }
        // Same auto rule as the profile: only empty/schedule-equal actual dates
        // follow the plan; a typed different date always wins. Never future.
        if (args.saStartDate <= todayIso()) {
          if (!sa.actualStartDate || sa.actualStartDate === sa.scheduledDate) {
            saPatch.actualStartDate = args.saStartDate;
          }
          if (!sa.actualEndDate || sa.actualEndDate === sa.scheduledDate) {
            if (args.saEndDate === undefined) saPatch.actualEndDate = args.saStartDate;
          }
        }
      }
      if (args.saEndDate !== undefined && changed(sa, "actualEndDate", args.saEndDate || undefined)) {
        saPatch.actualEndDate = args.saEndDate || undefined;
        await saAudit("State Assessment End Date", "actualEndDate", args.saEndDate || "(empty)");
      }
      // "Name of Assessor" — two assessors (Assessor HUD first).
      if (args.saAssessor1Name !== undefined && changed(sa, "assessor1Name", args.saAssessor1Name)) {
        saPatch.assessor1Name = args.saAssessor1Name || undefined;
        await saAudit("Name of Assessor 1", "assessor1Name", args.saAssessor1Name || "(empty)");
      }
      if (args.saAssessor2Name !== undefined && changed(sa, "assessor2Name", args.saAssessor2Name)) {
        saPatch.assessor2Name = args.saAssessor2Name || undefined;
        await saAudit("Name of Assessor 2", "assessor2Name", args.saAssessor2Name || "(empty)");
      }
      // "Assessors 1/2 HUD" — each assessor's own HUD unit dropdown.
      if (args.saAssessor1Hud !== undefined && changed(sa, "assessor1Hud", args.saAssessor1Hud)) {
        saPatch.assessor1Hud = args.saAssessor1Hud || undefined;
        await saAudit("Assessors 1 HUD", "assessor1Hud", args.saAssessor1Hud || "(empty)");
      }
      if (args.saAssessor2Hud !== undefined && changed(sa, "assessor2Hud", args.saAssessor2Hud)) {
        saPatch.assessor2Hud = args.saAssessor2Hud || undefined;
        await saAudit("Assessors 2 HUD", "assessor2Hud", args.saAssessor2Hud || "(empty)");
      }
      // Visit documents: report PDF + checklist Excel, uploaded in-row.
      if (args.saReportAttachmentId !== undefined && String(sa.reportAttachmentId ?? "") !== String(args.saReportAttachmentId)) {
        saPatch.reportAttachmentId = args.saReportAttachmentId;
        saPatch.reportAttachmentName = args.saReportAttachmentName;
        saPatch.reportAttachmentType = args.saReportAttachmentType;
        await saAudit("SA Report (PDF)", "reportAttachmentName", args.saReportAttachmentName);
      }
      if (args.clearSaReportAttachment && sa.reportAttachmentId) {
        saPatch.reportAttachmentId = undefined;
        saPatch.reportAttachmentName = undefined;
        saPatch.reportAttachmentType = undefined;
        await saAudit("SA Report (PDF)", "reportAttachmentName", "(removed)");
      }
      if (args.saChecklistAttachmentId !== undefined && String(sa.checklistAttachmentId ?? "") !== String(args.saChecklistAttachmentId)) {
        saPatch.checklistAttachmentId = args.saChecklistAttachmentId;
        saPatch.checklistAttachmentName = args.saChecklistAttachmentName;
        saPatch.checklistAttachmentType = args.saChecklistAttachmentType;
        await saAudit("SA Checklist (Excel)", "checklistAttachmentName", args.saChecklistAttachmentName);
      }
      if (args.clearSaChecklistAttachment && sa.checklistAttachmentId) {
        saPatch.checklistAttachmentId = undefined;
        saPatch.checklistAttachmentName = undefined;
        saPatch.checklistAttachmentType = undefined;
        await saAudit("SA Checklist (Excel)", "checklistAttachmentName", "(removed)");
      }
      if (args.generalDocStatus !== undefined && changed(sa, "generalDocStatus", args.generalDocStatus)) {
        saPatch.generalDocStatus = args.generalDocStatus;
        saPatch.generalDocUpdatedAt = Date.now(); // auto system timestamp
        await saAudit("SaQsham Documents Status", "generalDocStatus", args.generalDocStatus);
      }
      if (Object.keys(saPatch).length > 0) await ctx.db.patch(sa._id, saPatch);
    }

    // --- 4. national assessment (auto-create when SA completed or NA data given) ---
    const wantsNa =
      args.naStatus !== undefined || args.naScheduledDate !== undefined ||
      args.naEndDate !== undefined || args.naMode !== undefined ||
      args.naDepartments !== undefined || args.certStatus !== undefined ||
      args.certScore !== undefined || args.certDate !== undefined ||
      args.goiLetterDate !== undefined || args.surveillanceDone1 !== undefined ||
      args.surveillanceDone2 !== undefined || args.manualScore !== undefined ||
      args.resultAttachmentId !== undefined || args.clearResultAttachment === true;
    if (activeCycle && wantsNa) {
      if (!nqas) {
        if (sa && sa.status !== "Completed" && !args.saStatus)
          throw new Error("Set the State Assessment to Completed before entering NQAS details");
        const id = await ctx.db.insert("nationalAssessments", {
          cycleId: activeCycle._id,
          facilityId: args.facilityId,
          status: "Pending",
        });
        nqas = (await ctx.db.get(id))!;
        await audit(ctx, {
          table: "nationalAssessments", recordId: String(id),
          facilityId: args.facilityId, action: "create",
          field: "NQAS Assessment", newValue: "Created from the Facility Master List row",
          userName: user.name, userId: user._id,
        });
      }
      const na = nqas;
      const naPatch: Record<string, unknown> = {};
      const naAudit = (field: string, oldValue: unknown, nv: unknown) =>
        audit(ctx, {
          ...label(field, oldValue, nv),
          table: "nationalAssessments", recordId: String(na!._id),
        });
      if (args.naStatus !== undefined && changed(na, "status", args.naStatus)) {
        naPatch.status = args.naStatus;
        await naAudit("NQAS Assessment Status", "status", args.naStatus);
      }
      if (args.naStatus === "Completed") {
        const plan = args.naScheduledDate || na.scheduledStartDate;
        if (plan && plan <= todayIso()) {
          if (!na.actualStartDate) naPatch.actualStartDate = plan;
          if (!na.actualEndDate) {
            const end = args.naEndDate || na.scheduledEndDate || plan;
            naPatch.actualEndDate = end > todayIso() ? todayIso() : end;
          }
        }
      }
      // NA scheduled date = "If NA is scheduled, Assessment Start date"
      // The scheduled date is the PLAN, the actual dates are what happened.
      // Editing the plan (master-list column or the profile form) always
      // writes the plan — even after the assessment is completed — and never
      // silently moves the recorded visit dates.
      if (args.naScheduledDate !== undefined && args.naScheduledDate) {
        if (!na.originalScheduledStartDate) {
          naPatch.originalScheduledStartDate = args.naScheduledDate;
          naPatch.scheduledStartDate = args.naScheduledDate;
          await naAudit("NQAS Assessment Start Date", "scheduledStartDate", args.naScheduledDate);
        } else if (args.naScheduledDate !== na.scheduledStartDate) {
          naPatch.scheduledStartDate = args.naScheduledDate;
          naPatch.revisedDate = args.naScheduledDate;
          naPatch.rescheduleCount = (na.rescheduleCount ?? 0) + 1;
          await naAudit("NQAS Assessment Start Date (revised)", na.scheduledStartDate ?? na.originalScheduledStartDate, args.naScheduledDate);
        }
        if (args.naScheduledDate <= todayIso()) {
          if (!na.actualStartDate || na.actualStartDate === na.scheduledStartDate) {
            naPatch.actualStartDate = args.naScheduledDate;
          }
          if (!na.scheduledEndDate) naPatch.scheduledEndDate = args.naScheduledDate;
          if (!na.actualEndDate || na.actualEndDate === na.scheduledStartDate) {
            naPatch.actualEndDate = args.naEndDate || args.naScheduledDate;
          }
        } else if (!na.scheduledEndDate) {
          naPatch.scheduledEndDate = args.naScheduledDate;
        }
      }
      if (args.naEndDate !== undefined) {
        // end date lands on the scheduled end while pending, actual end once done
        if (na.status === "Completed" || args.naStatus === "Completed") {
          if (changed(na, "actualEndDate", args.naEndDate || undefined)) {
            naPatch.actualEndDate = args.naEndDate || undefined;
            await naAudit("NQAS Assessment End Date", "actualEndDate", args.naEndDate || "(empty)");
          }
        } else if (changed(na, "scheduledEndDate", args.naEndDate || undefined)) {
          naPatch.scheduledEndDate = args.naEndDate || undefined;
          await naAudit("NQAS Scheduled End Date", "scheduledEndDate", args.naEndDate || "(empty)");
        }
      }
      if (args.naMode !== undefined && changed(na, "mode", args.naMode)) {
        naPatch.mode = args.naMode;
        await naAudit("Mode of Assessment", "mode", args.naMode);
      }
      if (args.naDepartments !== undefined) {
        const list = args.naDepartments
          .split(",").map((x) => x.trim()).filter(Boolean);
        if (JSON.stringify(na.departments ?? []) !== JSON.stringify(list)) {
          naPatch.departments = list;
          await naAudit("Departments / Packages", "departments", args.naDepartments);
        }
      }
      if (args.certStatus !== undefined && changed(na, "certificationStatus", args.certStatus)) {
        naPatch.certificationStatus = args.certStatus;
        await naAudit("NQAS Certification Status", "certificationStatus", args.certStatus);
      }
      // ---- Part B: Result Declared, in the SAME transaction ----------------
      // A declared result (Quality Certified / QC with Conditionality /
      // Deferred) sets the SaQsham Documents Status to "Result Declared" with
      // source "auto: result". The last PORTAL value is kept beside it, so a
      // later change away from those three statuses restores that value — never
      // a guessed status. Audited, never silent.
      if (args.certStatus !== undefined && sa) {
        const declared = isResultDeclaredStatus(args.certStatus);
        if (declared && !isResultDeclared(sa.generalDocStatus)) {
          const portal =
            sa.generalDocStatusAuto === true
              ? sa.generalDocStatusPortal
              : sa.generalDocStatus;
          await ctx.db.patch(sa._id, {
            generalDocStatus: RESULT_DECLARED,
            generalDocStatusAuto: true,
            generalDocStatusPortal: portal || undefined,
            generalDocUpdatedAt: Date.now(),
          });
          await audit(ctx, {
            ...label(
              "SaQsham Documents Status (auto: result)",
              sa.generalDocStatus ?? "(empty)",
              RESULT_DECLARED,
            ),
            source: "auto: result",
          });
        } else if (!declared && sa.generalDocStatusAuto === true) {
          const restore = sa.generalDocStatusPortal ?? undefined;
          await ctx.db.patch(sa._id, {
            generalDocStatus: restore,
            generalDocStatusAuto: false,
            generalDocStatusPortal: undefined,
            generalDocUpdatedAt: Date.now(),
          });
          await audit(ctx, {
            ...label(
              "SaQsham Documents Status (auto: result cleared)",
              RESULT_DECLARED,
              restore ?? "(empty)",
            ),
            source: "auto: result",
          });
        }
      }
      if (args.certScore !== undefined && changed(na, "scorePercent", args.certScore)) {
        naPatch.scorePercent = args.certScore;
        await naAudit("Certified Score %", "scorePercent", args.certScore);
      }
      // One merged date feeds both stored fields (GoI letter = certification).
      if (args.certDate !== undefined) {
        if (changed(na, "certificationDate", args.certDate || undefined)) {
          naPatch.certificationDate = args.certDate || undefined;
          await naAudit("Certification date / GoI Letter Date", "certificationDate", args.certDate || "(empty)");
        }
        if (changed(na, "goiLetterDate", args.certDate || undefined)) {
          naPatch.goiLetterDate = args.certDate || undefined;
        }
      }
      if (args.goiLetterDate !== undefined && changed(na, "goiLetterDate", args.goiLetterDate || undefined)) {
        naPatch.goiLetterDate = args.goiLetterDate || undefined;
        await naAudit("GoI Letter Date", "goiLetterDate", args.goiLetterDate || "(empty)");
      }
      if (args.surveillanceDone1 !== undefined && changed(na, "surveillanceDone1", args.surveillanceDone1 || undefined)) {
        naPatch.surveillanceDone1 = args.surveillanceDone1 || undefined;
        await naAudit("1st Surveillance Assessment Done Date", "surveillanceDone1", args.surveillanceDone1 || "(empty)");
      }
      if (args.surveillanceDone2 !== undefined && changed(na, "surveillanceDone2", args.surveillanceDone2 || undefined)) {
        naPatch.surveillanceDone2 = args.surveillanceDone2 || undefined;
        await naAudit("2nd Surveillance Assessment Done Date", "surveillanceDone2", args.surveillanceDone2 || "(empty)");
      }
      // Manual "Score" column (next to the 2nd surveillance done date).
      if (args.manualScore !== undefined && changed(na, "manualScore", args.manualScore)) {
        naPatch.manualScore = args.manualScore;
        await naAudit("2nd Surveillance Score %", "manualScore", args.manualScore);
      }

      // NQAS Result document — staged upload applied on Update.
      if (args.resultAttachmentId !== undefined && String(na.resultDocumentId ?? "") !== String(args.resultAttachmentId)) {
        naPatch.resultDocumentId = args.resultAttachmentId;
        naPatch.resultDocumentName = args.resultAttachmentName;
        naPatch.resultDocumentType = args.resultAttachmentType;
        naPatch.resultDocumentUpdatedAt = Date.now();
        await naAudit("NQAS Result", "resultDocumentName", args.resultAttachmentName);
      }
      if (args.clearResultAttachment && na.resultDocumentId) {
        naPatch.resultDocumentId = undefined;
        naPatch.resultDocumentName = undefined;
        naPatch.resultDocumentType = undefined;
        naPatch.resultDocumentUpdatedAt = Date.now();
        await naAudit("NQAS Result", "resultDocumentName", "(removed)");
      }

      // Auto-derive validity + surveillance due dates from cert status/date.
      const candidate = { ...na, ...naPatch } as Doc<"nationalAssessments">;
      const derived = computeDerivedNqas(candidate, s);
      const effCertDate =
        candidate.goiLetterDate || candidate.certificationDate || candidate.actualEndDate;
      if (derived.validityDate) {
        if (candidate.validityDate !== derived.validityDate) {
          naPatch.validityDate = derived.validityDate;
          await naAudit("NQAS Certificate Validity Date (auto)", candidate.validityDate, derived.validityDate);
        }
        if (effCertDate) {
          naPatch.certifiedMonthYear = effCertDate.slice(0, 7);
          naPatch.certifiedYear = Number(effCertDate.slice(0, 4));
        }
      } else if (
        (args.certStatus !== undefined &&
          candidate.certificationStatus !== "Quality Certified" &&
          candidate.certificationStatus !== "Quality Certified with Conditionality" &&
          candidate.certificationStatus !== "Deferred") ||
        (args.certDate !== undefined &&
          (candidate.certificationStatus === "Quality Certified" ||
            candidate.certificationStatus === "Quality Certified with Conditionality"))
      ) {
        // Result reversed / no longer certifying — drop the stale auto validity.
        naPatch.validityDate = undefined;
        await naAudit("NQAS Certificate Validity Date (auto)", na.validityDate, "(cleared)");
      }
      if (derived.surveillanceDue1 && candidate.surveillanceDue1 !== derived.surveillanceDue1) {
        naPatch.surveillanceDue1 = derived.surveillanceDue1;
      }
      if (derived.surveillanceDue2 && candidate.surveillanceDue2 !== derived.surveillanceDue2) {
        naPatch.surveillanceDue2 = derived.surveillanceDue2;
      }
      // "Recertification Status" (comment) and "Re-Certification Year" derive
      // purely from the certification date per the NQAS validity rules
      // (3y / 1y / Deferred → following year).
      const recert = computeRecertInfo(candidate, s, today);
      if (String(candidate.manualRecertStatus ?? "") !== String(recert.status ?? "")) {
        naPatch.manualRecertStatus = recert.status;
        await naAudit("Recertification Status (auto)", candidate.manualRecertStatus, recert.status);
      }
      if (String(candidate.recertYear ?? "") !== String(recert.year ?? "")) {
        naPatch.recertYear = recert.year;
        await naAudit("Re-Certification Year (auto)", candidate.recertYear, recert.year);
      }
      if (Object.keys(naPatch).length > 0) await ctx.db.patch(na._id, naPatch);
    }

    // --- 5. gap closure fund (single current row per facility) ---
    const wantsFund =
      args.gapClosureAmount !== undefined || args.gcFundYear !== undefined ||
      args.fundProcLink !== undefined || args.fundStatus !== undefined ||
      args.fundAttachmentId !== undefined || args.clearFundAttachment === true;
    if (wantsFund) {
      const existing = (
        await ctx.db
          .query("gapClosureFunds")
          .withIndex("by_facility", (q) => q.eq("facilityId", args.facilityId))
          .collect()
      ).sort((a, b) => b.financialYear.localeCompare(a.financialYear));
      const fund = existing[0] ?? null;
      if (!fund) {
        const id = await ctx.db.insert("gapClosureFunds", {
          facilityId: args.facilityId,
          financialYear: args.gcFundYear || "2026-27",
          amountSanctioned: args.gapClosureAmount,
          status: args.fundStatus || "Pending",
          procLink: args.fundProcLink,
          attachmentId: args.fundAttachmentId,
          attachmentName: args.fundAttachmentName,
          attachmentType: args.fundAttachmentType,
        });
        await audit(ctx, {
          table: "gapClosureFunds", recordId: String(id),
          facilityId: args.facilityId, action: "create",
          field: "Gap Closure Fund",
          newValue: `FY ${args.gcFundYear || "2026-27"} — ₹${args.gapClosureAmount ?? 0}`,
          userName: user.name, userId: user._id,
        });
      } else {
        const fundPatch: Record<string, unknown> = {};
        const fundAudit = (field: string, k: keyof Doc<"gapClosureFunds">, nv: unknown) =>
          audit(ctx, {
            ...label(field, fund![k], nv),
            table: "gapClosureFunds", recordId: String(fund!._id),
          });
        if (args.gapClosureAmount !== undefined && changed(fund, "amountSanctioned", args.gapClosureAmount)) {
          fundPatch.amountSanctioned = args.gapClosureAmount;
          fundPatch.updatedAt = Date.now();
          await fundAudit("Gap Closure Amount", "amountSanctioned", args.gapClosureAmount);
        }
        if (args.gcFundYear !== undefined && args.gcFundYear && changed(fund, "financialYear", args.gcFundYear)) {
          fundPatch.financialYear = args.gcFundYear;
          await fundAudit("GC Fund Received Year", "financialYear", args.gcFundYear);
        }
        if (args.fundProcLink !== undefined && changed(fund, "procLink", args.fundProcLink || undefined)) {
          fundPatch.procLink = args.fundProcLink || undefined;
          await fundAudit("Gap Closure Amount Proc. Link", "procLink", args.fundProcLink || "(empty)");
        }
        if (args.fundStatus !== undefined && changed(fund, "status", args.fundStatus)) {
          fundPatch.status = args.fundStatus;
          await fundAudit("Fund Status", "status", args.fundStatus);
        }
        // Supporting document (sanction order etc.) uploaded in-row.
        if (args.fundAttachmentId !== undefined && String(fund.attachmentId ?? "") !== String(args.fundAttachmentId)) {
          fundPatch.attachmentId = args.fundAttachmentId;
          fundPatch.attachmentName = args.fundAttachmentName;
          fundPatch.attachmentType = args.fundAttachmentType;
          fundPatch.updatedAt = Date.now();
          await fundAudit("Gap Closure Fund — Supporting Document", "attachmentName", args.fundAttachmentName);
        }
        // Removal (Remove button) nulls the stored file.
        if (args.clearFundAttachment && fund.attachmentId) {
          fundPatch.attachmentId = undefined;
          fundPatch.attachmentName = undefined;
          fundPatch.attachmentType = undefined;
          await fundAudit("Gap Closure Fund — Supporting Document", "attachmentName", "(removed)");
        }
        if (Object.keys(fundPatch).length > 0) await ctx.db.patch(fund._id, fundPatch);
      }
    }

    // --- 6. fire NOC ---
    const wantsNoc =
      args.nocAvailable !== undefined || args.fireNocStatus !== undefined ||
      args.fireNocValidity !== undefined || args.nocLink !== undefined ||
      args.fireNocIssuedDate !== undefined || args.nocAttachmentId !== undefined;
    if (wantsNoc) {
      const existing = (
        await ctx.db
          .query("fireNocs")
          .withIndex("by_facility", (q) => q.eq("facilityId", args.facilityId))
          .collect()
      ).sort((a, b) => (b.expiryDate ?? "").localeCompare(a.expiryDate ?? ""));
      const noc = existing[0] ?? null;
      if (!noc) {
        const id = await ctx.db.insert("fireNocs", {
          facilityId: args.facilityId,
          nocAvailable: args.nocAvailable,
          status: args.fireNocStatus || (args.nocAvailable === "No" ? "Not Obtained" : "Valid"),
          issuedDate: args.fireNocIssuedDate || undefined,
          expiryDate: args.fireNocValidity || undefined,
          nocLink: args.nocLink,
          attachmentId: args.nocAttachmentId,
          attachmentName: args.nocAttachmentName,
          attachmentType: args.nocAttachmentType,
        });
        await audit(ctx, {
          table: "fireNocs", recordId: String(id),
          facilityId: args.facilityId, action: "create",
          field: "Fire NOC", newValue: args.fireNocStatus || "created",
          userName: user.name, userId: user._id,
        });
      } else {
        const nocPatch: Record<string, unknown> = {};
        const nocAudit = (field: string, k: keyof Doc<"fireNocs">, nv: unknown) =>
          audit(ctx, {
            ...label(field, noc![k], nv),
            table: "fireNocs", recordId: String(noc!._id),
          });
        if (args.nocAvailable !== undefined && changed(noc, "nocAvailable", args.nocAvailable)) {
          nocPatch.nocAvailable = args.nocAvailable;
          await nocAudit("NOC Available", "nocAvailable", args.nocAvailable);
        }
        if (args.fireNocStatus !== undefined && changed(noc, "status", args.fireNocStatus)) {
          nocPatch.status = args.fireNocStatus;
          nocPatch.updatedAt = Date.now();
          await nocAudit("Fire NOC Validity Status", "status", args.fireNocStatus);
        }
        if (args.fireNocIssuedDate !== undefined && changed(noc, "issuedDate", args.fireNocIssuedDate || undefined)) {
          nocPatch.issuedDate = args.fireNocIssuedDate || undefined;
          await nocAudit("NOC Issue Date", "issuedDate", args.fireNocIssuedDate || "(empty)");
        }
        if (args.fireNocValidity !== undefined && changed(noc, "expiryDate", args.fireNocValidity || undefined)) {
          nocPatch.expiryDate = args.fireNocValidity || undefined;
          await nocAudit("Fire NOC Validity", "expiryDate", args.fireNocValidity || "(empty)");
        }
        if (args.nocLink !== undefined && changed(noc, "nocLink", args.nocLink || undefined)) {
          nocPatch.nocLink = args.nocLink || undefined;
          await nocAudit("NOC Document Link", "nocLink", args.nocLink || "(empty)");
        }
        // NOC certificate document uploaded in-row.
        if (args.nocAttachmentId !== undefined && String(noc.attachmentId ?? "") !== String(args.nocAttachmentId)) {
          nocPatch.attachmentId = args.nocAttachmentId;
          nocPatch.attachmentName = args.nocAttachmentName;
          nocPatch.attachmentType = args.nocAttachmentType;
          nocPatch.updatedAt = Date.now();
          await nocAudit("Fire NOC — Certificate Document", "attachmentName", args.nocAttachmentName);
        }
        // Removal (Remove button) nulls the stored file.
        if (args.clearNocAttachment && noc.attachmentId) {
          nocPatch.attachmentId = undefined;
          nocPatch.attachmentName = undefined;
          nocPatch.attachmentType = undefined;
          await nocAudit("Fire NOC — Certificate Document", "attachmentName", "(removed)");
        }
        if (Object.keys(nocPatch).length > 0) await ctx.db.patch(noc._id, nocPatch);
      }
    }

    // --- 7. building ---
    const wantsBuilding =
      args.buildingType !== undefined || args.buildingStatus !== undefined ||
      args.condemnedLink !== undefined || args.condemnedAttachmentId !== undefined ||
      args.clearCondemnedAttachment !== undefined;
    if (wantsBuilding) {
      const existing = await ctx.db
        .query("buildingDetails")
        .withIndex("by_facility", (q) => q.eq("facilityId", args.facilityId))
        .first();
      if (!existing) {
        const id = await ctx.db.insert("buildingDetails", {
          facilityId: args.facilityId,
          buildingType: args.buildingType,
          buildingStatus: args.buildingStatus || "Good",
          condemnedLink: args.condemnedLink,
          // "Building Status (Last Updated on …)" — system generated.
          lastUpdatedAt: Date.now(),
          condemnedAttachmentId: args.condemnedAttachmentId,
          condemnedAttachmentName: args.condemnedAttachmentName,
          condemnedAttachmentType: args.condemnedAttachmentType,
        });
        await audit(ctx, {
          table: "buildingDetails", recordId: String(id),
          facilityId: args.facilityId, action: "create",
          field: "Building Details", newValue: args.buildingStatus || "Good",
          userName: user.name, userId: user._id,
        });
      } else {
        const bPatch: Record<string, unknown> = {};
        const bAudit = (field: string, k: keyof Doc<"buildingDetails">, nv: unknown) =>
          audit(ctx, {
            ...label(field, existing![k], nv),
            table: "buildingDetails", recordId: String(existing!._id),
          });
        if (args.buildingType !== undefined && changed(existing, "buildingType", args.buildingType)) {
          bPatch.buildingType = args.buildingType;
          await bAudit("Building Type", "buildingType", args.buildingType);
        }
        if (args.buildingStatus !== undefined && changed(existing, "buildingStatus", args.buildingStatus)) {
          bPatch.buildingStatus = args.buildingStatus;
          // Auto "Last Updated on" date, generated by the system on every
          // building-status change — never manually entered.
          bPatch.lastUpdatedAt = Date.now();
          await bAudit("Building Status", "buildingStatus", args.buildingStatus);
        }
        if (args.condemnedLink !== undefined && changed(existing, "condemnedLink", args.condemnedLink || undefined)) {
          bPatch.condemnedLink = args.condemnedLink || undefined;
          await bAudit("Condemned Document Link", "condemnedLink", args.condemnedLink || "(empty)");
        }
        // Condemnation order uploaded in-row.
        if (args.condemnedAttachmentId !== undefined && String(existing.condemnedAttachmentId ?? "") !== String(args.condemnedAttachmentId)) {
          bPatch.condemnedAttachmentId = args.condemnedAttachmentId;
          bPatch.condemnedAttachmentName = args.condemnedAttachmentName;
          bPatch.condemnedAttachmentType = args.condemnedAttachmentType;
          await bAudit("Condemned — Supporting Document", "condemnedAttachmentName", args.condemnedAttachmentName);
        }
        // Removal (Remove button) nulls the stored file.
        if (args.clearCondemnedAttachment && existing.condemnedAttachmentId) {
          bPatch.condemnedAttachmentId = undefined;
          bPatch.condemnedAttachmentName = undefined;
          bPatch.condemnedAttachmentType = undefined;
          await bAudit("Condemned — Supporting Document", "condemnedAttachmentName", "(removed)");
        }
        if (Object.keys(bPatch).length > 0) await ctx.db.patch(existing._id, bPatch);
      }
    }


    // Auto "Last Updated" stamp: any row save (Update button) refreshes the
    // facility-level timestamp shown in the master list's Last Updated
    // column. System-generated — never manually entered.
    await ctx.db.patch(args.facilityId, { updatedAt: Date.now() });

    await refreshFacilityStatus(
      ctx, args.facilityId, user.name ?? "Unknown", user._id, false,
    );
  },
});

// ---------- queries ----------

export const listBlocks = query({
  args: {},
  handler: async (ctx) => {
    await requireActivatedUser(ctx);
    const blocks = await ctx.db.query("blocks").collect();
    return blocks.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const listPhcs = query({
  args: {},
  handler: async (ctx) => {
    await requireActivatedUser(ctx);
    const phcs = await ctx.db.query("phcs").collect();
    return phcs.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** Master list rows: facility + latest-cycle summary, scoped by role. */
export const listFacilityRows = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    const blocks = await ctx.db.query("blocks").collect();
    blocks.sort((a, b) => a.name.localeCompare(b.name));
    const allowed = await allowedBlockNames(ctx, user);
    let facilities = await ctx.db.query("facilities").collect();
    if (allowed !== null) facilities = facilities.filter((f) => allowed.has(f.block));
    // Ascending hierarchy: Block → PHC → facility name (HSCs sort under
    // their PHC, matching the state facility order).
    facilities.sort(
      (a, b) =>
        a.block.localeCompare(b.block) ||
        a.phc.localeCompare(b.phc) ||
        a.name.localeCompare(b.name),
    );

    const rows = await Promise.all(
      facilities.map(async (f) => {
        let cycle: Doc<"certificationCycles"> | null = null;
        {
          const all = await ctx.db
            .query("certificationCycles")
            .withIndex("by_facility", (q) => q.eq("facilityId", f._id))
            .collect();
          all.sort((a, b) => a.cycleNumber - b.cycleNumber);
          // Same resolution as updateTrackerRow / listFacilityRowsFast: the
          // stored pointer first, then the active (non-superseded) cycle, then
          // the newest — a stale/0 currentCycleNumber can never hide the SA
          // and its uploaded attachments.
          cycle =
            all.find((c) => c.cycleNumber === f.currentCycleNumber) ??
            all.find((c) => !c.superseded) ??
            all[all.length - 1] ??
            null;
        }
        const sa = cycle
          ? (await ctx.db
              .query("stateAssessments")
              .withIndex("by_cycle", (q) => q.eq("cycleId", cycle!._id))
              .first()) ?? null
          : null;
        const nqas = cycle
          ? (await ctx.db
              .query("nationalAssessments")
              .withIndex("by_cycle", (q) => q.eq("cycleId", cycle!._id))
              .first()) ?? null
          : null;
        const [fund, noc, building] = await Promise.all([
          ctx.db
            .query("gapClosureFunds")
            .withIndex("by_facility", (q) => q.eq("facilityId", f._id))
            .collect(),
          ctx.db
            .query("fireNocs")
            .withIndex("by_facility", (q) => q.eq("facilityId", f._id))
            .collect(),
          ctx.db
            .query("buildingDetails")
            .withIndex("by_facility", (q) => q.eq("facilityId", f._id))
            .first(),
        ]);
        fund.sort((a, b) => b.financialYear.localeCompare(a.financialYear));
        noc.sort((a, b) => (b.expiryDate ?? "").localeCompare(a.expiryDate ?? ""));
        return {
          facility: f,
          cycleNumber: cycle?.cycleNumber ?? null,
          cycleType: cycle?.cycleType ?? null,
          recertStage: cycle?.recertStage ?? null,
          sa: sa
            ? {
                status: sa.status,
                scheduledDate: sa.scheduledDate ?? null,
                revisedDate: sa.revisedDate ?? null,
                actualStartDate: sa.actualStartDate ?? null,
                actualEndDate: sa.actualEndDate ?? null,
                scorePercent: sa.scorePercent ?? null,
                generalDocStatus: sa.generalDocStatus ?? null,
              }
            : null,
          nqas: nqas
            ? {
                status: nqas.status,
                scheduledStartDate: nqas.scheduledStartDate ?? null,
                scheduledEndDate: nqas.scheduledEndDate ?? null,
                actualEndDate: nqas.actualEndDate ?? null,
                mode: nqas.mode ?? null,
                departments: nqas.departments ?? null,
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
          fund: fund[0]
            ? {
                amountSanctioned: fund[0].amountSanctioned ?? null,
                financialYear: fund[0].financialYear,
                procLink: fund[0].procLink ?? null,
                fundAttachmentId: fund[0].attachmentId
                  ? String(fund[0].attachmentId)
                  : null,
                fundAttachmentName: fund[0].attachmentName ?? null,
                updatedAt: fund[0].updatedAt ?? null,
                status: fund[0].status,
              }
            : null,
          noc: noc[0]
            ? {
                nocAvailable: noc[0].nocAvailable ?? null,
                status: noc[0].status,
                issuedDate: noc[0].issuedDate ?? null,
                expiryDate: noc[0].expiryDate ?? null,
                nocLink: noc[0].nocLink ?? null,
                nocAttachmentId: noc[0].attachmentId
                  ? String(noc[0].attachmentId)
                  : null,
                nocAttachmentName: noc[0].attachmentName ?? null,
                updatedAt: noc[0].updatedAt ?? null,
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
      }),
    );
    return {
      rows,
      blocks: blocks.map((b) => ({ _id: String(b._id), name: b.name })),
      me: { appRole: user.appRole, blockIds: (user.blockIds ?? []).map(String) },
    };
  },
});

export const getFacilityProfile = query({
  args: { facilityId: v.id("facilities") },
  handler: async (ctx, { facilityId }) => {
    const user = await requireActivatedUser(ctx);
    const facility = await ctx.db.get(facilityId);
    if (!facility) return null;
    const allowed = await allowedBlockNames(ctx, user);
    if (allowed !== null && !allowed.has(facility.block)) return null;

    const cycles = await ctx.db
      .query("certificationCycles")
      .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
      .collect();
    cycles.sort((a, b) => a.cycleNumber - b.cycleNumber);
    const cycleDetails = await Promise.all(
      cycles.map(async (cycle) => {
        const sa =
          (await ctx.db
            .query("stateAssessments")
            .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
            .first()) ?? null;
        const nqas =
          (await ctx.db
            .query("nationalAssessments")
            .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
            .first()) ?? null;
        return { cycle, sa, nqas };
      }),
    );
    const audits = await ctx.db
      .query("auditLogs")
      .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
      .collect();
    audits.sort((a, b) => b.changedAt - a.changedAt);
    const [funds, nocs, buildings] = await Promise.all([
      ctx.db
        .query("gapClosureFunds")
        .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
        .collect(),
      ctx.db
        .query("fireNocs")
        .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
        .collect(),
      ctx.db
        .query("buildingDetails")
        .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
        .collect(),
    ]);
    const settings = await getSettings(ctx);
    // The active cycle's shared lifecycle view — the profile's stage stepper
    // reads the exact same fields the dashboard, summaries and decks read, so
    // it can never show a different stage or next action. (No active cycle ⇒
    // no SA/NQAS records ⇒ the eligibility-only stage.)
    const activeCycle =
      cycleDetails.find((c) => !c.cycle.superseded) ??
      cycleDetails[cycleDetails.length - 1] ??
      null;
    const lifecycle = deriveLifecycleView(
      facility,
      activeCycle?.sa ?? null,
      activeCycle?.nqas ?? null,
      settings,
      todayIso(),
    );
    return {
      facility,
      cycles: cycleDetails,
      audits,
      funds,
      nocs,
      buildings,
      lifecycle,
      settings,
      me: { appRole: user.appRole },
    };
  },
});

/**
 * ALL cycles of one facility, with every value the sheet's history pages and
 * the Profile/Quick View "Cycle history" section print. Read-only metadata:
 * never a Drive id, link or storage name.
 */
export const getFacilityCycleHistory = query({
  args: { facilityId: v.id("facilities") },
  handler: async (ctx, { facilityId }) => {
    const user = await requireActivatedUser(ctx);
    const facility = await ctx.db.get(facilityId);
    if (!facility) return null;
    const allowed = await allowedBlockNames(ctx, user);
    if (allowed !== null && !allowed.has(facility.block)) return null;

    const [cycles, docs, audits, settings, annexure, annexureAreas, annexureDepartments] =
      await Promise.all([
        ctx.db.query("certificationCycles").withIndex("by_facility", (q) => q.eq("facilityId", facilityId)).collect(),
        ctx.db.query("facilityDocuments").withIndex("by_facility", (q) => q.eq("facilityId", facilityId)).collect(),
        ctx.db.query("auditLogs").withIndex("by_facility", (q) => q.eq("facilityId", facilityId)).collect(),
        getSettings(ctx),
        ctx.db.query("annexureScores").withIndex("by_facility", (q) => q.eq("facilityId", facilityId)).collect(),
        ctx.db.query("annexureAreaScores").withIndex("by_facility_cycle", (q) => q.eq("facilityId", facilityId)).collect(),
        ctx.db.query("annexureDepartmentScores").withIndex("by_facility_cycle", (q) => q.eq("facilityId", facilityId)).collect(),
      ]);
    cycles.sort((a, b) => a.cycleNumber - b.cycleNumber);

    const rows = await Promise.all(
      cycles.map(async (cycle) => {
        const [sa, nqas] = await Promise.all([
          ctx.db.query("stateAssessments").withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id)).first(),
          ctx.db.query("nationalAssessments").withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id)).first(),
        ]);
        const score = annexure.find((a) => String(a.cycleId) === String(cycle._id)) ?? null;
        const cycleAreas = score
          ? annexureAreas.filter((a) => String(a.scoreId) === String(score._id))
          : [];
        const cycleDepartments = score
          ? annexureDepartments.filter((d) => String(d.scoreId) === String(score._id))
          : [];
        const cycleDocs = docs
          .filter((d) => d.cycleNo === cycle.cycleNumber && !d.removedAt && d.isCurrent)
          .sort((a, b) => a.docKey.localeCompare(b.docKey));
        const docIds = new Set(cycleDocs.map((d) => String(d._id)));
        const refs = new Set<string>([String(cycle._id)]);
        if (sa) refs.add(String(sa._id));
        if (nqas) refs.add(String(nqas._id));
        for (const id of docIds) refs.add(id);
        const cycleAudits = audits
          .filter((a) => refs.has(a.recordId))
          .sort((a, b) => b.changedAt - a.changedAt)
          .slice(0, 20)
          .map((a) => ({
            changedAt: a.changedAt,
            changedByName: a.changedByName ?? null,
            field: a.field ?? null,
            action: a.action,
            newValue:
              a.newValue == null
                ? null
                : typeof a.newValue === "string"
                  ? a.newValue
                  : JSON.stringify(a.newValue),
            table: a.table,
          }));
        const inferred =
          (!sa && !nqas) ||
          audits.some(
            (a) =>
              refs.has(a.recordId) &&
              /migrat|legacy|import/i.test(`${a.source ?? ""} ${a.fileName ?? ""}`),
          );
        return {
          cycle: {
            cycleNumber: cycle.cycleNumber,
            cycleType: cycle.cycleType,
            createdAt: cycle.createdAt ?? null,
            superseded: cycle.superseded ?? false,
          },
          inferred,
          sa: sa
            ? {
                status: sa.status,
                scheduledDate: sa.scheduledDate ?? null,
                actualStartDate: sa.actualStartDate ?? null,
                actualEndDate: sa.actualEndDate ?? null,
                scorePercent: sa.scorePercent ?? null,
                assessor1Name: sa.assessor1Name ?? null,
                assessor1Hud: sa.assessor1Hud ?? sa.assessorHud ?? null,
                assessor1Designation: sa.assessor1Designation ?? null,
                assessor1Phone: sa.assessor1Phone ?? null,
                assessor2Name: sa.assessor2Name ?? null,
                assessor2Hud: sa.assessor2Hud ?? null,
                assessor2Designation: sa.assessor2Designation ?? null,
                assessor2Phone: sa.assessor2Phone ?? null,
              }
            : null,
          nqas: nqas
            ? {
                status: nqas.status,
                scheduledStartDate: nqas.scheduledStartDate ?? null,
                scheduledEndDate: nqas.scheduledEndDate ?? null,
                actualStartDate: nqas.actualStartDate ?? null,
                actualEndDate: nqas.actualEndDate ?? null,
                mode: nqas.mode ?? null,
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
                manualRecertStatus: nqas.manualRecertStatus ?? null,
                recertYear: nqas.recertYear ?? null,
              }
            : null,
          documents: cycleDocs.map((d) => ({
            id: String(d._id),
            key: d.docKey,
            label: d.docKey.replace(/_/g, " "),
            name: d.originalName,
            uploadedAt: d.uploadedAt,
          })),
          scores: score
            ? {
                overall: score.overallScore ?? null,
                pss: score.pssScore ?? null,
                letterScore: score.letterScore ?? null,
                areas: cycleAreas.map((a) => ({
                  key: a.areaKey,
                  name: a.areaName,
                  score: a.score,
                })),
                departments: cycleDepartments.map((d) => ({
                  name: d.name,
                  canonicalName: d.canonicalName,
                  score: d.score,
                  isNew: d.isNew === true,
                })),
              }
            : null,
          audits: cycleAudits,
        };
      }),
    );
    return { facilityId: String(facility._id), currentCycleNumber: facility.currentCycleNumber ?? null, cycles: rows, settings };
  },
});

/* The facility's newest audit entries — the two-page sheet's "Recent
   changes" block. Deliberately light: getFacilityProfile loads every cycle,
   fund, NOC and building, while the sheet needs five lines. */
export const getFacilityAuditTrail = query({
  args: { facilityId: v.id("facilities"), limit: v.optional(v.number()) },
  handler: async (ctx, { facilityId, limit }) => {
    const user = await requireActivatedUser(ctx);
    const facility = await ctx.db.get(facilityId);
    if (!facility) return [];
    const allowed = await allowedBlockNames(ctx, user);
    if (allowed !== null && !allowed.has(facility.block)) return [];
    const rows = await ctx.db
      .query("auditLogs")
      .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
      .collect();
    rows.sort((a, b) => b.changedAt - a.changedAt);
    return rows.slice(0, Math.max(1, Math.min(limit ?? 5, 20))).map((r) => ({
      changedAt: r.changedAt,
      changedByName: r.changedByName ?? null,
      field: r.field ?? null,
      action: r.action,
      newValue:
        r.newValue == null
          ? null
          : typeof r.newValue === "string"
            ? r.newValue
            : JSON.stringify(r.newValue),
    }));
  },
});

// ---------- dashboard ----------

export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    const blocks = await ctx.db.query("blocks").collect();
    blocks.sort((a, b) => a.name.localeCompare(b.name));
    const allowed = await allowedBlockNames(ctx, user);
    let facilities = await ctx.db.query("facilities").collect();
    if (allowed !== null) facilities = facilities.filter((f) => allowed.has(f.block));
    const s = await getSettings(ctx);
    const today = todayIso();

    type BlockStat = {
      total: number; certified: number; conditional: number;
      deferred: number; inProgress: number; notStarted: number; dueSoon: number;
    };
    const perBlock: Record<string, BlockStat> = {};
    // Per-PHC breakdown — powers the PHC-wise progress report that block
    // (data entry) logins see instead of the state-wide block tiles.
    const perPhc: Record<
      string,
      BlockStat & { block: string }
    > = {};
    // Returned as an array of {status, count} rows instead of a keyed object:
    // Convex serializes object keys as field names (ASCII only), so status
    // labels like "Certified — Surveillance Due" would crash serialization.
    const statusCounts: { status: string; count: number }[] = [];
    const statusIndex = new Map<string, number>();
    let certified = 0, conditional = 0, deferred = 0, recertDue = 0, eligible = 0;
    const alerts: { facilityId: string; name: string; block: string; alert: string; tone: string }[] = [];

    for (const f of facilities) {
      const b: BlockStat = perBlock[f.block] ?? {
        total: 0, certified: 0, conditional: 0, deferred: 0,
        inProgress: 0, notStarted: 0, dueSoon: 0,
      };
      b.total += 1;
      // Fold legacy candidate spellings into the current label so the
      // dashboard distribution never shows two slices for one meaning.
      const st =
        f.currentStatus === "Possible Future Candidate" ||
        f.currentStatus === "Possible (future candidate)"
          ? "Facility (Future Candidate)"
          : f.currentStatus;
      const idx = statusIndex.get(st);
      if (idx === undefined) {
        statusIndex.set(st, statusCounts.length);
        statusCounts.push({ status: st, count: 1 });
      } else {
        statusCounts[idx].count += 1;
      }
      if (st.startsWith("Certified —")) { certified += 1; b.certified += 1; }
      else if (st.includes("Conditionality")) { conditional += 1; b.conditional += 1; }
      else if (st.startsWith("Deferred")) { deferred += 1; b.deferred += 1; }
      else if (st === "Recertification Due") { recertDue += 1; b.dueSoon += 1; }
      else if (
        st.startsWith("SA Scheduled") || st.startsWith("NQAS") ||
        st.startsWith("SA Completed") || st === "Result Awaited" ||
        st === "Eligible for Re-Assessment"
      ) {
        b.inProgress += 1;
      } else {
        b.notStarted += 1;
      }
      if (f.eligibility === "Eligible") eligible += 1;
      perBlock[f.block] = b;

      const phcKey = `${f.block} / ${f.phc}`;
      const p = perPhc[phcKey] ?? {
        block: f.block,
        total: 0, certified: 0, conditional: 0, deferred: 0,
        inProgress: 0, notStarted: 0, dueSoon: 0,
      };
      p.total += 1;
      if (st.startsWith("Certified —")) p.certified += 1;
      else if (st.includes("Conditionality")) p.conditional += 1;
      else if (st.startsWith("Deferred")) p.deferred += 1;
      else if (st === "Recertification Due") p.dueSoon += 1;
      else if (
        st.startsWith("SA Scheduled") || st.startsWith("NQAS") ||
        st.startsWith("SA Completed") || st === "Result Awaited" ||
        st === "Eligible for Re-Assessment"
      ) {
        p.inProgress += 1;
      } else {
        p.notStarted += 1;
      }
      perPhc[phcKey] = p;
    }

    // Alerts: find latest NQAS validity per facility for due-soon flags.
    for (const f of facilities) {
      const all = await ctx.db
        .query("certificationCycles")
        .withIndex("by_facility", (q) => q.eq("facilityId", f._id))
        .collect();
      all.sort((a, b) => a.cycleNumber - b.cycleNumber);
      const active =
        all.find((c) => c.cycleNumber === f.currentCycleNumber) ??
        all.find((c) => !c.superseded) ??
        all[all.length - 1] ??
        null;
      if (!active) continue;
      const nqas = await ctx.db
        .query("nationalAssessments")
        .withIndex("by_cycle", (q) => q.eq("cycleId", active._id))
        .first();
      if (!nqas?.validityDate) continue;
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
    alerts.sort((a, b) => a.alert.localeCompare(b.alert));

    return {
      role: user.appRole,
      myBlockNames:
        user.appRole === "entry"
          ? await (async () => {
              const names: string[] = [];
              for (const id of user.blockIds ?? []) {
                const b = await ctx.db.get(id);
                if (b) names.push(b.name);
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
      },
      statusCounts,
      perBlock: Object.entries(perBlock)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      perPhc: Object.entries(perPhc)
        .map(([name, v]) => ({ name, ...v }))
        .sort(
          (a, b) =>
            a.block.localeCompare(b.block) || a.name.localeCompare(b.name),
        ),
      alerts: alerts.slice(0, 8),
      today,
      settings: s,
    };
  },
});

// ---------- admin ----------

/** Lightweight settings query for data pages — the master list, category
 *  pages and reports only need the dropdown lists and header overrides, not
 *  the full user/block directory getAdminData ships on every load. */
export const getAppSettings = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    const settingsRows = await ctx.db.query("appSettings").collect();
    return {
      isAdmin: me.appRole === "admin",
      appRole: me.appRole,
      settings: Object.fromEntries(settingsRows.map((r) => [r.key, r.value])),
    };
  },
});

export const getAdminData = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    const [blocks, phcs, settingsRows, allUsers] = await Promise.all([
      ctx.db.query("blocks").collect(),
      ctx.db.query("phcs").collect(),
      ctx.db.query("appSettings").collect(),
      ctx.db.query("users").collect(),
    ]);
    // Legacy anonymous (guest) accounts are not real registrations — hide them
    // from user management entirely.
    const users = allUsers.filter((u) => !u.isAnonymous);
    const sessionMeta = await ctx.db.query("sessionMeta").collect();
    const lastActiveByUser = new Map<string, number>();
    for (const m of sessionMeta) {
      const key = String(m.userId);
      lastActiveByUser.set(key, Math.max(lastActiveByUser.get(key) ?? 0, m.lastActive));
    }
    blocks.sort((a, b) => a.name.localeCompare(b.name));
    phcs.sort((a, b) => a.name.localeCompare(b.name));
    const facilityCounts: Record<string, number> = {};
    for (const f of await ctx.db.query("facilities").collect()) {
      facilityCounts[f.block] = (facilityCounts[f.block] ?? 0) + 1;
    }
    return {
      isAdmin: me.appRole === "admin",
      blocks: blocks.map((b) => ({
        _id: String(b._id), name: b.name, count: facilityCounts[b.name] ?? 0,
      })),
      phcs: phcs.map((p) => ({
        _id: String(p._id), name: p.name, block: p.block,
      })),
      settings: Object.fromEntries(settingsRows.map((r) => [r.key, r.value])),
      users: users
        .map((u) => ({
          _id: String(u._id),
          name: u.name ?? null,
          email: u.email ?? null,
          appRole: u.appRole ?? null,
          approved: !!u.appRole,
          disabled: u.disabled === true,
          lastActive: lastActiveByUser.get(String(u._id)) ?? null,
          blockIds: (u.blockIds ?? []).map(String),
          designation: u.designation ?? null,
        }))
        .sort((a, b) => (a.email ?? "").localeCompare(b.email ?? "")),
      me: { id: String(me._id), appRole: me.appRole },
    };
  },
});

// ---------- danger zone: delete all facilities (OTP-gated) ----------

const DELETE_ALL_PURPOSE = "delete_all_facilities";

export const getMyRoleInternal = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return { appRole: user.appRole ?? null };
  },
});

export const getOtpChallengeInternal = internalQuery({
  args: { purpose: v.string() },
  handler: async (ctx, { purpose }) => {
    return await ctx.db
      .query("otpChallenges")
      .withIndex("by_purpose", (q) => q.eq("purpose", purpose))
      .first();
  },
});

export const insertOtpChallengeInternal = internalMutation({
  args: {
    purpose: v.string(),
    email: v.string(),
    codeHash: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, { purpose, email, codeHash, expiresAt }) => {
    await ctx.db.insert("otpChallenges", {
      purpose,
      email,
      codeHash,
      expiresAt,
      attempts: 0,
    });
  },
});

export const patchOtpChallengeInternal = internalMutation({
  args: { id: v.id("otpChallenges"), codeHash: v.string(), expiresAt: v.number() },
  handler: async (ctx, { id, codeHash, expiresAt }) => {
    await ctx.db.patch(id, { codeHash, expiresAt, attempts: 0 });
  },
});

export const bumpOtpAttemptsInternal = internalMutation({
  args: { id: v.id("otpChallenges") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (row) await ctx.db.patch(id, { attempts: (row.attempts ?? 0) + 1 });
  },
});

export const consumeOtpChallengeInternal = internalMutation({
  args: { id: v.id("otpChallenges") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

/** The actual purge — runs as one mutation so it is atomic. */
type DeleteAllResult = {
  deletedFacilities: number;
  deletedCycles: number;
  deletedModuleRecords: number;
};

export const deleteAllFacilitiesInternal = internalMutation({
  args: {},
  handler: async (ctx): Promise<DeleteAllResult> => {
    const facilities = await ctx.db.query("facilities").collect();
    let cycles = 0;
    let moduleRecords = 0;
    for (const f of facilities) {
      const facCycles = await ctx.db
        .query("certificationCycles")
        .withIndex("by_facility", (q) => q.eq("facilityId", f._id))
        .collect();
      for (const cycle of facCycles) {
        for (const table of [
          "stateAssessments",
          "nationalAssessments",
        ] as const) {
          const rows = await ctx.db
            .query(table)
            .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
            .collect();
          for (const row of rows) await ctx.db.delete(row._id);
        }
        await ctx.db.delete(cycle._id);
        cycles += 1;
      }
      for (const table of [
        "gapClosureFunds",
        "fireNocs",
        "buildingDetails",
      ] as const) {
        const rows = await ctx.db
          .query(table)
          .withIndex("by_facility", (q) => q.eq("facilityId", f._id))
          .collect();
        for (const row of rows) {
          await ctx.db.delete(row._id);
          moduleRecords += 1;
        }
      }
      const audits = await ctx.db
        .query("auditLogs")
        .withIndex("by_facility", (q) => q.eq("facilityId", f._id))
        .collect();
      for (const a of audits) await ctx.db.delete(a._id);
      await ctx.db.delete(f._id);
    }
    return {
      deletedFacilities: facilities.length,
      deletedCycles: cycles,
      deletedModuleRecords: moduleRecords,
    };
  },
});

/** SHA-256 hex digest via WebCrypto (available in Convex actions). */
async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Step 1 of the danger zone: email a 6-digit code to the designated
 *  super-admin address. Only the State Admin can request it. */
export const requestDeleteAllOtp = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const me = await ctx.runMutation(internal.facilities.getMyRoleInternal, {
      userId,
    });
    if (!me || me.appRole !== "admin")
      throw new Error("Only the State Admin can delete all facilities");

    const targetEmail = "dphtptquality@gmail.com";
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256Hex(code + ":" + targetEmail);

    // Replace any previous challenge for this purpose.
    const existing = await ctx.runQuery(
      internal.facilities.getOtpChallengeInternal,
      { purpose: DELETE_ALL_PURPOSE },
    );
    if (existing) {
      await ctx.runMutation(internal.facilities.patchOtpChallengeInternal, {
        id: existing._id,
        codeHash,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
    } else {
      await ctx.runMutation(internal.facilities.insertOtpChallengeInternal, {
        purpose: DELETE_ALL_PURPOSE,
        email: targetEmail,
        codeHash,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
    }

    // Same OTP mail relay the sign-in codes use.
    await axios.post(
      "https://auth.freebuff.app/send_otp",
      {
        to: targetEmail,
        otp: code,
        appName:
          process.env.VLY_APP_NAME || "NQAS & Kayakalp Facility Tracker",
      },
      { headers: { "x-api-key": process.env.VLY_OTP_API_KEY ?? "fb_email_2crN1hqIArZP2bEfvjp5Qik4" } },
    );
    return { sentTo: targetEmail };
  },
});

/** Step 2: verify the emailed code and delete EVERY facility with all
 *  cycles, assessments, module records and facility-scoped audit logs. */
export const deleteAllFacilities = action({
  args: { code: v.string() },
  handler: async (ctx, { code }): Promise<DeleteAllResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const me = await ctx.runMutation(internal.facilities.getMyRoleInternal, {
      userId,
    });
    if (!me || me.appRole !== "admin")
      throw new Error("Only the State Admin can delete all facilities");

    const challenge = await ctx.runQuery(
      internal.facilities.getOtpChallengeInternal,
      { purpose: DELETE_ALL_PURPOSE },
    );
    if (!challenge)
      throw new Error("No verification code was requested. Click 'Send code' first.");
    if (challenge.expiresAt < Date.now())
      throw new Error("This code has expired. Request a new one.");
    if (challenge.attempts >= 5)
      throw new Error("Too many wrong attempts. Request a new code.");

    const codeHash = await sha256Hex(code.trim() + ":" + challenge.email);
    if (codeHash !== challenge.codeHash) {
      await ctx.runMutation(internal.facilities.bumpOtpAttemptsInternal, {
        id: challenge._id,
      });
      throw new Error("Incorrect code — check the latest email and try again.");
    }

    const result: DeleteAllResult = await ctx.runMutation(
      internal.facilities.deleteAllFacilitiesInternal,
      {},
    );
    await ctx.runMutation(internal.facilities.consumeOtpChallengeInternal, {
      id: challenge._id,
    });
    return result;
  },
});

/** Recompute the auto status for every facility and bootstrap missing
 *  cycle #1 for eligible ones (fixes imported/stale data in bulk). */
export const recomputeAllStatuses = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user))
      throw new Error("Only the State Admin can recompute statuses");
    const facilities = await ctx.db.query("facilities").collect();
    let updated = 0;
    for (const f of facilities) {
      const before = f.currentStatus;
      const after = await refreshFacilityStatus(
        ctx, f._id, user.name ?? "Unknown", user._id, true,
      );
      if (before !== after) updated += 1;
    }
    return { total: facilities.length, updated };
  },
});

export const setSetting = mutation({
  args: { key: v.string(), value: v.any() },
  handler: async (ctx, { key, value }) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user)) throw new Error("Only the State Admin can change settings");
    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    const oldValue = existing?.value;
    if (existing) await ctx.db.patch(existing._id, { value });
    else await ctx.db.insert("appSettings", { key, value });
    await audit(ctx, {
      table: "appSettings",
      recordId: key,
      action: "update",
      field: key,
      oldValue: oldValue === undefined ? "(default)" : JSON.stringify(oldValue),
      newValue: JSON.stringify(value),
      userName: user.name,
      userId: user._id,
    });
  },
});

export const addBlock = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user)) throw new Error("Only the State Admin can manage blocks");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Block name is required");
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_name", (q) => q.eq("name", trimmed))
      .first();
    if (existing) throw new Error("Block already exists");
    const id = await ctx.db.insert("blocks", { name: trimmed, active: true });
    await audit(ctx, {
      table: "blocks", recordId: String(id), action: "create",
      field: "Block", newValue: trimmed, userName: user.name, userId: user._id,
    });
    return id;
  },
});

export const addPhc = mutation({
  args: { name: v.string(), block: v.string() },
  handler: async (ctx, { name, block }) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user)) throw new Error("Only the State Admin can manage PHCs");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("PHC name is required");
    const id = await ctx.db.insert("phcs", { name: trimmed, block, active: true });
    await audit(ctx, {
      table: "phcs", recordId: String(id), action: "create",
      field: "PHC", newValue: `${trimmed} (${block})`, userName: user.name, userId: user._id,
    });
    return id;
  },
});

export const setUserAccess = mutation({
  args: {
    userId: v.id("users"),
    appRole: v.optional(v.string()),
    blockIds: v.optional(v.array(v.id("blocks"))),
    name: v.optional(v.string()),
    designation: v.optional(v.string()),
  },
  handler: async (ctx, { userId, appRole, blockIds, name, designation }) => {
    const actor = await requireActivatedUser(ctx);
    if (!canEditAll(actor)) throw new Error("Only the State Admin can manage users");
    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");
    const patch: Record<string, unknown> = {};
    if (appRole !== undefined) {
      if (!APP_ROLES.includes(appRole as (typeof APP_ROLES)[number]))
        throw new Error("Invalid role");
      // Lock-out guards (mirror the delete guard in users.deleteUser): an
      // admin can neither demote themselves nor remove the *last* State
      // Admin, so the workspace can never end up with nobody who can manage
      // users, settings or the danger zone.
      if (appRole !== "admin") {
        if (String(userId) === String(actor._id))
          throw new Error(
            "You cannot demote your own State Admin account — ask another admin",
          );
        if (target.appRole === "admin") {
          const otherAdmins = (await ctx.db.query("users").collect()).filter(
            (u) =>
              u.appRole === "admin" &&
              !u.disabled &&
              String(u._id) !== String(userId),
          );
          if (otherAdmins.length === 0)
            throw new Error(
              "Cannot demote the only State Admin — promote another user first",
            );
        }
      }
      patch.appRole = appRole;
      await audit(ctx, {
        table: "users", recordId: String(userId), action: "update",
        field: "Role", oldValue: target.appRole ?? "(none)", newValue: appRole,
        userName: actor.name, userId: actor._id,
      });
    }
    if (blockIds !== undefined) {
      patch.blockIds = blockIds;
      await audit(ctx, {
        table: "users", recordId: String(userId), action: "update",
        field: "Assigned Blocks", oldValue: (target.blockIds ?? []).length,
        newValue: blockIds.length, userName: actor.name, userId: actor._id,
      });
    }
    if (name !== undefined) patch.name = name;
    if (designation !== undefined) patch.designation = designation;
    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(userId, patch);
  },
});

/** Admin approves a pending registration (grants Viewer until role is set). */
export const approveUser = mutation({
  args: { userId: v.id("users"), appRole: v.optional(v.string()) },
  handler: async (ctx, { userId, appRole }) => {
    const actor = await requireActivatedUser(ctx);
    if (!canEditAll(actor)) throw new Error("Only the State Admin can approve registrations");
    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");
    if (target.appRole) throw new Error("User is already approved");
    const role =
      appRole && APP_ROLES.includes(appRole as (typeof APP_ROLES)[number])
        ? appRole
        : "viewer";
    await ctx.db.patch(userId, { appRole: role });
    await audit(ctx, {
      table: "users", recordId: String(userId), action: "update",
      field: "Registration approved", oldValue: "(pending)", newValue: role,
      userName: actor.name, userId: actor._id,
    });
  },
});

// ---------- demo seed ----------

export const seedDemoData = mutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user)) throw new Error("Only the State Admin can seed demo data");
    if (force) {
      // Full demo reset: wipe all facility-related data (users and app
      // settings are kept) so the fixed seed can run again.
      for (const table of [
        "gapClosureFunds",
        "fireNocs",
        "buildingDetails",
        "stateAssessments",
        "nationalAssessments",
        "certificationCycles",
        "auditLogs",
        "facilities",
        "phcs",
        "blocks",
      ] as const) {
        for (const row of await ctx.db.query(table).collect()) {
          await ctx.db.delete(row._id);
        }
      }
    }
    const existing = await ctx.db.query("facilities").collect();
    if (existing.length > 0) throw new Error("Facilities already exist — seed skipped");

    const blockNames = ["Bhadrachalam", "Chintalapudi", "Dwaraka Tirumala", "Eluru Rural", "Eluru Urban"];
    const blockIds: Record<string, Id<"blocks">> = {};
    for (const name of blockNames) {
      const id = await ctx.db.insert("blocks", { name, active: true });
      blockIds[name] = id;
      await audit(ctx, {
        table: "blocks", recordId: String(id), action: "seed",
        field: "Block", newValue: name, userName: "System seed",
      });
    }
    const phcByBlock: Record<string, string[]> = {
      Bhadrachalam: ["Bhadrachalam PHC", "Aswaraopeta PHC"],
      Chintalapudi: ["Chintalapudi PHC", "Kukunoor PHC"],
      "Dwaraka Tirumala": ["Dwaraka Tirumala PHC", "Kamavarapukota PHC"],
      "Eluru Rural": ["Eluru Rural PHC", "Pedapadu PHC"],
      "Eluru Urban": ["Eluru Urban PHC", "Tadepalligudem PHC"],
    };
    for (const [block, phcs] of Object.entries(phcByBlock)) {
      for (const phc of phcs) {
        await ctx.db.insert("phcs", { name: phc, block, active: true });
      }
    }

    const today = todayIso();
    const yearAgo = addYearsToIso(today, -1);
    const s = await getSettings(ctx);
    const actor = "System seed";

    // Seed the three cross-facility trackers (Gap Closure Fund / Fire NOC /
    // Building) with realistic records matching each lifecycle scenario.
    const addModuleRecords = async (
      facilityId: Id<"facilities">,
      i: number,
      scenario: Plan["scenario"],
    ) => {
      const fy = i % 2 === 0 ? "2025-26" : "2024-25";
      const nocNumber = `NOC/${fy}/${101 + i}`;
      const builtYear = ["1998", "2006", "2012", "2017"][i % 4];
      const fund = (f: Partial<Doc<"gapClosureFunds">>) =>
        ctx.db.insert("gapClosureFunds", {
          facilityId,
          financialYear: fy,
          status: "Pending",
          ...f,
        });
      const noc = (n: Partial<Doc<"fireNocs">>) =>
        ctx.db.insert("fireNocs", { facilityId, status: "Not Obtained", ...n });
      const building = (
        buildingStatus: string,
        extra?: Partial<Doc<"buildingDetails">>,
      ) =>
        ctx.db.insert("buildingDetails", {
          facilityId,
          buildingStatus,
          yearOfConstruction: builtYear,
          lastRenovationDate: addMonthsToIso(today, -(6 + i * 3)),
          ...extra,
        });

      switch (scenario) {
        case "certified":
          await fund({
            amountSanctioned: 500000,
            amountReleased: 500000,
            amountUtilized: 468000,
            status: "Utilized",
            sanctionedDate: addMonthsToIso(today, -16),
            utilizedDate: addMonthsToIso(today, -13),
            remarks: "Labour room & lab gap items closed before assessment",
          });
          await noc({
            nocNumber,
            issuedDate: addMonthsToIso(today, -16),
            expiryDate: addMonthsToIso(today, 20),
            status: "Valid",
          });
          await building("Good");
          break;
        case "conditional":
          await fund({
            amountSanctioned: 300000,
            amountReleased: 300000,
            amountUtilized: 215000,
            status: "Utilized",
            sanctionedDate: addMonthsToIso(today, -11),
            utilizedDate: addMonthsToIso(today, -8),
            remarks: "Conditionality items under closure",
          });
          await noc({
            nocNumber,
            issuedDate: addMonthsToIso(today, -13),
            expiryDate: addMonthsToIso(today, 2),
            status: "Expiring Soon",
          });
          await building("Needs Repair", {
            renovationFundRequired: 150000,
            remarks: "Painting & plumbing pending",
          });
          break;
        case "nqas-scheduled":
          await fund({
            amountSanctioned: 400000,
            amountReleased: 250000,
            amountUtilized: 120000,
            status: "Received",
            sanctionedDate: addMonthsToIso(today, -3),
          });
          await noc({
            nocNumber,
            issuedDate: addMonthsToIso(today, -12),
            expiryDate: addMonthsToIso(today, 2),
            status: "Expiring Soon",
            renewalAppliedDate: addMonthsToIso(today, -1),
          });
          await building("Good");
          break;
        case "sa-done":
          await fund({
            amountSanctioned: 350000,
            status: "Pending",
            sanctionedDate: addMonthsToIso(today, -2),
          });
          await noc({
            nocNumber,
            issuedDate: addMonthsToIso(today, -10),
            expiryDate: addMonthsToIso(today, 14),
            status: "Valid",
          });
          await building("Good");
          break;
        case "sa-scheduled":
          await fund({ amountSanctioned: 200000, status: "Pending" });
          if (i % 2 === 0) {
            await noc({ remarks: "Application submitted to RFO" });
          } else {
            await noc({
              nocNumber,
              issuedDate: addMonthsToIso(today, -20),
              expiryDate: addMonthsToIso(today, 1),
              status: "Expiring Soon",
            });
          }
          await building("Needs Repair", { renovationFundRequired: 250000 });
          break;
        case "not-initiated":
          if (i % 3 !== 2) {
            if (i % 2 === 0) await noc({ remarks: "NOC not yet applied" });
            else
              await noc({
                nocNumber,
                issuedDate: addMonthsToIso(today, -30),
                expiryDate: addMonthsToIso(today, -4),
                status: "Expired",
              });
          }
          if (i % 2 === 0) await building("Good");
          else
            await building("Dilapidated", {
              renovationFundRequired: 600000,
              remarks: "Old block — major repairs needed",
            });
          break;
        case "deferred-cooling":
          await fund({
            amountSanctioned: 450000,
            amountReleased: 200000,
            status: "Returned",
            sanctionedDate: addMonthsToIso(today, -4),
            remarks: "Utilization certificate pending — funds returned",
          });
          await noc({
            nocNumber,
            issuedDate: addMonthsToIso(today, -26),
            expiryDate: addMonthsToIso(today, -2),
            status: "Expired",
          });
          await building("Needs Repair", { renovationFundRequired: 350000 });
          break;
        case "reattempt-eligible":
          await fund({ amountSanctioned: 250000, status: "Pending" });
          await noc({
            nocNumber,
            issuedDate: addMonthsToIso(today, -32),
            expiryDate: addMonthsToIso(today, -6),
            status: "Expired",
          });
          await building("Dilapidated", { renovationFundRequired: 500000 });
          break;
        case "recert-due":
          await fund({
            amountSanctioned: 380000,
            amountReleased: 380000,
            amountUtilized: 360000,
            status: "Utilized",
            sanctionedDate: addMonthsToIso(today, -34),
            utilizedDate: addMonthsToIso(today, -30),
          });
          await noc({
            nocNumber,
            issuedDate: addMonthsToIso(today, -34),
            expiryDate: addMonthsToIso(today, 1),
            status: "Expiring Soon",
            renewalAppliedDate: addMonthsToIso(today, -2),
          });
          await building("Good");
          break;
        case "recert-cycle2":
          await fund({
            amountSanctioned: 300000,
            amountReleased: 150000,
            amountUtilized: 90000,
            status: "Received",
            sanctionedDate: addMonthsToIso(today, -5),
          });
          await noc({
            nocNumber,
            issuedDate: addMonthsToIso(today, -8),
            expiryDate: addMonthsToIso(today, 18),
            status: "Valid",
          });
          await building("Under Renovation", {
            renovationFundRequired: 200000,
            remarks: "Ward renovation in progress",
          });
          break;
      }
    };

    type Plan = {
      name: string; block: string; phc: string; type: string;
      eligibility: "Eligible" | "Not Eligible" | "Possible";
      scenario:
        | "not-initiated" | "sa-scheduled" | "sa-done" | "nqas-scheduled"
        | "certified" | "conditional" | "deferred-cooling" | "reattempt-eligible"
        | "recert-due" | "recert-cycle2";
    };
    // Names match their facility type and the block/PHC hierarchy above:
    // CHC at each block HQ, PHCs exactly as listed per block, HWC HSC village
    // sub-centres, and urban facilities (UPHC/UHWC/UGPHC/DHQH/SDH) in towns.
    const plans: Plan[] = [
      // Bhadrachalam block
      { name: "Bhadrachalam CHC", block: "Bhadrachalam", phc: "Bhadrachalam PHC", type: "CHC", eligibility: "Eligible", scenario: "not-initiated" },
      { name: "Bhadrachalam PHC", block: "Bhadrachalam", phc: "Bhadrachalam PHC", type: "PHC", eligibility: "Eligible", scenario: "certified" },
      { name: "Aswaraopeta PHC", block: "Bhadrachalam", phc: "Aswaraopeta PHC", type: "PHC", eligibility: "Eligible", scenario: "reattempt-eligible" },
      { name: "Burgampahad HWC HSC", block: "Bhadrachalam", phc: "Bhadrachalam PHC", type: "HWC HSC", eligibility: "Possible", scenario: "not-initiated" },
      // Chintalapudi block
      { name: "Chintalapudi CHC", block: "Chintalapudi", phc: "Chintalapudi PHC", type: "CHC", eligibility: "Eligible", scenario: "sa-scheduled" },
      { name: "Chintalapudi PHC", block: "Chintalapudi", phc: "Chintalapudi PHC", type: "PHC", eligibility: "Eligible", scenario: "conditional" },
      { name: "Kukunoor PHC", block: "Chintalapudi", phc: "Kukunoor PHC", type: "PHC", eligibility: "Eligible", scenario: "sa-done" },
      { name: "Kukunoor HWC HSC", block: "Chintalapudi", phc: "Kukunoor PHC", type: "HWC HSC", eligibility: "Possible", scenario: "not-initiated" },
      // Dwaraka Tirumala block
      { name: "Dwaraka Tirumala CHC", block: "Dwaraka Tirumala", phc: "Dwaraka Tirumala PHC", type: "CHC", eligibility: "Eligible", scenario: "nqas-scheduled" },
      { name: "Dwaraka Tirumala PHC", block: "Dwaraka Tirumala", phc: "Dwaraka Tirumala PHC", type: "PHC", eligibility: "Eligible", scenario: "deferred-cooling" },
      { name: "Kamavarapukota PHC", block: "Dwaraka Tirumala", phc: "Kamavarapukota PHC", type: "PHC", eligibility: "Eligible", scenario: "recert-due" },
      { name: "Kamavarapukota HWC HSC", block: "Dwaraka Tirumala", phc: "Kamavarapukota PHC", type: "HWC HSC", eligibility: "Eligible", scenario: "sa-scheduled" },
      // Eluru Rural block
      { name: "Eluru CHC", block: "Eluru Rural", phc: "Eluru Rural PHC", type: "CHC", eligibility: "Eligible", scenario: "certified" },
      { name: "Eluru Rural PHC", block: "Eluru Rural", phc: "Eluru Rural PHC", type: "PHC", eligibility: "Eligible", scenario: "recert-cycle2" },
      { name: "Pedapadu PHC", block: "Eluru Rural", phc: "Pedapadu PHC", type: "PHC", eligibility: "Eligible", scenario: "not-initiated" },
      { name: "Pedapadu HWC HSC", block: "Eluru Rural", phc: "Pedapadu PHC", type: "HWC HSC", eligibility: "Not Eligible", scenario: "not-initiated" },
      // Eluru Urban block — urban facility types
      { name: "Eluru UPHC", block: "Eluru Urban", phc: "Eluru Urban PHC", type: "UPHC", eligibility: "Eligible", scenario: "sa-done" },
      { name: "Tadepalligudem UPHC", block: "Eluru Urban", phc: "Tadepalligudem PHC", type: "UPHC", eligibility: "Eligible", scenario: "certified" },
      { name: "Eluru UHWC", block: "Eluru Urban", phc: "Eluru Urban PHC", type: "UHWC", eligibility: "Possible", scenario: "not-initiated" },
      { name: "Bhimavaram UHWC", block: "Eluru Urban", phc: "Tadepalligudem PHC", type: "UHWC", eligibility: "Eligible", scenario: "nqas-scheduled" },
      { name: "Eluru UGPHC", block: "Eluru Urban", phc: "Eluru Urban PHC", type: "UGPHC", eligibility: "Eligible", scenario: "conditional" },
      { name: "Eluru DHQH", block: "Eluru Urban", phc: "Eluru Urban PHC", type: "DHQH", eligibility: "Eligible", scenario: "certified" },
      { name: "Nidadavole SDH", block: "Eluru Urban", phc: "Tadepalligudem PHC", type: "SDH", eligibility: "Eligible", scenario: "deferred-cooling" },
    ];

    let i = 0;
    for (const plan of plans) {
      const facilityId = await ctx.db.insert("facilities", {
        block: plan.block,
        phc: plan.phc,
        name: plan.name,
        facilityType: plan.type,
        phaseType: "Phase I",
        eligibility: plan.eligibility,
        currentStatus: "—",
        currentCycleNumber: 0,
        remarks: plan.scenario === "recert-cycle2" ? "Recertification in progress" : undefined,
        createdAt: Date.now(),
        createdBy: user._id,
      });

      const writeCycle1 = async (
        sa: Partial<Doc<"stateAssessments">> | null,
        nqas: Partial<Doc<"nationalAssessments">> | null,
        cycleType: "Initial" | "Recertification" = "Initial",
      ) => {
        const cycleId = await ctx.db.insert("certificationCycles", {
          facilityId,
          cycleNumber: 1,
          cycleType,
          createdAt: Date.now(),
          createdBy: user._id,
        });
        await ctx.db.insert("stateAssessments", {
          cycleId, facilityId, status: "Not Yet Initiated", ...sa,
        });
        if (nqas) {
          await ctx.db.insert("nationalAssessments", {
            cycleId, facilityId, status: "Pending", ...nqas,
          });
        }
      };

      switch (plan.scenario) {
        case "not-initiated":
          if (plan.eligibility === "Eligible") await writeCycle1(null, null);
          break;
        case "sa-scheduled":
          await writeCycle1({
            status: "Scheduled",
            originalScheduledDate: addMonthsToIso(today, 1),
            scheduledDate: addMonthsToIso(today, 1),
          }, null);
          break;
        case "sa-done":
          await writeCycle1({
            status: "Completed",
            originalScheduledDate: addMonthsToIso(today, -2),
            scheduledDate: addMonthsToIso(today, -2),
            actualStartDate: addMonthsToIso(today, -2),
            actualEndDate: addMonthsToIso(today, -2),
            scorePercent: 72,
            generalDocStatus: "In Progress",
            generalDocUpdatedAt: Date.now(),
          }, null);
          break;
        case "nqas-scheduled":
          await writeCycle1({
            status: "Completed",
            originalScheduledDate: addMonthsToIso(today, -3),
            scheduledDate: addMonthsToIso(today, -3),
            actualStartDate: addMonthsToIso(today, -3),
            actualEndDate: addMonthsToIso(today, -3),
            scorePercent: 78,
          }, {
            status: "Scheduled",
            originalScheduledStartDate: addMonthsToIso(today, 1),
            scheduledStartDate: addMonthsToIso(today, 1),
            scheduledEndDate: addMonthsToIso(today, 1),
            mode: "Physical",
            departments: ["OPD", "Labour Room", "Lab"],
            checklistVersion: "NQAS 2022",
          });
          break;
        case "certified": {
          const cert = addMonthsToIso(today, -14);
          const derived = computeDerivedNqas(
            { status: "Completed", certificationStatus: "Quality Certified", certificationDate: cert },
            s,
          );
          await writeCycle1({
            status: "Completed",
            originalScheduledDate: addMonthsToIso(cert, -1),
            scheduledDate: addMonthsToIso(cert, -1),
            actualStartDate: addMonthsToIso(cert, -1),
            actualEndDate: addMonthsToIso(cert, -1),
            scorePercent: 81,
          }, {
            status: "Completed",
            originalScheduledStartDate: cert,
            scheduledStartDate: cert,
            scheduledEndDate: cert,
            actualStartDate: cert,
            actualEndDate: cert,
            mode: "Physical",
            departments: ["OPD", "Labour Room", "Lab", "Pharmacy"],
            checklistVersion: "NQAS 2022",
            certificationStatus: "Quality Certified",
            certificationDate: cert,
            goiLetterDate: addMonthsToIso(cert, 1),
            scorePercent: 79,
            certifiedMonthYear: cert.slice(0, 7),
            certifiedYear: Number(cert.slice(0, 4)),
            validityDate: derived.validityDate ?? undefined,
          });
          break;
        }
        case "conditional": {
          const cert = addMonthsToIso(today, -10);
          const derived = computeDerivedNqas(
            { status: "Completed", certificationStatus: "Quality Certified with Conditionality", certificationDate: cert },
            s,
          );
          await writeCycle1({
            status: "Completed",
            originalScheduledDate: addMonthsToIso(cert, -1),
            scheduledDate: addMonthsToIso(cert, -1),
            actualStartDate: addMonthsToIso(cert, -1),
            actualEndDate: addMonthsToIso(cert, -1),
            scorePercent: 66,
          }, {
            status: "Completed",
            scheduledStartDate: cert,
            actualStartDate: cert,
            actualEndDate: cert,
            mode: "Hybrid",
            departments: ["OPD", "Emergency", "Ward"],
            checklistVersion: "NQAS 2022",
            certificationStatus: "Quality Certified with Conditionality",
            certificationDate: cert,
            scorePercent: 64,
            certifiedMonthYear: cert.slice(0, 7),
            certifiedYear: Number(cert.slice(0, 4)),
            validityDate: derived.validityDate ?? undefined,
          });
          break;
        }
        case "deferred-cooling":
          await writeCycle1({
            status: "Completed",
            originalScheduledDate: addMonthsToIso(today, -2),
            scheduledDate: addMonthsToIso(today, -2),
            actualStartDate: addMonthsToIso(today, -2),
            actualEndDate: addMonthsToIso(today, -2),
            scorePercent: 41,
          }, {
            status: "Completed",
            scheduledStartDate: addMonthsToIso(today, -1),
            actualStartDate: addMonthsToIso(today, -1),
            actualEndDate: addMonthsToIso(today, -1),
            mode: "Virtual",
            departments: ["OPD", "Lab"],
            checklistVersion: "NQAS 2022",
            certificationStatus: "Deferred",
            scorePercent: 45,
          });
          break;
        case "reattempt-eligible":
          await writeCycle1({
            status: "Completed",
            originalScheduledDate: addMonthsToIso(today, -6),
            scheduledDate: addMonthsToIso(today, -6),
            actualStartDate: addMonthsToIso(today, -6),
            actualEndDate: addMonthsToIso(today, -6),
            scorePercent: 38,
          }, {
            status: "Completed",
            scheduledStartDate: addMonthsToIso(today, -5),
            actualStartDate: addMonthsToIso(today, -5),
            actualEndDate: addMonthsToIso(today, -5),
            mode: "Physical",
            departments: ["OPD"],
            checklistVersion: "NQAS 2019",
            certificationStatus: "Deferred",
            scorePercent: 43,
          });
          break;
        case "recert-due": {
          const cert = addMonthsToIso(today, -35);
          await writeCycle1({
            status: "Completed",
            originalScheduledDate: addMonthsToIso(cert, -1),
            scheduledDate: addMonthsToIso(cert, -1),
            actualStartDate: addMonthsToIso(cert, -1),
            actualEndDate: addMonthsToIso(cert, -1),
            scorePercent: 74,
          }, {
            status: "Completed",
            scheduledStartDate: cert,
            actualStartDate: cert,
            actualEndDate: cert,
            mode: "Physical",
            departments: ["OPD", "Labour Room", "Lab", "Pharmacy", "Emergency"],
            checklistVersion: "NQAS 2022",
            certificationStatus: "Quality Certified",
            certificationDate: cert,
            goiLetterDate: addMonthsToIso(cert, 1),
            scorePercent: 71,
            certifiedMonthYear: cert.slice(0, 7),
            certifiedYear: Number(cert.slice(0, 4)),
            validityDate: addYearsToIso(cert, 3),
          });
          break;
        }
        case "recert-cycle2": {
          const cert = yearAgo;
          await writeCycle1({
            status: "Completed",
            originalScheduledDate: addMonthsToIso(cert, -2),
            scheduledDate: addMonthsToIso(cert, -2),
            actualStartDate: addMonthsToIso(cert, -2),
            actualEndDate: addMonthsToIso(cert, -2),
            scorePercent: 61,
          }, {
            status: "Completed",
            scheduledStartDate: cert,
            actualStartDate: cert,
            actualEndDate: cert,
            mode: "Physical",
            departments: ["OPD", "Labour Room"],
            checklistVersion: "NQAS 2022",
            certificationStatus: "Quality Certified with Conditionality",
            certificationDate: cert,
            scorePercent: 60,
            certifiedMonthYear: cert.slice(0, 7),
            certifiedYear: Number(cert.slice(0, 4)),
            validityDate: addYearsToIso(cert, 1),
          });
          // Cycle 2 opened for recertification
          const cycle2 = await ctx.db.insert("certificationCycles", {
            facilityId,
            cycleNumber: 2,
            cycleType: "Recertification",
            createdAt: Date.now(),
            createdBy: user._id,
          });
          const allCycles = await ctx.db
            .query("certificationCycles")
            .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
            .collect();
          const cycle1 = allCycles.find((c) => c.cycleNumber === 1);
          if (cycle1) await ctx.db.patch(cycle1._id, { superseded: true });
          await ctx.db.insert("stateAssessments", {
            cycleId: cycle2, facilityId,
            status: "Scheduled",
            originalScheduledDate: addMonthsToIso(today, 1),
            scheduledDate: addMonthsToIso(today, 1),
          });
          break;
        }
      }
      await refreshFacilityStatus(ctx, facilityId, actor, undefined, false);
      await addModuleRecords(facilityId, i, plan.scenario);
      await audit(ctx, {
        table: "facilities",
        recordId: String(facilityId),
        facilityId,
        action: "seed",
        newValue: `${plan.name} seeded (${plan.scenario})`,
        userName: actor,
      });
      i += 1;
    }
    return { seeded: plans.length, moduleRecords: true };
  },
});

/* -------------------------------------------------------------------------- */
/* Part H — surveillance done-date audit (migration report)                    */
/* -------------------------------------------------------------------------- */

/**
 * Lists the stored surveillance done dates that cannot be real visits:
 *   • later than today  → a due date was written into the done date, or
 *   • exactly the due date → the due date was copied, and
 *   • both are reported with the facility name so the admin can confirm.
 * READ ONLY. Nothing is changed until `clearSurveillanceDoneDates` runs with
 * the exact entries the admin selected.
 */
export type SurveillanceDateAuditRow = {
  facilityId: string;
  facilityName: string;
  block: string;
  facilityType: string | null;
  naId: string;
  field: "surveillanceDone1" | "surveillanceDone2";
  label: string;
  done: string;
  due: string | null;
  score: number | null;
  reason: string;
  kind: "future" | "copied";
  cycleNumber: number | null;
};

/** Shared read model — the card query and the health summary must agree. */
export async function surveillanceDateAuditRows(
  ctx: QueryCtx | MutationCtx,
): Promise<SurveillanceDateAuditRow[]> {
  const today = todayIso();
  const rows = await ctx.db.query("nationalAssessments").collect();
  const out: SurveillanceDateAuditRow[] = [];
  for (const n of rows) {
    const facility = await ctx.db.get(n.facilityId);
    if (!facility) continue;
    const cycle = await ctx.db.get(n.cycleId);
    const checks: [("surveillanceDone1" | "surveillanceDone2"), string, string | null, string][] = [
      ["surveillanceDone1", n.surveillanceDone1 ?? "", n.surveillanceDue1 ?? null, "1st"],
      ["surveillanceDone2", n.surveillanceDone2 ?? "", n.surveillanceDue2 ?? null, "2nd"],
    ];
    for (const [field, done, due, label] of checks) {
      if (!done) continue;
      const future = done > today;
      const copiedDue = !!due && done === due;
      if (!future && !copiedDue) continue;
      out.push({
        facilityId: String(n.facilityId),
        facilityName: facility.name,
        block: facility.block,
        facilityType: facility.facilityType ?? null,
        naId: String(n._id),
        field,
        label: `${label} Surveillance Assessment Done Date`,
        done,
        due,
        score: n.manualScore ?? null,
        reason: future
          ? "Later than today — the visit has not happened, so this is not a done date"
          : "Exactly the due date — copied from the schedule, not entered by hand",
        kind: future ? "future" : "copied",
        cycleNumber: cycle?.cycleNumber ?? null,
      });
    }
  }
  return out;
}

export const surveillanceDateAudit = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin") {
      throw new Error("Only a State Admin can run the surveillance date check");
    }
    return surveillanceDateAuditRows(ctx);
  },
});

/**
 * Data checks → Surveillance dates: apply the admin's confirmed choices.
 *
 * ONE mutation = ONE transaction (Convex mutations are atomic): every selected
 * row is patched, audited with a shared batch id, and then the affected
 * facilities' derived status is recomputed — so Next action, the KPIs, the
 * bell badge and "Needs attention" all move together. The returned batch id is
 * what the Undo button uses. Nothing is ever changed without a decision here.
 */
export const applySurveillanceDateFixes = mutation({
  args: {
    entries: v.array(
      v.object({
        naId: v.id("nationalAssessments"),
        field: v.union(v.literal("surveillanceDone1"), v.literal("surveillanceDone2")),
        action: v.union(v.literal("keep"), v.literal("clear"), v.literal("set")),
        newDate: v.optional(v.string()),
      }),
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { entries, reason }) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin") {
      throw new Error("Only a State Admin can confirm surveillance dates");
    }
    const actor = me.name ?? me.email ?? "State Admin";
    const today = todayIso();
    const batchId = `surv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const source = `Data checks · Surveillance dates · ${batchId}`;
    const touched = new Set<Id<"facilities">>();
    let cleared = 0;
    let set = 0;
    let scoresCleared = 0;

    for (const entry of entries) {
      if (entry.action === "keep") continue;
      const n = await ctx.db.get(entry.naId);
      if (!n) continue;
      const label =
        entry.field === "surveillanceDone1"
          ? "1st Surveillance Assessment Done Date"
          : "2nd Surveillance Assessment Done Date";
      const old = n[entry.field];
      if (!old) continue;

      if (entry.action === "set") {
        const value = (entry.newDate ?? "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          throw new Error(`${label}: choose a valid date (YYYY-MM-DD)`);
        }
        if (value > today) {
          throw new Error(`${label} cannot be in the future — record it after the visit`);
        }
        if (value === old) continue;
        await ctx.db.patch(entry.naId, { [entry.field]: value });
        await audit(ctx, {
          table: "nationalAssessments",
          recordId: String(entry.naId),
          facilityId: n.facilityId,
          action: "update",
          field: label,
          oldValue: old,
          newValue: value,
          userName: actor,
          userId: me._id,
          source,
          batchId,
        });
        set += 1;
      } else {
        await ctx.db.patch(entry.naId, { [entry.field]: undefined });
        await audit(ctx, {
          table: "nationalAssessments",
          recordId: String(entry.naId),
          facilityId: n.facilityId,
          action: "update",
          field: label,
          oldValue: old,
          newValue: "(cleared)",
          userName: actor,
          userId: me._id,
          source,
          batchId,
        });
        cleared += 1;
        // "A score needs a done date": clearing the 2nd done date clears the
        // score that depended on it — in the same transaction, separately
        // audited, and shown in the preview before anything is applied.
        if (entry.field === "surveillanceDone2" && n.manualScore != null) {
          await ctx.db.patch(entry.naId, { manualScore: undefined });
          await audit(ctx, {
            table: "nationalAssessments",
            recordId: String(entry.naId),
            facilityId: n.facilityId,
            action: "update",
            field: "Surveillance Score %",
            oldValue: n.manualScore,
            newValue: "(cleared — no done date)",
            userName: actor,
            userId: me._id,
            source,
            batchId,
          });
          scoresCleared += 1;
        }
      }
      touched.add(n.facilityId);
    }

    // Recompute derived status so KPIs / Next action / Needs attention / the
    // sidebar badge change in the same write, not on the next cron pass.
    for (const facilityId of touched) {
      await refreshFacilityStatus(ctx, facilityId, actor, me._id as Id<"users">, false);
    }

    void reason;
    return { batchId, cleared, set, scoresCleared, facilities: touched.size };
  },
});

/** Undo one confirmed surveillance-date batch (audited). Rows that changed
 *  again after the batch are left alone and reported, so Undo can never
 *  overwrite a later edit. */
export const undoSurveillanceDateFixes = mutation({
  args: { batchId: v.string() },
  handler: async (ctx, { batchId }) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin") {
      throw new Error("Only a State Admin can undo a surveillance-date batch");
    }
    const actor = me.name ?? me.email ?? "State Admin";
    const rows = await ctx.db
      .query("auditLogs")
      .withIndex("by_batch", (q) => q.eq("batchId", batchId))
      .collect();
    if (rows.length === 0) throw new Error("That batch was not found");

    let restored = 0;
    let skipped = 0;
    const touched = new Set<Id<"facilities">>();
    for (const entry of rows.sort((a, b) => b.changedAt - a.changedAt)) {
      if (entry.table !== "nationalAssessments") continue;
      const na = await ctx.db.get(entry.recordId as Id<"nationalAssessments">);
      if (!na) continue;
      const isScore = entry.field === "Surveillance Score %";
      const field: "surveillanceDone1" | "surveillanceDone2" | "manualScore" | null =
        entry.field === "1st Surveillance Assessment Done Date"
          ? "surveillanceDone1"
          : entry.field === "2nd Surveillance Assessment Done Date"
            ? "surveillanceDone2"
            : isScore
              ? "manualScore"
              : null;
      if (!field) continue;
      const current = na[field];
      // Only undo our own last write.
      const expected = isScore ? entry.oldValue : entry.newValue;
      if (String(current ?? "") !== String(expected ?? "") && String(current ?? "") !== "") {
        skipped += 1;
        continue;
      }
      const restore = isScore
        ? typeof entry.oldValue === "number"
          ? entry.oldValue
          : undefined
        : typeof entry.oldValue === "string" && entry.oldValue !== "(cleared)"
          ? entry.oldValue
          : undefined;
      await ctx.db.patch(na._id, { [field]: restore });
      await audit(ctx, {
        table: "nationalAssessments",
        recordId: String(na._id),
        facilityId: na.facilityId,
        action: "update",
        field: `${entry.field} (undo)`,
        oldValue: current ?? "(empty)",
        newValue: restore ?? "(cleared)",
        userName: actor,
        userId: me._id,
        source: `Undo surveillance batch ${batchId}`,
      });
      restored += 1;
      touched.add(na.facilityId);
    }
    for (const facilityId of touched) {
      await refreshFacilityStatus(ctx, facilityId, actor, me._id as Id<"users">, false);
    }
    return { restored, skipped, facilities: touched.size };
  },
});

/** Clear ONLY the confirmed entries (admin, audited). Never silent. */
export const clearSurveillanceDoneDates = mutation({
  args: {
    entries: v.array(
      v.object({
        naId: v.id("nationalAssessments"),
        field: v.union(v.literal("surveillanceDone1"), v.literal("surveillanceDone2")),
      }),
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { entries, reason }) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin") {
      throw new Error("Only a State Admin can clear surveillance dates");
    }
    let cleared = 0;
    for (const entry of entries) {
      const n = await ctx.db.get(entry.naId);
      if (!n) continue;
      const old = n[entry.field];
      if (!old) continue;
      await ctx.db.patch(entry.naId, { [entry.field]: undefined });
      await audit(ctx, {
        table: "nationalAssessments",
        recordId: String(entry.naId),
        facilityId: n.facilityId,
        action: "update",
        field:
          (entry.field === "surveillanceDone1"
            ? "1st Surveillance Assessment Done Date"
            : "2nd Surveillance Assessment Done Date") + " (cleared)",
        oldValue: old,
        newValue: "(cleared)",
        userName: me.name ?? me.email ?? "State Admin",
        userId: me._id as Id<"users">,
        source: reason ?? "Surveillance date audit",
      });
      cleared += 1;
    }
    return { cleared };
  },
});

/**
 * PART 3 — does ANOTHER facility already own this report file name?
 *
 * Facility names repeat across blocks, so `{name} {type} NQAS Status Report
 * {date}` is ambiguous until the PHC is appended in brackets. The print dialog
 * asks this before it renders, so the name it previews is the name the file is
 * saved under. The comparison is the shared `sameReportName` rule (normalised
 * name + resolved type label), never a raw string compare.
 */
export const sameReportNameAs = query({
  args: {
    facilityId: v.optional(v.string()),
    name: v.string(),
    facilityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireActivatedUser(ctx);
    const settings = await getSettings(ctx);
    const labels = resolveReportTypeLabels(
      (settings as unknown as Record<string, unknown>)[REPORT_TYPE_LABELS_KEY],
    );
    const me = { _id: args.facilityId ?? null, name: args.name, facilityType: args.facilityType ?? null };
    if (!String(args.name ?? "").trim()) return false;
    const rows = await ctx.db
      .query("facilities")
      .collect();
    return rows.some(
      (f) =>
        String(f._id) !== String(args.facilityId ?? "") &&
        sameReportName(
          { name: f.name, facilityType: f.facilityType },
          { name: me.name, facilityType: me.facilityType },
          labels,
        ),
    );
  },
});
