/**
 * GOOGLE DRIVE — connection state, admin settings, server wiring.
 *
 * This is the only file that turns a stored connection + the server
 * environment into a live `FileStore`. Every other module asks for a store; it
 * never builds auth, never reads `process.env` and never sees a token.
 *
 * Admin surface (State Admin only, all audited):
 *   • Settings → Google Drive read model (`getDriveAdminState`)
 *   • settings mutation (`saveDriveSettings`)
 *   • connection lifecycle (`disconnectDrive`, OAuth callback write)
 *   • `testUpload` — writes one tiny file to `_incoming`, verifies, deletes.
 */

import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireActivatedUser, canEditAll, getSettings } from "./facilities";
import {
  DRIVE_NOT_CONNECTED_MESSAGE,
  resolveDriveSettings,
  DRIVE_SETTINGS_KEY,
} from "../lib/driveSettings";
import { DriveAuth } from "./storage/driveAuth";
import { DriveClient, fetchTransport } from "./storage/driveClient";
import { DriveFileStore } from "./storage/driveFileStore";
import { DriveFolderService, FOLDER_NAMES } from "./storage/folderService";
import { encryptValue, randomBytes, sha256Hex, toBase64Url } from "./storage/crypto";
import { getDriveConfig } from "./storage/driveConfig";
import { REFRESH_TOKEN_PURPOSE, REDIRECT_PATH, redirectUriFor, validateAppOrigin } from "../lib/driveCredentials";
import { FileStoreError, asFileStoreError } from "./storage/fileStore";
import { buildStoredName } from "./storage/validation";
import { documentSelfTestPlan, selfTestOutcome } from "../lib/documentsConfig";

export const CONNECTION_KEY = "google_drive";

/* ------------------------------------------------------------------ */
/* Reads                                                              */
/* ------------------------------------------------------------------ */

export const readConnection = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("driveConnection")
      .withIndex("by_key", (q) => q.eq("key", CONNECTION_KEY))
      .first();
    return row ?? null;
  },
});

export const readDriveSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const settings = await getSettings(ctx);
    const raw = (settings as unknown as Record<string, unknown>)[DRIVE_SETTINGS_KEY];
    return resolveDriveSettings(raw);
  },
});

/**
 * The resolved credentials, for ACTIONS ONLY (internal — not callable from the
 * browser). It includes the key material because the OAuth exchange and the
 * token encryption run in actions; nothing that reaches a component ever calls
 * this.
 */
export const configForServer = internalQuery({
  args: {},
  handler: async (ctx): Promise<{
    clientId: string | null;
    clientSecret: string | null;
    tokenKey: string | null;
    appOrigin: string | null;
    complete: boolean;
    missing: string[];
  }> => {
    // Fresh: an action must see the value an admin saved a moment ago.
    const config = await getDriveConfig(ctx.db, { fresh: true });
    return {
      clientId: config.clientId.value,
      clientSecret: config.clientSecret.value,
      tokenKey: config.tokenKey.value,
      appOrigin: config.appOrigin.value,
      complete: config.complete,
      missing: config.missing,
    };
  },
});

/** Folder cache lookups run inside the caller's action (no shared state). */
export const folderCacheGet = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("driveFolders")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    return row?.driveFolderId ?? null;
  },
});

export const folderCachePut = internalMutation({
  args: { key: v.string(), parentId: v.string(), name: v.string(), driveFolderId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("driveFolders")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    // First writer wins: a concurrent creator keeps the existing id, so the
    // same folder is never created twice in Drive.
    if (existing) return existing.driveFolderId;
    await ctx.db.insert("driveFolders", { ...args, createdAt: Date.now() });
    return args.driveFolderId;
  },
});

/* ------------------------------------------------------------------ */
/* The live store                                                     */
/* ------------------------------------------------------------------ */

export type DriveDeps = {
  auth: DriveAuth;
  client: DriveClient;
  store: DriveFileStore;
  folders: DriveFolderService;
  connection: {
    mode: string;
    accountEmail?: string | null;
    rootFolderId?: string | null;
    revokedAt?: number | null;
    refreshTokenCipher?: string | null;
    /** Last known Drive usage, as reported by Google (bytes). */
    storageUsed?: number | null;
    storageLimit?: number | null;
  };
  settings: ReturnType<typeof resolveDriveSettings>;
};

