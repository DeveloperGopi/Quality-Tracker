/**
 * MY PROFILE — a user's own account (Part 5, redesigned).
 *
 * Security model:
 *   • every handler derives the user from the auth session — a caller can only
 *     read/update THEIR OWN profile; a State Admin editing someone else's role
 *     or block scope goes through Admin → Users, not here;
 *   • sensitive changes (phone, photo) are logged WITHOUT their values, and no
 *     handler ever returns a Drive id, link, token or secret to the browser;
 *   • the profile row is the existing `users` document — phone, preferences,
 *     notification toggles and the new avatar fields are additive optional
 *     fields: no column is renamed or dropped.
 *
 * Why this file changed shape (root causes from the redesign):
 *   • `myProfile` used to collect() the WHOLE auditLogs, authSessions and
 *     authAccounts tables on every keystroke of the page. It is now three
 *     lean reads: `myProfile` (identity + preferences), `mySessions` and
 *     `myActivity` — the last two only run when their tab opens, through
 *     the new `auditLogs.by_user_time` and `authSessions.userId` indexes;
 *   • "This device" used to be `sessions sorted by creation, index 0` — the
 *     NEWEST session, not the caller's. It is now matched with
 *     `getAuthSessionId(ctx)`, the session id inside the caller's own token;
 *   • `lastActive` used to be `_creationTime` (signed-in time), so every row
 *     read "signed in … last active …" with the same stamp. It now comes from
 *     the `sessionMeta` row that `touchSession` keeps fresh.
 *
 * Auth in this app is email + password (convex/auth.ts). There is no Google or
 * SSO provider, so email is read-only here (changing it needs a verification
 * mail the app does not send).
 */

import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";
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
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireActivatedUser, canEditAll } from "./facilities";
import { driveDeps, rootFolderFor } from "./drive";
import { DRIVE_SECRET_KEY } from "../lib/driveCredentials";
import { signReadToken } from "./storage/crypto";
import { isFacilityStyle } from "../lib/facilityStyle";
import {
  normalizePhone,
  SESSION_LIFETIME_DAYS_DEFAULT,
  type ActivityCategory,
} from "../lib/profileConfig";

export const DEFAULT_NOTIFICATIONS = {
  needsAttentionInApp: true,
  needsAttentionEmail: false,
  iaDueInApp: true,
  iaDueEmail: true,
  linksDueInApp: true,
  linksDueEmail: false,
  importResultsInApp: true,
  importResultsEmail: false,
  digest: "daily" as "off" | "daily" | "weekly",
};

export const DEFAULT_PREFERENCES = {
  language: "en" as "en" | "ta",
  landingPage: "/dashboard",
  density: "comfortable" as "compact" | "comfortable",
  sidebar: "expanded" as "expanded" | "rail",
  highlightUpdates: true,
  rowsPerPage: 50,
  firstVisitTips: true,
};

/** Admin-configurable session lifetime (App → Users → Sessions). */
export const SESSION_LIFETIME_KEY = "sessionLifetimeDays";

const DAY_MS = 24 * 60 * 60 * 1000;
const AVATAR_HOUR_MS = 60 * 60 * 1000;

async function meOf(ctx: QueryCtx | MutationCtx) {
  const id = await getAuthUserId(ctx);
  if (id === null) throw new Error("Not signed in");
  const user = await ctx.db.get(id);
  if (!user) throw new Error("User record not found");
  return user;
}

/** The configured lifetime in days (appSettings wins, 30 by default). */
export async function sessionLifetimeDays(ctx: QueryCtx | MutationCtx): Promise<number> {
  const row = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", SESSION_LIFETIME_KEY))
    .first();
  const n = Number(row?.value);
  return Number.isFinite(n) && n >= 1 && n <= 365 ? Math.floor(n) : SESSION_LIFETIME_DAYS_DEFAULT;
}

/** When this session stops being valid: the library expiry, or the admin's
 *  configured lifetime, whichever comes first. */
function effectiveExpiry(session: Doc<"authSessions">, lifetimeDays: number): number {
  const createdAt = session._creationTime ?? Date.now();
  return Math.min(session.expirationTime, createdAt + lifetimeDays * DAY_MS);
}

