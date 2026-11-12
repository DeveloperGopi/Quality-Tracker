/**
 * FACILITY DOCUMENTS — the registry in front of the FileStore.
 *
 * The DATABASE decides which document belongs to which facility; Drive only
 * holds bytes. Nothing in this module returns a Drive id, a Drive URL or a
 * token to the browser:
 *
 *   • `listForFacility` returns metadata only (name, type, size, version, who).
 *   • A download/preview is a 5-minute signed token bound to the user AND the
 *     document, minted only after a role + block-scope + state check.
 *   • An upload is: begin (resumable session) → chunks → finalise (verify) and
 *     nothing is attached until verification passes.
 */

import { ConvexError, v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  allowedBlockNames,
  canEdit,
  canEditAll,
  requireActivatedUser,
} from "./facilities";
import { actionUser, driveDeps, rootFolderFor } from "./drive";
import { FileStoreError, asFileStoreError } from "./storage/fileStore";
import { UploadSessionService } from "./storage/uploadSession";
import {
  ACTIVE_DOC_TYPES,
  COUNTED_DOC_KEYS,
  canonicalDocKey,
  docType,
  isCountedDocKey,
  maxBytesFor,
  type DocKey,
  type DocumentLimits,
} from "./storage/validation";
import { documentDisplayName } from "./storage/displayName";
import { isFacilityDocument } from "../lib/documentCycles";

import {
  normalizeDocumentRules,
  resolveDocumentRequirements,
  isCertifiedOrConditional,
} from "../lib/documentRules";
import { randomBytes, sha256Hex, signReadToken } from "./storage/crypto";
import { chunkFailureFor, uploadRefCode, withRef } from "./storage/uploadProtocol";
import {
  DRIVE_NOT_CONNECTED_MESSAGE,
  DRIVE_SETTINGS_KEY,
  getUploadState,
  resolveDriveSettings,
  uploadsPaused,
} from "../lib/driveSettings";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                     */
/* ------------------------------------------------------------------ */

type UserLike = { _id: string; appRole?: string | null; blockIds?: string[] | null; name?: string | null; email?: string | null };

async function userForAction(ctx: ActionCtx): Promise<UserLike> {
  // The session subject is the user id: Convex Auth's JWT has no email claim.
  const user = await actionUser(ctx);
  if (!user) throw new ConvexError("Sign in again — this action needs a signed-in account.");
  if (!user.appRole) throw new ConvexError("Account is not activated for this app yet");
  return user as UserLike;
}

async function scopedFacility(ctx: QueryCtx, facilityId: Id<"facilities">) {
  return await ctx.db.get(facilityId);
}

const TOKEN_TTL_MS = 5 * 60_000;

/**
 * The SAME key the HTTP handler verifies with: `DOC_TOKEN_KEY` when the
 * deployment sets it (ops-managed), else the Admin-saved / DRIVE_TOKEN_KEY
 * material resolved by the Drive config. Signing with a different key was a
 * real Preview failure: HMAC verification rejects every link.
 */
async function contentTokenKey(ctx: ActionCtx): Promise<string> {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const envKey = proc?.env?.DOC_TOKEN_KEY?.trim();
  if (envKey) return envKey;
  const config = await ctx.runQuery(internal.drive.configForServer, {});
  if (!config.tokenKey)
    throw new ConvexError(
      "Preview is not available yet: ask the administrator to save the Google Drive settings (the encryption key is missing).",
    );
  return config.tokenKey;
}

/**
 * A failed upload must reach the form as a sentence. Convex redacts any error
 * that is not a `ConvexError` (the browser just sees "Server Error / Called by
 * client"), so every expected upload failure is translated here — and only
 * our own wording, never a Google response, a token or a session URI.
 */
function uploadFailure(err: unknown, ref?: string | null): never {
  if (err instanceof ConvexError) throw err;
  throw new ConvexError(uploadErrorMessage(err, ref));
}

function uploadErrorMessage(err: unknown, ref?: string | null): string {
  const e = asFileStoreError(err);
  const say = (message: string) => withRef(message, ref);
  switch (e.code) {
    case "not_configured":
      // A missing root folder is a Settings problem the admin can fix;
      // everything else about the connection is the standard sentence.
      return /root folder/i.test(e.message)
        ? say("Document storage is not set up: the root folder is missing in Settings → Google Drive")
        : say(DRIVE_NOT_CONNECTED_MESSAGE);
    case "auth_revoked":
      return say("Document storage needs reconnecting: ask the administrator, then retry this upload");
    case "quota_exceeded":
      return say("Google Drive is full: ask the administrator to free space");
    case "rate_limited":
      return say("Google Drive is busy — wait a moment and retry");
    case "not_found":
      // The specific cause (file gone, last part never arrived) is already a
      // plain sentence — never collapse it into "did not finish".
      return say(/retry/i.test(e.message) ? e.message : `${e.message} — retry`);
    case "corrupt":
      return say("The uploaded file did not match its checksum — retry");
    case "rejected":
      // Type, size, duplicate and session wording is already user-facing.
      return say(e.message);
    default:
      // Our own plain sentences (permission, scope, unknown type) are useful;
      // anything else falls back to the one generic line.
      return say(
        /^(the |this |you |upload|file |unknown )/i.test(e.message)
          ? e.message
          : "The upload failed — retry, or ask the administrator",
      );
  }
}

/** The six document definitions the UI, exports and validation share. */
export const DOCUMENT_DEFINITIONS = ACTIVE_DOC_TYPES.map((d) => ({
  key: d.key,
  label: d.label,
  maxMb: d.maxMb,
  requiredForCertified: d.requiredForCertified,
  mimes: [...d.mimes],
}));

/* ------------------------------------------------------------------ */
/* Reads                                                              */
/* ------------------------------------------------------------------ */

