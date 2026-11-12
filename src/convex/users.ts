import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { APP_ROLES } from "./schema";
import type { Id } from "./_generated/dataModel";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user === null) {
      return null;
    }

    return user;
  },
});

/**
 * Use this function internally to get the current user data. Remember to handle the null user case.
 * @param ctx
 * @returns
 */
export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

/**
 * Does this email have a password credential? Used by the Auth page's
 * "Forgot password" flow BEFORE calling Convex Auth's `reset` flow, which
 * crashes with `TypeError: Cannot read properties of null (reading '_id')`
 * for emails that have no password account (e.g. accounts created under the
 * old email-OTP sign-in). Returns null when the email has no account at all.
 */
export const hasPasswordAccount = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    // Case-insensitive user match — OTP-era accounts may store the email
    // with different casing than the user typed now.
    const users = await ctx.db.query("users").collect();
    const user = users.find(
      (u) => (u.email ?? "").trim().toLowerCase() === normalized,
    );
    if (!user) return null;
    // Case-insensitive credential match — the providerAccountId is stored
    // exactly as typed at sign-up, which may differ in casing.
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) => q.eq("provider", "password"))
      .collect();
    const hasPassword = accounts.some(
      (a) => (a.providerAccountId ?? "").trim().toLowerCase() === normalized,
    );
    return { exists: true, hasPassword };
  },
});

async function requireStateAdmin(ctx: MutationCtx | QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not signed in");
  const me = await ctx.db.get(userId);
  if (!me) throw new Error("User record not found");
  if (!me.appRole) throw new Error("Account is not activated for this app yet");
  if (me.appRole !== "admin")
    throw new Error("Only the State Admin can delete users");
  return me;
}

/** Admin deletes a user account entirely: removes the auth credentials
 *  (accounts + sessions) and the user document. The last State Admin, the
 *  acting admin and the designated control-room account are protected. */
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const actor = await requireStateAdmin(ctx);
    if (String(userId) === String(actor._id))
      throw new Error("You cannot delete your own account while signed in");
    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");
    if (!target.isAnonymous) {
      if (target.appRole === "admin") {
        const otherAdmins = (await ctx.db.query("users").collect()).filter(
          (u) =>
            u.appRole === "admin" &&
            !u.disabled &&
            String(u._id) !== String(userId),
        );
        if (otherAdmins.length === 0)
          throw new Error(
            "Cannot delete the only State Admin — promote another user first",
          );
      }
      if (
        target.email != null &&
        target.email.trim().toLowerCase() === "dphtptquality@gmail.com"
      )
        throw new Error(
          "The designated control-room admin account is protected",
        );
    }
    // Auth tables have no userId index in this deployment — filter in memory
    // (the tables are tiny: a handful of accounts/sessions per user).
    const accounts = await ctx.db.query("authAccounts").collect();
    for (const a of accounts) {
      if (String(a.userId) === String(userId)) await ctx.db.delete(a._id);
    }
    const sessions = await ctx.db.query("authSessions").collect();
    for (const s of sessions) {
      if (String(s.userId) === String(userId)) await ctx.db.delete(s._id);
    }
    await ctx.db.delete(userId);
    await ctx.db.insert("auditLogs", {
      table: "users",
      recordId: String(userId),
      action: "delete",
      oldValue: `${target.name ?? "—"} <${target.email ?? "—"}> (${target.appRole ?? "none"})`,
      newValue: null,
      changedBy: actor._id,
      changedByName: actor.name,
      changedAt: Date.now(),
    });
  },
});

/* ------------------------------------------------------------------ */
/* Admin → Users: invitations, disable, sessions                        */
/* ------------------------------------------------------------------ */

const normalizeEmail = (raw: string) => raw.trim().toLowerCase();

async function validRole(ctx: MutationCtx, role: string) {
  const rows = await ctx.db.query("appRoles").collect();
  const known = rows.length ? new Set(rows.map((r) => r.key)) : new Set<string>(APP_ROLES);
  if (!known.has(role)) throw new Error("Choose a role from the roles table");
}