/** The signing key for short-lived read links, resolved the same way
 *  `convex/http.ts` resolves it (DOC_TOKEN_KEY → env → the admin's key). */
async function readTokenKey(ctx: QueryCtx | MutationCtx): Promise<string | undefined> {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const docKey = proc?.env?.DOC_TOKEN_KEY?.trim();
  if (docKey) return docKey;
  const envKey = proc?.env?.DRIVE_TOKEN_KEY?.trim();
  if (envKey) return envKey;
  const row = await ctx.db
    .query("appSecrets")
    .withIndex("by_key", (q) => q.eq("key", DRIVE_SECRET_KEY))
    .first();
  return row?.value || undefined;
}

/* ------------------------------------------------------------------ */
/* Read model                                                          */
/* ------------------------------------------------------------------ */

/** One preference the shell needs without loading the whole profile. */
export const myFacilityStyle = query({
  args: {},
  handler: async (ctx) => {
    const me = await meOf(ctx);
    const prefs = (me.preferences ?? {}) as Record<string, unknown>;
    return isFacilityStyle(prefs.facilityStyle) ? prefs.facilityStyle : null;
  },
});

/** Everything the page needs before a tab is opened — one lean query. */
export const myProfile = query({
  args: {},
  handler: async (ctx) => {
    const me = await meOf(ctx);
    const blocks = await ctx.db.query("blocks").collect();
    const mine = new Set((me.blockIds ?? []).map(String));

    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", me._id).eq("provider", "password"))
      .first();
    const hasPassword = !!(account?.providerAccountId ?? "");

    // Session COUNTS only (the rows themselves load with the Security tab).
    const currentId = await getAuthSessionId(ctx);
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", me._id))
      .collect();
    const lifetimeDays = await sessionLifetimeDays(ctx);
    const now = Date.now();
    const alive = sessions.filter((s) => effectiveExpiry(s, lifetimeDays) > now);
    const current = currentId ? sessions.find((s) => String(s._id) === String(currentId)) : undefined;
    let signedInAt = current?._creationTime ?? null;
    if (currentId) {
      const meta = await ctx.db
        .query("sessionMeta")
        .withIndex("by_session", (q) => q.eq("sessionId", currentId))
        .first();
      signedInAt = meta?.createdAt ?? signedInAt;
    }

    // Avatar: a signed, self-only URL for the FileStore copy. The Drive file id
    // stays on the server; the legacy `image` data URL is still served when set.
    let avatarUrl: string | null = null;
    if (me.avatarFileId) {
      try {
        const expiresAt = (Math.floor(now / AVATAR_HOUR_MS) + 2) * AVATAR_HOUR_MS;
        const token = await signReadToken(
          { d: String(me._id), u: String(me._id), e: expiresAt, m: "avatar" },
          await readTokenKey(ctx),
        );
        avatarUrl = `/api/profile/avatar?u=${encodeURIComponent(String(me._id))}&t=${encodeURIComponent(token)}`;
      } catch {
        // No signing key configured (yet): show the initials fallback instead
        // of failing the whole profile query.
        avatarUrl = null;
      }
    }

    return {
      user: {
        id: String(me._id),
        name: me.name ?? "",
        email: me.email ?? "",
        designation: me.designation ?? "",
        phone: me.phone ?? "",
        /** Legacy photo (data URL). The FileStore copy is `avatar.url`. */
        image: me.image ?? null,
        appRole: me.appRole ?? null,
        blockIds: [...mine],
        emailVerified: !!me.emailVerificationTime,
      },
      avatar: {
        url: avatarUrl,
        updatedAt: me.avatarUpdatedAt ?? null,
        hasStoredFile: !!me.avatarFileId,
      },
      blocks: blocks.map((b) => ({ id: String(b._id), name: b.name })),
      blockNames: blocks.filter((b) => mine.has(String(b._id))).map((b) => b.name),
      preferences: { ...DEFAULT_PREFERENCES, ...((me.preferences ?? {}) as object) },
      notifications: { ...DEFAULT_NOTIFICATIONS, ...((me.notifications ?? {}) as object) },
      sessionSummary: {
        total: alive.length,
        others: Math.max(0, alive.length - 1),
        signedInAt,
        lifetimeDays,
      },
      auth: { password: hasPassword, managed: false as const },
    };
  },
});