export const listForFacility = query({
  args: { facilityId: v.id("facilities"), cycleNo: v.optional(v.number()) },
  handler: async (ctx, { facilityId, cycleNo: requestedCycle }) => {
    const user = await requireActivatedUser(ctx);
    const facility = await scopedFacility(ctx, facilityId);
    if (!facility) throw new Error("Facility not found");
    const allowed = await allowedBlockNames(ctx, user);
    if (allowed !== null && !allowed.has(facility.block))
      throw new Error("This facility is outside your assigned blocks");

    const rows = await ctx.db
      .query("facilityDocuments")
      .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
      .collect();

    // Metadata only — never a Drive id, folder id, link or token.
    const map = (d: (typeof rows)[number]) => ({
      id: String(d._id),
      docKey: d.docKey,
      cycleNo: d.cycleNo,
      originalName: d.originalName,
      displayName: d.displayName ?? d.originalName,
      mimeType: d.mimeType,
      size: d.size,
      versionNo: d.versionNo,
      uploadedAt: d.uploadedAt,
      uploadedByName: d.uploadedByName ?? "System",
      removedAt: d.removedAt ?? null,
      missingInDrive: !!d.missingInDriveAt,
    });

    // Part D: the legacy `NQAS_Certificate` rows ARE the NQAS Certified Result
    // — one document, whatever key the file was stored under. The newer file
    // is the current one; the older becomes a previous version.
    const keysFor = (key: string): string[] =>
      key === "NQAS_Result" ? ["NQAS_Result", "NQAS_Certificate"] : [key];
    /* The resolved Admin → Documents size limits (the same numbers
       `beginUpload` enforces) — the slot's hint and its pre-check read these,
       so the box can never promise 25 MB while the server refuses at 10. */
    const driveRow = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", DRIVE_SETTINGS_KEY))
      .first();
    const driveSettings = resolveDriveSettings(driveRow?.value);
    const limitFor = (key: string) =>
      Math.round(
        maxBytesFor(key as never, {
          defaultMaxMb: driveSettings.maxMb,
          perType: driveSettings.perTypeMb,
        } as Partial<DocumentLimits>) /
          (1024 * 1024),
      );
    const definitions = ACTIVE_DOC_TYPES.map((type) => {
      const mine = rows
        .filter((d) => keysFor(type.key).includes(d.docKey))
        .filter(
          (d) =>
            isFacilityDocument(type.key) ||
            requestedCycle == null ||
            (d.cycleNo ?? 1) === requestedCycle,
        )
        .sort((a, b) => b.uploadedAt - a.uploadedAt || b.versionNo - a.versionNo);
      const current = mine.find((d) => d.isCurrent && !d.removedAt) ?? null;
      const removed = mine
        .filter((d) => d.removedAt && Date.now() - d.removedAt < 30_000)
        .sort((a, b) => b.removedAt! - a.removedAt!)[0];
      return {
        key: type.key,
        label: type.label,
        requiredForCertified: type.requiredForCertified,
        maxMb: limitFor(type.key),
        current: current ? map(current) : null,
        // Every other live row is a previous version — including a SECOND
        // current row that came from the other (legacy) key. The newer file
        // is current; the older one is demoted, never hidden or deleted.
        versions: mine
          .filter((d) => !d.removedAt && (!current || String(d._id) !== String(current._id)))
          .sort((a, b) => b.uploadedAt - a.uploadedAt || b.versionNo - a.versionNo)
          .map(map),
        canUndoRemove: removed ? removed._id : null,
      };
    });

    const current = rows.filter((d) => d.isCurrent && !d.removedAt && !d.missingInDriveAt);
    // The count is over the SIX department documents, from the database only
    // (never Drive). A legacy certificate row counts as the NQAS Certified
    // Result — one document, one count.
    const counted = current.filter((d) => isCountedDocKey(canonicalDocKey(d.docKey)));
    const connection = await ctx.db
      .query("driveConnection")
      .withIndex("by_key", (q) => q.eq("key", "google_drive"))
      .first();

    /* ---------------------------------------------------------------- */
    /* ONE upload gate (task 1.2): the SAME `getUploadState` the server
       rejection and the Admin page use, computed here from database rows
       only (no Drive call on a read path). The chip, the card and the
       uploader all read THIS — so "Storage OK" can never sit beside
       "Uploads are paused by the administrator" again. */
    /* ---------------------------------------------------------------- */
    const storageConnected =
      !!connection &&
      !connection.revokedAt &&
      (connection.mode === "service_account" || !!connection.refreshTokenCipher);
    const storageLimit = connection?.storageLimit ?? 0;
    const storageUsed = connection?.storageUsed ?? 0;
    const upload = getUploadState({
      settings: driveSettings,
      connected: storageConnected,
      revoked: !!connection?.revokedAt,
      storageFull: storageLimit > 0 && storageUsed >= storageLimit * 0.99,
    });

    /* ------------------------------------------------------------------ */
    /* Part C — the effective requirement comes from the ONE Admin rule    */
    /* set, evaluated against this facility's facts. The badge, the        */
    /* blocking check and the counts all read THIS result.                 */
    /* ------------------------------------------------------------------ */
    const rulesRow = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "documentRules"))
      .first();
    const rules = normalizeDocumentRules(rulesRow?.value);

    const [naRows, funds, building, nocs, cycleRows] = await Promise.all([
      ctx.db
        .query("nationalAssessments")
        .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
        .collect(),
      ctx.db
        .query("gapClosureFunds")
        .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
        .collect(),
      ctx.db
        .query("buildingDetails")
        .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
        .first(),
      ctx.db
        .query("fireNocs")
        .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
        .collect(),
      ctx.db
        .query("certificationCycles")
        .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
        .collect(),
    ]);

    // The requested assessment cycle decides the rule. Without an explicit
    // cycle, the newest assessment wins so an old certified cycle can never
    // require documents in a fresh one.
    const requestedCycleRow =
      requestedCycle == null
        ? null
        : cycleRows.find((c) => c.cycleNumber === requestedCycle) ?? null;
    const na = requestedCycleRow
      ? naRows.find((n) => String(n.cycleId) === String(requestedCycleRow._id))
      : naRows.sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0))[0];
    const certified = isCertifiedOrConditional(na?.certificationStatus ?? null);
    const requirements = resolveDocumentRequirements(rules, {
      certStatus: na?.certificationStatus ?? null,
      gapAmount: funds.reduce((max, f) => Math.max(max, f.amountSanctioned ?? 0), 0),
      dilapidated: (building?.buildingStatus ?? "").toLowerCase() === "dilapidated",
      fireNocRecorded: nocs.some(
        (n) => !!n.nocNumber || !!n.issuedDate || !!n.attachmentId || /obtained|valid/i.test(n.status ?? ""),
      ),
    });

    const requirementCycle = requestedCycle ?? facility.currentCycleNumber ?? 1;
    const present = new Set(
      current
        .filter(
          (d) =>
            isFacilityDocument(d.docKey) ||
            requestedCycle != null ||
            (d.cycleNo ?? 1) === requirementCycle,
        )
        .map((d) => canonicalDocKey(d.docKey)),
    );
    const requiredKeys = Object.keys(requirements).filter((k) => requirements[k].required);
    const requiredMissing = requiredKeys.filter((k) => !present.has(k as DocKey));
    const blockingMissing = requiredMissing.filter((k) => requirements[k].blocking);
    return {
      facilityId: String(facility._id),
      // Part 3 ④: the "Storage OK / Needs attention" chip in every Documents
      // section reads this — true only when Drive is connected and live.
      // Connected means a usable credential is stored — a consent that was
      // started but never finished has no refresh token, so uploads cannot
      // work and the panel must say so up front.
      storageConnected,
      /** The single upload gate — { allowed, reason, message, chip, since,
       *  setBy, until }. Read by the chip, the card and the uploader. */
      upload,
      facilityName: facility.name,
      nin: facility.ninNumber ?? null,
      // A stale 0 pointer must never file documents under "cycle 0".
      cycleNo: facility.currentCycleNumber || 1,
      cycles: Array.from(
        new Set([
          ...cycleRows.map((cycle) => cycle.cycleNumber),
          facility.currentCycleNumber || 1,
        ]),
      )
        .filter((n) => n > 0)
        .sort((a, b) => a - b),
      // The browser/server PDF reader is removed from this build.
      readerEnabled: false,
      // The badge on every row is the resolved rule, so the label can never
      // say "Optional" while the same rule blocks saving.
      documents: definitions.map((d) => ({ ...d, requirement: requirements[d.key] ?? null })),
      uploadedCount: counted.length,
      pendingCount: Math.max(0, COUNTED_DOC_KEYS.length - counted.length),
      countedKeys: COUNTED_DOC_KEYS as string[],
      missingCount: rows.filter((d) => d.missingInDriveAt && !d.removedAt).length,
      totalCount: COUNTED_DOC_KEYS.length,
      totalRows: ACTIVE_DOC_TYPES.length,
      // Part C: the effective rule per document, and the derived count the
      // header, Needs attention and the save gate all read.
      rules,
      requirements,
      requiredMissing,
      blockingMissing,
      certified,
    };
  },
});

/* ------------------------------------------------------------------ */
/* Paused-upload tray (24 hours)                                      */
/* ------------------------------------------------------------------ */

/** How long a file chosen while uploads are paused is kept. */
export const TRAY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * The signed-in user's tray rows for one facility. Expired rows are filtered
 * out here (the hourly `pruneTray` removes them for real). No bytes, Drive id
 * or token is ever part of this payload.
 */
export const listTray = query({
  args: { facilityId: v.id("facilities") },
  handler: async (ctx, { facilityId }) => {
    const user = await requireActivatedUser(ctx);
    const facility = await scopedFacility(ctx, facilityId);
    if (!facility) throw new Error("Facility not found");
    const allowed = await allowedBlockNames(ctx, user);
    if (allowed !== null && !allowed.has(facility.block))
      throw new Error("This facility is outside your assigned blocks");

    const now = Date.now();
    const rows = await ctx.db
      .query("documentTray")
      .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
      .collect();
    return rows
      .filter((row) => row.createdBy === user._id && row.expiresAt > now)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((row) => ({
        trayId: row.trayId,
        docKey: row.docKey,
        cycleNo: row.cycleNo,
        originalName: row.originalName,
        declaredMime: row.declaredMime,
        declaredSize: row.declaredSize,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
      }));
  },
});

/**
 * Record that a file is waiting for uploads to resume. Idempotent by
 * `trayId`; choosing a different document type before resuming updates the
 * type, never the 24-hour expiry (a paused file cannot be kept for ever).
 */
