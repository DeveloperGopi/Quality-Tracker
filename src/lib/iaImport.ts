/**
 * QUARTERLY INTERNAL ASSESSMENT (IA) IMPORT — the pure engine.
 *
 * Everything here is a unit-tested pure function (scripts/iaImport.test.ts):
 * the Indian financial-year / quarter logic, the score cleaning rules, the
 * wide-layout unpivot, the facility matching on top of the SHARED SaQsham
 * normalizers + alias table, and the cleaning step the wizard renders.
 * Nothing here touches React, Convex or the network.
 *
 * The constants are the "central config" for the whole feature: the wizard,
 * the preview table, the Excel import report, the PDF export and the tests all
 * read them from here — there is no second copy of a threshold or a label.
 */

import {
  fuzzyCandidates,
  jaroWinkler,
  normalizeFacilityKey,
  plainFacilityKey,
  type FacilityAlias,
  type MatchMethod,
} from "./saqshamImport";

/* ---------------------------------------------------------------------------
 * CONFIG — single source for every threshold below.
 * ------------------------------------------------------------------------- */

/** Digits shown wherever a score is DISPLAYED — the SAME shared constant the
 *  master list, Reports, exports and the Facility sheet use (masterColumns
 *  re-exports this value), so a comparison can never print 0.0 in one place
 *  and 0.04 in another. Import keeps full precision and never rounds. */
export const SCORE_DECIMALS = 2;
/** ScoreBar thresholds: green ≥ 70, amber 50–69, red < 50. */
export const SCORE_BARS = { green: 70, amber: 50 } as const;
/** Quarter-over-quarter movement that earns a "Large change" chip. */
export const LARGE_CHANGE = 20;
/** A "declined by ≥ 10 points" KPI (dashboard "Needs attention"). */
export const DECLINED_ALERT = 10;
/** Quarter-over-quarter movement smaller than this is "no change" (■) —
 *  shared by the IA card, the import preview and every comparison. */
export const IA_NO_CHANGE_BAND = 0.05;
/** Quarters older than this many behind the current one import with a warning. */
export const STALE_QUARTERS = 2;
/** Default grace days after a quarter ends before its report is DUE.
 *  The live value is an Admin setting (Workspace → Cycle timing). */
export const DEFAULT_IA_GRACE_DAYS = 5;
/** A quarter counts as Complete at or above this coverage % (admin setting). */
export const DEFAULT_IA_COMPLETE_THRESHOLD = 95;
/** Row and size limits, shared with the SaQsham loader. */
export const IA_MAX_ROWS = 20_000;
export const IA_MAX_BYTES = 10 * 1024 * 1024;

/** Admin-configurable facility Type list (section 4). */
export const DEFAULT_IA_TYPES: readonly string[] = [
  "CHC", "PHC", "UPHC", "UGPHC", "UHWC", "HWC HSC", "DHQH", "SDH",
];

/** PHC spelling variants — the same place spelled differently across files
 *  (KV Chathiram ↔ Kavalurchatram etc.). Admin-editable from the first import. */
export const DEFAULT_PHC_ALIASES: readonly string[][] = [
  ["KV Chathiram", "Kavalurchatram"],
  ["Jammanapudur", "Jammanapudhur"],
  ["Udayendram", "Udhayenthiram"],
  ["Nimiyampattu", "Nimmiyampattu"],
];

/** The trackers the IA import carries. Part 2: the Eco-Friendly Scorecard
 *  is deprecated — it is NOT in the UI tracker list any more (its stored DB
 *  values are untouched, and a file with that column is ignored with one
 *  info line), but the `"eco"` type stays so the row plumbing compiles. */
export type IaTracker = "nqas" | "kayakalp" | "eco";
export const IA_TRACKERS: readonly IaTracker[] = ["nqas", "kayakalp"];
export const TRACKER_LABELS: Record<IaTracker, string> = {
  nqas: "NQAS IA",
  kayakalp: "Kayakalp IA",
  // Retired tracker — its stored values are untouched, but nothing in the UI
  // or an export may show the old name again.
  eco: "Legacy IA",
};

/* ---------------------------------------------------------------------------
 * 1. FINANCIAL YEAR + QUARTER LOGIC (Indian FY Apr–Mar)
 * ------------------------------------------------------------------------- */

export type FyQuarter = { fy: string; q: 1 | 2 | 3 | 4 };