async function insertAudit(
  ctx: MutationCtx,
  actor: { _id: Id<"users">; name?: string | null },
  recordId: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
) {
  await ctx.db.insert("auditLogs", {
    table: "users",
    recordId,
    action: "update",
    field,
    oldValue: oldValue ?? undefined,
    newValue: newValue ?? undefined,
    changedBy: actor._id,
    changedByName: actor.name ?? "State Admin",
    changedAt: Date.now(),
    source: "Admin → Users",
  });
}

/** Invite by email. The invitation is consumed by facilities.claimAccess the
 *  first time that email activates, so approval happens before sign-up. */
export const inviteUser = mutation({
  args: {
    email: v.string(),
    appRole: v.string(),
    blockIds: v.array(v.id("blocks")),
  },
  handler: async (ctx, args) => {
    const actor = await requireStateAdmin(ctx);
    const email = normalizeEmail(args.email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address");
    await validRole(ctx, args.appRole);
    const existing = (await ctx.db.query("users").collect()).find(
      (u) => normalizeEmail(u.email ?? "") === email,
    );
    if (existing) throw new Error("That email already has an account — change their role instead");
    const invitations = await ctx.db.query("invitations").collect();
    const live = invitations.find(
      (i) => i.email === email && i.acceptedAt == null && i.revokedAt == null,
    );
    if (live) throw new Error("An invitation is already waiting for that email");
    const id = await ctx.db.insert("invitations", {
      email,
      appRole: args.appRole,
      blockIds: args.blockIds,
      invitedBy: actor._id,
      invitedByName: actor.name ?? actor.email ?? "State Admin",
      createdAt: Date.now(),
    });
    await insertAudit(ctx as MutationCtx, actor, String(id), "Invitation", null, `${email} → ${args.appRole}`);
    return { id: String(id), email };
  },
});

export const invitations = query({
  args: {},
  handler: async (ctx) => {
    await requireStateAdmin(ctx);
    const [rows, blocks] = await Promise.all([
      ctx.db.query("invitations").collect(),
      ctx.db.query("blocks").collect(),
    ]);
    const blockName = new Map(blocks.map((b) => [String(b._id), b.name]));
    return rows
      .filter((i) => i.acceptedAt == null && i.revokedAt == null)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((i) => ({
        id: String(i._id),
        email: i.email,
        appRole: i.appRole,
        blockIds: i.blockIds.map(String),
        blockNames: i.blockIds.map((id) => blockName.get(String(id)) ?? "Block"),
        invitedByName: i.invitedByName,
        createdAt: i.createdAt,
      }));
  },
});

export const revokeInvitation = mutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, { invitationId }) => {
    const actor = await requireStateAdmin(ctx);
    const row = await ctx.db.get(invitationId);
    if (!row) return { ok: true };
    await ctx.db.patch(invitationId, { revokedAt: Date.now() });
    await insertAudit(ctx as MutationCtx, actor, String(invitationId), "Invitation revoked", row.email, null);
    return { ok: true };
  },
});

const adminCount = async (ctx: MutationCtx, exceptId: string) =>
  (await ctx.db.query("users").collect()).filter(
    (u) => u.appRole === "admin" && !u.disabled && String(u._id) !== exceptId,
  ).length;

/** Disable / enable. Disabling deletes every session at once, so the person is
 *  signed out immediately and every future query fails in requireActivatedUser. */
export const setUserDisabled = mutation({
  args: { userId: v.id("users"), disabled: v.boolean() },
  handler: async (ctx, { userId, disabled }) => {
    const actor = await requireStateAdmin(ctx);
    if (String(userId) === String(actor._id)) throw new Error("You cannot disable your own account");
    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");
    if (disabled && target.appRole === "admin" && (await adminCount(ctx, String(userId))) === 0) {
      throw new Error("Cannot disable the only State Admin — promote another user first");
    }
    await ctx.db.patch(userId, { disabled });
    if (disabled) {
      const sessions = await ctx.db.query("authSessions").collect();
      for (const s of sessions) {
        if (String(s.userId) === String(userId)) {
          const meta = await ctx.db
            .query("sessionMeta")
            .withIndex("by_session", (q) => q.eq("sessionId", s._id))
            .first();
          if (meta) await ctx.db.delete(meta._id);
          await ctx.db.delete(s._id);
        }
      }
    }
    await insertAudit(ctx as MutationCtx, actor, String(userId), disabled ? "Disabled" : "Enabled", target.email ?? null, null);
    return { ok: true };
  },
});

