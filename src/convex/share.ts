/**
 * SHARED REPORTS — the snapshot behind the QR code on the facility sheet.
 *
 * ROOT CAUSE (Part 4): the printed QR used to encode
 * `/facilities?nin=…&report=NQAS-…-C1` (see lib/qrCode.ts → verifyUrl): a
 * sign-IN-gated list page that ignores those parameters and has no PDF on it,
 * built from `window.location.origin` instead of the saved App address. It
 * could never open the report it was printed next to.
 *
 * Now generating a sheet stores a SNAPSHOT of that exact PDF and the QR points
 * at ONE short link:
 *
 *   https://<APP_ORIGIN>/r/<token>            the digital copy page (React route)
 *   https://<APP_ORIGIN>/r/<token>/file       the bytes (streams through the app)
 *
 * Guarantees:
 *  • a token opens ONLY its own snapshot — never live data, never another
 *    facility; unknown/revoked/expired tokens answer with one generic message;
 *  • no Drive id, Drive link, token of any other kind or store path is ever
 *    returned by a public query — the file endpoint streams the bytes;
 *  • unchanged data + same file name reuses the previous snapshot instead of
 *    storing a second copy (content hash);
 *  • every open is counted (no IP addresses are kept).
 */

import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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

import { audit, canEditAll, getSettings, requireActivatedUser } from "./facilities";
import { actionUser, driveDeps, rootFolderFor } from "./drive";
import {
  documentLinkUrl,
  isShareExpired,
  isShareToken,
  newShareToken,
  resolveShareSettings,
  shareExpiry,
  shareUrl,
} from "../lib/shareLink";

/** Snapshots older than expiry + this many days (and their files) are removed. */
const RETENTION_DAYS_AFTER_EXPIRY = 30;
/** Hard cap on a stored snapshot (base64 chars) — our sheets are ~0.5 MB. */
const MAX_SNAPSHOT_CHARS = 4_000_000;

/* --------------------------------------------------------------------------- */
/* Settings                                                                    */
/* --------------------------------------------------------------------------- */

type StoredSettings = Record<string, unknown>;

async function readSettings(ctx: QueryCtx | MutationCtx): Promise<StoredSettings> {
  return (await getSettings(ctx)) as unknown as StoredSettings;
}

/** Link validity / sign-in / download rules from Admin → Shared reports. */
export async function shareSettingsOf(
  ctx: QueryCtx | MutationCtx,
): Promise<ReturnType<typeof resolveShareSettings>> {
  return resolveShareSettings(await readSettings(ctx));
}

/** The saved App address — the ONLY origin a printed link is built from. */
async function appOriginOf(ctx: QueryCtx | MutationCtx): Promise<string> {
  const config = await ctx.runQuery(internal.drive.configForServer, {});
  return (config as { appOrigin: string | null }).appOrigin ?? "";
}

/* --------------------------------------------------------------------------- */
/* Part 3 — one snapshot-pinned token per printed document                     */
/* --------------------------------------------------------------------------- */

type RequestedDoc = { id: string; docKey: string; cycleNumber: number };
type DocLink = {
  token: string;
  documentId: Id<"facilityDocuments">;
  docKey: string;
  cycleNumber: number;
  fileName: string;
  mimeType: string;
  size: number;
  sha256: string;
  storage: string;
  driveFileId?: string;
  legacyStorageId?: string;
  openedCount?: number;
};

/**
 * Mint (or reuse) one ≥96-bit token per document version for this snapshot.
 * The token is stored on the share row, so it shares the snapshot's expiry and
 * revocation and is pinned to the version that was printed. Only the original
 * file name goes into the link's URL — never a Drive id or storage name.
 */
