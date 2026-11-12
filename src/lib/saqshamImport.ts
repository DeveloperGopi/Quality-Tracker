/**
 * SaQsham DOCUMENT STATUS IMPORT — the pure engine.
 *
 * District staff download a status report from the SaQsham portal and upload
 * it. The portal export carries NO NIN, so matching is by Application No, then
 * by a saved alias, then by helper columns, then by a normalised name +
 * Facility Type, and finally by a fuzzy suggestion the user must confirm.
 *
 * EVERYTHING in this file is pure (no React, no Convex, no DOM), so:
 *   • the browser wizard computes the preview locally,
 *   • the Convex mutation re-runs the SAME rules as the authoritative pass
 *     before it writes anything, and
 *   • `scripts/saqshamImport.test.ts` pins the behaviour with golden fixtures.
 *
 * Nothing here writes to the database; the wizard only shows what WOULD change
 * and the confirmation step calls the mutation with the final decisions.
 */

// NOTE: relative import (not the "@/" alias) — Convex compiles this module for
// its own functions bundle, whose tsconfig does not carry the app path alias.
import { parseDateValue } from "./importMatch";
// One rule for "Result Declared can never be downgraded" (lib/resultDeclared).
import { importWouldDowngrade } from "./resultDeclared";
// ONE department / service-package rule for the sheet, profile and this parser.
import { HWC_SERVICE_PACKAGES } from "./departments";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Convert one JS value into something Convex can store: Dates become
 *  "yyyy-mm-dd" strings, undefined/objects/functions become null, plain
 *  objects/arrays are converted depth-first. react something else (a browser
 *  FormData, a circular ref…) is dropped to null rather than crashing the
 *  mutation. */
export function convexSafe(value: unknown): unknown {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(convexSafe);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const next = convexSafe(v);
      if (next !== undefined) out[k] = next;
      // Everything else (function, symbol, BigInt, WeakMap…) is dropped.
    }
    return out;
  }
  return null;
}

/* --------------------------------------------------------------------------- */
/* Options                                                                      */
/* --------------------------------------------------------------------------- */

export type SaqshamCleanOptions = {
  /** The app's district (default "Tirupathur") — a row naming another district
   *  is flagged and skipped by default. */
  district?: string;
  /** The state the tracker covers. */
  state?: string;
  /** Category → Facility Type map (admin-editable). */
  categoryTypeMap?: Record<string, string>;
  /** Known applied-department names for the longest-match parser. */
  knownDepartments?: readonly string[];
  /** Parse "Applied Departments" at all (Part 0.2). The cell is only parsed
   *  when the user ticks the optional "Applied Departments" update; otherwise
   *  the raw text is kept untouched and no note is raised. */
  parseDepartments?: boolean;
};

export const DEFAULT_DISTRICT = "Tirupathur";
export const DEFAULT_STATE = "Tamil Nadu";

/** Portal "Facility Name/Category" category → the app's Facility Type.
 *  Editable in Admin Settings; this is the seed. */
export const DEFAULT_CATEGORY_TYPE_MAP: Record<string, string> = {
  UAMM: "UHWC",
  HWC: "HWC HSC",
  PHC: "PHC",
  UPHC: "UPHC",
};

/** Seed list of applied-department names used by `parseAppliedDepartments`.
 *  The real portal list is long and comma-laden; the parser matches these
 *  longest-first, so an exact list is not required — only enough names to let
 *  the stated leading count be validated. Admin-editable in a later pass. */
export const DEFAULT_APPLIED_DEPARTMENTS: readonly string[] = [
  "Basic Oral health care",
  "Obstetrics & Gynaecology",
  "General Medicine",
  "Family Planning",
  "Immunization",
  "Paediatrics",
  "Emergency",
  "Pharmacy",
  "Labour Room",
  "Mental Health",
  "Non Communicable Diseases",
  "Communicable Diseases",
  "National Health Programmes",
  "Ward",
  "Lab",
  "OT",
  "OPD",
  "Ayush",
  "Dental",
];

/**
 * PARSE SEED (Part 0.2). The portal prints TWO different lists:
 *   • HWC HSC rows list the 12 service packages
 *     ("12Antenatal & Postnatal Care, …"),
 *   • PHC/CHC rows list the hospital departments
 *     ("6OPD, Emergency, Pharmacy, Lab, Ward, OT").
 * Parsing against only one of them stopped at the first unknown name — an
 * HWC row parsed 1 of 12 and raised "Stated 12 departments but parsed 1".
 * The parser now matches longest-first against BOTH lists (the same
 * `HWC_SERVICE_PACKAGES` the sheet, profile and reports use — ONE rule).
 */
export const KNOWN_DEPARTMENT_NAMES: readonly string[] = [
  ...new Set([...HWC_SERVICE_PACKAGES, ...DEFAULT_APPLIED_DEPARTMENTS]),
];

/* --------------------------------------------------------------------------- */
/* Status mapping — portal Status → Report value                                */
/* --------------------------------------------------------------------------- */

export type StatusMapEntry = {
  portal: string;
  report: string;
  version?: number;
  /** Earlier portal spellings that still resolve to this row. */
  aliases?: string[];
  /** Saved display order in the mapping table. */
  order?: number;
};

/**
 * SEED map (SaQsham portal Status → "Documents Status (Report)").
 * The portal spells "Genaration" this way on purpose — matched verbatim, so
 * do not "fix" the spelling. `""` means no destination has been confirmed yet.
 * Result Declared ships blank and stays "Needs mapping" until a State Admin
 * picks the Documents Status (Report); imports never guess it.
 */
export const SAQSHAM_STATUS_MAP: StatusMapEntry[] = [
  { portal: "Documents Pending at Facility", report: "Documents Pending at Facility" },
  { portal: "Assessment Approved by DQAU & Pending for Receive by RQAU", report: "Document in RQAU login" },
  { portal: "Assessment Received by RQAU & In -Process", report: "Document in RQAU login" },
  { portal: "Assessment Approved by DQAU/RQAU & Pending for Receive by SQAU", report: "Document in SQAU login" },
  { portal: "Document in SQAU login", report: "Document in SQAU login" },
  { portal: "Assessment Approved by SQAU & Pending for Receive by Nodal Officer", report: "Document in SQAU login" },
  { portal: "Assessment Approved by Nodal Officer & Pending for MD Approval", report: "Document in SQAU login" },
  { portal: "Assessment Reverted- Need Correction", report: "Document in SQAU login" },
  { portal: "Assessment Submitted by Facility & Pending for Receive by DQAU", report: "Document in SQAU login" },
  { portal: "Assessment Received by DQAU & In -Process", report: "Document in SQAU login" },
  { portal: "Assessment Received by SQAU & In -Process", report: "Document in SQAU login" },
  { portal: "Assessment Review in Process", report: "Document in SQAU login" },
  { portal: "Assessment Received by QPS Division", report: "Document forwarded to NHSRC" },
  { portal: "Approved by MD & Pending for Receive by QPS Division", report: "Document forwarded to NHSRC" },
  { portal: "Assessment Approved by QPS Division & Pending for Receive by Certification Unit", report: "Document forwarded to NHSRC" },
  { portal: "Pending for Assessor Selection", report: "NA Scheduled" },
  { portal: "Assessor Selection In-Process & Sent to Assessor for Accept, Reject and Reconfirmed", report: "NA Scheduled" },
  { portal: "Proposed Dates Accepted by Facility & Pending at Certification Unit for Receiving", report: "NA Scheduled" },
  { portal: "Letter Forwarding Pending", report: "NA Scheduled" },
  { portal: "Document Genaration Done", report: "NA Scheduled" },
  { portal: "Assessor Selection & Declaration of Impartiality Done", report: "NA Scheduled" },
  { portal: "Dates Proposed for Assessment & Sent to Facility , Receive Pending at Facility", report: "NA Scheduled" },
  { portal: "Send ToolKit Pending", report: "NA Scheduled" },
  { portal: "Intimation Letter Pending", report: "NA Scheduled" },
  { portal: "Document Genaration In Process", report: "NA Scheduled" },
  { portal: "Assessor Result Entry /Document Upload Inprocess", report: "NA Completed & Awaiting Results" },
  { portal: "Result processing pending at Certification Unit", report: "NA Completed & Awaiting Results" },
  { portal: "Assessor Result Document Verification Pending at Certification Unit", report: "NA Completed & Awaiting Results" },
  { portal: "Assessment Result Entry Processing Pending at Certification Unit", report: "NA Completed & Awaiting Results" },
  { portal: "Result Declared", report: "" },
];

