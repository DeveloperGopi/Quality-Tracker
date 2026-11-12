/**
 * LINKS ORGANISER — shared model and pure rules.
 *
 * This module is deliberately free of React and Convex: the page, the import
 * review, the server mutations, the exports and the unit tests all read the
 * SAME definitions. It owns:
 *   • category colour tokens and status tone/icon metadata (never colour alone),
 *   • calendar-month due dates (clamped to month end) and the due-state rules,
 *   • URL safety, secret-parameter detection and type detection,
 *   • the one table column model used by the sticky/frozen grid contract.
 *
 * Dates are ISO date-only strings in storage and render as DD-MMM-YYYY.
 * "Today" is always injected from the server's IST date on read/apply paths.
 */

import {
  addDays,
  daysBetweenIso,
  formatDateLong,
  isIsoDate,
  parseDateText,
} from "./dateInput";

export const LINK_LEVELS = ["National", "State", "District"] as const;
export type LinkLevel = (typeof LINK_LEVELS)[number];

export const LINK_VISIBILITIES = ["everyone", "editors", "admin"] as const;
export type LinkVisibility = (typeof LINK_VISIBILITIES)[number];

export const LINK_VISIBILITY_LABEL: Record<LinkVisibility, string> = {
  everyone: "Everyone",
  editors: "Editors and Admin",
  admin: "Admin only",
};

export const LINK_TYPES = [
  "web",
  "sheet",
  "doc",
  "form",
  "pdf",
  "drive",
  "video",
  "other",
] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export const LINK_TYPE_LABEL: Record<LinkType, string> = {
  web: "Website",
  sheet: "Google Sheet",
  doc: "Document",
  form: "Form",
  pdf: "PDF",
  drive: "Drive",
  video: "Video",
  other: "Other",
};

/** Category colours are token keys, never free-form CSS from the database. */
export const LINK_COLOURS = {
  teal: {
    label: "Teal",
    dot: "bg-teal-500",
    chip: "border-teal-300/70 bg-teal-50 text-teal-900",
    hex: "#0f766e",
    fill: "FFCCFBF1",
  },
  blue: {
    label: "Blue",
    dot: "bg-sky-500",
    chip: "border-sky-300/70 bg-sky-50 text-sky-900",
    hex: "#0369a1",
    fill: "FFE0F2FE",
  },
  violet: {
    label: "Violet",
    dot: "bg-violet-500",
    chip: "border-violet-300/70 bg-violet-50 text-violet-900",
    hex: "#6d28d9",
    fill: "FFEDE9FE",
  },
  amber: {
    label: "Amber",
    dot: "bg-amber-500",
    chip: "border-amber-300/80 bg-amber-50 text-amber-900",
    hex: "#b45309",
    fill: "FFFEF3C7",
  },
  rose: {
    label: "Rose",
    dot: "bg-rose-500",
    chip: "border-rose-300/70 bg-rose-50 text-rose-900",
    hex: "#be123c",
    fill: "FFFFE4E6",
  },
  emerald: {
    label: "Emerald",
    dot: "bg-emerald-500",
    chip: "border-emerald-300/70 bg-emerald-50 text-emerald-900",
    hex: "#047857",
    fill: "FFD1FAE5",
  },
  slate: {
    label: "Slate",
    dot: "bg-slate-500",
    chip: "border-slate-300/70 bg-slate-50 text-slate-800",
    hex: "#475569",
    fill: "FFF1F5F9",
  },
} as const;

export type LinkColourKey = keyof typeof LINK_COLOURS;

export function linkColour(key: string | null | undefined) {
  return LINK_COLOURS[(key ?? "slate") as LinkColourKey] ?? LINK_COLOURS.slate;
}

export type LinkFrequencyOption = {
  value: string;
  label: string;
  /** Calendar months for recurring frequencies; absent for one-time/days. */
  months?: number;
  /** Fixed day interval (weekly / custom). */
  days?: number;
};

export const DEFAULT_LINK_FREQUENCIES: LinkFrequencyOption[] = [
  { value: "one-time", label: "One-time" },
  { value: "weekly", label: "Weekly", days: 7 },
  { value: "monthly", label: "Monthly", months: 1 },
  { value: "every-2-months", label: "Every 2 months", months: 2 },
  { value: "quarterly", label: "Quarterly (3 months once)", months: 3 },
  { value: "half-yearly", label: "Half-yearly", months: 6 },
  { value: "yearly", label: "Yearly", months: 12 },
  { value: "custom-days", label: "Custom days", days: 0 },
];