export const queueTrayItem = mutation({
  args: {
    facilityId: v.id("facilities"),
    trayId: v.string(),
    docKey: v.string(),
    cycleNo: v.number(),
    originalName: v.string(),
    declaredMime: v.string(),
    declaredSize: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireActivatedUser(ctx);
    if (!canEdit(user as never)) throw new Error("You do not have permission to upload documents");
    const facility = await scopedFacility(ctx, args.facilityId);
    if (!facility) throw new Error("Facility not found");
    const allowed = await allowedBlockNames(ctx, user);
    if (allowed !== null && !allowed.has(facility.block))
      throw new Error("This facility is outside your assigned blocks");
    if (!docType(args.docKey)) throw new Error("Unknown document type");
    if (!args.trayId.trim()) throw new Error("This file cannot be queued");
    if (args.declaredSize <= 0) throw new Error("The file is empty");

    const existing = await ctx.db
      .query("documentTray")
      .withIndex("by_tray_id", (q) => q.eq("trayId", args.trayId))
      .first();
    if (existing) {
      if (existing.createdBy !== user._id)
        throw new Error("This queued file belongs to another user");
      await ctx.db.patch(existing._id, {
        docKey: args.docKey,
        cycleNo: args.cycleNo,
        originalName: args.originalName,
        declaredMime: args.declaredMime,
        declaredSize: args.declaredSize,
      });
      return { trayId: existing.trayId, expiresAt: existing.expiresAt };
    }

    const now = Date.now();
    const expiresAt = now + TRAY_TTL_MS;
    await ctx.db.insert("documentTray", {
      facilityId: args.facilityId,
      docKey: args.docKey,
      cycleNo: args.cycleNo,
      trayId: args.trayId,
      originalName: args.originalName,
      declaredMime: args.declaredMime,
      declaredSize: args.declaredSize,
      createdBy: user._id,
      createdAt: now,
      expiresAt,
    });
    return { trayId: args.trayId, expiresAt };
  },
});

/** Remove a waiting file (cancelled, uploaded, or expired). */
export const removeTrayItem = mutation({
  args: { trayId: v.string() },
  handler: async (ctx, { trayId }) => {
    const user = await requireActivatedUser(ctx);
    const row = await ctx.db
      .query("documentTray")
      .withIndex("by_tray_id", (q) => q.eq("trayId", trayId))
      .first();
    if (!row) return { removed: false as const };
    if (row.createdBy !== user._id && !canEditAll(user as never))
      throw new Error("This queued file belongs to another user");
    await ctx.db.delete(row._id);
    return { removed: true as const };
  },
});

/** Hourly cleanup: a paused file is never kept beyond its 24 hours. */
export const pruneTray = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("documentTray")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", Date.now()))
      .take(200);
    for (const row of rows) await ctx.db.delete(row._id);
    return { removed: rows.length };
  },
});

/**
 * ROOT CAUSE (ref MP2BJQ / KNX77Q): the minted URL was RELATIVE to the app
 * origin, but the handler lives on the Convex site (`convex/http.ts`), where
 * `/api/documents/content` is not a route — the app server answered with its
 * SPA HTML (200 text/html), so Preview/Open/Download never reached a byte.
 * The client now joins this path to `CONVEX_SITE_URL` before rendering an
 * anchor.
 *
 * The token is a STATELESS HMAC (5 minutes, bound to this user + document +
 * mode). It is minted here — after a role/scope/state check — and re-checked
 * by the HTTP handler, so a role change blocks even a live link. A PDF
 * viewer's Range requests and an image's single request both work; the older
 * single-use table is kept only as a fallback for links already in the wild.
 */
export const getContentToken = action({
  args: {
    documentId: v.id("facilityDocuments"),
    mode: v.union(v.literal("inline"), v.literal("attachment")),
  },
  handler: async (ctx, { documentId, mode }): Promise<{ token: string; expiresAt: number; url: string }> => {
    const user = await userForAction(ctx);
    const access = await ctx.runQuery(internal.documents.contentAccess, {
      documentId: String(documentId),
      userId: String(user._id),
    });
    if (!access.ok) throw new ConvexError(access.reason);

    // Resolved per click with the HTTP handler's exact precedence.
    const key = await contentTokenKey(ctx);
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const token = await signReadToken(
      { d: String(documentId), u: String(user._id), e: expiresAt, m: mode },
      key,
    );
    const url = `/api/documents/content?id=${encodeURIComponent(String(documentId))}&token=${encodeURIComponent(token)}&mode=${mode}`;
    return { token, expiresAt, url };
  },
});

/**
 * Bulk minting for a list page: ONE action call signs the visible rows, so a
 * library of a few hundred files does not fire a request per row. The HTTP
 * handler still re-checks the user's role and block scope for every read.
 */
export const getContentUrls = action({
  args: {
    documentIds: v.array(v.string()),
    mode: v.union(v.literal("inline"), v.literal("attachment")),
  },
  handler: async (ctx, { documentIds, mode }): Promise<Record<string, string>> => {
    const user = await userForAction(ctx);
    const key = await contentTokenKey(ctx);
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const out: Record<string, string> = {};
    for (const documentId of documentIds.slice(0, 5000)) {
      const token = await signReadToken(
        { d: documentId, u: String(user._id), e: expiresAt, m: mode },
        key,
      );
      out[documentId] = `/api/documents/content?id=${encodeURIComponent(documentId)}&token=${encodeURIComponent(token)}&mode=${mode}`;
    }
    return out;
  },
});

/** The document + caller checks a token mint can rely on. */
export const contentAccess = internalQuery({
  args: { documentId: v.string(), userId: v.string() },
  handler: async (ctx, { documentId, userId }) => {
    const doc = await ctx.db.get(documentId as Id<"facilityDocuments">);
    if (!doc) return { ok: false as const, reason: "Document not found" };
    const user = await ctx.db.get(userId as Id<"users">);
    if (!user) return { ok: false as const, reason: "Not signed in" };
    if (!user.appRole) return { ok: false as const, reason: "Account is not activated" };
    const facility = await ctx.db.get(doc.facilityId);
    if (!facility) return { ok: false as const, reason: "Facility not found" };
    const allowed = await allowedBlockNames(ctx, user);
    if (allowed !== null && !allowed.has(facility.block))
      return { ok: false as const, reason: "This document is outside your assigned blocks" };
    if (doc.removedAt)
      return { ok: false as const, reason: "This document was removed" };
    if (doc.missingInDriveAt)
      return { ok: false as const, reason: "This document is missing in storage — re-upload it" };
    return { ok: true as const };
  },
});

export const storeContentToken = internalMutation({
  args: {
    tokenHash: v.string(),
    documentId: v.string(),
    userId: v.string(),
    mode: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("documentReadTokens", {
      tokenHash: args.tokenHash,
      documentId: args.documentId as never,
      userId: args.userId as never,
      mode: args.mode,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });
  },
});

/**
 * The HTTP endpoint's gate: hash → look up → expiry → single use. Marking it
 * used in the same mutation is what makes a replayed URL fail even before the
 * five minutes are over. Returns the bound user id, never a token.
 */
export const consumeContentToken = internalMutation({
  args: { token: v.string(), documentId: v.string(), mode: v.string() },
  handler: async (ctx, args) => {
    const tokenHash = await sha256Hex(args.token);
    const row = await ctx.db
      .query("documentReadTokens")
      .withIndex("by_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();
    if (!row) return { ok: false as const, reason: "This link is not valid. Reload the page and try again." };
    if (String(row.documentId) !== args.documentId || row.mode !== args.mode)
      return { ok: false as const, reason: "This link does not match the document" };
    if (row.usedAt)
      return { ok: false as const, reason: "This link has already been used. Reload the page and try again." };
    if (row.expiresAt < Date.now())
      return { ok: false as const, reason: "This link has expired. Reload the page and try again." };
    await ctx.db.patch(row._id, { usedAt: Date.now() });
    return { ok: true as const, userId: String(row.userId) };
  },
});

export const pruneContentTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("documentReadTokens")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", Date.now() - 60_000))
      .take(200);
    for (const row of rows) await ctx.db.delete(row._id);
    return { removed: rows.length };
  },
});