/** Device rows — loaded ONLY when the Security tab opens. */
export const mySessions = query({
  args: {},
  handler: async (ctx) => {
    const me = await meOf(ctx);
    const currentId = (await getAuthSessionId(ctx)) ?? null;
    const [sessions, metas, lifetimeDays] = await Promise.all([
      ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", me._id)).collect(),
      ctx.db.query("sessionMeta").withIndex("by_user", (q) => q.eq("userId", me._id)).collect(),
      sessionLifetimeDays(ctx),
    ]);
    const now = Date.now();
    const metaBySession = new Map(metas.map((m) => [String(m.sessionId), m]));

    const rows = sessions
      .map((s) => {
        const meta = metaBySession.get(String(s._id));
        const createdAt = s._creationTime ?? null;
        const expiresAt = effectiveExpiry(s, lifetimeDays);
        return {
          id: String(s._id),
          current: String(s._id) === String(currentId),
          createdAt,
          lastActive: meta?.lastActive ?? createdAt,
          expiresAt,
          userAgent: meta?.userAgent ?? null,
          region: meta?.region ?? null,
          expired: expiresAt <= now,
        };
      })
      .filter((r) => !r.expired)
      .sort((a, b) => {
        if (a.current !== b.current) return a.current ? -1 : 1;
        return (b.lastActive ?? 0) - (a.lastActive ?? 0);
      });

    return { sessions: rows, lifetimeDays };
  },
});

/** Keep "last active" honest: called from the app shell on load and then at
 *  most every 10 minutes. Never stores an IP address. */
export const touchSession = mutation({
  args: { userAgent: v.string() },
  handler: async (ctx, args) => {
    const sessionId = await getAuthSessionId(ctx);
    if (sessionId === null) return { ok: false as const };
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { ok: false as const };
    const now = Date.now();
    const userAgent = args.userAgent.slice(0, 400);
    const existing = await ctx.db
      .query("sessionMeta")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { lastActive: now, userAgent });
    } else {
      const session = await ctx.db.get(sessionId);
      await ctx.db.insert("sessionMeta", {
        sessionId,
        userId,
        userAgent,
        createdAt: session?._creationTime ?? now,
        lastActive: now,
      });
    }

    // Housekeeping on every app load: the auth library only deletes a session
    // the browser can still PROVE, so a sign-in after the token expired leaves
    // the old row behind (that is how one account reached 18 sessions). Clear
    // THIS user's expired rows here; the daily cron covers every other user.
    // The caller's own session is never touched.
    try {
      const lifetimeDays = await sessionLifetimeDays(ctx);
      const sessions = await ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .collect();
      for (const session of sessions) {
        if (String(session._id) === String(sessionId)) continue;
        const createdAt = session._creationTime ?? now;
        const stale =
          session.expirationTime < now ||
          createdAt + lifetimeDays * DAY_MS < now;
        if (!stale) continue;
        await deleteSessionRows(ctx, session);
      }
    } catch {
      /* housekeeping must never break the page */
    }

    return { ok: true as const };
  },
});

/** Category buckets — the client maps them to the filter chips. */
function activityCategory(row: {
  table: string;
  source?: string | null;
}): ActivityCategory {
  if (row.table === "facilityDocuments") return "documents";
  const source = (row.source ?? "").toLowerCase();
  if (source.includes("import") || row.table === "importLogs") return "imports";
  if (
    row.table === "users" ||
    row.table === "blocks" ||
    row.table === "phcs" ||
    row.table === "appSettings" ||
    row.table === "driveCredentials" ||
    row.table === "driveConnection" ||
    row.table === "appSecrets" ||
    row.table === "documentRules" ||
    row.table === "lookupLists"
  ) {
    return "account";
  }
  return "facility";
}

