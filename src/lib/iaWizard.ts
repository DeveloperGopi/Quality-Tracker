/**
 * IA IMPORT WIZARD — the UI-side helpers.
 *
 * The pure engine (lib/iaImport) knows nothing about sheets; this thin layer
 * bridges a ParsedSheet (the shared parser in lib/saqshamParse) into
 * CleanIaRow[] for BOTH layouts:
 *   • long  — one row per facility with FY / Quarter cells
 *   • wide  — "NQAS IA % 2026-27 (Q2)" column headers, unpivoted per period
 * The wizard (components/imports/IaImportWizard) consumes exactly this list.
 */

import * as XLSX from "xlsx";
import { toParsedSheet, type ParsedSheet } from "./saqshamParse";
import {
  DEFAULT_IA_TYPES,
  DEFAULT_PHC_ALIASES,
  buildPhcAliasMap,
  cleanIaRow,
  columnIsFractional,
  currentIaQuarter,
  detectWideLayout,
  formatFyQuarter,
  mapIaHeaders,
  normalizeIaFy,
  normalizeIaQuarter,
  type CleanIaRow,
  type IaRole,
  type IaTracker,
  lastQuarters,
  unpivotWideSheet,
} from "./iaImport";

/* -------------------------------------------------------------------------- */
/* Column mapping (step ②)                                                     */
/* -------------------------------------------------------------------------- */

export type IaMapColumn = {
  role: IaRole;
  label: string;
  required: "hard" | "soft" | false;
  /** (helper) hint shown beside the label. */
  hint?: string;
};

/** The mappable columns of a LONG sheet, in display order. */
export const IA_MAP_COLUMNS: IaMapColumn[] = [
  { role: "nin", label: "NIN Number", required: "soft", hint: "the new format's master identifier" },
  { role: "facilityKey", label: "Facility for Formula", required: false, hint: "the old format's key column" },
  { role: "facilityName", label: "Name of the facility", required: "soft", hint: "or the key / NIN column" },
  { role: "block", label: "Block", required: false },
  { role: "phc", label: "PHC", required: false },
  { role: "type", label: "Type", required: false, hint: "CHC, PHC, UPHC…" },
  { role: "fy", label: "Financial Year", required: false, hint: "one FY/Quarter selector replaces it" },
  { role: "quarter", label: "Quarter", required: false, hint: "one FY/Quarter selector replaces it" },
  { role: "nqasIa", label: "NQAS IA Score", required: false },
  { role: "kayakalpIa", label: "Kayakalp IA Score", required: false },
  // Part 2: the Eco-Friendly Scorecard column is DEPRECATED — not mappable,
  // not scored, and a file that still carries one gets a single info line.
];

/** One fixed info shown when an IA file still carries the (deprecated)
 *  Eco-Friendly Scorecard column. Never an error — the column is ignored,
 *  the stored DB values untouched. */
export const IA_ECO_IGNORED_NOTE = "Eco-Friendly Scorecard column ignored";

/** Does the sheet still carry an Eco-Friendly column? (matcher mirrors the
 *  one in iaImport.roleForHeader) */
export function sheetHasEcoColumn(headers: readonly string[]): boolean {
  return headers.some((h) => /eco[\s-]*friendl/i.test(String(h)));
}

/** Auto-map a sheet's (unique) headers → role → column index. Uses the tested
 *  roleForHeader matchers; a header that maps to nothing stays unmapped. */
export function autoMapIaColumns(headers: readonly string[], wide: boolean): Record<IaRole, number | null> {
  const map = {} as Record<IaRole, number | null>;
  for (const col of IA_MAP_COLUMNS) map[col.role] = null;
  if (wide) {
    // Wide sheets: only the identity columns are mapped; every tracker column
    // is picked up by its parsed header.
    for (const h of headers) {
      const role = mapIaHeaders([h]).roles;
      if (role.nin != null && map.nin == null) map.nin = headers.indexOf(h);
      if (role.facilityKey != null && map.facilityKey == null) map.facilityKey = headers.indexOf(h);
      if (role.facilityName != null && map.facilityName == null) map.facilityName = headers.indexOf(h);
      if (role.block != null && map.block == null) map.block = headers.indexOf(h);
      if (role.phc != null && map.phc == null) map.phc = headers.indexOf(h);
      if (role.type != null && map.type == null) map.type = headers.indexOf(h);
    }
    return map;
  }
  const { roles } = mapIaHeaders(headers);
  for (const col of IA_MAP_COLUMNS) {
    const header = roles[col.role];
    map[col.role] = header == null ? null : headers.indexOf(header);
  }
  return map;
}