export type LinkStatusTone = "teal" | "green" | "amber" | "slate" | "blue" | "rose";

export type LinkStatusDef = {
  name: string;
  tone: LinkStatusTone;
  icon: string;
  /** Recurring items in this status participate in due/overdue reminders. */
  countsAsOpen: boolean;
};

/**
 * Default status list. The sheet's Active is teal (the old red was a
 * spreadsheet conditional-format choice, not the app's meaning). Completed is
 * green WITH a check icon. Archived is grey.
 *
 * Completed counts as open by default, per the brief's explicit default:
 * "Completed recurring items still become due". An Admin can switch that off
 * in Admin → Links; Archived never participates.
 */
export const DEFAULT_LINK_STATUSES: LinkStatusDef[] = [
  { name: "Active", tone: "teal", icon: "CircleDot", countsAsOpen: true },
  { name: "Completed", tone: "green", icon: "CheckCircle2", countsAsOpen: true },
  { name: "On hold", tone: "amber", icon: "PauseCircle", countsAsOpen: true },
  { name: "Archived", tone: "slate", icon: "Archive", countsAsOpen: false },
];

export const LINK_STATUS_TONE_CLASS: Record<LinkStatusTone, string> = {
  teal: "border-teal-300/70 bg-teal-50 text-teal-900",
  green: "border-emerald-300/70 bg-emerald-50 text-emerald-900",
  amber: "border-amber-300/80 bg-amber-50 text-amber-900",
  slate: "border-slate-300/70 bg-slate-50 text-slate-700",
  blue: "border-sky-300/70 bg-sky-50 text-sky-900",
  rose: "border-rose-300/70 bg-rose-50 text-rose-900",
};

export type LinksConfig = {
  statuses: LinkStatusDef[];
  frequencies: LinkFrequencyOption[];
  dueSoonDays: number;
  defaultVisibility: LinkVisibility;
  /** "editors" (default) or "owners" — see linkReminderScope(). */
  notifyMode: "editors" | "owners";
  sidebarBadge: boolean;
  /** Which FilterBar fields are on the page by default (Admin → Filters). */
  defaultFilters: string[];
  /** Optional link checker (off by default). Manual action + weekly job. */
  linkCheckEnabled: boolean;
  linkCheckWeekly: boolean;
};

export const DEFAULT_LINKS_CONFIG: LinksConfig = {
  statuses: DEFAULT_LINK_STATUSES,
  frequencies: DEFAULT_LINK_FREQUENCIES,
  dueSoonDays: 7,
  defaultVisibility: "everyone",
  notifyMode: "editors",
  sidebarBadge: false,
  defaultFilters: ["category", "status", "due"],
  linkCheckEnabled: false,
  linkCheckWeekly: false,
};

function isStatusTone(value: unknown): value is LinkStatusTone {
  return (
    value === "teal" ||
    value === "green" ||
    value === "amber" ||
    value === "slate" ||
    value === "blue" ||
    value === "rose"
  );
}