/** The last 20 actions of THIS user — loaded only when the Activity tab opens,
 *  through the `auditLogs.by_user_time` index (never a whole-table collect). */
export const myActivity = query({
  args: {
    filter: v.union(
      v.literal("all"),
      v.literal("facility"),
      v.literal("documents"),
      v.literal("imports"),
      v.literal("account"),
    ),
  },
  handler: async (ctx, args) => {
    const me = await meOf(ctx);
    const recent = await ctx.db
      .query("auditLogs")
      .withIndex("by_user_time", (q) => q.eq("changedBy", me._id))
      .order("desc")
      .take(120);

    const picked = recent
      .map((row) => ({
        raw: row,
        category: activityCategory(row),
      }))
      .filter((r) => args.filter === "all" || r.category === args.filter)
      .slice(0, 20);

    // Facility names in one batch (≤ 20 gets), never N+1.
    const facilityIds = [
      ...new Set(picked.map((p) => p.raw.facilityId).filter(Boolean).map(String)),
    ];
    const facilities = await Promise.all(
      facilityIds.map(async (id) => [id, await ctx.db.get(id as Id<"facilities">)] as const),
    );
    const nameById = new Map(facilities.map(([id, doc]) => [id, doc?.name ?? null]));

    return picked.map(({ raw, category }) => ({
      id: String(raw._id),
      at: raw.changedAt,
      action: raw.action,
      field: raw.field ?? "",
      table: raw.table,
      source: raw.source ?? null,
      // Only this literal is forwarded — file names, settings values and any
      // other stored value never leave the server in this feed.
      newValue: raw.newValue === "version restored" ? "version restored" : null,
      category,
      facilityId: raw.facilityId ? String(raw.facilityId) : null,
      facilityName: raw.facilityId ? nameById.get(String(raw.facilityId)) ?? null : null,
    }));
  },
});

/* ------------------------------------------------------------------ */
/* Update                                                              */
/* ------------------------------------------------------------------ */

/** Update MY profile only (viewers included). Role/scope cannot be changed
 *  here — they are set by a State Admin in Admin → Users. */
export const updateMyProfile = mutation({
  args: {
    name: v.optional(v.string()),
    designation: v.optional(v.string()),
    phone: v.optional(v.string()),
    preferences: v.optional(v.any()),
    notifications: v.optional(v.any()),
    /** Legacy 256px avatar data URL (or null to remove). The cropper now
     *  uploads through FileStore instead; the arg is kept so the API is
     *  unchanged for older clients. */
    image: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const me = await meOf(ctx);
    const patch: Record<string, unknown> = {};
    const audit: { field: string; oldValue: unknown; newValue: unknown }[] = [];

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length < 2 || name.length > 60) {
        throw new ConvexError("Please enter your full name (2–60 characters)");
      }
      if (name !== (me.name ?? "")) {
        patch.name = name;
        audit.push({ field: "Name", oldValue: me.name ?? "", newValue: name });
      }
    }
    if (args.designation !== undefined) {
      const designation = args.designation.trim().slice(0, 80);
      if (designation !== (me.designation ?? "")) {
        patch.designation = designation;
        audit.push({ field: "Designation", oldValue: me.designation ?? "", newValue: designation });
      }
    }
    if (args.phone !== undefined) {
      const { value: phone, error } = normalizePhone(args.phone);
      if (error) throw new ConvexError(error);
      if (phone !== (me.phone ?? "")) {
        patch.phone = phone;
        // A phone number is personal data — log the CHANGE, never the number.
        audit.push({ field: "Phone", oldValue: me.phone ? "set" : "", newValue: phone ? "set" : "" });
      }
    }
    if (args.image !== undefined) {
      const image = args.image;
      if (image != null && !/^data:image\/(png|jpeg|webp);base64,/.test(image)) {
        throw new ConvexError("The photo must be a PNG, JPEG or WebP image");
      }
      if (image != null && image.length > 1_400_000) {
        throw new ConvexError("The photo is too large — choose one under 1 MB");
      }
      if (image !== (me.image ?? null)) {
        patch.image = image ?? undefined;
        audit.push({ field: "Photo", oldValue: me.image ? "set" : "", newValue: image ? "set" : "" });
      }
    }
    if (args.preferences !== undefined) {
      const merged = { ...DEFAULT_PREFERENCES, ...((me.preferences ?? {}) as object), ...(args.preferences as object) };
      const changed = JSON.stringify(merged) !== JSON.stringify(me.preferences ?? {});
      if (changed) {
        patch.preferences = merged;
        audit.push({ field: "Preferences", oldValue: "—", newValue: "updated" });
      }
    }
    if (args.notifications !== undefined) {
      const merged = {
        ...DEFAULT_NOTIFICATIONS,
        ...((me.notifications ?? {}) as object),
        ...(args.notifications as object),
      };
      const changed = JSON.stringify(merged) !== JSON.stringify(me.notifications ?? {});
      if (changed) {
        patch.notifications = merged;
        audit.push({ field: "Notifications", oldValue: "—", newValue: "updated" });
      }
    }

    if (Object.keys(patch).length === 0) return { changed: 0 };
    await ctx.db.patch(me._id, patch);
    const now = Date.now();
    for (const entry of audit) {
      await ctx.db.insert("auditLogs", {
        table: "users",
        recordId: String(me._id),
        action: "update",
        field: `My profile · ${entry.field}`,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        changedBy: me._id as Id<"users">,
        changedByName: me.name ?? me.email ?? "User",
        changedAt: now,
        source: "My profile",
      });
    }
    return { changed: audit.length };
  },
});

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