/** The mapping problems the wizard refuses to advance on:
 *  • no facility identifier at all (neither key nor name)
 *  • no tracker column at all
 *  • long sheet with no FY cell AND no FY override (ditto quarter). */
export function iaMappingProblems(
  map: Record<IaRole, number | null>,
  wide: boolean,
  fyOverride: string | null,
  qOverride: 1 | 2 | 3 | 4 | null,
): string[] {
  const problems: string[] = [];
  if (map.nin == null && map.facilityKey == null && map.facilityName == null)
    problems.push("Map the facility identity (NIN Number, Facility for Formula or Name of the facility)");
  if (!wide && map.nqasIa == null && map.kayakalpIa == null)
    problems.push("Map at least one score column (NQAS IA / Kayakalp IA)");
  if (!wide && map.fy == null && !fyOverride) problems.push("Pick the whole-file Financial Year (or map the FY column)");
  if (!wide && map.quarter == null && !qOverride) problems.push("Pick the whole-file Quarter (or map the Quarter column)");
  return problems;
}

/* -------------------------------------------------------------------------- */
/* Row preparation                                                             */
/* -------------------------------------------------------------------------- */

export type PrepareIaRowsOptions = {
  fyOverride?: string | null;
  qOverride?: 1 | 2 | 3 | 4 | null;
  typeList?: readonly string[];
};

/** Sheet (with a mapping) → the CleanIaRow[] the preview consumes. Handles
 *  both layouts and computes each score column's fractionality so a 0–1
 *  column converts with the "Converted from fraction" chip. */
export function prepareIaRows(
  sheet: ParsedSheet,
  map: Record<IaRole, number | null>,
  opts: PrepareIaRowsOptions = {},
): { rows: CleanIaRow[]; wide: boolean; warnings: string[] } {
  const warnings: string[] = [];
  // Matrix restricted to the KEPT (non-empty-header) columns, matching
  // sheet.headers index-by-index.
  const matrix = sheet.dataRows.map((dr) => sheet.keptIndexes.map((i) => dr.cells[i]));
  const wide = detectWideLayout(sheet.headers);
  // Part 2: if the file still carries the deprecated Eco-Friendly column,
  // show the one fixed info line (never an error; the column is dropped).
  if (sheetHasEcoColumn(sheet.headers)) warnings.push(IA_ECO_IGNORED_NOTE);

  if (wide) {
    const rows = unpivotWithRowNos(sheet.headers, matrix);
    return { rows, wide, warnings };
  }

  // ---- long layout ----
  const roles: Partial<Record<IaRole, string>> = {};
  for (const col of IA_MAP_COLUMNS) {
    const idx = map[col.role];
    roles[col.role] = idx == null ? undefined : sheet.headers[idx];
  }
  // Fractionality: a whole column of 0–1 values converts not of the header
  // text, so scan the CLEANED numbers once per tracker column.
  const columnFractions: Partial<Record<IaTracker, boolean>> = {};
  for (const t of ["nqas", "kayakalp"] as const) {
    const roleString = t === "nqas" ? "nqasIa" : t === "kayakalp" ? "kayakalpIa" : "ecoFriendly";
    const idx = map[roleString as IaRole];
    if (idx == null) continue;
    const values = matrix.map((cells) => cells[idx]) as unknown as readonly (number | null)[];
    columnFractions[t] = columnIsFractional(values);
  }

  const rows: CleanIaRow[] = [];
  for (let i = 0; i < sheet.dataRows.length; i++) {
    const dr = sheet.dataRows[i];
    const raw: Record<string, unknown> = {};
    sheet.keptIndexes.forEach((keptIdx, j) => {
      const header = sheet.headers[j];
      if (header) raw[header] = dr.cells[keptIdx];
    });
    rows.push(
      cleanIaRow(raw, roles, {
        rowNo: i + 1,
        sourceRowNo: dr.sourceRowNo,
        fyOverride: opts.fyOverride ?? undefined,
        qOverride: opts.qOverride ?? undefined,
        typeList: opts.typeList,
        columnFractions,
      }),
    );
  }
  return { rows, wide, warnings };
}

// imported lazily to dodge a circular type import in the helper above

/** unpivotWideSheet re-numbers rowNo 1..N itself, but resetRow numbers run
 *  from the first spanned row — keep the same contract as the long path. */
function unpivotWithRowNos(headers: readonly string[], matrix: unknown[][]): CleanIaRow[] {
  return unpivotWideSheet(headers, matrix, {});
}

/** FY options for the whole-file override selectors — the current quarter
 *  back through the start of last FY (8 choices is comfortable). */