/** Sign a single session out. The caller's own current session is protected. */
export const adminSignOutSession = mutation({
  args: { sessionId: v.id("authSessions") },
  handler: async (ctx, { sessionId }) => {
    const actor = await requireStateAdmin(ctx);
    const currentSession = await getAuthSessionId(ctx);
    const session = await ctx.db.get(sessionId);
    if (!session) return { ok: true };
    if (currentSession != null && String(session._id) === String(currentSession)) {
      throw new Error("Use My Profile to sign out the session you are using now");
    }
    const meta = await ctx.db
      .query("sessionMeta")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    if (meta) await ctx.db.delete(meta._id);
    await ctx.db.delete(sessionId);
    await insertAudit(ctx, actor, String(session.userId), "Session signed out", null, null);
    return { ok: true };
  },
});

export const signOutUserEverywhere = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const actor = await requireStateAdmin(ctx);
    if (String(userId) === String(actor._id)) throw new Error("Use My Profile to sign out your own devices");
    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");
    const sessions = await ctx.db.query("authSessions").collect();
    let removed = 0;
    for (const s of sessions) {
      if (String(s.userId) !== String(userId)) continue;
      const meta = await ctx.db
        .query("sessionMeta")
        .withIndex("by_session", (q) => q.eq("sessionId", s._id))
        .first();
      if (meta) await ctx.db.delete(meta._id);
      await ctx.db.delete(s._id);
      removed += 1;
    }
    await insertAudit(ctx, actor, String(userId), "All sessions signed out", null, String(removed));
    return { removed };
  },
});

/** Every session, grouped for the Admin → Sessions tab. */
export const adminSessions = query({
  args: {},
  handler: async (ctx) => {
    await requireStateAdmin(ctx);
    const [sessions, metas, users] = await Promise.all([
      ctx.db.query("authSessions").collect(),
      ctx.db.query("sessionMeta").collect(),
      ctx.db.query("users").collect(),
    ]);
    const currentId = await getAuthSessionId(ctx);
    const metaBySession = new Map(metas.map((m) => [String(m.sessionId), m]));
    const userById = new Map(users.map((u) => [String(u._id), u]));
    return sessions
      .map((s) => {
        const meta = metaBySession.get(String(s._id));
        const user = userById.get(String(s.userId));
        return {
          id: String(s._id),
          userId: String(s.userId),
          name: user?.name ?? null,
          email: user?.email ?? null,
          appRole: user?.appRole ?? null,
          createdAt: s._creationTime,
          expiresAt: s.expirationTime,
          lastActive: meta?.lastActive ?? null,
          userAgent: meta?.userAgent ?? null,
          current: currentId != null && String(currentId) === String(s._id),
        };
      })
      .sort((a, b) => (a.email ?? "").localeCompare(b.email ?? "") || b.createdAt - a.createdAt);
  },
});

/** The last 10 audit rows for one user (Admin → user drawer). */
export const userAudit = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireStateAdmin(ctx);
    const rows = await ctx.db.query("auditLogs").collect();
    return rows
      .filter((r) => String(r.recordId) === userId)
      .sort((a, b) => b.changedAt - a.changedAt)
      .slice(0, 10)
      .map((r) => ({
        id: String(r._id),
        action: r.action,
        field: r.field ?? null,
        newValue: r.newValue == null ? null : String(r.newValue),
        changedByName: r.changedByName ?? null,
        changedAt: r.changedAt,
      }));
  },
});