/** The HTTP stream endpoint's data: bytes location + display metadata only. */
export const docForStream = internalQuery({
  args: { documentId: v.id("facilityDocuments"), userId: v.string() },
  handler: async (ctx, { documentId, userId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) return { ok: false as const, reason: "Document not found" };
    const user = await ctx.db.get(userId as Id<"users">);
    if (!user) return { ok: false as const, reason: "Not signed in" };
    if (!user.appRole) return { ok: false as const, reason: "Account is not activated" };
    const facility = await ctx.db.get(doc.facilityId);
    if (!facility) return { ok: false as const, reason: "Facility not found" };
    const allowed = await allowedBlockNames(ctx, user as never);
    if (allowed !== null && !allowed.has(facility.block))
      return { ok: false as const, reason: "Outside your assigned blocks" };
    if (doc.removedAt) return { ok: false as const, reason: "This document was removed" };
    if (doc.missingInDriveAt)
      return { ok: false as const, reason: "This document is missing in storage" };

    return {
      ok: true as const,
      id: String(doc._id),
      docKey: doc.docKey,
      storage: doc.storage,
      driveFileId: doc.driveFileId,
      legacyStorageId: doc.legacyStorageId ?? null,
      mimeType: doc.mimeType,
      originalName: doc.originalName,
      displayName: doc.displayName ?? doc.originalName,
      size: doc.size,
      facilityId: String(doc.facilityId),
      facilityName: facility.name,
      nin: facility.ninNumber ?? null,
      userId: String(user._id),
      userName: user.name ?? user.email ?? "User",
    };
  },
});

/**
 * Every DOWNLOAD is audited (and every NQAS Result read, as before). A preview
 * of a non-NQAS file is not a download and does not fill the activity log.
 */
export const recordDocumentAccess = internalMutation({
  args: {
    documentId: v.id("facilityDocuments"),
    userId: v.id("users"),
    docKey: v.string(),
    facilityId: v.id("facilities"),
    mode: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.mode !== "attachment" && args.docKey !== "NQAS_Result") return;
    const user = await ctx.db.get(args.userId);
    await ctx.db.insert("auditLogs", {
      table: "facilityDocuments",
      recordId: String(args.documentId),
      facilityId: args.facilityId,
      action: "view",
      field: args.mode === "inline" ? "preview" : "download",
      newValue: "NQAS Result",
      changedBy: args.userId,
      changedByName: user?.name ?? "User",
      changedAt: Date.now(),
    });
  },
});

/* ------------------------------------------------------------------ */
/* Upload                                                             */
/* ------------------------------------------------------------------ */

export const beginUpload = action({
  args: {
    facilityId: v.id("facilities"),
    docKey: v.string(),
    cycleNo: v.optional(v.number()),
    originalName: v.string(),
    declaredMime: v.string(),
    declaredSize: v.number(),
    /** Client-generated idempotency key — a retry must reuse it. */
    uploadKey: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ uploadKey: string; received: number; ref: string }> => {
    // Until an upload row exists there is no reference code yet.
    let ref = "";
    try {
      const user = await userForAction(ctx);
      if (!canEdit(user as never)) throw new Error("You do not have permission to upload documents");
      const type = docType(args.docKey);
      if (!type) throw new FileStoreError("rejected", "Unknown document type");

      const facility = await ctx.runQuery(internal.documents.facilityForAction, {
        facilityId: String(args.facilityId),
        userId: String(user._id),
      });
      if (!facility.ok) throw new Error(facility.reason);

      const settings = await ctx.runQuery(internal.drive.readDriveSettings, {});
      // ONE gate with the UI: a pause whose resume time has passed does not
      // block (auto-resume), and the wording matches `getUploadState` exactly.
      if (uploadsPaused(settings))
        throw new FileStoreError("rejected", "Uploads are paused by the administrator");
      const max = maxBytesFor(args.docKey as never, {
        defaultMaxMb: settings.maxMb,
        perType: settings.perTypeMb,
      } as Partial<DocumentLimits>);
      if (args.declaredSize <= 0) throw new FileStoreError("rejected", "The file is empty");
      if (args.declaredSize > max)
        throw new FileStoreError("rejected", `The file is larger than ${Math.round(max / 1024 / 1024)} MB`);

      // Fails with DRIVE_NOT_CONNECTED_MESSAGE when no refresh token is stored.
      const deps = await driveDeps(ctx);
      // Drive is FULL → say so now, before a single byte is sent.
      if (
        deps.connection.storageLimit &&
        deps.connection.storageLimit > 0 &&
        (deps.connection.storageUsed ?? 0) >= deps.connection.storageLimit * 0.99
      )
        throw new FileStoreError("quota_exceeded", "Google Drive is full: ask the administrator to free space");
      const root = rootFolderFor(deps);
      const cycleNo = args.cycleNo ?? facility.cycleNo ?? 1;
      const versionNo = await ctx.runQuery(internal.documents.nextVersion, {
        facilityId: String(args.facilityId),
        docKey: args.docKey,
        cycleNo,
      });
      const service = new UploadSessionService({ store: deps.store, folders: deps.folders });

      const plan = await service.plan(root, {
        nin: facility.nin,
        facilityName: facility.name,
        block: facility.block,
        docKey: args.docKey,
        cycleNo,
        versionNo,
        originalName: args.originalName,
        declaredMime: args.declaredMime,
        declaredSize: args.declaredSize,
        date: new Date().toISOString().slice(0, 10),
      });

      // Reuse an OPEN session for the same idempotency key (network retry). A
      // failed finalise wipes the session, so a Retry starts a fresh one
      // instead of resuming a Drive file that no longer exists.
      const existing = await ctx.runQuery(internal.documents.findUpload, { key: args.uploadKey });
      const reusable = existing?.status === "open" && !!existing.sessionUri ? existing : null;
      let sessionUri = reusable?.sessionUri ?? undefined;
      const received = reusable?.received ?? 0;
      ref = existing?.ref ?? uploadRefCode(() => randomBytes(6));
      if (!sessionUri) {
        sessionUri = await deps.client.createResumableSession({
          parentId: plan.folderId,
          name: plan.storedName,
          mimeType: args.declaredMime,
          size: args.declaredSize,
          appProperties: {
            facility_id: String(args.facilityId),
            doc_key: args.docKey,
            cycle: String(cycleNo),
            upload_key: args.uploadKey,
            nqas: "1",
          },
        });
        await ctx.runMutation(internal.documents.saveUpload, {
          key: args.uploadKey,
          facilityId: String(args.facilityId),
          docKey: args.docKey,
          cycleNo,
          originalName: args.originalName,
          declaredMime: args.declaredMime,
          declaredSize: args.declaredSize,
          folderId: plan.folderId,
          sessionUri,
          ref,
          userId: String(user._id),
        });
      }

      // The session URI stays on the server: the browser sends every chunk to
      // `uploadChunk` below (a direct PUT to Google is blocked by CORS).
      return { uploadKey: args.uploadKey, received, ref };
    } catch (err) {
      uploadFailure(err, ref || null);
    }
  },
});

export const facilityForAction = internalQuery({
  args: { facilityId: v.string(), userId: v.string() },
  handler: async (ctx, { facilityId, userId }) => {
    const facility = await ctx.db.get(facilityId as never);
    if (!facility) return { ok: false as const, reason: "Facility not found" };
    const user = await ctx.db.get(userId as never);
    if (!user) return { ok: false as const, reason: "Not signed in" };
    const allowed = await allowedBlockNames(ctx, user as never);
    if (allowed !== null && !allowed.has((facility as { block: string }).block))
      return { ok: false as const, reason: "This facility is outside your assigned blocks" };
    const f = facility as { name: string; block: string; ninNumber?: string | null; currentCycleNumber?: number | null };
    return {
      ok: true as const,
      name: f.name,
      block: f.block,
      nin: f.ninNumber ?? null,
      cycleNo: f.currentCycleNumber || 1,
    };
  },
});

export const nextVersion = internalQuery({
  args: { facilityId: v.string(), docKey: v.string(), cycleNo: v.number() },
  handler: async (ctx, { facilityId, docKey, cycleNo }) => {
    const rows = await ctx.db
      .query("facilityDocuments")
      .withIndex("by_facility_doc_cycle_current", (q) =>
        q.eq("facilityId", facilityId as never).eq("docKey", docKey).eq("cycleNo", cycleNo),
      )
      .collect();
    return rows.reduce((max, r) => Math.max(max, r.versionNo), 0) + 1;
  },
});

export const findUpload = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("driveUploads")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (!row) return null;
    return {
      key: row.key,
      sessionUri: row.sessionUri ?? null,
      status: row.status,
      // Real progress: Retry resumes from the last byte Drive accepted.
      received: row.receivedBytes ?? 0,
      ref: row.ref ?? null,
      driveFileId: row.driveFileId ?? null,
    };
  },
});