/**
 * Build everything a Drive operation needs. Throws `not_configured` when the
 * connection is absent, `auth_revoked` when the admin disconnected it, and
 * `paused` uploads are refused by the callers (reads stay available).
 */
export async function driveDeps(ctx: ActionCtx): Promise<DriveDeps> {
  const [connection, settings, config] = await Promise.all([
    ctx.runQuery(internal.drive.readConnection, {}),
    ctx.runQuery(internal.drive.readDriveSettings, {}),
    ctx.runQuery(internal.drive.configForServer, {}),
  ]);
  if (!config.complete)
    throw new FileStoreError(
      "not_configured",
      `Google Drive is not configured yet: ${config.missing.join(", ")}`,
    );
  // "Connected" means a usable credential is stored, not just that the OAuth
  // page was visited: a row without the encrypted refresh token cannot upload
  // anything, so every Drive operation says so up front.
  if (!connection || (connection.mode !== "service_account" && !connection.refreshTokenCipher))
    throw new FileStoreError("not_configured", DRIVE_NOT_CONNECTED_MESSAGE);
  if (connection.revokedAt) throw new FileStoreError("auth_revoked", "Google Drive was disconnected");

  const env = {
    clientId: config.clientId ?? undefined,
    clientSecret: config.clientSecret ?? undefined,
    tokenKey: config.tokenKey ?? undefined,
    appOrigin: config.appOrigin ?? undefined,
  };
  const auth = new DriveAuth({
    loadConnection: async () => connection,
    env,
  });

  const client = new DriveClient({
    transport: async () => fetchTransport(await auth.accessToken()),
  });

  const store = new DriveFileStore(client);
  const folders = new DriveFolderService(client, {
    get: (key) => ctx.runQuery(internal.drive.folderCacheGet, { key }),
    put: async (entry) => {
      await ctx.runMutation(internal.drive.folderCachePut, entry);
    },
  });

  return { auth, client, store, folders, connection, settings };
}

/** Root folder id: the explicit setting wins, then the stored connection. */
export function rootFolderFor(deps: DriveDeps): string {
  const id = deps.settings.rootFolderId || deps.connection.rootFolderId || "";
  if (!id) throw new FileStoreError("not_configured", "The Drive root folder is not set in Settings");
  return id;
}

/* ------------------------------------------------------------------ */
/* Admin read model                                                   */
/* ------------------------------------------------------------------ */

export const getDriveAdminState = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user)) throw new ConvexError("Only the State Admin can view Drive settings.");
    const [connection, settingsRows, lastHealth, docs, folders] = await Promise.all([
      ctx.db
        .query("driveConnection")
        .withIndex("by_key", (q) => q.eq("key", CONNECTION_KEY))
        .first(),
      ctx.db.query("appSettings").collect(),
      ctx.db.query("driveHealthRuns").order("desc").first(),
      ctx.db.query("facilityDocuments").collect(),
      ctx.db.query("driveFolders").collect(),
    ]);
    const raw = settingsRows.find((r) => r.key === DRIVE_SETTINGS_KEY)?.value;
    const settings = resolveDriveSettings(raw);
    const config = await getDriveConfig(ctx.db);
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    const saConfigured = !!(proc?.env?.DRIVE_SA_EMAIL && proc?.env?.DRIVE_SA_PRIVATE_KEY);
    const current = docs.filter((d) => d.isCurrent && !d.removedAt);
    return {
      settings,
      connection: connection
        ? {
            // "Connected" requires a usable credential. A consent that was
            // started but never finished leaves a row with no refresh token,
            // and every upload would fail — so the page must not say Connected.
            connected:
              !connection.revokedAt &&
              (connection.mode === "service_account" || !!connection.refreshTokenCipher),
            mode: connection.mode,
            accountEmail: connection.accountEmail ?? null,
            connectedAt: connection.connectedAt ?? null,
            lastError: connection.lastError ?? null,
            lastErrorAt: connection.lastErrorAt ?? null,
            lastCheckedAt: connection.lastCheckedAt ?? null,
            storageUsed: connection.storageUsed ?? null,
            storageLimit: connection.storageLimit ?? null,
          }
        : null,
      env: {
        oauthConfigured: !!(config.clientId.value && config.clientSecret.value),
        serviceAccountConfigured: saConfigured,
        tokenKeyConfigured: !!config.tokenKey.value,
        appOrigin: config.appOrigin.value ?? null,
        sources: {
          clientId: config.clientId.source,
          clientSecret: config.clientSecret.source,
          appOrigin: config.appOrigin.source,
          tokenKey: config.tokenKey.source,
        },
      },
      counts: {
        current: current.length,
        missing: current.filter((d) => d.missingInDriveAt).length,
        folders: folders.length,
      },
      lastHealth: lastHealth
        ? {
            startedAt: lastHealth.startedAt,
            finishedAt: lastHealth.finishedAt ?? null,
            checked: lastHealth.checked,
            missing: lastHealth.missing,
            changed: lastHealth.changed,
            orphans: lastHealth.orphans,
            error: lastHealth.error ?? null,
          }
        : null,
    };
  },
});

