import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/** Hourly system refresh — keeps every date-driven status current.
 *
 *  "NA Scheduled", "Certified — Surveillance Due", "Recertification Due",
 *  "Certification Expired" etc. depend on calendar dates (today vs the NQAS
 *  Assessment Start date, validity date, surveillance due dates). Without a
 *  periodic recompute those statuses only updated when someone edited the
 *  facility. This cron runs the lifecycle engine for all facilities once an
 *  hour; each facility is patched only when its computed status actually
 *  changed, so normal runs do almost no writes. All automatic changes are
 *  audit-logged as "System" by refreshFacilityStatus. */
crons.hourly(
  "auto-refresh facility statuses",
  { minuteUTC: 5 },
  internal.maintenance.autoRefreshAllStatuses,
);

/* Drive maintenance. The reconciliation only READS Drive and flags rows;
   the trash purge is the one job allowed to delete bytes, and only after the
   admin retention period. */
crons.daily(
  "google drive reconciliation",
  { hourUTC: 1, minuteUTC: 20 },
  internal.driveJobs.reconcile,
  {},
);

crons.daily(
  "google drive trash purge",
  { hourUTC: 1, minuteUTC: 50 },
  internal.driveJobs.purgeTrash,
  {},
);

/* The paused-upload tray keeps files for 24 hours; expired server-side state
   is removed hourly so a forgotten queue never lingers. */
crons.hourly(
  "prune expired paused-upload tray",
  { minuteUTC: 25 },
  internal.documents.pruneTray,
  {},
);

/* Finished document ZIPs are temporary: delete the Drive part(s) and their
   rows 24 hours after the job last changed. */
crons.hourly(
  "prune document ZIPs after 24 hours",
  { minuteUTC: 40 },
  internal.documentLibrary.pruneExportZips,
  {},
);

/* Single-use document read tokens live five minutes; their rows are removed
   shortly after expiry so a preview link can never be replayed later. */
crons.hourly(
  "prune used document read tokens",
  { minuteUTC: 35 },
  internal.documents.pruneContentTokens,
  {},
);

/* Sign-in housekeeping. A session row is only deleted by the auth library
   when the browser can still prove it, so expired rows accumulate (one per
   sign-in after a lapse). This job, plus the prune that runs on every
   sign-in, keeps the session list on My Profile honest. */
crons.daily(
  "prune expired sessions",
  { hourUTC: 2, minuteUTC: 10 },
  internal.maintenance.pruneSessions,
  {},
);

/* Part 4 — a shared QR snapshot and its stored file are removed 30 days
   after the link expires (Admin → Shared reports sets the validity; 0 = the
   link never expires and is never pruned). */
crons.daily(
  "prune expired shared reports",
  { hourUTC: 3, minuteUTC: 15 },
  internal.share.cleanupExpired,
  {},
);

/* Links Organiser — OPTIONAL weekly link check. The action reads Admin →
   Links and simply returns when the checker is off or not due, so this cron
   makes no network request unless an Admin turned it on. */
crons.daily(
  "optional weekly links check",
  { hourUTC: 2, minuteUTC: 45 },
  internal.linkCheck.runScheduled,
  {},
);

export default crons;