export const saveUpload = internalMutation({
  args: {
    key: v.string(),
    facilityId: v.string(),
    docKey: v.string(),
    cycleNo: v.number(),
    originalName: v.string(),
    declaredMime: v.string(),
    declaredSize: v.number(),
    folderId: v.string(),
    sessionUri: v.string(),
    ref: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("driveUploads")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    const row = {
      key: args.key,
      facilityId: args.facilityId as never,
      docKey: args.docKey,
      cycleNo: args.cycleNo,
      originalName: args.originalName,
      declaredMime: args.declaredMime,
      declaredSize: args.declaredSize,
      folderId: args.folderId,
      sessionUri: args.sessionUri,
      ref: args.ref,
      receivedBytes: 0,
      status: "open",
      attempts: existing?.attempts ?? 0,
      createdBy: args.userId as never,
      createdAt: existing?.createdAt ?? Date.now(),
      expiresAt: Date.now() + 24 * 3600_000,
    };
    // ONE row per upload key: a Retry that starts a fresh session updates the
    // existing row, never adding a duplicate entry.
    if (existing) await ctx.db.replace(existing._id, row);
    else await ctx.db.insert("driveUploads", row);
  },
});

/**
 * One chunk through the API (the only path). The server streams the bytes to
 * the stored Drive session; a 308 means "keep going". The browser never gets
 * the session URI, so no request leaves for `googleapis.com`.
 */
export const uploadChunk = action({
  args: {
    uploadKey: v.string(),
    offset: v.number(),
    bytes: v.bytes(),
    final: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ received: number; done: boolean }> => {
    let ref: string | null = null;
    try {
      const user = await userForAction(ctx);
      const upload = await ctx.runQuery(internal.documents.uploadForUser, {
        key: args.uploadKey,
        userId: String(user._id),
      });
      if (!upload.ok) throw new Error(upload.reason);
      ref = upload.ref;
      if (upload.status === "done") return { received: upload.size ?? 0, done: true };
      // Not a storage-connection problem: the session needs restarting.
      if (!upload.sessionUri)
        throw new FileStoreError(
          "rejected",
          withRef("The upload session expired — choose the file again", ref),
        );

      // `v.bytes()` arrives as an ArrayBuffer; Drive wants the raw bytes.
      const chunk = new Uint8Array(args.bytes);
      const end = args.offset + chunk.length - 1;
      const res = await fetch(upload.sessionUri, {
        method: "PUT",
        headers: {
          "Content-Type": upload.declaredMime,
          "Content-Range": `bytes ${args.offset}-${end}/${upload.declaredSize}`,
          "Content-Length": String(chunk.length),
        },
        body: chunk as unknown as BodyInit,
      });
      if (res.status === 308) {
        const received = UploadSessionService.resumeOffset(res.headers.get("range"));
        await ctx.runMutation(internal.documents.noteUploadProgress, {
          key: args.uploadKey,
          received,
        });
        return { received, done: false };
      }
      if (!res.ok) {
        const text = (await res.text()).slice(0, 300);
        // The specific failure (full, revoked, session gone, busy) + reference.
        const failure = chunkFailureFor(res.status, text, ref);
        await ctx.runMutation(internal.documents.noteUploadError, {
          key: args.uploadKey,
          error: `Drive rejected the chunk (${res.status}) ${failure.code}`.slice(0, 250),
        });
        throw failure;
      }
      // 200/201: Drive confirms — the FILE ID is in the body and must be
      // recorded, or finalise has nothing to verify.
      let body: { id?: string } | null = null;
      try {
        body = (await res.json()) as { id?: string };
      } catch {
        /* a body without JSON is handled by the fallback lookup in finalise */
      }
      const received = args.offset + chunk.length;
      await ctx.runMutation(internal.documents.noteUploadProgress, {
        key: args.uploadKey,
        received,
        driveFileId: typeof body?.id === "string" && body.id ? body.id : undefined,
      });
      return { received, done: args.final };
    } catch (err) {
      uploadFailure(err, ref);
    }
  },
});

export const uploadForUser = internalQuery({
  args: { key: v.string(), userId: v.string() },
  handler: async (ctx, { key, userId }) => {
    const row = await ctx.db
      .query("driveUploads")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (!row) return { ok: false as const, reason: "Upload session not found" };
    if (String(row.createdBy) !== userId) return { ok: false as const, reason: "This upload belongs to someone else" };
    if (row.status === "cancelled") return { ok: false as const, reason: "This upload was cancelled" };
    return {
      ok: true as const,
      status: row.status,
      sessionUri: row.sessionUri ?? null,
      cycleNo: row.cycleNo,
      declaredMime: row.declaredMime,
      declaredSize: row.declaredSize,
      size: row.declaredSize,
      receivedBytes: row.receivedBytes ?? 0,
      ref: row.ref ?? null,
      folderId: row.folderId,
      facilityId: String(row.facilityId),
      docKey: row.docKey,
    };
  },
});

export const noteUploadProgress = internalMutation({
  args: { key: v.string(), received: v.number(), driveFileId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Progress is durable so a Retry resumes at the accepted offset, and the
    // Drive file id is stored the moment Drive confirms the last chunk.
    const row = await ctx.db.query("driveUploads").withIndex("by_key", (q) => q.eq("key", args.key)).first();
    if (!row) return;
    await ctx.db.patch(row._id, {
      receivedBytes: Math.max(row.receivedBytes ?? 0, args.received),
      ...(args.driveFileId ? { driveFileId: args.driveFileId, status: "received" } : {}),
    });
  },
});

export const noteUploadError = internalMutation({
  args: { key: v.string(), error: v.string() },
  handler: async (ctx, { key, error }) => {
    const row = await ctx.db
      .query("driveUploads")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (!row) return;
    await ctx.db.patch(row._id, { error, attempts: row.attempts + 1 });
  },
});

/**
 * FINALISE — the gate. Verifies size, checksum and the REAL type, hashes the
 * stored bytes, checks duplicates, then attaches the document. Any failure
 * deletes the stored file and leaves nothing attached.
 */
