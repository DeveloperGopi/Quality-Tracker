/**
 * DRIVE CREDENTIALS — the State-Admin API.
 *
 * The Admin page can now enter the four values that used to live only in the
 * server environment. The rules are enforced HERE, not in the UI:
 *
 *   • only a State Admin can read the state or change anything (the role is
 *     re-checked from the session on every call);
 *   • every change re-verifies the admin's password through Convex Auth's own
 *     credential check, rate-limited to 5 attempts per 15 minutes;
 *   • the client secret is encrypted (AES-256-GCM, purpose-scoped AAD) before
 *     it is stored, and NOTHING here ever returns it — the state query reports
 *     `saved: true/false` only;
 *   • every action is audited with what changed, never the values, and the
 *     other State Admins get an in-app notice.
 *
 * No credential is read at module load: `getDriveConfig()` is called inside the
 * request, so a save takes effect immediately (the 30 s cache is cleared).
 */

import { ConvexError, v } from "convex/values";
import { retrieveAccount } from "@convex-dev/auth/server";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireActivatedUser, canEditAll } from "./facilities";
import { actionUser } from "./drive";
import {
  buildDriveCredentialsView,
  CLIENT_SECRET_PURPOSE,
  DRIVE_CREDENTIALS_KEY,
  REFRESH_TOKEN_PURPOSE,
  redirectUriFor,
  validateAppOrigin,
  validateClientId,
  validateClientSecret,
} from "../lib/driveCredentials";
import { DRIVE_SETTINGS_KEY, resolveDriveSettings } from "../lib/driveSettings";
import { clearDriveConfigCache, ensureDriveSecretKey, getDriveConfig } from "./storage/driveConfig";
import { decryptValue, encryptValue, randomKeyMaterial } from "./storage/crypto";
import { driveEnv } from "./storage/driveAuth";
import { FileStoreError } from "./storage/fileStore";

const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/* ------------------------------------------------------------------ */
/* Who is asking                                                      */
/* ------------------------------------------------------------------ */

/**
 * The caller, resolved from the SESSION, never from `identity.email`.
 *
 * Convex Auth signs a JWT with only `sub = "<userId>|<sessionId>"`: there is no
 * email claim, so `identity.email` is undefined in an action and the old
 * email lookup returned null → a plain Error → the browser only saw
 * "Server Error / Called by client" with a request id.
 */
async function adminForAction(ctx: ActionCtx) {
  const user = await actionUser(ctx);
  if (!user) throw new ConvexError("Sign in again — this change needs a State Admin session.");
  if (user.appRole !== "admin")
    throw new ConvexError("Only the State Admin can change Google Drive credentials.");
  return user;
}

async function adminForMutation(ctx: MutationCtx) {
  const user = await requireActivatedUser(ctx);
  if (!canEditAll(user)) throw new ConvexError("Only the State Admin can change Google Drive credentials.");
  return user;
}

/* ------------------------------------------------------------------ */
/* Password re-check (5 attempts / 15 minutes)                        */
/* ------------------------------------------------------------------ */

export const attemptsInWindow = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const since = Date.now() - WINDOW_MS;
    const rows = await ctx.db
      .query("driveCredentialAttempts")
      .withIndex("by_user", (q) => q.eq("userId", userId).gt("at", since))
      .collect();
    return rows.length;
  },
});

export const recordAttempt = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.insert("driveCredentialAttempts", { userId, at: Date.now() });
    // Keep the table tiny: anything older than the window is dead weight.
    const stale = await ctx.db
      .query("driveCredentialAttempts")
      .withIndex("by_user", (q) => q.eq("userId", userId).lt("at", Date.now() - WINDOW_MS * 4))
      .collect();
    for (const row of stale) await ctx.db.delete(row._id);
  },
});

export const clearAttempts = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("driveCredentialAttempts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
  },
});

/**
 * Verify the signed-in admin's password before a credential change.
 *
 * This is Convex Auth's own credential check — the same scrypt comparison the
 * sign-in flow uses — so there is no second password implementation to keep in
 * sync. Our counter adds the 5-per-15-minutes rule on top of the provider's.
 */
