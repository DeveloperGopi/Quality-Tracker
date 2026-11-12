// Pure import matching + validation for the NQAS Tracker template imports
// (SaQsham documents status, Internal Assessment scores).
//
// Kept free of Convex/React so the wizard (browser), the Convex mutations
// (server, the authoritative preflight pass) and the bun unit tests all run
// the exact same rules.

/** Lowercase, NFC-normalise and drop everything but letters/numbers — so
 *  "PHC  Alangayam " and "phc alangayam" and trailing commas compare equal,
 *  including Tamil names (Tamil letters are \p{L}). */
export function normalizeNameKey(value: unknown): string {
  return String(value ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/** NIN comparison key — alphanumerics only (formatting differences between
 *  the SaQsham sheet and the master list must not break a match). */
export function normalizeNinKey(value: unknown): string {
  return String(value ?? "").replace(/[^A-Za-z0-9]/g, "").toLowerCase();
}

export type MatchCandidate = {
  name: string;
  block: string;
  phc?: string | null;
  ninNumber?: string | null;
};

export type MatchResult =
  | { ok: true; facility: MatchCandidate }
  | { ok: false; status: "error"; reason: string };

/** Match a template row to a facility — NIN first (the unique key), then
 *  facility name + block as the documented fallback.
 *
 *  Errors (never guesses): an NIN matching 2+ facilities, or a name+block
 *  matching 2+ facilities, is reported as the row's problem instead of
 *  silently picking the wrong record. */
export function matchFacility(
  input: { nin?: unknown; name?: unknown; block?: unknown },
  facilities: MatchCandidate[],
  rowIndex: number,
): MatchResult {
  const nin = normalizeNinKey(input.nin);
  if (nin) {
    const byNin = facilities.filter(
      (f) => f.ninNumber && normalizeNinKey(f.ninNumber) === nin,
    );
    if (byNin.length === 1) return { ok: true, facility: byNin[0] };
    if (byNin.length > 1)
      return {
        ok: false,
        status: "error",
        reason: `Row ${rowIndex}: NIN ${nin} matches ${byNin.length} facilities — fix the master list pickup or add a name`,
      };
    // NIN given but unknown: fall through to name+block (the sheet may carry
    // an old NIN while the master list has none yet).
  }
  const nameKey = normalizeNameKey(input.name);
  const blockKey = normalizeNameKey(input.block);
  if (!nameKey || !blockKey) {
    return {
      ok: false,
      status: "error",
      reason: `Row ${rowIndex}: no facility match${nin && !input.name ? ` for NIN ${nin}` : " — NIN, facility name and block are all empty"}`,
    };
  }
  const byNameBlock = facilities.filter(
    (f) => normalizeNameKey(f.name) === nameKey && normalizeNameKey(f.block) === blockKey,
  );
  if (byNameBlock.length === 1) return { ok: true, facility: byNameBlock[0] };
  if (byNameBlock.length > 1)
    return {
      ok: false,
      status: "error",
      reason: `Row ${rowIndex}: "${String(input.name)}" in block ${String(input.block)} matches ${byNameBlock.length} facilities`,
    };
  return {
    ok: false,
    status: "error",
    reason: `Row ${rowIndex}: no facility named "${String(input.name)}" in block ${String(input.block)}${nin ? ` with NIN ${nin}` : ""}`,
  };
}

/** Parse a score cell — accepts numbers, "85", "85%", " 85.5 " etc.
 *  Anything outside 0–100 is an error. */
export function parseScore(
  raw: unknown,
  label: string,
): { ok: true; value: number } | { ok: false; reason: string } {
  if (raw == null || raw === "") {
    return { ok: false, reason: `${label.replace("%", "").trim()} is empty` };
  }
  const text = String(raw).replace(/%|\s/g, "").replace(/,(\d+)$/, ".$1");
  const value = Number(text);
  if (!Number.isFinite(value)) {
    return { ok: false, reason: `${label} "${String(raw)}" is not a number` };
  }
  if (value < 0 || value > 100) {
    return { ok: false, reason: `${label} ${value} is outside 0–100` };
  }
  return { ok: true, value: Math.round(value * 100) / 100 };
}

/** Parse a date cell from user Excel files. Accepts real Date objects
 *  (XLSX cellDates), Excel serial numbers, and the common string formats:
 *  yyyy-mm-dd, dd-mm-yyyy, dd/mm/yyyy (with mm/dd disambiguated only when a
 *  day-first reading is impossible). Returns ISO yyyy-mm-dd or null. */
export function parseDateValue(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return isoOfParts(raw.getFullYear(), raw.getMonth() + 1, raw.getDate());
  }
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 20000) {
    // Excel serial (1900 epoch): 25569 days separate it from the Unix epoch.
    const ms = Math.round((raw - 25569) * 86400_000);
    const d = new Date(ms);
    // Serials carry no timezone; read the UTC date to avoid off-by-one.
    return isoOfParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const s = String(raw).trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (m) return isoFromNumbers(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(s);
  if (m) {
    const [, a, b, yearRaw] = m;
    let year = +yearRaw;
    if (year < 100) year += 2000;
    // Day-first when the first number can't be a month (Tamil Nadu sheets).
    if (+a > 12) return isoFromNumbers(year, +b, +a);
    if (+b > 12) return isoFromNumbers(year, +a, +b);
    // Ambiguous dd/mm vs mm/dd — dd/mm (Indian usage) wins.
    return isoFromNumbers(year, +b, +a);
  }
  const ts = Date.parse(s);
  if (!Number.isNaN(ts)) {
    const d = new Date(ts);
    return isoOfParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  return null;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function isoOfParts(y: number, mo: number, d: number): string {
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

function isoFromNumbers(y: number, mo: number, d: number): string | null {
  if (y < 1990 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d, 12);
  if (dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null; // e.g. 31-02
  return isoOfParts(y, mo, d);
}

/** FY 2026-27 quarter bucket of an IA date — Apr–Jun = Q1, Jul–Sep = Q2.
 *  Dates outside the fiscal year's recorded quarters return null: the score
 *  is still stored as the facility's latest IA, but no quarterly column is
 *  touched (the wizard flags this as a warning, not an error). */
export const IA_FY_START_YEAR = 2026;

export function iaQuarterBucket(
  iso: string,
): { fy: string; quarter: "Q1" | "Q2" } | null {
  const [y, mo] = iso.split("-").map(Number);
  if (!y) return null;
  // FY 2026-27 = Apr 2026 → Mar 2027. Only Q1 (Apr–Jun 2026) and Q2
  // (Jul–Sep 2026) have facility columns; Q3+ scores still import as the
  // latest IA but no quarterly column exists to receive them.
  if (y === IA_FY_START_YEAR) {
    if (mo < 4 || mo >= 10) return null; // Jan–Mar (prior FY) / Oct+ (Q3)
    return mo <= 6 ? { fy: "2026-27", quarter: "Q1" } : { fy: "2026-27", quarter: "Q2" };
  }
  return null;
}

export function isIsoDateGuest(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// ---------------------------------------------------------------------------
// Row validation — SaQsham documents status
// ---------------------------------------------------------------------------

export type SaqshamRowInput = {
  rowNo: number;
  nin?: unknown;
  name?: unknown;
  block?: unknown;
  docStatus?: unknown;
};

export type ValidatedSaqshamRow = {
  rowNo: number;
  status: "valid" | "warning" | "error";
  reasons: string[];
  /** Cleaned values ready for the server apply pass. */
  payload: {
    nin: string | null;
    name: string | null;
    block: string | null;
    docStatus: string | null;
  };
};

export function validateSaqshamRow(
  row: SaqshamRowInput,
  facilities: MatchCandidate[],
  allowedStatuses: string[],
): ValidatedSaqshamRow {
  const reasons: string[] = [];
  const docStatusRaw = String(row.docStatus ?? "").trim();
  if (!docStatusRaw) reasons.push(`Row ${row.rowNo}: SaQsham Documents Status is empty`);
  else if (
    !allowedStatuses.some(
      (s) => normalizeNameKey(s) === normalizeNameKey(docStatusRaw),
    )
  ) {
    reasons.push(
      `Row ${row.rowNo}: status "${docStatusRaw}" is not one of the workflow stages`,
    );
  }
  const match = matchFacility(row, facilities, row.rowNo);
  if (!match.ok) {
    reasons.push(match.reason);
  }
  const matchFac = match.ok ? match.facility : null;
  return {
    rowNo: row.rowNo,
    status: reasons.length ? "error" : "valid",
    reasons,
    payload: {
      nin: match.ok ? (matchFac!.ninNumber ?? (normalizeNinKey(row.nin) || null)) : null,
      name: match.ok ? matchFac!.name : null,
      block: match.ok ? matchFac!.block : null,
      docStatus: docStatusRaw || null,
    },
  };
}

// ---------------------------------------------------------------------------
// Row validation — Internal Assessment
// ---------------------------------------------------------------------------

export type IaRowInput = {
  rowNo: number;
  nin?: unknown;
  name?: unknown;
  block?: unknown;
  assessmentDate?: unknown;
  scorePct?: unknown;
  /** "NQAS" (default) | "Kayakalp" — which tracker the score belongs to. */
  tracker?: unknown;
};

export type ValidatedIaRow = {
  rowNo: number;
  status: "valid" | "warning" | "error";
  reasons: string[];
  payload: {
    nin: string | null;
    name: string | null;
    block: string | null;
    assessmentDate: string | null;
    scorePct: number | null;
    tracker: "NQAS" | "Kayakalp";
    /** FY 2026-27 Q1/Q2 bucket when the date falls inside it. */
    quarter: "Q1" | "Q2" | null;
    fy: string | null;
  };
};

export function validateIaRow(
  row: IaRowInput,
  facilities: MatchCandidate[],
): ValidatedIaRow {
  const reasons: string[] = [];
  const trackerRaw = normalizeNameKey(row.tracker) || "nqas";
  const tracker: "NQAS" | "Kayakalp" = trackerRaw.startsWith("kayak")
    ? "Kayakalp"
    : "NQAS";

  const assessmentDate = parseDateValue(row.assessmentDate);
  if (!assessmentDate) {
    reasons.push(`Row ${row.rowNo}: assessment date is missing or unrecognised`);
  } else if (!iaQuarterBucket(assessmentDate)) {
    // Warning only: the score still imports as the facility's latest IA.
    reasons.push(
      `Row ${row.rowNo}: ${assessmentDate} is outside FY 2026-27 Q1/Q2 — stored as the latest IA without a quarterly column`,
    );
  }

  const score = parseScore(row.scorePct, "Row " + row.rowNo + ": IA %");
  if (!score.ok) reasons.push(score.reason);

  if (assessmentDate) {
    // Future dates cannot have happened yet.
    if (assessmentDate > new Date().toISOString().slice(0, 10)) {
      reasons.push(`Row ${row.rowNo}: assessment date ${assessmentDate} is in the future`);
    }
  }

  const match = matchFacility(row, facilities, row.rowNo);
  if (!match.ok) reasons.push(match.reason);

  let quarter: "Q1" | "Q2" | null = null;
  let fy: string | null = null;
  if (assessmentDate) {
    const bucket = iaQuarterBucket(assessmentDate);
    if (bucket) {
      quarter = bucket.quarter;
      fy = bucket.fy;
    }
  }

  // Only the out-of-FY-quart note is a warning; everything else is an error.
  const blocking = reasons.filter((r) => !r.includes("outside FY"));
  return {
    rowNo: row.rowNo,
    status: blocking.length > 0 ? "error" : reasons.length > 0 ? "warning" : "valid",
    reasons,
    payload: {
      nin: match.ok ? (match.facility.ninNumber ?? (normalizeNinKey(row.nin) || null)) : null,
      name: match.ok ? match.facility.name : null,
      block: match.ok ? match.facility.block : null,
      assessmentDate,
      scorePct: score.ok ? score.value : null,
      tracker,
      quarter,
      fy,
    },
  };
}

/** The downloadable error report CSV (same UTF-8 BOM convention the export
 *  writers use, so Excel opens it with Tamil intact). */
export function errorRowsToCsv(
  rows: { rowNo: number; reason: string }[],
): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = ["Row,Problem", ...rows.map((r) => `${r.rowNo},${esc(r.reason)}`)];
  return "\uFEFF" + lines.join("\r\n");
}