export const finalizeUpload = action({
  args: { uploadKey: v.string(), driveFileId: v.optional(v.string()) },    handler: async (
      ctx,
      args,
    ): Promise<
      | { documentId: string; versionNo: number; duplicate?: false; message?: undefined }
      | { documentId: string; versionNo: number; duplicate: true; message: string }
    > => {
    let ref: string | null = null;
    let deps: Awaited<ReturnType<typeof driveDeps>> | null = null;
    let fileId: string | null = null;
    try {
      const user = await userForAction(ctx);
      const upload = await ctx.runQuery(internal.documents.uploadForUser, {
        key: args.uploadKey,
        userId: String(user._id),
      });
      if (!upload.ok) throw new ConvexError(upload.reason);
      ref = upload.ref;

      // A missing/incomplete Drive connection is reported, never redacted.
      deps = await driveDeps(ctx);
      fileId =
        args.driveFileId ?? (await ctx.runQuery(internal.documents.completedFileId, { key: args.uploadKey }));
      if (!fileId) {
        // The chunk that completed the file did not record its id (a client
        // that failed mid-call): find it by the `upload_key` Drive tagged it
        // with — the same idempotency key the upload started with.
        const found = await deps.client.listFiles({ uploadKey: args.uploadKey, pageSize: 5 });
        const match =
          found.files.find((f) => f.appProperties?.upload_key === args.uploadKey) ?? found.files[0] ?? null;
        if (match) {
          fileId = match.id;
          await ctx.runMutation(internal.documents.noteUploadProgress, {
            key: args.uploadKey,
            received: upload.declaredSize,
            driveFileId: match.id,
          });
        }
      }
      if (!fileId)
        throw new FileStoreError(
          "not_found",
          "The last part of the upload never reached the server — retry",
        );

      const meta = await deps.client.getFile(fileId);
      if (!meta) throw new FileStoreError("not_found", "The uploaded file is gone from storage — retry");
      const service = new UploadSessionService({ store: deps.store, folders: deps.folders });
      const verified = await service.verify({
        fileId,
        docKey: upload.docKey,
        originalName: (await ctx.runQuery(internal.documents.uploadMeta, { key: args.uploadKey }))?.originalName ?? "",
        declaredMime: upload.declaredMime,
        declaredSize: upload.declaredSize,
        storeMd5: meta.md5Checksum ?? null,
        storeSize: meta.size ? Number(meta.size) : null,
      });

      const duplicate = await ctx.runQuery(internal.documents.findDuplicate, {
        facilityId: upload.facilityId,
        docKey: upload.docKey,
        cycleNo: upload.cycleNo,
        sha256: verified.sha256,
      });
      if (duplicate) {
        // Same bytes as the CURRENT version: not an error, no Retry. The
        // freshly uploaded copy is deleted and the caller shows one calm line.
        await deps.store.delete(fileId, { permanent: true });
        await ctx.runMutation(internal.documents.markUpload, {
          key: args.uploadKey,
          status: "done",
          error: "duplicate-current",
        });
        return {
          documentId: duplicate.id,
          versionNo: duplicate.versionNo,
          duplicate: true as const,
          message: `This exact file is already the current ${duplicate.title}`,
        };
      }

      const recorded = await ctx.runMutation(internal.documents.attachDocument, {
        key: args.uploadKey,
        userId: String(user._id),
        userName: user.name ?? user.email ?? "User",
        driveFileId: fileId,
        driveFolderId: (await ctx.runQuery(internal.documents.uploadFolder, { key: args.uploadKey })) ?? "",
        storedName: meta.name,
        mimeType: verified.mime,
        size: verified.size,
        driveMd5: verified.md5,
        sha256: verified.sha256,
      });
      return recorded;
    } catch (err) {
      // Never leave an unverified object behind.
      if (deps && fileId) {
        try {
          await deps.store.delete(fileId, { permanent: true });
        } catch {
          /* best effort — the orphan cleanup job also sweeps these */
        }
      }
      // Always mark the session failed — even when no Drive file id was ever
      // recorded — so the row is reset and a Retry starts a fresh session
      // instead of resuming a file that is gone. Nothing is attached, so no
      // document record, duplicate entry or half-attached file is left.
      await ctx.runMutation(internal.documents.markUpload, {
        key: args.uploadKey,
        status: "failed",
        error: asFileStoreError(err).message,
      });
      uploadFailure(err, ref);
    }
  },
});

export const uploadMeta = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db.query("driveUploads").withIndex("by_key", (q) => q.eq("key", key)).first();
    return row ? { originalName: row.originalName, facilityId: String(row.facilityId), docKey: row.docKey } : null;
  },
});

export const uploadFolder = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db.query("driveUploads").withIndex("by_key", (q) => q.eq("key", key)).first();
    return row?.folderId ?? null;
  },
});

export const completedFileId = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db.query("driveUploads").withIndex("by_key", (q) => q.eq("key", key)).first();
    return row?.driveFileId ?? null;
  },
});

export const findDuplicate = internalQuery({
  args: {
    facilityId: v.string(),
    docKey: v.string(),
    cycleNo: v.number(),
    sha256: v.string(),
  },
  handler: async (ctx, args) => {
    // Only a CURRENT file of the SAME facility, type and cycle can be a
    // duplicate. Removed rows and superseded versions never block a re-upload
    // (ref KNX77Q: the old lookup matched any historical row, so a file that
    // had been removed or replaced was refused for ever).
    const keys =
      args.docKey === "NQAS_Result" || args.docKey === "NQAS_Certificate"
        ? ["NQAS_Result", "NQAS_Certificate"]
        : [args.docKey];
    for (const key of keys) {
      const rows = await ctx.db
        .query("facilityDocuments")
        .withIndex("by_sha", (q) =>
          q.eq("facilityId", args.facilityId as never).eq("docKey", key).eq("sha256", args.sha256),
        )
        .collect();
      const hit = rows.find(
        (row) =>
          row.isCurrent &&
          !row.removedAt &&
          !row.missingInDriveAt &&
          (row.cycleNo ?? 1) === args.cycleNo,
      );
      if (hit)
        return {
          id: String(hit._id),
          versionNo: hit.versionNo,
          title: docType(canonicalDocKey(hit.docKey))?.label ?? "document",
        };
    }
    return null;
  },
});

/**
 * Write the verified row, retire the previous version and audit it — one
 * mutation so a reader never sees two current documents.
 */
export const attachDocument = internalMutation({
  args: {
    key: v.string(),
    userId: v.string(),
    userName: v.string(),
    driveFileId: v.string(),
    driveFolderId: v.string(),
    storedName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    driveMd5: v.string(),
    sha256: v.string(),
  },
  handler: async (ctx, args) => {
    const upload = await ctx.db
      .query("driveUploads")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!upload) throw new Error("Upload session not found");
    if (upload.status === "done") throw new Error("This upload is already attached");

    const current = await ctx.db
      .query("facilityDocuments")
      .withIndex("by_facility_doc_cycle_current", (q) =>
        q
          .eq("facilityId", upload.facilityId)
          .eq("docKey", upload.docKey)
          .eq("cycleNo", upload.cycleNo)
          .eq("isCurrent", true),
      )
      .collect();

    const versionNo = current.reduce((max, r) => Math.max(max, r.versionNo), 0) + 1;
    for (const old of current) {
      await ctx.db.patch(old._id, { isCurrent: false });
    }
    const facility = await ctx.db.get(upload.facilityId);
    const sameType = (await ctx.db.query("facilities").collect()).filter(
      (f) =>
        f.name.trim().toLowerCase() === facility?.name.trim().toLowerCase() &&
        (f.facilityType ?? "") === (facility?.facilityType ?? ""),
    );
    const displayName = documentDisplayName({
      facilityName: facility?.name ?? "Facility",
      facilityType: facility?.facilityType ?? "",
      phc: facility?.phc,
      duplicateNameAndType: sameType.length > 1,
      docKey: upload.docKey,
      cycleNo: upload.cycleNo,
      originalName: upload.originalName,
      mimeType: args.mimeType,
      versionNo,
      isCurrent: true,
    });

    const documentId = await ctx.db.insert("facilityDocuments", {
      facilityId: upload.facilityId,
      docKey: upload.docKey,
      cycleNo: upload.cycleNo,
      driveFileId: args.driveFileId,
      driveFolderId: args.driveFolderId,
      originalName: upload.originalName,
      displayName,
      storedName: args.storedName,
      mimeType: args.mimeType,
      size: args.size,
      driveMd5: args.driveMd5,
      sha256: args.sha256,
      versionNo,
      isCurrent: true,
      storage: "drive",
      uploadedBy: args.userId as never,
      uploadedByName: args.userName,
      uploadedAt: Date.now(),
      batchId: upload.key,
    });
    await ctx.db.patch(upload._id, { status: "done", error: undefined });
    await ctx.db.insert("auditLogs", {
      table: "facilityDocuments",
      recordId: String(documentId),
      facilityId: upload.facilityId,
      action: "create",
      field: upload.docKey,
      newValue: `${args.storedName} (v${versionNo}, ${args.size} bytes)`,
      changedBy: args.userId as never,
      changedByName: args.userName,
      changedAt: Date.now(),
    });
    return { documentId: String(documentId), versionNo };
  },
});

export const markUpload = internalMutation({
  args: { key: v.string(), status: v.string(), error: v.optional(v.string()) },
  handler: async (ctx, { key, status, error }) => {
    const row = await ctx.db.query("driveUploads").withIndex("by_key", (q) => q.eq("key", key)).first();
    if (!row) return;
    // A failed upload has no session any more (its Drive file was deleted):
    // clear the URI and the offset so Retry starts clean instead of resuming
    // a file that is gone. Nothing was attached, so no record is left behind.
    await ctx.db.patch(row._id, {
      status,
      error,
      ...(status === "failed" || status === "done"
        ? { sessionUri: undefined, receivedBytes: 0, driveFileId: undefined }
        : {}),
    });
  },
});

export const cancelUpload = action({
  args: { uploadKey: v.string() },
  handler: async (ctx, { uploadKey }): Promise<{ ok: true }> => {
    const user = await userForAction(ctx);
    const upload = await ctx.runQuery(internal.documents.uploadForUser, { key: uploadKey, userId: String(user._id) });
    if (!upload.ok) return { ok: true };
    if (upload.sessionUri) {
      // Abort a Drive resumable session; a 499/404 simply means it expired.
      try {
        await fetch(upload.sessionUri, { method: "DELETE" });
      } catch {
        /* nothing to clean up */
      }
    }
    await ctx.runMutation(internal.documents.markUpload, { key: uploadKey, status: "cancelled" });
    return { ok: true };
  },
});