async function deleteSessionRows(
  ctx: MutationCtx,
  session: Doc<"authSessions">,
): Promise<void> {
  const tokens = await ctx.db
    .query("authRefreshTokens")
    .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
    .collect();
  for (const token of tokens) await ctx.db.delete(token._id);
  const meta = await ctx.db
    .query("sessionMeta")
    .withIndex("by_session", (q) => q.eq("sessionId", session._id))
    .first();
  if (meta) await ctx.db.delete(meta._id);
  await ctx.db.delete(session._id);
}

/** "Sign out all other devices" — keeps THIS session (matched by the caller's
 *  own token, not "the newest one") and ends every other session. */
export const signOutOtherSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await meOf(ctx);
    const currentId = (await getAuthSessionId(ctx)) ?? null;
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", me._id))
      .collect();
    let removed = 0;
    for (const s of sessions) {
      if (currentId && String(s._id) === String(currentId)) continue;
      await deleteSessionRows(ctx, s);
      removed += 1;
    }
    await ctx.db.insert("auditLogs", {
      table: "users",
      recordId: String(me._id),
      action: "update",
      field: "My profile · other sessions signed out",
      oldValue: removed,
      newValue: 0,
      changedBy: me._id as Id<"users">,
      changedByName: me.name ?? me.email ?? "User",
      changedAt: Date.now(),
      source: "My profile",
    });
    return { removed };
  },
});

/** Sign out ONE other device from the session list. */
export const signOutSession = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const me = await meOf(ctx);
    const currentId = (await getAuthSessionId(ctx)) ?? null;
    if (currentId && String(currentId) === args.sessionId) {
      throw new ConvexError("Use Sign out to end this device");
    }
    const session = await ctx.db.get(args.sessionId as Id<"authSessions">);
    if (!session || String(session.userId) !== String(me._id)) {
      throw new ConvexError("That session no longer exists");
    }
    await deleteSessionRows(ctx, session);
    await ctx.db.insert("auditLogs", {
      table: "users",
      recordId: String(me._id),
      action: "update",
      field: "My profile · a session signed out",
      oldValue: "active",
      newValue: "ended",
      changedBy: me._id as Id<"users">,
      changedByName: me.name ?? me.email ?? "User",
      changedAt: Date.now(),
      source: "My profile",
    });
    return { removed: 1 };
  },
});

export type SessionCleanupRow = {
  id: string;
  email: string;
  name: string;
  userAgent: string | null;
  createdAt: number | null;
  lastActive: number | null;
  reason: "expired" | "idle" | "duplicate" | "stale";
  keep: boolean;
};

