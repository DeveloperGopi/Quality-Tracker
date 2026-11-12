/**
 * FACILITY-MASTER IMPORT TEMPLATE (Part 6.2) — generated from THE central
 * config (lib/masterColumns) so it can never drift from the app:
 *
 *   • headers = the config's labels for every column flagged `importable`;
 *   • the group band row carries the same group names the UI bands show;
 *   • "Field guide" is generated: required?, format, importable? — derived
 *     columns (Certification Cycle, Facility Current Status, validity, due
 *     dates, Documents Status (Report), Fire NOC Validity Status) list as
 *     "Auto, do not fill";
 *   • "Lists" carries the live admin lists so the dropdowns work offline;
 *   • blank template: one clearly-marked grey sample row to delete;
 *   • current-data template: every facility's stored values re-uploadable.
 *
 * The SaQsham document status and the quarterly IA scores are NOT here —
 * they have their own importers (the Instructions sheet says so).
 */

import ExcelJS from "exceljs";

import { DEFAULT_SETTINGS } from "@/convex/lifecycle";

import {
  fullExportColumns,
  isDeprecatedColumn,
  COLUMN_BY_KEY,
  type MasterColumn,
  type MasterRow,
} from "./masterColumns";
import { cellText } from "./masterColumns";
import { columnWidthPx } from "./masterGrid";

const TEAL = "FF0F6B63";

/** The importable columns in config order — the template's header list. */
export const IMPORTABLE_COLUMNS: MasterColumn[] = fullExportColumns().filter(
  (c) => c.importable === true,
);

/** Columns that are derived — listed as "Auto, do not fill" in the guide. */
export const DERIVED_KEYS = [
  "certCycle",
  "pipelineStatus",
  "validityDate",
  "nextAction",
  "documentsStatusReport",
  "nocStatus",
  "documents",
];

const TYPES: Record<string, { format: string; required: string; notes: string }> = {
  text: { format: "text", required: "sometimes", notes: "plain text" },
  date: { format: "DD-MMM-YYYY (e.g. 23-Sep-2025)", required: "optional", notes: "flexible parse; shown DD-MMM-YYYY" },
  currency: { format: "₹ 1,25,000 (Indian grouping)", required: "optional", notes: "number, rupees" },
  score: { format: "0–100", required: "optional", notes: "a blank score is never 0" },
  status: { format: "list value", required: "sometimes", notes: "must exist in the admin list" },
};

/** One workbook: [blank | current] + the live admin lists. */
export function buildMasterImportWorkbook(o: {
  template: "blank" | "current";
  rows: readonly MasterRow[];
  lists: Record<string, string[]>;
  generatedBy: string;
}): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = o.generatedBy;
  const cols = IMPORTABLE_COLUMNS;

  /* ---------- Sheet 1 — Facility Master (headers + band + data) ---------- */
  const ws = wb.addWorksheet("Facility Master", {
    views: [{ state: "frozen", ySplit: 2, xSplit: 2 }],
  });
  // The group band row (row 1) uses the same group names the UI bands show.
  const band: string[] = [];
  cols.forEach((c, i) => band.push(i === 0 || cols[i - 1].group !== c.group ? c.group : ""));
  ws.columns = cols.map((c) => ({ width: Math.max(12, columnWidthPx(c) / 8) }));
  const bandRow = ws.addRow(band);
  bandRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
  cols.forEach((_, i) => {
    bandRow.getCell(i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL } };
    bandRow.getCell(i + 1).alignment = { horizontal: "center", vertical: "middle" };
  });
  const headRow = ws.addRow(cols.map((c) => c.label));
  headRow.font = { bold: true };
  cols.forEach((c, i) => {
    const cell = headRow.getCell(i + 1);
    cell.border = { bottom: { style: "thin", color: { argb: "FFE1E7ED" } } };
    // NIN (and the phone-like fields) keep their leading zeros as TEXT.
    if (c.key === "nin") cell.numFmt = "@";
  });
  ws.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2, column: cols.length },
  };

  if (o.template === "blank") {
    const sample = cols.map(() => "");
    const first = COLUMN_BY_KEY.facility;
    sample[cols.indexOf(first as MasterColumn)] = "delete this row";
    const row = ws.addRow(sample);
    row.getCell(1).note = "Grey sample row — delete it before uploading.";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      cell.font = { italic: true, color: { argb: "FF94A3B8" } };
    });
  } else {
    for (const r of o.rows) {
      const row = ws.addRow(cols.map((c) => cellText(r, c.key).replace(/(Overdue|Due in) .*$/, "") || ""));
      const ninIdx = cols.findIndex((c) => c.key === "nin");
      if (ninIdx >= 0) row.getCell(ninIdx + 1).numFmt = "@";
    }
  }

  /* ---------- Sheet 2 — Instructions ---------- */
  const ins = wb.addWorksheet("Instructions");
  ins.columns = [{ width: 100 }];
  const steps = [
    "1. Keep the header rows exactly as they are — the importer reads them.",
    "2. Fill only the importable columns; the one row per facility, the NIN decides whether the facility is NEW or EXISTING.",
    "3. Blank cell never erases an existing value — a blank is 'no change' (unless you tick \"Blank cell clears existing value\" in the wizard).",
    "4. Dates: any common format is fine (DD-MMM-YYYY shown). Amounts use Indian grouping (₹ 1,25,000). Scores go 0–100; a blank score is never 0.",
    "5. Read-only now: Certification Cycle, Facility Current Status, validity and due dates, Documents Status (Report), Fire NOC Validity Status are DERIVED — the app computes them; the Field guide marks them \"Auto, do not fill\".",
    "6. SaQsham document status and quarterly IA scores are NOT imported here — use their own importers on the Bulk Import page.",
    "Colour legend: grey sample row = delete me; red = error, amber = needs review, green = ready in the preview.",
    "Certification Cycle: every facility starts at Cycle #1 (Initial). A SECOND cycle (#2 Recert) opens only when a re-application starts — \"Recertification Due\" alone does NOT advance the cycle.",
  ];
  for (const line of steps) ins.addRow([line]);

  /* ---------- Sheet 3 — Field guide ---------- */
  const guide = wb.addWorksheet("Field guide");
  guide.columns = [{ width: 30 }, { width: 26 }, { width: 44 }, { width: 40 }];
  const gh = guide.addRow(["Column", "Required?", "Format", "Importable?"]);
  gh.font = { bold: true };
  // The guide lists EVERY field (not just the importable ones) so derived
  // columns are explicitly marked "Auto, do not fill".
  for (const c of fullExportColumns()) {
    const t = TYPES[c.type] ?? { format: c.type, required: "optional", notes: "" };
    const importable = c.importable === true && !isDeprecatedColumn(c);
    const derived = DERIVED_KEYS.includes(c.key) || !importable;
    guide.addRow([
      c.label,
      t.required,
      `${t.format}${t.notes ? ` — ${t.notes}` : ""}`,
      importable ? "Yes" : "Auto, do not fill (derived)",
    ]);
  }

  /* ---------- Sheet 4 — Lists (dropdown sources; live admin lists) ---------- */
  const lists = wb.addWorksheet("Lists");
  const names = Object.keys(o.lists);
  lists.columns = names.map((n) => ({ width: Math.max(12, n.length + 4) }));
  const lh = lists.addRow(names);
  lh.font = { bold: true };
  const depth = Math.max(0, ...names.map((n) => o.lists[n].length));
  for (let i = 0; i < depth; i++) lists.addRow(names.map((n) => o.lists[n][i] ?? ""));

  /* ---------- Page setup (landscape, footer) ---------- */
  for (const sheet of wb.worksheets) {
    sheet.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    };
    // "Page N of M" in every footer (ExcelJS's headerFooter object).
    sheet.headerFooter = { oddFooter: "&P of &N", evenFooter: "&P of &N" };
  }
  ["Facility Master", "Field guide", "Lists"].forEach((name) => {
    const sheet = wb.getWorksheet(name);
    sheet?.pageSetup && (sheet.pageSetup.margins = sheet.pageSetup.margins);
  });
  return wb;
}

