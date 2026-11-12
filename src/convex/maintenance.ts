import { internalMutation } from "./_generated/server";
import { refreshFacilityStatus } from "./facilities";
import { sessionLifetimeDays } from "./profile";
import type { Doc } from "./_generated/dataModel";

/** Hourly system refresh — see crons.ts. Runs the lifecycle engine for
 *  every facility; statuses are only patched when they actually change, so a
 *  normal pass performs almost no writes. Audit entries are recorded as
 *  "System" for any automatic transition (e.g. an upcoming NQAS Assessment
 *  Start date turning a facility into "NA Scheduled"). */
export const autoRefreshAllStatuses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const facilities = await ctx.db.query("facilities").collect();
    let updated = 0;
    for (const f of facilities) {
      const before = f.currentStatus;
      const after = await refreshFacilityStatus(
        ctx, f._id, "System", undefined, false,
      );
      if (before !== after) updated += 1;
    }
    return { total: facilities.length, updated };
  },
});

/** Daily session clean-up — see crons.ts.
 *
 *  Why this exists: the auth library only deletes a session when the browser
 *  can still prove it (a valid token). A sign-in after the token expired, a
 *  revoked refresh chain or simply time passing leave rows behind, which is
 *  how one account ended up with 18 indistinguishable "sessions". This job
 *  deletes rows that are past the library expiry OR past the admin's
 *  configured lifetime (appSettings `sessionLifetimeDays`, default 30 days,
 *  measured from sign-in and from last activity), together with their refresh
 *  tokens and device metadata. Bounded to 500 rows per run. */
export const pruneSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const lifetimeDays = await sessionLifetimeDays(ctx);
    const now = Date.now();
    const sessions = await ctx.db.query("authSessions").collect();
    let removed = 0;
    for (const s of sessions as Doc<"authSessions">[]) {
      if (removed >= 500) break;
      const createdAt = s._creationTime ?? now;
      const byLifetime = createdAt + lifetimeDays * 24 * 60 * 60 * 1000;
      if (s.expirationTime >= now && byLifetime >= now) continue;
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", s._id))
        .collect();
      for (const token of tokens) await ctx.db.delete(token._id);
      const meta = await ctx.db
        .query("sessionMeta")
        .withIndex("by_session", (q) => q.eq("sessionId", s._id))
        .first();
      if (meta) await ctx.db.delete(meta._id);
      await ctx.db.delete(s._id);
      removed += 1;
    }
    return { scanned: sessions.length, removed };
  },
});
