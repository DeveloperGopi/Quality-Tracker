import { i as isIsoDate, f as formatDateLong, a as addDays, d as daysBetweenIso } from './dateInput-0KZh0HdG.js';

const LINK_LEVELS = ["National", "State", "District"];
const LINK_VISIBILITIES = ["everyone", "editors", "admin"];
const LINK_VISIBILITY_LABEL = {
  everyone: "Everyone",
  editors: "Editors and Admin",
  admin: "Admin only"
};
const LINK_TYPE_LABEL = {
  web: "Website",
  sheet: "Google Sheet",
  doc: "Document",
  form: "Form",
  pdf: "PDF",
  drive: "Drive",
  video: "Video",
  other: "Other"
};
const LINK_COLOURS = {
  teal: {
    label: "Teal",
    dot: "bg-teal-500",
    chip: "border-teal-300/70 bg-teal-50 text-teal-900",
    hex: "#0f766e",
    fill: "FFCCFBF1"
  },
  blue: {
    label: "Blue",
    dot: "bg-sky-500",
    chip: "border-sky-300/70 bg-sky-50 text-sky-900",
    hex: "#0369a1",
    fill: "FFE0F2FE"
  },
  violet: {
    label: "Violet",
    dot: "bg-violet-500",
    chip: "border-violet-300/70 bg-violet-50 text-violet-900",
    hex: "#6d28d9",
    fill: "FFEDE9FE"
  },
  amber: {
    label: "Amber",
    dot: "bg-amber-500",
    chip: "border-amber-300/80 bg-amber-50 text-amber-900",
    hex: "#b45309",
    fill: "FFFEF3C7"
  },
  rose: {
    label: "Rose",
    dot: "bg-rose-500",
    chip: "border-rose-300/70 bg-rose-50 text-rose-900",
    hex: "#be123c",
    fill: "FFFFE4E6"
  },
  emerald: {
    label: "Emerald",
    dot: "bg-emerald-500",
    chip: "border-emerald-300/70 bg-emerald-50 text-emerald-900",
    hex: "#047857",
    fill: "FFD1FAE5"
  },
  slate: {
    label: "Slate",
    dot: "bg-slate-500",
    chip: "border-slate-300/70 bg-slate-50 text-slate-800",
    hex: "#475569",
    fill: "FFF1F5F9"
  }
};
function linkColour(key) {
  return LINK_COLOURS[key ?? "slate"] ?? LINK_COLOURS.slate;
}
const DEFAULT_LINK_FREQUENCIES = [
  { value: "one-time", label: "One-time" },
  { value: "weekly", label: "Weekly", days: 7 },
  { value: "monthly", label: "Monthly", months: 1 },
  { value: "every-2-months", label: "Every 2 months", months: 2 },
  { value: "quarterly", label: "Quarterly (3 months once)", months: 3 },
  { value: "half-yearly", label: "Half-yearly", months: 6 },
  { value: "yearly", label: "Yearly", months: 12 },
  { value: "custom-days", label: "Custom days", days: 0 }
];
const DEFAULT_LINK_STATUSES = [
  { name: "Active", tone: "teal", icon: "CircleDot", countsAsOpen: true },
  { name: "Completed", tone: "green", icon: "CheckCircle2", countsAsOpen: true },
  { name: "On hold", tone: "amber", icon: "PauseCircle", countsAsOpen: true },
  { name: "Archived", tone: "slate", icon: "Archive", countsAsOpen: false }
];
const LINK_STATUS_TONE_CLASS = {
  teal: "border-teal-300/70 bg-teal-50 text-teal-900",
  green: "border-emerald-300/70 bg-emerald-50 text-emerald-900",
  amber: "border-amber-300/80 bg-amber-50 text-amber-900",
  slate: "border-slate-300/70 bg-slate-50 text-slate-700",
  blue: "border-sky-300/70 bg-sky-50 text-sky-900",
  rose: "border-rose-300/70 bg-rose-50 text-rose-900"
};
const DEFAULT_LINKS_CONFIG = {
  statuses: DEFAULT_LINK_STATUSES,
  frequencies: DEFAULT_LINK_FREQUENCIES,
  dueSoonDays: 7,
  defaultVisibility: "everyone",
  notifyMode: "editors",
  sidebarBadge: false,
  defaultFilters: ["category", "status", "due"],
  linkCheckEnabled: false,
  linkCheckWeekly: false
};
function isStatusTone(value) {
  return value === "teal" || value === "green" || value === "amber" || value === "slate" || value === "blue" || value === "rose";
}
function normalizeLinksConfig(value) {
  const raw = value ?? {};
  const statuses = Array.isArray(raw.statuses) ? raw.statuses.filter((s) => !!s && typeof s.name === "string" && s.name.trim() !== "").map((s) => ({
    name: s.name.trim(),
    tone: isStatusTone(s.tone) ? s.tone : "slate",
    icon: typeof s.icon === "string" && s.icon ? s.icon : "Circle",
    countsAsOpen: s.countsAsOpen !== false
  })) : DEFAULT_LINK_STATUSES;
  const frequencies = Array.isArray(raw.frequencies) ? raw.frequencies.filter(
    (f) => !!f && typeof f.value === "string" && typeof f.label === "string"
  ) : DEFAULT_LINK_FREQUENCIES;
  const dueSoonDays = typeof raw.dueSoonDays === "number" && Number.isFinite(raw.dueSoonDays) ? Math.max(0, Math.min(60, Math.round(raw.dueSoonDays))) : DEFAULT_LINKS_CONFIG.dueSoonDays;
  const defaultFilters = Array.isArray(raw.defaultFilters) ? [...new Set(raw.defaultFilters.filter((key) => typeof key === "string" && !!key))].slice(0, 8) : DEFAULT_LINKS_CONFIG.defaultFilters;
  return {
    statuses: statuses.length ? statuses : DEFAULT_LINK_STATUSES,
    frequencies: frequencies.length ? frequencies : DEFAULT_LINK_FREQUENCIES,
    dueSoonDays,
    defaultVisibility: raw.defaultVisibility === "editors" || raw.defaultVisibility === "admin" ? raw.defaultVisibility : "everyone",
    notifyMode: raw.notifyMode === "owners" ? "owners" : "editors",
    sidebarBadge: raw.sidebarBadge === true,
    defaultFilters: defaultFilters.length ? defaultFilters : DEFAULT_LINKS_CONFIG.defaultFilters,
    linkCheckEnabled: raw.linkCheckEnabled === true,
    linkCheckWeekly: raw.linkCheckWeekly === true
  };
}
function linkStatusDef(config, name) {
  return config.statuses.find((s) => s.name === name) ?? config.statuses.find((s) => s.name.toLowerCase() === name.toLowerCase()) ?? config.statuses[0];
}
function frequencyOption(config, value) {
  return config.frequencies.find((f) => f.value === value);
}
function frequencyLabel(config, value) {
  return frequencyOption(config, value)?.label ?? (value === "one-time" ? "One-time" : value);
}
function addCalendarMonths(iso, months) {
  if (!isIsoDate(iso) || !Number.isInteger(months)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth() + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(d, last);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function computeNextDue(lastUpdated, frequency, customDays, frequencies = DEFAULT_LINK_FREQUENCIES) {
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
function dueStateLabel(result, config = DEFAULT_LINKS_CONFIG) {
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
function formatLinkDate(iso) {
  return iso && isIsoDate(iso) ? formatDateLong(iso) : "-";
}
function relativeUpdated(iso, today) {
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
const TRACKING_PARAMS = /* @__PURE__ */ new Set(["fbclid", "gclid", "mc_cid", "mc_eid", "igshid"]);
const SECRET_PARAMS = /* @__PURE__ */ new Set([
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
  "auth"
]);
const LINK_LABEL_MAX = 80;
const LINK_URL_MAX = 2048;
function stripInvisible(value) {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}
function normalizeLinkUrl(raw) {
  const clean = stripInvisible(raw);
  if (!clean) return "";
  try {
    const url = new URL(clean);
    const remove = [];
    url.searchParams.forEach((_value, key) => {
      const lower = key.toLowerCase();
      if (lower.startsWith("utm_") || TRACKING_PARAMS.has(lower)) remove.push(key);
    });
    for (const key of remove) url.searchParams.delete(key);
    let out = url.toString();
    if (out.endsWith("?")) out = out.slice(0, -1);
    return out;
  } catch {
    return clean;
  }
}
function secretParamsIn(raw) {
  try {
    const url = new URL(stripInvisible(raw));
    const found = [];
    url.searchParams.forEach((_value, key) => {
      if (SECRET_PARAMS.has(key.toLowerCase())) found.push(key);
    });
    return found;
  } catch {
    return [];
  }
}
function linkDomain(raw) {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
function looksLikeUrl(value) {
  const text = stripInvisible(value);
  return /^https?:\/\//i.test(text) || /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(text);
}
function validateLinkUrl(raw) {
  const original = stripInvisible(raw);
  const normalized = normalizeLinkUrl(original);
  const fail = (error, extra = {}) => ({
    ok: false,
    url: normalized,
    error,
    secretParams: extra.secretParams ?? [],
    warning: extra.warning ?? null,
    changedByNormalisation: normalized !== original
  });
  if (!original) return fail("Enter a link");
  if (original.length > LINK_URL_MAX) return fail(`A link can be at most ${LINK_URL_MAX} characters`);
  let url;
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
      "This link carries a credential (" + secrets.join(", ") + "). Remove the token/key parameter and use a link that does not require credentials.",
      {
        secretParams: secrets,
        warning: "This link may contain a secret. Use a link that does not carry credentials."
      }
    );
  }
  return {
    ok: true,
    url: normalized,
    error: null,
    secretParams: [],
    warning: null,
    changedByNormalisation: normalized !== original
  };
}
function detectLinkType(raw, label) {
  let url;
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
function suggestLinkLabel(raw) {
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
const LINK_TABLE_ALL_COLUMNS = [
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
  { key: "actions", label: "Actions", width: "5.5rem", align: "right" }
];
const DEFAULT_KEYS = ["report", "links", "schedule", "owner", "status", "actions"];
const LINK_TABLE_COLUMNS = LINK_TABLE_ALL_COLUMNS.filter(
  (column) => DEFAULT_KEYS.includes(column.key)
);
const LINK_TABLE_DEFAULT_KEYS = [...DEFAULT_KEYS];
function linkTableWidths(columns = LINK_TABLE_COLUMNS) {
  return columns.map((c) => c.width);
}
function quarterPeriodOf(item) {
  const record = item;
  const text = `${record.title ?? ""} ${record.remarks ?? ""}`;
  const match = /\b(?:Q|Quarter\s*)([1-4])\s*[\(\-–—]?\s*(\d{4})\s*[\-–—]\s*(\d{2}|\d{4})\b/i.exec(
    text
  );
  if (!match) return null;
  const q = Number(match[1]);
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
function nextQuarterPeriod(period) {
  const q = period.q === 4 ? 1 : period.q + 1;
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
    text: `Q${q} (${fy})`
  };
}
function canRollForward(item, today) {
  if (item.status !== "Completed") return false;
  const period = quarterPeriodOf(item);
  return !!period && period.end < today;
}
function linkCountsLabel(counts) {
  return `${counts.total} link${counts.total === 1 ? "" : "s"} · ${counts.dueSoon} due · ${counts.overdue} overdue`;
}
function dateStampIST(today) {
  const [year, month, day] = today.split("-");
  return year && month && day ? `${day}-${month}-${year}` : today;
}
function linksFileName(district, today) {
  return `${district || "District"} Links Organiser ${dateStampIST(today)}`;
}
function safeLinkUrl(raw) {
  const clean = normalizeLinkUrl(raw);
  try {
    const url = new URL(clean);
    if (url.hostname.includes("drive.google.com")) {
      return `${url.origin}/drive`;
    }
    return clean;
  } catch {
    return clean;
  }
}

export { safeLinkUrl as A, linkTableWidths as B, DEFAULT_LINKS_CONFIG as C, DEFAULT_LINK_FREQUENCIES as D, normalizeLinksConfig as E, LINK_COLOURS as F, LINK_STATUS_TONE_CLASS as L, DEFAULT_LINK_STATUSES as a, linkColour as b, LINK_LABEL_MAX as c, dueStateLabel as d, frequencyLabel as e, formatLinkDate as f, LINK_VISIBILITY_LABEL as g, computeNextDue as h, LINK_LEVELS as i, LINK_VISIBILITIES as j, detectLinkType as k, linkStatusDef as l, LINK_TYPE_LABEL as m, normalizeLinkUrl as n, linkDomain as o, looksLikeUrl as p, LINK_TABLE_ALL_COLUMNS as q, relativeUpdated as r, suggestLinkLabel as s, canRollForward as t, LINK_TABLE_DEFAULT_KEYS as u, validateLinkUrl as v, quarterPeriodOf as w, nextQuarterPeriod as x, linkCountsLabel as y, linksFileName as z };