/**
 * One-time migration report: every session that should be pruned, listed
 * BEFORE anything is deleted:
 *   • expired — past the library expiry or the configured lifetime,
 *   • idle    — a device that has not been seen for the whole lifetime,
 *   • duplicate — a second row for the same user on the same device (the
 *     newest is kept),
 *   • stale   — an old sign-in with no device data at all (it predates the
 *     session metadata; any device still in use writes its metadata the next
 *     time it loads the app, so an untouched row is a leftover).
 * The newest session of every user and the caller's own session are never
 * candidates. Nothing is deleted until the admin confirms this list.
 */
export const previewSessionCleanup = query({
  args: {},
  handler: async (ctx): Promise<{ rows: SessionCleanupRow[]; lifetimeDays: number; currentId: string | null }> => {
    const admin = await requireActivatedUser(ctx);
    if (!canEditAll(admin)) throw new ConvexError("Only the State Admin can clean up sessions.");

    const [sessions, metas, users, lifetimeDays] = await Promise.all([
      ctx.db.query("authSessions").collect(),
      ctx.db.query("sessionMeta").collect(),
      ctx.db.query("users").collect(),
      sessionLifetimeDays(ctx),
    ]);
    const now = Date.now();
    const currentId = (await getAuthSessionId(ctx)) ?? null;
    const userById = new Map(users.map((u) => [String(u._id), u]));
    const metaBySession = new Map(metas.map((m) => [String(m.sessionId), m]));
    const score = (s: Doc<"authSessions">) =>
      metaBySession.get(String(s._id))?.lastActive ?? s._creationTime ?? 0;

    // The newest session of each user survives unconditionally (it may be the
    // browser the admin is using right now).
    const newestByUser = new Map<string, Doc<"authSessions">>();
    // …and so does the newest per user+device.
    const newestByDevice = new Map<string, Doc<"authSessions">>();
    for (const s of sessions) {
      if (currentId && String(s._id) === String(currentId)) continue;
      const key = String(s.userId);
      const prevUser = newestByUser.get(key);
      if (!prevUser || score(s) > score(prevUser)) newestByUser.set(key, s);
      const ua = metaBySession.get(String(s._id))?.userAgent ?? "";
      if (!ua) continue;
      const dkey = `${key}|${ua}`;
      const prevDevice = newestByDevice.get(dkey);
      if (!prevDevice || score(s) > score(prevDevice)) newestByDevice.set(dkey, s);
    }
    const keepUserIds = new Set([...newestByUser.values()].map((s) => String(s._id)));
    const keepDeviceIds = new Set([...newestByDevice.values()].map((s) => String(s._id)));

    const rows: SessionCleanupRow[] = [];
    for (const s of sessions) {
      if (currentId && String(s._id) === String(currentId)) continue;
      if (keepUserIds.has(String(s._id))) continue;
      const meta = metaBySession.get(String(s._id));
      const createdAt = s._creationTime ?? null;
      const lastActive = meta?.lastActive ?? createdAt;
      const expired = effectiveExpiry(s, lifetimeDays) <= now;
      const idle = !expired && lastActive !== null && lastActive + lifetimeDays * DAY_MS <= now;
      const duplicate =
        !expired && !idle && !!meta?.userAgent && !keepDeviceIds.has(String(s._id));
      const stale =
        !expired && !idle && !duplicate && !meta && createdAt !== null && createdAt < now - DAY_MS;
      if (!expired && !idle && !duplicate && !stale) continue;
      const user = userById.get(String(s.userId));
      rows.push({
        id: String(s._id),
        email: user?.email ?? "(unknown account)",
        name: user?.name ?? "",
        userAgent: meta?.userAgent ?? null,
        createdAt,
        lastActive,
        reason: expired ? "expired" : idle ? "idle" : duplicate ? "duplicate" : "stale",
        keep: false,
      });
    }
    rows.sort((a, b) => (b.lastActive ?? 0) - (a.lastActive ?? 0));
    return { rows, lifetimeDays, currentId };
  },
});

/** Apply the confirmed report: one transaction, one audit row with the batch
 *  id, and the caller's own session is never touched. */