async function mintDocumentLinks(
  ctx: MutationCtx,
  share: { _id: Id<"sharedReports">; token: string; facilityId: Id<"facilities">; documentLinks?: DocLink[] },
  docs: RequestedDoc[],
  origin: string,
  mode: string,
): Promise<{ key: string; url: string; fileName: string }[]> {
  if (mode === "off" || !origin || !docs.length) return [];
  const links: DocLink[] = [...(share.documentLinks ?? [])];
  const byDoc = new Map(links.map((l) => [String(l.documentId), l]));
  const added: DocLink[] = [];
  const out: { key: string; url: string; fileName: string }[] = [];
  for (const d of docs) {
    let link = byDoc.get(d.id);
    if (!link) {
      const doc = await ctx.db.get(d.id as Id<"facilityDocuments">);
      if (!doc || String(doc.facilityId) !== String(share.facilityId)) continue;
      if (doc.removedAt || doc.missingInDriveAt) continue;
      if (!doc.driveFileId && !doc.legacyStorageId) continue;
      link = {
        token: newShareToken(),
        documentId: doc._id,
        docKey: doc.docKey,
        cycleNumber: doc.cycleNo,
        fileName: doc.displayName ?? doc.originalName,
        mimeType: doc.mimeType,
        size: doc.size,
        sha256: doc.sha256,
        storage: doc.storage,
        driveFileId: doc.storage === "drive" ? doc.driveFileId : undefined,
        legacyStorageId: doc.legacyStorageId ?? undefined,
        openedCount: 0,
      };
      added.push(link);
      byDoc.set(d.id, link);
    }
    const url = documentLinkUrl(origin, share.token, link.token);
    if (!url) continue;
    out.push({ key: `${d.cycleNumber}:${d.docKey}`, url, fileName: link.fileName });
  }
  if (added.length) {
    await ctx.db.patch(share._id, { documentLinks: [...links, ...added] });
  }
  return out;
}

/* --------------------------------------------------------------------------- */
/* Lookups                                                                     */
/* --------------------------------------------------------------------------- */

async function findShare(ctx: QueryCtx | MutationCtx, token: string) {
  if (!isShareToken(token)) return null;
  return await ctx.db
    .query("sharedReports")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
}

/** Server-only row for the file endpoint (store ids never leave the backend). */
export const contentForStream = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const row = await findShare(ctx, token);
    if (!row) return { ok: false as const, reason: "not_found" as const };
    if (row.revokedAt) return { ok: false as const, reason: "revoked" as const };
    if (isShareExpired(row.expiresAt, Date.now()))
      return { ok: false as const, reason: "expired" as const };
    if (!row.storedAt || (!row.driveFileId && !row.legacyStorageId))
      return { ok: false as const, reason: "pending" as const };
    return {
      ok: true as const,
      fileName: row.fileName,
      storage: row.storage ?? "convex",
      driveFileId: row.driveFileId ?? null,
      legacyStorageId: row.legacyStorageId ?? null,
      size: row.size ?? null,
    };
  },
});

/* --------------------------------------------------------------------------- */
/* Creating a snapshot (client flow: ensure → render → store)                  */
/* --------------------------------------------------------------------------- */

/**
 * Step 1, before the PDF is rendered: reuse the snapshot for this exact
 * content, or mint a new token. The QR needs the URL before the bytes exist,
 * so the file is uploaded afterwards by `store`.
 */
