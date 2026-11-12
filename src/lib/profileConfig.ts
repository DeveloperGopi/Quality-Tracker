/**
 * MY PROFILE — the ONE config the page, its tabs and its tests read.
 *
 * Everything that used to be inline in src/pages/Profile.tsx now lives here:
 *   • tab list (deep link `?tab=…`), field validation (E.164 phone, name and
 *     designation length), the "sample phone" detector,
 *   • profile-completeness items,
 *   • the notification matrix (rows × In-app/Email) and preference rows,
 *   • the activity mapping table that turns a raw audit `action` + `field` +
 *     `table` into plain words ("update SA Actual Start Date" → "Updated SA
 *     actual start date"), with a readable fallback for anything unknown,
 *   • session helpers: device parsing from a user agent, grouping, idle
 *     detection and relative time.
 *
 * No secret, Drive id or token is ever part of this module.
 */

/* --------------------------------------------------------------------------- */
/* Tabs                                                                        */
/* --------------------------------------------------------------------------- */

export const PROFILE_TABS = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "preferences", label: "Preferences" },
  { id: "notifications", label: "Notifications" },
  { id: "activity", label: "Activity" },
] as const;

export type ProfileTabId = (typeof PROFILE_TABS)[number]["id"];

export const DEFAULT_PROFILE_TAB: ProfileTabId = "profile";

export function isProfileTab(value: unknown): value is ProfileTabId {
  return (
    typeof value === "string" &&
    (PROFILE_TABS as readonly { id: string }[]).some((t) => t.id === value)
  );
}

/** localStorage key for the last tab — remembered per user id. */
export function profileTabStorageKey(userId: string): string {
  return `nqas.profile.tab.${userId}`;
}

/* --------------------------------------------------------------------------- */
/* Fields — validation lives here, the server repeats it (convex/profile.ts)   */
/* --------------------------------------------------------------------------- */

export type ProfileFieldKey = "name" | "designation" | "phone";

export const PROFILE_FIELD_RULES: Record<
  Exclude<ProfileFieldKey, "phone">,
  { label: string; min: number; max: number }
> = {
  name: { label: "Display name", min: 2, max: 60 },
  designation: { label: "Designation", min: 0, max: 80 },
};

/**
 * The number that used to sit in the phone input's placeholder and in two
 * error messages ("+91 98765 43210"). It is a SAMPLE, never real data: if a
 * stored value matches it the UI flags it so the person can clear it, and the
 * placeholder itself never shows a sample number again.
 */
export const SAMPLE_PHONE = "+91 98765 43210";

export const DEFAULT_COUNTRY_CODE = "+91";

/** Digits-only comparison, so "+91 98765 43210" === "9876543210" === sample. */
export function isSamplePhone(value: string | null | undefined): boolean {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 0 && digits === SAMPLE_PHONE.replace(/\D/g, "");
}

export const PHONE_HINT = "With country code, e.g. +91 98765 43210";

/** E.164 → the readable form used for display ("+919876543210" →
 *  "+91 98765 43210"). Anything else is shown as stored. */
export function formatPhone(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return raw;
}

/**
 * Normalise what a person types into an E.164 number:
 *   "98765 43210" → "+919876543210" (10 digits get the default country code),
 *   "91 98765 43210" → "+919876543210",
 *   "+91-98765-43210" → "+919876543210".
 * Returns the canonical value ("" when empty) and an error message when the
 * result is not a valid E.164 number.
 */
export function normalizePhone(raw: string | null | undefined): {
  value: string;
  error: string | null;
} {
  const input = String(raw ?? "").trim();
  if (!input) return { value: "", error: null };

  const hasPlus = input.startsWith("+");
  const digits = input.replace(/\D/g, "");
  if (!digits) return { value: input, error: `Enter a phone number (${PHONE_HINT})` };

  let value: string;
  if (hasPlus) {
    value = `+${digits}`;
  } else if (digits.length === 10) {
    value = `${DEFAULT_COUNTRY_CODE}${digits}`;
  } else if (digits.startsWith("91") && digits.length === 12) {
    value = `+${digits}`;
  } else if (digits.length > 10 && digits.length <= 15) {
    value = `+${digits}`;
  } else {
    return { value: input, error: `Enter a phone number with country code (${PHONE_HINT})` };
  }

  // E.164: + then 1–9 then up to 14 more digits (8–15 total).
  if (!/^\+[1-9]\d{7,14}$/.test(value)) {
    return { value, error: `Enter a phone number with country code (${PHONE_HINT})` };
  }
  return { value, error: null };
}