export const applySessionCleanup = mutation({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireActivatedUser(ctx);
    if (!canEditAll(admin)) throw new ConvexError("Only the State Admin can clean up sessions.");
    if (args.ids.length === 0 || args.ids.length > 500) {
      throw new ConvexError("Nothing to prune (or the batch is too large)");
    }
    const currentId = (await getAuthSessionId(ctx)) ?? null;
    const batchId = `sessions-${Date.now()}`;
    let removed = 0;
    let skipped = 0;
    for (const id of args.ids) {
      if (currentId && String(currentId) === id) {
        skipped += 1;
        continue;
      }
      let session: Doc<"authSessions"> | null = null;
      try {
        session = await ctx.db.get(id as Id<"authSessions">);
      } catch {
        session = null;
      }
      if (!session) {
        skipped += 1;
        continue;
      }
      await deleteSessionRows(ctx, session);
      removed += 1;
    }
    await ctx.db.insert("auditLogs", {
      table: "authSessions",
      recordId: batchId,
      action: "delete",
      field: "Expired or duplicate sessions",
      oldValue: args.ids.length,
      newValue: removed,
      changedBy: admin._id,
      changedByName: admin.name ?? admin.email ?? "State Admin",
      changedAt: Date.now(),
      source: "Session clean-up",
      batchId,
    });
    return { removed, skipped, batchId };
  },
});

/** Admin setting: how long a session may live (default 30 days). */
export const setSessionLifetimeDays = mutation({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const admin = await requireActivatedUser(ctx);
    if (!canEditAll(admin)) throw new ConvexError("Only the State Admin can change this.");
    const days = Math.floor(args.days);
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      throw new ConvexError("Session lifetime must be between 1 and 365 days");
    }
    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", SESSION_LIFETIME_KEY))
      .first();
    const oldValue = Number(existing?.value) || SESSION_LIFETIME_DAYS_DEFAULT;
    if (oldValue === days) return { changed: 0 };
    if (existing) await ctx.db.patch(existing._id, { value: days });
    else await ctx.db.insert("appSettings", { key: SESSION_LIFETIME_KEY, value: days });
    await ctx.db.insert("auditLogs", {
      table: "appSettings",
      recordId: SESSION_LIFETIME_KEY,
      action: "update",
      field: "Session lifetime (days)",
      oldValue,
      newValue: days,
      changedBy: admin._id,
      changedByName: admin.name ?? admin.email ?? "State Admin",
      changedAt: Date.now(),
      source: "Admin",
    });
    return { changed: 1 };
  },
});

/* ------------------------------------------------------------------ */
/* Avatar — FileStore (`_avatars` folder), served by /api/profile/avatar */
/* ------------------------------------------------------------------ */

/** Base64 → bytes without Buffer/atob (neither is guaranteed in the default
 *  Convex runtime). Only the cropper's ≤1.4 MB data URLs go through here. */
function decodeBase64(input: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = input.replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (const ch of clean) {
    const value = chars.indexOf(ch);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[index++] = (buffer >> bits) & 0xff;
    }
  }
  return out.subarray(0, index);
}

const AVATAR_DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$/;

/** Validate a cropped photo: bytes + mime type, or the message to show. */
function parseAvatarDataUrl(
  dataUrl: string,
): { bytes: Uint8Array; mimeType: string } | { error: string } {
  const match = AVATAR_DATA_URL_RE.exec(String(dataUrl ?? "").trim());
  if (!match) return { error: "The photo must be a PNG, JPEG or WebP image" };
  const mimeType = `image/${match[1]}`;
  const bytes = decodeBase64(match[2].replace(/\s+/g, ""));
  if (bytes.length === 0) return { error: "This file could not be read as an image" };
  if (bytes.length > 1_400_000) {
    return { error: "The photo is too large — choose one under 1 MB" };
  }
  return { bytes, mimeType };
}

/** Save the cropped photo through the FileStore into Drive's `_avatars`
 *  folder. The previous copy is trashed, the store id is written to the
 *  `users` row, and NOTHING store-related is returned to the browser. */