export function fyOverrideOptions(today: string): { fy: string; label: string; quarters: { q: 1 | 2 | 3 | 4; label: string }[] }[] {
  const cur = currentIaQuarter(today);
  const startYear = Number(cur.fy.slice(0, 4));
  const fys = [fyLabelOf(startYear), fyLabelOf(startYear - 1), fyLabelOf(startYear - 2)];
  return fys.map((fy) => ({
    fy,
    label: formatFyQuarter(fy, 1).replace(/^\w+\s*/, "").replace("Q1", "").trim() || fy,
    quarters: [1, 2, 3, 4].map((q) => ({ q: q as 1 | 2 | 3 | 4, label: `Q${q}` })),
  }));
}

/** The quarter picker as one flat list, latest first (step ②'s quick pick). */
export function quarterOverrideOptions(today: string, count = 8): { fy: string; q: 1 | 2 | 3 | 4; label: string }[] {
  const cur = currentIaQuarter(today);
  return lastQuarters(cur.fy, cur.q, count).map((p) => ({
    fy: p.fy,
    q: p.q,
    label: formatFyQuarter(p.fy, p.q),
  }));
}

/** The quarter the file SHOULD report for right now — the defaulted override
 *  when the sheet carries no FY/Quarter columns. */
export function defaultIaOverride(today: string): { fy: string; q: 1 | 2 | 3 | 4 } {
  return { ...(currentIaQuarter(today) as { fy: string; q: 1 | 2 | 3 | 4 }) };
}

function fyLabelOf(startYear: number): string {
  return normalizeIaFy(String(startYear)) ?? `${startYear}`;
}

/** The PHC-alias map the matcher uses — one build, shared by every call. */
export const IA_PHC_ALIASES: Record<string, string> = buildPhcAliasMap(DEFAULT_PHC_ALIASES);

/** The default facility-Type list passed to cleanIaRow. */
export const IA_TYPE_LIST = DEFAULT_IA_TYPES;

/* -------------------------------------------------------------------------- */
/* Sample file                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A paste with NO header row is common (someone selects the ten columns
 * including the first data row). Excel still sends 10 columns; when the first
 * row is clearly DATA (a 9–11 digit NIN in column 2, or a bare "Q3"), the
 * shared header is substituted and the first row stays a data row.
 * S. No is never used for matching, so nothing is guessed from it.
 */
export function withDetectedIaHeader(sheet: ParsedSheet): ParsedSheet {
  if (sheet.headerRow !== 0 || sheet.headers.length < 8) return sheet;
  const looksLikeData = sheet.headers.some((h) => /^\d{9,11}$/.test(h.trim())) || sheet.headers.some((h) => /^Q[1-4]$/i.test(h.trim()));
  if (!looksLikeData) return sheet;
  return toParsedSheet(sheet.fileName, [[...IA_NIN_HEADERS], ...sheet.rows]);
}

/** The new NIN format's header, in display order. */
export const IA_NIN_HEADERS = [
  "S. No",
  "NIN Number",
  "Block",
  "PHC",
  "Name of the facility",
  "Type",
  "Financial Year",
  "Quarter",
  "NQAS IA Score",
  "Kayakalp IA Score",
] as const;

/** The 10-row sample the task uses as the fixture — REAL-shaped rows, the
 *  Kayakalp column blank for every row (one info line, never ten warnings). */
export const IA_NIN_SAMPLE_ROWS: readonly (readonly string[])[] = [
  ["1", "4527324786", "Alangayam", "Alangayam", "Alangayam", "CHC", "2025-26", "Q3", "72", ""],
  ["2", "4527324787", "Alangayam", "Alangayam", "Alangayam HSC", "HWC HSC", "2025-26", "Q3", "68.5", ""],
  ["3", "4527324788", "Alangayam", "Mittur", "Mittur", "PHC", "2025-26", "Q3", "81", ""],
  ["4", "4527324789", "Pudurnadu", "Pungampattu Nadu", "Pungampattu Nadu", "PHC", "2025-26", "Q3", "77.11", ""],
  ["5", "4527324790", "Pudurnadu", "Athanavoor", "Athanavoor", "PHC", "2025-26", "Q3", "83.8", ""],
  ["6", "4527324791", "Vellore", "Annanagar", "Annanagar", "UPHC", "2025-26", "Q3", "New PHC", ""],
  ["7", "4527324792", "Pachur", "Pachur", "Pachur", "CHC", "2025-26", "Q3", "62.9", ""],
  ["8", "4527324793", "Vallipattu", "Vallipattu", "Vallipattu", "PHC", "2025-26", "Q3", "74.5", ""],
  ["9", "4527324794", "Vallipattu", "Vallipattu", "Vallipattu", "HWC HSC", "2025-26", "Q3", "70", ""],
  ["10", "4527324795", "Madhanur", "Kaspa", "Kaspa -B", "UHWC", "2025-26", "Q3", "0.85", ""],
];