export const ensure = mutation({
  args: {
    facilityId: v.string(),
    cycleNumber: v.optional(v.number()),
    contentHash: v.string(),
    fileName: v.string(),
    facilityName: v.string(),
    facilityType: v.optional(v.string()),
    facilityUpdatedAt: v.optional(v.number()),
    /** The facilityDocuments printed in this snapshot (Part 3). */
    documents: v.optional(
      v.array(
        v.object({
          id: v.string(),
          docKey: v.string(),
          cycleNumber: v.number(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireActivatedUser(ctx);
    const facilityId = args.facilityId as Id<"facilities">;
    const facility = await ctx.db.get(facilityId);
    if (!facility) throw new ConvexError("This facility no longer exists");

    const now = Date.now();
    const settings = await shareSettingsOf(ctx);
    const origin = await appOriginOf(ctx);
    const requested = args.documents ?? [];

    // Reuse: same facility, same printed content, same file name, still valid.
    const existing = await ctx.db
      .query("sharedReports")
      .withIndex("by_hash", (q) =>
        q
          .eq("facilityId", facilityId)
          .eq("contentHash", args.contentHash)
          .eq("fileName", args.fileName),
      )
      .order("desc")
      .first();
    if (
      existing &&
      !existing.revokedAt &&
      !isShareExpired(existing.expiresAt, now) &&
      existing.storedAt
    ) {
      return {
        token: existing.token,
        needsUpload: false,
        appOrigin: origin,
        url: shareUrl(origin, existing.token),
        documentLinks: await mintDocumentLinks(
          ctx,
          existing,
          requested,
          origin,
          settings.documentLinkMode,
        ),
      };
    }

    const token = newShareToken();
    const expiresAt = shareExpiry(now, settings.validityDays);
    const shareId = await ctx.db.insert("sharedReports", {
      token,
      facilityId,
      cycleNumber: args.cycleNumber ?? undefined,
      fileName: args.fileName,
      contentHash: args.contentHash,
      facilityName: args.facilityName,
      facilityType: args.facilityType ?? undefined,
      generatedAt: now,
      expiresAt,
      createdBy: user._id,
      createdByName: user.name ?? user.email ?? "State Admin",
      openCount: 0,
      facilityUpdatedAt: args.facilityUpdatedAt ?? undefined,
      cleanupAt: expiresAt ? expiresAt + RETENTION_DAYS_AFTER_EXPIRY * 86_400_000 : undefined,
    });
    await audit(ctx, {
      table: "sharedReports",
      recordId: token,
      facilityId,
      action: "create",
      field: "Shared report link",
      newValue: args.fileName,
      userName: user.name,
      userId: user._id,
    });

    const fresh = await ctx.db.get(shareId);
    return {
      token,
      needsUpload: true,
      appOrigin: origin,
      url: shareUrl(origin, token),
      documentLinks: fresh
        ? await mintDocumentLinks(ctx, fresh, requested, origin, settings.documentLinkMode)
        : [],
    };
  },
});

function decodeBase64(value: string): Uint8Array {
  const clean = value.replace(/\s+/g, "");
  if (typeof atob === "function") {
    const binary = atob(clean);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  }
  const buf = Buffer.from(clean, "base64");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/**
 * Step 2, after the PDF is rendered: store the exact bytes under the private
 * `_shared-reports` Drive folder (the FileStore seam). When Drive is not
 * connected the snapshot still has to work, so the bytes fall back to Convex
 * storage — either way the id stays server-side and the app streams it.
 */
export const store = action({
  args: { token: v.string(), base64: v.string(), size: v.number() },
  handler: async (ctx, args) => {
    const user = await actionUser(ctx);
    if (!user) throw new ConvexError("Sign in again to share a report.");
    if (!isShareToken(args.token)) throw new ConvexError("Unknown share token.");
    if (args.base64.length > MAX_SNAPSHOT_CHARS) {
      throw new ConvexError("This report is too large to store as a shared copy.");
    }

    const record = await ctx.runQuery(internal.share.byToken, { token: args.token });
    if (!record || record.revokedAt) throw new ConvexError("This share link is no longer active.");

    const bytes = decodeBase64(args.base64);
    const now = Date.now();

    // 1) Private Drive folder — the normal path.
    try {
      const deps = await driveDeps(ctx);
      const root = rootFolderFor(deps);
      const folderId = await deps.folders.sharedReportsFolder(root);
      const stored = await deps.store.put(bytes, {
        parentId: folderId,
        name: record.fileName,
        mimeType: "application/pdf",
        appProperties: { kind: "shared-report", cycle: String(record.cycleNumber ?? "") },
      });
      await ctx.runMutation(internal.share.applyStorage, {
        token: args.token,
        storage: "drive",
        driveFileId: stored.id,
        size: bytes.length,
        at: now,
      });
      return { storage: "drive" as const };
    } catch {
      /* Drive unavailable / paused / not configured — fall through. */
    }

    // 2) Convex storage fallback so the QR still opens the printed sheet.
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    const id = await ctx.storage.store(blob);
    await ctx.runMutation(internal.share.applyStorage, {
      token: args.token,
      storage: "convex",
      legacyStorageId: String(id),
      size: bytes.length,
      at: now,
    });
    return { storage: "convex" as const };
  },
});

export const applyStorage = internalMutation({
  args: {
    token: v.string(),
    storage: v.string(),
    driveFileId: v.optional(v.string()),
    legacyStorageId: v.optional(v.string()),
    size: v.number(),
    at: v.number(),
  },
  handler: async (ctx, args) => {
    const row = await findShare(ctx, args.token);
    if (!row) return;
    await ctx.db.patch(row._id, {
      storage: args.storage,
      driveFileId: args.driveFileId ?? undefined,
      legacyStorageId: args.legacyStorageId ?? undefined,
      size: args.size,
      storedAt: args.at,
    });
  },
});

export const byToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => (await findShare(ctx, token)) ?? null,
});

/* --------------------------------------------------------------------------- */
/* Reading a snapshot (public)                                                 */
/* --------------------------------------------------------------------------- */

export type ShareStatus = "ok" | "not_found" | "expired" | "revoked" | "sign_in_required";

/**
 * What the digital copy page is allowed to see. Store ids, the content hash
 * and any Drive detail are deliberately absent: a token opens only this
 * snapshot, and only its presentation metadata.
 */
export const resolve = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const row = await findShare(ctx, token);
    if (!row) return { status: "not_found" as ShareStatus };

    const settings = await shareSettingsOf(ctx);
    const userId = await getAuthUserId(ctx);
    const signedIn = !!userId;

    if (row.revokedAt) return { status: "revoked" as ShareStatus };
    if (isShareExpired(row.expiresAt, Date.now())) return { status: "expired" as ShareStatus };
    if (settings.requireSignIn && !signedIn) {
      return { status: "sign_in_required" as ShareStatus, allowDownload: settings.allowDownload };
    }
    if (!row.storedAt || (!row.driveFileId && !row.legacyStorageId)) {
      return { status: "not_found" as ShareStatus };
    }

    const facility = await ctx.db.get(row.facilityId);
    const changed =
      !!facility && !!row.facilityUpdatedAt && facility.updatedAt !== row.facilityUpdatedAt;
    const origin = await appOriginOf(ctx);

    return {
      status: "ok" as ShareStatus,
      fileName: row.fileName,
      facilityName: row.facilityName,
      facilityType: row.facilityType ?? "",
      cycleNumber: row.cycleNumber ?? null,
      generatedAt: row.generatedAt,
      expiresAt: row.expiresAt,
      changed,
      allowDownload: settings.allowDownload,
      requireSignIn: settings.requireSignIn,
      // Only a signed-in user gets the id (the "open the latest" link).
      facilityId: signedIn ? String(row.facilityId) : null,
      openCount: row.openCount,
      /** Part 3 — the documents of the printed cycles, with their pinned
       *  public links. Only the original file name is exposed. */
      documents: (settings.documentLinkMode === "off" ? [] : (row.documentLinks ?? [])).map((l) => ({
        key: `${l.cycleNumber}:${l.docKey}`,
        docKey: l.docKey,
        cycleNumber: l.cycleNumber,
        fileName: l.fileName,
        url: documentLinkUrl(origin, row.token, l.token),
      })),
      documentLinkMode: settings.documentLinkMode,
    };
  },
});

/**
 * One document inside a snapshot. `status` mirrors the snapshot: unknown,
 * expired and revoked all answer with a generic message on the page, and the
 * mode comes from Admin → Shared reports (On / Require sign-in / Off).
 */
export const resolveDocument = query({
  args: { token: v.string(), docToken: v.string() },
  handler: async (ctx, { token, docToken }) => {
    const row = await findShare(ctx, token);
    if (!row) return { status: "not_found" as const };
    if (row.revokedAt) return { status: "revoked" as const };
    if (isShareExpired(row.expiresAt, Date.now())) return { status: "expired" as const };
    const link = (row.documentLinks ?? []).find((l) => l.token === docToken);
    if (!link) return { status: "not_found" as const };
    const settings = await shareSettingsOf(ctx);
    if (settings.documentLinkMode === "off") return { status: "not_found" as const };
    const userId = await getAuthUserId(ctx);
    if (settings.documentLinkMode === "signin" && !userId) {
      return { status: "sign_in_required" as const, shareToken: token };
    }
    return {
      status: "ok" as const,
      fileName: link.fileName,
      mimeType: link.mimeType,
      key: `${link.cycleNumber}:${link.docKey}`,
      shareToken: token,
      docToken: link.token,
      /** Only for a signed-in reader: the app's own document reader. */
      documentId: userId ? String(link.documentId) : null,
    };
  },
});

/** Server-only: where a document link's pinned bytes live. */
export const contentForDoc = internalQuery({
  args: { token: v.string(), docToken: v.string() },
  handler: async (ctx, { token, docToken }) => {
    const row = await findShare(ctx, token);
    if (!row) return { ok: false as const, reason: "not_found" as const };
    if (row.revokedAt) return { ok: false as const, reason: "revoked" as const };
    if (isShareExpired(row.expiresAt, Date.now())) return { ok: false as const, reason: "expired" as const };
    const settings = await shareSettingsOf(ctx);
    if (settings.documentLinkMode === "off") return { ok: false as const, reason: "not_found" as const };
    const link = (row.documentLinks ?? []).find((l) => l.token === docToken);
    if (!link) return { ok: false as const, reason: "not_found" as const };
    return {
      ok: true as const,
      shareToken: row.token,
      facilityId: String(row.facilityId),
      fileName: link.fileName,
      mimeType: link.mimeType,
      size: link.size,
      storage: link.storage,
      driveFileId: link.driveFileId ?? null,
      legacyStorageId: link.legacyStorageId ?? null,
      docKey: link.docKey,
    };
  },
});

/** Audit one document open (no IP address, no user agent). */
export const recordDocOpen = internalMutation({
  args: { token: v.string(), docToken: v.string() },
  handler: async (ctx, { token, docToken }) => {
    const row = await findShare(ctx, token);
    if (!row) return;
    const links = [...(row.documentLinks ?? [])];
    const link = links.find((l) => l.token === docToken);
    if (!link) return;
    link.openedCount = (link.openedCount ?? 0) + 1;
    await ctx.db.patch(row._id, { documentLinks: links });
    await audit(ctx, {
      table: "sharedReports",
      recordId: row.token,
      facilityId: row.facilityId,
      action: "view",
      field: "Document opened from a printed sheet",
      newValue: link.fileName,
      userName: "Shared link",
    });
  },
});

/**
 * Admin → Shared reports → "Test link": HEAD the saved short URL server-side
 * and report the status an anonymous visitor would see. Never follows the
 * canonical host: the URL is the one already printed.
 */
export const testLink = action({
  args: { shareId: v.string() },
  handler: async (ctx, { shareId }) => {
    const user = await actionUser(ctx);
    if (!user || !canEditAll(user)) {
      throw new ConvexError("Only the State Admin can test shared links.");
    }
    const row = await ctx.runQuery(internal.share.byId, { shareId });
    if (!row) return { ok: false, status: 0, message: "That shared link no longer exists." };
    if (row.revokedAt) return { ok: false, status: 0, message: "This link is revoked." };
    if (isShareExpired(row.expiresAt, Date.now())) {
      return { ok: false, status: 0, message: "This link has expired." };
    }
    const origin = (await ctx.runQuery(internal.drive.configForServer, {})) as {
      appOrigin: string | null;
    };
    const url = shareUrl(origin.appOrigin, row.token);
    if (!url) return { ok: false, status: 0, message: "Set the App address in Admin → Google Drive." };
    try {
      const res = await fetch(url, { method: "HEAD", redirect: "follow" });
      return {
        ok: res.ok,
        status: res.status,
        message: res.ok
          ? `200 OK · ${url}`
          : `${res.status} ${res.statusText || "error"} · ${url}`,
      };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        message: `The link could not be reached: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
});

/**
 * Part 2.3 — confirm the printed short link answers 200 on the saved App
 * address before the download finishes. Anonymous HEAD, no cookies.
 */
export const verifyLive = action({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!isShareToken(token)) return { ok: false, status: 0, message: "Unknown link." };
    const row = await ctx.runQuery(internal.share.byToken, { token });
    if (!row) return { ok: false, status: 0, message: "Unknown link." };
    if (row.revokedAt) return { ok: false, status: 0, message: "This link is revoked." };
    if (isShareExpired(row.expiresAt, Date.now())) {
      return { ok: false, status: 0, message: "This link has expired." };
    }
    const origin = (await ctx.runQuery(internal.drive.configForServer, {})) as {
      appOrigin: string | null;
    };
    const url = shareUrl(origin.appOrigin, row.token);
    if (!url) return { ok: false, status: 0, message: "No saved App address." };
    try {
      const res = await fetch(url, { method: "HEAD", redirect: "follow" });
      return { ok: res.ok, status: res.status, message: res.ok ? "200 OK" : `${res.status}` };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        message: err instanceof Error ? err.message : "The link could not be reached",
      };
    }
  },
});

export const byId = internalQuery({
  args: { shareId: v.string() },
  handler: async (ctx, { shareId }) =>
    (await ctx.db.get(shareId as Id<"sharedReports">)) ?? null,
});

/** Generation-time QR self-check result, surfaced in Admin → Shared reports. */
export const markQrCheck = mutation({
  args: { token: v.string(), failed: v.boolean() },
  handler: async (ctx, { token, failed }) => {
    const row = await findShare(ctx, token);
    if (!row) return;
    await ctx.db.patch(row._id, { qrCheckFailed: failed });
  },
});

/** Count the open. No IP address, no user agent — only the token and a time. */
export const recordOpen = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const row = await findShare(ctx, token);
    if (!row || row.revokedAt || isShareExpired(row.expiresAt, Date.now())) return;
    await ctx.db.patch(row._id, {
      openCount: row.openCount + 1,
      lastOpenedAt: Date.now(),
    });
  },
});

/* --------------------------------------------------------------------------- */
/* Admin: list + revoke                                                        */
/* --------------------------------------------------------------------------- */

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user)) throw new ConvexError("Only the State Admin can manage shared links.");
    const rows = await ctx.db.query("sharedReports").order("desc").collect();
    const now = Date.now();
    return rows.map((r) => ({
      id: String(r._id),
      token: r.token,
      facilityId: String(r.facilityId),
      facilityName: r.facilityName,
      facilityType: r.facilityType ?? "",
      cycleNumber: r.cycleNumber ?? null,
      fileName: r.fileName,
      generatedAt: r.generatedAt,
      expiresAt: r.expiresAt,
      revokedAt: r.revokedAt ?? null,
      openCount: r.openCount,
      lastOpenedAt: r.lastOpenedAt ?? null,
      createdByName: r.createdByName ?? "",
      stored: !!r.storedAt,
      expired: isShareExpired(r.expiresAt, now),
      documentCount: (r.documentLinks ?? []).length,
      qrCheckFailed: r.qrCheckFailed === true,
    }));
  },
});

export const revoke = mutation({
  args: { shareId: v.string() },
  handler: async (ctx, { shareId }) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user)) throw new ConvexError("Only the State Admin can revoke a shared link.");
    const row = await ctx.db.get(shareId as Id<"sharedReports">);
    if (!row) throw new ConvexError("That shared link no longer exists.");
    if (!row.revokedAt) {
      await ctx.db.patch(row._id, { revokedAt: Date.now() });
      await audit(ctx, {
        table: "sharedReports",
        recordId: String(row._id),
        facilityId: row.facilityId,
        action: "update",
        field: "Shared report link revoked",
        oldValue: row.fileName,
        newValue: "Revoked",
        userName: user.name,
        userId: user._id,
      });
    }
    return { revoked: 1 };
  },
});

export const revokeAllFor = mutation({
  args: { facilityId: v.string() },
  handler: async (ctx, { facilityId }) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user)) throw new ConvexError("Only the State Admin can revoke shared links.");
    const rows = await ctx.db
      .query("sharedReports")
      .withIndex("by_facility", (q) => q.eq("facilityId", facilityId as Id<"facilities">))
      .collect();
    const now = Date.now();
    let revoked = 0;
    for (const row of rows) {
      if (row.revokedAt) continue;
      await ctx.db.patch(row._id, { revokedAt: now });
      revoked += 1;
    }
    if (revoked) {
      await audit(ctx, {
        table: "sharedReports",
        recordId: facilityId,
        facilityId: facilityId as Id<"facilities">,
        action: "update",
        field: "All shared report links revoked",
        newValue: `${revoked} link${revoked === 1 ? "" : "s"}`,
        userName: user.name,
        userId: user._id,
      });
    }
    return { revoked };
  },
});

/* --------------------------------------------------------------------------- */
/* Retention — expired snapshots and their files, 30 days after expiry         */
/* --------------------------------------------------------------------------- */

export const dueForCleanup = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("sharedReports")
      .withIndex("by_cleanup", (q) => q.lte("cleanupAt", now))
      .collect();
    return rows.map((r) => ({
      id: String(r._id),
      storage: r.storage ?? "convex",
      driveFileId: r.driveFileId ?? null,
      legacyStorageId: r.legacyStorageId ?? null,
      fileName: r.fileName,
    }));
  },
});

export const removeRow = internalMutation({
  args: { shareId: v.string() },
  handler: async (ctx, { shareId }) => {
    const row = await ctx.db.get(shareId as Id<"sharedReports">);
    if (row) await ctx.db.delete(row._id);
  },
});

/** Daily: delete snapshots 30 days past expiry and the bytes behind them. */
export const cleanupExpired = internalAction({
  args: {},
  handler: async (ctx) => {
    const rows = (await ctx.runQuery(internal.share.dueForCleanup, {})) as {
      id: string;
      storage: string;
      driveFileId: string | null;
      legacyStorageId: string | null;
      fileName: string;
    }[];
    if (!rows.length) return { removed: 0 };

    let deps: Awaited<ReturnType<typeof driveDeps>> | null = null;
    if (rows.some((r) => r.storage === "drive")) {
      try {
        deps = await driveDeps(ctx);
      } catch {
        deps = null; // Drive is down: keep the rows, retry tomorrow.
      }
    }

    let removed = 0;
    for (const row of rows) {
      try {
        if (row.storage === "drive" && deps && row.driveFileId) {
          await deps.store.delete(row.driveFileId, { permanent: false });
        } else if (row.legacyStorageId) {
          await ctx.storage.delete(row.legacyStorageId as never);
        }
      } catch {
        /* a file that is already gone must not block the row's removal */
      }
      await ctx.runMutation(internal.share.removeRow, { shareId: row.id });
      removed += 1;
    }
    return { removed };
  },
});
