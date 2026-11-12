const PROFILE_TABS = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "preferences", label: "Preferences" },
  { id: "notifications", label: "Notifications" },
  { id: "activity", label: "Activity" }
];
const DEFAULT_PROFILE_TAB = "profile";
function isProfileTab(value) {
  return typeof value === "string" && PROFILE_TABS.some((t) => t.id === value);
}
function profileTabStorageKey(userId) {
  return `nqas.profile.tab.${userId}`;
}
const PROFILE_FIELD_RULES = {
  name: { label: "Display name", min: 2, max: 60 },
  designation: { label: "Designation", min: 0, max: 80 }
};
const SAMPLE_PHONE = "+91 98765 43210";
const DEFAULT_COUNTRY_CODE = "+91";
function isSamplePhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 0 && digits === SAMPLE_PHONE.replace(/\D/g, "");
}
const PHONE_HINT = "With country code, e.g. +91 98765 43210";
function formatPhone(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return raw;
}
function normalizePhone(raw) {
  const input = String(raw ?? "").trim();
  if (!input) return { value: "", error: null };
  const hasPlus = input.startsWith("+");
  const digits = input.replace(/\D/g, "");
  if (!digits) return { value: input, error: `Enter a phone number (${PHONE_HINT})` };
  let value;
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
  if (!/^\+[1-9]\d{7,14}$/.test(value)) {
    return { value, error: `Enter a phone number with country code (${PHONE_HINT})` };
  }
  return { value, error: null };
}
function validateProfileField(key, value) {
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
function profileCompleteness(input) {
  const items = [
    { key: "name", label: "Display name", done: input.name.trim().length >= 2 },
    { key: "designation", label: "Designation", done: input.designation.trim().length > 0 },
    {
      key: "phone",
      label: "Phone",
      done: !isSamplePhone(input.phone) && normalizePhone(input.phone).error === null && input.phone.trim().length > 0
    },
    { key: "photo", label: "Photo", done: input.hasPhoto },
    { key: "email", label: "Email confirmed", done: input.emailVerified }
  ];
  const done = items.filter((i) => i.done).length;
  return {
    percent: Math.round(done / items.length * 100),
    missing: items.filter((i) => !i.done).map((i) => i.label),
    items
  };
}
const LANDING_PAGES = [
  ["/dashboard", "Dashboard"],
  ["/facilities", "Master List"],
  ["/reports", "Reports"]
];
const DENSITY_OPTIONS = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" }
];
const SIDEBAR_OPTIONS = [
  { value: "expanded", label: "Expanded" },
  { value: "rail", label: "Rail" }
];
const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];
const FORMAT_NOTE = "Dates stay DD-MMM-YYYY and amounts stay ₹ (Indian) everywhere.";
const NOTIFICATION_ROWS = [
  { key: "needsAttention", label: "Needs attention", inAppKey: "needsAttentionInApp", emailKey: "needsAttentionEmail" },
  { key: "iaDue", label: "IA due reminder", inAppKey: "iaDueInApp", emailKey: "iaDueEmail" },
  { key: "linksDue", label: "Links due", inAppKey: "linksDueInApp", emailKey: "linksDueEmail" },
  { key: "importResults", label: "Import results", inAppKey: "importResultsInApp", emailKey: "importResultsEmail" }
];
const DIGEST_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" }
];
const ACTIVITY_FILTERS = [
  { value: "all", label: "All" },
  { value: "facility", label: "Facility edits" },
  { value: "documents", label: "Documents" },
  { value: "imports", label: "Imports" },
  { value: "account", label: "Account" }
];
const VERBS = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  seed: "Seeded",
  view: "Viewed",
  upload: "Uploaded",
  replace: "Replaced",
  restore: "Restored"
};
const TABLE_WORDS = {
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
  documentRules: "a document rule"
};
const DOC_WORDS = {
  NQAS_Result: "NQAS Result",
  SA_Report: "SA Report",
  SA_Checklist: "SA Checklist",
  Gap_Closure: "Gap Closure Proceeding",
  Condemned: "Condemned Certificate",
  NOC: "Fire NOC",
  NQAS_Certificate: "NQAS Certified Documents"
};
const PROFILE_WORDS = {
  Name: "Changed the display name",
  Designation: "Changed the designation",
  Phone: "Changed the phone number",
  Photo: "Updated the photo",
  Preferences: "Changed preferences",
  Notifications: "Changed notification preferences",
  "other sessions signed out": "Signed out other devices"
};
function describeActivity(entry) {
  const field = (entry.field ?? "").trim();
  const table = entry.table;
  if (table === "users" && field.startsWith("My profile · ")) {
    const what = field.slice("My profile · ".length);
    return {
      text: PROFILE_WORDS[what] ?? `Changed ${what.toLowerCase()}`,
      category: "account"
    };
  }
  if (table === "driveCredentials" || table === "driveConnection" || table === "appSecrets") {
    const verb2 = entry.action === "create" ? "Connected" : entry.action === "delete" ? "Disconnected" : "Updated";
    return { text: `${verb2} Google Drive ${table === "appSecrets" ? "encryption key" : "credentials"}`, category: "account" };
  }
  if (table === "users" || table === "blocks" || table === "phcs" || table === "appSettings") {
    const verb2 = VERBS[entry.action] ?? "Changed";
    const what = field ? field.replace(/\s+/g, " ").toLowerCase() : TABLE_WORDS[table] ?? "a setting";
    return { text: `${verb2} ${what}`, category: "account" };
  }
  const source = (entry.source ?? "").toLowerCase();
  if (source.includes("import") || table === "importLogs") {
    const verb2 = VERBS[entry.action] ?? "Updated";
    const what = field ? field.replace(/\s+/g, " ") : TABLE_WORDS[table] ?? "imported data";
    return { text: `${verb2} ${what} (import)`, category: "imports" };
  }
  if (table === "facilityDocuments") {
    const fallback = field.replace(/_/g, " ").trim();
    const label = DOC_WORDS[field] ?? (fallback || "a document");
    if (entry.action === "create") return { text: `Uploaded ${label}`, category: "documents" };
    if (entry.action === "delete") return { text: `Removed ${label}`, category: "documents" };
    if (entry.action === "view")
      return { text: `${entry.field === "download" ? "Downloaded" : "Previewed"} ${label}`, category: "documents" };
    if (entry.newValue === "version restored")
      return { text: `Restored a version of ${label}`, category: "documents" };
    return { text: `Replaced ${label}`, category: "documents" };
  }
  const verb = VERBS[entry.action] ?? "Updated";
  if (field) {
    const words = field.replace(/\s+/g, " ").split(" ");
    const pretty = words.length > 1 ? `${words[0]} ${words.slice(1).map((w) => w.toLowerCase()).join(" ")}` : words[0];
    return { text: `${verb} ${pretty}`, category: "facility" };
  }
  return { text: `${verb} ${TABLE_WORDS[table] ?? "a record"}`, category: "facility" };
}
const SESSION_INACTIVE_DAYS = 7;
const SESSION_LIFETIME_DAYS_DEFAULT = 30;
function parseDevice(userAgent) {
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
function groupSessions(rows) {
  const groups = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const device = parseDevice(row.userAgent);
    const key = `${device.browser}|${device.os}`;
    const group = groups.get(key) ?? { key, device, sessions: [] };
    group.sessions.push(row);
    groups.set(key, group);
  }
  return [...groups.values()];
}
function isInactiveSession(lastActive, now) {
  if (lastActive === null) return false;
  return now - lastActive > SESSION_INACTIVE_DAYS * 24 * 60 * 60 * 1e3;
}
function nowMs() {
  return Date.now();
}
function relativeTime(ts, now = Date.now()) {
  if (!ts) return "—";
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 6e4);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} d ago`;
  return toShortDate(ts);
}
function toShortDate(ts) {
  const d = new Date(ts);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function dayLabel(ts, now = Date.now()) {
  const d = new Date(ts);
  const today = new Date(now);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  const yesterday = new Date(now - 24 * 60 * 60 * 1e3);
  if (sameDay(d, yesterday)) return "Yesterday";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d.getDate()).padStart(2, "0")}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

export { ACTIVITY_FILTERS as A, DENSITY_OPTIONS as D, FORMAT_NOTE as F, LANDING_PAGES as L, NOTIFICATION_ROWS as N, PHONE_HINT as P, ROWS_PER_PAGE_OPTIONS as R, SESSION_LIFETIME_DAYS_DEFAULT as S, SIDEBAR_OPTIONS as a, DIGEST_OPTIONS as b, DEFAULT_PROFILE_TAB as c, isProfileTab as d, profileTabStorageKey as e, formatPhone as f, profileCompleteness as g, PROFILE_TABS as h, isSamplePhone as i, groupSessions as j, nowMs as k, isInactiveSession as l, dayLabel as m, normalizePhone as n, describeActivity as o, parseDevice as p, relativeTime as r, validateProfileField as v };
