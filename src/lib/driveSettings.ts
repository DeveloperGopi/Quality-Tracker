/**
 * GOOGLE DRIVE SETTINGS — one definition, shared by the server and the
 * Settings page. Values live in the existing `appSettings` table under
 * `driveSettings`; nothing here is a secret.
 *
 * ONE source of truth for "may an upload start right now": `getUploadState`
 * reads the SAME settings row the server gate reads. They used to disagree —
 * `beginUpload` checked `settings.paused` while the Storage chip read only
 * `storageConnected`, so a paused deployment still said "Storage OK".
 */

import { DOC_TYPES, type DocKey } from "../convex/storage/validation";

export type DriveSettings = {
  /** Root folder id (the department's "NQAS Tracker" folder / Shared Drive). */
  rootFolderId: string;
  maxMb: number;
  perTypeMb: Partial<Record<DocKey, number>>;
  retainedDays: number;
  keepVersions: boolean;
  nightlyReconciliation: boolean;
  lowSpacePercent: number;
  paused: boolean;
  /** Why uploads were paused (optional, free text from the admin). */
  pauseReason: string;
  /** When the pause started (ms). Null when never paused or since resumed. */
  pausedAt: number | null;
  /** Who paused it — the State Admin's display name. */
  pausedBy: string;
  /** Optional auto-resume time (ms). Already past ⇒ uploads run again even
   *  without anyone pressing Resume. */
  resumeAt: number | null;
  /** TRUE only for an AUTOMATIC (circuit-breaker) pause. A passing document
   *  self-test clears it — a machine-set pause never outlives its cause. */
  autoPaused: boolean;
  /** The automatic pause's cause, shown instead of "by the administrator". */
  autoPauseCause: string;
};

export const DRIVE_SETTINGS_KEY = "driveSettings";

export const DEFAULT_DRIVE_SETTINGS: DriveSettings = {
  rootFolderId: "",
  maxMb: 10,
  perTypeMb: {},
  retainedDays: 30,
  keepVersions: true,
  nightlyReconciliation: true,
  lowSpacePercent: 90,
  paused: false,
  pauseReason: "",
  pausedAt: null,
  pausedBy: "",
  resumeAt: null,
  autoPaused: false,
  autoPauseCause: "",
};