/** The paste-ready sample (tab-separated, header row included). */
export const IA_NIN_SAMPLE_TSV: string = [
  IA_NIN_HEADERS.join("\t"),
  ...IA_NIN_SAMPLE_ROWS.map((r) => r.join("\t")),
].join("\n");

/** Download the sample long-format IA sheet (the new NIN format). */
export function downloadIaSampleFile(): void {
  const sample = [
    [...IA_NIN_HEADERS],
    ...IA_NIN_SAMPLE_ROWS.map((r) => [...r]),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sample);
  ws["!cols"] = sample[0].map(() => ({ wch: 20 }));
  // The NIN column must stay TEXT so a leading zero survives.
  const ninCol = IA_NIN_HEADERS.indexOf("NIN Number");
  if (ninCol >= 0) {
    for (let r = 2; r <= sample.length; r++) {
      const cell = XLSX.utils.encode_cell({ r: r - 1, c: ninCol });
      if (ws[cell] && ws[cell].t === "s") ws[cell].z = "@";
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, "IA scores");
  XLSX.writeFile(wb, "ia-scores-sample.xlsx");
}

/**
 * The detection line under the paste/upload card:
 *   "Detected 10 rows · 10 columns · 1 quarter: 2025-26 Q3"
 * Pure, so both the wizard and the tests read the same sentence.
 */
export function iaDetectionLine(
  dataRows: number,
  columns: number,
  quarters: readonly { fy: string; q: number }[],
): string {
  const label = quarters.length
    ? quarters.map((p) => formatFyQuarter(p.fy, p.q)).join(", ")
    : "no quarter found yet";
  return `Detected ${dataRows} row${dataRows === 1 ? "" : "s"} · ${columns} column${columns === 1 ? "" : "s"} · ${quarters.length === 1 ? "1 quarter" : `${quarters.length} quarters`}: ${label}`;
}

/** The period checklist for a file with several quarters. */
export function iaQuartersInRows(rows: readonly CleanIaRow[]): { fy: string; q: 1 | 2 | 3 | 4; rows: number; label: string }[] {
  const map = new Map<string, { fy: string; q: 1 | 2 | 3 | 4; rows: number }>();
  for (const r of rows) {
    if (!r.fy || !r.q) continue;
    const key = `${r.fy}|Q${r.q}`;
    const hit = map.get(key) ?? { fy: r.fy, q: r.q, rows: 0 };
    hit.rows += 1;
    map.set(key, hit);
  }
  return [...map.values()]
    .sort((a, b) => a.fy.localeCompare(b.fy) || a.q - b.q)
    .map((p) => ({ ...p, label: formatFyQuarter(p.fy, p.q) }));
}

/* -------------------------------------------------------------------------- */
/* Remembered column mapping (per user, this browser)                          */
/* -------------------------------------------------------------------------- */

const MAP_STORAGE_PREFIX = "ia-map:v1:";

/** Remember role → header NAME (not index — the next file's columns move). */
export function loadRememberedIaMap(userKey: string): Partial<Record<IaRole, string>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`${MAP_STORAGE_PREFIX}${userKey}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<Record<IaRole, string>> = {};
    for (const col of IA_MAP_COLUMNS) {
      const v = parsed[col.role];
      if (typeof v === "string" && v) out[col.role] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveRememberedIaMap(userKey: string, map: Record<IaRole, number | null>, headers: readonly string[]): void {
  if (typeof window === "undefined") return;
  try {
    const stored: Record<string, string> = {};
    for (const col of IA_MAP_COLUMNS) {
      const idx = map[col.role];
      if (idx != null && headers[idx]) stored[col.role] = headers[idx];
    }
    window.localStorage.setItem(`${MAP_STORAGE_PREFIX}${userKey}`, JSON.stringify(stored));
  } catch {
    // A full / disabled storage never blocks an import.
  }
}

/** Apply a remembered header-name map to a NEW sheet (indexes recomputed). */
export function applyRememberedIaMap(
  map: Record<IaRole, number | null>,
  headers: readonly string[],
  remembered: Partial<Record<IaRole, string>>,
): Record<IaRole, number | null> {
  const out = { ...map };
  for (const col of IA_MAP_COLUMNS) {
    const name = remembered[col.role];
    if (!name) continue;
    const idx = headers.findIndex((h) => h.trim().toLowerCase() === name.trim().toLowerCase());
    if (idx >= 0) out[col.role] = idx;
  }
  return out;
}

export { normalizeIaQuarter };