/* ------------------------------------------------------------------ */
/* Remove / undo / versions                                           */
/* ------------------------------------------------------------------ */

const UNDO_WINDOW_MS = 30_000;

/** Undo the attach step when a previewed NQAS save fails: delete the new
 * Drive file, restore the previous current version and remove the row. Used
 * only for a just-uploaded file whose values were never saved. */
export const discardStagedResult = action({
  args: { documentId: v.id("facilityDocuments") },
  handler: async (ctx, { documentId }): Promise<{ ok: true }> => {
    const user = await userForAction(ctx);
    if (!canEdit(user as never)) throw new Error("You do not have permission to remove documents");
    const doc = await ctx.runQuery(internal.documents.docForAction, {
      documentId: String(documentId),
      userId: String(user._id),
    });
    if (!doc.ok) throw new Error(doc.reason);
    const deps = await driveDeps(ctx);
    await deps.store.delete(doc.driveFileId, { permanent: true });
    await ctx.runMutation(internal.documents.discardStagedRow, {
      documentId: String(documentId),
    });
    return { ok: true };
  },
});

async function restorePreviousCurrent(
  ctx: MutationCtx,
  doc: Doc<"facilityDocuments">,
): Promise<void> {
  const rows = await ctx.db
    .query("facilityDocuments")
    .withIndex("by_facility_doc_cycle_current", (q) =>
      q
        .eq("facilityId", doc.facilityId)
        .eq("docKey", doc.docKey)
        .eq("cycleNo", doc.cycleNo ?? 1),
    )
    .collect();
  const previous = rows
    .filter((row) => String(row._id) !== String(doc._id) && !row.removedAt)
    .sort((a, b) => b.versionNo - a.versionNo)[0];
  if (previous) await ctx.db.patch(previous._id, { isCurrent: true });
}

export const discardStagedRow = internalMutation({
  args: { documentId: v.string() },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId as Id<"facilityDocuments">);
    if (!doc) return;
    await restorePreviousCurrent(ctx, doc);
    await ctx.db.delete(doc._id);
  },
});

export const removeDocument = action({
  args: { documentId: v.id("facilityDocuments"), reason: v.optional(v.string()) },
  handler: async (ctx, { documentId, reason }): Promise<{ ok: true }> => {
    const user = await userForAction(ctx);
    if (!canEdit(user as never)) throw new Error("You do not have permission to remove documents");
    const doc = await ctx.runQuery(internal.documents.docForAction, {
      documentId: String(documentId),
      userId: String(user._id),
    });
    if (!doc.ok) throw new Error(doc.reason);
    const deps = await driveDeps(ctx);
    const root = rootFolderFor(deps);
    const trash = await deps.folders.trashReviewFolder(root);
    await deps.store.move(doc.driveFileId, doc.driveFolderId, trash);
    await ctx.runMutation(internal.documents.markRemoved, {
      documentId: String(documentId),
      userId: String(user._id),
      userName: user.name ?? user.email ?? "User",
      reason: reason ?? "Removed by user",
      folderId: trash,
    });
    return { ok: true };
  },
});

export const docForAction = internalQuery({
  args: { documentId: v.string(), userId: v.string() },
  handler: async (ctx, { documentId, userId }) => {
    const doc = await ctx.db.get(documentId as never);
    if (!doc) return { ok: false as const, reason: "Document not found" };
    const d = doc as unknown as {
      facilityId: string;
      docKey: string;
      driveFileId: string;
      driveFolderId: string;
      removedAt?: number;
      isCurrent: boolean;
    };
    const facility = await ctx.db.get(d.facilityId as never);
    if (!facility) return { ok: false as const, reason: "Facility not found" };
    const user = await ctx.db.get(userId as never);
    if (!user) return { ok: false as const, reason: "Not signed in" };
    const allowed = await allowedBlockNames(ctx, user as never);
    const f = facility as { block: string; name: string; ninNumber?: string | null };
    if (allowed !== null && !allowed.has(f.block))
      return { ok: false as const, reason: "Outside your assigned blocks" };
    return {
      ok: true as const,
      ...d,
      facilityName: f.name,
      facilityBlock: f.block,
      nin: f.ninNumber ?? null,
    };
  },
});

export const markRemoved = internalMutation({
  args: {
    documentId: v.string(),
    userId: v.string(),
    userName: v.string(),
    reason: v.string(),
    folderId: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId as never);
    if (!doc) return;
    await ctx.db.patch(doc._id, {
      isCurrent: false,
      removedAt: Date.now(),
      removedBy: args.userId as never,
      removalReason: args.reason,
      driveFolderId: args.folderId,
    });
    const d = doc as unknown as { facilityId: string; docKey: string };
    await ctx.db.insert("auditLogs", {
      table: "facilityDocuments",
      recordId: args.documentId,
      facilityId: d.facilityId as never,
      action: "delete",
      field: d.docKey,
      newValue: args.reason,
      changedBy: args.userId as never,
      changedByName: args.userName,
      changedAt: Date.now(),
    });
  },
});

/** Undo a removal within 30 seconds — moves the file back and restores it. */
export const undoRemove = action({
  args: { documentId: v.id("facilityDocuments") },
  handler: async (ctx, { documentId }): Promise<{ ok: true }> => {
    const user = await userForAction(ctx);
    const doc = await ctx.runQuery(internal.documents.docForAction, {
      documentId: String(documentId),
      userId: String(user._id),
    });
    if (!doc.ok) throw new Error(doc.reason);
    const removedAt = doc.removedAt ?? 0;
    if (!removedAt || Date.now() - removedAt > UNDO_WINDOW_MS)
      throw new Error("The undo window (30 seconds) has passed");
    const deps = await driveDeps(ctx);
    const root = rootFolderFor(deps);
    const target = await deps.folders.ensureDocumentFolder({
      rootFolderId: root,
      block: doc.facilityBlock,
      nin: doc.nin,
      facilityName: doc.facilityName,
      docKey: doc.docKey,
    });
    await deps.store.move(doc.driveFileId, doc.driveFolderId, target.folderId);
    await ctx.runMutation(internal.documents.restoreRemoved, {
      documentId: String(documentId),
      folderId: target.folderId,
      userId: String(user._id),
      userName: user.name ?? user.email ?? "User",
    });
    return { ok: true };
  },
});

export const restoreRemoved = internalMutation({
  args: { documentId: v.string(), folderId: v.string(), userId: v.string(), userName: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId as never);
    if (!doc) return;
    const cur = doc as unknown as {
      facilityId: Id<"facilities">;
      docKey: string;
      cycleNo: number;
    };
    // Undo restores THIS file as the one current version: a file uploaded
    // while it sat in review is demoted to a kept version, never a second
    // current row (which would break the n-of-6 count).
    const live = await ctx.db
      .query("facilityDocuments")
      .withIndex("by_facility_doc_cycle_current", (q) =>
        q
          .eq("facilityId", cur.facilityId)
          .eq("docKey", cur.docKey)
          .eq("cycleNo", cur.cycleNo)
          .eq("isCurrent", true),
      )
      .collect();
    for (const row of live) {
      if (String(row._id) !== args.documentId) await ctx.db.patch(row._id, { isCurrent: false });
    }
    await ctx.db.patch(doc._id, {
      isCurrent: true,
      removedAt: undefined,
      removedBy: undefined,
      removalReason: undefined,
      driveFolderId: args.folderId,
    });
    const d = doc as unknown as { facilityId: string; docKey: string };
    await ctx.db.insert("auditLogs", {
      table: "facilityDocuments",
      recordId: args.documentId,
      facilityId: d.facilityId as never,
      action: "update",
      field: d.docKey,
      newValue: "removal undone",
      changedBy: args.userId as never,
      changedByName: args.userName,
      changedAt: Date.now(),
    });
  },
});