/** The distinct report values — the "Documents Status (Report)" dropdown. */
export const REPORT_STATUS_VALUES: string[] = [
  "Documents Pending at Facility",
  "Document in RQAU login",
  "Document in SQAU login",
  "Document forwarded to NHSRC",
  "NA Scheduled",
  "NA Completed & Awaiting Results",
];

export type SaqshamReportGroup = {
  name: string;
  color: string;
  order: number;
  /** Result Declared is created by the app and cannot be deleted. */
  system?: boolean;
};

export const SAQSHAM_GROUP_COLORS = [
  "#2563EB",
  "#0F766E",
  "#7C3AED",
  "#B45309",
  "#BE123C",
  "#0369A1",
  "#4D7C0F",
  "#9A3412",
  "#4338CA",
  "#0E7490",
] as const;

/** The shipped groups. Result Declared is a system group; its seed mapping
 *  intentionally stays blank so the mapping screen shows "Needs mapping". */
export const DEFAULT_REPORT_GROUPS: SaqshamReportGroup[] = [
  ...REPORT_STATUS_VALUES.map((name, order) => ({
    name,
    color: SAQSHAM_GROUP_COLORS[order % SAQSHAM_GROUP_COLORS.length],
    order,
  })),
  { name: "Result Declared", color: "#334155", order: REPORT_STATUS_VALUES.length, system: true },
];

/** Names only — used by the import wizard's report dropdown. */
export function reportGroupNames(groups: readonly SaqshamReportGroup[]): string[] {
  return groups.map((g) => g.name);
}

/**
 * The lifecycle order of the report groups, used only to tell the user when a
 * portal status moved BACKWARDS (an honest amber "Status moved back" chip) —
 * never to block a row. A group missing from this list has no rank (null).
 */
export const REPORT_STATUS_ORDER: string[] = [
  "Documents Pending at Facility",
  "NA Scheduled",
  "NA Completed & Awaiting Results",
  "Document in RQAU login",
  "Document in SQAU login",
  "Document forwarded to NHSRC",
  "Result declared",
];

/** Position of a report value in the lifecycle, or null when it has none. */
export function reportStatusRank(value: string | null | undefined): number | null {
  const key = normalizeStatusKey(value);
  if (!key) return null;
  const idx = REPORT_STATUS_ORDER.findIndex((v) => normalizeStatusKey(v) === key);
  return idx < 0 ? null : idx;
}

/** Normalise a status for lookup: lowercase, collapse spaces, ignore spaces
 *  around hyphens. "In -Process" and "In-Process" compare equal. */