/** Defensive normaliser: appSettings is user-editable, the config is typed. */
export function normalizeLinksConfig(value: unknown): LinksConfig {
  const raw = (value ?? {}) as Partial<LinksConfig>;
  const statuses = Array.isArray(raw.statuses)
    ? raw.statuses
        .filter((s): s is LinkStatusDef => !!s && typeof s.name === "string" && s.name.trim() !== "")
        .map((s) => ({
          name: s.name.trim(),
          tone: isStatusTone(s.tone) ? s.tone : "slate",
          icon: typeof s.icon === "string" && s.icon ? s.icon : "Circle",
          countsAsOpen: s.countsAsOpen !== false,
        }))
    : DEFAULT_LINK_STATUSES;
  const frequencies = Array.isArray(raw.frequencies)
    ? raw.frequencies.filter(
        (f): f is LinkFrequencyOption =>
          !!f && typeof f.value === "string" && typeof f.label === "string",
      )
    : DEFAULT_LINK_FREQUENCIES;
  const dueSoonDays = typeof raw.dueSoonDays === "number" && Number.isFinite(raw.dueSoonDays)
    ? Math.max(0, Math.min(60, Math.round(raw.dueSoonDays)))
    : DEFAULT_LINKS_CONFIG.dueSoonDays;
  const defaultFilters = Array.isArray(raw.defaultFilters)
    ? [...new Set(raw.defaultFilters.filter((key): key is string => typeof key === "string" && !!key))]
        .slice(0, 8)
    : DEFAULT_LINKS_CONFIG.defaultFilters;
  return {
    statuses: statuses.length ? statuses : DEFAULT_LINK_STATUSES,
    frequencies: frequencies.length ? frequencies : DEFAULT_LINK_FREQUENCIES,
    dueSoonDays,
    defaultVisibility:
      raw.defaultVisibility === "editors" || raw.defaultVisibility === "admin"
        ? raw.defaultVisibility
        : "everyone",
    notifyMode: raw.notifyMode === "owners" ? "owners" : "editors",
    sidebarBadge: raw.sidebarBadge === true,
    defaultFilters: defaultFilters.length ? defaultFilters : DEFAULT_LINKS_CONFIG.defaultFilters,
    linkCheckEnabled: raw.linkCheckEnabled === true,
    linkCheckWeekly: raw.linkCheckWeekly === true,
  };
}

export function linkStatusDef(config: LinksConfig, name: string): LinkStatusDef {
  return (
    config.statuses.find((s) => s.name === name) ??
    config.statuses.find((s) => s.name.toLowerCase() === name.toLowerCase()) ??
    config.statuses[0]
  );
}

export function frequencyOption(
  config: LinksConfig,
  value: string,
): LinkFrequencyOption | undefined {
  return config.frequencies.find((f) => f.value === value);
}

export function frequencyLabel(config: LinksConfig, value: string): string {
  return frequencyOption(config, value)?.label ?? (value === "one-time" ? "One-time" : value);
}