export const uploadAvatar = action({
  args: { dataUrl: v.string() },
  handler: async (ctx: ActionCtx, args: { dataUrl: string }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in");

    const parsed = parseAvatarDataUrl(args.dataUrl);
    if ("error" in parsed) throw new ConvexError(parsed.error);

    const previous = await ctx.runQuery(internal.profile.avatarState, {
      userId: String(userId),
    });

    let fileId: string;
    let mimeType: string;
    try {
      const deps = await driveDeps(ctx);
      const root = rootFolderFor(deps);
      const folderId = await deps.folders.avatarsFolder(root);
      mimeType = parsed.mimeType;
      const ext = mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "webp";
      const stored = await deps.store.put(parsed.bytes, {
        parentId: folderId,
        name: `avatar_${String(userId)}.${ext}`,
        mimeType,
        appProperties: { user_id: String(userId), kind: "avatar" },
      });
      fileId = stored.id;
      // Best effort: the old photo goes to the Drive trash, never left behind.
      if (previous.fileId && previous.fileId !== fileId) {
        try {
          await deps.store.delete(previous.fileId);
        } catch {
          /* a leftover photo in _avatars is harmless */
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Document storage is unavailable";
      throw new ConvexError(message);
    }

    await ctx.runMutation(internal.profile.applyAvatarState, {
      userId: String(userId),
      fileId,
      mimeType,
    });
    return { ok: true };
  },
});

/** Remove the photo: trash the stored copy (best effort) and clear the row. */
export const removeAvatar = action({
  args: {},
  handler: async (ctx: ActionCtx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in");
    const previous = await ctx.runQuery(internal.profile.avatarState, {
      userId: String(userId),
    });
    if (previous.fileId) {
      try {
        const deps = await driveDeps(ctx);
        await deps.store.delete(previous.fileId);
      } catch {
        /* already gone, or storage disconnected — the row is cleared anyway */
      }
    }
    await ctx.runMutation(internal.profile.applyAvatarState, {
      userId: String(userId),
      fileId: null,
      mimeType: null,
    });
    return { ok: true };
  },
});

export const avatarState = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as Id<"users">);
    return {
      fileId: user?.avatarFileId ?? null,
      mimeType: user?.avatarMimeType ?? null,
      legacyImage: user?.image ?? null,
      updatedAt: user?.avatarUpdatedAt ?? null,
    };
  },
});

export const applyAvatarState = internalMutation({
  args: {
    userId: v.string(),
    fileId: v.union(v.string(), v.null()),
    mimeType: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as Id<"users">);
    if (!user) return;
    const hadPhoto = !!(user.avatarFileId || user.image);
    const hasPhoto = !!args.fileId;
    await ctx.db.patch(user._id, {
      ...(args.fileId
        ? {
            avatarFileId: args.fileId,
            avatarMimeType: args.mimeType ?? undefined,
            avatarUpdatedAt: Date.now(),
          }
        : { avatarFileId: undefined, avatarMimeType: undefined, avatarUpdatedAt: undefined }),
      // Clearing also drops the legacy data URL so the two never disagree.
      ...(args.fileId ? {} : { image: undefined }),
    });
    if (hadPhoto !== hasPhoto) {
      await ctx.db.insert("auditLogs", {
        table: "users",
        recordId: String(user._id),
        action: "update",
        field: "My profile · Photo",
        oldValue: hadPhoto ? "set" : "",
        newValue: hasPhoto ? "set" : "",
        changedBy: user._id,
        changedByName: user.name ?? user.email ?? "User",
        changedAt: Date.now(),
        source: "My profile",
      });
    }
  },
});

/** Byte source for `GET /api/profile/avatar`. Runs server-side only: the
 *  Drive file id is in the HTTP handler's response stream, never in a query
 *  the browser can read. */
export const avatarForStream = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as Id<"users">);
    if (!user?.avatarFileId) return { ok: false as const, reason: "No photo" };
    return {
      ok: true as const,
      fileId: user.avatarFileId,
      mimeType: user.avatarMimeType ?? "image/webp",
      updatedAt: user.avatarUpdatedAt ?? null,
    };
  },
});
