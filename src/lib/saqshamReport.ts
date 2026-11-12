/**
 * SaQsham IMPORT REPORT — built only from the snapshot saved with the batch.
 *
 * A report must describe what Apply did, not what the facility looks like now.
 * The preview builds this snapshot before Apply; the server stores it on the
 * batch and every later download/view reads that stored copy. Old batches have
 * no snapshot and deliberately show a detail-unavailable summary rather than
 * empty state sheets.
 */

import ExcelJS from "exceljs";

import type { PreviewRow } from "./saqshamImport";
import {
  applicationTypeLabel,
  matchLabel,
  nextReportLabel,
  notesFor,
  previousReportLabel,
  shortDate,
} from "./saqshamPreviewColumns";

export type ReportState =
  | "Updated"
  | "New"
  | "No change"
  | "Needs decision"
  | "Can't match"
  | "Skipped"
  | "Failed";

/** One immutable row as it looked when Apply was confirmed. */
export type ReportRow = {
  rowNo: number;
  state: ReportState;
  applicationNo: string;
  portalName: string;
  matchedFacility: string;
  facilityType: string;
  phc: string;
  block: string;
  match: string;
  previousStatus: string;
  newStatus: string;
  previousReport: string;
  newReport: string;
  previousPortalUpdate: string;
  newPortalUpdate: string;
  application: string;
  mode: string;
  notes: string;
  appliedBy: string;
  appliedAt: number;
};

export type ImportReportInput = {
  fileName: string;
  generatedBy: string;
  generatedAt: Date;
  summary: { updated: number; noChange: number; skipped: number; failed: number };
  statusMap: readonly { portal: string; report: string }[];
  /** Absent means this is an old batch with no stored detail. */
  reportRows?: readonly ReportRow[] | null;
  rowsTotal?: number;
};

const PRIMARY = "FF0D6960";
const headerFill: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: PRIMARY },
};

const UPDATED_HEADERS = [
  "Row",
  "Application No",
  "Portal name",
  "Matched facility",
  "Facility type",
  "PHC",
  "Block",
  "Match",
  "Previous status",
  "New status",
  "Previous report group",
  "New report group",
  "Previous portal update",
  "New portal update",
  "Application",
  "Mode",
  "Applied by",
  "Applied at",
];

const UPDATED_WIDTHS = [7, 17, 24, 26, 14, 15, 15, 22, 26, 26, 26, 26, 19, 19, 12, 12, 20, 24];
const SIMPLE_HEADERS = [
  "Row",
  "Application No",
  "Portal name",
  "Matched facility",
  "Facility type",
  "PHC",
  "Block",
  "Match",
  "Previous status",
  "New status",
  "Previous report group",
  "New report group",
  "Previous portal update",
  "New portal update",
  "Application",
  "Mode",
  "Applied by",
  "Notes",
];

const SIMPLE_WIDTHS = [7, 17, 24, 26, 14, 15, 15, 22, 26, 26, 26, 26, 19, 19, 12, 12, 20, 42];