export function normalizeStatusKey(value: unknown): string {
  return String(value ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .trim();
}

export function normalizeStatusMap(rows: readonly StatusMapEntry[]): StatusMapEntry[] {
  return rows.map((r) => {
    const aliases = (r.aliases ?? [])
      .map((alias) => String(alias ?? "").trim())
      .filter(Boolean);
    return {
      portal: String(r.portal ?? "").trim(),
      report: String(r.report ?? "").trim(),
      version: r.version,
      ...(aliases.length ? { aliases } : {}),
      ...(r.order != null ? { order: r.order } : {}),
    };
  });
}

/** Is this the "Result Declared" portal status (destination must be chosen)? */
export function isResultDeclared(portalStatus: unknown): boolean {
  return normalizeStatusKey(portalStatus) === normalizeStatusKey("Result Declared");
}

/**
 * The Report value for a portal status.
 *   • a string  → the confirmed group,
 *   • null      → UNMAPPED / still "Needs mapping" (never guessed).
 *
 * Result Declared deliberately starts blank. It returns null until a State
 * Admin saves a destination, so an import cannot silently write a report
 * group that nobody confirmed.
 */
export function reportStatusFor(
  portalStatus: unknown,
  map: readonly StatusMapEntry[] = SAQSHAM_STATUS_MAP,
): string | null {
  const key = normalizeStatusKey(portalStatus);
  if (!key) return null;
  const hit = map.find(
    (m) =>
      normalizeStatusKey(m.portal) === key ||
      (m.aliases ?? []).some((alias) => normalizeStatusKey(alias) === key),
  );
  if (!hit) return null;
  if (isResultDeclared(hit.portal) && !String(hit.report ?? "").trim()) return null;
  return hit.report;
}

/* --------------------------------------------------------------------------- */
/* Cleaning rules (pure, unit-tested)                                           */
/* --------------------------------------------------------------------------- */

/**
 * 1. STATUS DE-DUPLICATION.
 * The portal sometimes emits the same phrase twice, with or without a space
 * between the copies:
 *   "Assessor Result Entry /Document Upload InprocessAssessor Result Entry …"
 *     → "Assessor Result Entry /Document Upload Inprocess"
 * Collapse whitespace, then if the text is exactly two copies of a shorter
 * phrase, keep one.
 */
export function dedupeRepeatedPhrase(input: unknown): string {
  const s = String(input ?? "").replace(/\s+/g, " ").trim();
  if (!s) return s;
  const n = s.length;
  // No separator: "tt" → "t"
  if (n % 2 === 0 && s.slice(0, n / 2) === s.slice(n / 2)) return s.slice(0, n / 2);
  // One space between the copies: "t t" → "t"
  if (n % 2 === 1) {
    const mid = (n - 1) / 2;
    if (s[mid] === " " && s.slice(0, mid) === s.slice(mid + 1)) return s.slice(0, mid);
  }
  return s;
}

/**
 * 2. FACILITY NAME / CATEGORY. Split on the LAST "/" into name and category.
 * The raw text is always kept for display/audit.
 */
export function splitNameCategory(raw: unknown): {
  raw: string;
  name: string;
  category: string;
} {
  const text = String(raw ?? "").trim();
  const idx = text.lastIndexOf("/");
  if (idx < 0) return { raw: text, name: text, category: "" };
  return {
    raw: text,
    name: text.slice(0, idx).trim(),
    category: text.slice(idx + 1).trim(),
  };
}

/**
 * 3. CATEGORY → FACILITY TYPE. UAMM → UHWC, HWC → HWC HSC, PHC → PHC,
 * UPHC → UPHC. Unknown categories return null (the caller raises a warning).
 */
export function mapCategoryToType(
  category: string,
  map: Record<string, string> = DEFAULT_CATEGORY_TYPE_MAP,
): string | null {
  const key = String(category ?? "").trim().toUpperCase();
  if (!key) return null;
  const direct = map[key];
  if (direct) return direct;
  // Case-insensitive lookup of the seed keys.
  const found = Object.keys(map).find((k) => k.toUpperCase() === key);
  return found ? map[found] : null;
}

/** Raw cell kept, nothing parsed ("Applied Departments" option off). */
export function emptyParsedDepartments(raw: string): ParsedDepartments {
  return { raw: raw.trim(), statedCount: null, departments: [], ok: true, note: null };
}

export type ParsedDepartments = {
  raw: string;
  /** The count written at the start of the cell, when present. */
  statedCount: number | null;
  /** Department names found in the text, longest-match-first, in order. */
  departments: string[];
  /** True when statedCount is absent or equals departments.length. */
  ok: boolean;
  note: string | null;
};

/**
 * 4. APPLIED DEPARTMENTS. The cell starts with a count then the list:
 *   "12Basic Oral health care, General Medicine, …" → count 12 + names.
 * Some department names contain commas, so we never split on ","; instead the
 * known names are matched longest-first and the leading count validates the
 * result. Whitespace (including non-breaking spaces) is normalised first.
 * A count mismatch keeps the raw text and raises an INFO TAG — it never
 * changes a row's state (Part 0.2).
 */
export function parseAppliedDepartments(
  input: unknown,
  knownDepartments: readonly string[] = KNOWN_DEPARTMENT_NAMES,
): ParsedDepartments {
  const raw = String(input ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return { raw: "", statedCount: null, departments: [], ok: true, note: null };

  const countMatch = /^(\d{1,3})\s*/.exec(raw);
  const statedCount = countMatch ? Number(countMatch[1]) : null;
  let body = countMatch ? raw.slice(countMatch[0].length) : raw;
  // The count runs straight into the first name ("12Antenatal…"); normalise
  // the boundary so the first name still matches.
  body = body.replace(/^\s+/, "");

  // Longest names first, so "Basic Oral health care" wins over "Oral".
  const names = [...knownDepartments]
    .map((n) => n.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const departments: string[] = [];
  let rest = body;
  let guard = 0;
  while (rest.trim() && guard++ < 200) {
    const hit = names.find((n) => rest.toLowerCase().startsWith(n.toLowerCase()));
    if (!hit) break;
    departments.push(hit);
    rest = rest.slice(hit.length).replace(/^[\s,;/&]+/, "");
  }
  const trailing = rest.trim();
  const ok =
    (statedCount == null || statedCount === departments.length) && trailing.length === 0;
  const note =
    statedCount != null && statedCount !== departments.length
      ? `Stated ${statedCount} departments but parsed ${departments.length} — raw text kept`
      : trailing
        ? `Unparsed department text: “${trailing.slice(0, 60)}”`
        : null;
  return {
    raw,
    statedCount,
    departments: ok ? departments : [],
    ok,
    note,
  };
}

export type ParsedLastUpdate = { raw: string; date: string | null; updatedBy: string | null };

/**
 * 5. LAST UPDATE DTLS. A parseable date is stored as a date; anything else is
 * the "Last updated by" person, e.g. "RAMAMURTHI K(RQAU)".
 */
export function parseLastUpdateDtls(input: unknown): ParsedLastUpdate {
  const raw = String(input ?? "").trim();
  if (!raw) return { raw: "", date: null, updatedBy: null };
  const date = parseSaqshamDate(raw);
  if (date) return { raw, date, updatedBy: null };
  return { raw, date: null, updatedBy: raw };
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * 6. Flexible date parse → ISO yyyy-mm-dd. Handles real Dates, Excel serials,
 * "dd-mm-yyyy", "yyyy-mm-dd", and the portal's "6-Oct-2026" / "05-Aug-2026"
 * month-name form.
 */
export function parseSaqshamDate(input: unknown): string | null {
  if (input == null || input === "") return null;
  const s = String(input).trim();
  // "6-Oct-2026" / "06-October-2026" / "Oct 6, 2026"
  const m = /^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{2,4})$/.exec(s);
  if (m) {
    const day = Number(m[1]);
    const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    if (month) return isoFromParts(year, month, day);
  }
  return parseDateValue(input);
}

function isoFromParts(y: number, mo: number, d: number): string | null {
  if (y < 1990 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d, 12));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/* --------------------------------------------------------------------------- */
/* Column model — portal columns + the user's optional helper columns           */
/* --------------------------------------------------------------------------- */

export type PortalColumnKey =
  | "applicationNo"
  | "assessmentType"
  | "facilityNameCategory"
  | "assessmentMode"
  | "state"
  | "district"
  | "appliedDepartments"
  | "appliedDate"
  | "status"
  | "lastUpdate";

export type HelperColumnKey =
  | "helperFacilityType"
  | "helperBlock"
  | "helperPhc"
  | "helperName";

export type ColumnSpec = {
  key: PortalColumnKey | HelperColumnKey;
  label: string;
  required: boolean;
  kind: "portal" | "helper";
  /** Case/space-insensitive header aliases — first match wins. */
  aliases: RegExp[];
};

export const PORTAL_COLUMNS: ColumnSpec[] = [
  { key: "applicationNo", label: "Application No", required: true, kind: "portal", aliases: [/application\s*no/i, /appl.*no/i, /application\s*number/i] },
  { key: "assessmentType", label: "Assessment Type", required: false, kind: "portal", aliases: [/assessment\s*type/i] },
  { key: "facilityNameCategory", label: "Facility Name/Category", required: true, kind: "portal", aliases: [/facility\s*name\s*\/?\s*category/i, /facility\s*name/i, /institution/i] },
  { key: "assessmentMode", label: "Assessment Mode / Program", required: false, kind: "portal", aliases: [/assessment\s*mode/i, /program/i] },
  { key: "state", label: "State", required: false, kind: "portal", aliases: [/^state$/i] },
  { key: "district", label: "District", required: false, kind: "portal", aliases: [/district/i] },
  { key: "appliedDepartments", label: "Applied Departments", required: false, kind: "portal", aliases: [/applied\s*department/i, /departments?/i] },
  { key: "appliedDate", label: "Applied Date", required: false, kind: "portal", aliases: [/applied\s*date/i] },
  { key: "status", label: "Status", required: true, kind: "portal", aliases: [/^status$/i, /portal\s*status/i] },
  { key: "lastUpdate", label: "Last Update Dtls", required: false, kind: "portal", aliases: [/last\s*update/i] },
];

export const HELPER_COLUMNS: ColumnSpec[] = [
  { key: "helperFacilityType", label: "Facility_Type", required: false, kind: "helper", aliases: [/facility[_\s]*type(?!\s*name)/i] },
  { key: "helperBlock", label: "Name of the Block", required: false, kind: "helper", aliases: [/block/i] },
  { key: "helperPhc", label: "Name of the PHC", required: false, kind: "helper", aliases: [/phc/i] },
  { key: "helperName", label: "Name of the Facility", required: false, kind: "helper", aliases: [/facility[_\s]*name/i] },
];

/** Column keys required to continue — a missing one opens the mapping step. */
export const REQUIRED_COLUMN_KEYS: (PortalColumnKey | HelperColumnKey)[] =
  PORTAL_COLUMNS.filter((c) => c.required).map((c) => c.key);

export const ALL_COLUMNS: ColumnSpec[] = [...PORTAL_COLUMNS, ...HELPER_COLUMNS];

/** Trim a header cell. */
export function normalizeHeader(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Make duplicate header names unique: "Status", "Status__2"; "Facility Type",
 * "Facility Type__2". Empty headers are dropped (the caller keeps their index
 * so cell mapping still works), so return a parallel array of names.
 */
export function uniqueHeaders(rawHeaders: readonly unknown[]): { names: string[]; keptIndexes: number[] } {
  const seen = new Map<string, number>();
  const names: string[] = [];
  const keptIndexes: number[] = [];
  rawHeaders.forEach((h, i) => {
    const name = normalizeHeader(h);
    if (!name) return; // ignore columns with an empty header
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    names.push(count === 0 ? name : `${name}__${count + 1}`);
    keptIndexes.push(i);
  });
  return { names, keptIndexes };
}

/** First row (within the first 10) with at least two non-empty cells is the
 *  header — portal exports often carry a title banner above it. */
export function detectHeaderRow(rows: readonly unknown[][]): number {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const filled = (rows[i] ?? []).filter((c) => c != null && String(c).trim() !== "");
    if (filled.length >= 2) return i;
  }
  return 0;
}

/** Auto-map logical columns to header indexes (first match wins, no reuse). */
export function autoMapColumns(
  headers: readonly string[],
  specs: readonly ColumnSpec[] = ALL_COLUMNS,
): Record<string, number | null> {
  const map: Record<string, number | null> = {};
  const used = new Set<number>();
  for (const spec of specs) {
    let idx = -1;
    for (let i = 0; i < headers.length; i++) {
      if (used.has(i)) continue;
      if (spec.aliases.some((re) => re.test(headers[i]))) {
        idx = i;
        break;
      }
    }
    map[spec.key] = idx >= 0 ? idx : null;
    if (idx >= 0) used.add(idx);
  }
  return map;
}

/* --------------------------------------------------------------------------- */
/* Cleaned row                                                                  */
/* --------------------------------------------------------------------------- */

export type CleanedRow = {
  /** 1-based data-row number (blank rows already removed). */
  rowNo: number;
  /** 1-based sheet row, for the audit trail. */
  sourceRowNo: number;
  /** Every original cell, keyed by header name — audit + import report. */
  raw: Record<string, unknown>;
  applicationNo: string;
  assessmentType: string;
  portalFacilityRaw: string;
  name: string;
  category: string;
  facilityType: string;
  facilityTypeKnown: boolean;
  statusRaw: string;
  reportStatus: string | null;
  resultDeclared: boolean;
  appliedDepartments: ParsedDepartments;
  appliedDate: string | null;
  lastUpdate: ParsedLastUpdate;
  state: string;
  district: string;
  /** District/state outside the app's scope (flagged + skipped by default). */
  differentScope: boolean;
  helper: { facilityType: string; block: string; phc: string; name: string };
  assessmentMode: string;
  warnings: string[];
};

export function cleanSaqshamRow(
  row: {
    rowNo: number;
    sourceRowNo: number;
    headerNames: readonly string[];
    cells: readonly unknown[];
    map: Record<string, number | null>;
  },
  opts: SaqshamCleanOptions = {},
  statusMap: readonly StatusMapEntry[] = SAQSHAM_STATUS_MAP,
): CleanedRow {
  const district = opts.district ?? DEFAULT_DISTRICT;
  const state = opts.state ?? DEFAULT_STATE;
  const categoryTypeMap = opts.categoryTypeMap ?? DEFAULT_CATEGORY_TYPE_MAP;
  const knownDepartments = opts.knownDepartments ?? KNOWN_DEPARTMENT_NAMES;

  const cell = (key: string): unknown => {
    const idx = row.map[key];
    return idx == null ? undefined : row.cells[idx];
  };

  const raw: Record<string, unknown> = {};
  row.headerNames.forEach((h, i) => {
    if (h) raw[h] = row.cells[i] ?? null;
  });

  const warnings: string[] = [];

  const applicationNo = String(cell("applicationNo") ?? "").trim();
  const { raw: portalFacilityRaw, name, category } = splitNameCategory(cell("facilityNameCategory"));

  const facilityType = mapCategoryToType(category, categoryTypeMap);
  const facilityTypeKnown = facilityType != null;
  if (!facilityTypeKnown && category) {
    warnings.push(`Unknown category “${category}” — pick a Facility Type or match manually`);
  }

  const statusRaw = dedupeRepeatedPhrase(cell("status"));
  const reportStatus = reportStatusFor(statusRaw, statusMap);
  const resultDeclared = isResultDeclared(statusRaw);

  const appliedDepartments = opts.parseDepartments
    ? parseAppliedDepartments(cell("appliedDepartments"), knownDepartments)
    : // Not parsing — the raw text is still kept for the drawer and the report.
      emptyParsedDepartments(String(cell("appliedDepartments") ?? ""));
  // The count-mismatch note is an INFO TAG (shown on the row), never a
  // warning: it must not move the row out of "No change" (Part 0.2).

  const lastUpdate = parseLastUpdateDtls(cell("lastUpdate"));
  const appliedDate = parseSaqshamDate(cell("appliedDate"));

  const rowDistrict = String(cell("district") ?? "").replace(/\s+/g, " ").trim();
  const rowState = String(cell("state") ?? "").replace(/\s+/g, " ").trim();
  const differentScope =
    (!!rowDistrict && !sameText(rowDistrict, district)) ||
    (!!rowState && !sameText(rowState, state));
  if (differentScope) {
    warnings.push(
      `Different district/state (${[rowDistrict, rowState].filter(Boolean).join(", ")}) — skipped by default`,
    );
  }

  return {
    rowNo: row.rowNo,
    sourceRowNo: row.sourceRowNo,
    raw,
    applicationNo,
    assessmentType: String(cell("assessmentType") ?? "").trim(),
    portalFacilityRaw,
    name,
    category,
    facilityType: facilityType ?? "",
    facilityTypeKnown,
    statusRaw,
    reportStatus,
    resultDeclared,
    appliedDepartments,
    appliedDate,
    lastUpdate,
    state: rowState,
    district: rowDistrict,
    differentScope,
    helper: {
      facilityType: String(cell("helperFacilityType") ?? "").trim(),
      block: String(cell("helperBlock") ?? "").trim(),
      phc: String(cell("helperPhc") ?? "").trim(),
      name: String(cell("helperName") ?? "").trim(),
    },
    assessmentMode: String(cell("assessmentMode") ?? "").trim(),
    warnings,
  };
}

function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/* --------------------------------------------------------------------------- */
/* Name normalisation + matching                                                */
/* --------------------------------------------------------------------------- */

/**
 * 4. EXACT-MATCH KEY. Lowercase; strip spaces, dots, hyphens and brackets;
 * fold the common Tamil transliteration variants (pettai/pet/pettu,
 * palli/pally, oor/ur/oar, oo/u, j/z); and drop a trailing type token so
 * "Nilavoor HWC" and "Nilavur" compare equal.
 */
export function normalizeFacilityKey(name: unknown): string {
  let s = String(name ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
  s = s
    .replace(/pettai/g, "pet")
    .replace(/pettu/g, "pet")
    .replace(/pally/g, "palli")
    .replace(/oar/g, "ur")
    .replace(/oor/g, "ur")
    .replace(/oo/g, "u")
    .replace(/z/g, "j");
  s = s.replace(/(uhwc|uphc|hwc|phc|hsc|ugphc|chq|chc|dhqh|sdh)$/, "");
  return s;
}

/** Plain alphanumeric key (no equivalence folding) — used for fuzzy scoring,
 *  where Jaro-Winkler wants the closer of the two spellings. */
export function plainFacilityKey(name: unknown): string {
  return String(name ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/** Jaro similarity (0..1). */
export function jaro(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  if (la === 0 || lb === 0) return 0;
  const range = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
  const aFlags = new Array<boolean>(la).fill(false);
  const bFlags = new Array<boolean>(lb).fill(false);
  let matches = 0;
  for (let i = 0; i < la; i++) {
    const lo = Math.max(0, i - range);
    const hi = Math.min(i + range + 1, lb);
    for (let j = lo; j < hi; j++) {
      if (bFlags[j] || a[i] !== b[j]) continue;
      aFlags[i] = true;
      bFlags[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < la; i++) {
    if (!aFlags[i]) continue;
    while (!bFlags[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;
  return (matches / la + matches / lb + (matches - transpositions) / matches) / 3;
}

/** Jaro-Winkler similarity (0..1) — boosts a shared prefix. */
export function jaroWinkler(a: string, b: string): number {
  const sim = jaro(a, b);
  if (sim < 0.7) return sim;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return sim + prefix * 0.1 * (1 - sim);
}

/** Drop Latin vowels from the folded name key — the consonant skeleton that
 *  survives the vowel shifts common in Tamil place-name transliterations
 *  (Jafarabad/Zafrabad, Tirupathur/Tirupattur, Nilavoor/Nilavur). Built on
 *  `normalizeFacilityKey` so the j/z, oo/u, oor/ur equivalences apply first. */
export function consonantKey(name: unknown): string {
  return normalizeFacilityKey(name).replace(/[aeiou]/g, "");
}

/**
 * Transliteration-robust similarity 0..1 — the MAX of
 *   • Jaro-Winkler on the plain spellings, and
 *   • Jaro-Winkler on the consonant skeletons,
 * so a vowel-only difference still scores high enough to be offered as a
 * suggestion (never auto-applied — a suggestion always needs the user).
 */
export function fuzzyScore(a: unknown, b: unknown): number {
  const pa = plainFacilityKey(a);
  const pb = plainFacilityKey(b);
  const plain = jaroWinkler(pa, pb);
  const ca = consonantKey(a);
  const cb = consonantKey(b);
  const skeleton = ca && cb ? jaroWinkler(ca, cb) : 0;
  return Math.max(plain, skeleton);
}

/** A light view of a facility — enough to match and preview, so tests do not
 *  need Convex documents. */
export type SaqshamFacility = {
  id: string;
  name: string;
  block: string;
  phc: string;
  facilityType: string;
  /** Saved from an earlier import — the strongest signal (100%). */
  saqshamApplicationNo?: string | null;
  /** Part 4: the exact "Facility Name/Category" portal text kept from the
   *  last confirmed import — matching step 2 (exact normalized match, 100%).
   *  Never normalized when stored; compared via normalizeFacilityKey. */
  saqshamNameCategory?: string | null;
  /** Current portal status text (the "SaQsham Documents Status" value). */
  docsStatus?: string | null;
  /** Current derived report value. */
  docsStatusReport?: string | null;
  /** ISO date the portal last updated this facility's status. */
  saqshamPortalUpdatedOn?: string | null;
  /** The stored "Facility for Formula" key (facilityKey) — matching step 3. */
  facilityKey?: string | null;
  /** Epoch ms of the last SaQsham import that wrote this facility — the
   *  duplicate banner (Part 3.2.2) reads it; never a flag per row. */
  saqshamImportedAt?: number | null;
};

export type FacilityAlias = {
  /** normalizeFacilityKey(portal name). */
  portalNameNormalized: string;
  facilityType: string;
  facilityId: string;
  /** True for the one-time shipped seed (shown as "Seeded alias" and saved
   *  to the alias table when the user confirms the import). */
  seeded?: boolean;
};

/**
 * ONE-TIME ALIAS SEED — three portal names resolved once by hand,
 * shown in the preview as "Seeded alias" and saved to the alias table as
 * soon as the user confirms the import (so later runs match automatically
 * through the stored alias, not through this seed).
 */
export const SAQSHAM_ALIAS_SEED: { portalName: string; facilityType: string; facilityName: string; block: string; phc: string }[] = [
  { portalName: "Kaspa -B", facilityType: "UHWC", facilityName: "Kanigapuram", block: "Madhanur", phc: "Kaspa UPHC" },
  { portalName: "Narayanapuram", facilityType: "HWC HSC", facilityName: "Narayanapuram", block: "Natrampalli", phc: "Ramanaickenpettai" },
  { portalName: "Jafarabad", facilityType: "HWC HSC", facilityName: "Zafrabad", block: "Alangayam", phc: "Udhayenthiram" },
];

/** Resolve the seed into alias rows against the candidate list (the wizard's
 *  local copy of the facilities). Names repeat across Facility/PHC/Block, so
 *  the seed requires name + type + block + PHC to agree — otherwise the seed
 *  would be as ambiguous as the raw name. */
export function seedAliasesForFacilities(
  facilities: readonly SaqshamFacility[],
): FacilityAlias[] {
  const out: FacilityAlias[] = [];
  for (const seed of SAQSHAM_ALIAS_SEED) {
    const key = normalizeFacilityKey(seed.portalName);
    const hit = facilities.find(
      (f) =>
        normalizeFacilityKey(f.name) === normalizeFacilityKey(seed.facilityName) &&
        normalizeFacilityKey(f.block) === normalizeFacilityKey(seed.block) &&
        normalizeFacilityKey(f.phc) === normalizeFacilityKey(seed.phc) &&
        f.facilityType === seed.facilityType,
    );
    if (hit) out.push({ portalNameNormalized: key, facilityType: seed.facilityType, facilityId: hit.id, seeded: true });
  }
  return out;
}

/**
 * The NAME SEGMENTS a stored facility_key exposes. Keys arrive as
 * name_type / name_phc_type / name_block_type / name_block_phc_type (the
 * "Facility for Formula" forms), but producers are not perfectly consistent
 * — so EVERY underscore-separated segment is a candidate name, e.g.
 * "Pudurnadu_Puliyur_HWC HSC" offers both "Pudurnadu" and "Puliyur" while
 * "Kaspa -B_UHWC" offers "Kaspa -B". Segments that are themselves a Facility
 * Type token are skipped.
 */
export function facilityKeyNameSegments(key: string): string[] {
  const segments = String(key ?? "")
    .split("_")
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const s of segments) {
    const isType = Object.values(DEFAULT_CATEGORY_TYPE_MAP).some(
      (t) => normalizeFacilityKey(t) === normalizeFacilityKey(s),
    );
    if (s && !isType && !out.includes(s)) out.push(s);
  }
  return out;
}

export type MatchMethod =
  | "application_no"
  | "portal_name"
  | "alias"
  | "facility_key"
  | "helper"
  | "exact"
  | "fuzzy"
  | "manual"
  | "none";

export type MatchCandidate = { facilityId: string; score: number };

export type MatchOutcome =
  | { status: "matched"; method: MatchMethod; confidence: number; facilityId: string; seeded?: boolean }
  | { status: "ambiguous"; candidates: MatchCandidate[] }
  | { status: "suggested"; candidates: MatchCandidate[] }
  | { status: "unmatched"; candidates: MatchCandidate[] };

const FUZZY_FLOOR = 70;
const FUZZY_CONFIDENT = 95;

/** Score every same-type facility against the row name (0–100). */
export function fuzzyCandidates(
  row: { name: string; facilityType: string },
  facilities: readonly SaqshamFacility[],
  limit = 3,
): MatchCandidate[] {
  const scored = facilities
    .filter((f) => !row.facilityType || f.facilityType === row.facilityType)
    .map((f) => ({
      facilityId: f.id,
      score: Math.round(fuzzyScore(row.name, f.name) * 1000) / 10,
    }))
    .filter((c) => c.score >= FUZZY_FLOOR)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * 4. MATCHING — the documented precedence (Part 4):
 *   application No → saved SaQsham Facility Name / Category (exact
 *   normalized, 100%) → saved alias (+ seed) → shared facility_key → helper
 *   columns → exact name+type → fuzzy suggestion → none.
 * Facility names repeat across Facility / PHC / Block, so the Facility Type is
 * always part of the match and a tie is reported as ambiguous, never guessed.
 */
export function matchSaqshamRow(
  row: Pick<CleanedRow, "applicationNo" | "name" | "facilityType" | "helper">,
  facilities: readonly SaqshamFacility[],
  aliases: readonly FacilityAlias[] = [],
): MatchOutcome {
  const nameKey = normalizeFacilityKey(row.name);
  // 1. Saved Application No (100%). The portal appends a sequence suffix
  //    ("_01", "_02") for a re-application, so compare the BASE number.
  const app = baseApplicationNo(row.applicationNo);
  if (app) {
    const hit = facilities.find(
      (f) => f.saqshamApplicationNo && baseApplicationNo(f.saqshamApplicationNo) === app,
    );
    if (hit) return { status: "matched", method: "application_no", confidence: 100, facilityId: hit.id };
  }

  // 2. SAVED SaQsham Facility Name / Category (100%) — the exact portal text
  //    an earlier confirmed import stored on the facility. Normalized for
  //    COMPARISON only; the stored text stays exactly as the portal wrote it.
  if (nameKey) {
    const byName = facilities.filter(
      (f) => f.saqshamNameCategory && normalizeFacilityKey(f.saqshamNameCategory) === nameKey,
    );
    if (byName.length === 1)
      return { status: "matched", method: "portal_name", confidence: 100, facilityId: byName[0].id };
    if (byName.length > 1)
      return {
        status: "ambiguous",
        candidates: byName.map((f) => ({ facilityId: f.id, score: 100 })),
      };
  }

  // 3. Saved alias (100%) — including the one-time shipped seed, which is
  //    marked `seeded` so the preview shows "Seeded alias" and the confirm
  //    step persists it as the stored Facility Name / Category field.
  if (nameKey) {
    const alias = aliases.find(
      (a) => a.portalNameNormalized === nameKey && (!row.facilityType || a.facilityType === row.facilityType),
    );
    if (alias) {
      const facility = facilities.find((f) => f.id === alias.facilityId);
      if (facility)
        return {
          status: "matched",
          method: "alias",
          confidence: 100,
          facilityId: facility.id,
          seeded: !!alias.seeded,
        };
    }
  }

  // 4. SHARED FACILITY_KEY (98%) — the "Facility for Formula" string the IA
  //    import uses ("Kaspa -B_UHWC", "Ramanaickenpettai_PHC", …). The portal
  //    name is compared to the key's name segments and to the facility name,
  //    ALWAYS within the mapped Facility Type (names repeat across types).
  //    Two or more facilities tie → ambiguous (Block + PHC shown per row).
  if (nameKey && row.facilityType) {
    const byKey: SaqshamFacility[] = [];
    for (const f of facilities) {
      if (f.facilityType !== row.facilityType) continue;
      const segments = facilityKeyNameSegments(f.facilityKey ?? "");
      const keyMatch = segments.some((s) => normalizeFacilityKey(s) === nameKey);
      if (keyMatch || normalizeFacilityKey(f.name) === nameKey) byKey.push(f);
    }
    if (byKey.length === 1)
      return { status: "matched", method: "facility_key", confidence: 98, facilityId: byKey[0].id };
    if (byKey.length > 1)
      return {
        status: "ambiguous",
        candidates: byKey.map((f) => ({ facilityId: f.id, score: 98 })),
      };
  }

  // 5. Helper columns — Block + PHC + Facility (98%).
  const h = row.helper;
  if (h.block && h.name) {
    const helperMatches = facilities.filter(
      (f) =>
        normalizeFacilityKey(f.name) === normalizeFacilityKey(h.name) &&
        normalizeFacilityKey(f.block) === normalizeFacilityKey(h.block) &&
        (!h.phc || normalizeFacilityKey(f.phc) === normalizeFacilityKey(h.phc)),
    );
    if (helperMatches.length === 1)
      return { status: "matched", method: "helper", confidence: 98, facilityId: helperMatches[0].id };
    if (helperMatches.length > 1)
      return {
        status: "ambiguous",
        candidates: helperMatches.map((f) => ({ facilityId: f.id, score: 98 })),
      };
  }

  // 6. Exact normalised name + mapped Facility Type (95%).
  if (nameKey && row.facilityType) {
    const exact = facilities.filter(
      (f) => normalizeFacilityKey(f.name) === nameKey && f.facilityType === row.facilityType,
    );
    if (exact.length === 1)
      return { status: "matched", method: "exact", confidence: 95, facilityId: exact[0].id };
    if (exact.length > 1)
      return {
        status: "ambiguous",
        candidates: exact.map((f) => ({ facilityId: f.id, score: 95 })),
      };
  }

  // 7. Fuzzy suggestion (never auto-applied; the user confirms).
  const candidates = fuzzyCandidates({ name: row.name, facilityType: row.facilityType }, facilities);
  if (candidates.length > 0) return { status: "suggested", candidates };

  // 8. No match.
  return { status: "unmatched", candidates: [] };
}

function normalizeKey(value: unknown): string {
  return String(value ?? "").replace(/[^A-Za-z0-9]/g, "").toLowerCase();
}

/** The application number without its trailing "_NN" sequence suffix. */
export function baseApplicationNo(value: unknown): string {
  return normalizeKey(String(value ?? "").replace(/[_\- ]\d{1,3}$/, ""));
}

export const FUZZY_SCORE_FLOOR = FUZZY_FLOOR;
export const FUZZY_SCORE_CONFIDENT = FUZZY_CONFIDENT;

/* --------------------------------------------------------------------------- */
/* Preview builder                                                              */
/* --------------------------------------------------------------------------- */

export type PreviewState =
  | "ready"
  | "no_change"
  | "needs_review"
  | "unmatched"
  | "ambiguous"
  | "skipped"
  | "error";

export type RowChange = "new" | "changed" | "same" | "none";

export type PreviewRow = {
  rowNo: number;
  sourceRowNo: number;
  cleaned: CleanedRow;
  /** Match outcome, with a manual override applied when one is supplied. */
  match: MatchOutcome;
  /** Effective facility after the user's manual choice. */
  facilityId: string | null;
  /** Resolved facility identity (empty when unmatched) — used by the preview
   *  table and the import report so nothing re-looks-up the facility. */
  facilityName: string;
  facilityBlock: string;
  facilityPhc: string;
  facilityType: string;
  method: MatchMethod;
  confidence: number;
  currentStatus: string | null;
  currentReport: string | null;
  /** ISO date the portal last updated this facility's status (stored). */
  currentPortalUpdatedOn: string | null;
  /** The stored status already says Result Declared, so this earlier portal
   *  status is kept (never a downgrade). Shown as "Kept: result declared". */
  keptResultDeclared: boolean;
  /** The incoming report group is earlier in the lifecycle than the stored one. */
  movedBack: boolean;
  /** New portal status (de-duped); "" when the cell was blank. */
  newStatus: string;
  /** New report value: string (may be ""), or null when unmapped. */
  newReport: string | null;
  /** True when the user chose "keep as-is, no report group". */
  keepAsIs: boolean;
  change: RowChange;
  state: PreviewState;
  include: boolean;
  // Review flags
  unmappedStatus: boolean;
  stale: boolean;
  olderApplication: boolean;
  olderOfApplicationNo: string | null;
  differentScope: boolean;
  /** True when the row matched through the one-time shipped alias seed. */
  seededAlias?: boolean;
  warnings: string[];
  /** The optional extra-field effects the user can turn on.
   */
  overrideNote?: string;
  optional: {
    assessmentMode: string | null;
    appliedDepartments: string[] | null;
    appliedDate: string | null;
    assessmentType: string | null;
  };
};

export type PreviewOverrides = {
  /** rowNo → chosen facility id (manual/fuzzy acceptance). */
  facilityChoice?: Record<number, string | null>;
  /** rowNo → chosen report value (unmapped rows), or "__keep__" to keep as-is. */
  reportChoice?: Record<number, string>;
};

export type BuildPreviewResult = {
  rows: PreviewRow[];
  summary: PreviewSummary;
};

export type PreviewSummary = {
  total: number;
  /** Bucket counts — mutually exclusive, always summing to `total`. */
  buckets: Record<PreviewBucket, number>;
  willUpdate: number;
  noChange: number;
  newValue: number;
  unmatched: number;
  ambiguous: number;
  unmappedStatus: number;
  /** Rows carrying an INFO TAG (department count, stale date, …). */
  warnings: number;
  skipped: number;
  /** Rows in the "Needs your decision" bucket. */
  needsReview: number;
  /** Rows kept at Result Declared instead of an earlier portal status. */
  kept: number;
  /** Rows ignored because an older application exists for the same facility. */
  older: number;
  /** Facilities in the master list that are not in this file (informational). */
  missingFromFile: number;
};

/**
 * ROW STATE — one pure function, in ONE order (Part 0.1).
 *
 *   1. Skipped      outside scope, or an older application for the same facility
 *   2. Needs your decision  Error · Unmatched · Ambiguous · Needs mapping ·
 *                   Spelling-variant (a fuzzy suggestion the user must accept)
 *   3. Will change  some value differs, including "New"
 *   4. No change    every value is equal, including "Kept: result declared"
 *
 * Informational notes (department count, a stale portal date, a backwards
 * lifecycle move, a plain warning) are INFO TAGS ONLY and never reach this
 * function — before this fix they silently turned 21 identical rows into
 * "Needs review" and left the primary button reading "Review 0 rows".
 */
export type PreviewStateInput = {
  differentScope: boolean;
  /** The user already chose a facility for this row → scope no longer blocks it. */
  chosenByUser: boolean;
  olderApplication: boolean;
  hasFacility: boolean;
  matchStatus: MatchOutcome["status"];
  unmappedStatus: boolean;
  change: RowChange;
};

export function derivePreviewState(i: PreviewStateInput): PreviewState {
  // 1. Skipped.
  if (i.differentScope && !i.chosenByUser) return "skipped";
  if (i.olderApplication) return "skipped";
  // 2. Needs your decision.
  if (i.matchStatus === "ambiguous") return "ambiguous";
  if (i.matchStatus === "suggested") return "needs_review"; // spelling variant
  if (!i.hasFacility) return "unmatched";
  if (i.unmappedStatus) return "needs_review"; // needs mapping
  // 3. Will change.  4. No change.
  return i.change === "same" ? "no_change" : "ready";
}

/**
 * The six mutually exclusive summary buckets. They ALWAYS add up to the row
 * count: a row belongs to exactly one.
 */
export type PreviewBucket =
  | "will_change"
  | "new"
  | "no_change"
  | "needs_decision"
  | "cant_match"
  | "skipped";

export const BUCKET_ORDER: readonly PreviewBucket[] = [
  "will_change",
  "new",
  "no_change",
  "needs_decision",
  "cant_match",
  "skipped",
];

export const BUCKET_LABELS: Record<PreviewBucket, string> = {
  will_change: "Will change",
  new: "New",
  no_change: "No change",
  needs_decision: "Needs your decision",
  cant_match: "Can't match",
  skipped: "Skipped",
};

/** Which bucket a row falls in — derived from the state FIRST, then the
 *  change kind, so the buckets partition the rows exactly. */
export function previewBucket(state: PreviewState, change: RowChange): PreviewBucket {
  if (state === "skipped") return "skipped";
  if (state === "unmatched" || state === "ambiguous") return "cant_match";
  if (state === "needs_review" || state === "error") return "needs_decision";
  if (change === "new") return "new";
  if (change === "changed") return "will_change";
  return "no_change";
}

/**
 * Build the preview for every cleaned row: match it, decide the change and the
 * default inclusion, and flag anything needing review. Nothing is written.
 */
export function buildSaqshamPreview(
  cleaned: readonly CleanedRow[],
  facilities: readonly SaqshamFacility[],
  aliases: readonly FacilityAlias[] = [],
  overrides: PreviewOverrides = {},
): BuildPreviewResult {
  const byId = new Map(facilities.map((f) => [f.id, f]));
  const appliedByRowNo = new Map(cleaned.map((c) => [c.rowNo, appliedDateKey(c)]));

  const provisional = cleaned.map((row) => {
    const match = matchSaqshamRow(row, facilities, aliases);
    const chosen = overrides.facilityChoice?.[row.rowNo];
    // A manual choice wins over the automatic outcome; otherwise use the
    // auto match when it is a confident "matched" (never a suggestion).
    const facilityId =
      chosen !== undefined
        ? chosen
        : match.status === "matched"
          ? match.facilityId
          : null;
    const method: MatchMethod =
      chosen ? "manual" : match.status === "matched" ? match.method : "none";
    const confidence =
      chosen ? 100 : match.status === "matched" ? match.confidence : 0;
    return { row, match, facilityId, method, confidence, chosen };
  });

  // Latest-application dedupe: keep the row with the latest Applied Date per
  // facility; flag the others "Older application (ignored)".
  const latestByFacility = new Map<string, number>();
  for (const p of provisional) {
    if (!p.facilityId) continue;
    const prevRowNo = latestByFacility.get(p.facilityId);
    if (prevRowNo == null || (appliedByRowNo.get(p.row.rowNo) ?? "") > (appliedByRowNo.get(prevRowNo) ?? "")) {
      latestByFacility.set(p.facilityId, p.row.rowNo);
    }
  }

  const rows: PreviewRow[] = provisional.map((p) => {
    const { row, match } = p;
    const facility = p.facilityId ? byId.get(p.facilityId) ?? null : null;
    const currentStatus = facility?.docsStatus ?? null;
    const currentReport = facility?.docsStatusReport ?? null;
    const currentPortalUpdatedOn = facility?.saqshamPortalUpdatedOn ?? null;

    const reportChoice = overrides.reportChoice?.[row.rowNo];
    const keepAsIs = reportChoice === "__keep__";
    const newReport: string | null = keepAsIs
      ? null
      : reportChoice !== undefined
        ? reportChoice
        : row.reportStatus;
    const unmappedStatus = !keepAsIs && newReport === null && !!row.statusRaw;

    const stale =
      !!facility?.saqshamPortalUpdatedOn &&
      !!row.lastUpdate.date &&
      row.lastUpdate.date < facility.saqshamPortalUpdatedOn;

    const keepRowNo = p.facilityId ? latestByFacility.get(p.facilityId) : undefined;
    const olderApplication = keepRowNo != null && keepRowNo !== row.rowNo;
    const olderOfApplicationNo = olderApplication
      ? (cleaned.find((c) => c.rowNo === keepRowNo)?.applicationNo || null)
      : null;

    // A blank portal status never replaces what the facility already has; it
    // shows the stored status instead (never “Result declared → -”).
    const newStatus = row.statusRaw.trim() ? row.statusRaw.trim() : (currentStatus ?? "");
    // Result Declared is final: an earlier portal status never replaces it.
    const keptResultDeclared = !!facility && importWouldDowngrade(currentStatus, newStatus);
    const willChangeStatus =
      !!facility &&
      !keptResultDeclared &&
      newStatus.trim() !== "" &&
      newStatus !== (currentStatus ?? "");
    const willChangeReport =
      !!facility &&
      !keepAsIs &&
      newReport !== null &&
      newReport.trim() !== "" &&
      newReport !== (currentReport ?? "");
    // A portal date is stored too, but it alone never makes a row “Will change”.
    let change: RowChange;
    // Kept: Result Declared → NOTHING is written, so it is a No-change row,
    // never a Skipped one (the chip set must add up to the rows).
    if (!facility) change = "none";
    else if (keptResultDeclared) change = "same";
    else if (willChangeStatus || willChangeReport)
      change = currentStatus == null || currentStatus === "" ? "new" : "changed";
    else change = "same";

    const warnings = [...row.warnings];

    // A group that moved backwards in the lifecycle is amber, never silent.
    const fromRank = reportStatusRank(currentReport);
    const toRank = reportStatusRank(newReport ?? "");
    const movedBack =
      !keptResultDeclared && change === "changed" && fromRank != null && toRank != null && toRank < fromRank;

    // The user's pick WINS for the state too: once a facility is chosen the
    // row is no longer a spelling-variant / unmatched decision.
    const effectiveStatus: MatchOutcome["status"] =
      p.chosen !== undefined ? (p.chosen === null ? "unmatched" : "matched") : match.status;
    const state = derivePreviewState({
      differentScope: row.differentScope,
      chosenByUser: !overridesIncludeNotSet(overrides, row.rowNo),
      olderApplication,
      hasFacility: !!facility,
      matchStatus: effectiveStatus,
      unmappedStatus,
      change,
    });

    return {
      rowNo: row.rowNo,
      sourceRowNo: row.sourceRowNo,
      cleaned: row,
      match,
      facilityId: p.facilityId,
      facilityName: facility?.name ?? "",
      facilityBlock: facility?.block ?? "",
      facilityPhc: facility?.phc ?? "",
      facilityType: facility?.facilityType ?? row.facilityType,
      method: p.method,
      confidence: p.confidence,
      currentStatus,
      currentReport,
      currentPortalUpdatedOn,
      keptResultDeclared,
      movedBack,
      newStatus,
      newReport,
      keepAsIs,
      change,
      state,
      include: defaultInclude(state),
      unmappedStatus,
      stale,
      olderApplication,
      olderOfApplicationNo,
      differentScope: row.differentScope,
      seededAlias: p.match.status === "matched" ? !!p.match.seeded : false,
      warnings,
      optional: {
        assessmentMode: row.assessmentMode || null,
        appliedDepartments: row.appliedDepartments.ok && row.appliedDepartments.departments.length
          ? row.appliedDepartments.departments
          : null,
        appliedDate: row.appliedDate,
        assessmentType: row.assessmentType || null,
      },
    };
  });

  // Facilities in the master list that this file does not mention.
  const seen = new Set(rows.map((r) => r.facilityId).filter((x): x is string => !!x));
  const missingFromFile = facilities.filter((f) => !seen.has(f.id)).length;

  return { rows, summary: summarizePreview(rows, missingFromFile) };
}

function overridesIncludeNotSet(overrides: PreviewOverrides, rowNo: number): boolean {
  // A different-scope row is skipped unless the user explicitly included it by
  // choosing a facility for it.
  return overrides.facilityChoice?.[rowNo] === undefined;
}

function appliedDateKey(row: CleanedRow): string {
  return row.appliedDate ?? "";
}

/** Default inclusion: only "ready" rows are included; everything needing
 *  review (fuzzy, unmapped, stale, ambiguous, unmatched) is off until resolved. */
export function defaultInclude(state: PreviewState): boolean {
  return state === "ready";
}

export function summarizePreview(
  rows: readonly PreviewRow[],
  missingFromFile = 0,
): PreviewSummary {
  const buckets = Object.fromEntries(BUCKET_ORDER.map((b) => [b, 0])) as Record<PreviewBucket, number>;
  for (const r of rows) buckets[previewBucket(r.state, r.change)] += 1;
  return {
    total: rows.length,
    buckets,
    willUpdate: buckets.will_change,
    noChange: buckets.no_change,
    newValue: buckets.new,
    unmatched: rows.filter((r) => r.state === "unmatched").length,
    ambiguous: rows.filter((r) => r.state === "ambiguous").length,
    unmappedStatus: rows.filter((r) => r.unmappedStatus).length,
    warnings: rows.filter((r) => r.warnings.length > 0).length,
    skipped: buckets.skipped,
    needsReview: buckets.needs_decision,
    kept: rows.filter((r) => r.keptResultDeclared).length,
    older: rows.filter((r) => r.olderApplication).length,
    missingFromFile,
  };
}

/** Every bucket with its count — the review's summary bar (Part 3.2.1). */
export function bucketCounts(rows: readonly PreviewRow[]): Record<PreviewBucket, number> {
  return summarizePreview(rows).buckets;
}

/**
 * DUPLICATE DETECTION (Part 3.2.2): rows that already say exactly what is
 * stored, on facilities an earlier batch wrote. Content-hash cheap and local
 * — no extra query, no row ever compared across users.
 */
export type DuplicateHint = { at: number; count: number } | null;

export function duplicateRowsHint(
  rows: readonly PreviewRow[],
  facilities: readonly SaqshamFacility[],
): DuplicateHint {
  const byId = new Map(facilities.map((f) => [f.id, f]));
  let count = 0;
  let at = 0;
  for (const r of rows) {
    if (r.change !== "same" || !r.facilityId) continue;
    const importedAt = byId.get(r.facilityId)?.saqshamImportedAt;
    if (!importedAt) continue;
    count += 1;
    if (importedAt > at) at = importedAt;
  }
  return count > 0 ? { at, count } : null;
}

export const STATE_LABELS: Record<PreviewState, string> = {
  ready: "Will change",
  no_change: "No change",
  needs_review: "Needs your decision",
  unmatched: "Can't match",
  ambiguous: "Can't match",
  skipped: "Skipped",
  error: "Error",
};

/** A row is eligible to apply only when it has a real, resolved change. */
export function isEligiblePreviewRow(row: PreviewRow): boolean {
  return (
    row.state === "ready" &&
    !!row.facilityId &&
    row.change !== "same" &&
    row.change !== "none" &&
    !row.keptResultDeclared &&
    !row.olderApplication
  );
}

/** The rows a batch would actually write, in include order. */
export function selectedRows(rows: readonly PreviewRow[]): PreviewRow[] {
  return rows.filter((r) => r.include && isEligiblePreviewRow(r));
}

/** Validation shared by the Admin mapping editor and the server write. */
export function statusMapIssues(
  rows: readonly StatusMapEntry[],
  allowedReports: readonly string[] = REPORT_STATUS_VALUES,
): string[] {
  const out: string[] = [];
  if (rows.length === 0) return ["Keep at least one status mapping."];
  const seen = new Map<string, string>();
  for (const row of rows) {
    const portal = String(row.portal ?? "").trim();
    const report = String(row.report ?? "").trim();
    if (!portal) {
      out.push("Every mapping needs a portal status.");
      continue;
    }
    const key = normalizeStatusKey(portal);
    if (seen.has(key)) out.push(`“${portal}” is mapped more than once.`);
    seen.set(key, portal);
    for (const alias of row.aliases ?? []) {
      const aliasKey = normalizeStatusKey(alias);
      if (!aliasKey) continue;
      if (seen.has(aliasKey)) out.push(`“${alias}” is used by more than one status or alias.`);
      seen.set(aliasKey, portal);
    }
    if (report && !allowedReports.includes(report)) {
      out.push(`“${report}” is not a supported report status.`);
    }
  }
  return out;
}

/** Prefix spreadsheet text that a spreadsheet would execute as a formula. */
export function spreadsheetSafeValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** True when a blocking problem stops the confirm button. */
export function hasBlockingErrors(rows: readonly PreviewRow[]): boolean {
  return rows.some((r) => r.include && (r.state === "ambiguous" || (!r.facilityId && r.state !== "skipped")));
}