/** State Admin: make an older version current again (history is restorable). */
export const restoreVersion = action({
  args: { documentId: v.id("facilityDocuments") },
  handler: async (ctx, { documentId }): Promise<{ ok: true }> => {
    const user = await userForAction(ctx);
    if (!canEditAll(user as never)) throw new Error("Only the State Admin can restore a version");
    const doc = await ctx.runQuery(internal.documents.docForAction, {
      documentId: String(documentId),
      userId: String(user._id),
    });
    if (!doc.ok) throw new Error(doc.reason);
    const deps = await driveDeps(ctx);
    const root = rootFolderFor(deps);
    const folder = await deps.folders.ensureDocumentFolder({
      rootFolderId: root,
      block: doc.facilityBlock,
      nin: doc.nin,
      facilityName: doc.facilityName,
      docKey: doc.docKey,
    });
    const versions = await deps.folders.versionsFolder(folder.folderId);
    await deps.store.move(doc.driveFileId, versions, folder.folderId);
    await ctx.runMutation(internal.documents.makeCurrent, {
      documentId: String(documentId),
      folderId: folder.folderId,
      userId: String(user._id),
      userName: user.name ?? user.email ?? "User",
    });
    return { ok: true };
  },
});

export const makeCurrent = internalMutation({
  args: { documentId: v.string(), folderId: v.string(), userId: v.string(), userName: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId as never);
    if (!doc) return;
    const d = doc as unknown as { facilityId: string; docKey: string; cycleNo: number };
    const current = await ctx.db
      .query("facilityDocuments")
      .withIndex("by_facility_doc_cycle_current", (q) =>
        q
          .eq("facilityId", d.facilityId as never)
          .eq("docKey", d.docKey)
          .eq("cycleNo", d.cycleNo)
          .eq("isCurrent", true),
      )
      .collect();
    for (const row of current) await ctx.db.patch(row._id, { isCurrent: false });
    await ctx.db.patch(doc._id, {
      isCurrent: true,
      removedAt: undefined,
      driveFolderId: args.folderId,
    });
    await ctx.db.insert("auditLogs", {
      table: "facilityDocuments",
      recordId: args.documentId,
      facilityId: d.facilityId as never,
      action: "update",
      field: d.docKey,
      newValue: "version restored",
      changedBy: args.userId as never,
      changedByName: args.userName,
      changedAt: Date.now(),
    });
  },
});

/** Used by the migration job to register a moved legacy file. */
export const attachMigratedDocument = internalMutation({
  args: {
    facilityId: v.string(),
    docKey: v.string(),
    cycleNo: v.number(),
    driveFileId: v.string(),
    driveFolderId: v.string(),
    originalName: v.string(),
    storedName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    driveMd5: v.optional(v.string()),
    sha256: v.string(),
    legacyStorageId: v.optional(v.string()),
    storage: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("facilityDocuments")
      .withIndex("by_facility_doc_cycle_current", (q) =>
        q
          .eq("facilityId", args.facilityId as never)
          .eq("docKey", args.docKey)
          .eq("cycleNo", args.cycleNo)
          .eq("isCurrent", true),
      )
      .first();
    if (existing) return { ok: true as const, skipped: true };
    const versionNo = await ctx.db
      .query("facilityDocuments")
      .withIndex("by_facility", (q) => q.eq("facilityId", args.facilityId as never))
      .collect()
      .then((rows) => rows.filter((r) => r.docKey === args.docKey).length + 1);
    const id = await ctx.db.insert("facilityDocuments", {
      facilityId: args.facilityId as never,
      docKey: args.docKey,
      cycleNo: args.cycleNo,
      driveFileId: args.driveFileId,
      driveFolderId: args.driveFolderId,
      originalName: args.originalName,
      storedName: args.storedName,
      mimeType: args.mimeType,
      size: args.size,
      driveMd5: args.driveMd5,
      sha256: args.sha256,
      versionNo,
      isCurrent: true,
      storage: args.storage,
      legacyStorageId: args.legacyStorageId,
      uploadedByName: "Migration",
      uploadedAt: Date.now(),
    });
    return { ok: true as const, skipped: false, documentId: String(id) };
  },
});

export const markMissing = internalMutation({
  args: { documentId: v.string(), missing: v.boolean() },
  handler: async (ctx, { documentId, missing }) => {
    const doc = await ctx.db.get(documentId as never);
    if (!doc) return;
    await ctx.db.patch(doc._id, { missingInDriveAt: missing ? Date.now() : undefined });
  },
});

/* ------------------------------------------------------------------ */
/* Part D migration: NQAS_Result + NQAS_Certificate → NQAS Certified Result  */
/* ------------------------------------------------------------------ */

/**
 * Move every row stored under the old `NQAS_Certificate` key to the single
 * `NQAS_Result` document, per facility and cycle. Idempotent and lossless:
 *
 *   • no existing result  → the file becomes the result (still current);
 *   • both exist          → the NEWER file stays current, the older one is
 *                           kept as a previous version (nothing deleted);
 *   • run again           → nothing left with the legacy key, report is empty.
 */
async function runLegacyDocumentMigration(
  ctx: MutationCtx,
  actor: { id: Id<"users"> | null; name: string },
) {
  const rows = await ctx.db.query("facilityDocuments").collect();
  const legacy = rows
    .filter((d) => d.docKey === "NQAS_Certificate")
    .sort((a, b) => a.uploadedAt - b.uploadedAt);
  const report: {
    facilityId: string;
    file: string;
    outcome: "moved" | "older-version" | "newer-current";
  }[] = [];
  const now = Date.now();

  for (const row of legacy) {
    const existing = rows.find(
      (d) =>
        d.docKey === "NQAS_Result" &&
        String(d.facilityId) === String(row.facilityId) &&
        (d.cycleNo ?? 1) === (row.cycleNo ?? 1) &&
        d.isCurrent &&
        !d.removedAt,
    );
    let outcome: "moved" | "older-version" | "newer-current" = "moved";
    if (!existing) {
      await ctx.db.patch(row._id, { docKey: "NQAS_Result", isCurrent: !row.removedAt });
    } else if (row.uploadedAt > existing.uploadedAt) {
      // The legacy certificate is newer → it becomes current, the old result
      // is demoted to a version (kept, never deleted).
      const nextVersion = Math.max(existing.versionNo, row.versionNo) + 1;
      await ctx.db.patch(existing._id, { isCurrent: false });
      await ctx.db.patch(row._id, {
        docKey: "NQAS_Result",
        isCurrent: !row.removedAt,
        versionNo: nextVersion,
      });
      outcome = "newer-current";
    } else {
      // The existing result is newer → the legacy file becomes a version.
      const nextVersion = Math.max(existing.versionNo, row.versionNo) + 1;
      await ctx.db.patch(row._id, {
        docKey: "NQAS_Result",
        isCurrent: false,
        versionNo: nextVersion,
      });
      outcome = "older-version";
    }
    report.push({
      facilityId: String(row.facilityId),
      file: row.originalName,
      outcome,
    });
  }

  if (report.length > 0) {
    await ctx.db.insert("auditLogs", {
      table: "facilityDocuments",
      recordId: "",
      action: "update",
      field: `Document merge — ${report.length} NQAS certificate file(s) → NQAS Result`,
      oldValue: "NQAS_Certificate",
      newValue: "NQAS_Result",
      changedBy: actor.id ?? undefined,
      changedByName: actor.name,
      changedAt: now,
      source: "Document key migration",
    });
  }
  return { merged: report.length, report };
}

/** Admin button in Admin → Documents (audited, idempotent). */
export const migrateLegacyDocumentKeys = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireActivatedUser(ctx);
    if (me.appRole !== "admin") throw new ConvexError("Only a State Admin can merge document keys");
    return runLegacyDocumentMigration(ctx, {
      id: me._id as Id<"users">,
      name: me.name ?? me.email ?? "State Admin",
    });
  },
});

/** CLI/deployment wrapper — same migration, no session needed. */
export const migrateLegacyDocumentKeysInternal = internalMutation({
  args: {},
  handler: async (ctx) =>
    runLegacyDocumentMigration(ctx, { id: null, name: "Deployment migration" }),
});

/** Documents whose current file is missing — the Needs attention / health list. */
export const listMissing = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db.query("facilityDocuments").collect();
    return rows
      .filter((d) => d.missingInDriveAt && !d.removedAt)
      .slice(0, limit ?? 100)
      .map((d) => ({
        id: String(d._id),
        facilityId: String(d.facilityId),
        docKey: d.docKey,
        originalName: d.originalName,
        missingInDriveAt: d.missingInDriveAt,
      }));
  },
});