async function verifyPasswordOrThrow(ctx: ActionCtx, user: { _id: string; email?: string | null }, password: string) {
  if (!password) throw new ConvexError("Enter your password to confirm this change.");
  if (!user.email) throw new ConvexError("This account has no email address to verify against.");

  const used = await ctx.runQuery(internal.driveCredentials.attemptsInWindow, { userId: user._id as never });
  if (used >= MAX_ATTEMPTS) {
    throw new ConvexError("Too many password attempts. Wait 15 minutes and try again.");
  }

  try {
    await (retrieveAccount as unknown as (c: unknown, a: unknown) => Promise<unknown>)(ctx, {
      provider: "password",
      account: { id: user.email, secret: password },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "TooManyFailedAttempts") {
      throw new ConvexError("Too many failed password attempts — wait a few minutes and try again.");
    }
    await ctx.runMutation(internal.driveCredentials.recordAttempt, { userId: user._id as never });
    if (message === "InvalidAccountId") {
      throw new ConvexError(
        "This account has no password set, so the change cannot be confirmed. Use Register with the same email once to set a password, then try again.",
      );
    }
    throw new ConvexError("That password is not correct.");
  }
  await ctx.runMutation(internal.driveCredentials.clearAttempts, { userId: user._id as never });
}

/* ------------------------------------------------------------------ */
/* Read model (browser-safe)                                          */
/* ------------------------------------------------------------------ */

export const getDriveCredentialsState = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    if (!canEditAll(user)) throw new ConvexError("Only the State Admin can view Google Drive credentials.");

    // Fresh: the admin must see the value they just saved, not a 30 s cache.
    const config = await getDriveConfig(ctx.db, { fresh: true });
    const [settingsRow, connection, notices] = await Promise.all([
      ctx.db
        .query("appSettings")
        .withIndex("by_key", (q) => q.eq("key", DRIVE_SETTINGS_KEY))
        .first(),
      ctx.db
        .query("driveConnection")
        .withIndex("by_key", (q) => q.eq("key", DRIVE_CREDENTIALS_KEY))
        .first(),
      ctx.db.query("driveNotices").withIndex("by_time").order("desc").take(8),
    ]);

    const settings = resolveDriveSettings(settingsRow?.value);
    const rootFolderId = settings.rootFolderId || connection?.rootFolderId || "";
    const viewerId = String(user._id);

    const rows = Array.isArray(connection?.selfTestRows)
      ? (connection.selfTestRows as { key: string; label: string; ok: boolean; message: string }[])
      : [];

    return buildDriveCredentialsView({
      clientId: {
        value: config.clientId.value,
        source: config.clientId.source,
        savedAt: config.clientId.savedAt,
        savedByName: config.clientId.savedByName,
      },
      clientSecret: {
        saved: !!config.clientSecret.value,
        source: config.clientSecret.source,
        savedAt: config.clientSecret.savedAt,
        savedByName: config.clientSecret.savedByName,
      },
      appOrigin: {
        value: config.appOrigin.value,
        source: config.appOrigin.source,
        savedAt: config.appOrigin.savedAt,
        savedByName: config.appOrigin.savedByName,
      },
      encryptionKey: {
        present: !!config.tokenKey.value,
        source: config.tokenKey.source,
        createdAt: config.tokenKey.createdAt,
        rotatedAt: config.tokenKey.rotatedAt,
      },
      rootFolderId,
      connected: !!connection && !connection.revokedAt && !!connection.refreshTokenCipher,
      selfTest: {
        at: connection?.selfTestAt ?? null,
        ok: connection?.selfTestOk ?? null,
        rows,
      },
      notices: notices
        .filter((n) => !(n.dismissedBy ?? []).includes(viewerId))
        .map((n) => ({ id: String(n._id), message: n.message, at: n.createdAt })),
    });
  },
});


/* ------------------------------------------------------------------ */
/* Writes                                                             */
/* ------------------------------------------------------------------ */