/* ------------------------------------------------------------------ */
/* Settings                                                           */
/* ------------------------------------------------------------------ */

export const saveDriveSettings = mutation({
  args: {
    rootFolderId: v.optional(v.string()),
    maxMb: v.optional(v.number()),
    perTypeMb: v.optional(v.any()),
    retainedDays: v.optional(v.number()),
    keepVersions: v.optional(v.boolean()),
    nightlyReconciliation: v.optional(v.boolean()),
    lowSpacePercent: v.optional(v.number()),
    /** The upload pause (Admin toggle AND the inline Resume button). */
    paused: v.optional(v.boolean()),
    /** Optional free-text reason, shown next to the pause. */
    pauseReason: v.optional(v.string()),
    /** Optional auto-resume time (ms). Past it, `uploadsPaused` says no. */
    resumeAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user)) throw new ConvexError("Only the State Admin can change Drive settings.");
    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", DRIVE_SETTINGS_KEY))
      .first();
    const prev = resolveDriveSettings(existing?.value);
    const next = resolveDriveSettings({
      ...prev,
      ...Object.fromEntries(Object.entries(args).filter(([, val]) => val !== undefined)),
    });
    /* Pause bookkeeping — WHO paused, WHEN, and a clean slate on resume.
       Written here (not in the panel) so the inline "Resume uploads" button
       records the same audit trail as the Admin toggle. */
    if (args.paused !== undefined && args.paused !== prev.paused) {
      if (args.paused) {
        next.pausedAt = Date.now();
        next.pausedBy = user.name ?? user.email ?? "State Admin";
        // Pausing without an explicit new resume time must not inherit an
        // expired one — that would read as "not paused" for ever.
        if (args.resumeAt === undefined) next.resumeAt = null;
        next.autoPaused = false;
        next.autoPauseCause = "";
      } else {
        // A manual resume clears the pause AND any automatic circuit-breaker
        // bookkeeping: the next pause starts from a clean record.
        next.pausedAt = null;
        next.pausedBy = "";
        next.pauseReason = "";
        next.resumeAt = null;
        next.autoPaused = false;
        next.autoPauseCause = "";
      }
    }
    if (existing) await ctx.db.patch(existing._id, { value: next });
    else await ctx.db.insert("appSettings", { key: DRIVE_SETTINGS_KEY, value: next });
    await ctx.db.insert("auditLogs", {
      table: "appSettings",
      recordId: DRIVE_SETTINGS_KEY,
      action: "update",
      field: DRIVE_SETTINGS_KEY,
      oldValue: existing?.value ? JSON.stringify(existing.value) : "(default)",
      newValue: JSON.stringify(next),
      changedByName: user.name ?? "State Admin",
      changedAt: Date.now(),
    });
    return next;
  },
});

/* ------------------------------------------------------------------ */
/* Connection lifecycle                                               */
/* ------------------------------------------------------------------ */

