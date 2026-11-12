import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

// Application access roles for the NQAS & Kayakalp tracker
// App roles: "admin" (State Admin), "entry" (District/Block Data Entry),
// "viewer" (read-only officials) — plus district quality roles "dqmo"
// (District Quality Medical Officer) and "dqc" (District Quality Consultant).
// DQMO/DQC have state-wide (all-block) access with edit rights, like data
// entry users, but cannot change settings or manage users.
export const APP_ROLES = ["admin", "entry", "dqmo", "dqc", "viewer"] as const;
export type AppRole = (typeof APP_ROLES)[number];

const eligibilityValidator = v.union(
  v.literal("Eligible"),
  v.literal("Not Eligible"),
  v.literal("Possible"),
);

const saStatusValidator = v.union(
  v.literal("Not Yet Initiated"),
  v.literal("Scheduled"),
  v.literal("Completed"),
);

const nqasStatusValidator = v.union(
  v.literal("Pending"),
  v.literal("Scheduled"),
  v.literal("Completed"),
);

// Certification status is admin-customizable (see certificationStatuses in
// DEFAULT_SETTINGS), so accept any string here.
const certificationStatusValidator = v.string();

const cycleTypeValidator = v.union(
  v.literal("Initial"),
  v.literal("Recertification"),
  v.literal("Post-Deferred Reattempt"),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // application profile
      appRole: v.optional(v.string()), // role key from the appRoles table
      /** Disabled accounts keep their history but every request is refused. */
      disabled: v.optional(v.boolean()),
      blockIds: v.optional(v.array(v.id("blocks"))), // blocks the user is scoped to
      designation: v.optional(v.string()),
      // Part 5 — "My profile". Purely additive optional fields: no existing
      // column is renamed or dropped.
      phone: v.optional(v.string()),
      /** Language, landing page, density, sidebar state, rows per page, tips. */
      preferences: v.optional(v.any()),
      /** In-app / email toggles for needs-attention, IA reminder, imports. */
      notifications: v.optional(v.any()),
      // My Profile photo (additive): stored through the FileStore in Drive's
      // `_avatars` folder. Only the store id lives here — it is never sent to
      // the browser; the page receives a signed `/api/profile/avatar` URL.
      // The legacy `image` data URL above is still displayed when set.
      avatarFileId: v.optional(v.string()),
      avatarMimeType: v.optional(v.string()),
      avatarUpdatedAt: v.optional(v.number()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // My Profile — per-device session metadata (additive). The auth library's
    // `authSessions` row only stores userId + expirationTime, which is why the
    // old page showed "Another device · Browser" for everything. This row
    // carries what a person needs to recognise a device (user agent, last
    // activity) and is keyed by that session: signing the session out removes
    // its metadata with it. No IP address is ever stored.
    sessionMeta: defineTable({
      sessionId: v.id("authSessions"),
      userId: v.id("users"),
      userAgent: v.optional(v.string()),
      region: v.optional(v.string()),
      createdAt: v.number(),
      lastActive: v.number(),
    })
      .index("by_session", ["sessionId"])
      .index("by_user", ["userId"]),

    // ---------- admin / settings ----------

    appSettings: defineTable({
      key: v.string(),
      value: v.any(),
    }).index("by_key", ["key"]),

    // Admin → Data checks: a dismissed issue. The underlying assessment data
    // is never touched; active=false keeps the who/when history for restore.
    dataCheckIgnores: defineTable({
      check: v.string(),
      issueKey: v.string(),
      label: v.string(),
      detail: v.optional(v.string()),
      ignoredBy: v.id("users"),
      ignoredByName: v.string(),
      ignoredAt: v.number(),
      active: v.boolean(),
      restoredBy: v.optional(v.id("users")),
      restoredByName: v.optional(v.string()),
      restoredAt: v.optional(v.number()),
    })
      .index("by_check_key", ["check", "issueKey"])
      .index("by_check_active", ["check", "active"])
      .index("by_active", ["active"]),

    // Reader configuration is deliberately separate from appSettings: the API
    // key is server-only and is never returned by a browser query, included in
    // the settings export or written to an audit value.
    resultReaderConfig: defineTable({
      key: v.string(),
      apiKey: v.optional(v.string()),
      model: v.string(),
      updatedAt: v.number(),
      updatedBy: v.optional(v.id("users")),
    }).index("by_key", ["key"]),

    // One cached vision result per file hash, facility scope and block. The
    // payload is the strict JSON returned by the model; no key or Drive id is
    // stored here.
    resultReaderCache: defineTable({
      hash: v.string(),
      scope: v.string(),
      block: v.string(),
      json: v.string(),
      createdAt: v.number(),
    })
      .index("by_cache_key", ["hash", "scope", "block"])
      .index("by_hash", ["hash"]),

    // The ONE role list. Seeded from DEFAULT_ROLES on first Admin visit, then
    // read by Admin → Pages, Admin → Users, the guide and the permission
    // matrix — never a hard-coded role list in the UI.
    appRoles: defineTable({
      key: v.string(),
      label: v.string(),
      description: v.string(),
      sort: v.number(),
      builtin: v.boolean(),
    }).index("by_key", ["key"]),

    // Invite a person before they sign up: claimAccess consumes the matching
    // row and activates the account with the role + blocks chosen here.
    invitations: defineTable({
      email: v.string(),
      appRole: v.string(),
      blockIds: v.array(v.id("blocks")),
      invitedBy: v.optional(v.id("users")),
      invitedByName: v.string(),
      createdAt: v.number(),
      acceptedAt: v.optional(v.number()),
      revokedAt: v.optional(v.number()),
    }).index("by_email", ["email"]),

    // Report Builder definitions that can be attached to a custom page.
    // `view` is the full serialisable view state (config, layout, style…).
    reportDefinitions: defineTable({
      name: v.string(),
      view: v.any(),
      createdBy: v.optional(v.id("users")),
      createdByName: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      deletedAt: v.optional(v.number()),
    }).index("by_deleted", ["deletedAt"]),

    // Per-user list view (visible columns, their order, row density). One row
    // per user per scope (e.g. "master"), so a district officer's choice
    // follows them to another browser or device instead of living only in
    // localStorage. Additive table — no existing data is touched; the shape is
    // validated and normalised by src/lib/masterView on the client, which is
    // the only thing that ever reads it back.
    masterViews: defineTable({
      userId: v.id("users"),
      scope: v.string(),
      view: v.any(),
      updatedAt: v.number(),
    }).index("by_user_scope", ["userId", "scope"]),

    // Short-lived OTP challenges for destructive operations (e.g. wiping all
    // facilities). The code itself is only stored as a SHA-256 hash.
    otpChallenges: defineTable({
      purpose: v.string(), // e.g. "delete_all_facilities"
      email: v.string(), // address the code was sent to
      codeHash: v.string(),
      expiresAt: v.number(),
      attempts: v.number(),
    }).index("by_purpose", ["purpose"]),

    // Legacy lookup lists — kept for previously imported data. The live,
    // admin-editable dropdown options now live in lifecycle.ts DROPDOWN_GROUPS.
    lookupLists: defineTable({
      listKey: v.string(),
      value: v.string(),
      sortOrder: v.number(),
    }).index("by_list", ["listKey"]),

    blocks: defineTable({
      name: v.string(),
      active: v.optional(v.boolean()),
    }).index("by_name", ["name"]),

    phcs: defineTable({
      name: v.string(),
      block: v.string(),
      active: v.optional(v.boolean()),
    }).index("by_block", ["block"]),

    // ---------- core tracking ----------

    facilities: defineTable({
      block: v.string(),
      phc: v.string(),
      name: v.string(),
      facilityType: v.string(),
      phaseType: v.optional(v.string()),
      eligibility: eligibilityValidator,
      currentStatus: v.string(), // auto-computed by the lifecycle engine
      saqshamFacilityType: v.optional(v.string()),
      saqshamCategory: v.optional(v.string()),
      remarks: v.optional(v.string()),
      // NIN (National Identification Number) — unique key for de-duplication
      // across manual entry and bulk import. Null for legacy rows until set.
      ninNumber: v.optional(v.string()),
      // Internal Assessment percentages per quarter (FY 2026-27) — the
      // quarterly comparison is derived, never stored.
      nqasIaQ1: v.optional(v.number()),
      nqasIaQ2: v.optional(v.number()),
      kayakalpIaQ1: v.optional(v.number()),
      kayakalpIaQ2: v.optional(v.number()),
      // Current Status and IA overdue dropdowns — set by the IA Excel
      // import or the profile form; updated whenever an IA row lands.
      iaLastDate: v.optional(v.string()),
      iaLastScore: v.optional(v.number()),
      // Manual "Facility Current Status" override. When set it wins over
      // the auto-computed lifecycle status; clearing it returns to auto.
      statusOverride: v.optional(v.string()),
      // ---------- SaQsham document-status import (additive) ----------
      // These seven fields carry the last confirmed SaQsham portal values for
      // the facility. They are written ONLY by imports.applySaqshamBatch (and
      // restored by imports.undoSaqshamBatch) — the manual profile form and the
      // rest of the app never touch them, so the migration is purely additive.
      // The portal text also lands in stateAssessments.generalDocStatus (the
      // "SaQsham Documents Status" column keeps working); these fields add the
      // derived report value, the application number and the undo bookkeeping.
      saqshamApplicationNo: v.optional(v.string()),
      saqshamStatusRaw: v.optional(v.string()),
      documentsStatusReport: v.optional(v.string()),
      saqshamPortalUpdatedOn: v.optional(v.string()),
      saqshamPortalUpdatedBy: v.optional(v.string()),
      saqshamImportedAt: v.optional(v.number()),
      saqshamImportBatchId: v.optional(v.string()),
      // Shared facility key — the "Facility for Formula" string ALL importers
      // match on (e.g. "Alangayam_Mittur_HWC HSC", "Kaspa -B_UHWC"). Written by
      // the IA import wizard's seed step; composed candidates for matching are
      // derived on the client from name/block/phc/type (lib/iaImport), and this
      // stored cell wins the match outright when the file sends the same key.
      facilityKey: v.optional(v.string()),
      // Auto "Last Updated" stamp — set by the system whenever a row is
      // saved from the master list (Update button) or the profile forms.
      // Never manually entered (mirrors buildingDetails.lastUpdatedAt).
      updatedAt: v.optional(v.number()),
      // ---------- Last changed (Part 2, additive) ----------
      // Written in the SAME mutation as the audit row (convex/facilities.audit),
      // so the Master List "Updated" filter reads one indexed column instead of
      // scanning the audit log. `recentChanges` keeps the last 10 field keys so
      // "Which field changed" can be answered without a second query.
      lastChangedAt: v.optional(v.number()),
      lastChangedBy: v.optional(v.string()),
      /** manual · saqsham · ia · master · system */
      lastChangeSource: v.optional(v.string()),
      lastBatchId: v.optional(v.string()),
      recentChanges: v.optional(
        v.array(
          v.object({
            key: v.string(),
            at: v.number(),
            source: v.optional(v.string()),
          }),
        ),
      ),
      currentCycleNumber: v.optional(v.number()),
      createdAt: v.number(),
      createdBy: v.optional(v.id("users")),
    })
      .index("by_block", ["block"])
      .index("by_current_status", ["currentStatus"])
      .index("by_eligibility", ["eligibility"])
      .index("by_nin", ["ninNumber"])
      .index("by_last_changed", ["lastChangedAt"]),

    certificationCycles: defineTable({
      facilityId: v.id("facilities"),
      cycleNumber: v.number(), // 1, 2, 3 … per facility
      cycleType: cycleTypeValidator,
      superseded: v.optional(v.boolean()),
      // Stage of the recertification application (when this cycle is a
      // Recertification). Populated by import/report only — no dropdown.
      recertStage: v.optional(v.string()),
      createdAt: v.number(),
      createdBy: v.optional(v.id("users")),
    }).index("by_facility", ["facilityId"]),

    stateAssessments: defineTable({
      cycleId: v.id("certificationCycles"),
      facilityId: v.id("facilities"),
      status: saStatusValidator,
      originalScheduledDate: v.optional(v.string()), // first scheduled date, immutable
      scheduledDate: v.optional(v.string()), // current scheduled date
      revisedDate: v.optional(v.string()), // set when a scheduled date is changed
      revisedReason: v.optional(v.string()),
      rescheduleCount: v.optional(v.number()),
      actualStartDate: v.optional(v.string()),
      actualEndDate: v.optional(v.string()),
      // One optional scope choice (Admin > General > Scope options).
      scopeOption: v.optional(v.string()),
      scorePercent: v.optional(v.number()),
      // Assessment team — "Name of Assessor": two assessors per visit, each
      // with their own HUD unit (admin-managed dropdown).
      assessor1Name: v.optional(v.string()),
      assessor2Name: v.optional(v.string()),
      // Designation (free text, suggested from earlier entries) and mobile
      // (E.164 +91…) for each assessor. Optional: older rows stay valid.
      assessor1Designation: v.optional(v.string()),
      assessor1Phone: v.optional(v.string()),
      assessor2Designation: v.optional(v.string()),
      assessor2Phone: v.optional(v.string()),
      // Legacy single shared HUD column — kept so rows saved before the
      // per-assessor split still read; new writes use assessor1Hud/assessor2Hud.
      assessorHud: v.optional(v.string()),
      assessor1Hud: v.optional(v.string()),
      assessor2Hud: v.optional(v.string()),
      // Visit documents: assessment report (PDF) and checklist (Excel).
      reportAttachmentId: v.optional(v.id("_storage")),
      reportAttachmentName: v.optional(v.string()),
      reportAttachmentType: v.optional(v.string()),
      checklistAttachmentId: v.optional(v.id("_storage")),
      checklistAttachmentName: v.optional(v.string()),
      checklistAttachmentType: v.optional(v.string()),
      generalDocStatus: v.optional(v.string()),
      generalDocUpdatedAt: v.optional(v.number()), // auto system timestamp
      // Part B — the last PORTAL value kept beside an automatic
      // "Result Declared", so switching the result away restores it exactly.
      generalDocStatusPortal: v.optional(v.string()),
      generalDocStatusAuto: v.optional(v.boolean()),
    })
      .index("by_cycle", ["cycleId"])
      .index("by_facility", ["facilityId"]),

    nationalAssessments: defineTable({
      cycleId: v.id("certificationCycles"),
      facilityId: v.id("facilities"),
      status: nqasStatusValidator,
      originalScheduledStartDate: v.optional(v.string()),
      scheduledStartDate: v.optional(v.string()),
      scheduledEndDate: v.optional(v.string()),
      revisedDate: v.optional(v.string()),
      revisedReason: v.optional(v.string()),
      rescheduleCount: v.optional(v.number()),
      actualStartDate: v.optional(v.string()),
      actualEndDate: v.optional(v.string()),
      mode: v.optional(v.string()), // Physical / Virtual / Hybrid
      // Legacy department chips — retained exactly as stored, hidden in the
      // form after the single scope choice replaced them.
      departments: v.optional(v.array(v.string())),
      // The single optional scope choice (Admin > General > Scope options).
      scopeOption: v.optional(v.string()),
      checklistVersion: v.optional(v.string()),
      certificationStatus: v.optional(certificationStatusValidator),
      certificationDate: v.optional(v.string()),
      goiLetterDate: v.optional(v.string()),
      scorePercent: v.optional(v.number()),
      certifiedMonthYear: v.optional(v.string()), // auto-derived, e.g. "2026-09"
      certifiedYear: v.optional(v.number()), // auto-derived
      validityDate: v.optional(v.string()), // auto-calculated by the engine
      // Manual "Score" column next to the 2nd surveillance done date.
      manualScore: v.optional(v.number()),
      surveillanceDue1: v.optional(v.string()), // auto — cert date + 12 months
      // Auto "Recertification Status" comment + "Re-Certification Year",
      // derived from the certification date (3y/1y/Deferred rules).
      manualRecertStatus: v.optional(v.string()),
      recertYear: v.optional(v.string()),
      surveillanceDone1: v.optional(v.string()),
      surveillanceDue2: v.optional(v.string()), // auto — cert date + 24 months
      surveillanceDone2: v.optional(v.string()),
      // NQAS Result — assessment result sheet / marksheet upload per cycle
      resultDocumentId: v.optional(v.id("_storage")),
      resultDocumentName: v.optional(v.string()),
      resultDocumentType: v.optional(v.string()),
      resultDocumentUpdatedAt: v.optional(v.number()),
      // Additive: the facility_document row the browser reader used. Kept
      // beside the legacy storage id — no column is renamed or dropped.
      resultReadDocumentId: v.optional(v.id("facilityDocuments")),
      // NQAS Certified Documents — certificate / GoI letter upload per cycle
      certDocumentId: v.optional(v.id("_storage")),
      certDocumentName: v.optional(v.string()),
      certDocumentType: v.optional(v.string()),
      certDocumentUpdatedAt: v.optional(v.number()),
    })
      .index("by_cycle", ["cycleId"])
      .index("by_facility", ["facilityId"]),

    // ---------- Annexure I scores (additive, per cycle) ----------
    // One row per facility + certification cycle. The source is the NQAS
    // Result document already stored in facility_document; no Drive id,
    // link or token is ever copied here. Blank scores are absent, never 0.
    annexureScores: defineTable({
      facilityId: v.id("facilities"),
      cycleId: v.id("certificationCycles"),
      cycleNumber: v.number(),
      documentId: v.id("facilityDocuments"),
      documentName: v.string(),
      pageNumber: v.number(),
      overallScore: v.optional(v.number()),
      pssScore: v.optional(v.number()),
      letterScore: v.optional(v.number()),
      annexureFacilityName: v.string(),
      district: v.optional(v.string()),
      warnings: v.array(v.string()),
      batchId: v.string(),
      parsedAt: v.number(),
      parsedBy: v.id("users"),
      parsedByName: v.string(),
    })
      .index("by_facility_cycle", ["facilityId", "cycleId"])
      .index("by_facility", ["facilityId"])
      .index("by_cycle", ["cycleId"])
      .index("by_cycle_number", ["cycleNumber"])
      .index("by_document", ["documentId"])
      .index("by_batch", ["batchId"]),

    annexureAreaScores: defineTable({
      scoreId: v.id("annexureScores"),
      facilityId: v.id("facilities"),
      cycleId: v.id("certificationCycles"),
      cycleNumber: v.number(),
      areaKey: v.string(), // A–H
      areaName: v.string(),
      score: v.number(),
    })
      .index("by_score", ["scoreId"])
      .index("by_facility_cycle", ["facilityId", "cycleId"])
      .index("by_cycle", ["cycleId"]),

    annexureDepartmentScores: defineTable({
      scoreId: v.id("annexureScores"),
      facilityId: v.id("facilities"),
      cycleId: v.id("certificationCycles"),
      cycleNumber: v.number(),
      name: v.string(), // exactly as printed in the PDF
      canonicalName: v.string(),
      score: v.number(),
      isNew: v.optional(v.boolean()),
      /** "department" or "package" — the Theme Wise Score layout. */
      kind: v.optional(v.string()),
    })
      .index("by_score", ["scoreId"])
      .index("by_facility_cycle", ["facilityId", "cycleId"])
      .index("by_cycle", ["cycleId"]),

    // One row per accepted result-file read. The values themselves live in
    // nationalAssessments / annexureScores; this small row powers the “Read
    // 24-Dec-2025” badge and the “Result not read” filter without scanning
    // the audit log. No Drive id or token is stored.
    resultReads: defineTable({
      documentId: v.id("facilityDocuments"),
      facilityId: v.id("facilities"),
      cycleId: v.id("certificationCycles"),
      cycleNumber: v.number(),
      fileHash: v.string(),
      certifiedDate: v.optional(v.string()),
      overallScore: v.optional(v.number()),
      certificationStatus: v.optional(v.string()),
      // Real read duration and engine, shown in Audit and logs. Additive only.
      readMs: v.optional(v.number()),
      engine: v.optional(v.string()),
      batchId: v.string(),
      readAt: v.number(),
      readBy: v.id("users"),
      readByName: v.string(),
    })
      .index("by_document", ["documentId"])
      .index("by_facility_cycle", ["facilityId", "cycleId"])
      .index("by_batch", ["batchId"]),

    // ---------- support modules ----------
    gapClosureFunds: defineTable({
      // auto "last updated" stamp (mirrors buildingDetails.lastUpdatedAt)
      updatedAt: v.optional(v.number()),
      facilityId: v.id("facilities"),
      financialYear: v.string(), // e.g. "2025-26"
      amountSanctioned: v.optional(v.number()),
      amountReleased: v.optional(v.number()),
      amountUtilized: v.optional(v.number()),
      status: v.string(), // fundStatuses lookup (Received / Pending / Returned / Utilized)
      sanctionedDate: v.optional(v.string()),
      utilizedDate: v.optional(v.string()),
      remarks: v.optional(v.string()),
      // "Gap Closure Amount Proc. Link" — external link to the procurement
      // document (URL string, as opposed to the uploaded attachment below).
      procLink: v.optional(v.string()),
      // optional supporting document (sanction order etc.) stored in Convex file storage
      attachmentId: v.optional(v.id("_storage")),
      attachmentName: v.optional(v.string()),
      attachmentType: v.optional(v.string()),
    })
      .index("by_facility", ["facilityId"])
      .index("by_status", ["status"]),

    fireNocs: defineTable({
      // auto "last updated" stamp (mirrors buildingDetails.lastUpdatedAt)
      updatedAt: v.optional(v.number()),
      facilityId: v.id("facilities"),
      nocNumber: v.optional(v.string()),
      nocAvailable: v.optional(v.string()), // "Yes" | "No"
      issuedDate: v.optional(v.string()),
      expiryDate: v.optional(v.string()),
      status: v.string(), // fireNocStatuses lookup
      renewalAppliedDate: v.optional(v.string()),
      remarks: v.optional(v.string()),
      // "NOC Document Link" — external link to the NOC document (URL string,
      // as opposed to the uploaded attachment below).
      nocLink: v.optional(v.string()),
      // optional NOC certificate document stored in Convex file storage
      attachmentId: v.optional(v.id("_storage")),
      attachmentName: v.optional(v.string()),
      attachmentType: v.optional(v.string()),
    }).index("by_facility", ["facilityId"]),

    buildingDetails: defineTable({
      facilityId: v.id("facilities"),
      buildingType: v.optional(v.string()),
      buildingStatus: v.string(), // buildingStatuses lookup
      // Auto system timestamp — every status change stamps this; the master
      // list renders it as "Building Status (Last Updated on dd.mm.yyyy)".
      lastUpdatedAt: v.optional(v.number()),
      condemnedLink: v.optional(v.string()), // link to the condemnation order
      // optional condemnation order uploaded to Convex file storage
      condemnedAttachmentId: v.optional(v.id("_storage")),
      condemnedAttachmentName: v.optional(v.string()),
      condemnedAttachmentType: v.optional(v.string()),
      yearOfConstruction: v.optional(v.string()),
      lastRenovationDate: v.optional(v.string()),
      renovationFundRequired: v.optional(v.number()),
      remarks: v.optional(v.string()),
    }).index("by_facility", ["facilityId"]),

    // ---------- audit ----------

    auditLogs: defineTable({
      table: v.string(),
      recordId: v.string(),
      facilityId: v.optional(v.id("facilities")),
      action: v.string(), // create | update | delete | seed
      field: v.optional(v.string()),
      oldValue: v.optional(v.any()),
      newValue: v.optional(v.any()),
      changedBy: v.optional(v.id("users")),
      changedByName: v.optional(v.string()),
      changedAt: v.number(),
      // Where the change came from (additive). Set to "Saqsham import" with the
      // file name and the batch id for every imported field, so the facility's
      // Audit timeline can say exactly which import wrote a value.
      source: v.optional(v.string()),
      fileName: v.optional(v.string()),
      batchId: v.optional(v.string()),
    })
      .index("by_facility", ["facilityId"])
      .index("by_record", ["table", "recordId"])
      .index("by_time", ["changedAt"])
      // "Recently updated" highlighting reads the newest entry per (field,
      // time) at query time (imports.getRecentUpdates) — additive index.
      .index("by_field_time", ["field", "changedAt"])
      // One confirmed batch (Data checks → Surveillance dates, document
      // migration reports) → its audit rows, so the admin can UNDO the whole
      // batch in one go. Additive index only.
      .index("by_batch", ["batchId"])
      // My Profile → Activity: "my last 20 actions" used to collect() the whole
      // audit table and filter it in memory. Additive index only.
      .index("by_user_time", ["changedBy", "changedAt"]),

    // Admin Guide "Was this helpful?" votes. One short row per vote; the admin
    // list only needs the unhelpful ones and their note.
    guideFeedback: defineTable({
      route: v.string(),
      articleTitle: v.string(),
      role: v.optional(v.string()),
      helpful: v.boolean(),
      note: v.optional(v.string()),
      userId: v.id("users"),
      userName: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_route", ["route"])
      .index("by_time", ["createdAt"]),

    // Import history — one row per successful template import (SaQsham
    // documents status, Internal Assessment). Written by applySaQshamImport
    // / applyIaImport; the Bulk Import page lists it as a "who / when /
    // file / how many rows" audit trail.
    importLogs: defineTable({
      // "saqsham" (documents status) | "ia" (internal assessment scores)
      type: v.string(),
      fileName: v.string(),
      rowsTotal: v.number(),
      rowsUpdated: v.number(),
      rowsError: v.number(),
      // First N row-level failure reasons ({rowNo, reason} objects) so the
      // error report is reproducible after the fact.
      errorSample: v.optional(v.array(v.object({ rowNo: v.number(), reason: v.string() }))),
      importedBy: v.optional(v.id("users")),
      importedByName: v.optional(v.string()),
      importedAt: v.number(),
    }).index("by_time", ["importedAt"]),

    // ---------- SaQsham document-status import (new tables) ----------

    // Learned matches: portal name (+ type) → facility, saved when the user
    // confirms a fuzzy/manual match, so the next import matches automatically.
    facilityAliases: defineTable({
      portalNameNormalized: v.string(),
      facilityType: v.string(),
      facilityId: v.id("facilities"),
      createdBy: v.optional(v.id("users")),
      createdAt: v.number(),
    })
      .index("by_name_type", ["portalNameNormalized", "facilityType"])
      .index("by_facility", ["facilityId"]),

    // Editable portal Status → Report value map (Settings → SaQsham Status
    // Mapping). Seeded from lib/saqshamImport SAQSHAM_STATUS_MAP; every edit
    // bumps `version` and is audited.
    saqshamStatusMap: defineTable({
      portal: v.string(),
      report: v.string(),
      version: v.number(),
      /** Earlier portal spellings kept after a rename; old imports still match. */
      aliases: v.optional(v.array(v.string())),
      /** Display order in Bulk Import → Status mapping. */
      order: v.optional(v.number()),
    }).index("by_portal", ["portal"]),

    // One row per confirmed import run — the Import history list, and the unit
    // the Undo restores. `status` is "applied" | "undone".
    importBatches: defineTable({
      kind: v.string(), // "saqsham"
      fileName: v.string(),
      status: v.string(),
      rowsTotal: v.number(),
      rowsUpdated: v.number(),
      rowsNoChange: v.number(),
      rowsSkipped: v.number(),
      rowsFailed: v.number(),
      /** Immutable row-level report snapshot captured at Apply. Old batches
       * have no value and show "Detail not stored for this import". */
      reportRows: v.optional(v.array(v.any())),
      /** The exact status mapping used by this import (snapshot, not current). */
      statusMap: v.optional(v.array(v.object({ portal: v.string(), report: v.string() }))),
      importedBy: v.optional(v.id("users")),
      importedByName: v.optional(v.string()),
      importedAt: v.number(),
      undoneAt: v.optional(v.number()),
      undoneBy: v.optional(v.id("users")),
    }).index("by_time", ["importedAt"]),

    // One row per decision in a batch — the raw + cleaned JSON, the match
    // method/confidence and the before/after snapshot the Undo restores.
    importRows: defineTable({
      batchId: v.id("importBatches"),
      rowNo: v.number(),
      facilityId: v.optional(v.id("facilities")),
      applicationNo: v.optional(v.string()),
      // Denormalised facility identity + the Notes text the preview computed,
      // so the Import history report needs no extra lookups.
      facilityName: v.optional(v.string()),
      facilityBlock: v.optional(v.string()),
      facilityPhc: v.optional(v.string()),
      notes: v.optional(v.string()),
      matchMethod: v.string(),
      confidence: v.number(),
      decision: v.string(), // include | exclude | skip
      result: v.string(), // updated | no_change | skipped | failed | undone
      error: v.optional(v.string()),
      raw: v.optional(v.any()),
      cleaned: v.optional(v.any()),
      oldValue: v.optional(v.any()),
      newValue: v.optional(v.any()),
    })
      .index("by_batch", ["batchId"])
      .index("by_facility", ["facilityId"]),

    // ---------- documents (Google Drive is the storage layer) ----------
    //
    // ONE row per stored document version. The DATABASE is the source of truth
    // for what belongs to which facility; Drive only holds bytes. No Drive URL,
    // `webViewLink` or `webContentLink` is ever stored here or sent to the
    // browser — reads go through /api/documents/content with a signed token.
    //
    // `storage` says where the bytes live: "drive" for anything uploaded since
    // Drive was connected, "convex" for the legacy files the migration job has
    // not moved yet (their ids stay readable until it does).
    facilityDocuments: defineTable({
      facilityId: v.id("facilities"),
      // NQAS_Result | SA_Report | SA_Checklist | Gap_Closure | Condemned | NOC
      // | NQAS_Certificate
      docKey: v.string(),
      cycleNo: v.number(),
      driveFileId: v.string(),
      driveFolderId: v.string(),
      originalName: v.string(),
      /** Human name shown and downloaded; `originalName` stays the upload name. */
      displayName: v.optional(v.string()),
      storedName: v.string(),
      mimeType: v.string(),
      size: v.number(),
      driveMd5: v.optional(v.string()),
      sha256: v.string(),
      versionNo: v.number(),
      isCurrent: v.boolean(),
      storage: v.string(), // "drive" | "convex"
      legacyStorageId: v.optional(v.string()),
      uploadedBy: v.optional(v.id("users")),
      uploadedByName: v.optional(v.string()),
      uploadedAt: v.number(),
      removedAt: v.optional(v.number()),
      removedBy: v.optional(v.id("users")),
      removalReason: v.optional(v.string()),
      // Set by the nightly reconciliation when Drive no longer has the file.
      // Never auto-deletes the row — it becomes an amber "File missing in
      // Drive" state and a Needs attention item.
      missingInDriveAt: v.optional(v.number()),
      batchId: v.optional(v.string()),
    })
      .index("by_facility_doc_cycle_current", [
        "facilityId",
        "docKey",
        "cycleNo",
        "isCurrent",
      ])
      .index("by_facility", ["facilityId"])
      .index("by_sha", ["facilityId", "docKey", "sha256"])
      .index("by_drive", ["driveFileId"]),

    // Legacy short-lived READ tokens (rows written by older builds). New
    // Preview / Open / Download links are stateless HMAC tokens signed with
    // the same server key (`storage/crypto.signReadToken`), so a PDF viewer's
    // Range requests and an image's single request both work. Nothing here is
    // a Drive id, link or secret.
    documentReadTokens: defineTable({
      tokenHash: v.string(),
      documentId: v.id("facilityDocuments"),
      userId: v.id("users"),
      mode: v.string(), // "inline" | "attachment"
      createdAt: v.number(),
      expiresAt: v.number(),
      usedAt: v.optional(v.number()),
    })
      .index("by_hash", ["tokenHash"])
      .index("by_expiry", ["expiresAt"]),

    // Files chosen while uploads are paused. The BYTES stay on the user's
    // device in IndexedDB (a File cannot be put in a database safely); this
    // row is the server-side state so the 24-hour queue survives a reload and
    // is visible to the user from any session. Expired rows are pruned by the
    // hourly cron and filtered out on every read.
    documentTray: defineTable({
      facilityId: v.id("facilities"),
      docKey: v.string(),
      cycleNo: v.number(),
      /** Stable id generated on the device; the same id is the IndexedDB key. */
      trayId: v.string(),
      originalName: v.string(),
      declaredMime: v.string(),
      declaredSize: v.number(),
      createdBy: v.id("users"),
      createdAt: v.number(),
      /** createdAt + 24 h. Never extended by an update. */
      expiresAt: v.number(),
    })
      .index("by_facility", ["facilityId"])
      .index("by_tray_id", ["trayId"])
      .index("by_created_by", ["createdBy"])
      .index("by_expiry", ["expiresAt"]),

    // Folder-id cache: one row per (parent, name). The UNIQUE `key` is what
    // makes concurrent uploads create a folder once — the loser of the race
    // re-reads this table instead of creating a duplicate in Drive.
    driveFolders: defineTable({
      key: v.string(),
      parentId: v.string(),
      name: v.string(),
      driveFolderId: v.string(),
      createdAt: v.number(),
    }).index("by_key", ["key"]),

    // The single Drive connection. The refresh token is stored ONLY encrypted
    // (AES-256-GCM, key from the server secret store), never in plain text.
    driveConnection: defineTable({
      key: v.string(), // "google_drive"
      mode: v.string(), // "oauth" | "service_account"
      accountEmail: v.optional(v.string()),
      refreshTokenCipher: v.optional(v.string()),
      rootFolderId: v.optional(v.string()),
      connectedAt: v.optional(v.number()),
      connectedBy: v.optional(v.id("users")),
      revokedAt: v.optional(v.number()),
      lastError: v.optional(v.string()),
      lastErrorAt: v.optional(v.number()),
      lastCheckedAt: v.optional(v.number()),
      storageUsed: v.optional(v.number()),
      storageLimit: v.optional(v.number()),
      // Last automatic document self-test (run once after connecting).
      selfTestAt: v.optional(v.number()),
      selfTestOk: v.optional(v.boolean()),
      selfTestRows: v.optional(v.any()),
    }).index("by_key", ["key"]),

    // Google Drive credentials entered by a State Admin on the Admin page.
    // ONLY the client id (not secret) and the app address are stored in the
    // clear; the client secret is AES-256-GCM encrypted and the key lives in
    // the separate `appSecrets` table below — never in this row.
    driveCredentials: defineTable({
      key: v.string(), // "google_drive"
      clientId: v.optional(v.string()),
      clientSecretCipher: v.optional(v.string()),
      appOrigin: v.optional(v.string()),
      updatedAt: v.optional(v.number()),
      updatedBy: v.optional(v.id("users")),
      updatedByName: v.optional(v.string()),
      clientIdUpdatedAt: v.optional(v.number()),
      clientIdUpdatedByName: v.optional(v.string()),
      secretUpdatedAt: v.optional(v.number()),
      secretUpdatedByName: v.optional(v.string()),
      originUpdatedAt: v.optional(v.number()),
      originUpdatedByName: v.optional(v.string()),
    }).index("by_key", ["key"]),

    // Encryption material, deliberately in its OWN table so the ciphertext in
    // `driveCredentials` / `driveConnection` and the key never sit in one row.
    // Never returned by any public query or mutation.
    appSecrets: defineTable({
      key: v.string(), // "drive-token-key"
      value: v.string(), // base64url 32 random bytes
      createdAt: v.number(),
      createdBy: v.optional(v.id("users")),
      rotatedAt: v.optional(v.number()),
      rotatedBy: v.optional(v.id("users")),
    }).index("by_key", ["key"]),

    // One row per OAuth handshake: the anti-forgery `state` plus the PKCE
    // verifier. Single-use — the callback consumes it, and it expires in 10
    // minutes. No token is ever stored here.
    driveOauthStates: defineTable({
      state: v.string(),
      verifier: v.string(),
      userId: v.id("users"),
      // The exact redirect_uri the consent flow started with. The code
      // exchange must send the SAME value back to Google, so it travels with
      // the handshake instead of being recomputed later.
      redirectUri: v.optional(v.string()),
      createdAt: v.number(),
      expiresAt: v.number(),
    }).index("by_state", ["state"]),

    // Password re-check attempts for Drive credential changes (5 / 15 minutes).
    driveCredentialAttempts: defineTable({
      userId: v.id("users"),
      at: v.number(),
    }).index("by_user", ["userId", "at"]),

    // In-app notice for the OTHER State Admins when credentials change.
    driveNotices: defineTable({
      kind: v.string(), // "credentials_changed" | "key_rotated" | "credentials_cleared"
      message: v.string(),
      actorId: v.optional(v.id("users")),
      actorName: v.optional(v.string()),
      createdAt: v.number(),
      dismissedBy: v.optional(v.array(v.string())),
    }).index("by_time", ["createdAt"]),

    // In-flight resumable uploads + the 24-hour retry queue. `key` is the
    // client-generated idempotency key: retrying the same upload never creates
    // a second Drive file.
    driveUploads: defineTable({
      key: v.string(),
      facilityId: v.id("facilities"),
      docKey: v.string(),
      cycleNo: v.number(),
      originalName: v.string(),
      declaredMime: v.string(),
      declaredSize: v.number(),
      folderId: v.string(),
      sessionUri: v.optional(v.string()),
      // Short code shown in the UI and in every server error for this upload,
      // so a user can quote one identifier (never a token or a Drive id).
      ref: v.optional(v.string()),
      /** Bytes Drive has accepted so far — Retry resumes from here. */
      receivedBytes: v.optional(v.number()),
      // Set once Drive confirms the upload, before verification runs.
      driveFileId: v.optional(v.string()),
      status: v.string(), // open | received | finalising | done | failed | cancelled
      error: v.optional(v.string()),
      attempts: v.number(),
      createdBy: v.id("users"),
      createdAt: v.number(),
      expiresAt: v.number(),
    })
      .index("by_key", ["key"])
      .index("by_facility", ["facilityId"])
      .index("by_status", ["status"]),

    // One ZIP export per request (library filter, one block or one facility).
    // The job streams Drive → ZIP → Drive with bounded memory; only metadata
    // and the resumable session id live here (never a Drive URL or token).
    documentExports: defineTable({
      jobId: v.string(),
      requestedBy: v.id("users"),
      requestedByName: v.string(),
      facilityId: v.optional(v.id("facilities")),
      scopeLabel: v.string(),
      baseName: v.string(),
      includeVersions: v.boolean(),
      status: v.string(), // queued | running | done | failed
      filesCount: v.number(),
      cursor: v.number(),
      // Current 500 MB part.
      partNo: v.number(),
      partStart: v.number(),
      partEnd: v.number(),
      partName: v.optional(v.string()),
      partSessionUri: v.optional(v.string()),
      partTotalSize: v.optional(v.number()),
      partOffset: v.number(),
      partEntries: v.array(
        v.object({ name: v.string(), size: v.number(), crc: v.number(), offset: v.number() }),
      ),
      parts: v.array(
        v.object({ name: v.string(), driveFileId: v.string(), size: v.number() }),
      ),
      /** 500 MB normally; the one retry uses 200 MB. */
      partLimit: v.optional(v.number()),
      /** 0 = first attempt, 1 = the single retry has been used. */
      retryCount: v.optional(v.number()),
      error: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_job", ["jobId"])
      .index("by_requester", ["requestedBy", "createdAt"]),

    // The frozen selection of one export, so a later edit or upload never
    // changes a job that is already running (and the manifest can be rebuilt
    // when a 500 MB part closes).
    documentExportFiles: defineTable({
      jobId: v.string(),
      idx: v.number(),
      documentId: v.id("facilityDocuments"),
      driveFileId: v.string(),
      facilityId: v.id("facilities"),
      facilityName: v.string(),
      block: v.string(),
      nin: v.optional(v.string()),
      docKey: v.string(),
      docLabel: v.string(),
      cycleNo: v.number(),
      originalName: v.string(),
      displayName: v.optional(v.string()),
      size: v.number(),
      mimeType: v.string(),
      uploadedAt: v.number(),
      uploadedByName: v.string(),
      versionNo: v.number(),
      isVersion: v.optional(v.boolean()),
    })
      .index("by_job_idx", ["jobId", "idx"]),

    // One row per reconciliation run — the "Document storage health" report.
    driveHealthRuns: defineTable({
      startedAt: v.number(),
      finishedAt: v.optional(v.number()),
      checked: v.number(),
      missing: v.number(),
      changed: v.number(),
      orphans: v.number(),
      error: v.optional(v.string()),
    }).index("by_started", ["startedAt"]),

    // One row per FACILITY × FINANCIAL YEAR × QUARTER — the quarterly IA
    // store (NQAS IA, Kayakalp IA, Eco-Friendly Scorecard). UNIQUE per
    // facility+period by construction: the IA apply upserts on
    // (facilityId, fy, quarter), so re-uploading a quarter updates the same
    // row and can never duplicate it. Scores keep their written precision;
    // null means "Not reported" — a blank score cell is NEVER stored as 0.
    // The legacy facilities.nqasIaQ1/Q2 + kayakalpIaQ1/Q2 columns stay
    // untouched (they are backfilled once by backfillIaFromLegacy and remain
    // readable); IA surfaces below read this table instead.
    facilityIaQuarters: defineTable({
      facilityId: v.id("facilities"),
      fy: v.string(), // "2026-27"
      quarter: v.number(), // 1..4
      nqasIaScore: v.optional(v.number()),
      kayakalpIaScore: v.optional(v.number()),
      ecoFriendlyScore: v.optional(v.number()),
      // Portal remark text kept from text-in-score-column cells ("New PHC"
      // → remark + chip) — never silently dropped, never a 0.
      nqasRemark: v.optional(v.string()),
      kayakalpRemark: v.optional(v.string()),
      ecoRemark: v.optional(v.string()),
      sourceBatchId: v.optional(v.id("importBatches")),
      updatedBy: v.optional(v.id("users")),
      updatedByName: v.optional(v.string()),
      updatedAt: v.number(),
      // Part 2 ④: written before the quarter ended → provisional until a
      // State Admin marks the quarter final. Absent/false = final.
      provisional: v.optional(v.boolean()),
      // Part C ③: a facility can be Not applicable for one quarter (it did not
      // exist yet, the importer sent "New PHC"/"NA"/"Not assessed", or an
      // admin marked it). Not-applicable facilities leave the denominator and
      // are listed with their reason in the missing-quarters view.
      notApplicable: v.optional(v.boolean()),
      notApplicableReason: v.optional(v.string()),
      notApplicableBy: v.optional(v.id("users")),
      notApplicableAt: v.optional(v.number()),
      /** A State Admin closed a quarter with known gaps (audited). */
      gapAccepted: v.optional(v.boolean()),
      gapAcceptedReason: v.optional(v.string()),
      // Quarter lock: a State Admin can freeze a verified quarter; imports
      // into a locked period need an override reason, which is audited.
      lockedAt: v.optional(v.number()),
      lockedBy: v.optional(v.id("users")),
    })
      .index("by_facility", ["facilityId"])
      .index("by_period", ["fy", "quarter"])
      .index("by_facility_period", ["facilityId", "fy", "quarter"]),

    // Document migration runs (legacy Convex files / links → Drive). Idempotent:
    // re-running only touches rows that are not yet verified.
    driveMigrationRuns: defineTable({
      startedAt: v.number(),
      finishedAt: v.optional(v.number()),
      scanned: v.number(),
      imported: v.number(),
      skipped: v.number(),
      failed: v.number(),
      byUser: v.optional(v.id("users")),
      errors: v.optional(v.array(v.object({ label: v.string(), error: v.string() }))),
    }).index("by_started", ["startedAt"]),

    // ---------- Pending & Follow-up ----------
    // One small row per (facility, rule) that a user edited. The issue itself
    // is always recomputed from the cached facility/cycle/IA/document lists —
    // this table carries only the remark, follow-up, assignee and status. A
    // row is kept after the condition clears, so the remark stays in history.
    issue_state: defineTable({
      facilityId: v.id("facilities"),
      ruleId: v.string(),
      // Identity snapshot (shown by resolved history without re-reading rows).
      facilityName: v.optional(v.string()),
      block: v.optional(v.string()),
      phc: v.optional(v.string()),
      facilityType: v.optional(v.string()),
      remark: v.optional(v.string()),
      followUpDate: v.optional(v.string()),
      assignee: v.optional(v.string()),
      // open | in-progress | snoozed | resolved
      status: v.optional(v.string()),
      snoozeUntil: v.optional(v.string()),
      snoozeReason: v.optional(v.string()),
      // The last reason text seen while the issue was open — history keeps it.
      lastReason: v.optional(v.string()),
      resolvedAt: v.optional(v.number()),
      updatedAt: v.number(),
      updatedBy: v.optional(v.id("users")),
      updatedByName: v.optional(v.string()),
    })
      .index("by_facility_rule", ["facilityId", "ruleId"])
      .index("by_facility", ["facilityId"])
      .index("by_block", ["block"]),

    // ---------- Links Organiser ----------
    // A searchable register of report / data-collection links. Categories and
    // owners are editable lists; items carry the sheet's columns plus schedule
    // and visibility. URLs live in their own table so one report can have
    // several (and a form link). Nothing here stores credentials, and the
    // `visibility` column is enforced by links.list before rows leave the API.
    link_category: defineTable({
      name: v.string(),
      colour: v.string(), // design-token key (teal, blue, violet, amber, rose, slate)
      icon: v.optional(v.string()),
      order: v.number(),
      active: v.boolean(),
      createdBy: v.optional(v.id("users")),
      createdAt: v.number(),
    })
      .index("by_name", ["name"])
      .index("by_order", ["order"]),

    link_owner: defineTable({
      name: v.string(),
      active: v.boolean(),
      createdBy: v.optional(v.id("users")),
      createdAt: v.number(),
    })
      .index("by_name", ["name"])
      .index("by_active", ["active"]),

    link_item: defineTable({
      serial: v.number(),
      categoryId: v.id("link_category"),
      title: v.string(),
      description: v.optional(v.string()),
      frequency: v.string(), // value from linksConfig.frequencies
      customDays: v.optional(v.number()),
      lastUpdated: v.optional(v.string()), // ISO date; blank is never 0
      nextDue: v.optional(v.string()), // derived + stored for the by_next_due index
      ownerId: v.optional(v.id("link_owner")),
      level: v.optional(v.string()), // National | State | District
      status: v.string(), // linksConfig.statuses[].name
      remarks: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      visibility: v.string(), // everyone | editors | admin
      pinned: v.optional(v.boolean()),
      sortOrder: v.number(),
      archivedAt: v.optional(v.number()),
      archivedBy: v.optional(v.id("users")),
      createdBy: v.optional(v.id("users")),
      createdAt: v.number(),
      updatedBy: v.optional(v.id("users")),
      updatedAt: v.number(),
    })
      .index("by_serial", ["serial"])
      .index("by_category", ["categoryId"])
      .index("by_status", ["status"])
      .index("by_next_due", ["nextDue"])
      .index("by_owner", ["ownerId"])
      .index("by_title", ["title"])
      .searchIndex("search_title", { searchField: "title" }),

    link_url: defineTable({
      itemId: v.id("link_item"),
      label: v.string(),
      url: v.string(),
      type: v.string(), // web | sheet | doc | form | pdf | drive | video | other
      isPrimary: v.boolean(),
      position: v.number(),
      kind: v.string(), // link | form
      lastCheck: v.optional(v.number()),
      checkStatus: v.optional(v.string()), // ok | not_found | timeout | not_checked
    })
      .index("by_item", ["itemId"])
      .index("by_item_position", ["itemId", "position"]),

    link_update_log: defineTable({
      itemId: v.id("link_item"),
      updatedOn: v.string(),
      updatedBy: v.optional(v.id("users")),
      updatedByName: v.optional(v.string()),
      periodNote: v.optional(v.string()),
      note: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_item", ["itemId"])
      .index("by_item_time", ["itemId", "createdAt"]),

    // Part 4 — the QR snapshot behind `/r/<token>`. ONE row per stored copy of
    // a printed facility sheet. The token opens ONLY this snapshot: never live
    // data, never another facility. Store ids (driveFileId / legacyStorageId)
    // are server-side only — no public query ever returns them, and the file
    // endpoint streams the bytes through this app instead of a Drive link.
    sharedReports: defineTable({
      token: v.string(),
      facilityId: v.id("facilities"),
      cycleNumber: v.optional(v.number()),
      fileName: v.string(),
      contentHash: v.string(),
      facilityName: v.string(),
      facilityType: v.optional(v.string()),
      generatedAt: v.number(),
      /** 0 = never expires (Admin → Shared reports: link validity, 0 days). */
      expiresAt: v.number(),
      revokedAt: v.optional(v.number()),
      createdBy: v.optional(v.id("users")),
      createdByName: v.optional(v.string()),
      openCount: v.number(),
      lastOpenedAt: v.optional(v.number()),
      /** "drive" (the private `_shared-reports` folder) or "convex". */
      storage: v.optional(v.string()),
      driveFileId: v.optional(v.string()),
      legacyStorageId: v.optional(v.string()),
      size: v.optional(v.number()),
      /** Facility.updatedAt at generation — drives the amber "data has
       *  changed" note on the digital copy page. */
      facilityUpdatedAt: v.optional(v.number()),
      storedAt: v.optional(v.number()),
      /** expiresAt + 30 days — when the row and its file are removed. */
      cleanupAt: v.optional(v.number()),
      /** Part 3 — one random (≥96-bit) token per document version printed in
       *  this snapshot. The WhatsApp/print link is
       *  `/r/<shareToken>/d/<docToken>`; the store ids never leave the server. */
      documentLinks: v.optional(
        v.array(
          v.object({
            token: v.string(),
            documentId: v.id("facilityDocuments"),
            docKey: v.string(),
            cycleNumber: v.number(),
            fileName: v.string(),
            mimeType: v.string(),
            size: v.number(),
            sha256: v.string(),
            storage: v.string(),
            driveFileId: v.optional(v.string()),
            legacyStorageId: v.optional(v.string()),
            openedCount: v.optional(v.number()),
          }),
        ),
      ),
      /** Generation-time QR self-check (Part 2.3): set when the decoded URL
       *  did not match the stored short link; surfaced in Admin. */
      qrCheckFailed: v.optional(v.boolean()),
    })
      .index("by_token", ["token"])
      .index("by_facility", ["facilityId"])
      .index("by_hash", ["facilityId", "contentHash", "fileName"])
      .index("by_cleanup", ["cleanupAt"]),

    // ---------- Admin → Pages (custom pages) ----------
    // One row per page an Admin creates: a saved line list (or report)
    // definition plus its nav placement and role visibility. Built-in pages
    // are config, not rows — their overrides live in appSettings
    // (pageOverrides) so a deploy never fights an admin's choice.
    customPages: defineTable({
      name: v.string(),
      slug: v.string(),
      icon: v.string(),
      group: v.string(),
      order: v.number(),
      roles: v.array(v.string()),
      /** Explicit "Everyone" (replaces the old empty-role-list ambiguity). */
      everyone: v.optional(v.boolean()),
      /** Visible switch. False keeps the page in Trash-adjacent state but the
       *  route returns 403. Defaults to true when absent. */
      visible: v.optional(v.boolean()),
      /** Report Builder definition this page was built from ("report" type). */
      sourceReportId: v.optional(v.string()),
      type: v.string(), // "lineList" | "report"
      /** Serialisable LineListDefinition (columns, filters, sort, group…). */
      definition: v.any(),
      allowDownload: v.boolean(),
      createdBy: v.optional(v.id("users")),
      createdByName: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
      .index("by_slug", ["slug"])
      .index("by_deleted", ["deletedAt"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