/* ------------------------------------------------------------------------- */
/* Browser downloads + the live list source                                    */
/* ------------------------------------------------------------------------- */

/** The "Lists" sheet sources — the live admin lists (settings) plus the
 *  blocks / PHCs present in the current data, so the dropdowns work offline.
 *  (Also the SaQsham status list and the plain Yes/No pair.) */
export function masterImportLists(
  rows: readonly { facility: { block: string; phc: string } }[],
): Record<string, string[]> {
  const uniq = (v: string[]) => [...new Set(v)].filter(Boolean).sort();
  return {
    Blocks: uniq(rows.map((r) => r.facility.block)),
    PHCs: uniq(rows.map((r) => r.facility.phc)),
    FacilityTypes: DEFAULT_SETTINGS.facilityTypes,
    Eligibility: DEFAULT_SETTINGS.eligibilityOptions,
    BuildingTypes: DEFAULT_SETTINGS.buildingTypes,
    BuildingStatuses: DEFAULT_SETTINGS.buildingStatuses,
    CertificationStatuses: DEFAULT_SETTINGS.certificationStatuses,
    SaQshamDocStatuses: DEFAULT_SETTINGS.generalDocStatuses,
    YesNo: ["Yes", "No"],
  };
}

/** The workbook → a browser download ("Download template" buttons). */
export async function downloadMasterTemplate(
  template: "blank" | "current",
  rows: readonly MasterRow[],
  lists: Record<string, string[]>,
  generatedBy: string,
): Promise<void> {
  const wb = buildMasterImportWorkbook({ template, rows, lists, generatedBy });
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    template === "blank"
      ? "facility-master-import-template.xlsx"
      : "facility-master-current-data.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

/** The CSV template twin → a browser download. */
export function downloadMasterCsvTemplate(lists: Record<string, string[]>): void {
  const blob = new Blob([buildMasterImportCsv(lists)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "facility-master-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** Headers + one sample row — a CSV twin of the workbook (screenshots and the
 *  re-upload round trip). Full-data exports re-import unchanged. */
export function buildMasterImportCsv(lists: Record<string, string[]>): string {
  const headers = IMPORTABLE_COLUMNS.map((c) => c.label);
  const sample: (string | null)[] = IMPORTABLE_COLUMNS.map((c) =>
    c.key === "facility" ? "sample — delete this row" : null,
  );
  const listsLine = Object.entries(lists)
    .filter(([, v]) => v.length > 0)
    .map(([k, v]) => `${k}: ${v.join(" | ")}`);
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [
    headers.join(","),
    sample.map(() => "").join(","),
    ...listsLine.map(esc),
    "",
  ].join("\n");
}