export const ensureKey = internalMutation({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, { userId }) => ensureDriveSecretKey(ctx.db, userId ? String(userId) : undefined),
});

export const writeCredentials = internalMutation({
  args: {
    clientId: v.optional(v.string()),
    clientSecretCipher: v.optional(v.string()),
    appOrigin: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    userName: v.optional(v.string()),
    changed: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("driveCredentials")
      .withIndex("by_key", (q) => q.eq("key", DRIVE_CREDENTIALS_KEY))
      .first();
    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now, updatedBy: args.userId, updatedByName: args.userName };
    if (args.clientId !== undefined) {
      patch.clientId = args.clientId;
      patch.clientIdUpdatedAt = now;
      patch.clientIdUpdatedByName = args.userName;
    }
    if (args.clientSecretCipher !== undefined) {
      patch.clientSecretCipher = args.clientSecretCipher;
      patch.secretUpdatedAt = now;
      patch.secretUpdatedByName = args.userName;
    }
    if (args.appOrigin !== undefined) {
      patch.appOrigin = args.appOrigin;
      patch.originUpdatedAt = now;
      patch.originUpdatedByName = args.userName;
    }
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("driveCredentials", { key: DRIVE_CREDENTIALS_KEY, ...patch });

    await ctx.db.insert("auditLogs", {
      table: "driveCredentials",
      recordId: DRIVE_CREDENTIALS_KEY,
      action: existing ? "update" : "create",
      field: args.changed.join(", ") || "credentials",
      // Values are never written to the audit trail — only what changed.
      oldValue: existing ? "(previous credentials)" : "(none)",
      newValue: args.changed.map((c) => `${c}: updated`).join(" · ") || "(no change)",
      changedBy: args.userId,
      changedByName: args.userName,
      changedAt: now,
    });

    // Tell the other State Admins, without telling them anything secret.
    await ctx.db.insert("driveNotices", {
      kind: "credentials_changed",
      message: `${args.userName ?? "A State Admin"} updated the Google Drive credentials (${args.changed.join(", ") || "no change"}).`,
      actorId: args.userId,
      actorName: args.userName,
      createdAt: now,
      dismissedBy: [],
    });

    clearDriveConfigCache();
    return { ok: true as const };
  },
});

export const markKeyRotated = internalMutation({
  args: { userId: v.optional(v.id("users")), userName: v.optional(v.string()) },
  handler: async (ctx, { userId, userName }) => {
    const row = await ctx.db
      .query("appSecrets")
      .withIndex("by_key", (q) => q.eq("key", "drive-token-key"))
      .first();
    if (!row) return;
    await ctx.db.patch(row._id, { rotatedAt: Date.now(), rotatedBy: userId });
    await ctx.db.insert("auditLogs", {
      table: "appSecrets",
      recordId: "drive-token-key",
      action: "update",
      field: "encryption key",
      oldValue: "(previous key)",
      newValue: "(rotated)",
      changedBy: userId,
      changedByName: userName,
      changedAt: Date.now(),
    });
    await ctx.db.insert("driveNotices", {
      kind: "key_rotated",
      message: `${userName ?? "A State Admin"} rotated the Google Drive encryption key.`,
      actorId: userId,
      actorName: userName,
      createdAt: Date.now(),
      dismissedBy: [],
    });
    clearDriveConfigCache();
  },
});

export const deleteCredentials = internalMutation({
  args: { userId: v.optional(v.id("users")), userName: v.optional(v.string()), deleteKey: v.boolean() },
  handler: async (ctx, { userId, userName, deleteKey }) => {
    const existing = await ctx.db
      .query("driveCredentials")
      .withIndex("by_key", (q) => q.eq("key", DRIVE_CREDENTIALS_KEY))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    if (deleteKey) {
      const secret = await ctx.db
        .query("appSecrets")
        .withIndex("by_key", (q) => q.eq("key", "drive-token-key"))
        .first();
      if (secret) await ctx.db.delete(secret._id);
    }
    await ctx.db.insert("auditLogs", {
      table: "driveCredentials",
      recordId: DRIVE_CREDENTIALS_KEY,
      action: "delete",
      field: "credentials",
      oldValue: "(saved credentials)",
      newValue: "(cleared)",
      changedBy: userId,
      changedByName: userName,
      changedAt: Date.now(),
    });
    await ctx.db.insert("driveNotices", {
      kind: "credentials_cleared",
      message: `${userName ?? "A State Admin"} cleared the saved Google Drive credentials.`,
      actorId: userId,
      actorName: userName,
      createdAt: Date.now(),
      dismissedBy: [],
    });
    clearDriveConfigCache();
  },
});

