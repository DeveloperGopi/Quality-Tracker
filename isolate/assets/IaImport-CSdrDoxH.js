import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, L as LoaderCircle, aI as ClipboardPaste, Z as Upload, F as FileSpreadsheet, ao as FileDown, a2 as Download, a7 as Pencil, T as TriangleAlert, m as Check, I as Info, A as ArrowRight, aH as CircleX, Q as Search, C as CircleCheck, S as ShieldCheck, E as ExternalLink, ab as Undo2, af as ShieldAlert, aJ as FileUp, X as History } from './icons-BxQpodNr.js';
import { l as useQuery, j as api, m as useMutation, c as cn, B as Button, t as toast, b as useNavigate, d as useSearchParams, h as Card, f as CardContent } from './index-CBV6wOh8.js';
import { ar as IA_NO_CHANGE_BAND, as as SCORE_BARS, at as detectHeaderRow, au as uniqueHeaders, av as currentIaQuarter, aw as lastQuarters, ax as formatFyQuarter, ay as mapIaHeaders, az as detectWideLayout, aA as columnIsFractional, aB as cleanIaRow, aC as unpivotWideSheet, aD as DEFAULT_IA_TYPES, aE as buildPhcAliasMap, aF as DEFAULT_PHC_ALIASES, aG as IA_TRACKERS, aH as toDisplayStamp, aI as TRACKER_LABELS, aJ as facilityIaKeysOf, aK as buildIaPreview, aL as isQuarterProvisional, A as AppShell, aM as previousQuarter, aN as quarterOrder } from './AppShell-CP099uvN.js';
import { I as IaReminderBanner, a as IaCoverageLine, b as IaMissingQuartersHint } from './IaReminderBanner-CU62scGn.js';
import { B as Badge } from './badge-Cc2gQHFR.js';
import { C as Checkbox } from './checkbox-CjOYMc2v.js';
import { I as Input } from './input-Cy2oZLur.js';
import { L as Label } from './label-BaPkqXdo.js';
import { T as Textarea } from './textarea-Dm9kSFQo.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription } from './dialog-BW3GEiPg.js';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-qTILnHQg.js';
import { t as todayLocalIso } from './today-D9v8Esj5.js';
import { utils, writeFile as writeFileSync, read as readSync } from './vendor-xlsx-yBJAythd.js';
import { E as ExcelJS } from './vendor-exceljs-CqnmHTS6.js';
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from './tabs-siU4Pie8.js';

const IA_STATE_LABELS = {
  ready: "Ready",
  no_change: "No change",
  needs_review: "Needs review",
  unmatched: "Unmatched",
  ambiguous: "Ambiguous",
  skipped: "Skipped",
  error: "Error"
};
const dash = (v) => v == null || String(v).trim() === "" ? "-" : String(v);
const num = (v) => dash(v == null ? null : String(v));
function iaMoveGlyph(row, tracker) {
  const d = moveDelta(row, tracker);
  if (d == null) return "■";
  if (Math.abs(d) < IA_NO_CHANGE_BAND) return "■";
  return d > 0 ? "▲" : "▼";
}
function moveDelta(row, tracker) {
  const cur = row.cleaned.scores[tracker].value ?? row.current[tracker];
  const prev = row.prev[tracker];
  if (cur == null || prev == null) return null;
  return Math.round((cur - prev) * 100) / 100;
}
const IA_BASE_COLUMNS = [
  { key: "include", label: "Include", kind: "include", width: 60, align: "center", exportable: false, raw: () => "" },
  { key: "rowNo", label: "#", kind: "index", width: 42, align: "right", exportable: true, raw: (r) => r.rowNo },
  { key: "nin", label: "NIN", kind: "text", width: 116, align: "left", exportable: true, raw: (r) => dash(r.nin) },
  { key: "key", label: "Facility key (old format)", kind: "text", width: 148, align: "left", exportable: true, raw: (r) => dash(r.cleaned.key || r.cleaned.name) },
  { key: "matchedFacility", label: "Facility (matched)", kind: "text", width: 160, align: "left", exportable: true, raw: (r) => dash(r.facilityName) },
  { key: "block", label: "Block", kind: "text", width: 100, align: "left", exportable: true, raw: (r) => dash(r.facilityBlock) },
  { key: "phc", label: "PHC", kind: "text", width: 110, align: "left", exportable: true, raw: (r) => dash(r.facilityPhc) },
  { key: "type", label: "Type", kind: "text", width: 74, align: "left", exportable: true, raw: (r) => dash(r.facilityType) },
  { key: "match", label: "Match", kind: "match", width: 110, align: "center", exportable: true, raw: (r) => matchLabel(r) }
];
const IA_STATE_COLUMN = {
  key: "state",
  label: "Row status",
  kind: "state",
  width: 108,
  align: "center",
  exportable: true,
  raw: (r) => IA_STATE_LABELS[r.state]
};
const IA_NOTES_COLUMN = {
  key: "notes",
  label: "Notes",
  kind: "text",
  width: 200,
  align: "left",
  exportable: true,
  raw: (r) => iaNotes(r)
};
const IA_TREND_COLUMN = {
  key: "trend",
  label: "Last four quarters",
  kind: "spark",
  width: 170,
  align: "left",
  exportable: true,
  raw: (r) => iaSparkText(r)
};
function iaSparkText(row) {
  if (row.trend.length === 0) return "-";
  return row.trend.map((p) => `${p.label} NQAS ${p.nqas ?? "-"} / Kayakalp ${p.kayakalp ?? "-"}`).join(" · ");
}
function matchLabel(row) {
  if (row.outsideBlocks) return "Outside your blocks";
  if (row.unknownNin) return "Unknown NIN";
  if (row.match.status === "unmatched") return "Unmatched";
  if (row.match.status === "ambiguous") return "Ambiguous";
  if (row.match.status === "suggested") return `Suggested ${Math.round(row.match.confidence)}%`;
  if (row.match.viaNin) {
    const suffix = row.needsNinConfirm ? " · confirm" : row.crossCheck ? " · confirmed" : "";
    return `NIN ${Math.round(row.match.confidence)}%${suffix}`;
  }
  if (!row.nin && row.match.status === "matched") {
    return `No NIN · ${row.match.method === "manual" ? "Manual" : "old key"} ${Math.round(row.match.confidence)}%`;
  }
  const labels = {
    helper: "Saved key",
    alias: "Saved alias",
    exact: "Exact",
    manual: "Manual",
    fuzzy: "Fuzzy",
    none: "Unmatched"
  };
  return `${labels[row.match.method] ?? row.match.method} ${Math.round(row.match.confidence)}%`;
}
function iaNotes(row) {
  const bits = [];
  if (row.cleaned.fyError) bits.push("Financial Year not recognised");
  if (row.cleaned.qError) bits.push("Quarter not recognised");
  if (row.future) bits.push("Future quarter (error)");
  if (row.stale) bits.push("Past quarter edit");
  if (row.locked) bits.push("Locked quarter");
  if (row.ninError) bits.push(row.ninError);
  if (row.ninPadded) bits.push("NIN padded; format the column as Text");
  if (row.needsNinConfirm && row.crossCheck) bits.push(row.crossCheck);
  if (row.unknownNin) bits.push("Unknown NIN — pick the right facility");
  if (row.outsideBlocks) bits.push("Outside your blocks — skipped");
  if (row.edited.length) bits.push("Edited in the preview");
  if (row.match.method === "manual") bits.push("Matched by hand in this import");
  for (const t of ["nqas", "kayakalp"]) {
    const s = row.cleaned.scores[t];
    if (s.error) bits.push(`${TRACKER_LABEL(t)} ${s.raw} outside 0–100`);
    else if (s.chip) bits.push(`${TRACKER_LABEL(t)}: ${s.chip}`);
    else if (s.raw.trim() === "" && row.current[t] != null) bits.push(`${TRACKER_LABEL(t)} blank in file (value kept)`);
  }
  if (row.match.status === "suggested") bits.push("Suggested, not auto-applied");
  bits.push(...row.warnings, ...row.chips);
  return bits.join(" · ") || "-";
}
function TRACKER_LABEL(t) {
  return t === "nqas" ? "NQAS IA" : t === "kayakalp" ? "Kayakalp IA" : "Legacy IA";
}
const IA_TRACKER_HEADERS = (trackerLabel) => [
  { label: `${trackerLabel}: in this quarter → new`, which: "new", width: 160, kind: "score" },
  { label: `${trackerLabel} prev quarter`, which: "prev", width: 108, kind: "score" },
  { label: `${trackerLabel} change`, which: "move", width: 92, kind: "move" }
];
function iaColumnsForTrackers(trackers, opts = {}) {
  const cols = IA_BASE_COLUMNS.filter((c) => opts.includeKey !== false || c.key !== "key");
  for (const t of trackers) {
    const label = TRACKER_LABEL(t);
    for (const h of IA_TRACKER_HEADERS(label)) {
      cols.push({
        key: `${t}:${h.which}`,
        label: h.label,
        kind: h.kind,
        width: h.width,
        align: h.which === "move" ? "center" : "right",
        exportable: true,
        raw: (r) => scoreCell(r, t, h.which)
      });
    }
  }
  if (opts.includeTrend !== false) cols.push(IA_TREND_COLUMN);
  cols.push(IA_STATE_COLUMN, IA_NOTES_COLUMN);
  return cols;
}
function scoreCell(row, tracker, which) {
  if (which === "cur") return num(row.current[tracker]);
  if (which === "prev") return num(row.prev[tracker]);
  if (which === "move") {
    const d = moveDelta(row, tracker);
    if (d == null) return "■";
    return `${iaMoveGlyph(row, tracker)} ${d > 0 ? "+" : ""}${d}`;
  }
  const s = row.cleaned.scores[tracker];
  if (s.error) return `ERR ${String(s.raw)}`;
  if (s.value != null) return String(s.value);
  if (s.chip) return s.chip;
  return "-";
}
function iaPreviewHeaders(columns) {
  return columns.map((c) => c.label);
}
function iaPreviewCells(row, index, columns, trackScore = () => "") {
  return columns.map((c) => c.raw(row, trackScore));
}
const IA_STATE_STYLES = {
  ready: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  no_change: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  needs_review: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  unmatched: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  ambiguous: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  skipped: "bg-muted text-muted-foreground",
  error: "bg-rose-500/10 text-rose-700 dark:text-rose-300"
};
function scoreBarColor(value) {
  if (value == null) return "";
  if (value >= SCORE_BARS.green) return "text-emerald-700 dark:text-emerald-300";
  if (value >= SCORE_BARS.amber) return "text-amber-700 dark:text-amber-300";
  return "text-rose-700 dark:text-rose-300";
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 2e4;
function decodeText(buf) {
  const bytes = new Uint8Array(buf);
  const hasBom = bytes.length >= 3 && bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191;
  try {
    const utf8 = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return hasBom ? utf8.replace(/^\uFEFF/, "") : utf8;
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}
function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  if (tabs >= commas && tabs >= semis && tabs > 0) return "	";
  if (semis > commas) return ";";
  return ",";
}
function parseDelimitedText(text) {
  const delim = detectDelimiter(text);
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") ; else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
function parseHtmlTable(html) {
  const decode = (s) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/[ \t]+/g, " ").trim();
  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr;
  while (tr = trRe.exec(html)) {
    const cells = [];
    const cellRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let cell;
    while (cell = cellRe.exec(tr[1])) cells.push(decode(cell[1]));
    if (cells.some((c) => c !== "")) rows.push(cells);
  }
  return rows;
}
function parsePastedHtml(html) {
  return toParsedSheet("Pasted data", parseHtmlTable(html));
}
function toParsedSheet(fileName, rows, _specs) {
  const warnings = [];
  const headerRow = detectHeaderRow(rows);
  const rawHeader = rows[headerRow] ?? [];
  const { names, keptIndexes } = uniqueHeaders(rawHeader);
  const dataRows = [];
  for (let r = headerRow + 1; r < rows.length; r++) {
    const cells = rows[r] ?? [];
    if (!cells.some((c) => c != null && String(c).trim() !== "")) continue;
    dataRows.push({ sourceRowNo: r + 1, cells });
  }
  if (dataRows.length > MAX_ROWS) warnings.push(`Only the first ${MAX_ROWS} rows are shown`);
  return {
    fileName,
    rows,
    headerRow,
    headers: names,
    keptIndexes,
    dataRows: dataRows.slice(0, MAX_ROWS),
    warnings
  };
}
async function parseSaqshamFile(file) {
  if (file.size > MAX_FILE_BYTES) throw new Error("The file is larger than the 10 MB limit");
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
    return toParsedSheet(file.name, parseDelimitedText(decodeText(buf)));
  }
  const wb = readSync(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("The workbook has no sheets");
  const rows = utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true
  });
  return toParsedSheet(file.name, rows);
}
function parsePastedText(text) {
  return toParsedSheet("Pasted data", parseDelimitedText(text));
}
const SAQSHAM_SAMPLE_TSV = [
  "Application No	Assessment Type	Facility Name/Category	Assessment Mode / Program	State	District	Applied Departments	Applied Date	Status	Last Update Dtls",
  "HWC2602230000026_02	New Application	Sivarajpet/UAMM	NQAS	Tamil Nadu	Tirupathur	6OPD, Emergency, Pharmacy, Lab, Ward, OT	12-02-2026	Assessor Result Entry /Document Upload InprocessAssessor Result Entry /Document Upload Inprocess	6-Oct-2026",
  "SCN2610110000001_01	Re-Application	Nilavoor/HWC	NQAS	Tamil Nadu	Tirupathur	12Basic Oral health care, General Medicine, Paediatrics	11-10-2026	Assessment Received by RQAU & In -Process	RAMAMURTHI K(RQAU)",
  "SCN2610110000002_01	New Application	C.Kallupalli/HWC	NQAS	Tamil Nadu	Tirupathur	6OPD, Emergency	09-09-2026	Application Lapsed	12-Sep-2026"
].join("\n");
function downloadSampleFile() {
  const sample = [
    [
      "Application No",
      "Assessment Type",
      "Facility Name/Category",
      "Assessment Mode / Program",
      "State",
      "District",
      "Applied Departments",
      "Applied Date",
      "Status",
      "Last Update Dtls"
    ],
    [
      "HWC2602230000026_02",
      "New Application",
      "Sivarajpet/UAMM",
      "NQAS",
      "Tamil Nadu",
      "Tirupathur",
      "6OPD, Emergency, Pharmacy, Lab, Ward, OT",
      "12-02-2026",
      "Assessor Result Entry /Document Upload Inprocess",
      "6-Oct-2026"
    ],
    [
      "SCN2610110000001_01",
      "Re-Application",
      "Nilavoor/HWC",
      "NQAS",
      "Tamil Nadu",
      "Tirupathur",
      "12Basic Oral health care, General Medicine, Paediatrics",
      "11-10-2026",
      "Assessment Received by RQAU & In -Process",
      "RAMAMURTHI K(RQAU)"
    ]
  ];
  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet(sample);
  ws["!cols"] = sample[0].map(() => ({ wch: 22 }));
  utils.book_append_sheet(wb, ws, "SaQsham status");
  writeFileSync(wb, "saqsham-document-status-sample.xlsx");
}