/** Add calendar months, clamping the day to the target month's end. */
export function addCalendarMonths(iso: string, months: number): string | null {
  if (!isIsoDate(iso) || !Number.isInteger(months)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth() + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(d, last);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The next due date, or null for one-time / missing / unknown frequencies. */
export function computeNextDue(
  lastUpdated: string | null | undefined,
  frequency: string,
  customDays?: number | null,
  frequencies: readonly LinkFrequencyOption[] = DEFAULT_LINK_FREQUENCIES,
): string | null {
  if (!lastUpdated || !isIsoDate(lastUpdated) || frequency === "one-time") return null;
  const option = frequencies.find((f) => f.value === frequency);
  if (!option) return null;
  if (option.months != null && option.months > 0) {
    return addCalendarMonths(lastUpdated, option.months);
  }
  if (frequency === "custom-days") {
    const days = Math.round(Number(customDays ?? 0));
    if (!Number.isFinite(days) || days <= 0) return null;
    return addDays(lastUpdated, days);
  }
  if (option.days != null && option.days > 0) return addDays(lastUpdated, option.days);
  return null;
}

export type DueState = "none" | "never" | "overdue" | "due-soon" | "up-to-date" | "closed";

export type DueResult = {
  state: DueState;
  nextDue: string | null;
  /** Positive = days until due, negative = days overdue. */
  days: number | null;
};

/**
 * Due state for one item. Archived always stops reminders; a status with
 * `countsAsOpen: false` stops them too. One-time items have no due date. A
 * recurring item with no last-updated date is "Never updated" and overdue.
 */
export function computeDueState(
  item: {
    frequency: string;
    lastUpdated?: string | null;
    status: string;
    archivedAt?: number | null;
    customDays?: number | null;
  },
  today: string,
  config: LinksConfig = DEFAULT_LINKS_CONFIG,
): DueResult {
  if (item.archivedAt || item.frequency === "one-time") {
    return { state: "none", nextDue: null, days: null };
  }
  const status = linkStatusDef(config, item.status);
  // A completed quarter report is closed for its period, never overdue.
  if (status.name === "Completed" && quarterPeriodOf(item)) {
    return { state: "closed", nextDue: null, days: null };
  }
  if (!status.countsAsOpen) return { state: "none", nextDue: null, days: null };
  if (!item.lastUpdated || !isIsoDate(item.lastUpdated)) {
    return { state: "never", nextDue: null, days: null };
  }
  const nextDue = computeNextDue(
    item.lastUpdated,
    item.frequency,
    item.customDays,
    config.frequencies,
  );
  if (!nextDue) return { state: "none", nextDue: null, days: null };
  const until = daysBetweenIso(today, nextDue);
  if (until == null) return { state: "none", nextDue, days: null };
  if (until < 0) return { state: "overdue", nextDue, days: until };
  if (until <= config.dueSoonDays) return { state: "due-soon", nextDue, days: until };
  return { state: "up-to-date", nextDue, days: until };
}

export function dueStateLabel(result: DueResult, config: LinksConfig = DEFAULT_LINKS_CONFIG): string {
  switch (result.state) {
    case "overdue":
      return `Overdue (${Math.abs(result.days ?? 0)} day${Math.abs(result.days ?? 0) === 1 ? "" : "s"})`;
    case "due-soon":
      return result.days === 0 ? "Due today" : `Due soon (${result.days}d)`;
    case "never":
      return "Never updated";
    case "closed":
      return "Closed for the period";
    case "up-to-date":
      return result.days == null ? "Up to date" : `Up to date (${result.days}d)`;
    default:
      return "No due date";
  }
}

export function formatLinkDate(iso: string | null | undefined): string {
  return iso && isIsoDate(iso) ? formatDateLong(iso) : "-";
}

/** Relative wording for the Last updated cell; blank is "-", never 0. */
export function relativeUpdated(iso: string | null | undefined, today: string): string {
  if (!iso || !isIsoDate(iso)) return "-";
  const days = daysBetweenIso(iso, today);
  if (days == null) return "-";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days > 1 && days < 31) return `${days} days ago`;
  if (days < 0) return `In ${Math.abs(days)} days`;
  const months = Math.round(days / 30);
  return months <= 1 ? "1 month ago" : `${months} months ago`;
}

/* -------------------------------------------------------------------------- */
/* URLs                                                                        */
/* -------------------------------------------------------------------------- */

const TRACKING_PARAMS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid", "igshid"]);
const SECRET_PARAMS = new Set([
  "token",
  "key",
  "password",
  "pwd",
  "secret",
  "access_token",
  "access-token",
  "sig",
  "signature",
  "apikey",
  "api_key",
  "auth",
]);

export const LINK_LABEL_MAX = 80;
export const LINK_URL_MAX = 2048;

export function stripInvisible(value: string): string {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

/** Remove tracking parameters and invisible characters; keep the real URL. */
export function normalizeLinkUrl(raw: string): string {
  const clean = stripInvisible(raw);
  if (!clean) return "";
  try {
    const url = new URL(clean);
    const remove: string[] = [];
    url.searchParams.forEach((_value, key) => {
      const lower = key.toLowerCase();
      if (lower.startsWith("utm_") || TRACKING_PARAMS.has(lower)) remove.push(key);
    });
    for (const key of remove) url.searchParams.delete(key);
    // URL serialises a bare "?" as an empty search; remove it.
    let out = url.toString();
    if (out.endsWith("?")) out = out.slice(0, -1);
    return out;
  } catch {
    return clean;
  }
}

export function secretParamsIn(raw: string): string[] {
  try {
    const url = new URL(stripInvisible(raw));
    const found: string[] = [];
    url.searchParams.forEach((_value, key) => {
      if (SECRET_PARAMS.has(key.toLowerCase())) found.push(key);
    });
    return found;
  } catch {
    return [];
  }
}

export function linkDomain(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function looksLikeUrl(value: string): boolean {
  const text = stripInvisible(value);
  return /^https?:\/\//i.test(text) || /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(text);
}

export type LinkUrlCheck = {
  ok: boolean;
  url: string;
  error: string | null;
  /** The URL carries a credential-like query parameter. */
  secretParams: string[];
  warning: string | null;
  changedByNormalisation: boolean;
};

/**
 * The ONE URL validator. Only http/https; rejects credentials in the
 * authority and blocks URLs carrying token/key/password-like query params.
 * The last rule is deliberate: the app never stores a credential-bearing URL.
 */
export function validateLinkUrl(raw: string): LinkUrlCheck {
  const original = stripInvisible(raw);
  const normalized = normalizeLinkUrl(original);
  const fail = (error: string, extra: Partial<LinkUrlCheck> = {}): LinkUrlCheck => ({
    ok: false,
    url: normalized,
    error,
    secretParams: extra.secretParams ?? [],
    warning: extra.warning ?? null,
    changedByNormalisation: normalized !== original,
  });
  if (!original) return fail("Enter a link");
  if (original.length > LINK_URL_MAX) return fail(`A link can be at most ${LINK_URL_MAX} characters`);
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return fail("Enter a full link starting with https://");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return fail("Only http:// and https:// links are allowed");
  }
  if (url.username || url.password) {
    return fail("Remove the username or password from the link");
  }
  if (!url.hostname || !/[a-z0-9]/i.test(url.hostname)) {
    return fail("The link needs a valid hostname");
  }
  const secrets = secretParamsIn(normalized);
  if (secrets.length) {
    return fail(
      "This link carries a credential (" +
        secrets.join(", ") +
        "). Remove the token/key parameter and use a link that does not require credentials.",
      {
        secretParams: secrets,
        warning:
          "This link may contain a secret. Use a link that does not carry credentials.",
      },
    );
  }
  return {
    ok: true,
    url: normalized,
    error: null,
    secretParams: [],
    warning: null,
    changedByNormalisation: normalized !== original,
  };
}

export function detectLinkType(raw: string, label?: string): LinkType {
  let url: URL;
  try {
    url = new URL(stripInvisible(raw));
  } catch {
    return "other";
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.toLowerCase();
  const labelText = (label ?? "").toLowerCase();
  if (host === "docs.google.com" || host === "sheets.google.com") {
    if (path.startsWith("/spreadsheets")) return "sheet";
    if (path.startsWith("/document")) return "doc";
    if (path.startsWith("/forms")) return "form";
    if (path.startsWith("/presentation")) return "other";
    return "doc";
  }
  if (host === "drive.google.com") return "drive";
  if (host === "forms.gle" || host === "forms.google.com") return "form";
  if (host === "youtube.com" || host === "youtu.be" || host === "vimeo.com") return "video";
  if (path.endsWith(".pdf") || labelText.endsWith(".pdf") || labelText.includes("pdf")) return "pdf";
  if (path.includes("form") || host.includes("form") || labelText.includes("form")) return "form";
  if (path.includes("sheet") || labelText.includes("sheet")) return "sheet";
  if (path.includes("doc") || labelText.includes("doc")) return "doc";
  return "web";
}

/** Best available label without a network request: a readable domain. */
export function suggestLinkLabel(raw: string): string {
  const domain = linkDomain(raw);
  if (!domain) return "Link";
  const type = detectLinkType(raw);
  if (type === "sheet") return `Sheet · ${domain}`;
  if (type === "form") return `Form · ${domain}`;
  if (type === "doc") return `Document · ${domain}`;
  if (type === "pdf") return `PDF · ${domain}`;
  if (type === "drive") return `Drive · ${domain}`;
  return domain;
}

export function sameUrl(a: string, b: string): boolean {
  return normalizeLinkUrl(a).replace(/\/$/, "") === normalizeLinkUrl(b).replace(/\/$/, "");
}

/* -------------------------------------------------------------------------- */
/* Visibility / roles                                                          */
/* -------------------------------------------------------------------------- */

export type LinkRole = "admin" | "editor" | "viewer";

export function linkRole(appRole: string | null | undefined): LinkRole {
  if (appRole === "admin") return "admin";
  if (appRole === "entry" || appRole === "dqmo" || appRole === "dqc") return "editor";
  return "viewer";
}

export function canSeeLink(
  visibility: string,
  role: LinkRole,
): boolean {
  if (role === "admin") return true;
  if (visibility === "admin") return false;
  if (visibility === "editors") return role === "editor";
  return true;
}

export function canEditLinks(role: LinkRole): boolean {
  return role !== "viewer";
}

/* -------------------------------------------------------------------------- */
/* Reminder scope (Admin → "Bell notifications")                              */
/* -------------------------------------------------------------------------- */

export type LinkReminderScope =
  /** "editors" — every signed-in user with view access sees the feed. */
  | { mode: "all" }
  /** "owners" — only rows whose owner name matches the signed-in user. */
  | { mode: "owned-by"; names: string[] };

const normalizeName = (value?: string | null): string =>
  (value ?? "").trim().toLowerCase();

/**
 * Who sees the due-links bell feed.
 *
 * - `notifyMode: "editors"` (default): everyone who can see the rows.
 * - `notifyMode: "owners"`: only rows owned by the signed-in person (matched
 *   on display name or email against the Admin owner list). A user who
 *   matches NO configured owner falls back to the full editors view — the
 *   feed must never go empty just because the owner list uses team names.
 */
export function linkReminderScope(
  config: Pick<LinksConfig, "notifyMode">,
  user: { name?: string | null; email?: string | null },
  owners: readonly { name: string }[],
): LinkReminderScope {
  if (config.notifyMode !== "owners") return { mode: "all" };
  const identity = [
    normalizeName(user.name),
    normalizeName(user.email),
    normalizeName(user.email?.split("@")[0]),
  ].filter(Boolean);
  if (!identity.length) return { mode: "all" };
  const names = owners
    .map((owner) => normalizeName(owner.name))
    .filter((name) => name && identity.includes(name));
  return names.length ? { mode: "owned-by", names } : { mode: "all" };
}

/* -------------------------------------------------------------------------- */
/* Table model — one column model for header and body                          */
/* -------------------------------------------------------------------------- */

export type LinkTableColumn = {
  key:
    | "report"
    | "schedule"
    | "serial"
    | "category"
    | "title"
    | "frequency"
    | "lastUpdated"
    | "nextDue"
    | "links"
    | "form"
    | "owner"
    | "status"
    | "remarks"
    | "actions";
  label: string;
  width: string;
  align?: "left" | "right" | "center";
  /** Sticky left offset; only serial/category/report/title freeze. */
  frozen?: boolean;
  sortable?: boolean;
  /** Hidden from the simplified default; available in Columns and exports. */
  optional?: boolean;
};

/** Every column, used by the Columns menu and exports. */
export const LINK_TABLE_ALL_COLUMNS: LinkTableColumn[] = [
  { key: "serial", label: "S. No", width: "3.25rem", align: "center", optional: true },
  { key: "category", label: "Category", width: "8.75rem", optional: true, sortable: true },
  { key: "report", label: "Report", width: "16.5rem", frozen: true, sortable: true },
  { key: "links", label: "Links", width: "14rem" },
  { key: "schedule", label: "Schedule", width: "12rem" },
  { key: "owner", label: "Owner", width: "9rem", sortable: true },
  { key: "status", label: "Status", width: "8rem", sortable: true },
  { key: "frequency", label: "Frequency", width: "7.5rem", optional: true, sortable: true },
  { key: "lastUpdated", label: "Last Updated", width: "8.25rem", optional: true, sortable: true },
  { key: "nextDue", label: "Next Due", width: "8.5rem", optional: true, sortable: true },
  { key: "form", label: "Form Link", width: "9rem", optional: true },
  { key: "remarks", label: "Remarks", width: "12rem", optional: true },
  { key: "actions", label: "Actions", width: "5.5rem", align: "right" },
];

const DEFAULT_KEYS = ["report", "links", "schedule", "owner", "status", "actions"] as const;
export const LINK_TABLE_COLUMNS: LinkTableColumn[] = LINK_TABLE_ALL_COLUMNS.filter((column) =>
  (DEFAULT_KEYS as readonly string[]).includes(column.key),
);

export const LINK_TABLE_DEFAULT_KEYS = [...DEFAULT_KEYS];

/** Widths sum used by the table and the contract test. */
export function linkTableWidths(columns: readonly LinkTableColumn[] = LINK_TABLE_COLUMNS) {
  return columns.map((c) => c.width);
}

/* -------------------------------------------------------------------------- */
/* Periods (quarter report roll-forward)                                      */
/* -------------------------------------------------------------------------- */

export type QuarterPeriod = {
  q: 1 | 2 | 3 | 4;
  fyStart: number;
  fy: string;
  start: string;
  end: string;
  text: string;
};

/** Find a “Q1 (2026-27)”, “Q2 2026-27” or “Quarter 3 2026-27” period. */
export function quarterPeriodOf<T extends object>(item: T): QuarterPeriod | null {
  const record = item as { title?: string | null; remarks?: string | null };
  const text = `${record.title ?? ""} ${record.remarks ?? ""}`;
  const match = /\b(?:Q|Quarter\s*)([1-4])\s*[\(\-–—]?\s*(\d{4})\s*[\-–—]\s*(\d{2}|\d{4})\b/i.exec(
    text,
  );
  if (!match) return null;
  const q = Number(match[1]) as 1 | 2 | 3 | 4;
  const fyStart = Number(match[2]);
  const fy = `${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
  const startMonth = [4, 7, 10, 1][q - 1];
  const startYear = q === 4 ? fyStart + 1 : fyStart;
  const endMonth = [6, 9, 12, 3][q - 1];
  const last = new Date(Date.UTC(startYear, endMonth, 0)).getUTCDate();
  const start = `${startYear}-${String(startMonth).padStart(2, "0")}-01`;
  const end = `${startYear}-${String(endMonth).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { q, fyStart, fy, start, end, text: match[0] };
}

/** The next quarter’s label and its replacement string. */
export function nextQuarterPeriod(period: QuarterPeriod): QuarterPeriod {
  const q = (period.q === 4 ? 1 : period.q + 1) as 1 | 2 | 3 | 4;
  const fyStart = period.q === 4 ? period.fyStart + 1 : period.fyStart;
  const fy = `${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
  const startMonth = [4, 7, 10, 1][q - 1];
  const startYear = q === 4 ? fyStart + 1 : fyStart;
  const endMonth = [6, 9, 12, 3][q - 1];
  const last = new Date(Date.UTC(startYear, endMonth, 0)).getUTCDate();
  return {
    q,
    fyStart,
    fy,
    start: `${startYear}-${String(startMonth).padStart(2, "0")}-01`,
    end: `${startYear}-${String(endMonth).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
    text: `Q${q} (${fy})`,
  };
}

/** Advance every quarter label in the title and remarks to the next period. */
export function advanceQuarterText(text: string | null | undefined, period: QuarterPeriod): string | undefined {
  if (!text) return undefined;
  const next = nextQuarterPeriod(period);
  if (!period.text) return text;
  return text.split(period.text).join(next.text);
}

export function canRollForward(item: { title?: string | null; remarks?: string | null; status: string }, today: string): boolean {
  if (item.status !== "Completed") return false;
  const period = quarterPeriodOf(item);
  return !!period && period.end < today;
}

/* -------------------------------------------------------------------------- */
/* Small labels                                                                */
/* -------------------------------------------------------------------------- */

export function linkCountsLabel(counts: {
  total: number;
  dueSoon: number;
  overdue: number;
}): string {
  return `${counts.total} link${counts.total === 1 ? "" : "s"} · ${counts.dueSoon} due · ${counts.overdue} overdue`;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function dateStampIST(today: string): string {
  const [year, month, day] = today.split("-");
  return year && month && day ? `${day}-${month}-${year}` : today;
}

/** Export file name: `{District} Links Organiser {DD-MM-YYYY}`. */
export function linksFileName(district: string, today: string): string {
  return `${district || "District"} Links Organiser ${dateStampIST(today)}`;
}

/** Strip a Google Drive file id from a URL for display/safety. */
export function safeLinkUrl(raw: string): string {
  const clean = normalizeLinkUrl(raw);
  try {
    const url = new URL(clean);
    if (url.hostname.includes("drive.google.com")) {
      // Keep the link usable, but never surface the raw id in tooltips.
      return `${url.origin}/drive`;
    }
    return clean;
  } catch {
    return clean;
  }
}

/** A stable signature used to recognise an identical re-import. */
export function itemSignature(input: {
  title: string;
  categoryName: string;
  lastUpdated?: string | null;
  status: string;
  frequency: string;
  urls: { url: string; kind: string }[];
}): string {
  return [
    input.title.trim().toLowerCase(),
    input.categoryName.trim().toLowerCase(),
    input.lastUpdated ?? "",
    input.status.toLowerCase(),
    input.frequency,
    input.urls
      .map((u) => `${u.kind}:${normalizeLinkUrl(u.url)}`)
      .sort()
      .join("|"),
  ].join("::");
}

export { parseDateText };