export const dismissNotice = mutation({
  args: { noticeId: v.id("driveNotices") },
  handler: async (ctx, { noticeId }) => {
    const user = await adminForMutation(ctx);
    const row = await ctx.db.get(noticeId);
    if (!row) return { ok: true as const };
    const dismissed = row.dismissedBy ?? [];
    const me = String(user._id);
    if (!dismissed.includes(me)) await ctx.db.patch(noticeId, { dismissedBy: [...dismissed, me] });
    return { ok: true as const };
  },
});

/* ------------------------------------------------------------------ */
/* Google probe — proves the Client ID + secret are accepted          */
/* ------------------------------------------------------------------ */

/**
 * A deliberately useless token request. Google answers `invalid_grant` (the
 * fake code is not a real authorization code) which PROVES it recognised the
 * client; `invalid_client` means the id/secret pair is wrong. No token is ever
 * minted, and only Google's error CODE is used — never a response body.
 */
async function googleTokenProbe(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ ok: boolean; message: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: "nqas-connection-check",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    let code = "";
    try {
      const json = (await res.json()) as { error?: string };
      code = String(json?.error ?? "");
    } catch {
      code = "";
    }
    if (code === "invalid_grant" || code === "invalid_request") {
      return { ok: true, message: "Google accepted the client details." };
    }
    if (code === "invalid_client" || res.status === 401) {
      return {
        ok: false,
        message: "Google did not accept the Client ID or secret. Re-copy both from Google Cloud and save again.",
      };
    }
    if (code === "redirect_uri_mismatch") {
      return {
        ok: false,
        message: "Google rejected the redirect address. Copy the redirect URI shown above into Google Cloud.",
      };
    }
    return {
      ok: false,
      message: `Google answered ${code || `HTTP ${res.status}`}. Check the Client ID, secret and redirect URI.`,
    };
  } catch {
    return {
      ok: false,
      message: "The server could not reach Google. The values were saved — run the test again when the network is back.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Save / test / rotate / clear                                       */
/* ------------------------------------------------------------------ */

export const saveDriveCredentials = action({
  args: {
    clientId: v.optional(v.string()),
    clientSecret: v.optional(v.string()),
    appOrigin: v.optional(v.string()),
    /** The browser's own origin, used only to prefill/verify the address. */
    origin: v.optional(v.string()),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{ ok: true; changed: string[] }> => {
    const user = await adminForAction(ctx);
    await verifyPasswordOrThrow(ctx, user, args.password);

    const changed: string[] = [];
    const patch: { clientId?: string; clientSecretCipher?: string; appOrigin?: string } = {};

    if (args.clientId !== undefined && args.clientId.trim() !== "") {
      const check = validateClientId(args.clientId);
      if (!check.ok) throw new ConvexError(check.error);
      patch.clientId = check.value;
      changed.push("Client ID");
    }
    if (args.clientSecret !== undefined && args.clientSecret.trim() !== "") {
      const check = validateClientSecret(args.clientSecret);
      if (!check.ok) throw new ConvexError(check.error);
      changed.push("Client secret");
    }
    if (args.appOrigin !== undefined && args.appOrigin.trim() !== "") {
      const check = validateAppOrigin(args.appOrigin, { allowLocalhost: true, trustedOrigin: args.origin ?? null });
      if (!check.ok) throw new ConvexError(check.error);
      patch.appOrigin = check.value;
      changed.push("App address");
    }
    if (!changed.length) throw new ConvexError("Nothing to save.");

    // The key is generated on first save and lives in its own table. The env
    // key, when set, wins — `ensureKey` then reports managedByEnv.
    await ctx.runMutation(internal.driveCredentials.ensureKey, { userId: user._id as never });

    const config = await ctx.runQuery(internal.drive.configForServer, {});
    if (args.clientSecret !== undefined && args.clientSecret.trim() !== "") {
      if (!config.tokenKey) throw new ConvexError("The encryption key could not be created. Try saving again.");
      patch.clientSecretCipher = await encryptValue(args.clientSecret.trim(), config.tokenKey, CLIENT_SECRET_PURPOSE);
    }
    // The save waits for the database write ONLY — no Google call — so it
    // answers well under 300 ms. The card then runs the optional
    // `testDriveCredentials`, which is where "Google accepted the client
    // details" (or the specific error) comes from.
    await ctx.runMutation(internal.driveCredentials.writeCredentials, {
      ...patch,
      userId: user._id as never,
      userName: user.name ?? user.email ?? "State Admin",
      changed,
    });
    clearDriveConfigCache();
    return { ok: true as const, changed };
  },
});

export const testDriveCredentials = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean; message: string }> => {
    const user = await adminForAction(ctx);
    const config = await ctx.runQuery(internal.drive.configForServer, {});
    if (!config.clientId || !config.clientSecret) {
      return { ok: false, message: "Save the Client ID and Client secret first." };
    }
    const redirect = redirectUriFor(config.appOrigin ?? null);
    const result = await googleTokenProbe(config.clientId, config.clientSecret, redirect);
    return result;
  },
});