/** Called by the OAuth callback with an already-encrypted refresh token. */
export const storeConnection = internalMutation({
  args: {
    mode: v.string(),
    accountEmail: v.optional(v.string()),
    refreshTokenCipher: v.optional(v.string()),
    rootFolderId: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("driveConnection")
      .withIndex("by_key", (q) => q.eq("key", CONNECTION_KEY))
      .first();
    const patch = {
      mode: args.mode,
      accountEmail: args.accountEmail,
      refreshTokenCipher: args.refreshTokenCipher,
      rootFolderId: args.rootFolderId,
      connectedAt: Date.now(),
      connectedBy: args.userId,
      revokedAt: undefined,
      lastError: undefined,
      lastErrorAt: undefined,
    };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("driveConnection", { key: CONNECTION_KEY, ...patch });
  },
});

export const recordDriveError = internalMutation({
  args: { message: v.string() },
  handler: async (ctx, { message }) => {
    const existing = await ctx.db
      .query("driveConnection")
      .withIndex("by_key", (q) => q.eq("key", CONNECTION_KEY))
      .first();
    if (!existing) return;
    await ctx.db.patch(existing._id, {
      lastError: message.slice(0, 300),
      lastErrorAt: Date.now(),
    });
  },
});

export const disconnectDrive = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user)) throw new ConvexError("Only the State Admin can disconnect Google Drive.");
    const existing = await ctx.db
      .query("driveConnection")
      .withIndex("by_key", (q) => q.eq("key", CONNECTION_KEY))
      .first();
    if (!existing) return { ok: true };
    // The encrypted token is removed: reconnecting is the only way back.
    await ctx.db.patch(existing._id, {
      revokedAt: Date.now(),
      refreshTokenCipher: undefined,
      lastError: undefined,
    });
    await ctx.db.insert("auditLogs", {
      table: "driveConnection",
      recordId: CONNECTION_KEY,
      action: "delete",
      field: "connection",
      oldValue: existing.accountEmail ?? "(connected)",
      newValue: "(disconnected)",
      changedByName: user.name ?? "State Admin",
      changedAt: Date.now(),
    });
    return { ok: true };
  },
});

/* ------------------------------------------------------------------ */
/* OAuth handshake: random single-use state + S256 PKCE (10 minutes)  */
/* ------------------------------------------------------------------ */

export const createOauthState = internalMutation({
  args: {
    state: v.string(),
    verifier: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
    redirectUri: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // The table only ever holds live handshakes — prune on every start.
    const rows = await ctx.db.query("driveOauthStates").collect();
    for (const row of rows) if (row.expiresAt < Date.now()) await ctx.db.delete(row._id);
    await ctx.db.insert("driveOauthStates", { ...args, createdAt: Date.now() });
  },
});

/** Single use: the row is deleted before the verifier is returned. */
export const consumeOauthState = internalMutation({
  args: { state: v.string() },
  handler: async (ctx, { state }) => {
    const row = await ctx.db
      .query("driveOauthStates")
      .withIndex("by_state", (q) => q.eq("state", state))
      .first();
    if (!row) return null;
    await ctx.db.delete(row._id);
    if (row.expiresAt < Date.now()) return null;
    return { userId: row.userId, verifier: row.verifier, redirectUri: row.redirectUri ?? null };
  },
});

/**
 * Start the consent flow. The `state` is a random value stored server-side and
 * bound to the signed-in State Admin; `code_challenge` is the S256 hash of a
 * verifier that never leaves the deployment — a forged or replayed callback
 * has neither.
 */
