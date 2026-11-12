/**
 * LINE LIST EXPORT — the line-list side of the ONE export engine.
 *
 * Nothing is written here that masterExport does not already write: the same
 * ExcelJS workbook (cover/summary sheet, frozen header + frozen first two
 * columns, AutoFilter, config widths, real date/₹ types, zebra rows, print
 * setup), the same jsPDF page-sets (repeated header, rows never split, wide
 * lists split by group with the frozen columns repeated) and the same CSV
 * writer (UTF-8 BOM, "-" for a blank). The only line-list-specific decision is
 * the FILE NAME and the dialog's plan.
 *
 * File name (brief §1.5.5): "{District} {Topic} Line List {DD-MM-YYYY}"
 * → "Tirupathur Fire NOC Line List 27-10-2026.xlsx", plus " - {Block}" when a
 * single block is in scope. UTF-8 safe, no Drive id, no token.
 */

import {
  toDdMmmYyyy,
  type MasterColumn,
  type MasterRow,
} from "@/lib/masterColumns";
import {
  exportLineListPdf,
  exportMasterCsv,
  exportMasterWorkbook,
  type MasterExportOptions,
  type PdfPaper,
} from "@/lib/masterExport";
import { openMasterPrint } from "@/lib/masterReportPrint";

export type LineListExportFormat = "xlsx" | "pdf" | "csv" | "print";

export type LineListExportPlan = {
  format: LineListExportFormat;
  /** All rows in the list, or only the ticked ones. */
  scope: "all" | "selected";
  includeSummary: boolean;
  /** Included in the PDF's header block and the Excel summary sheet. */
  includeDefinitions: boolean;
  paper: PdfPaper;
  orientation: "landscape" | "portrait";
  groupPageBreaks: boolean;
};

export const DEFAULT_LINE_LIST_EXPORT: LineListExportPlan = {
  format: "xlsx",
  scope: "all",
  includeSummary: true,
  includeDefinitions: true,
  paper: "a4",
  orientation: "landscape",
  groupPageBreaks: true,
};

/** Sanitise a user/file-name segment: no path separators, no control chars. */
export function safeFileNamePart(value: string): string {
  return value
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * `{District} {Topic} Line List {DD-MM-YYYY}` (+ ` - {Block}` for one block).
 * `date` is DD-MMM-YYYY already (the brief's stamp); no time, IST calendar day.
 */
export function lineListFileBase(input: {
  district: string;
  topic: string;
  date: string;
  singleBlock?: string | null;
}): string {
  const district = safeFileNamePart(input.district) || "District";
  const topic = safeFileNamePart(input.topic) || "Facilities";
  const block = input.singleBlock ? safeFileNamePart(input.singleBlock) : "";
  return `${district} ${topic} Line List ${input.date}${block ? ` - ${block}` : ""}`;
}

export function lineListFileBaseForToday(input: {
  district: string;
  topic: string;
  singleBlock?: string | null;
  today?: string;
}): string {
  return lineListFileBase({
    district: input.district,
    topic: input.topic,
    date: toDdMmmYyyy(input.today ?? new Date().toISOString().slice(0, 10)),
    singleBlock: input.singleBlock,
  });
}

/** The export engine's options for a line list (one object, every format). */
export function lineListExportOptions(input: {
  rows: MasterRow[];
  columns: MasterColumn[];
  labels: Record<string, string>;
  topic: string;
  filtersText: string;
  generatedBy: string;
  district: string;
  singleBlock?: string | null;
  includeSummary: boolean;
  totalRows?: number;
}): MasterExportOptions & { skipSummary?: boolean } {
  return {
    rows: input.rows,
    totalRows: input.totalRows ?? input.rows.length,
    columns: input.columns,
    labels: input.labels,
    filtersText: input.filtersText,
    generatedBy: input.generatedBy,
    title: `${input.topic} line list`,
    fileNameBase: lineListFileBaseForToday({
      district: input.district,
      topic: input.topic,
      singleBlock: input.singleBlock,
    }),
    frozenDataColumns: Math.min(2, input.columns.length),
    frozenKeys: ["facility", "type"],
    // The brief's dialog toggle: off = the workbook gets the list only.
    skipSummary: !input.includeSummary,
  };
}

export type LineListExportResult = { fileName: string; rows: number };

/**
 * Run one export. Small lists (a few hundred rows) render synchronously in well
 * under the 3 s budget; the caller keeps the button busy and shows a toast.
 * Every call is logged by the CALLER (audit/export log) with who/what/filters.
 */
export async function runLineListExport(input: {
  plan: LineListExportPlan;
  rows: MasterRow[];
  columns: MasterColumn[];
  labels: Record<string, string>;
  topic: string;
  filtersText: string;
  generatedBy: string;
  district: string;
  singleBlock?: string | null;
  totalRows?: number;
  saveBlob: (data: ArrayBuffer, fileName: string) => void;
  saveBlobRaw: (blob: Blob, fileName: string) => void;
}): Promise<LineListExportResult> {
  const opts = lineListExportOptions({
    rows: input.rows,
    columns: input.columns,
    labels: input.labels,
    topic: input.topic,
    filtersText: input.filtersText,
    generatedBy: input.generatedBy,
    district: input.district,
    singleBlock: input.singleBlock,
    includeSummary: input.plan.includeSummary,
    totalRows: input.totalRows,
  });

  switch (input.plan.format) {
    case "xlsx":
      await exportMasterWorkbook(opts, input.saveBlob);
      break;
    case "pdf":
      // Data-built A4 landscape: fixed widths, repeated header, no split rows.
      await exportLineListPdf(opts, input.saveBlobRaw);
      break;
    case "csv":
      exportMasterCsv(opts, input.saveBlobRaw);
      break;
    case "print":
      openMasterPrint({
        rows: opts.rows,
        columns: opts.columns,
        labels: opts.labels,
        subtitle: [
          opts.filtersText || "No filters",
          `${opts.rows.length} of ${opts.totalRows ?? opts.rows.length} facilities`,
          input.plan.includeSummary ? "summary included" : "list only",
        ].join(" · "),
      });
      break;
  }

  return {
    fileName: `${opts.fileNameBase}.${input.plan.format === "print" ? "pdf" : input.plan.format}`,
    rows: opts.rows.length,
  };
}