export const rotateDriveKey = action({
  args: { password: v.string() },
  handler: async (ctx, { password }): Promise<{ ok: true; requiresReconnect: boolean }> => {
    const user = await adminForAction(ctx);
    await verifyPasswordOrThrow(ctx, user, password);

    const env = driveEnv();
    if (env.tokenKey) {
      throw new ConvexError("The encryption key is managed by the server environment (DRIVE_TOKEN_KEY), so it cannot be rotated here.");
    }

    const before = await ctx.runQuery(internal.driveCredentials.readForRotation, {});
    if (!before.credentialsId && !before.hasKey) {
      throw new ConvexError("There is nothing to rotate yet — save the credentials first.");
    }

    const newKey = randomKeyMaterial();
    let reencryptedSecret: string | null = null;
    let reencryptedToken: string | null = null;
    let requiresReconnect = false;

    if (before.clientSecretCipher) {
      if (!before.oldKey) throw new ConvexError("The old encryption key is missing, so the client secret cannot be re-encrypted. Save the credentials again.");
      const plain = await decryptValue(before.clientSecretCipher, before.oldKey, CLIENT_SECRET_PURPOSE);
      reencryptedSecret = await encryptValue(plain, newKey, CLIENT_SECRET_PURPOSE);
    }
    if (before.refreshTokenCipher) {
      try {
        if (!before.oldKey) throw new Error("missing key");
        const plain = await decryptValue(before.refreshTokenCipher, before.oldKey, REFRESH_TOKEN_PURPOSE);
        reencryptedToken = await encryptValue(plain, newKey, REFRESH_TOKEN_PURPOSE);
      } catch {
        // The old token cannot be re-read: drop it and ask for a reconnect.
        requiresReconnect = true;
      }
    }

    await ctx.runMutation(internal.driveCredentials.applyRotation, {
      newKey,
      clientSecretCipher: reencryptedSecret ?? undefined,
      refreshTokenCipher: reencryptedToken ?? undefined,
      dropToken: requiresReconnect,
      userId: user._id as never,
      userName: user.name ?? user.email ?? "State Admin",
    });
    clearDriveConfigCache();
    return { ok: true as const, requiresReconnect };
  },
});