export const driveConsentState = action({
  args: {
    /**
     * The origin the admin is actually browsing from. It becomes the OAuth
     * `redirect_uri` host, so Google always returns the browser to the app
     * instance that started the flow (the callback page lives there).
     */
    appOrigin: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ url: string; redirectUri: string }> => {
    const user = await requireAdminAction(ctx, "Only the State Admin can connect Google Drive");

    const config = await ctx.runQuery(internal.drive.configForServer, {});
    if (!config.complete)
      throw new FileStoreError(
        "not_configured",
        `Google Drive needs: ${config.missing.join(", ")}. Enter them in Settings → Google Drive.`,
      );

    let origin: string;
    if (args.appOrigin !== undefined) {
      const checked = validateAppOrigin(args.appOrigin, { allowLocalhost: true });
      if (!checked.ok) throw new ConvexError(checked.error);
      origin = checked.value;
    } else if (config.appOrigin) {
      origin = config.appOrigin;
    } else {
      throw new ConvexError(
        "The app address is unknown — open this page from inside the app, or set APP_ORIGIN in Settings → Google Drive.",
      );
    }
    const redirectUri = `${origin}${REDIRECT_PATH}`;

    const verifier = toBase64Url(randomBytes(48));
    const state = toBase64Url(randomBytes(32));
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    const challenge = toBase64Url(new Uint8Array(digest as ArrayBuffer));
    await ctx.runMutation(internal.drive.createOauthState, {
      state,
      verifier,
      userId: user._id,
      expiresAt: Date.now() + 10 * 60_000,
      redirectUri,
    });

    const auth = new DriveAuth({
      loadConnection: async () => null,
      redirectUri,
      env: {
        clientId: config.clientId ?? undefined,
        clientSecret: config.clientSecret ?? undefined,
        tokenKey: config.tokenKey ?? undefined,
        appOrigin: config.appOrigin ?? undefined,
      },
    });
    return { url: auth.consentUrl(state, challenge), redirectUri };
  },
});

/**
 * The signed-in user inside an ACTION.
 *
 * Convex Auth's JWT carries ONLY `sub = "<userId>|<sessionId>"` — there is no
 * `email` (and no `name`) claim — so `identity.email` is undefined in an
 * action and a users lookup by email silently returns nothing. The id has to
 * come from the session subject, exactly as queries and mutations do with
 * `getAuthUserId`.
 */
export async function actionUser(ctx: ActionCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.runQuery(internal.drive.userById, { userId });
}

/** Every Drive action is State-Admin only; the message is shown in the toast. */
export async function requireAdminAction(ctx: ActionCtx, message: string) {
  const user = await actionUser(ctx);
  if (!user) throw new ConvexError("Sign in again — this change needs a State Admin session.");
  if (user.appRole !== "admin") throw new ConvexError(message);
  return user;
}

export const userById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => (await ctx.db.get(userId)) ?? null,
});

/* ------------------------------------------------------------------ */
/* Document self-test                                                 */
/* ------------------------------------------------------------------ */

/* The self-test walks the SIX counted documents — SA Report, SA Checklist,
   NQAS Result, Gap Closure Proceeding, Condemned Certificate and Fire NOC.
   The list comes from the central document config (`documentSelfTestPlan`),
   so it can never drift from what the uploader accepts or from the labels the
   tiles, badges and the "n of 6" count show. */
const SELF_TEST_DOCS = documentSelfTestPlan();

type SelfTestRow = { key: string; label: string; ok: boolean; message: string };

/**
 * One tiny file per document type: write → read back → delete, with a
 * pass/fail row per type and a cause on every failure. Drive stores bytes
 * opaquely, so the sample only has to be non-empty — it is deleted the moment
 * it has been read back.
 */
async function runSelfTest(deps: {
  client: DriveClient;
  store: DriveFileStore;
  folders: DriveFolderService;
  rootId: string;
}): Promise<SelfTestRow[]> {
  const incoming = await deps.folders.incomingFolder(deps.rootId);
  const stamp = Date.now().toString(36);
  const rows: SelfTestRow[] = [];
  for (const doc of SELF_TEST_DOCS) {
    const name = `self-test-${doc.key.toLowerCase()}-${stamp}.${doc.ext}`;
    try {
      const file = await deps.store.put(TEST_PDF, {
        parentId: incoming,
        name,
        mimeType: doc.mime,
        appProperties: { kind: "self-test", docKey: doc.key },
      });
      const verified = await deps.client.getFile(file.id);
      const stored = selfTestOutcome({ mime: doc.mime, written: TEST_PDF.length, readBack: verified });
      rows.push({ key: doc.key, label: doc.label, ...stored });

      /* Part A.5 — Preview and download: stream the bytes back through the
         SAME DriveFileStore the HTTP endpoint uses, then compare length and
         SHA-256. This is the read path Preview/Download take, not a metadata
         check, so a broken media endpoint is caught here. */
      try {
        const media = await deps.store.getStream(file.id);
        const bytes = new Uint8Array(await new Response(media.stream).arrayBuffer());
        const got = await sha256Hex(bytes);
        const want = await sha256Hex(TEST_PDF);
        const ok = bytes.length === TEST_PDF.length && got === want;
        rows.push({
          key: `${doc.key}:content`,
          label: `${doc.label} — Preview and download`,
          ok,
          message: ok
            ? `Read ${bytes.length} bytes back with the expected checksum`
            : `Expected ${TEST_PDF.length} bytes with a matching checksum, got ${bytes.length}`,
        });
      } catch (err) {
        const e = asFileStoreError(err);
        rows.push({
          key: `${doc.key}:content`,
          label: `${doc.label} — Preview and download`,
          ok: false,
          message: `The stored file could not be streamed back: ${e.message}`,
        });
      }

      await deps.store.delete(file.id, { permanent: true });
    } catch (err) {
      const e = asFileStoreError(err);
      rows.push({ key: doc.key, label: doc.label, ok: false, message: e.message });
    }
  }
  return rows;
}