/** "2026" → "2026-27": the FY label of a calendar year is that year's April. */
export function fyLabel(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** Normalise every accepted FY spelling to "YYYY-YY": "2025-26", "2025-2026",
 *  "FY 25-26", "FY2025-26", "2025 - 26", "2025". Null when unrecognisable. */
export function normalizeIaFy(input: unknown): string | null {
  const s = String(input ?? "")
    .toUpperCase()
    .replace(/^FY\s*/, "")
    .replace(/\s+/g, "");
  let m = /^(\d{4})-(\d{2,4})$/.exec(s);
  if (m) {
    const start = +m[1];
    let end = +m[2];
    if (end < 100) end += Math.floor(start / 100) * 100;
    return end === start + 1 ? fyLabel(start) : null;
  }
  m = /^(\d{2,4})-(\d{2})$/.exec(s);
  if (m) {
    const start = m[1].length === 2 ? 2000 + +m[1] : +m[1];
    return fyLabel(start);
  }
  m = /^((19|20)\d{2})$/.exec(s);
  if (m) return fyLabel(+m[1]); // bare calendar year = that year's FY
  return null;
}

/** Calendar month → quarter: Apr–Jun Q1 … Jan–Mar Q4. */
export function quarterOfMonth(month: number): 1 | 2 | 3 | 4 {
  if (month >= 4 && month <= 6) return 1;
  if (month >= 7 && month <= 9) return 2;
  if (month >= 10 && month <= 12) return 3;
  return 4;
}

/** Normalise "Q3", "q3", "3", "Qtr 3", "Quarter 3", "Oct-Dec" → 1..4, or null. */
export function normalizeIaQuarter(input: unknown): 1 | 2 | 3 | 4 | null {
  const s = String(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
  if (!s) return null;
  const m = /^(?:QTR\.?\s*|Q\.?\s*|QUARTER\s*#?\s*)?-?([1-4])$/.exec(s) ??
    /^(?:QTR\.?\s*|Q\.?\s*|QUARTER\s*#?\s*)([1-4])$/.exec(s);
  if (m) return clampQuarter(+m[1]);
  // Month-range spellings ("Oct-Dec", "October to December").
  const monthWords = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ];
  const parts = s
    .split(/\s*(?:-|–|—|\/|\bTO\b)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 2) {
    const idx = (p: string) => monthWords.findIndex((w) => w.startsWith(p));
    const a = idx(parts[0]);
    const b = idx(parts[1]);
    if (a === 3 && b === 5) return 1; // Apr–Jun
    if (a === 6 && b === 8) return 2; // Jul–Sep
    if (a === 9 && b === 11) return 3; // Oct–Dec
    if (a === 0 && b === 2) return 4; // Jan–Mar
  }
  return null;
}

function clampQuarter(n: number): 1 | 2 | 3 | 4 | null {
  return n >= 1 && n <= 4 ? (n as 1 | 2 | 3 | 4) : null;
}

/** The current quarter of a date: October 2026 → Q3 2026-27. */
export function currentIaQuarter(today: string): FyQuarter {
  const [y, mo] = today.split("-").map(Number);
  const q = quarterOfMonth(mo ?? 1);
  // Q4 (Jan–Mar) belongs to the FY that started the previous April.
  return { fy: fyLabel(q === 4 ? y - 1 : y), q };
}

/** Positive sort key of a quarter: 2026-27 Q3 > 2026-27 Q1 > 2025-26 Q4. */
export function quarterOrder(fy: string, q: number): number {
  return +fy.slice(0, 4) * 4 + q;
}

/** Strictly later than the current quarter? → an Error row on import. */
export function isFutureQuarter(fy: string, q: number, today: string): boolean {
  const cur = currentIaQuarter(today);
  return quarterOrder(fy, q) > quarterOrder(cur.fy, cur.q);
}

/** Part 2 ④: a quarter whose last day has not passed is IN PROGRESS, so an
 *  import into it is saved as Provisional (accepted, never an error). */
export function isQuarterProvisional(fy: string, q: 1 | 2 | 3 | 4, today: string): boolean {
  return quarterEndIso(fy, q) >= today;
}

/** How many quarters behind the current one (0 = current). */
export function quartersBehind(fy: string, q: number, today: string): number {
  const cur = currentIaQuarter(today);
  return quarterOrder(cur.fy, cur.q) - quarterOrder(fy, q);
}

/** Previous quarter, wrapping Q1 → Q4 of the previous FY. */
export function previousQuarter(fy: string, q: 1 | 2 | 3 | 4): FyQuarter {
  if (q === 1) return { fy: fyLabel(+fy.slice(0, 4) - 1), q: 4 };
  return { fy, q: (q - 1) as 1 | 2 | 3 | 4 };
}

/** "Q3 2026-27". */
export function formatFyQuarter(fy: string, q: number): string {
  return `Q${q} ${fy}`;
}

/** The last (inclusive) day of a quarter, ISO — the reminder deadline. */
export function quarterEndIso(fy: string, q: 1 | 2 | 3 | 4): string {
  const start = +fy.slice(0, 4);
  const monthEnd = { 1: [6, 30], 2: [9, 30], 3: [12, 31], 4: [3, 31] } as const;
  const [mo, d] = monthEnd[q];
  const year = q === 4 ? start + 1 : start;
  return `${year}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** The last N quarters ENDING at (fy, q), oldest first (trend sparklines). */
export function lastQuarters(fy: string, q: 1 | 2 | 3 | 4, n: number): FyQuarter[] {
  const out: FyQuarter[] = [];
  let cur: FyQuarter = { fy, q };
  for (let i = 0; i < n; i++) {
    out.unshift(cur);
    cur = previousQuarter(cur.fy, cur.q);
  }
  return out;
}

/** Sort key of an FY label ("2025-26" → 2025). */
export function fySortKey(fy: string): number {
  return +fy.slice(0, 4);
}

/* ---------------------------------------------------------------------------
 * 1b. NIN CLEANING (the master identifier, section 3 rule 1)
 * ------------------------------------------------------------------------- */

/** The configured NIN length (10 digits). NINs stored by Excel as numbers
 *  lose their leading zeros; they are left-padded back to this length. */
export const IA_NIN_LENGTH = 10;

export type CleanedNin = {
  /** Digits only, padded to IA_NIN_LENGTH; null when the cell is blank. */
  value: string | null;
  /** The cell text exactly as the file sent it (kept for the row drawer). */
  raw: string;
  /** A blocking problem (non-digits, wrong length, scientific notation). */
  error: string | null;
  /** Left-padded from a shorter number — the amber "format as Text" note. */
  padded: boolean;
};

const EMPTY_NIN: CleanedNin = { value: null, raw: "", error: null, padded: false };

/**
 * Clean ONE NIN cell (section 3 rule 1):
 *   - trim, remove spaces / hyphens / non-breaking spaces;
 *   - digits only — anything else is an error naming the problem;
 *   - a number Excel shortened is left-padded to 10 digits (amber note);
 *   - scientific notation is the one error Excel itself causes, with the
 *     exact instruction the staff need.
 * A blank is NOT an error: the old key-based format has no NIN column.
 */
export function cleanIaNin(raw: unknown, length = IA_NIN_LENGTH): CleanedNin {
  const rawText = raw == null ? "" : String(raw).replace(/\u00A0/g, " ");
  const trimmed = rawText.trim();
  if (!trimmed) return EMPTY_NIN;
  const compact = trimmed.replace(/[\s\u00A0\u202F\u2009\-‐‑–—]/g, "");
  if (/^\d(?:\.\d+)?e\+?\d+$/i.test(compact)) {
    return {
      value: null,
      raw: trimmed,
      error: "Excel changed this NIN. Format the NIN column as Text and paste again.",
      padded: false,
    };
  }
  if (!/^\d+$/.test(compact)) {
    return {
      value: null,
      raw: trimmed,
      error: "NIN must be digits only (no letters or symbols)",
      padded: false,
    };
  }
  if (compact.length > length) {
    return {
      value: null,
      raw: trimmed,
      error: `NIN is ${compact.length} digits; expected ${length}`,
      padded: false,
    };
  }
  if (compact.length < length) {
    return {
      value: compact.padStart(length, "0"),
      raw: trimmed,
      error: null,
      padded: true,
    };
  }
  return { value: compact, raw: trimmed, error: null, padded: false };
}

/** The comparable NIN (digits only), or null for a blank / invalid cell. */
export function normalizeIaNin(raw: unknown, length = IA_NIN_LENGTH): string | null {
  const cleaned = cleanIaNin(raw, length);
  return cleaned.error ? null : cleaned.value;
}

/** One exact-lookup index over the facilities in scope. */
export function buildIaNinIndex(
  facilities: readonly IaFacility[],
): Map<string, IaFacility[]> {
  const index = new Map<string, IaFacility[]>();
  for (const f of facilities) {
    const nin = normalizeIaNin(f.ninNumber ?? "");
    if (!nin) continue;
    const list = index.get(nin) ?? [];
    list.push(f);
    index.set(nin, list);
  }
  return index;
}

/* ---------------------------------------------------------------------------
 * 2. SCORE CLEANING (pure)
 * ------------------------------------------------------------------------- */

/** A cleaned score cell: the number, the remark (portal's own text) and the
 *  display chip. Blank → value null and NO remark ("Not reported"). */
export type CleanedScore = {
  /** null = not reported (blank cell) or remark text — NEVER coerced to 0. */
  value: number | null;
  /** The portal's text kept verbatim for remark columns, e.g. "New PHC". */
  remark: string | null;
  /** Display chip over the cell ("New facility", …), null when plain. */
  chip: string | null;
  /** Out-of-range (a 105, a −3): the row becomes an Error row, editable. */
  error: boolean;
  /** "Converted from fraction" — the ×100 confirmation chip (section 3.4). */
  fraction: boolean;
};

const EMPTY_SCORE: CleanedScore = {
  value: null, remark: null, chip: null, error: false, fraction: false,
};

/** The portal's "not a number" vocabulary → remark + chip, longest first. */
const REMARK_RULES: { re: RegExp; chip: string }[] = [
  { re: /^NEW\s*(PHC|UPHC|HWC|HSC|CHC|FACILIT[YE]+S?)\.?$/i, chip: "New facility" },
  { re: /^NOT\s*ASSESSED$/i, chip: "Not assessed" },
  { re: /^(N\/?A|NOT\s*APPLICABLE)$/i, chip: "Not applicable" },
  { re: /^NIL$/i, chip: "Nil (no score)" },
  { re: /^-+$/, chip: "Not reported" },
];

/** A score cell the file filled with TEXT: remark kept, chip derived, value
 *  null. Displayed as "- {chip}". */
export function scoreRemarkOf(rawText: string): CleanedScore {
  const trimmed = rawText.trim().replace(/\u00A0/g, " ").replace(/\s+/g, " ");
  for (const rule of REMARK_RULES) {
    if (rule.re.test(trimmed)) {
      return { ...EMPTY_SCORE, remark: trimmed, chip: rule.chip };
    }
  }
  return { ...EMPTY_SCORE, remark: trimmed, chip: trimmed };
}

/**
 * Clean ONE score cell (section 3 rules 1–4):
 *   - strips %, plain and non-breaking spaces, thin spaces, thousands commas;
 *   - converts text numbers ("69.0" → 69) without rounding;
 *   - hasFraction — the COLUMN value list — decides 0..1 fraction cells;
 *   - blank → null, never 0;
 *   - remarks ("New PHC" …) → null + remark + chip, NOT an error;
 *   - < 0 or > 100 → error: true (Error row, editable inline).
 */
export function cleanIaScore(raw: unknown, hasFraction = false): CleanedScore {
  if (raw == null || String(raw).trim() === "") {
    return EMPTY_SCORE; // blank = null = "Not reported", never 0
  }
  const rawText = String(raw).replace(/\u00A0/g, " ");
  // Numeric attempt: strip %, all spaces, thousands separators.
  const digits = rawText
    .replace(/[\s\u202F\u2009,%]/g, "")
    .replace(/^\.|\.$/, "");
  if (/^-?\d+(\.\d+)?$/.test(digits)) {
    const num = Number(digits);
    if (num < 0 || num > 100) {
      return { ...EMPTY_SCORE, value: num, error: true };
    }
    // A fraction cell (0 < v ≤ 1) inside a mostly-percent column is a
    // percent-formatted-as-fraction: convert ×100 with a confirmation chip.
    if (hasFraction && num > 0 && num <= 1) {
      return {
        value: Math.round(num * 10000) / 100,
        remark: null,
        chip: "converted from fraction",
        error: false,
        fraction: true,
      };
    }
    // Keep the written precision: trim trailing zeros only past 2 decimals.
    return {
      ...EMPTY_SCORE,
      value: Math.round(num * 100) / 100,
    };
  }
  return scoreRemarkOf(rawText);
}

/**
 * Fraction DETECTION, column-wide (section 3 rule 4): when MOST numeric cells
 * of a column are > 1 but the cell is in 0..1, treat the cell as a fraction.
 * Called with the cleaned numeric values of the whole column.
 */
export function columnIsFractional(numericValues: readonly (number | null)[]): boolean {
  const nums = numericValues.filter((v): v is number => v != null);
  if (nums.length < 2) return false;
  const aboveOne = nums.filter((v) => v > 1).length;
  return aboveOne > nums.length / 2 && nums.some((v) => v > 0 && v <= 1);
}

/* ---------------------------------------------------------------------------
 * 3. NAME NORMALISATION (section 3 rule 7 + PHC alias list)
 * ------------------------------------------------------------------------- */

/** Collapse odd spacing: "Ambur(Ambur )_UPHC" → "Ambur(Ambur)_UPHC". */
export function collapseOddSpaces(input: unknown): string {
  return String(input ?? "")
    .normalize("NFC")
    // Non-breaking / thin spaces arrive from Excel and HTML pastes; they are
    // ordinary spaces for every comparison below.
    .replace(/[\u00A0\u202F\u2009]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+_+/g, "_")
    .replace(/_+\s+/g, "_")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

/** The alias rows → normalized-key map, canonical spelling preferred. */
export function buildPhcAliasMap(rows: readonly string[][]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const group of rows) {
    if (group.length < 2) continue;
    const canonical = normalizeFacilityKey(group[0]);
    for (const spelling of group) map[normalizeFacilityKey(spelling)] = canonical;
  }
  return map;
}

/** Apply the alias map inside a normalized key: "jammanapudhur" → "jammanapudur". */
export function applyPhcAliases(
  normalized: string,
  aliases: Record<string, string>,
): string {
  let out = normalized;
  for (const [from, to] of Object.entries(aliases)) {
    if (from && from !== to && out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 4. HEADER ROLES + WIDE-LAYOUT DETECTION / UNPIVOT
 * ------------------------------------------------------------------------- */

/** Recognised column roles — case, space, hyphen and typo tolerant. */
export type IaRole =
  | "sno"
  | "nin"
  | "facilityKey"
  | "block"
  | "phc"
  | "facilityName"
  | "type"
  | "fy"
  | "quarter"
  | "nqasIa"
  | "kayakalpIa"
  | "ecoFriendly";

const IA_HEADER_MATCHERS: { role: IaRole; re: RegExp }[] = [
  { role: "sno", re: /^s\.?\s*no/i },
  // "NIN Number", "NIN No", "N.I.N." — the new format's master identifier.
  { role: "nin", re: /^n\.?\s*i\.?\s*n\.?(\s*(number|no|no\.))?$/i },
  { role: "facilityKey", re: /facility\s*for\s*formula/i },
  { role: "block", re: /^block$/i },
  { role: "phc", re: /name\s*of\s*the\s*phc|^phc$/i },
  // "Name of the faciltiy" (the portal's own typo) parses the same as
  // "Name of the facility" — the fac…y stem is matched loosely.
  { role: "facilityName", re: /name\s*of\s*the\s*fac/i },
  { role: "type", re: /^(facility\s*)?type$/i },
  { role: "fy", re: /^fy\b|financial\s*year/i },
  { role: "quarter", re: /^quarter|quarter\b|^q\b|^q\s*[1-4]/i },
  { role: "nqasIa", re: /nqas\s*ia|nqas\s*%/i },
  { role: "kayakalpIa", re: /kayakalp/i },
  { role: "ecoFriendly", re: /eco[\s-]*friendl/i },
];

/** Which role does a (already-unique) header map to? First match wins; the
 *  "quarter" matcher runs AFTER the fy one so "Financial Year" is not stolen. */
export function roleForHeader(header: string): IaRole | null {
  for (const { role, re } of IA_HEADER_MATCHERS) {
    if (re.test(header.trim())) return role;
  }
  return null;
}

/** Auto-map a sheet, ignoring "S. No" (never used for matching) and columns
 *  whose header maps to nothing. Duplicate headers were already uniquified
 *  (shared uniqueHeaders) so each role gets exactly one column.
 *
 *  Part 2: an "Eco-Friendly Scorecard / Scorcard" column is RECOGNIZED so it
 *  never lands in the "unmapped" list, but it is silently dropped from the
 *  working roles — the Eco field is deprecated. (The caller shows the single
 *  info line.) */
export function mapIaHeaders(
  headers: readonly string[],
): { roles: Partial<Record<IaRole, string>>; unmapped: string[] } {
  const roles: Partial<Record<IaRole, string>> = {};
  const unmapped: string[] = [];
  for (const h of headers) {
    const role = roleForHeader(h);
    if (role === "sno" || role === "ecoFriendly") continue; // recorded, never used
    if (role && !roles[role]) roles[role] = h;
    else if (!role) unmapped.push(h);
  }
  return { roles, unmapped };
}

/**
 * WIDE LAYOUT — "NQAS IA % 2026-27 (Q2)" packs tracker + FY + quarter into the
 * header. Parse one such header; null when it is a plain one.
 */
export type WideHeader = {
  tracker: IaTracker;
  fy: string;
  q: 1 | 2 | 3 | 4;
};

const WIDE_RE =
  /^(NQAS\s*IA|KAYAKALP\s*IA|KAYAKALP|ECO[\s-]*FRIENDL[YE]+)[^0-9]*(\d{4})\s*[-–]\s*(\d{2,4})\s*[().\-–\s]*Q?\s*([1-4])/i;

export function parseWideHeader(header: string): WideHeader | null {
  const t = header.replace(/\s+/g, " ");
  const m = WIDE_RE.exec(t);
  if (!m) return null;
  const tracker: IaTracker = /NQAS/i.test(m[1])
    ? "nqas"
    : /KAYAKALP/i.test(m[1])
      ? "kayakalp"
      : "eco";
  const fy = normalizeIaFy(`${m[2]}-${m[3]}`);
  const q = clampQuarter(+m[4]);
  return fy && q ? { tracker, fy, q } : null;
}

/** Does this sheet use the wide layout? */
export function detectWideLayout(headers: readonly string[]): boolean {
  return headers.some((h) => parseWideHeader(h) != null);
}

/* ---------------------------------------------------------------------------
 * 5. ROW CLEANING
 * ------------------------------------------------------------------------- */

export type IaParsedScore = CleanedScore & { raw: string };

type RawIaRow = Record<string, unknown>;

export type CleanIaRow = {
  rowNo: number;
  /** 1-based sheet row (audit). */
  sourceRowNo: number;
  /** Every original cell, keyed by the UNIQUIFIED header (audit + report). */
  raw: Record<string, unknown>;
  /** The "Facility for Formula" cell, verbatim (trimmed). */
  key: string;
  name: string;
  block: string;
  phc: string;
  facilityType: string;
  typeKnown: boolean;
  /** NIN digits (padded) — null when the row carries no NIN (old format). */
  nin: string | null;
  /** The cell text as sent (audit / row drawer). */
  ninRaw: string;
  /** A blocking NIN problem — never coerced to a match. */
  ninError: string | null;
  /** Left-padded because Excel stored the NIN as a number. */
  ninPadded: boolean;
  fy: string | null;
  q: 1 | 2 | 3 | 4 | null;
  scores: Record<IaTracker, IaParsedScore>;
  fyError: boolean;
  qError: boolean;
  warnings: string[];
};

const emptyScore = (raw: unknown): IaParsedScore => ({ ...EMPTY_SCORE, raw: String(raw ?? "") });

/**
 * Clean one long-format row. Column values to score cells come from `roles`;
 * fy/quarter may be supplied by the whole-file override (step ② selector).
 * `columnFractions` gives each tracker role its CLEANED numeric column so a
 * 0–1 cell inside a percent column converts with a chip.
 */
export function cleanIaRow(
  row: RawIaRow,
  roles: Partial<Record<IaRole, string>>,
  opts: {
    rowNo: number;
    sourceRowNo: number;
    fyOverride?: string | null;
    qOverride?: 1 | 2 | 3 | 4 | null;
    typeList?: readonly string[];
    columnFractions?: Partial<Record<IaTracker, boolean>>;
  },
): CleanIaRow {
  const cellOf = (role: IaRole): unknown => {
    const header = roles[role];
    return header != null ? row[header] ?? null : null;
  };
  const raw: Record<string, unknown> = { ...row };

  const keyRaw = String(cellOf("facilityKey") ?? "").trim();
  const nameRaw = String(cellOf("facilityName") ?? "").trim();
  const blockRaw = String(cellOf("block") ?? "").trim();
  const phcRaw = String(cellOf("phc") ?? "").trim();
  const typeRaw = String(cellOf("type") ?? "").trim();
  const ninCell = cellOf("nin");
  const nin = cleanIaNin(ninCell);

  // Split a compound key "Alangayam_Mittur_HWC HSC" when the sheet sent no
  // separate name/block/type. Keys are name_block_type or name_block_phc_type.
  const parts = keyRaw
    .split("_")
    .map((p) => collapseOddSpaces(p))
    .filter(Boolean);
  const name = nameRaw || parts[0] || "";
  const facilityType = typeRaw || (parts.length >= 2 ? parts[parts.length - 1] : "");
  const block = blockRaw || (parts.length >= 3 ? parts[1] : "");
  // "Pudurnadu_Puliyur_HWC HSC" has PHC in the middle when 3 parts: first is
  // the facility, second PHC / block, last the type — the indented layout
  // varies, so exact identification comes from the matching step.
  const phc = phcRaw || (parts.length >= 3 ? parts[1] : "");
  const typeList = opts.typeList ?? DEFAULT_IA_TYPES;
  const typeKnown =
    !facilityType || typeList.some((t) => t.toUpperCase() === facilityType.toUpperCase());

  const fyCell = cellOf("fy");
  const fyParsed = normalizeIaFy(fyCell ?? opts.fyOverride);
  const fyError =
    fyCell != null && String(fyCell).trim() !== "" && !fyParsed && normalizeIaFy(opts.fyOverride) == null;
  const fy = fyParsed ?? normalizeIaFy(opts.fyOverride);

  const qCell = cellOf("quarter");
  const qParsed = normalizeIaQuarter(qCell ?? opts.qOverride);
  const qError =
    qCell != null && String(qCell).trim() !== "" && !qParsed && !opts.qOverride;
  const q = qParsed ?? (opts.qOverride as 1 | 2 | 3 | 4 | null);

  const warnings: string[] = [];
  if (facilityType && !typeKnown) warnings.push(`Unknown type “${facilityType}”`);
  if (fyError) warnings.push("Financial Year not recognised");
  if (qError) warnings.push("Quarter not recognised");
  if (!name && !keyRaw && !nin.value) warnings.push("No facility identifier on this row");

  const cleaned = (tracker: IaTracker): IaParsedScore => {
    const role =
      tracker === "nqas" ? "nqasIa" : tracker === "kayakalp" ? "kayakalpIa" : "ecoFriendly";
    const cell = cellOf(role);
    const isFraction = opts.columnFractions?.[tracker] === true;
    const score = cleanIaScore(cell, isFraction);
    // Blank in a column the quarter genuinely leaves empty is NOT an error:
    // the preview groups all-blank tracker columns into one info message.
    if (cell == null || String(cell).trim() === "") return emptyScore(cell);
    return { ...score, raw: String(cell) };
  };

  return {
    rowNo: opts.rowNo,
    sourceRowNo: opts.sourceRowNo,
    raw,
    key: keyRaw,
    name,
    block,
    phc,
    facilityType,
    typeKnown,
    nin: nin.value,
    ninRaw: nin.raw,
    ninError: nin.error,
    ninPadded: nin.padded,
    fy,
    q,
    scores: {
      nqas: cleaned("nqas"),
      kayakalp: cleaned("kayakalp"),
      eco: cleaned("eco"),
    },
    fyError,
    qError,
    warnings,
  };
}

/* ---------------------------------------------------------------------------
 * 6. WIDE-LAYOUT UNPIVOT
 * ------------------------------------------------------------------------- */

/** One wide sheet's column set → the long rows the wizard previews. Each data
 *  row fans out into ONE CleanIaRow per QUARTER present, carrying each wide
 *  column's value into the right tracker slot (the shared facility cells are
 *  copied). Duplicate header names were uniquified upstream. */
export function unpivotWideSheet(
  headers: readonly string[],
  rows: readonly unknown[][],
  baseOpts: { phcAliases?: Record<string, string>; typeList?: readonly string[] },
): CleanIaRow[] {
  // Map each header to either a fixed role or a wide (tracker, fy, q) slot.
  const byIndex = headers.map((h) => ({ header: h, role: roleForHeader(h), wide: parseWideHeader(h) }));
  const fixedRoles: Partial<Record<IaRole, string>> = {};
  for (const { header, role } of byIndex) {
    if (role && role !== "nqasIa" && role !== "kayakalpIa" && role !== "ecoFriendly" && !fixedRoles[role]) {
      fixedRoles[role] = header;
    }
  }
  const wideCols = byIndex
    .map((c, i) => ({ ...c, i }))
    .filter((c) => c.wide != null);

  // Group wide columns by (fy, quarter) so one row per period is assembled.
  const periods = new Map<string, { fy: string; q: 1 | 2 | 3 | 4; cols: { tracker: IaTracker; i: number }[] }>();
  for (const c of wideCols) {
    const key = `${c.wide!.fy}|Q${c.wide!.q}`;
    const entry = periods.get(key) ?? { fy: c.wide!.fy, q: c.wide!.q, cols: [] };
    entry.cols.push({ tracker: c.wide!.tracker, i: c.i });
    periods.set(key, entry);
  }

  const out: CleanIaRow[] = [];
  let rowNo = 0;
  rows.forEach((cells, sourceIdx) => {
    const record: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      record[h] = cells[i] ?? null;
    });
    for (const [, period] of periods) {
      rowNo += 1;
      // Part 2: the eco tracker keeps an EMPTY placeholder slot so every
      // consumer of scores.eco still reads { value: null } — the deprecated
      // Eco column is never parsed into it, its DB values are untouched.
      const trackers = Object.fromEntries(
        ((["nqas", "kayakalp", "eco"] as const) as IaTracker[]).map((t) => {
          if (t === "eco") return [t, emptyScore(null)];
          const col = period.cols.find((c) => c.tracker === t);
          return [
            t,
            col == null ? emptyScore(null) : cleanIaScore(cells[col.i], false),
          ];
        }),
      );
      const base = cleanIaRow(record, fixedRoles, {
        rowNo,
        sourceRowNo: sourceIdx + 1,
        fyOverride: period.fy,
        qOverride: period.q,
        typeList: baseOpts.typeList,
      });
      out.push({ ...base, scores: trackers as Record<IaTracker, IaParsedScore> });
    }
  });
  return out;
}

/* ---------------------------------------------------------------------------
 * 7. MATCHING — one engine, shared with the SaQsham import
 * ------------------------------------------------------------------------- */

export type IaFacility = {
  id: string;
  name: string;
  block: string;
  phc: string;
  facilityType: string;
  /** The stored "Facility for Formula" candidates (see facilityIaKeysOf). */
  facilityKeys: string[];
  /** The master NIN (NQAS facility identifier) — the NEW format's key. */
  ninNumber?: string | null;
};

/**
 * The `facility_key` forms a facility answers to (section 4): the file writes
 * them as name_block_type, name_block_phc_type, name_phc_type or name_type.
 * Every variant is stored on the facility so ANY consistent producer matches.
 */
export function facilityIaKeysOf(f: {
  name: string;
  block: string;
  phc: string;
  facilityType: string;
}): string[] {
  const keys: string[] = [];
  const push = (s: string) => {
    if (s && !keys.includes(s)) keys.push(s);
  };
  const type = collapseOddSpaces(f.facilityType);
  push(`${f.name}_${f.phc}_${type}`);
  push(`${f.name}_${f.block}_${type}`);
  push(`${f.name}_${type}`);
  if (f.name && f.phc && f.block)
    push(`${f.name}_${f.block}_${f.phc}_${type}`);
  return keys.filter((k) => k.includes("_"));
}

export type IaMatchPoint = {
  method: MatchMethod;
  confidence: number;
  facilityId: string | null;
  /** Matched on the exact NIN (100%) — the new format's primary rule. */
  viaNin?: boolean;
  /** NIN matched, but the file's name/block/PHC/type disagree with the master. */
  crossCheck?: string | null;
} & (
  | { status: "matched" }
  | { status: "ambiguous"; candidateIds: string[] }
  | { status: "suggested"; candidateIds: string[] }
  | { status: "unmatched"; candidateIds: string[] }
);

const AMB: { method: MatchMethod; confidence: number; facilityId: null; status: "ambiguous"; candidateIds: string[] } = {
  status: "ambiguous", method: "exact", confidence: 98, facilityId: null, candidateIds: [],
};
void AMB;

/**
 * IA match order (section 4, recorded per row):
 *  1. saved facility_key → 100%
 *  2. shared alias (portal name + type) → 100%
 *  3. block + PHC + name + type exact, normalized → 98%
 *  4. name + type (+ PHC when present) → 95%
 *  5. fuzzy, same Type only, top 3 — never auto-applied below 95%
 *  6. unmatched for a manual pick.
 */
export function matchIaRow(
  row: { key: string; name: string; block: string; phc: string; facilityType: string },
  facilities: readonly IaFacility[],
  aliases: readonly FacilityAlias[] = [],
  phcAliases: Record<string, string> = {},
): IaMatchPoint {
  // 1. Saved facility_key.
  const key = collapseOddSpaces(row.key);
  if (key) {
    const byKey = facilities.filter((f) =>
      f.facilityKeys.some((k) => collapseOddSpaces(k) === key),
    );
    if (byKey.length === 1)
      return { status: "matched", method: "helper", confidence: 100, facilityId: byKey[0].id };
    if (byKey.length > 1)
      return { status: "ambiguous", method: "helper", confidence: 100, facilityId: null, candidateIds: byKey.map((f) => f.id) };
  }
  // 2. Alias.
  if (row.name) {
    for (const alias of aliases) {
      if (
        (!row.facilityType || alias.facilityType === row.facilityType) &&
        applyPhcAliases(normalizeFacilityKey(alias.portalNameNormalized), phcAliases) ===
          applyPhcAliases(normalizeFacilityKey(row.name), phcAliases)
      ) {
        return { status: "matched", method: "alias", confidence: 100, facilityId: alias.facilityId };
      }
    }
  }
  const nameN = normalizeFacilityKey(row.name);
  const blockN = normalizeFacilityKey(row.block);
  const phcN = applyPhcAliases(normalizeFacilityKey(row.phc), phcAliases);
  const typeN = String(row.facilityType ?? "").trim().toUpperCase();
  // 3. block + PHC + name + type.
  if (nameN && (blockN || phcN)) {
    const tierA = facilities.filter(
      (f) =>
        normalizeFacilityKey(f.name) === nameN &&
        (!blockN || applyPhcAliases(normalizeFacilityKey(f.block), phcAliases) === applyPhcAliases(blockN, phcAliases)) &&
        (!phcN || applyPhcAliases(normalizeFacilityKey(f.phc), phcAliases) === phcN) &&
        (!typeN || f.facilityType === typeN),
    );
    if (tierA.length === 1)
      return { status: "matched", method: "exact", confidence: 98, facilityId: tierA[0].id };
    if (tierA.length > 1)
      return { status: "ambiguous", method: "exact", confidence: 98, facilityId: null, candidateIds: tierA.map((f) => f.id) };
  }
  // 4. name + type + PHC.
  if (nameN) {
    const tierB = facilities.filter(
      (f) =>
        normalizeFacilityKey(f.name) === nameN &&
        (!typeN || f.facilityType === typeN) &&
        (!phcN || applyPhcAliases(normalizeFacilityKey(f.phc), phcAliases) === phcN),
    );
    if (tierB.length === 1)
      return { status: "matched", method: "exact", confidence: 95, facilityId: tierB[0].id };
    if (tierB.length > 1)
      return { status: "ambiguous", method: "exact", confidence: 95, facilityId: null, candidateIds: tierB.map((f) => f.id) };
    // 5. fuzzy — same Type only, top 3, never auto-applied.
    const pool = typeN ? facilities.filter((f) => f.facilityType === typeN) : facilities;
    const top = fuzzyCandidates(
      { name: row.name, facilityType: typeN },
      pool.map((f) => ({ ...f })),
      3,
    );
    if (top.length && top[0].score >= 95)
      return { status: "suggested", method: "fuzzy", confidence: top[0].score, facilityId: null, candidateIds: top.map((c) => c.facilityId) };
  }
  return { status: "unmatched", method: "none", confidence: 0, facilityId: null, candidateIds: [] };
}

/**
 * NIN-first match (section 4): the NIN is the master identifier, so an exact
 * hit is 100% — but the file's Block / PHC / Name / Type are still compared
 * against the matched facility. Any difference turns the row AMBER
 * (`crossCheck`) and it is held until the user confirms or corrects the NIN.
 *
 * A NIN that is not in scope is either "Unknown NIN" (with same-type
 * suggestions, never auto-applied) or "Outside your blocks" for a District
 * Editor — the caller passes the out-of-scope NIN set.
 */
export type IaNinMatch = {
  match: IaMatchPoint;
  /** The NIN is valid but matches no facility in this user's master list. */
  unknownNin: boolean;
  /** The NIN belongs to a facility outside the editor's blocks. */
  outsideBlocks: boolean;
  /** The plain-language cross-check sentence, null when everything agrees. */
  crossCheck: string | null;
  /** Same-type suggestions for an unknown NIN (never applied automatically). */
  suggestionIds: string[];
};

export function matchIaRowByNin(
  row: { nin?: string | null; key: string; name: string; block: string; phc: string; facilityType: string },
  facilities: readonly IaFacility[],
  ninIndex: ReadonlyMap<string, readonly IaFacility[]>,
  aliases: readonly FacilityAlias[] = [],
  phcAliases: Record<string, string> = {},
  outsideNins?: ReadonlySet<string>,
): IaNinMatch {
  const nin = normalizeIaNin(row.nin ?? "");
  if (!nin) {
    const match = matchIaRow(row, facilities, aliases, phcAliases);
    return {
      match,
      unknownNin: false,
      outsideBlocks: false,
      crossCheck: null,
      suggestionIds: match.status === "suggested" || match.status === "ambiguous" ? match.candidateIds : [],
    };
  }
  const hits = ninIndex.get(nin) ?? [];
  if (hits.length === 1) {
    const f = hits[0];
    const norm = (v: string) => applyPhcAliases(normalizeFacilityKey(v), phcAliases);
    const diffs: string[] = [];
    if (row.name.trim() && norm(row.name) !== norm(f.name)) diffs.push(`name “${row.name.trim()}”`);
    if (row.block.trim() && norm(row.block) !== norm(f.block)) diffs.push(`block “${row.block.trim()}”`);
    if (row.phc.trim() && norm(row.phc) !== norm(f.phc)) diffs.push(`PHC “${row.phc.trim()}”`);
    if (row.facilityType.trim() && row.facilityType.trim().toUpperCase() !== f.facilityType.toUpperCase()) {
      diffs.push(`type “${row.facilityType.trim()}”`);
    }
    const crossCheck = diffs.length
      ? `NIN belongs to ${f.name} (${f.block}/${f.phc}), file says ${diffs.join(", ")}`
      : null;
    return {
      match: { status: "matched", method: "exact", confidence: 100, facilityId: f.id, viaNin: true, crossCheck },
      unknownNin: false,
      outsideBlocks: false,
      crossCheck,
      suggestionIds: [],
    };
  }
  if (hits.length > 1) {
    return {
      match: { status: "ambiguous", method: "exact", confidence: 100, facilityId: null, candidateIds: hits.map((f) => f.id) },
      unknownNin: false,
      outsideBlocks: false,
      crossCheck: null,
      suggestionIds: hits.map((f) => f.id),
    };
  }
  if (outsideNins?.has(nin)) {
    return {
      match: { status: "unmatched", method: "none", confidence: 0, facilityId: null, candidateIds: [] },
      unknownNin: false,
      outsideBlocks: true,
      crossCheck: null,
      suggestionIds: [],
    };
  }
  // Unknown NIN — suggestions from the typed name / block / PHC, same type.
  // A matching block or PHC lifts a candidate even when the name is blank or
  // spelled differently; the suggestions are never auto-applied.
  const typeN = row.facilityType.trim().toUpperCase();
  const pool = typeN ? facilities.filter((f) => f.facilityType.toUpperCase() === typeN) : facilities;
  const blockN = normalizeFacilityKey(row.block);
  const phcN = applyPhcAliases(normalizeFacilityKey(row.phc), phcAliases);
  const needle = plainFacilityKey(row.name);
  const top = pool
    .map((f) => {
      const nameScore = needle ? jaroWinkler(needle, plainFacilityKey(f.name)) * 100 : 0;
      const blockBonus = blockN && normalizeFacilityKey(f.block) === blockN ? 8 : 0;
      const phcBonus =
        phcN && applyPhcAliases(normalizeFacilityKey(f.phc), phcAliases) === phcN ? 8 : 0;
      return { id: f.id, score: Math.min(100, nameScore + blockBonus + phcBonus) };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 3);
  return {
    match: {
      status: "unmatched",
      method: "fuzzy",
      confidence: Math.round((top[0]?.score ?? 0) * 10) / 10,
      facilityId: null,
      candidateIds: top.map((c) => c.id),
    },
    unknownNin: true,
    outsideBlocks: false,
    crossCheck: null,
    suggestionIds: top.map((c) => c.id),
  };
}

/** Fuzzy score helper the wizard's drawer can also use for candidates. */
export function iaFuzzyScore(a: string, b: string): number {
  return Math.round(jaroWinkler(plainFacilityKey(a), plainFacilityKey(b)) * 1000) / 10;
}

/* ---------------------------------------------------------------------------
 * 8. REMINDERS
 * ------------------------------------------------------------------------- */

/** What the banner can say about ONE ended quarter. */
export type IaCoverageState = "complete" | "partial" | "missing";

/** Stored coverage of one quarter: how many facilities in scope carry at
 *  least one IA score. A blank is never counted as 0 — and a quarter is
 *  judged by DATA, never by whether an import batch row exists. */
export type IaQuarterCoverage = {
  fy: string;
  q: 1 | 2 | 3 | 4;
  reported: number;
  total: number;
  /** Imported before the quarter ended and not marked final yet. */
  provisional?: boolean;
};

export function iaCoverageState(
  reported: number,
  total: number,
  threshold = DEFAULT_IA_COMPLETE_THRESHOLD,
): IaCoverageState {
  if (total <= 0 || reported <= 0) return "missing";
  return (reported / total) * 100 >= threshold ? "complete" : "partial";
}

/** ISO date + n days (UTC-safe, no timezone drift). */
export function addDaysIso(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetweenIso(from: string, to: string): number {
  return Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** The date a quarter's IA report is DUE = quarter end + grace days. */
export function iaDueDateIso(fy: string, q: 1 | 2 | 3 | 4, graceDays = DEFAULT_IA_GRACE_DAYS): string {
  return addDaysIso(quarterEndIso(fy, q), graceDays);
}

export type IaReminderStatus = {
  /** "Q2 2026-27" — the most recent ENDED quarter that is not Complete. */
  dueLabel: string | null;
  dueFy: string | null;
  dueQ: 1 | 2 | 3 | 4 | null;
  /** Facilities with at least one IA score in the due quarter. */
  reported: number;
  total: number;
  state: IaCoverageState | null;
  /** Quarter end + grace days (null when nothing is due). */
  dueDateIso: string | null;
  /** today − due date; 0 until the grace period has actually run out. */
  overdueDays: number;
  /** The exact banner sentence (null when no banner is needed). */
  message: string | null;
  /** The latest quarter that HAS data ("Q3 2026-27"), provisional or not. */
  lastImportedLabel: string | null;
  lastImportedFy: string | null;
  lastImportedQ: 1 | 2 | 3 | 4 | null;
  /** That latest quarter was imported before it ended (and not final). */
  latestProvisional: boolean;
  /** An ended quarter with data that is still marked provisional. */
  finalCandidate: { fy: string; q: 1 | 2 | 3 | 4; label: string; reported: number; total: number } | null;
};

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** 05-Oct-2026 — the app's long date, kept local so this rule stays pure. */
export function formatDueDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}-${MONTH_ABBR[Number(m) - 1] ?? m}-${y}` : iso;
}

/**
 * ONE reminder rule for the banner, the success line and the email.
 *
 * PART 2 ROOT CAUSE: the old rule asked "does this quarter have ANY stored
 * row?" and ignored coverage, the grace period and the admin thresholds — so
 * a partially reported quarter looked complete, a legacy/back-filled quarter
 * looked missing, and the overdue count started at the quarter end instead of
 * the due date. Coverage now comes from the stored data, per quarter.
 */
export function iaReminderStatus(
  today: string,
  coverage: readonly IaQuarterCoverage[],
  opts: {
    graceDays?: number;
    totalFacilities?: number;
    threshold?: number;
  } = {},
): IaReminderStatus {
  const graceDays = opts.graceDays ?? DEFAULT_IA_GRACE_DAYS;
  const threshold = opts.threshold ?? DEFAULT_IA_COMPLETE_THRESHOLD;
  const cur = currentIaQuarter(today);
  const covOf = (fy: string, q: number) => coverage.find((c) => c.fy === fy && c.q === q);
  const totalOf = (fy: string, q: number) => {
    const cov = covOf(fy, q);
    return cov?.total && cov.total > 0 ? cov.total : (opts.totalFacilities ?? 0);
  };

  // ONLY the reporting quarter is judged: the most recent quarter whose end
  // date AND the admin grace period are behind us. Older quarters can never
  // raise the Dashboard banner — they live in the History-gaps panel instead.
  // (Root cause of "Q3 2025-26 is 301 days overdue" while Q3 2026-27 had just
  // been imported: the loop walked back through every ended quarter and kept
  // the oldest quarter that was still below the threshold.)
  const window = lastQuarters(cur.fy, cur.q, 6);
  const ended = window.filter((w) => iaDueDateIso(w.fy, w.q, graceDays) <= today);
  const reporting = ended.length ? ended[ended.length - 1] : null;
  let due: FyQuarter | null = null;
  if (reporting) {
    const cov = covOf(reporting.fy, reporting.q);
    const state = iaCoverageState(
      cov?.reported ?? 0,
      totalOf(reporting.fy, reporting.q),
      threshold,
    );
    if (state !== "complete") due = reporting;
  }

  // The latest quarter with data (may be the quarter in progress).
  const withData = coverage
    .filter((c) => c.reported > 0)
    .sort((a, b) => quarterOrder(b.fy, b.q) - quarterOrder(a.fy, a.q));
  const latest = withData[0] ?? null;
  const latestProvisional = !!latest?.provisional;

  // An ended quarter that still carries the provisional flag (imported before
  // it ended) can be marked final by a State Admin.
  const finalQ = withData.find(
    (c) => c.provisional && quarterEndIso(c.fy, c.q) < today,
  );

  if (!due) {
    return {
      dueLabel: null,
      dueFy: null,
      dueQ: null,
      reported: 0,
      total: 0,
      state: null,
      dueDateIso: null,
      overdueDays: 0,
      message: null,
      lastImportedLabel: latest ? formatFyQuarter(latest.fy, latest.q) : null,
      lastImportedFy: latest?.fy ?? null,
      lastImportedQ: latest?.q ?? null,
      latestProvisional,
      finalCandidate: finalQ
        ? {
            fy: finalQ.fy,
            q: finalQ.q,
            label: formatFyQuarter(finalQ.fy, finalQ.q),
            reported: finalQ.reported,
            total: finalQ.total,
          }
        : null,
    };
  }

  const total = totalOf(due.fy, due.q);
  const reported = covOf(due.fy, due.q)?.reported ?? 0;
  const state = iaCoverageState(reported, total, threshold);
  const dueDate = iaDueDateIso(due.fy, due.q, graceDays);
  const overdue = Math.max(0, daysBetweenIso(dueDate, today));
  const label = formatFyQuarter(due.fy, due.q);
  const overdueText = overdue > 0 ? ` (${overdue} day${overdue === 1 ? "" : "s"} overdue)` : "";
  return {
    dueLabel: label,
    dueFy: due.fy,
    dueQ: due.q,
    reported,
    total,
    state,
    dueDateIso: dueDate,
    overdueDays: overdue,
    message: `${label} IA report: ${reported} of ${total} facilities reported. Due ${formatDueDate(dueDate)}${overdueText}`,
    lastImportedLabel: latest ? formatFyQuarter(latest.fy, latest.q) : null,
    lastImportedFy: latest?.fy ?? null,
    lastImportedQ: latest?.q ?? null,
    latestProvisional,
    finalCandidate: null,
  };
}

/** Blank-warning condenser (section 3 rule 5): many blank cells in a whole
 *  column for one quarter become ONE info message. */
export function blankTrackerMessage(
  tracker: IaTracker,
  blankCount: number,
  total: number,
): string | null {
  if (blankCount === 0 || blankCount < total) return null;
  return `${TRACKER_LABELS[tracker]} not reported for this quarter (${blankCount} of ${total} rows blank)`;
}

/* ===========================================================================
 * 9. PREVIEW — one pure pass from cleaned rows + the stored quarters.
 * ======================================================================== */

export type IaPreviewState =
  | "ready"
  | "no_change"
  | "needs_review"
  | "unmatched"
  | "ambiguous"
  | "skipped"
  | "error";

export type IaRowChange = "new" | "changed" | "same" | "none";

/** One stored quarter row (the context query returns exactly this shape). */
export type IaStoredQuarter = {
  facilityId: string;
  fy: string;
  quarter: number;
  nqasIaScore: number | null;
  kayakalpIaScore: number | null;
  ecoFriendlyScore: number | null;
  nqasRemark: string | null;
  kayakalpRemark: string | null;
  ecoRemark: string | null;
  lockedAt: number | null;
  updatedAt: number;
};

/** One sparkline point — the four quarters ending at the row's period. */
export type IaTrendPoint = {
  label: string;
  nqas: number | null;
  kayakalp: number | null;
};

export type IaPreviewRow = {
  rowNo: number;
  sourceRowNo: number;
  cleaned: CleanIaRow;
  match: IaMatchPoint;
  facilityId: string | null;
  facilityName: string;
  facilityBlock: string;
  facilityPhc: string;
  facilityType: string;
  /** The cleaned NIN (digits, padded) — the master identifier. */
  nin: string | null;
  ninError: string | null;
  ninPadded: boolean;
  /** Amber: the NIN matches but name/block/PHC/type disagree. */
  crossCheck: string | null;
  /** Held until the user confirms the NIN (or picks the right facility). */
  needsNinConfirm: boolean;
  /** Red: a valid NIN that matches nothing in this user's master list. */
  unknownNin: boolean;
  /** Grey: the NIN belongs to a facility outside the editor's blocks. */
  outsideBlocks: boolean;
  /** Same-type suggestions for an unknown NIN (never auto-applied). */
  suggestionIds: string[];
  /** Trackers edited in the preview before approval. */
  edited: IaTracker[];
  fy: string | null;
  q: 1 | 2 | 3 | 4 | null;
  /** Stored value present BEFORE this import: null = not reported. */
  current: Record<IaTracker, number | null>;
  currentRemark: Record<IaTracker, string | null>;
  /** The PREVIOUS quarter's stored value (trend + large-change checks). */
  prev: Record<IaTracker, number | null>;
  /** Last four quarters ending at this row's period, the new point included. */
  trend: IaTrendPoint[];
  change: Record<IaTracker, IaRowChange>;
  state: IaPreviewState;
  include: boolean;
  locked: boolean;
  /** > STALE_QUARTERS behind the current one — "Past quarter edit" chip. */
  stale: boolean;
  /** Strictly in the future — an error. */
  future: boolean;
  warnings: string[];
  /** The non-blocking chips: large change, same-as-previous, below 70… */
  chips: string[];
};

export type IaSummary = {
  rowsInFile: number;
  /** Rows carrying at least one NEW value (no stored value for the quarter). */
  newCount: number;
  /** Rows carrying at least one CHANGED stored value. */
  changedCount: number;
  willChange: number;
  noChange: number;
  notReported: number;
  needsReview: number;
  unmatched: number;
  ambiguous: number;
  unknownNin: number;
  outsideBlocks: number;
  errors: number;
  warnings: number;
  skipped: number;
  /** Facilities in the Master List with NO row in this file (info only). */
  missing: string[];
};

/** Coverage of one period in the preview — "10 of 157 will have a score". */
export type IaCoveragePeriod = {
  fy: string;
  q: 1 | 2 | 3 | 4;
  label: string;
  nqas: number;
  kayakalp: number;
  total: number;
  blocks: { block: string; nqas: number; kayakalp: number; total: number }[];
};

/** The stored lookup the preview compares against, keyed facility|fy|Qq. */
function storedMap(rows: readonly IaStoredQuarter[]): Map<string, IaStoredQuarter> {
  const map = new Map<string, IaStoredQuarter>();
  for (const r of rows) map.set(`${r.facilityId}|${r.fy}|Q${r.quarter}`, r);
  return map;
}

const prevKeyOf = (fy: string, q: number): [string, number] => {
  const p = previousQuarter(fy, q as 1 | 2 | 3 | 4);
  return [p.fy, p.q];
};

/**
 * De-duplicate repeated (facility, fy, quarter) rows (section 3 rule 6):
 * the LAST row holding ANY non-blank score wins; both rows land in the
 * preview (the loser flagged "duplicate"). S. No / position are never used.
 */
export function dedupeIaRows(
  rows: readonly CleanIaRow[],
): { kept: Map<number, number>; grouped: CleanIaRow[] } {
  const groups = new Map<string, CleanIaRow[]>() as Map<string, CleanIaRow[]>;
  const kept = new Map<number, number>();
  for (const row of rows) {
    // The NIN is the identity when present; the old key/name only groups the
    // legacy format (a row without a NIN can never collide with a NIN row).
    const id = row.nin ? `nin:${row.nin}` : `key:${collapseOddSpaces(row.key || row.name).toLowerCase()}`;
    const key = `${id}|${row.fy ?? "?"}|Q${row.q ?? "?"}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  const grouped: CleanIaRow[] = [];
  for (const list of groups.values()) {
    if (list.length === 1) {
      grouped.push(list[0]);
      continue;
    }
    const nonBlank = list.filter((r) =>
      IA_TRACKERS.some((t) => r.scores[t].value != null || r.scores[t].remark != null || r.scores[t].error),
    );
    const winner = nonBlank.length ? nonBlank[nonBlank.length - 1] : list[list.length - 1];
    for (const r of list) kept.set(r.rowNo, winner.rowNo === r.rowNo ? 1 : 0);
    for (const r of list) grouped.push(r);
  }
  return { kept, grouped };
}

export type IaPreviewOptions = {
  today: string;
  recent: readonly IaStoredQuarter[];
  /** Manual facility picks keyed by source rowNo. */
  manual?: Record<number, string>;
  /** Rows whose amber NIN cross-check the user has accepted. */
  confirmedNin?: Record<number, boolean>;
  /** Score cells edited in the preview, keyed by rowNo → tracker → text. */
  scoreEdits?: Record<number, Partial<Record<IaTracker, string | number | null>>>;
  /** NINs that exist outside a District Editor's blocks (grey rows). */
  outsideNins?: ReadonlySet<string>;
  facilityTotal?: number;
};

export type IaPreviewResult = {
  rows: IaPreviewRow[];
  summary: IaSummary;
  quarters: FyQuarter[];
  coverage: IaCoveragePeriod[];
  /** File-level, non-blocking notes (swapped columns, an all-blank tracker). */
  fileWarnings: string[];
};

export function buildIaPreview(
  rows: readonly CleanIaRow[],
  facilities: readonly IaFacility[],
  aliases: readonly FacilityAlias[],
  opts: IaPreviewOptions,
  phcAliases: Record<string, string> = {},
): IaPreviewResult {
  const stored = storedMap(opts.recent);
  const byId = new Map(facilities.map((f) => [f.id, f]));
  const ninIndex = buildIaNinIndex(facilities);
  const { kept } = dedupeIaRows(rows);
  const manuallyByRow = opts.manual ?? {};
  const confirmedNin = opts.confirmedNin ?? {};
  const scoreEdits = opts.scoreEdits ?? {};

  const out: IaPreviewRow[] = [];
  const quartersSeen = new Map<string, FyQuarter>();
  const blankByQuarterTracker = new Map<string, { total: number; blank: Partial<Record<IaTracker, number>> }>();

  for (const row of rows) {
    if (row.fy && row.q) quartersSeen.set(`${row.fy}|Q${row.q}`, { fy: row.fy, q: row.q });
    const quarterTag = row.fy ? `${row.fy}|Q${row.q ?? "?"}` : "?";
    const agg = blankByQuarterTracker.get(quarterTag) ?? { total: 0, blank: {} };
    agg.total += 1;
    blankByQuarterTracker.set(quarterTag, agg);

    // ---- match: NIN first, the old key-based engine as the fallback ----
    const ninMatch = matchIaRowByNin(
      { nin: row.nin, key: row.key, name: row.name, block: row.block, phc: row.phc, facilityType: row.facilityType },
      facilities,
      ninIndex,
      aliases,
      phcAliases,
      opts.outsideNins,
    );
    let match = ninMatch.match;
    const manualId = manuallyByRow[row.rowNo];
    if (manualId && byId.has(manualId)) {
      match = { status: "matched", method: "manual", confidence: 100, facilityId: manualId };
    }
    const facility = match.facilityId ? byId.get(match.facilityId) ?? null : null;
    const crossCheck = manualId ? null : ninMatch.crossCheck;
    const needsNinConfirm = !!crossCheck && !confirmedNin[row.rowNo];
    const edited: IaTracker[] = [];
    const rowEdits = scoreEdits[row.rowNo] ?? {};
    const scores: Record<IaTracker, IaParsedScore> = { ...row.scores };
    for (const t of IA_TRACKERS) {
      const override = rowEdits[t];
      if (override === undefined) continue;
      const text = override == null ? "" : String(override);
      const cleaned = cleanIaScore(text, false);
      scores[t] = { ...cleaned, raw: text };
      edited.push(t);
    }
    const cleanedRow: CleanIaRow = edited.length ? { ...row, scores } : row;
    const currentKey = facility && row.fy && row.q
      ? `${facility.id}|${row.fy}|Q${row.q}`
      : null;
    const cur = (currentKey && stored.get(currentKey)) || null;
    const [prevFy, prevQ] = row.fy && row.q ? prevKeyOf(row.fy, row.q) : [null, null];
    const prevQuarterId = facility && prevFy ? `${facility.id}|${prevFy}|Q${prevQ}` : null;
    const prevRow = prevQuarterId ? stored.get(prevQuarterId) ?? null : null;

    const current: Record<IaTracker, number | null> = {
      nqas: cur?.nqasIaScore ?? null,
      kayakalp: cur?.kayakalpIaScore ?? null,
      eco: cur?.ecoFriendlyScore ?? null,
    };
    const currentRemark: Record<IaTracker, string | null> = {
      nqas: cur?.nqasRemark ?? null,
      kayakalp: cur?.kayakalpRemark ?? null,
      eco: cur?.ecoRemark ?? null,
    };
    const prev: Record<IaTracker, number | null> = {
      nqas: prevRow?.nqasIaScore ?? null,
      kayakalp: prevRow?.kayakalpIaScore ?? null,
      eco: prevRow?.ecoFriendlyScore ?? null,
    };
    const trend = facility && row.fy && row.q
      ? trendOf(
          facility.id,
          row.fy,
          row.q,
          stored,
          scores.nqas.value ?? undefined,
          scores.kayakalp.value ?? undefined,
        )
      : [];

    // ---- per-tracker change ----
    const change: Record<IaTracker, IaRowChange> = { nqas: "none", kayakalp: "none", eco: "none" };
    const chips: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [...row.warnings];
    for (const t of IA_TRACKERS) {
      const score = scores[t];
      if (score.error) {
        change[t] = "none";
        errors.push(`${TRACKER_LABELS[t]} ${score.raw} is outside 0–100`);
        continue;
      }
      if (score.raw.trim() === "") {
        // Blank cell: only an info; a stored value survives (never erased).
        agg.blank[t] = (agg.blank[t] ?? 0) + 1;
        change[t] = "none";
        continue;
      }
      if (score.fraction) chips.push("Converted from fraction");
      const oldVal = cur ? (cur[trackerField(t)] ?? null) : null;
      const oldRemark = cur ? (cur[trackerRemarkField(t)] ?? null) : null;
      if (
        oldVal == null &&
        score.value == null &&
        score.remark != null &&
        score.remark === oldRemark
      ) {
        // A remark-only cell re-imported unchanged is NOT a new value — this
        // is what makes a second paste of the same file idempotent.
        change[t] = "same";
      } else if (oldVal == null) {
        change[t] = "new";
      } else if (oldVal !== (score.value ?? null)) {
        change[t] = "changed";
      } else {
        change[t] = "same";
        if (score.remark && score.remark !== oldRemark) change[t] = "changed";
      }
      const delta = prev[t] != null && score.value != null ? score.value - prev[t]! : null;
      if (delta != null && Math.abs(delta) >= LARGE_CHANGE) {
        chips.push(`Large change (${delta > 0 ? "+" : "−"}${Math.abs(Math.round(delta * 100) / 100)})`);
      }
      if (score.value != null && delta != null && Math.abs(delta) < 0.01) {
        chips.push("Same as previous quarter");
      }
      if (score.value != null && score.value < SCORE_BARS.amber) chips.push("Below 50");
      if (score.value != null && score.value < SCORE_BARS.green) {
        const label = `Below ${SCORE_BARS.green}`;
        if (!chips.includes(label)) chips.push(label);
      }
    }
    if (row.ninPadded) chips.push("NIN padded; format the column as Text");

    // ---- row-level flags ----
    const future = row.fy != null && row.q != null && isFutureQuarter(row.fy, row.q, opts.today);
    if (future) errors.push("This quarter is in the future");
    if (row.fyError) errors.push("Financial Year not recognised");
    if (row.qError) errors.push("Quarter not recognised");
    if (!row.name && !row.key && !row.nin) errors.push("No facility identifier on this row");
    if (row.ninError) errors.push(row.ninError);
    const stale =
      row.fy != null && row.q != null && quartersBehind(row.fy, row.q, opts.today) >= STALE_QUARTERS;
    // Duplicate member rows (kept.get === 0) and members of ANY duplicated
    // group (kept.get === 1 while the row appears more than once) review first.
    const duplicateMember = kept.has(row.rowNo);
    const writesAnything = IA_TRACKERS.some(
      (t) => change[t] === "new" || change[t] === "changed",
    );
    const state: IaPreviewState = errors.length
      ? "error"
      : !facility
        ? ninMatch.outsideBlocks
          ? "skipped"
          : match.status === "ambiguous"
            ? "ambiguous"
            : "unmatched"
        : duplicateMember || needsNinConfirm
          ? "needs_review"
          : writesAnything
            ? "ready"
            : "no_change";
    if (match.status === "suggested") warnings.push(`Did you mean ${facName(facilities, match.candidateIds[0])}? (suggestion, never auto-applied)`);
    if (row.fy && row.q && quartersBehind(row.fy, row.q, opts.today) > 0) chips.push("Past quarter edit");
    if (edited.length) chips.push("Edited in the preview");
    if (!row.nin && facility && !manualId) chips.push("Matched without a NIN (old key)");

    const include =
      (state === "ready" || state === "no_change") && !needsNinConfirm && !ninMatch.outsideBlocks;

    out.push({
      rowNo: row.rowNo,
      sourceRowNo: row.sourceRowNo,
      cleaned: cleanedRow,
      match,
      facilityId: facility?.id ?? null,
      facilityName: facility?.name ?? "",
      facilityBlock: facility?.block ?? row.block,
      facilityPhc: facility?.phc ?? row.phc,
      facilityType: facility?.facilityType ?? row.facilityType,
      nin: row.nin,
      ninError: row.ninError,
      ninPadded: row.ninPadded,
      crossCheck,
      needsNinConfirm,
      unknownNin: ninMatch.unknownNin,
      outsideBlocks: ninMatch.outsideBlocks,
      suggestionIds: ninMatch.suggestionIds,
      edited,
      fy: row.fy,
      q: row.q,
      current,
      currentRemark,
      prev,
      trend,
      change,
      state,
      include,
      locked: !!(cur?.lockedAt),
      stale,
      future,
      warnings,
      chips,
    });
  }

  const summary: IaSummary = {
    rowsInFile: rows.length,
    newCount: out.filter((r) => IA_TRACKERS.some((t) => r.change[t] === "new")).length,
    changedCount: out.filter((r) => IA_TRACKERS.some((t) => r.change[t] === "changed")).length,
    willChange: out.filter((r) => r.include && r.state === "ready").length,
    noChange: out.filter((r) => r.state === "no_change").length,
    notReported: out.filter((r) =>
      r.cleaned.scores.nqas.raw.trim() === "" &&
      r.cleaned.scores.kayakalp.raw.trim() === "" &&
      r.cleaned.scores.eco.raw.trim() === ""
    ).length,
    needsReview: out.filter((r) => r.state === "needs_review").length,
    unmatched: out.filter((r) => r.state === "unmatched").length,
    ambiguous: out.filter((r) => r.state === "ambiguous").length,
    unknownNin: out.filter((r) => r.unknownNin).length,
    outsideBlocks: out.filter((r) => r.outsideBlocks).length,
    errors: out.filter((r) => r.state === "error").length,
    warnings: out.filter((r) => r.warnings.length > 0 || r.chips.length > 0).length,
    skipped: out.filter((r) => r.state === "skipped").length,
    missing: missingFacilities(facilities, out),
  };

  // ---- file-level warnings (never per-row noise) ----
  const fileWarnings: string[] = [];
  if (rows.length > 0) {
    for (const t of IA_TRACKERS) {
      const allBlank = out.every((r) => r.cleaned.scores[t].raw.trim() === "");
      if (allBlank) fileWarnings.push(`${TRACKER_LABELS[t]} not reported in this file`);
    }
    const bothScored = out.filter(
      (r) => r.cleaned.scores.nqas.value != null && r.cleaned.scores.kayakalp.value != null,
    );
    const swapped = bothScored.filter(
      (r) => r.cleaned.scores.kayakalp.value! - r.cleaned.scores.nqas.value! >= 15,
    );
    if (bothScored.length >= 3 && swapped.length / bothScored.length >= 0.6) {
      fileWarnings.push("NQAS and Kayakalp look swapped — check the two score columns");
    }
  }

  return {
    rows: out,
    summary,
    quarters: [...quartersSeen.values()],
    coverage: iaPreviewCoverage(out, facilities),
    fileWarnings,
  };
}

/** The four quarters ending at (fy, q), with this row's new value in the last. */
function trendOf(
  facilityId: string,
  fy: string,
  q: 1 | 2 | 3 | 4,
  stored: ReadonlyMap<string, IaStoredQuarter>,
  newNqas: number | undefined,
  newKayakalp: number | undefined,
): IaTrendPoint[] {
  return lastQuarters(fy, q, 4).map((p, i, all) => {
    const storedRow = stored.get(`${facilityId}|${p.fy}|Q${p.q}`);
    const isLast = i === all.length - 1;
    return {
      label: formatFyQuarter(p.fy, p.q),
      nqas: isLast && newNqas != null ? newNqas : storedRow?.nqasIaScore ?? null,
      kayakalp: isLast && newKayakalp != null ? newKayakalp : storedRow?.kayakalpIaScore ?? null,
    };
  });
}

/**
 * Coverage per period: how many facilities WILL hold a score once the
 * included rows are applied (new value, else the stored one). A blank is
 * never counted; a block's total is the facilities in that block.
 */
export function iaPreviewCoverage(
  rows: readonly IaPreviewRow[],
  facilities: readonly IaFacility[],
): IaCoveragePeriod[] {
  const periods = new Map<string, { fy: string; q: 1 | 2 | 3 | 4; nqas: Set<string>; kayakalp: Set<string> }>();
  for (const r of rows) {
    if (!r.facilityId || !r.fy || !r.q) continue;
    const key = `${r.fy}|Q${r.q}`;
    const p = periods.get(key) ?? { fy: r.fy, q: r.q, nqas: new Set(), kayakalp: new Set() };
    // An EXCLUDED row keeps whatever is stored; an included row gets the new
    // value (or keeps the stored one when the file left it blank).
    const nextNqas = r.include ? (r.cleaned.scores.nqas.value ?? r.current.nqas) : r.current.nqas;
    const nextKayakalp = r.include
      ? (r.cleaned.scores.kayakalp.value ?? r.current.kayakalp)
      : r.current.kayakalp;
    if (nextNqas != null) p.nqas.add(r.facilityId);
    if (nextKayakalp != null) p.kayakalp.add(r.facilityId);
    periods.set(key, p);
  }
  return [...periods.values()]
    .sort((a, b) => quarterOrder(a.fy, a.q) - quarterOrder(b.fy, b.q))
    .map((p) => {
      const blocks = [...new Set(facilities.map((f) => f.block))]
        .sort((a, b) => a.localeCompare(b, "en-IN"))
        .map((block) => {
          const ids = new Set(facilities.filter((f) => f.block === block).map((f) => f.id));
          return {
            block,
            nqas: [...p.nqas].filter((id) => ids.has(id)).length,
            kayakalp: [...p.kayakalp].filter((id) => ids.has(id)).length,
            total: ids.size,
          };
        });
      return {
        fy: p.fy,
        q: p.q,
        label: formatFyQuarter(p.fy, p.q),
        nqas: p.nqas.size,
        kayakalp: p.kayakalp.size,
        total: facilities.length,
        blocks,
      };
    });
}

function trackerField(t: IaTracker): "nqasIaScore" | "kayakalpIaScore" | "ecoFriendlyScore" {
  return t === "nqas" ? "nqasIaScore" : t === "kayakalp" ? "kayakalpIaScore" : "ecoFriendlyScore";
}
function trackerRemarkField(t: IaTracker): "nqasRemark" | "kayakalpRemark" | "ecoRemark" {
  return t === "nqas" ? "nqasRemark" : t === "kayakalp" ? "kayakalpRemark" : "ecoRemark";
}
function facName(facilities: readonly IaFacility[], id: string | undefined): string {
  return facilities.find((f) => f.id === id)?.name ?? "?";
}
/** Coverage panel — facilities in the Master List NOT in this file (info). */
function missingFacilities(
  facilities: readonly IaFacility[],
  rows: readonly IaPreviewRow[],
): string[] {
  const matched = new Set(rows.map((r) => r.facilityId).filter(Boolean));
  return facilities.filter((f) => !matched.has(f.id)).map((f) => f.name);
}