function text(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  // Visible apostrophes are export noise, never data.
  const clean = raw.replace(/^'+/, "").trim();
  if (!clean) return "-";
  // Keep formula-looking cells as text without adding an apostrophe.
  return /^[=+@]/.test(clean) || (clean.startsWith("-") && clean.length > 1)
    ? ` ${clean}`
    : clean;
}

function ddmmyyyy(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${iso[3]}-${months[Number(iso[2]) - 1]}-${iso[1]}`;
  }
  return text(raw);
}

function istStamp(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")} IST`;
}

function asState(row: PreviewRow): ReportState {
  if (row.state === "needs_review") return "Needs decision";
  if (row.state === "unmatched" || row.state === "ambiguous") return "Can't match";
  if (row.state === "error") return "Failed";
  if (row.state === "skipped") return "Skipped";
  if (row.state === "no_change") return "No change";
  // A ready row that the user left unticked was not applied this time.
  if (!row.include) return "Skipped";
  return row.change === "new" ? "New" : "Updated";
}

/** Build the immutable rows once, immediately before Apply. */
export function buildReportRows(
  rows: readonly PreviewRow[],
  appliedBy: string,
  appliedAt: number,
): ReportRow[] {
  return rows.map((row) => ({
    rowNo: row.rowNo,
    state: asState(row),
    applicationNo: row.cleaned.applicationNo || "-",
    portalName: row.cleaned.portalFacilityRaw || row.cleaned.name || "-",
    matchedFacility: row.facilityName || "-",
    facilityType: row.facilityType || row.cleaned.facilityType || "-",
    phc: row.facilityPhc || "-",
    block: row.facilityBlock || "-",
    match: matchLabel(row),
    previousStatus: row.currentStatus || "-",
    newStatus: row.newStatus || "-",
    previousReport: previousReportLabel(row),
    newReport: nextReportLabel(row),
    previousPortalUpdate: shortDate(row.currentPortalUpdatedOn) || "-",
    newPortalUpdate: shortDate(row.cleaned.lastUpdate.date) || row.cleaned.lastUpdate.updatedBy || "-",
    application: applicationTypeLabel(row),
    mode: row.optional.assessmentMode || "-",
    notes: notesFor(row),
    appliedBy,
    appliedAt,
  }));
}

export type ReportCounts = Record<ReportState, number>;

export function reportCounts(rows: readonly ReportRow[]): ReportCounts {
  const counts: ReportCounts = {
    Updated: 0,
    New: 0,
    "No change": 0,
    "Needs decision": 0,
    "Can't match": 0,
    Skipped: 0,
    Failed: 0,
  };
  for (const row of rows) counts[row.state] += 1;
  return counts;
}

export function updatedReportRows(rows: readonly ReportRow[]): ReportRow[] {
  return rows.filter((row) => row.state === "Updated" || row.state === "New");
}

export function simpleReportRows(rows: readonly ReportRow[]): ReportRow[] {
  return rows.filter((row) => row.state !== "Updated" && row.state !== "New");
}

function simpleValues(row: ReportRow): string[] {
  return [
    text(row.rowNo),
    text(row.applicationNo),
    text(row.portalName),
    text(row.matchedFacility),
    text(row.facilityType),
    text(row.phc),
    text(row.block),
    text(row.match),
    text(row.previousStatus),
    text(row.newStatus),
    text(row.previousReport),
    text(row.newReport),
    ddmmyyyy(row.previousPortalUpdate),
    ddmmyyyy(row.newPortalUpdate),
    text(row.application),
    text(row.mode),
    text(row.appliedBy),
    text(row.notes),
  ];
}

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  row.eachCell((cell) => {
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFB6C4C1" } } };
  });
}