const IA_MAP_COLUMNS = [
  { role: "nin", label: "NIN Number", required: "soft", hint: "the new format's master identifier" },
  { role: "facilityKey", label: "Facility for Formula", required: false, hint: "the old format's key column" },
  { role: "facilityName", label: "Name of the facility", required: "soft", hint: "or the key / NIN column" },
  { role: "block", label: "Block", required: false },
  { role: "phc", label: "PHC", required: false },
  { role: "type", label: "Type", required: false, hint: "CHC, PHC, UPHC…" },
  { role: "fy", label: "Financial Year", required: false, hint: "one FY/Quarter selector replaces it" },
  { role: "quarter", label: "Quarter", required: false, hint: "one FY/Quarter selector replaces it" },
  { role: "nqasIa", label: "NQAS IA Score", required: false },
  { role: "kayakalpIa", label: "Kayakalp IA Score", required: false }
  // Part 2: the Eco-Friendly Scorecard column is DEPRECATED — not mappable,
  // not scored, and a file that still carries one gets a single info line.
];
const IA_ECO_IGNORED_NOTE = "Eco-Friendly Scorecard column ignored";
function sheetHasEcoColumn(headers) {
  return headers.some((h) => /eco[\s-]*friendl/i.test(String(h)));
}
function autoMapIaColumns(headers, wide) {
  const map = {};
  for (const col of IA_MAP_COLUMNS) map[col.role] = null;
  if (wide) {
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
function iaMappingProblems(map, wide, fyOverride, qOverride) {
  const problems = [];
  if (map.nin == null && map.facilityKey == null && map.facilityName == null)
    problems.push("Map the facility identity (NIN Number, Facility for Formula or Name of the facility)");
  if (!wide && map.nqasIa == null && map.kayakalpIa == null)
    problems.push("Map at least one score column (NQAS IA / Kayakalp IA)");
  if (!wide && map.fy == null && !fyOverride) problems.push("Pick the whole-file Financial Year (or map the FY column)");
  if (!wide && map.quarter == null && !qOverride) problems.push("Pick the whole-file Quarter (or map the Quarter column)");
  return problems;
}
function prepareIaRows(sheet, map, opts = {}) {
  const warnings = [];
  const matrix = sheet.dataRows.map((dr) => sheet.keptIndexes.map((i) => dr.cells[i]));
  const wide = detectWideLayout(sheet.headers);
  if (sheetHasEcoColumn(sheet.headers)) warnings.push(IA_ECO_IGNORED_NOTE);
  if (wide) {
    const rows2 = unpivotWithRowNos(sheet.headers, matrix);
    return { rows: rows2, wide, warnings };
  }
  const roles = {};
  for (const col of IA_MAP_COLUMNS) {
    const idx = map[col.role];
    roles[col.role] = idx == null ? void 0 : sheet.headers[idx];
  }
  const columnFractions = {};
  for (const t of ["nqas", "kayakalp"]) {
    const roleString = t === "nqas" ? "nqasIa" : t === "kayakalp" ? "kayakalpIa" : "ecoFriendly";
    const idx = map[roleString];
    if (idx == null) continue;
    const values = matrix.map((cells) => cells[idx]);
    columnFractions[t] = columnIsFractional(values);
  }
  const rows = [];
  for (let i = 0; i < sheet.dataRows.length; i++) {
    const dr = sheet.dataRows[i];
    const raw = {};
    sheet.keptIndexes.forEach((keptIdx, j) => {
      const header = sheet.headers[j];
      if (header) raw[header] = dr.cells[keptIdx];
    });
    rows.push(
      cleanIaRow(raw, roles, {
        rowNo: i + 1,
        sourceRowNo: dr.sourceRowNo,
        fyOverride: opts.fyOverride ?? void 0,
        qOverride: opts.qOverride ?? void 0,
        typeList: opts.typeList,
        columnFractions
      })
    );
  }
  return { rows, wide, warnings };
}
function unpivotWithRowNos(headers, matrix) {
  return unpivotWideSheet(headers, matrix, {});
}
function quarterOverrideOptions(today, count = 8) {
  const cur = currentIaQuarter(today);
  return lastQuarters(cur.fy, cur.q, count).map((p) => ({
    fy: p.fy,
    q: p.q,
    label: formatFyQuarter(p.fy, p.q)
  }));
}
const IA_PHC_ALIASES = buildPhcAliasMap(DEFAULT_PHC_ALIASES);
const IA_TYPE_LIST = DEFAULT_IA_TYPES;
function withDetectedIaHeader(sheet) {
  if (sheet.headerRow !== 0 || sheet.headers.length < 8) return sheet;
  const looksLikeData = sheet.headers.some((h) => /^\d{9,11}$/.test(h.trim())) || sheet.headers.some((h) => /^Q[1-4]$/i.test(h.trim()));
  if (!looksLikeData) return sheet;
  return toParsedSheet(sheet.fileName, [[...IA_NIN_HEADERS], ...sheet.rows]);
}
const IA_NIN_HEADERS = [
  "S. No",
  "NIN Number",
  "Block",
  "PHC",
  "Name of the facility",
  "Type",
  "Financial Year",
  "Quarter",
  "NQAS IA Score",
  "Kayakalp IA Score"
];
const IA_NIN_SAMPLE_ROWS = [
  ["1", "4527324786", "Alangayam", "Alangayam", "Alangayam", "CHC", "2025-26", "Q3", "72", ""],
  ["2", "4527324787", "Alangayam", "Alangayam", "Alangayam HSC", "HWC HSC", "2025-26", "Q3", "68.5", ""],
  ["3", "4527324788", "Alangayam", "Mittur", "Mittur", "PHC", "2025-26", "Q3", "81", ""],
  ["4", "4527324789", "Pudurnadu", "Pungampattu Nadu", "Pungampattu Nadu", "PHC", "2025-26", "Q3", "77.11", ""],
  ["5", "4527324790", "Pudurnadu", "Athanavoor", "Athanavoor", "PHC", "2025-26", "Q3", "83.8", ""],
  ["6", "4527324791", "Vellore", "Annanagar", "Annanagar", "UPHC", "2025-26", "Q3", "New PHC", ""],
  ["7", "4527324792", "Pachur", "Pachur", "Pachur", "CHC", "2025-26", "Q3", "62.9", ""],
  ["8", "4527324793", "Vallipattu", "Vallipattu", "Vallipattu", "PHC", "2025-26", "Q3", "74.5", ""],
  ["9", "4527324794", "Vallipattu", "Vallipattu", "Vallipattu", "HWC HSC", "2025-26", "Q3", "70", ""],
  ["10", "4527324795", "Madhanur", "Kaspa", "Kaspa -B", "UHWC", "2025-26", "Q3", "0.85", ""]
];
const IA_NIN_SAMPLE_TSV = [
  IA_NIN_HEADERS.join("	"),
  ...IA_NIN_SAMPLE_ROWS.map((r) => r.join("	"))
].join("\n");
function downloadIaSampleFile() {
  const sample = [
    [...IA_NIN_HEADERS],
    ...IA_NIN_SAMPLE_ROWS.map((r) => [...r])
  ];
  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet(sample);
  ws["!cols"] = sample[0].map(() => ({ wch: 20 }));
  const ninCol = IA_NIN_HEADERS.indexOf("NIN Number");
  if (ninCol >= 0) {
    for (let r = 2; r <= sample.length; r++) {
      const cell = utils.encode_cell({ r: r - 1, c: ninCol });
      if (ws[cell] && ws[cell].t === "s") ws[cell].z = "@";
    }
  }
  utils.book_append_sheet(wb, ws, "IA scores");
  writeFileSync(wb, "ia-scores-sample.xlsx");
}
function iaDetectionLine(dataRows, columns, quarters) {
  const label = quarters.length ? quarters.map((p) => formatFyQuarter(p.fy, p.q)).join(", ") : "no quarter found yet";
  return `Detected ${dataRows} row${dataRows === 1 ? "" : "s"} · ${columns} column${columns === 1 ? "" : "s"} · ${quarters.length === 1 ? "1 quarter" : `${quarters.length} quarters`}: ${label}`;
}
function iaQuartersInRows(rows) {
  const map = /* @__PURE__ */ new Map();
  for (const r of rows) {
    if (!r.fy || !r.q) continue;
    const key = `${r.fy}|Q${r.q}`;
    const hit = map.get(key) ?? { fy: r.fy, q: r.q, rows: 0 };
    hit.rows += 1;
    map.set(key, hit);
  }
  return [...map.values()].sort((a, b) => a.fy.localeCompare(b.fy) || a.q - b.q).map((p) => ({ ...p, label: formatFyQuarter(p.fy, p.q) }));
}
const MAP_STORAGE_PREFIX = "ia-map:v1:";
function loadRememberedIaMap(userKey) {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`${MAP_STORAGE_PREFIX}${userKey}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const out = {};
    for (const col of IA_MAP_COLUMNS) {
      const v = parsed[col.role];
      if (typeof v === "string" && v) out[col.role] = v;
    }
    return out;
  } catch {
    return {};
  }
}
function saveRememberedIaMap(userKey, map, headers) {
  if (typeof window === "undefined") return;
  try {
    const stored = {};
    for (const col of IA_MAP_COLUMNS) {
      const idx = map[col.role];
      if (idx != null && headers[idx]) stored[col.role] = headers[idx];
    }
    window.localStorage.setItem(`${MAP_STORAGE_PREFIX}${userKey}`, JSON.stringify(stored));
  } catch {
  }
}
function applyRememberedIaMap(map, headers, remembered) {
  const out = { ...map };
  for (const col of IA_MAP_COLUMNS) {
    const name = remembered[col.role];
    if (!name) continue;
    const idx = headers.findIndex((h) => h.trim().toLowerCase() === name.trim().toLowerCase());
    if (idx >= 0) out[col.role] = idx;
  }
  return out;
}

const PARSE_TIMEOUT_MS = 2e4;
function canUseWorker() {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}
function runInWorker(payload) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(new URL(/* @vite-ignore */ "/assets/iaParseWorker-D2rfrorJ.js", import.meta.url), { type: "module" });
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Could not start the parser"));
      return;
    }
    let done = false;
    const finish = (fn) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      worker.terminate();
      fn();
    };
    const timer = window.setTimeout(
      () => finish(() => reject(new Error("Parsing took too long — try a smaller file"))),
      PARSE_TIMEOUT_MS
    );
    worker.onmessage = (event) => {
      const res = event.data;
      finish(() => res.ok ? resolve(res.sheet) : reject(new Error(res.error)));
    };
    worker.onerror = (event) => {
      finish(() => reject(new Error(event.message || "Could not read the sheet")));
    };
    if (payload.kind === "file") {
      worker.postMessage(payload, [payload.buffer]);
    } else {
      worker.postMessage(payload);
    }
  });
}
async function parseIaPaste(text) {
  if (!canUseWorker()) return parsePastedText(text);
  try {
    return await runInWorker({ kind: "text", text });
  } catch {
    return parsePastedText(text);
  }
}
async function parseIaFile(file) {
  if (!canUseWorker()) return parseSaqshamFile(file);
  try {
    const buffer = await file.arrayBuffer();
    return await runInWorker({ kind: "file", fileName: file.name, buffer });
  } catch {
    return parseSaqshamFile(file);
  }
}

const PRIMARY = "FF0D6960";
const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY } };
function styleHeader(row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  row.eachCell((cell) => {
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFB6C4C1" } } };
  });
}
function addDataSheet(wb, name, widths, headers, rows) {
  const ws = wb.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  ws.columns = widths.map((w) => ({ width: Math.max(10, Math.round(w / 8)) }));
  const header = ws.addRow([...headers]);
  styleHeader(header);
  ws.pageSetup.printTitlesRow = "1:1";
  for (const r of rows) {
    ws.addRow(r).alignment = { vertical: "top", wrapText: true };
  }
}
const ALL_TRACKERS = IA_TRACKERS;
const INCLUDE_STATES = ["ready", "no_change"];
function splitRows(rows) {
  const written = [];
  const rest = [];
  for (const r of rows) {
    const wrote = r.state === "ready" && INCLUDE_STATES.includes(r.state) && r.include;
    (r.state === "no_change" || wrote || r.include && r.state === "ready" ? written : rest).push(r);
  }
  return { written, rest };
}
function buildIaImportWorkbook(input) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "NQAS Tracker";
  wb.created = input.generatedAt;
  const trackers = input.trackers ?? ALL_TRACKERS;
  const columns = iaColumnsForTrackers(trackers).filter((c) => c.exportable);
  const headers = iaPreviewHeaders(columns);
  const widths = columns.map((c) => c.width);
  const cells = (r) => iaPreviewCells(r, 0, columns);
  const { written, rest } = splitRows(input.rows);
  const summary = wb.addWorksheet("Summary");
  summary.columns = [{ width: 34 }, { width: 60 }];
  const push = (label, value) => {
    const row = summary.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.alignment = { vertical: "top", wrapText: true };
  };
  const title = summary.addRow(["Internal Assessment (quarterly) import report"]);
  title.font = { bold: true, size: 14 };
  summary.mergeCells("A1:B1");
  push("File", input.fileName);
  push("Generated", toDisplayStamp(input.generatedAt.getTime()));
  push("Generated by", input.generatedBy);
  push("Rows updated", input.summary.updated);
  push("No change", input.summary.noChange);
  push("Skipped", input.summary.skipped);
  push("Failed", input.summary.failed);
  push("Rows in this report", input.rows.length);
  addDataSheet(wb, "Written", widths, headers, written.map(cells));
  addDataSheet(wb, "Not written & skipped", widths, headers, rest.map(cells));
  return wb;
}
async function downloadIaImportReport(input) {
  const wb = buildIaImportWorkbook(input);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ia-import-report-${input.generatedAt.toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
const TEMPLATE_HEADERS = [
  "S. No",
  "NIN Number",
  "Block",
  "PHC",
  "Name of the facility",
  "Type",
  "Financial Year",
  "Quarter",
  "NQAS IA Score",
  "Kayakalp IA Score"
];
const LOCKED_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EFF2" } };
function buildQuarterTemplateWorkbook(fy, q, facilities) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "NQAS Tracker";
  wb.created = /* @__PURE__ */ new Date();
  const label = formatFyQuarter(fy, q);
  const ws = wb.addWorksheet("IA scores", {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  ws.columns = [6, 16, 18, 20, 30, 10, 13, 9, 15, 17].map((w) => ({ width: w }));
  const head = ws.addRow([...TEMPLATE_HEADERS]);
  styleHeader(head);
  ws.pageSetup.printTitlesRow = "1:1";
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: TEMPLATE_HEADERS.length } };
  facilities.forEach((f, i) => {
    const row = ws.addRow([
      i + 1,
      f.ninNumber ?? "",
      f.block,
      f.phc,
      f.name,
      f.facilityType,
      fy,
      `Q${q}`,
      "",
      ""
    ]);
    row.alignment = { vertical: "middle" };
    row.getCell(2).numFmt = "@";
    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      cell.protection = { locked: true };
      cell.fill = LOCKED_FILL;
    }
    if (!f.ninNumber) row.getCell(2).protection = { locked: false };
    for (const col of [9, 10]) {
      const cell = row.getCell(col);
      cell.protection = { locked: false };
      cell.dataValidation = {
        type: "decimal",
        operator: "between",
        formulae: [0, 100],
        allowBlank: true,
        showErrorMessage: true,
        errorTitle: "Score 0–100",
        error: "Enter a number from 0 to 100, a remark such as “New PHC”, or leave it blank.",
        showInputMessage: true,
        promptTitle: "IA score",
        prompt: "0–100. Blank means not reported — it is never saved as 0."
      };
    }
  });
  ws.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    insertRows: false,
    deleteRows: false
  });
  const lists = wb.addWorksheet("Lists");
  lists.columns = [{ width: 24 }, { width: 24 }, { width: 18 }];
  styleHeader(lists.addRow(["Facility types", "Financial years", "Quarters"]));
  const types = [...new Set(facilities.map((f) => f.facilityType))].sort();
  const fys = [.../* @__PURE__ */ new Set([fy, previousFyLabel(fy), previousFyLabel(previousFyLabel(fy))])];
  for (let i = 0; i < Math.max(types.length, fys.length, 4); i++) {
    lists.addRow([types[i] ?? "", fys[i] ?? "", i < 4 ? `Q${i + 1}` : ""]);
  }
  const notes = wb.addWorksheet("Instructions");
  notes.columns = [{ width: 110 }];
  const title = notes.addRow([`Quarter template — ${label}`]);
  title.font = { bold: true, size: 14 };
  for (const line of [
    "1. Fill ONLY the last two columns (NQAS IA Score, Kayakalp IA Score). The eight columns before them are locked.",
    "2. Format the NIN column as Text before typing (Format Cells → Text). Excel otherwise drops a leading zero or turns the NIN into 4.52732E+09.",
    "3. Scores are 0–100, whole or with decimals. 0 is a real score; leave the cell blank when the tracker was not reported.",
    "4. A remark may be typed instead of a score — e.g. “New PHC”, “Not assessed”, “Nil”. It is kept as a note, never as 0.",
    "5. Keep every row and the header exactly as they are. Facilities are matched by NIN, so the order of rows never matters.",
    "6. Save as .xlsx and upload it (or copy the two score columns into a paste). Nothing is written until you approve the preview."
  ]) {
    const row = notes.addRow([line]);
    row.alignment = { wrapText: true, vertical: "top" };
  }
  return wb;
}
function previousFyLabel(fy) {
  const start = Number(fy.slice(0, 4)) - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
async function downloadIaQuarterTemplate(fy, q, facilities) {
  const wb = buildQuarterTemplateWorkbook(fy, q, facilities);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ia-quarter-template-${formatFyQuarter(fy, q).replace(/ /g, "-")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
function buildIaTemplateCsv(fy, q, facilities) {
  const esc = (v) => /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [TEMPLATE_HEADERS.map(esc).join(",")];
  facilities.forEach((f, i) => {
    lines.push(
      [
        String(i + 1),
        esc(f.ninNumber ?? ""),
        esc(f.block),
        esc(f.phc),
        esc(f.name),
        esc(f.facilityType),
        fy,
        `Q${q}`,
        "",
        ""
      ].join(",")
    );
  });
  return `\uFEFF${lines.join("\r\n")}\r
`;
}
function downloadIaCsvTemplate(fy, q, facilities) {
  const csv = buildIaTemplateCsv(fy, q, facilities);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ia-quarter-template-${formatFyQuarter(fy, q).replace(/ /g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
const periodKey = (p) => `${p.fy}|Q${p.q}`;
function buildIaQuarterlyReportWorkbook(input) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "NQAS Tracker";
  wb.created = input.generatedAt;
  const trackers = ALL_TRACKERS;
  const periods = input.periods;
  const periodLabels = periods.map((p) => formatFyQuarter(p.fy, p.q));
  const curLabel = formatFyQuarter(input.period.fy, input.period.q);
  const value = (f, p, t) => {
    const s = f.scores[periodKey(p)]?.[t] ?? null;
    if (s != null) return s;
    const remark = f.remarks[periodKey(p)]?.[t] ?? null;
    return remark ?? null;
  };
  const headers = ["S. No", "Facility", "Block", "PHC", "Type"];
  for (const pl of periodLabels) for (const t of trackers) headers.push(`${TRACKER_LABELS[t]} — ${pl}`);
  const widths = [6, 32, 18, 18, 8];
  for (let i = 0; i < periodLabels.length * trackers.length; i++) widths.push(14);
  addDataSheet(
    wb,
    curLabel,
    widths,
    headers,
    input.rows.map((f, i) => {
      const line = [i + 1, f.name, f.block, f.phc, f.facilityType];
      for (const p of periods) for (const t of trackers) line.push(value(f, p, t));
      return line;
    })
  );
  const summary = wb.addWorksheet("Summary");
  summary.columns = [{ width: 34 }, { width: 60 }];
  const push = (label, val) => {
    const row = summary.addRow([label, val]);
    row.getCell(1).font = { bold: true };
  };
  const title = summary.addRow(["Internal Assessment Quarterly Report"]);
  title.font = { bold: true, size: 14 };
  push("Quarter", curLabel);
  push("Generated", toDisplayStamp(input.generatedAt.getTime()));
  push("Generated by", input.generatedBy);
  push("Facilities", input.rows.length);
  for (const t of trackers) {
    const reported = input.rows.filter((f) => f.scores[periodKey(input.period)]?.[t] != null).length;
    push(`${TRACKER_LABELS[t]} reported`, `${reported} of ${input.rows.length}`);
  }
  push("Locked rows", input.rows.filter((f) => f.locked[periodKey(input.period)]).length);
  if (periods.length >= 2) {
    const prev = periods[0];
    const cur = periods[periods.length - 1];
    const prevLabel = formatFyQuarter(prev.fy, prev.q);
    const curLabelQ = formatFyQuarter(cur.fy, cur.q);
    const movHeaders = ["Facility", "Block", "Type"];
    for (const t of trackers)
      movHeaders.push(
        `${TRACKER_LABELS[t]} ${prevLabel}`,
        `${TRACKER_LABELS[t]} ${curLabelQ}`,
        `${TRACKER_LABELS[t]} change`
      );
    const movWidths = [32, 18, 8];
    for (let i = 0; i < trackers.length * 3; i++) movWidths.push(14);
    addDataSheet(
      wb,
      "Quarter-over-quarter",
      movWidths,
      movHeaders,
      input.rows.map((f) => {
        const line = [f.name, f.block, f.facilityType];
        for (const t of trackers) {
          const p = f.scores[periodKey(prev)]?.[t] ?? null;
          const c = f.scores[periodKey(cur)]?.[t] ?? null;
          const d = p != null && c != null ? Math.round((c - p) * 100) / 100 : null;
          line.push(
            p ?? f.remarks[periodKey(prev)]?.[t] ?? null,
            c ?? f.remarks[periodKey(cur)]?.[t] ?? null,
            d == null ? "■" : `${d > 0 ? "+" : ""}${d}`
          );
        }
        return line;
      })
    );
  }
  return wb;
}
async function downloadIaQuarterlyReport(input) {
  const wb = buildIaQuarterlyReportWorkbook(input);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ia-quarterly-report-${formatFyQuarter(input.period.fy, input.period.q).replace(/ /g, "-")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

const STEPS = ["Add rows", "Check", "Review", "Approve", "Done"];
function StepBar({ step, onJump }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "flex flex-wrap items-center gap-2", "aria-label": "Import steps", children: STEPS.map((label, i) => {
    const n = i + 1;
    const state = n < step ? "done" : n === step ? "current" : "todo";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled: n > step,
          onClick: () => n < step && onJump(n),
          "aria-current": n === step ? "step" : void 0,
          className: cn(
            "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            state === "done" && "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100",
            state === "current" && "border-primary/40 bg-primary/10 text-foreground",
            state === "todo" && "border-border/60 text-muted-foreground",
            n < step && "hover:bg-emerald-200/60"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: cn(
                  "flex size-5 items-center justify-center rounded-full border text-[10px] font-bold",
                  state === "done" && "border-emerald-400 bg-emerald-500 text-white",
                  state === "current" && "border-primary bg-primary text-primary-foreground"
                ),
                children: state === "done" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }) : n
              }
            ),
            label
          ]
        }
      ),
      i < STEPS.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground/50", children: "→" })
    ] }, label);
  }) });
}
function ScoreChip({ value, remark }) {
  if (value == null && remark) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] italic text-muted-foreground", children: remark });
  }
  if (value == null) return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "-" });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("font-medium tabular-nums", scoreBarColor(value)), children: value });
}
function StatePill({ state }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: cn(
        "inline-flex max-w-full items-center whitespace-nowrap rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium",
        IA_STATE_STYLES[state]
      ),
      children: IA_STATE_LABELS[state]
    }
  );
}
function MatchCell({
  row,
  facilities,
  onPick
}) {
  const [q, setQ] = reactExports.useState("");
  const candidates = reactExports.useMemo(() => {
    const ids = row.match.status === "ambiguous" || row.match.status === "suggested" ? row.match.candidateIds : row.suggestionIds;
    const base = facilities.filter(
      (f) => ids.includes(f.id) || !!row.cleaned.facilityType && f.facilityType === row.cleaned.facilityType
    );
    const pool = base.length ? base : facilities;
    const needle = q.trim().toLowerCase();
    return pool.filter((f) => !needle || `${f.name} ${f.block} ${f.phc} ${f.ninNumber ?? ""}`.toLowerCase().includes(needle)).slice(0, 60).map((f) => f.id);
  }, [row, facilities, q]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: row.facilityId ?? "none", onValueChange: (v) => onPick(row.rowNo, v === "none" ? null : v), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-8 w-full min-w-40 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Pick a facility" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            value: q,
            onChange: (e) => setQ(e.target.value),
            placeholder: "Search facility / block / PHC / NIN",
            className: "h-8 text-xs",
            onKeyDown: (e) => e.stopPropagation()
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "none", className: "text-xs", children: "— unmatched —" }),
        candidates.map((id) => {
          const f = facilities.find((x) => x.id === id);
          if (!f) return null;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectItem, { value: id, className: "text-xs", children: [
            f.name,
            " · ",
            f.block,
            " · ",
            f.phc,
            " (",
            f.facilityType,
            ")",
            f.ninNumber ? ` · ${f.ninNumber}` : ""
          ] }, id);
        })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10px] font-semibold text-muted-foreground", children: matchLabel(row) })
  ] });
}
function Sparkline({ row }) {
  if (row.trend.length === 0) return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "-" });
  const W = 118;
  const H = 24;
  const series = (key) => row.trend.map((p, i) => {
    const x = row.trend.length === 1 ? W / 2 : 6 + i * (W - 12) / (row.trend.length - 1);
    const v = p[key];
    const y = v == null ? null : H - 3 - Math.max(0, Math.min(100, v)) / 100 * (H - 6);
    return { x, y, last: i === row.trend.length - 1, v };
  });
  const path = (key) => {
    const pts = series(key);
    let d = "";
    let pen = false;
    const plotted = [];
    for (const p of pts) {
      if (p.y == null) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
      pen = true;
      plotted.push({ x: p.x, y: p.y, last: p.last, v: p.v });
    }
    return plotted.length ? { d: d.trim(), pts: plotted } : null;
  };
  const nqas = path("nqas");
  const kayakalp = path("kayakalp");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex flex-col gap-0.5", "data-tip": iaSparkText(row), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Last four quarters", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "4", y1: H - 3, x2: W - 4, y2: H - 3, stroke: "currentColor", strokeOpacity: "0.2" }),
      nqas && /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: nqas.d, fill: "none", stroke: "#0f766e", strokeWidth: "1.5" }),
      kayakalp && /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: kayakalp.d, fill: "none", stroke: "#d97706", strokeWidth: "1.5", strokeDasharray: "3 2" }),
      (nqas?.pts ?? []).map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "circle",
        {
          cx: p.x,
          cy: p.y,
          r: p.last ? 2.8 : 1.8,
          fill: p.last ? "#0f766e" : "#ffffff",
          stroke: "#0f766e",
          strokeWidth: "1.2"
        },
        `n${p.x}`
      )),
      (kayakalp?.pts ?? []).map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "rect",
        {
          x: p.x - (p.last ? 2.4 : 1.6),
          y: (p.y ?? 0) - (p.last ? 2.4 : 1.6),
          width: p.last ? 4.8 : 3.2,
          height: p.last ? 4.8 : 3.2,
          fill: p.last ? "#d97706" : "#ffffff",
          stroke: "#d97706",
          strokeWidth: "1.2"
        },
        `k${p.x}`
      ))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] leading-none text-muted-foreground", children: row.trend.map((p) => p.label.replace(/^Q(\d)\s(\d{2})(\d{2})-(\d{2})$/, "Q$1 $3-$4")).join(" · ") })
  ] });
}
function ScoreEditCell({
  row,
  tracker,
  onCommit
}) {
  const [editing, setEditing] = reactExports.useState(false);
  const [text, setText] = reactExports.useState("");
  const original = row.cleaned.scores[tracker];
  if (editing) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Input,
      {
        autoFocus: true,
        value: text,
        onChange: (e) => setText(e.target.value),
        onBlur: () => {
          onCommit(row.rowNo, tracker, text.trim() === "" ? null : text);
          setEditing(false);
        },
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            onCommit(row.rowNo, tracker, text.trim() === "" ? null : text);
            setEditing(false);
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        },
        "aria-label": `${TRACKER_LABELS[tracker]} value for row ${row.rowNo}`,
        className: "h-7 w-20 text-right text-xs tabular-nums",
        inputMode: "decimal"
      }
    );
  }
  const old = row.current[tracker];
  const next = original.value;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      onClick: () => {
        setText(original.raw);
        setEditing(true);
      },
      className: cn(
        "rounded px-1 text-right tabular-nums hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
        original.error && "text-destructive"
      ),
      "data-tip": original.error ? `${TRACKER_LABELS[tracker]} value outside 0–100 — click to fix` : "Click to edit",
      children: original.raw.trim() === "" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "-" }) : original.error ? `ERR ${original.raw}` : original.value != null ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        old != null && old !== next && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mr-1 text-[10px] text-muted-foreground line-through", children: old }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: original.value })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] italic text-muted-foreground", children: original.chip ?? "-" })
    }
  );
}
function IaImportWizard({
  onOpenList,
  initialPeriod,
  initialText,
  initialFile
}) {
  const ctx = useQuery(api.ia.getIaImportContext, {});
  const applyBatch = useMutation(api.ia.applyIaBatch);
  const undoBatch = useMutation(api.ia.undoIaBatch);
  const saveAlias = useMutation(api.imports.saveFacilityAlias);
  const today = todayLocalIso();
  const quarterChoices = reactExports.useMemo(() => quarterOverrideOptions(today), [today]);
  const [step, setStep] = reactExports.useState(1);
  const [sourceTab, setSourceTab] = reactExports.useState("paste");
  const [sheet, setSheet] = reactExports.useState(null);
  const [wide, setWide] = reactExports.useState(false);
  const [map, setMap] = reactExports.useState(autoMapIaColumns([], false));
  const [fyOverride, setFyOverride] = reactExports.useState(initialPeriod?.fy ?? null);
  const [qOverride, setQOverride] = reactExports.useState(initialPeriod?.q ?? null);
  const [pasteText, setPasteText] = reactExports.useState("");
  const [parsing, setParsing] = reactExports.useState(false);
  const [dragOver, setDragOver] = reactExports.useState(false);
  const [periodSel, setPeriodSel] = reactExports.useState(null);
  const [unlockPeriods, setUnlockPeriods] = reactExports.useState(false);
  const [facilityChoice, setFacilityChoice] = reactExports.useState({});
  const [confirmedNin, setConfirmedNin] = reactExports.useState({});
  const [scoreEdits, setScoreEdits] = reactExports.useState({});
  const [includeOverride, setIncludeOverride] = reactExports.useState({});
  const [mode, setMode] = reactExports.useState("update");
  const [blankClears, setBlankClears] = reactExports.useState(false);
  const [overrideReason, setOverrideReason] = reactExports.useState("");
  const [rememberOn, setRememberOn] = reactExports.useState(true);
  const [confirmed, setConfirmed] = reactExports.useState(false);
  const [applying, setApplying] = reactExports.useState(false);
  const [result, setResult] = reactExports.useState(null);
  const [undoState, setUndoState] = reactExports.useState(null);
  const [search, setSearch] = reactExports.useState("");
  const [stateFilter, setStateFilter] = reactExports.useState([]);
  const [metricFilter, setMetricFilter] = reactExports.useState(null);
  const [blockFilter, setBlockFilter] = reactExports.useState([]);
  const [quarterFilter, setQuarterFilter] = reactExports.useState([]);
  const [sortKey, setSortKey] = reactExports.useState("row");
  const [drawerRowNo, setDrawerRowNo] = reactExports.useState(null);
  const isAdmin = ctx?.me.appRole === "admin";
  const rememberKey = ctx?.me.name ?? "user";
  const facilities = reactExports.useMemo(
    () => (ctx?.facilities ?? []).map((f) => {
      const keys = facilityIaKeysOf(f);
      if (f.facilityKey && !keys.includes(f.facilityKey)) keys.unshift(f.facilityKey);
      return {
        id: f.id,
        name: f.name,
        block: f.block,
        phc: f.phc,
        facilityType: f.facilityType,
        facilityKeys: keys,
        ninNumber: f.ninNumber ?? null
      };
    }),
    [ctx]
  );
  const aliases = reactExports.useMemo(() => ctx?.aliases ?? [], [ctx]);
  const recent = reactExports.useMemo(() => ctx?.recent ?? [], [ctx]);
  const outsideNins = reactExports.useMemo(() => new Set(ctx?.outsideNin ?? []), [ctx]);
  const prepared = reactExports.useMemo(() => {
    if (!sheet) return { rows: [], wide: false, warnings: [] };
    return prepareIaRows(sheet, map, { fyOverride, qOverride, typeList: IA_TYPE_LIST });
  }, [sheet, map, fyOverride, qOverride]);
  const detected = reactExports.useMemo(() => iaQuartersInRows(prepared.rows), [prepared.rows]);
  const lockedPeriods = reactExports.useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    for (const r of recent) if (r.lockedAt) set.add(`${r.fy}|Q${r.quarter}`);
    return set;
  }, [recent]);
  const periodChecked = (p) => {
    const key = `${p.fy}|Q${p.q}`;
    if (lockedPeriods.has(key)) {
      if (!unlockPeriods) return false;
      return periodSel?.[key] ?? false;
    }
    return periodSel?.[key] ?? true;
  };
  const activeRows = reactExports.useMemo(() => {
    if (!prepared.rows.length) return prepared.rows;
    return prepared.rows.filter((r) => {
      if (!r.fy || !r.q) return true;
      return periodChecked({ fy: r.fy, q: r.q });
    });
  }, [prepared.rows, periodSel, lockedPeriods, unlockPeriods]);
  const trackers = reactExports.useMemo(() => {
    if (activeRows.length === 0) return [...IA_TRACKERS];
    const present = IA_TRACKERS.filter(
      (t) => activeRows.some((r) => r.scores[t].raw.trim() !== "" || r.scores[t].error)
    );
    return present.length ? present : [...IA_TRACKERS];
  }, [activeRows]);
  const preview = reactExports.useMemo(
    () => buildIaPreview(
      activeRows,
      facilities,
      aliases,
      {
        today,
        recent,
        manual: facilityChoice,
        confirmedNin,
        scoreEdits,
        outsideNins
      },
      IA_PHC_ALIASES
    ),
    [activeRows, facilities, aliases, today, recent, facilityChoice, confirmedNin, scoreEdits, outsideNins]
  );
  const rowInclude = (r) => includeOverride[r.rowNo] ?? r.include;
  const viewRows = reactExports.useMemo(
    () => preview.rows.map((r) => ({ ...r, include: rowInclude(r) })),
    // includeOverride is read through rowInclude; both must re-run together.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preview.rows, includeOverride]
  );
  const hasKey = reactExports.useMemo(() => viewRows.some((r) => !!r.cleaned.key), [viewRows]);
  const columns = reactExports.useMemo(
    () => iaColumnsForTrackers(trackers, { includeKey: hasKey }),
    [trackers, hasKey]
  );
  const blocks = reactExports.useMemo(() => [...new Set(viewRows.map((r) => r.facilityBlock).filter(Boolean))].sort(), [viewRows]);
  const quarterOptions = reactExports.useMemo(
    () => [...new Set(viewRows.filter((r) => r.fy && r.q).map((r) => formatFyQuarter(r.fy, r.q)))].sort(),
    [viewRows]
  );
  const DOM_CAP = 500;
  const shown = reactExports.useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matched = viewRows.filter((r) => {
      if (metricFilter === "new" && !IA_TRACKERS.some((t) => r.change[t] === "new")) return false;
      if (metricFilter === "changed" && !IA_TRACKERS.some((t) => r.change[t] === "changed")) return false;
      if (metricFilter === "not_reported" && IA_TRACKERS.some((t) => r.cleaned.scores[t].raw.trim() !== ""))
        return false;
      if (stateFilter.length && !stateFilter.includes(r.state)) return false;
      if (blockFilter.length && !blockFilter.includes(r.facilityBlock)) return false;
      if (quarterFilter.length && !(r.fy && r.q && quarterFilter.includes(formatFyQuarter(r.fy, r.q)))) return false;
      if (needle) {
        const hay = `${r.nin ?? ""} ${r.cleaned.key} ${r.cleaned.name} ${r.facilityName} ${r.facilityBlock} ${r.facilityPhc}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const stateOrder = {
      error: 0,
      unmatched: 1,
      ambiguous: 2,
      needs_review: 3,
      ready: 4,
      no_change: 5,
      skipped: 6
    };
    const sorted = [...matched].sort((a, b) => {
      if (sortKey === "facility") return (a.facilityName || a.cleaned.name).localeCompare(b.facilityName || b.cleaned.name);
      if (sortKey === "block") return a.facilityBlock.localeCompare(b.facilityBlock);
      if (sortKey === "state") return stateOrder[a.state] - stateOrder[b.state] || a.rowNo - b.rowNo;
      return a.rowNo - b.rowNo;
    });
    return sorted.slice(0, DOM_CAP);
  }, [viewRows, search, stateFilter, metricFilter, blockFilter, quarterFilter, sortKey]);
  const summary = preview.summary;
  const selected = reactExports.useMemo(
    () => viewRows.filter(
      (r) => r.include && r.facilityId && r.fy && r.q && !r.needsNinConfirm && !r.outsideBlocks && (r.state === "ready" || r.state === "no_change")
    ),
    [viewRows]
  );
  const blocking = reactExports.useMemo(
    () => viewRows.some(
      (r) => r.include && (r.state === "ambiguous" || r.state === "unmatched" || r.state === "error" || r.state === "needs_review")
    ),
    [viewRows]
  );
  const includedLocked = reactExports.useMemo(() => selected.some((r) => r.locked), [selected]);
  const manuallyPicked = reactExports.useMemo(
    () => selected.filter((r) => facilityChoice[r.rowNo] || r.match.method === "manual").length,
    [selected, facilityChoice]
  );
  const templatePeriod = activeRows.find((r) => r.fy && r.q) ? { fy: activeRows.find((r) => r.fy && r.q).fy, q: activeRows.find((r) => r.fy && r.q).q } : quarterChoices[0] ? { fy: quarterChoices[0].fy, q: quarterChoices[0].q } : null;
  const mappingProblems = reactExports.useMemo(
    () => sheet ? iaMappingProblems(map, wide, fyOverride, qOverride) : [],
    [sheet, map, wide, fyOverride, qOverride]
  );
  const loadSheet = (raw) => {
    const s = withDetectedIaHeader(raw);
    const isWide = detectWideLayout(s.headers);
    setSheet(s);
    setWide(isWide);
    const auto = autoMapIaColumns(s.headers, isWide);
    setMap(applyRememberedIaMap(auto, s.headers, loadRememberedIaMap(rememberKey)));
    setFyOverride(auto.fy == null && !isWide ? quarterChoices[0]?.fy ?? null : null);
    setQOverride(auto.quarter == null && !isWide ? quarterChoices[0]?.q ?? null : null);
    setIncludeOverride({});
    setFacilityChoice({});
    setConfirmedNin({});
    setScoreEdits({});
    setPeriodSel(null);
    setUnlockPeriods(false);
    setResult(null);
    setUndoState(null);
    setConfirmed(false);
    for (const w of s.warnings) toast.warning(w);
    setStep(2);
  };
  const ingestText = async (text) => {
    if (!text.trim()) {
      toast.error("Paste the IA rows first");
      return;
    }
    setParsing(true);
    try {
      loadSheet(await parseIaPaste(text));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the pasted rows");
    }
    setParsing(false);
  };
  const ingestHtml = async (html) => {
    if (!html.trim()) return;
    setParsing(true);
    try {
      loadSheet(parsePastedHtml(html));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the pasted table");
    }
    setParsing(false);
  };
  const onFile = async (file) => {
    setParsing(true);
    try {
      loadSheet(await parseIaFile(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the file");
    }
    setParsing(false);
  };
  const initialIngested = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (initialIngested.current) return;
    if (initialFile) {
      initialIngested.current = true;
      void onFile(initialFile);
      return;
    }
    if (!initialText?.trim()) return;
    initialIngested.current = true;
    void ingestText(initialText);
  }, [initialText, initialFile]);
  const stepRef = reactExports.useRef(step);
  stepRef.current = step;
  reactExports.useEffect(() => {
    if (sourceTab !== "paste") return;
    const onPaste = (e) => {
      if (stepRef.current !== 1) return;
      const el = e.target;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      const html = e.clipboardData?.getData("text/html") ?? "";
      if (!text.trim() && !html.trim()) return;
      e.preventDefault();
      if (text.trim()) void ingestText(text);
      else void ingestHtml(html);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [sourceTab]);
  const runApply = async () => {
    if (!confirmed) return;
    setApplying(true);
    try {
      const decisions = selected.map((r) => ({
        rowNo: r.rowNo,
        facilityId: r.facilityId,
        fy: r.fy,
        quarter: r.q,
        nin: r.nin,
        confirmNin: !!confirmedNin[r.rowNo] || r.match.method === "manual",
        nqas: trackerDecision(r, "nqas", blankClears),
        kayakalp: trackerDecision(r, "kayakalp", blankClears),
        eco: trackerDecision(r, "eco", blankClears),
        matchMethod: r.match.viaNin ? "nin" : r.match.method,
        confidence: r.match.confidence,
        facilityName: r.facilityName || r.cleaned.name,
        facilityBlock: r.facilityBlock,
        facilityPhc: r.facilityPhc,
        notes: iaNotes(r),
        raw: r.cleaned.raw,
        cleaned: {
          fy: r.fy,
          quarter: r.q,
          nqas: r.cleaned.scores.nqas.raw,
          kayakalp: r.cleaned.scores.kayakalp.raw,
          eco: r.cleaned.scores.eco.raw,
          key: r.cleaned.key,
          name: r.cleaned.name,
          nin: r.nin
        }
      }));
      const res = await applyBatch({
        fileName: sheet?.fileName ?? "Pasted data",
        mode,
        blankClears,
        overrideReason: includedLocked ? overrideReason : void 0,
        decisions
      });
      if (rememberOn) {
        for (const r of selected) {
          const manualId = facilityChoice[r.rowNo];
          if (manualId && manualId === r.facilityId && r.cleaned.name && r.cleaned.facilityType) {
            void saveAlias({
              portalName: r.cleaned.name,
              facilityType: r.cleaned.facilityType,
              facilityId: manualId
            }).catch(() => void 0);
          }
        }
      }
      if (sheet) saveRememberedIaMap(rememberKey, map, sheet.headers);
      setResult(res);
      setUndoState(null);
      setStep(5);
      toast.success(`Applied — ${res.updated} updated, ${res.noChange} no change, ${res.failed} failed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed — nothing was written");
    }
    setApplying(false);
  };
  const runUndo = async () => {
    if (!result) return;
    try {
      const res = await undoBatch({ batchId: result.batchId });
      setUndoState({
        restored: res.restored,
        conflicts: res.conflicts.map((c) => ({ rowNo: c.rowNo, reason: c.reason }))
      });
      if (res.conflicts.length) {
        toast.warning(`Restored ${res.restored} row(s); ${res.conflicts.length} skipped (edited since the import)`);
      } else {
        toast.success(`Import undone — ${res.restored} row(s) restored`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not undo the import");
    }
  };
  if (ctx === void 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", "aria-busy": "true", "aria-live": "polite", "aria-label": "Loading the Internal Assessment import", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: ["Add rows", "Check", "Review", "Approve", "Done"].map((label) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: "h-7 w-28 animate-pulse rounded-md bg-muted"
        },
        label
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-background/60 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-8 w-40 animate-pulse rounded-md bg-muted" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-8 w-56 animate-pulse rounded-md bg-muted" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-3 block h-36 w-full animate-pulse rounded-xl bg-muted/70" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-2 block h-8 w-44 animate-pulse rounded-md bg-muted/70" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 text-sm text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }),
        " Loading your facilities…"
      ] })
    ] });
  }
  const summaryCards = [
    ["Rows", viewRows.length, []],
    ["New", summary.newCount, [], "new"],
    ["Will change", summary.changedCount, [], "changed"],
    ["No change", summary.noChange, ["no_change"]],
    ["Not reported", summary.notReported, [], "not_reported"],
    ["Needs review", summary.needsReview, ["needs_review"]],
    ["Unknown NIN", summary.unknownNin, ["unmatched"]],
    ["Errors", summary.errors, ["error"]],
    ["Skipped", summary.skipped, ["skipped"]],
    ["Outside your blocks", summary.outsideBlocks, ["skipped"]]
  ];
  const detection = iaDetectionLine(sheet?.dataRows.length ?? 0, sheet?.headers.length ?? 0, detected);
  const noteFor = (label) => {
    switch (label) {
      case "New":
        return "Rows with no stored score for that quarter yet.";
      case "Will change":
        return "Rows where a stored score for that quarter is different.";
      case "Not reported":
        return "Both score cells blank — the stored values are kept.";
      case "Needs review":
        return "NIN cross-checks, duplicates or a past-quarter edit. Confirm or fix before approving.";
      case "Unknown NIN":
        return "A valid NIN that matches no facility in your master list. Pick the right facility.";
      case "Outside your blocks":
        return "The NIN belongs to a facility outside your blocks. These rows are skipped.";
      default:
        return void 0;
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(StepBar, { step, onJump: setStep }),
    step === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 rounded-xl border border-border/60 bg-background/60 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5", role: "tablist", "aria-label": "How to add rows", children: [
          ["paste", "Paste", ClipboardPaste],
          ["upload", "Upload", Upload]
        ].map(([value, label, Icon]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            role: "tab",
            "aria-selected": sourceTab === value,
            onClick: () => setSourceTab(value),
            className: cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              sourceTab === value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5" }),
              " ",
              label
            ]
          },
          value
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              size: "sm",
              variant: "outline",
              className: "gap-1.5",
              disabled: !templatePeriod,
              onClick: () => {
                if (!templatePeriod) return;
                void downloadIaQuarterTemplate(templatePeriod.fy, templatePeriod.q, ctx.facilities).catch(
                  () => toast.error("Could not build the template")
                );
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-3.5" }),
                " Download template"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              size: "sm",
              variant: "ghost",
              className: "gap-1.5",
              disabled: !templatePeriod,
              onClick: () => {
                if (!templatePeriod) return;
                downloadIaCsvTemplate(templatePeriod.fy, templatePeriod.q, ctx.facilities);
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileDown, { className: "size-3.5" }),
                " CSV"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "sm",
              variant: "ghost",
              className: "gap-1.5",
              onClick: () => {
                setPasteText(IA_NIN_SAMPLE_TSV);
                void ingestText(IA_NIN_SAMPLE_TSV);
              },
              children: "Load sample"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "ghost", className: "gap-1.5", onClick: () => downloadIaSampleFile(), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" }),
            " Sample file"
          ] })
        ] })
      ] }),
      sourceTab === "paste" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", htmlFor: "ia-paste", children: "Copy the rows from Excel (with the header row) and press Ctrl+V" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Textarea,
          {
            id: "ia-paste",
            className: "min-h-36 font-mono text-xs",
            placeholder: "S. No	NIN Number	Block	PHC	Name of the facility	Type	Financial Year	Quarter	NQAS IA Score	Kayakalp IA Score",
            value: pasteText,
            onChange: (e) => setPasteText(e.target.value),
            onPaste: (e) => {
              const text = e.clipboardData.getData("text/plain");
              const html = e.clipboardData.getData("text/html");
              if (!text.trim() && !html.trim()) return;
              e.preventDefault();
              if (text.trim()) {
                setPasteText(text);
                void ingestText(text);
              } else {
                void ingestHtml(html);
              }
            },
            "aria-label": "Paste the IA rows"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => void ingestText(pasteText), disabled: !pasteText.trim() || parsing, className: "gap-2", children: [
            parsing ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardPaste, { className: "size-4" }),
            "Use pasted rows"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "A paste without a header row is detected by its 10 columns." })
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          onDragOver: (e) => {
            e.preventDefault();
            setDragOver(true);
          },
          onDragLeave: () => setDragOver(false),
          onDrop: (e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void onFile(f);
          },
          className: cn(
            "flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border/60"
          ),
          children: [
            parsing ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-6 animate-spin text-muted-foreground" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-6 text-muted-foreground" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: "Drag and drop the IA sheet here" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "or choose a file — .xlsx, .xls, .csv, .tsv" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "glass-input inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm", children: [
              "Choose file",
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "file",
                  accept: ".xlsx,.xls,.csv,.tsv,.txt",
                  className: "hidden",
                  onChange: (e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFile(f);
                  }
                }
              )
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Accepted: .xlsx, .xls, .csv, .tsv · up to 10 MB / 20,000 rows · parsing runs off the page · nothing is written until you approve. Required: NIN (or the old Facility for Formula), Financial Year and Quarter, and at least one score column." })
    ] }),
    step === 2 && sheet && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 rounded-xl border border-border/60 bg-background/60 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "secondary", className: "gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-3" }),
          " ",
          sheet.fileName
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium", "data-testid": "ia-detection-line", children: detection }),
        wide && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: "gap-1 bg-sky-500/15 text-sky-700 dark:text-sky-300", children: "Wide layout — every dated column becomes one row per quarter" }),
        pasteText.trim() && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            variant: "ghost",
            className: "ml-auto h-7 gap-1 text-[11px]",
            onClick: () => setStep(1),
            "data-tip": "Go back to the raw text, change it and parse again",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-3" }),
              " Edit and re-parse"
            ]
          }
        )
      ] }),
      mappingProblems.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex flex-wrap items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-4 shrink-0" }),
        mappingProblems.join(" · ")
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3", children: IA_MAP_COLUMNS.map((col) => {
        const idx = map[col.role];
        const header = idx == null ? null : sheet.headers[idx];
        const matched = header != null;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex w-40 shrink-0 items-center gap-1 text-xs font-medium", children: [
            matched ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3 text-emerald-600", "aria-label": "matched" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-3 rounded-full border border-dashed border-muted-foreground/50", "aria-hidden": true }),
            col.label,
            col.required && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: "*" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: idx == null ? "none" : String(idx),
              onValueChange: (v) => setMap((m) => ({ ...m, [col.role]: v === "none" ? null : Number(v) })),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-full min-w-40 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Not mapped" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "none", className: "text-xs", children: "— not mapped —" }),
                  sheet.headers.map((h, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: String(i), className: "text-xs", children: h }, i))
                ] })
              ]
            }
          )
        ] }, col.role);
      }) }),
      !wide && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 sm:grid-cols-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "w-40 shrink-0 text-xs", children: map.fy == null ? "Financial Year (whole file)" : "Financial Year (from column)" }),
          map.fy == null ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: fyOverride ?? "none", onValueChange: (v) => setFyOverride(v === "none" ? null : v), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-full text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Pick the FY" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: [...new Map(quarterChoices.map((qq) => [qq.fy, qq])).values()].map((qq) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: qq.fy, className: "text-xs", children: qq.fy }, qq.fy)) })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", children: "Column mapped" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "w-40 shrink-0 text-xs", children: map.quarter == null ? "Quarter (whole file)" : "Quarter (from column)" }),
          map.quarter == null ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: qOverride == null ? "none" : String(qOverride),
              onValueChange: (v) => setQOverride(v === "none" ? null : Number(v)),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-full text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Pick the quarter" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: quarterChoices.map((qq) => /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectItem, { value: String(qq.q), className: "text-xs", children: [
                  qq.label,
                  " (",
                  qq.fy,
                  ")"
                ] }, `q-${qq.fy}-${qq.q}`)) })
              ]
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", children: "Column mapped" })
        ] })
      ] }),
      detected.length === 1 && lockedPeriods.has(`${detected[0].fy}|Q${detected[0].q}`) && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1.5 rounded-lg border border-amber-300/60 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5" }),
        " ",
        detected[0].label,
        " is locked.",
        " ",
        isAdmin ? "Tick “Include locked quarters” below to override it with a reason." : "Ask a State Admin to unlock it before importing."
      ] }),
      detected.some((p) => lockedPeriods.has(`${p.fy}|Q${p.q}`)) && isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50/60 px-2 text-xs dark:bg-amber-500/10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, { checked: unlockPeriods, onCheckedChange: (v) => setUnlockPeriods(v === true) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Include locked quarters (State Admin override — a reason is required at approval)." })
      ] }),
      (detected.length > 1 || detected.some((p) => lockedPeriods.has(`${p.fy}|Q${p.q}`))) && /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "rounded-lg border border-border/60 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { className: "px-1 text-xs font-semibold", children: "Quarters found — untick any you do not want to import" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 flex flex-wrap gap-3", children: detected.map((p) => {
          const locked = lockedPeriods.has(`${p.fy}|Q${p.q}`);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Checkbox,
              {
                checked: periodChecked(p),
                disabled: locked && !unlockPeriods,
                onCheckedChange: (v) => setPeriodSel((prev) => {
                  const next = prev ?? Object.fromEntries(
                    detected.map((d) => [
                      `${d.fy}|Q${d.q}`,
                      !lockedPeriods.has(`${d.fy}|Q${d.q}`)
                    ])
                  );
                  return { ...next, [`${p.fy}|Q${p.q}`]: v === true };
                })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: locked ? "text-muted-foreground" : void 0, children: [
              p.label,
              " · ",
              p.rows,
              " row",
              p.rows === 1 ? "" : "s",
              locked ? " · locked" : ""
            ] })
          ] }, p.label);
        }) })
      ] }),
      prepared.warnings.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-0.5 text-xs text-muted-foreground", children: prepared.warnings.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-3" }),
        " ",
        w
      ] }, w)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            onClick: () => {
              saveRememberedIaMap(rememberKey, map, sheet.headers);
              setStep(3);
            },
            disabled: mappingProblems.length > 0 || activeRows.length === 0,
            className: "gap-2",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-4" }),
              " Review ",
              activeRows.length,
              " row",
              activeRows.length === 1 ? "" : "s"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: () => setStep(1), children: "Back" })
      ] })
    ] }),
    step === 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      (() => {
        const first = activeRows.find((r) => r.fy && r.q);
        if (!first?.fy || !first.q) return null;
        if (!isQuarterProvisional(first.fy, first.q, today)) return null;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "p",
          {
            className: "flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-300/60 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
            "data-testid": "ia-provisional-badge",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-amber-400/60 px-1.5 py-0.5 text-[11px] font-semibold", children: "Provisional" }),
              formatFyQuarter(first.fy, first.q),
              " has not ended yet — re-uploading updates the same rows; the quarter can be marked final after it closes."
            ]
          }
        );
      })(),
      preview.fileWarnings.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "flex flex-wrap gap-1.5", "aria-label": "File warnings", children: preview.fileWarnings.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "li",
        {
          className: "inline-flex items-center gap-1 rounded-full border border-sky-300/60 bg-sky-50 px-2.5 py-1 text-[11px] text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-3" }),
            " ",
            w
          ]
        },
        w
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-10", children: summaryCards.map(([label, value, filterStates, metric]) => {
        const active = metric ? metricFilter === metric : filterStates.length > 0 && stateFilter[0] === filterStates[0];
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            "data-tip": noteFor(label),
            "aria-pressed": active,
            onClick: () => {
              if (metric) {
                setStateFilter([]);
                setMetricFilter((prev) => prev === metric ? null : metric);
                return;
              }
              setMetricFilter(null);
              setStateFilter(
                (prev) => filterStates.length === 0 ? [] : prev.length === 1 && prev[0] === filterStates[0] ? [] : filterStates
              );
            },
            className: cn(
              "rounded-lg border border-border/60 bg-background/60 px-2.5 py-2 text-left transition-colors hover:bg-muted/40",
              active && "border-primary/40 bg-primary/5"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10px] text-muted-foreground", children: label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base font-semibold tabular-nums", children: value })
            ]
          },
          label
        );
      }) }),
      summary.missing.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
        "Facilities not in this file: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: summary.missing.length }),
        " (not changed)."
      ] }),
      summary.unknownNin > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "size-3.5" }),
        " ",
        summary.unknownNin,
        " row(s) carry a valid NIN that is not in your master list — pick the right facility from the Match column."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-w-56 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              value: search,
              onChange: (e) => setSearch(e.target.value),
              placeholder: "Search NIN, facility, key, block, PHC",
              className: "h-9 pl-8 text-xs"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: stateFilter[0] ?? "all", onValueChange: (v) => setStateFilter(v === "all" ? [] : [v]), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-36 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Row status" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", className: "text-xs", children: "All row statuses" }),
            Object.entries(IA_STATE_LABELS).map(([k, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: k, className: "text-xs", children: label }, k))
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: blockFilter[0] ?? "all", onValueChange: (v) => setBlockFilter(v === "all" ? [] : [v]), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-36 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Block" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", className: "text-xs", children: "All blocks" }),
            blocks.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: b, className: "text-xs", children: b }, b))
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: quarterFilter[0] ?? "all", onValueChange: (v) => setQuarterFilter(v === "all" ? [] : [v]), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-40 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Quarter" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", className: "text-xs", children: "All quarters" }),
            quarterOptions.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: s, className: "text-xs", children: s }, s))
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: sortKey, onValueChange: (v) => setSortKey(v), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-36 text-xs", "aria-label": "Sort rows", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Sort" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "row", className: "text-xs", children: "Sort: file order" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "facility", className: "text-xs", children: "Sort: facility" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "block", className: "text-xs", children: "Sort: block" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "state", className: "text-xs", children: "Sort: needs attention first" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            variant: "outline",
            onClick: () => setIncludeOverride((prev) => {
              const next = { ...prev };
              for (const r of viewRows) if (r.state === "ready") next[r.rowNo] = true;
              return next;
            }),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "mr-1 size-3.5" }),
              " Include all Ready"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            variant: "outline",
            onClick: () => setIncludeOverride((prev) => {
              const next = { ...prev };
              for (const r of viewRows) if (r.state === "no_change") next[r.rowNo] = false;
              return next;
            }),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "mr-1 size-3.5" }),
              " Exclude no-change rows"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "sm",
            variant: "outline",
            onClick: () => setFacilityChoice((prev) => {
              const next = { ...prev };
              for (const r of viewRows) {
                if (r.match.status === "suggested" && r.match.candidateIds[0]) next[r.rowNo] = r.match.candidateIds[0];
              }
              return next;
            }),
            children: "Accept all ≥95% suggestions"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs tabular-nums text-muted-foreground", "aria-live": "polite", children: [
          "Showing ",
          shown.length,
          " of ",
          viewRows.length,
          " rows",
          viewRows.length > DOM_CAP ? " · the preview paints the first 500; the export covers all" : ""
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        IaPreviewTableLive,
        {
          columns,
          rows: shown,
          facilities,
          onToggleInclude: (rowNo, next) => setIncludeOverride((p) => ({ ...p, [rowNo]: next })),
          onPickFacility: (rowNo, facilityId) => setFacilityChoice((p) => ({ ...p, [rowNo]: facilityId })),
          onOpenRow: (rowNo) => setDrawerRowNo(rowNo),
          onEditScore: (rowNo, tracker, text) => setScoreEdits((p) => ({ ...p, [rowNo]: { ...p[rowNo] ?? {}, [tracker]: text } })),
          onConfirmNin: (rowNo) => setConfirmedNin((p) => ({ ...p, [rowNo]: true }))
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        IaPreviewCards,
        {
          rows: shown,
          onToggleInclude: (rowNo, next) => setIncludeOverride((p) => ({ ...p, [rowNo]: next })),
          onOpenRow: (rowNo) => setDrawerRowNo(rowNo)
        }
      ),
      preview.coverage.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-background/60 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-semibold", children: "Coverage after this import" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 space-y-2", children: preview.coverage.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: p.label }),
            ": ",
            p.nqas,
            " of ",
            p.total,
            " facilities will have an NQAS score, ",
            p.kayakalp,
            " ",
            "of ",
            p.total,
            " Kayakalp."
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1", children: p.blocks.filter((b) => b.nqas > 0 || b.kayakalp > 0).map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "grid grid-cols-[7rem_1fr_auto] items-center gap-2 text-[10px]",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-muted-foreground", children: b.block }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 overflow-hidden rounded-full bg-muted/60", "aria-hidden": true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "block h-full rounded-full bg-teal-600",
                    style: { width: `${b.total ? Math.round(b.nqas / b.total * 100) : 0}%` }
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums", children: [
                  b.nqas,
                  "/",
                  b.total
                ] })
              ]
            },
            b.block
          )) })
        ] }, p.label)) }),
        summary.missing.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "text-[11px] text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "cursor-pointer", children: [
            "Facilities still missing for this quarter (",
            summary.missing.length,
            ")"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 leading-relaxed", children: [
            summary.missing.slice(0, 60).join(", "),
            summary.missing.length > 60 ? ` … +${summary.missing.length - 60} more` : ""
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => setStep(4), disabled: selected.length === 0, className: "gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-4" }),
          " Review ",
          selected.length,
          " row",
          selected.length === 1 ? "" : "s"
        ] }),
        blocking && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-300", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "size-3.5" }),
          " Resolve the included rows marked Needs review / Unknown NIN / Error"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: () => setStep(2), children: "Back" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sticky bottom-0 z-20 flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/95 px-3 py-2 md:hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs tabular-nums", children: [
          selected.length,
          " selected"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", onClick: () => setStep(4), disabled: selected.length === 0, children: "Review" })
      ] })
    ] }),
    step === 4 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 rounded-xl border border-border/60 bg-background/60 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold", children: "Approve this import" }),
      (() => {
        const periods = [...new Set(selected.map((r) => `${r.fy}|Q${r.q}`))];
        const label = periods.map((p) => {
          const i = p.lastIndexOf("|Q");
          return formatFyQuarter(p.slice(0, i), Number(p.slice(i + 2)));
        }).join(" and ");
        const facilitiesCount = new Set(selected.map((r) => r.facilityId)).size;
        const selNew = selected.filter((r) => IA_TRACKERS.some((t) => r.change[t] === "new")).length;
        const selChanged = selected.filter((r) => IA_TRACKERS.some((t) => r.change[t] === "changed")).length;
        const allKayakalpBlank = selected.length > 0 && selected.every((r) => r.cleaned.scores.kayakalp.raw.trim() === "");
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
          "Save ",
          label || "this quarter",
          " for ",
          facilitiesCount,
          " facilit",
          facilitiesCount === 1 ? "y" : "ies",
          ":",
          " ",
          selNew,
          " new, ",
          selChanged,
          " changed.",
          allKayakalpBlank ? " Kayakalp not reported." : "",
          " You can undo this."
        ] });
      })(),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2 sm:grid-cols-3", children: [
        ["update", "Update changed values", "every included cell is written (default)"],
        ["fillBlanks", "Fill blanks only", "never overwrite a stored value — a safe top-up"],
        ["addNewOnly", "Add new quarter only", "rows already stored for this quarter are skipped"]
      ].map(([value, label, hint]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "label",
        {
          className: cn(
            "flex min-h-14 cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm",
            mode === value ? "border-primary/60 bg-primary/5" : "border-border/60"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "radio",
                name: "ia-mode",
                className: "mt-1 accent-primary",
                checked: mode === value,
                onChange: () => setMode(value)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs font-medium", children: label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10px] text-muted-foreground", children: hint })
            ] })
          ]
        },
        value
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, { checked: blankClears, onCheckedChange: (v) => setBlankClears(v === true) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs", children: [
            "Blank score cells ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "clear" }),
            " the stored value. Off by default — a blank never erases a score."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, { checked: rememberOn, onCheckedChange: (v) => setRememberOn(v === true) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs", children: [
            "Remember the ",
            manuallyPicked,
            " hand-matched row",
            manuallyPicked === 1 ? "" : "s",
            ", so the next import is automatic."
          ] })
        ] })
      ] }),
      includedLocked && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-1 rounded-lg border border-amber-300/60 bg-amber-50 p-3 dark:bg-amber-500/10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-4" }),
          " Some included rows target a LOCKED quarter"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-amber-900/80 dark:text-amber-200/80", children: isAdmin ? "As State Admin you can override the lock — your reason is recorded on every row." : "Only the State Admin can override a locked quarter. Deselect those rows or ask the admin." }),
        isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Textarea,
          {
            className: "min-h-16 text-xs",
            placeholder: "Why is this locked quarter being edited?",
            value: overrideReason,
            onChange: (e) => setOverrideReason(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, { checked: confirmed, onCheckedChange: (v) => setConfirmed(v === true) }),
        "I have reviewed the preview and want to apply this update."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            onClick: runApply,
            disabled: !confirmed || applying || blocking || selected.length === 0 || includedLocked && (!isAdmin || !overrideReason.trim()),
            className: "gap-2",
            children: [
              applying ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "size-4" }),
              "Approve & apply"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            className: "gap-2",
            onClick: () => void downloadIaImportReport({
              fileName: sheet?.fileName ?? "Pasted data",
              generatedBy: ctx.me.name ?? "user",
              generatedAt: /* @__PURE__ */ new Date(),
              rows: viewRows,
              summary: { updated: 0, noChange: 0, skipped: 0, failed: 0 },
              trackers
            }).then(() => toast.success("Preview downloaded")),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4" }),
              " Download preview (Excel)"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: () => setStep(3), disabled: applying, children: "Back to preview" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "The whole batch runs as one transaction — if any row fails, nothing is written." })
    ] }),
    step === 5 && result && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 rounded-xl border border-border/60 bg-background/60 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "flex items-center gap-2 text-base font-semibold", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "size-5 text-emerald-600" }),
        " Import applied"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2 sm:grid-cols-4", children: [
        ["Updated", result.updated],
        ["No change", result.noChange],
        ["Skipped", result.skipped],
        ["Failed", result.failed]
      ].map(([label, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 px-3 py-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[11px] text-muted-foreground", children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-semibold tabular-nums", children: value })
      ] }, label)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            className: "gap-2",
            onClick: () => void downloadIaImportReport({
              fileName: sheet?.fileName ?? "Pasted data",
              generatedBy: ctx.me.name ?? "user",
              generatedAt: /* @__PURE__ */ new Date(),
              rows: viewRows,
              summary: result,
              trackers
            }).then(() => toast.success("Report downloaded")),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4" }),
              " Download import report (Excel)"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "gap-2", onClick: () => onOpenList?.(), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-4" }),
          " View in Master List"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            className: "gap-2",
            disabled: undoState != null,
            onClick: () => void runUndo(),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Undo2, { className: "size-4" }),
              " Undo this import"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "ghost",
            className: "gap-2",
            onClick: () => {
              setSheet(null);
              setMap(autoMapIaColumns([], false));
              setIncludeOverride({});
              setFacilityChoice({});
              setConfirmedNin({});
              setScoreEdits({});
              setPeriodSel(null);
              setUnlockPeriods(false);
              setResult(null);
              setUndoState(null);
              setConfirmed(false);
              setStep(1);
              setSourceTab("paste");
              setPasteText("");
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-4" }),
              " Import another file"
            ]
          }
        )
      ] }),
      undoState && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "Undone — ",
          undoState.restored,
          " row(s) restored",
          undoState.conflicts.length ? `, ${undoState.conflicts.length} skipped (edited since the import)` : "",
          ". The previous values are back; the undo is in Import history."
        ] }),
        undoState.conflicts.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "list-inside list-disc text-amber-700 dark:text-amber-300", children: undoState.conflicts.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
          "Row ",
          c.rowNo,
          ": ",
          c.reason
        ] }, c.rowNo)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Import history keeps this batch, its report and an Undo for later." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      IaRowDetailsDrawer,
      {
        row: drawerRowNo == null ? null : viewRows.find((r) => r.rowNo === drawerRowNo) ?? null,
        facilities,
        onClose: () => setDrawerRowNo(null),
        onRecall: (name, facilityType, facilityId) => {
          void saveAlias({ portalName: name, facilityType, facilityId }).then(() => {
            toast.success("Match remembered — the next import matches automatically");
          });
        },
        onConfirmNin: (rowNo) => setConfirmedNin((p) => ({ ...p, [rowNo]: true }))
      }
    )
  ] });
}
function IaPreviewTableLive({
  columns,
  rows,
  facilities,
  onToggleInclude,
  onPickFacility,
  onOpenRow,
  onEditScore,
  onConfirmNin
}) {
  const lastFrozen = columns.findIndex((c) => c.key === "matchedFacility");
  const FROZEN = (lastFrozen >= 0 ? lastFrozen : 3) + 1;
  const frozenLeft = (i) => i >= FROZEN ? 0 : columns.slice(0, i).reduce((sum, c) => sum + c.width, 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden max-h-[30rem] overflow-auto rounded-lg border border-border/60 md:block", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full border-collapse text-xs", style: { tableLayout: "fixed" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("colgroup", { children: columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("col", { style: { width: c.width } }, c.key)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 z-20 bg-muted/95 backdrop-blur", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: columns.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "th",
      {
        scope: "col",
        className: cn(
          "border-b border-border/60 px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase",
          c.align === "right" && "text-right",
          c.align === "center" && "text-center",
          i < FROZEN && "sticky z-30 bg-muted/95",
          i === FROZEN - 1 && "border-r border-border/60"
        ),
        style: i < FROZEN ? { left: frozenLeft(i) } : void 0,
        children: c.label
      },
      c.key
    )) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
      rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-b border-border/40 hover:bg-muted/30", children: columns.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "td",
        {
          className: cn(
            "px-2 py-1 align-top",
            c.align === "right" && "text-right",
            c.align === "center" && "text-center",
            i < FROZEN && "sticky z-10 bg-background",
            i === FROZEN - 1 && "border-r border-border/40"
          ),
          style: i < FROZEN ? { left: frozenLeft(i) } : void 0,
          children: c.kind === "include" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            Checkbox,
            {
              checked: row.include,
              "aria-label": `Include row ${row.rowNo}`,
              onCheckedChange: (v) => onToggleInclude(row.rowNo, v === true)
            }
          ) : c.kind === "match" ? /* @__PURE__ */ jsxRuntimeExports.jsx(MatchCell, { row, facilities, onPick: onPickFacility }) : c.kind === "move" ? (() => {
            const tracker = c.key.split(":")[0];
            const glyph = iaMoveGlyph(row, tracker);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] font-medium", "data-tip": iaNotes(row), children: [
              glyph,
              " ",
              scoreCell(row, tracker, "move").replace(/^[▲▼■]\s*/, "")
            ] });
          })() : c.kind === "spark" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkline, { row }) : c.kind === "score" ? (() => {
            const [tracker, which] = c.key.split(":");
            if (which === "cur") {
              return /* @__PURE__ */ jsxRuntimeExports.jsx(ScoreChip, { value: row.current[tracker], remark: row.currentRemark[tracker] });
            }
            if (which === "prev") {
              return /* @__PURE__ */ jsxRuntimeExports.jsx(ScoreChip, { value: row.prev[tracker] });
            }
            return /* @__PURE__ */ jsxRuntimeExports.jsx(ScoreEditCell, { row, tracker, onCommit: onEditScore });
          })() : c.kind === "state" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex flex-col items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(StatePill, { state: row.state }),
            row.needsNinConfirm && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => onConfirmNin(row.rowNo),
                className: "rounded border border-amber-400/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 hover:bg-amber-100 dark:text-amber-200",
                children: "Confirm NIN"
              }
            )
          ] }) : c.key === "notes" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => onOpenRow(row.rowNo),
              className: "flex items-start gap-1 text-left text-[11px] leading-tight text-muted-foreground hover:text-foreground",
              "data-tip": "Show row details",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "mt-0.5 size-3 shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "line-clamp-2", children: iaNotes(row) })
              ]
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: cn(
                "block truncate",
                c.key === "matchedFacility" && row.facilityId && "font-medium"
              ),
              children: String(c.raw(row, () => ""))
            }
          )
        },
        c.key
      )) }, row.rowNo)),
      rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: columns.length, className: "p-6 text-center text-muted-foreground", children: "No rows match the current filters." }) })
    ] })
  ] }) });
}
function IaPreviewCards({
  rows,
  onToggleInclude,
  onOpenRow
}) {
  if (rows.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "p-6 text-center text-sm text-muted-foreground md:hidden", children: "No rows match the current filters." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2 md:hidden", "aria-label": "Preview rows", children: rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "rounded-xl border border-border/60 bg-background/70 p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Checkbox,
      {
        checked: row.include,
        "aria-label": `Include row ${row.rowNo}`,
        onCheckedChange: (v) => onToggleInclude(row.rowNo, v === true)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => onOpenRow(row.rowNo), className: "min-w-0 flex-1 text-left", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex flex-wrap items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-sm font-semibold", children: row.facilityName || row.cleaned.name || "Unknown NIN" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatePill, { state: row.state })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-0.5 block text-[11px] text-muted-foreground", children: [
        "NIN ",
        row.nin ?? "-",
        " · ",
        row.facilityBlock || row.cleaned.block,
        " · ",
        row.facilityType || row.cleaned.facilityType,
        row.fy && row.q ? ` · ${formatFyQuarter(row.fy, row.q)}` : ""
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-1 flex flex-wrap gap-2 text-[11px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "NQAS ",
          row.current.nqas ?? "-",
          " → ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: row.cleaned.scores.nqas.value ?? "-" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "Kayakalp ",
          row.current.kayakalp ?? "-",
          " → ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: row.cleaned.scores.kayakalp.value ?? "-" })
        ] })
      ] }),
      row.crossCheck && row.needsNinConfirm && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 block text-[10px] text-amber-700 dark:text-amber-300", children: row.crossCheck })
    ] })
  ] }) }, row.rowNo)) });
}
function IaRowDetailsDrawer({
  row,
  facilities,
  onClose,
  onRecall: _onRecall,
  onConfirmNin
}) {
  if (!row) return null;
  const c = row.cleaned;
  const candidates = [.../* @__PURE__ */ new Set([...row.suggestionIds, ...row.match.status === "ambiguous" || row.match.status === "suggested" ? row.match.candidateIds : []])].map((id) => facilities.find((f) => f.id === id)).filter((f) => !!f);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: true, onOpenChange: (o) => !o && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong max-h-[85vh] overflow-y-auto sm:max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "Row ",
        row.rowNo,
        " — ",
        row.facilityName || c.nin || c.key || c.name
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { children: [
        IA_STATE_LABELS[row.state],
        " · ",
        matchLabel(row),
        row.fy && row.q ? ` · ${formatFyQuarter(row.fy, row.q)}` : ""
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Identity" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "NIN ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: c.nin ?? "-" }),
          c.ninRaw && c.ninRaw !== c.nin ? ` (file: ${c.ninRaw})` : "",
          " · ",
          row.facilityName || "—",
          " ·",
          " ",
          row.facilityBlock,
          " · ",
          row.facilityPhc,
          " (",
          row.facilityType,
          ")"
        ] }),
        row.crossCheck && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5" }),
          " ",
          row.crossCheck,
          row.needsNinConfirm && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", className: "ml-1 h-6 px-2 text-[10px]", onClick: () => onConfirmNin(row.rowNo), children: "Confirm NIN" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Cleaned scores" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-xs", children: [
          IA_TRACKERS.map((t) => {
            const s = c.scores[t];
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2 grid grid-cols-[7rem_1fr] gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-muted-foreground", children: TRACKER_LABELS[t] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "tabular-nums", children: s.raw.trim() === "" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
                "blank in file — stored ",
                row.current[t] ?? "nothing",
                " is kept"
              ] }) : s.error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-destructive", children: [
                "“",
                s.raw,
                "” is outside 0–100"
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                "“",
                s.raw,
                "” → ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: s.value ?? s.chip }),
                " · stored ",
                row.current[t] ?? "nothing"
              ] }) })
            ] }, t);
          }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-muted-foreground", children: "Period" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
            c.fy ?? "—",
            " · ",
            c.q ? `Q${c.q}` : "—"
          ] })
        ] })
      ] }),
      row.trend.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Last four quarters" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "mt-1 w-full text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "text-left text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "font-medium", children: "Quarter" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right font-medium", children: "NQAS IA" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right font-medium", children: "Kayakalp IA" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: row.trend.map((p, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: i === row.trend.length - 1 ? "font-semibold" : void 0, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right tabular-nums", children: p.nqas ?? "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-right tabular-nums", children: p.kayakalp ?? "-" })
          ] }, p.label)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Why it matched" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: matchLabel(row) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "rounded-lg border border-border/60 p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "cursor-pointer text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Raw row from the file" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "mt-1 max-h-40 overflow-auto text-[10px] leading-relaxed text-muted-foreground", children: JSON.stringify(c.raw, null, 2) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Notes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "list-inside list-disc text-xs text-muted-foreground", children: [
          row.chips.length === 0 && row.warnings.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "None — a plain update." }),
          row.chips.map((chip) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: chip }, chip)),
          row.warnings.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "text-amber-700 dark:text-amber-300", children: w }, w))
        ] })
      ] }),
      candidates.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Suggestions" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1 text-xs", children: candidates.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
          f.name,
          " · ",
          f.block,
          " · ",
          f.phc,
          " (",
          f.facilityType,
          ")",
          f.ninNumber ? ` · ${f.ninNumber}` : ""
        ] }, f.id)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[10px] text-muted-foreground", children: "Suggestions are NEVER auto-applied — pick the facility from the Match column." })
      ] })
    ] })
  ] }) });
}
function trackerDecision(row, t, blankClears) {
  const s = row.cleaned.scores[t];
  if (s.error) return void 0;
  if (s.raw.trim() === "") {
    return blankClears ? { value: null, remark: null } : void 0;
  }
  return { value: s.value, remark: s.remark ?? null };
}

const stateOfResult = (r) => r === "updated" ? "ready" : r === "no_change" ? "no_change" : r === "undone" ? "no_change" : r === "skipped" ? "skipped" : "error";
const changeOfResult = (r, before) => r === "updated" ? before ? "changed" : "new" : r === "no_change" || r === "undone" ? "same" : "none";
function importRowToPreview(r, recent) {
  const c = r.cleaned ?? {};
  const before = r.oldValue ?? null;
  const fy = c.fy ?? before?.fy ?? "";
  const quarter = before ? before.quarter : c.quarter ?? 0;
  const scoresRaw = {
    nqas: String(c.nqas ?? ""),
    kayakalp: String(c.kayakalp ?? ""),
    eco: String(c.eco ?? "")
  };
  const cleaned = {
    rowNo: r.rowNo,
    sourceRowNo: r.rowNo,
    raw: r.raw ?? {},
    key: c.key ?? "",
    name: c.name ?? r.facilityName ?? "",
    block: r.facilityBlock ?? "",
    phc: r.facilityPhc ?? "",
    facilityType: "",
    typeKnown: true,
    nin: c.nin ? String(c.nin) : null,
    ninRaw: c.nin ? String(c.nin) : "",
    ninError: null,
    ninPadded: false,
    fy: fy || null,
    q: quarter >= 1 && quarter <= 4 ? quarter : null,
    // Scores carry the STORED after-values (newValue) for updated rows so the
    // report shows what was written, not the raw file text alone.
    scores: {
      nqas: trackerScore("nqas", r, before, scoresRaw),
      kayakalp: trackerScore("kayakalp", r, before, scoresRaw),
      eco: trackerScore("eco", r, before, scoresRaw)
    },
    fyError: false,
    qError: false,
    warnings: []
  };
  const state = stateOfResult(r.result);
  return {
    rowNo: r.rowNo,
    sourceRowNo: r.rowNo,
    cleaned,
    match: r.facilityId ? {
      status: "matched",
      method: r.matchMethod === "nin" ? "exact" : r.matchMethod,
      confidence: r.confidence,
      facilityId: r.facilityId,
      viaNin: r.matchMethod === "nin"
    } : { status: "unmatched", method: "none", confidence: 0, facilityId: null, candidateIds: [] },
    facilityId: r.facilityId ?? null,
    facilityName: r.facilityName ?? cleaned.name,
    facilityBlock: r.facilityBlock ?? "",
    facilityPhc: r.facilityPhc ?? "",
    facilityType: cleaned.facilityType,
    nin: cleaned.nin,
    ninError: null,
    ninPadded: false,
    crossCheck: null,
    needsNinConfirm: false,
    unknownNin: false,
    outsideBlocks: false,
    suggestionIds: [],
    edited: [],
    fy: cleaned.fy,
    q: cleaned.q,
    current: trackerCurrent("nqas", before),
    currentRemark: {
      nqas: before?.nqasRemark ?? null,
      kayakalp: before?.kayakalpRemark ?? null,
      eco: before?.ecoRemark ?? null
    },
    prev: {
      nqas: quarterlyPrevValue(r.facilityId, fy, quarter, "nqas", recent),
      kayakalp: quarterlyPrevValue(r.facilityId, fy, quarter, "kayakalp", recent),
      eco: quarterlyPrevValue(r.facilityId, fy, quarter, "eco", recent)
    },
    trend: [],
    change: {
      nqas: changeOfResult(r.result, before),
      kayakalp: changeOfResult(r.result, before),
      eco: changeOfResult(r.result, before)
    },
    state,
    include: r.result === "updated",
    locked: !!before?.lockedAt,
    stale: false,
    future: false,
    warnings: r.error ? [r.error] : [],
    chips: r.notes ? [r.notes] : []
  };
}
function trackerScore(t, r, before, scoresRaw) {
  const after = r.newValue ?? null;
  const wrote = r.result === "updated";
  const fieldOf = (s) => t === "nqas" ? s?.nqasIaScore ?? null : t === "kayakalp" ? s?.kayakalpIaScore ?? null : s?.ecoFriendlyScore ?? null;
  const remarkOf = (s) => t === "nqas" ? s?.nqasRemark ?? null : t === "kayakalp" ? s?.kayakalpRemark ?? null : s?.ecoRemark ?? null;
  const raw = scoresRaw[t];
  if (wrote) {
    const value2 = fieldOf(after);
    const remark2 = remarkOf(after);
    return { value: value2, remark: remark2, chip: null, error: false, fraction: false, raw };
  }
  const value = before ? fieldOf(before) : null;
  const remark = before ? remarkOf(before) : null;
  return { value: raw.trim() === "" ? value : parseNumberOrNull(raw), remark: raw.trim() === "" ? remark : raw.trim() === "" ? null : remark, chip: null, error: false, fraction: false, raw };
}
function parseNumberOrNull(raw) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
function trackerCurrent(t, before) {
  if (!before) return { nqas: null, kayakalp: null, eco: null };
  return {
    nqas: before.nqasIaScore ?? null,
    kayakalp: before.kayakalpIaScore ?? null,
    eco: before.ecoFriendlyScore ?? null
  };
}
function quarterlyPrevValue(facilityId, fy, quarter, _t, recent) {
  if (!facilityId || !fy || quarter < 1) return null;
  const [prevFy, prevQ] = quarter === 1 ? [String(Number(fy.slice(0, 4)) - 1), 4] : [fy, quarter - 1];
  const prev = recent.find((q) => q.facilityId === facilityId && q.fy === prevFy && q.quarter === prevQ);
  return prev ? prev.nqasIaScore ?? prev.kayakalpIaScore ?? prev.ecoFriendlyScore : null;
}
function IaBatchReportWorker({
  batchId,
  fileName,
  importedByName,
  summary,
  onDone,
  onError
}) {
  const rows = useQuery(api.imports.listImportBatchRows, { batchId });
  const recent = useQuery(api.ia.listIaQuarters, { limit: 2e4 });
  const recentStored = reactExports.useMemo(
    () => (recent ?? []).map((q) => ({
      facilityId: q.facilityId,
      fy: q.fy,
      quarter: q.quarter,
      nqasIaScore: q.nqasIaScore,
      kayakalpIaScore: q.kayakalpIaScore,
      ecoFriendlyScore: q.ecoFriendlyScore,
      nqasRemark: q.nqasRemark,
      kayakalpRemark: q.kayakalpRemark,
      ecoRemark: q.ecoRemark,
      lockedAt: q.lockedAt,
      updatedAt: q.updatedAt
    })),
    [recent]
  );
  reactExports.useEffect(() => {
    if (!rows) return;
    const preview = rows.map((row) => importRowToPreview(row, recentStored));
    downloadIaImportReport({
      fileName,
      generatedBy: importedByName,
      generatedAt: /* @__PURE__ */ new Date(),
      rows: preview,
      summary: {
        ...summary,
        skipped: summary.skipped + Math.max(0, rows.length - (summary.updated + summary.noChange + summary.failed))
      },
      trackers: trackersOf(rows)
    }).then(onDone).catch(() => onError("Could not build the report"));
  }, [rows, recent]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 p-6 text-sm text-muted-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }),
    " Building the report…"
  ] });
}
function trackersOf(rows) {
  const carried = IA_TRACKERS.filter(
    (t) => rows.some((row) => {
      const c = row.cleaned ?? {};
      return String(c[t === "nqas" ? "nqas" : t === "kayakalp" ? "kayakalp" : "eco"] ?? "").trim() !== "";
    })
  );
  return carried.length ? carried : [...IA_TRACKERS];
}
function IaImportHistory() {
  const batches = useQuery(api.ia.listIaBatches, { limit: 50 });
  const undo = useMutation(api.ia.undoIaBatch);
  const [busy, setBusy] = reactExports.useState(null);
  const [conflicts, setConflicts] = reactExports.useState(null);
  const [reportBatch, setReportBatch] = reactExports.useState(null);
  const runUndo = async (batchId) => {
    setBusy(batchId);
    try {
      const res = await undo({ batchId });
      if (res.conflicts.length > 0) {
        setConflicts({ batchId, rows: res.conflicts.map((c) => ({ rowNo: c.rowNo, reason: c.reason })) });
        toast.warning(`Restored ${res.restored} row(s); ${res.conflicts.length} skipped (edited since the import)`);
      } else {
        toast.success(`Import undone — ${res.restored} row(s) restored`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not undo the import");
    }
    setBusy(null);
  };
  if (batches === void 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 p-6 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }),
      " Loading the import history…"
    ] });
  }
  if (batches.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "glass", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-6 text-sm text-muted-foreground", children: "No Internal Assessment imports yet. Every confirmed import is listed here with who / when / file name and an Undo button." }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-auto rounded-xl border border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full border-collapse text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/60", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: ["When", "By", "File", "Status", "Total", "Updated", "No change", "Skipped", "Failed", ""].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", children: h }, h)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: batches.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "whitespace-nowrap px-3 py-2 text-xs", children: toDisplayStamp(b.importedAt) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-xs", children: b.importedByName ?? "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "max-w-48 px-3 py-2 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "shrink-0 text-[10px] font-normal", children: /^pasted/i.test(b.fileName) ? "Paste" : "Upload" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: b.fileName })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Badge,
          {
            variant: "secondary",
            className: b.status === "undone" ? "bg-muted text-muted-foreground" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
            children: b.status
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-right text-xs tabular-nums", children: b.rowsTotal }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-right text-xs tabular-nums", children: b.rowsUpdated }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-right text-xs tabular-nums", children: b.rowsNoChange }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-right text-xs tabular-nums", children: b.rowsSkipped }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-right text-xs tabular-nums", children: b.rowsFailed }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "ghost", className: "gap-1", onClick: () => setReportBatch(b._id), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" }),
            " Report"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              size: "sm",
              variant: "outline",
              className: "gap-1",
              disabled: b.status === "undone" || busy === String(b._id),
              onClick: () => void runUndo(String(b._id)),
              children: [
                busy === String(b._id) ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Undo2, { className: "size-3.5" }),
                "Undo"
              ]
            }
          )
        ] }) })
      ] }, b._id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!conflicts, onOpenChange: (o) => !o && setConflicts(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "glass-strong sm:max-w-lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Some rows could not be undone" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "These facilities were edited after the import, so restoring them would lose that edit. They were skipped." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "max-h-64 space-y-1 overflow-auto text-xs", children: conflicts?.rows.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
        "Row ",
        c.rowNo,
        ": ",
        c.reason
      ] }, c.rowNo)) })
    ] }) }),
    reportBatch && batches && (() => {
      const batch = batches.find((b) => b._id === reportBatch);
      if (!batch) return null;
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        IaBatchReportWorker,
        {
          batchId: reportBatch,
          fileName: batch.fileName,
          importedByName: batch.importedByName ?? "",
          summary: {
            updated: batch.rowsUpdated,
            noChange: batch.rowsNoChange,
            skipped: batch.rowsSkipped,
            failed: batch.rowsFailed
          },
          onDone: () => {
            setReportBatch(null);
            toast.success("Report downloaded");
          },
          onError: (message) => {
            setReportBatch(null);
            toast.error(message);
          }
        }
      );
    })()
  ] });
}
function IaImport() {
  const listRows = useQuery(api.ops.listFacilityRowsFast, {});
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = listRows?.me.appRole;
  const allowed = role === "admin" || role === "entry";
  const initialPeriod = reactExports.useMemo(() => {
    const fy = params.get("fy");
    const q = Number(params.get("q"));
    return fy && q >= 1 && q <= 4 ? { fy, q } : null;
  }, [params]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    AppShell,
    {
      title: "Internal Assessment import",
      subtitle: "Paste or upload the NIN-based quarterly IA scores, review previous → now, then approve",
      children: [
        listRows !== void 0 && allowed && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(IaReminderBanner, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(IaCoverageLine, { className: "mb-3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(IaMissingQuartersHint, { className: "mb-3" })
        ] }),
        listRows !== void 0 && !allowed ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "glass max-w-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "flex items-start gap-3 p-6 text-sm text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "mt-0.5 size-4 shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "The Internal Assessment import is available to the State Admin and District Editors only." })
        ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "import", className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "h-auto w-full justify-start gap-1 rounded-xl border border-border/60 bg-background/60 p-1 sm:w-auto", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "import", className: "gap-1.5 rounded-lg px-3 py-1.5 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileUp, { className: "size-3.5" }),
              " Import"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "history", className: "gap-1.5 rounded-lg px-3 py-1.5 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-3.5" }),
              " Import history"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "reports", className: "gap-1.5 rounded-lg px-3 py-1.5 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" }),
              " Reports"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "import", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            IaImportWizard,
            {
              initialPeriod,
              onOpenList: () => navigate("/facilities")
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "history", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IaImportHistory, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "reports", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IaReportsTab, {}) })
        ] })
      ]
    }
  );
}
function IaReportsTab() {
  const today = todayLocalIso();
  const quarterChoices = reactExports.useMemo(() => quarterOverrideOptions(today), [today]);
  const [sel, setSel] = reactExports.useState(null);
  const effective = sel ? sel : quarterChoices[0] ? { fy: quarterChoices[0].fy, q: quarterChoices[0].q } : null;
  const ctx = useQuery(api.ia.getIaImportContext, {});
  const quartersQ = useQuery(api.ia.listIaQuarters, { limit: 2e4 });
  const [busy, setBusy] = reactExports.useState(null);
  const runTemplate = async () => {
    if (!effective || !ctx) return;
    setBusy("template");
    try {
      await downloadIaQuarterTemplate(
        effective.fy,
        effective.q,
        ctx.facilities.map((f) => ({
          name: f.name,
          block: f.block,
          phc: f.phc,
          facilityType: f.facilityType,
          ninNumber: f.ninNumber ?? null
        }))
      );
      toast.success("Quarter template downloaded");
    } catch {
      toast.error("Could not build the template");
    }
    setBusy(null);
  };
  const runQuarterly = async () => {
    if (!effective || !ctx || quartersQ === void 0) return;
    setBusy("quarterly");
    try {
      const prev = previousQuarter(effective.fy, effective.q);
      const key = (fy, q) => `${fy}|Q${q}`;
      const byFacility = /* @__PURE__ */ new Map();
      for (const q of quartersQ) {
        const list = byFacility.get(q.facilityId) ?? [];
        list.push(q);
        byFacility.set(q.facilityId, list);
      }
      const mkScores = () => ({
        nqas: null,
        kayakalp: null,
        eco: null
      });
      const rows = ctx.facilities.map((f) => {
        const rowsF = byFacility.get(f.id) ?? [];
        const scores = {};
        const remarks = {};
        const locked = {};
        for (const keyP of [prev, effective]) {
          const k = key(keyP.fy, keyP.q);
          scores[k] = mkScores();
          remarks[k] = { nqas: null, kayakalp: null, eco: null };
        }
        for (const row of rowsF) {
          const k = key(row.fy, row.quarter);
          if (!(k in scores)) continue;
          scores[k].nqas = row.nqasIaScore;
          scores[k].kayakalp = row.kayakalpIaScore;
          scores[k].eco = row.ecoFriendlyScore;
          remarks[k].nqas = row.nqasRemark;
          remarks[k].kayakalp = row.kayakalpRemark;
          remarks[k].eco = row.ecoRemark;
          locked[k] = !!row.lockedAt;
        }
        return {
          facilityId: f.id,
          name: f.name,
          block: f.block,
          phc: f.phc,
          facilityType: f.facilityType,
          scores,
          remarks,
          locked
        };
      });
      await downloadIaQuarterlyReport({
        generatedBy: ctx.me.name ?? "user",
        generatedAt: /* @__PURE__ */ new Date(),
        period: effective,
        periods: [prev, effective].sort(
          (a, b) => quarterOrder(a.fy, a.q) - quarterOrder(b.fy, b.q)
        ),
        rows
      });
      toast.success("IA Quarterly Report downloaded");
    } catch {
      toast.error("Could not build the quarterly report");
    }
    setBusy(null);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 rounded-xl border border-border/60 bg-background/60 p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-end gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-44", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1 text-xs font-medium text-muted-foreground", children: "Quarter" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Select,
          {
            value: effective ? `${effective.fy}:Q${effective.q}` : "none",
            onValueChange: (v) => {
              const hit = quarterChoices.find((qq) => `${qq.fy}:${qq.q}` === v);
              if (hit) setSel({ fy: hit.fy, q: hit.q });
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Pick a quarter" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: quarterChoices.map((qq) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: `${qq.fy}:${qq.q}`, className: "text-xs", children: formatFyQuarter(qq.fy, qq.q) }, `${qq.fy}:${qq.q}`)) })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { className: "gap-2", disabled: !effective || !ctx || busy === "template", onClick: () => void runTemplate(), children: [
        busy === "template" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4" }),
        "Download quarter template"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          className: "gap-2",
          disabled: !effective || !ctx || quartersQ === void 0 || busy === "quarterly",
          onClick: () => void runQuarterly(),
          children: [
            busy === "quarterly" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4" }),
            "Export IA Quarterly Report (Excel)"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "The template lists every master-list facility with its mapped key, Block, PHC, Type and the FY/Quarter filled in — fill the score columns and re-import it. The quarterly report prints the quarter and its previous one side by side per tracker, with a summary sheet (reported counts, locks)." })
  ] });
}

const IaImport$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  IaBatchReportWorker,
  default: IaImport
}, Symbol.toStringTag, { value: 'Module' }));

export { IaImportWizard as I, SAQSHAM_SAMPLE_TSV as S, parseSaqshamFile as a, IaBatchReportWorker as b, downloadIaQuarterTemplate as c, downloadSampleFile as d, IaImport$1 as e, parsePastedText as p };