/** Merge a stored partial over the defaults (never trust a missing key). */
export function resolveDriveSettings(raw: unknown): DriveSettings {
  const value = (raw ?? {}) as Partial<DriveSettings> & Record<string, unknown>;
  const clamp = (n: unknown, lo: number, hi: number, fallback: number) => {
    const v = Number(n);
    return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback;
  };
  /** A timestamp is either a real positive number or nothing. The string
   *  "false"/"null" from an old export is NOTHING, never a date. */
  const stamp = (n: unknown): number | null => {
    const v = Number(n);
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const text = (s: unknown): string => (typeof s === "string" ? s.trim() : "");
  const perType: Partial<Record<DocKey, number>> = {};
  for (const type of DOC_TYPES) {
    const v = Number(value.perTypeMb?.[type.key]);
    if (Number.isFinite(v) && v > 0) perType[type.key] = clamp(v, 1, 25, type.maxMb);
  }
  return {
    rootFolderId: String(value.rootFolderId ?? "").trim(),
    maxMb: clamp(value.maxMb, 1, 25, DEFAULT_DRIVE_SETTINGS.maxMb),
    perTypeMb: perType,
    retainedDays: clamp(value.retainedDays, 1, 365, DEFAULT_DRIVE_SETTINGS.retainedDays),
    keepVersions: value.keepVersions !== false,
    nightlyReconciliation: value.nightlyReconciliation !== false,
    lowSpacePercent: clamp(value.lowSpacePercent, 50, 99, DEFAULT_DRIVE_SETTINGS.lowSpacePercent),
    // STRICT: only the boolean `true` pauses. The string "false" (or any
    // other coercion surprise from an old row or a JSON export) never does.
    paused: value.paused === true,
    pauseReason: text(value.pauseReason),
    pausedAt: stamp(value.pausedAt),
    pausedBy: text(value.pausedBy),
    resumeAt: stamp(value.resumeAt),
    autoPaused: value.autoPaused === true,
    autoPauseCause: text(value.autoPauseCause),
  };
}

/** The upload block message used everywhere a user can hit it. */
export const DRIVE_UNAVAILABLE_MESSAGE =
  "Document storage is unavailable: ask the administrator to reconnect Google Drive";

/**
 * Drive is not FULLY connected: no connection row, or a row without the stored
 * (encrypted) refresh token — e.g. consent was started but never finished.
 * Uploads cannot work in that state, so they say so instead of failing at
 * Google with a bare "Failed to fetch".
 */
export const DRIVE_NOT_CONNECTED_MESSAGE =
  "Document storage is not connected: ask the administrator";

/* ------------------------------------------------------------------ */
/* ONE upload gate                                                    */
/* ------------------------------------------------------------------ */

/**
 * Is the pause in force at `now`? A pause whose auto-resume time has passed
 * is NOT a pause — that is how an auto-resume works without a cron job, and
 * it is read by the server gate and every UI surface alike.
 */
export function uploadsPaused(settings: DriveSettings, now: number = Date.now()): boolean {
  if (settings.paused !== true) return false;
  if (settings.resumeAt !== null && settings.resumeAt <= now) return false;
  return true;
}

export type UploadStateReason =
  | "paused"
  | "not_connected"
  | "auth_revoked"
  | "storage_full"
  | "not_configured";

export type UploadState = {
  allowed: boolean;
  reason: UploadStateReason | null;
  /** ONE plain sentence — the only wording any surface shows. */
  message: string;
  /** Chip label: "Storage OK" | "Uploads paused" | "Needs attention". */
  chip: string;
  /** When the pause started, who started it, when it lifts (null = no date). */
  since: number | null;
  setBy: string | null;
  until: number | null;
  /** The optional sentence the admin typed when pausing. */
  pauseReason: string | null;
  /** TRUE when the pause was set automatically (circuit breaker). */
  auto: boolean;
};

/**
 * THE single decision. Every surface — the server gate in `beginUpload`, the
 * Storage chip, the uploader, the Document status card and Admin → Google
 * Drive — calls this with the same row, so they can never disagree again.
 *
 * Order matters: connection problems are reported before a pause, because
 * resuming uploads would not help while Drive is disconnected.
 */
export function getUploadState(input: {
  settings: DriveSettings;
  connected: boolean;
  revoked?: boolean;
  configMissing?: readonly string[];
  storageFull?: boolean;
  now?: number;
}): UploadState {
  const now = input.now ?? Date.now();
  const s = input.settings;
  const base = {
    since: s.pausedAt,
    setBy: s.pausedBy || null,
    until: s.resumeAt,
    pauseReason: s.pauseReason || null,
    auto: s.autoPaused,
  };

  if (input.configMissing && input.configMissing.length > 0) {
    return {
      ...base,
      allowed: false,
      reason: "not_configured",
      message: DRIVE_UNAVAILABLE_MESSAGE,
      chip: "Needs attention",
    };
  }
  if (input.revoked) {
    return {
      ...base,
      allowed: false,
      reason: "auth_revoked",
      message: "Google Drive was disconnected — ask the administrator to reconnect it",
      chip: "Needs attention",
    };
  }
  if (!input.connected) {
    return {
      ...base,
      allowed: false,
      reason: "not_connected",
      message: DRIVE_NOT_CONNECTED_MESSAGE,
      chip: "Needs attention",
    };
  }
  if (input.storageFull) {
    return {
      ...base,
      allowed: false,
      reason: "storage_full",
      message: "Google Drive is full: ask the administrator to free space",
      chip: "Needs attention",
    };
  }
  if (uploadsPaused(s, now)) {
    return {
      ...base,
      allowed: false,
      reason: "paused",
      // Wording matches the server's rejection byte for byte, so a client-side
      // block and a server-side rejection read as the same sentence.
      message: s.autoPaused
        ? `Uploads are paused automatically${s.autoPauseCause ? ` (${s.autoPauseCause})` : ""}`
        : "Uploads are paused by the administrator",
      chip: "Uploads paused",
    };
  }
  return {
    ...base,
    allowed: true,
    reason: null,
    message: "",
    chip: "Storage OK",
  };
}

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** DD-MMM-YYYY for a timestamp — the app's date style, no locale services. */
export function dayStamp(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}-${MONTH_ABBR[d.getMonth()] ?? ""}-${d.getFullYear()}`;
}

/** The sentence a non-admin sees (task 1.3): when it lifts, and who to ask. */
export function uploadBlockedSentence(state: UploadState): string {
  if (state.reason === "paused") {
    const until = state.until ? dayStamp(state.until) : "further notice";
    return `Uploads are paused until ${until}: contact the administrator.`;
  }
  return state.message;
}

/** The admin's sentence: since when, by whom, why — one line, no secrets. */
export function uploadPausedDetail(state: UploadState): string {
  if (state.reason !== "paused") return state.message;
  const since = state.since ? ` since ${dayStamp(state.since)}` : "";
  const by = state.setBy ? ` by ${state.setBy}` : "";
  const until = state.until ? ` · resumes ${dayStamp(state.until)}` : "";
  const why = state.pauseReason ? ` — ${state.pauseReason}` : "";
  return `${state.message}${since}${by}${until}${why}`;
}