function addDataSheet(
  wb: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: readonly string[][],
  widths: number[],
): void {
  const ws = wb.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = widths.map((width) => ({ width }));
  const header = ws.addRow(headers);
  styleHeader(header);
  ws.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + headers.length)}1` };
  ws.pageSetup.printTitlesRow = "1:1";
  for (const values of rows) {
    const row = ws.addRow(values);
    row.alignment = { vertical: "top", wrapText: true };
  }
}

export async function buildImportReportWorkbook(input: ImportReportInput): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "NQAS Tracker";
  wb.created = input.generatedAt;

  const snapshot = input.reportRows ?? null;
  const counts = snapshot ? reportCounts(snapshot) : null;
  const totalRows = snapshot ? snapshot.length : (input.rowsTotal ?? 0);
  const updated = snapshot ? updatedReportRows(snapshot) : [];
  const noChange = snapshot?.filter((row) => row.state === "No change") ?? [];
  const needsDecision = snapshot?.filter((row) => row.state === "Needs decision" || row.state === "Can't match") ?? [];
  const skippedFailed = snapshot?.filter((row) => row.state === "Skipped" || row.state === "Failed") ?? [];

  /* ---- Summary ---- */
  const summary = wb.addWorksheet("Summary");
  summary.columns = [{ width: 36 }, { width: 68 }];
  const push = (label: string, value: string | number) => {
    const row = summary.addRow([label, text(value)]);
    row.getCell(1).font = { bold: true };
    row.alignment = { vertical: "top", wrapText: true };
  };
  const title = summary.addRow(["SaQsham document status import report"]);
  title.font = { bold: true, size: 14 };
  summary.mergeCells("A1:B1");
  push("File", input.fileName);
  push("Generated", istStamp(input.generatedAt.getTime()));
  push("Generated by", input.generatedBy || "-");
  push("Rows updated", counts ? counts.Updated + counts.New : input.summary.updated);
  push("No change", counts ? counts["No change"] : input.summary.noChange);
  push("New", counts ? counts.New : "-");
  push("Needs decision", counts ? counts["Needs decision"] : "-");
  push("Can't match", counts ? counts["Can't match"] : "-");
  push(
    "Needs decision & Unmatched",
    counts ? counts["Needs decision"] + counts["Can't match"] : "-",
  );
  push("Skipped", counts ? counts.Skipped : input.summary.skipped);
  push("Failed", counts ? counts.Failed : input.summary.failed);
  push("Skipped & Failed", counts ? counts.Skipped + counts.Failed : "-");
  push("Rows in this report", totalRows);

  if (!snapshot) {
    push("Detail not stored for this import", "The row-level report was introduced after this import was saved.");
  } else {
    const sheetCount = updated.length + noChange.length + needsDecision.length + skippedFailed.length;
    if (
      sheetCount !== totalRows ||
      counts!.Updated +
        counts!.New +
        counts!["No change"] +
        counts!["Needs decision"] +
        counts!["Can't match"] +
        counts!.Skipped +
        counts!.Failed !==
        totalRows
    ) {
      push(
        "Warning",
        `The state counts do not add up to ${totalRows} rows. The sheets contain ${sheetCount} rows.`,
      );
    }
  }

  if (snapshot) {
    /* ---- Applied rows: Updated + New ---- */
    addDataSheet(
      wb,
      "Updated",
      UPDATED_HEADERS,
      updated.map((row) => [
        text(row.rowNo),
        text(row.applicationNo),
        text(row.portalName),
        text(row.matchedFacility),
        text(row.facilityType),
        text(row.phc),
        text(row.block),
        text(row.match),
        text(row.previousStatus),
        text(row.newStatus),
        text(row.previousReport),
        text(row.newReport),
        ddmmyyyy(row.previousPortalUpdate),
        ddmmyyyy(row.newPortalUpdate),
        text(row.application),
        text(row.mode),
        text(row.appliedBy),
        istStamp(row.appliedAt),
      ]),
      UPDATED_WIDTHS,
    );

    addDataSheet(wb, "No change", SIMPLE_HEADERS, noChange.map(simpleValues), SIMPLE_WIDTHS);
    addDataSheet(wb, "Needs decision & Unmatched", SIMPLE_HEADERS, needsDecision.map(simpleValues), SIMPLE_WIDTHS);
    addDataSheet(wb, "Skipped & Failed", SIMPLE_HEADERS, skippedFailed.map(simpleValues), SIMPLE_WIDTHS);
  }

  /* ---- Status mapping used ---- */
  if (snapshot || input.statusMap.length > 0) {
    const map = wb.addWorksheet("Status mapping used");
    map.columns = [{ width: 70 }, { width: 34 }];
    const mapHeader = map.addRow(["SaQsham Documents Status (portal)", "Documents Status (Report)"]);
    styleHeader(mapHeader);
    map.views = [{ state: "frozen", ySplit: 1 }];
    map.autoFilter = { from: "A1", to: "B1" };
    for (const entry of input.statusMap) {
      map.addRow([text(entry.portal), text(entry.report)]);
    }
  }

  return wb;
}

/** Write + download the workbook in the browser. */
export async function downloadImportReport(input: ImportReportInput): Promise<void> {
  const wb = await buildImportReportWorkbook(input);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `saqsham-import-report-${input.generatedAt.toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