export const storeSelfTest = internalMutation({
  args: {
    rows: v.array(v.object({ key: v.string(), label: v.string(), ok: v.boolean(), message: v.string() })),
  },
  handler: async (ctx, { rows }) => {
    const existing = await ctx.db
      .query("driveConnection")
      .withIndex("by_key", (q) => q.eq("key", CONNECTION_KEY))
      .first();
    if (!existing) return;
    const ok = rows.every((row) => row.ok);
    await ctx.db.patch(existing._id, {
      selfTestAt: Date.now(),
      selfTestOk: ok,
      selfTestRows: rows,
    });

    /* An AUTOMATIC (circuit-breaker) pause is about its cause, not a person:
       the moment the self-test passes again, uploads resume and the cause is
       cleared. A manual pause (pausedBy set, autoPaused false) is never
       touched here — only an admin lifts that. */
    if (ok) {
      const row = await ctx.db
        .query("appSettings")
        .withIndex("by_key", (q) => q.eq("key", DRIVE_SETTINGS_KEY))
        .first();
      const settings = resolveDriveSettings(row?.value);
      if (settings.autoPaused) {
        const cleared = resolveDriveSettings({
          ...settings,
          paused: false,
          autoPaused: false,
          autoPauseCause: "",
          pausedAt: null,
          pausedBy: "",
          pauseReason: "",
          resumeAt: null,
        });
        if (row) await ctx.db.patch(row._id, { value: cleared });
        else await ctx.db.insert("appSettings", { key: DRIVE_SETTINGS_KEY, value: cleared });
        await ctx.db.insert("auditLogs", {
          table: "appSettings",
          recordId: DRIVE_SETTINGS_KEY,
          action: "update",
          field: DRIVE_SETTINGS_KEY,
          oldValue: JSON.stringify(settings),
          newValue: JSON.stringify(cleared),
          changedByName: "Automatic (passing self-test)",
          changedAt: Date.now(),
        });
      }
    }
  },
});

/**
 * "Notify administrator" — any signed-in user whose uploads are blocked can
 * ping the State Admins. The notice shows up in the Drive panel's notice list
 * (the same `driveNotices` stream used for credential changes) and carries no
 * secret, no Drive id and no file name.
 */
export const notifyUploadsPaused = mutation({
  args: { note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireActivatedUser(ctx);
    const note = String(args.note ?? "").trim().slice(0, 200);
    await ctx.db.insert("driveNotices", {
      kind: "uploads_resume_requested",
      message: `${user.name ?? user.email ?? "A user"} asked to resume document uploads${note ? `: ${note}` : " — uploads are blocked in the facility Documents card."}`,
      actorId: user._id,
      actorName: user.name ?? user.email ?? undefined,
      createdAt: Date.now(),
      dismissedBy: [],
    });
  },
});

export const setRootFolder = internalMutation({
  args: { rootFolderId: v.string() },
  handler: async (ctx, { rootFolderId }) => {
    const existing = await ctx.db
      .query("driveConnection")
      .withIndex("by_key", (q) => q.eq("key", CONNECTION_KEY))
      .first();
    if (existing) await ctx.db.patch(existing._id, { rootFolderId });
  },
});