export const readForRotation = internalQuery({
  args: {},
  handler: async (ctx) => {
    const credentials = await ctx.db
      .query("driveCredentials")
      .withIndex("by_key", (q) => q.eq("key", DRIVE_CREDENTIALS_KEY))
      .first();
    const secret = await ctx.db
      .query("appSecrets")
      .withIndex("by_key", (q) => q.eq("key", "drive-token-key"))
      .first();
    const connection = await ctx.db
      .query("driveConnection")
      .withIndex("by_key", (q) => q.eq("key", DRIVE_CREDENTIALS_KEY))
      .first();
    const config = await getDriveConfig(ctx.db, { fresh: true });
    return {
      credentialsId: credentials?._id ?? null,
      hasKey: !!secret,
      clientSecretCipher: credentials?.clientSecretCipher ?? null,
      refreshTokenCipher: connection?.refreshTokenCipher ?? null,
      oldKey: config.tokenKey.value,
    };
  },
});

export const applyRotation = internalMutation({
  args: {
    newKey: v.string(),
    clientSecretCipher: v.optional(v.string()),
    refreshTokenCipher: v.optional(v.string()),
    dropToken: v.boolean(),
    userId: v.optional(v.id("users")),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const secret = await ctx.db
      .query("appSecrets")
      .withIndex("by_key", (q) => q.eq("key", "drive-token-key"))
      .first();
    const now = Date.now();
    if (secret) {
      await ctx.db.patch(secret._id, {
        value: args.newKey,
        rotatedAt: now,
        rotatedBy: args.userId,
      });
    } else {
      await ctx.db.insert("appSecrets", {
        key: "drive-token-key",
        value: args.newKey,
        createdAt: now,
        createdBy: args.userId,
        rotatedAt: now,
        rotatedBy: args.userId,
      });
    }

    const credentials = await ctx.db
      .query("driveCredentials")
      .withIndex("by_key", (q) => q.eq("key", DRIVE_CREDENTIALS_KEY))
      .first();
    if (credentials && args.clientSecretCipher) {
      await ctx.db.patch(credentials._id, {
        clientSecretCipher: args.clientSecretCipher,
        secretUpdatedAt: now,
        secretUpdatedByName: args.userName,
      });
    }

    const connection = await ctx.db
      .query("driveConnection")
      .withIndex("by_key", (q) => q.eq("key", DRIVE_CREDENTIALS_KEY))
      .first();
    if (connection) {
      if (args.refreshTokenCipher) {
        await ctx.db.patch(connection._id, { refreshTokenCipher: args.refreshTokenCipher, lastError: undefined, lastErrorAt: undefined });
      } else if (args.dropToken) {
        await ctx.db.patch(connection._id, {
          refreshTokenCipher: undefined,
          revokedAt: now,
          lastError: "Reconnect Google Drive after the encryption key change.",
          lastErrorAt: now,
        });
      }
    }

    await ctx.db.insert("auditLogs", {
      table: "appSecrets",
      recordId: "drive-token-key",
      action: "update",
      field: "encryption key",
      oldValue: "(previous key)",
      newValue: args.dropToken ? "(rotated — reconnect required)" : "(rotated)",
      changedBy: args.userId,
      changedByName: args.userName,
      changedAt: now,
    });
    await ctx.db.insert("driveNotices", {
      kind: "key_rotated",
      message: `${args.userName ?? "A State Admin"} rotated the Google Drive encryption key.`,
      actorId: args.userId,
      actorName: args.userName,
      createdAt: now,
      dismissedBy: [],
    });
    clearDriveConfigCache();
  },
});

export const clearDriveCredentials = action({
  args: { password: v.string() },
  handler: async (ctx, { password }): Promise<{ ok: true }> => {
    const user = await adminForAction(ctx);
    await verifyPasswordOrThrow(ctx, user, password);

    const connection = await ctx.runQuery(internal.drive.readConnection, {});
    if (connection && !connection.revokedAt && connection.refreshTokenCipher) {
      throw new ConvexError("Disconnect Google Drive first — stored documents must stay readable until then.");
    }

    await ctx.runMutation(internal.driveCredentials.deleteCredentials, {
      userId: user._id as never,
      userName: user.name ?? user.email ?? "State Admin",
      deleteKey: true,
    });
    clearDriveConfigCache();
    return { ok: true as const };
  },
});