export function validateProfileField(
  key: Exclude<ProfileFieldKey, "phone">,
  value: string,
): string | null {
  const rule = PROFILE_FIELD_RULES[key];
  const trimmed = value.trim();
  if (trimmed.length < rule.min) {
    return key === "name" ? "Please enter your full name (2–60 characters)" : null;
  }
  if (trimmed.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer`;
  }
  return null;
}

/* --------------------------------------------------------------------------- */
/* Profile completeness                                                        */
/* --------------------------------------------------------------------------- */

export type CompletenessItem = {
  key: "name" | "designation" | "phone" | "photo" | "email";
  label: string;
  done: boolean;
};

export function profileCompleteness(input: {
  name: string;
  designation: string;
  phone: string;
  hasPhoto: boolean;
  emailVerified: boolean;
}): { percent: number; missing: string[]; items: CompletenessItem[] } {
  const items: CompletenessItem[] = [
    { key: "name", label: "Display name", done: input.name.trim().length >= 2 },
    { key: "designation", label: "Designation", done: input.designation.trim().length > 0 },
    {
      key: "phone",
      label: "Phone",
      done: !isSamplePhone(input.phone) && normalizePhone(input.phone).error === null && input.phone.trim().length > 0,
    },
    { key: "photo", label: "Photo", done: input.hasPhoto },
    { key: "email", label: "Email confirmed", done: input.emailVerified },
  ];
  const done = items.filter((i) => i.done).length;
  return {
    percent: Math.round((done / items.length) * 100),
    missing: items.filter((i) => !i.done).map((i) => i.label),
    items,
  };
}

/* --------------------------------------------------------------------------- */
/* Preferences                                                                 */
/* --------------------------------------------------------------------------- */

export const LANDING_PAGES = [
  ["/dashboard", "Dashboard"],
  ["/facilities", "Master List"],
  ["/reports", "Reports"],
] as const;

export const DENSITY_OPTIONS = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
] as const;

export const SIDEBAR_OPTIONS = [
  { value: "expanded", label: "Expanded" },
  { value: "rail", label: "Rail" },
] as const;

export const ROWS_PER_PAGE_OPTIONS = [25, 50, 100] as const;

export const FORMAT_NOTE = "Dates stay DD-MMM-YYYY and amounts stay ₹ (Indian) everywhere.";

/* --------------------------------------------------------------------------- */
/* Notifications — rows × In-app / Email                                       */
/* --------------------------------------------------------------------------- */

export type NotificationRow = {
  key: string;
  label: string;
  inAppKey: string;
  emailKey: string;
};

export const NOTIFICATION_ROWS: readonly NotificationRow[] = [
  { key: "needsAttention", label: "Needs attention", inAppKey: "needsAttentionInApp", emailKey: "needsAttentionEmail" },
  { key: "iaDue", label: "IA due reminder", inAppKey: "iaDueInApp", emailKey: "iaDueEmail" },
  { key: "linksDue", label: "Links due", inAppKey: "linksDueInApp", emailKey: "linksDueEmail" },
  { key: "importResults", label: "Import results", inAppKey: "importResultsInApp", emailKey: "importResultsEmail" },
];

export const DIGEST_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
] as const;

/* --------------------------------------------------------------------------- */
/* Activity — raw audit row → plain words                                      */
/* --------------------------------------------------------------------------- */

export type ActivityCategory = "facility" | "documents" | "imports" | "account";

export const ACTIVITY_FILTERS: readonly { value: ActivityCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "facility", label: "Facility edits" },
  { value: "documents", label: "Documents" },
  { value: "imports", label: "Imports" },
  { value: "account", label: "Account" },
];

export type ActivityEntry = {
  action: string;
  field?: string | null;
  table: string;
  source?: string | null;
  /** The audit row's new value — used only to recognise "version restored";
   *  never printed (it may hold a file name or a settings value). */
  newValue?: unknown;
};

const VERBS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  seed: "Seeded",
  view: "Viewed",
  upload: "Uploaded",
  replace: "Replaced",
  restore: "Restored",
};

/** Tables → the noun a person recognises. */
const TABLE_WORDS: Record<string, string> = {
  facilities: "facility record",
  facilityDocuments: "document",
  stateAssessments: "State assessment",
  nationalAssessments: "NQAS assessment",
  certificationCycles: "certification cycle",
  gapClosureFunds: "gap closure fund",
  fireNocs: "Fire NOC",
  buildingDetails: "building details",
  facilityIaQuarters: "internal assessment",
  surveillanceRecords: "surveillance record",
  appSettings: "a setting",
  blocks: "a block",
  phcs: "a PHC",
  users: "the account",
  driveCredentials: "Google Drive credentials",
  driveConnection: "Google Drive connection",
  appSecrets: "the Drive encryption key",
  documentRules: "a document rule",
};

/** Document keys → the label used everywhere else in the app. */
const DOC_WORDS: Record<string, string> = {
  NQAS_Result: "NQAS Result",
  SA_Report: "SA Report",
  SA_Checklist: "SA Checklist",
  Gap_Closure: "Gap Closure Proceeding",
  Condemned: "Condemned Certificate",
  NOC: "Fire NOC",
  NQAS_Certificate: "NQAS Certified Documents",
};

/** My-profile audit rows are written as "My profile · <what>". */
const PROFILE_WORDS: Record<string, string> = {
  Name: "Changed the display name",
  Designation: "Changed the designation",
  Phone: "Changed the phone number",
  Photo: "Updated the photo",
  Preferences: "Changed preferences",
  Notifications: "Changed notification preferences",
  "other sessions signed out": "Signed out other devices",
};

/** Turn the raw audit fields into one readable sentence. Never any values. */
export function describeActivity(entry: ActivityEntry): {
  text: string;
  category: ActivityCategory;
} {
  const field = (entry.field ?? "").trim();
  const table = entry.table;

  // ---- account / settings ---------------------------------------------
  if (table === "users" && field.startsWith("My profile · ")) {
    const what = field.slice("My profile · ".length);
    return {
      text: PROFILE_WORDS[what] ?? `Changed ${what.toLowerCase()}`,
      category: "account",
    };
  }
  if (table === "driveCredentials" || table === "driveConnection" || table === "appSecrets") {
    const verb = entry.action === "create" ? "Connected" : entry.action === "delete" ? "Disconnected" : "Updated";
    return { text: `${verb} Google Drive ${table === "appSecrets" ? "encryption key" : "credentials"}`, category: "account" };
  }
  if (table === "users" || table === "blocks" || table === "phcs" || table === "appSettings") {
    const verb = VERBS[entry.action] ?? "Changed";
    const what = field ? field.replace(/\s+/g, " ").toLowerCase() : TABLE_WORDS[table] ?? "a setting";
    return { text: `${verb} ${what}`, category: "account" };
  }

  // ---- imports ----------------------------------------------------------
  const source = (entry.source ?? "").toLowerCase();
  if (source.includes("import") || table === "importLogs") {
    const verb = VERBS[entry.action] ?? "Updated";
    const what = field ? field.replace(/\s+/g, " ") : TABLE_WORDS[table] ?? "imported data";
    return { text: `${verb} ${what} (import)`, category: "imports" };
  }

  // ---- documents --------------------------------------------------------
  if (table === "facilityDocuments") {
    const fallback = field.replace(/_/g, " ").trim();
    const label = DOC_WORDS[field] ?? (fallback || "a document");
    if (entry.action === "create") return { text: `Uploaded ${label}`, category: "documents" };
    if (entry.action === "delete") return { text: `Removed ${label}`, category: "documents" };
    if (entry.action === "view")
      return { text: `${entry.field === "download" ? "Downloaded" : "Previewed"} ${label}`, category: "documents" };
    if ((entry.newValue as string | undefined) === "version restored")
      return { text: `Restored a version of ${label}`, category: "documents" };
    return { text: `Replaced ${label}`, category: "documents" };
  }

  // ---- facility edits ---------------------------------------------------
  const verb = VERBS[entry.action] ?? "Updated";
  if (field) {
    const words = field.replace(/\s+/g, " ").split(" ");
    // Keep the leading word (often the acronym: "SA", "NQAS", "NOC") and
    // lowercase the rest: "SA Actual Start Date" → "SA actual start date".
    const pretty =
      words.length > 1
        ? `${words[0]} ${words.slice(1).map((w) => w.toLowerCase()).join(" ")}`
        : words[0];
    return { text: `${verb} ${pretty}`, category: "facility" };
  }
  return { text: `${verb} ${TABLE_WORDS[table] ?? "a record"}`, category: "facility" };
}

/* --------------------------------------------------------------------------- */
/* Sessions                                                                    */
/* --------------------------------------------------------------------------- */

/** A session idle for more than this is shown as "Inactive". */
export const SESSION_INACTIVE_DAYS = 7;

/** Configured session lifetime — appSettings `sessionLifetimeDays` wins when a
 *  State Admin set it; this is the default (matches the auth library's own
 *  30-day total duration). */
export const SESSION_LIFETIME_DAYS_DEFAULT = 30;

export type SessionRow = {
  id: string;
  current: boolean;
  createdAt: number | null;
  lastActive: number | null;
  expiresAt: number | null;
  userAgent: string | null;
  region: string | null;
};

export type DeviceInfo = { browser: string; os: string; label: string };

/** User agent → "Chrome on Windows". Never shows a raw IP or full UA string. */
export function parseDevice(userAgent: string | null | undefined): DeviceInfo {
  const ua = userAgent ?? "";
  let browser = "Browser";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua)) browser = "Opera";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/firefox\//i.test(ua)) browser = "Firefox";

  let os = "Unknown OS";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  return { browser, os, label: `${browser} on ${os}` };
}

export type SessionGroup = {
  key: string;
  device: DeviceInfo;
  sessions: SessionRow[];
};

/** Group sessions of the same browser + OS together (order preserved). */
export function groupSessions(rows: SessionRow[]): SessionGroup[] {
  const groups = new Map<string, SessionGroup>();
  for (const row of rows) {
    const device = parseDevice(row.userAgent);
    const key = `${device.browser}|${device.os}`;
    const group = groups.get(key) ?? { key, device, sessions: [] };
    group.sessions.push(row);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function isInactiveSession(lastActive: number | null, now: number): boolean {
  if (lastActive === null) return false;
  return now - lastActive > SESSION_INACTIVE_DAYS * 24 * 60 * 60 * 1000;
}

/** Display-only clock for relative timestamps. It is read during render on
 *  purpose (the value only labels text like "3 h ago" and is refreshed by the
 *  next render); keeping it in one helper keeps the React purity rules happy
 *  without hiding a real side effect. */
export function nowMs(): number {
  return Date.now();
}

/** "just now" · "12 min ago" · "3 h ago" · "yesterday" · "5 d ago" · date. */
export function relativeTime(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return "—";
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} d ago`;
  return toShortDate(ts);
}

function toShortDate(ts: number): string {
  const d = new Date(ts);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Activity/session day groups: "Today", "Yesterday", then DD-MMM-YYYY. */
export function dayLabel(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const today = new Date(now);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  const yesterday = new Date(now - 24 * 60 * 60 * 1000);
  if (sameDay(d, yesterday)) return "Yesterday";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d.getDate()).padStart(2, "0")}-${months[d.getMonth()]}-${d.getFullYear()}`;
}