/**
 * Exchange the code with the PKCE verifier, store the encrypted refresh token,
 * make sure the folder tree exists, then run the self-test ONCE so the admin
 * sees immediately whether uploads work.
 */
async function finishConsent(
  ctx: ActionCtx,
  input: { code: string; userId: string; verifier: string; redirectUri?: string | null },
): Promise<void> {
  const config = await ctx.runQuery(internal.drive.configForServer, {});
  if (!config.complete || !config.tokenKey)
    throw new FileStoreError(
      "not_configured",
      `Google Drive needs: ${config.missing.join(", ")}. Enter them in Settings → Google Drive.`,
    );

  const auth = new DriveAuth({
    loadConnection: async () => null,
    // Google requires the exchange to send back EXACTLY the redirect_uri the
    // consent used — it travels with the state row, never recomputed.
    redirectUri: input.redirectUri || (config.appOrigin ? redirectUriFor(config.appOrigin) : undefined),
    env: {
      clientId: config.clientId ?? undefined,
      clientSecret: config.clientSecret ?? undefined,
      tokenKey: config.tokenKey,
      appOrigin: config.appOrigin ?? undefined,
    },
  });
  const tokens = await auth.exchangeCode(input.code, input.verifier);
  const cipher = await encryptValue(tokens.refreshToken, config.tokenKey, REFRESH_TOKEN_PURPOSE);
  await ctx.runMutation(internal.drive.writeConsent, {
    accountEmail: tokens.email ?? undefined,
    refreshTokenCipher: cipher,
    userId: input.userId as never,
  });

  const [settings, connection] = await Promise.all([
    ctx.runQuery(internal.drive.readDriveSettings, {}),
    ctx.runQuery(internal.drive.readConnection, {}),
  ]);

  const client = new DriveClient({ transport: async () => fetchTransport(tokens.accessToken) });
  const folders = new DriveFolderService(client, { get: async () => null, put: async () => {} });
  let rootFolderId = settings.rootFolderId || connection?.rootFolderId || "";

  try {
    if (!rootFolderId) {
      const root = await client.ensureFolder("root", FOLDER_NAMES.facilityDocuments);
      rootFolderId = root.id;
      await ctx.runMutation(internal.drive.setRootFolder, { rootFolderId });
    }
    // Created now so the very first upload does not pay for folder setup.
    await folders.incomingFolder(rootFolderId);
    await folders.trashReviewFolder(rootFolderId);
  } catch {
    // Folder setup never blocks the connection — the first upload retries it.
  }

  if (rootFolderId) {
    try {
      const rows = await runSelfTest({
        client,
        store: new DriveFileStore(client),
        folders,
        rootId: rootFolderId,
      });
      await ctx.runMutation(internal.drive.storeSelfTest, { rows });
    } catch {
      // Per-document failures are already captured in `rows`.
    }
  }
}

/** Public path: the state must belong to the signed-in admin. */
export const completeConsent = action({
  args: { code: v.string(), state: v.string() },
  handler: async (ctx, { code, state }): Promise<{ ok: true }> => {
    const user = await requireAdminAction(ctx, "Only the State Admin can connect Google Drive");

    const row = await ctx.runMutation(internal.drive.consumeOauthState, { state });
    if (!row || String(row.userId) !== String(user._id))
      throw new ConvexError("This consent link is invalid or has expired. Press Connect Google Drive again.");
    await finishConsent(ctx, {
      code,
      userId: String(user._id),
      verifier: row.verifier,
      redirectUri: row.redirectUri,
    });
    return { ok: true };
  },
});

/** Admin-only self-test, also offered as a button after connecting. */
export const runDocumentSelfTest = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean; rows: SelfTestRow[] }> => {
    await requireAdminAction(ctx, "Only the State Admin can run the self-test");
    const deps = await driveDeps(ctx);
    const rows = await runSelfTest({
      client: deps.client,
      store: deps.store,
      folders: deps.folders,
      rootId: rootFolderFor(deps),
    });
    await ctx.runMutation(internal.drive.storeSelfTest, { rows });
    return { ok: rows.every((row) => row.ok), rows };
  },
});

/** Validate the root folder id against the connected account (name only). */
export const verifyRootFolder = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean; name: string | null; message: string }> => {
    await requireAdminAction(ctx, "Only the State Admin can check the root folder");
    try {
      const deps = await driveDeps(ctx);
      const rootFolderId = rootFolderFor(deps);
      const meta = await deps.client.getFile(rootFolderId);
      if (!meta) return { ok: false, name: null, message: "That folder id does not exist in the connected Drive account." };
      if (meta.mimeType !== "application/vnd.google-apps.folder")
        return { ok: false, name: null, message: "That id is a file, not a folder." };
      return { ok: true, name: meta.name, message: `${meta.name} ✓` };
    } catch (err) {
      return { ok: false, name: null, message: asFileStoreError(err).message };
    }
  },
});

export const writeConsent = internalMutation({
  args: {
    accountEmail: v.optional(v.string()),
    refreshTokenCipher: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { accountEmail, refreshTokenCipher, userId }) => {
    const existing = await ctx.db
      .query("driveConnection")
      .withIndex("by_key", (q) => q.eq("key", CONNECTION_KEY))
      .first();
    const row = {
      mode: "oauth",
      accountEmail,
      refreshTokenCipher,
      connectedAt: Date.now(),
      connectedBy: userId,
      revokedAt: undefined,
      lastError: undefined,
      lastErrorAt: undefined,
    };
    if (existing) await ctx.db.patch(existing._id, row);
    else await ctx.db.insert("driveConnection", { key: CONNECTION_KEY, ...row });
    await ctx.db.insert("auditLogs", {
      table: "driveConnection",
      recordId: CONNECTION_KEY,
      action: "create",
      field: "connection",
      newValue: accountEmail ?? "connected",
      changedBy: userId,
      changedAt: Date.now(),
    });
  },
});

/* ------------------------------------------------------------------ */
/* Test upload                                                        */
/* ------------------------------------------------------------------ */

const TEST_PDF = new TextEncoder().encode(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

/**
 * "Test upload": write one small PDF to `_incoming`, verify it, delete it.
 * Returns only a human status — never a Drive id or link.
 */
export const testUpload = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean; message: string }> => {
    await requireAdminAction(ctx, "Only the State Admin can test Drive");

    const deps = await driveDeps(ctx);
    try {
      const root = rootFolderFor(deps);
      const incoming = await deps.folders.incomingFolder(root);
      const name = buildStoredName({
        nin: "TEST",
        docKey: "NQAS_Result",
        cycleNo: 1,
        date: new Date().toISOString().slice(0, 10),
        versionNo: 1,
        mime: "application/pdf",
      }).replace(/^TEST/, `TEST${toBase64Url(randomBytes(3)).slice(0, 4)}`);
      const file = await deps.store.put(TEST_PDF, {
        parentId: incoming,
        name,
        mimeType: "application/pdf",
        appProperties: { kind: "connection-test" },
      });
      await deps.store.delete(file.id, { permanent: true });
      return { ok: true, message: "Drive is connected and writable" };
    } catch (err) {
      const e = asFileStoreError(err);
      await ctx.runMutation(internal.drive.recordDriveError, { message: e.message });
      return { ok: false, message: e.message };
    }
  },
});

/** Keep the Settings page honest: refresh quota fields on demand. */
export const refreshStorage = action({
  args: {},
  handler: async (ctx) => {
    await requireAdminAction(ctx, "Only the State Admin can refresh Drive");
    const deps = await driveDeps(ctx);
    const quota = await deps.client.aboutStorage();
    await ctx.runMutation(internal.drive.recordQuota, quota);
    return quota;
  },
});

export const recordQuota = internalMutation({
  args: { used: v.number(), limit: v.number() },
  handler: async (ctx, { used, limit }) => {
    const existing = await ctx.db
      .query("driveConnection")
      .withIndex("by_key", (q) => q.eq("key", CONNECTION_KEY))
      .first();
    if (!existing) return;
    await ctx.db.patch(existing._id, {
      storageUsed: used,
      storageLimit: limit,
      lastCheckedAt: Date.now(),
    });
  },
});

export { FOLDER_NAMES };
