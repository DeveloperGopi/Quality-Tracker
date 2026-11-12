/**
 * MASTER EXPORT — one engine, three outputs (Excel, PDF, CSV), all driven by
 * the SAME column config the table renders with (lib/masterColumns). A column
 * cannot fall out of sync: the screen, the workbook and the printed PDF all
 * read `MASTER_COLUMNS` / `cellValue` / `cellText`.
 *
 * Excel  : ExcelJS — a real styled workbook (never CSV-in-a-tin): two-row
 *          merged group header, frozen panes + autofilter, per-type widths,
 *          real date/number types with Indian formats, hyperlinks, zebra
 *          banding, conditional formatting for scores, print setup with the
 *          header rows repeating and "Page &P of &N" in the footer.
 * PDF    : jsPDF + autoTable — 54 columns cannot fit on one page, so the
 *          report is auto-split into GROUP SECTIONS. Every section repeats the
 *          identity columns on the left, then one or two groups that fit the
 *          page width, with a "Section N – …" title above the table. Rows are
 *          never split across pages, the table header repeats, and the report
 *          header/footer carry the department, filters and confidentiality note.
 * CSV    : UTF-8 with BOM so Excel opens Tamil text and ₹ correctly.
 *
 * UNICODE NOTE: jsPDF's built-in fonts have no glyphs for ₹ ▲ ▼ or Tamil, so
 * `pdfText()` substitutes print-safe characters (Rs. / + / -) unless a Unicode
 * TTF is registered with `setMasterPdfFontBase64()`. Excel and CSV are real
 * Unicode and never need the substitution.
 */

// Type-only import: ExcelJS's static types without the runtime module
// (heavy-library discipline — the module itself loads on first Excel export).
import type { Workbook as ExcelWorkbook, Fill as ExcelFill, Borders as ExcelBorders } from "exceljs";
namespace Shims {}


import {
  EXPIRY_WARN_DAYS,
  GROUP_BY_ID,
  TONE_BG,
  TONE_HEX,
  cellText,
  cellValue,
  daysUntil,
  dueState,
  scoreTone,
  statusTone,
  type MasterColumn,
  type MasterRow,
} from "@/lib/masterColumns";
import type { RecentMarker } from "@/lib/recentUpdates";
import { ORG_SIGNATURE } from "@/lib/org";
import { buildFacilitySheet, exportFacilitySheet, type SheetOptions } from "@/lib/facilitySheet";

/** Light amber fill for "Mark recently updated cells" (Part C ⑦). */
const recentFill: ExcelFill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFF3D0" },
};

/* --------------------------------------------------------------------------- */
/* Options                                                                     */
/* --------------------------------------------------------------------------- */

export type PdfPaper = "a4" | "a3" | "legal";

export type MasterExportOptions = {
  rows: MasterRow[];
  /** Visible + exportable columns, in the order the user arranged. */
  columns: MasterColumn[];
  /** key → display label (Admin Settings → Table headers renames applied). */
  labels: Record<string, string>;
  /** Human sentence describing the filters that produced these rows. */
  filtersText: string;
  /** All facilities before filters, for the PDF scope line ("42 of 157"). */
  totalRows?: number;
  generatedBy: string;
  department?: string;
  title?: string;
  fileNameBase?: string;
  /** Excel freeze panes: number of FROZEN data columns (Part D ③.8). The
   *  header rows (2) stay frozen vertically; when omitted the old 2 is kept. */
  frozenDataColumns?: number;
  /** Part C ⑦: facilityId → (column key → marker). When given, marked cells
   *  get a light fill and the Summary sheet carries the legend line. */
  recentMarks?: Record<string, Record<string, RecentMarker>>;
  /** Legend line for the marks ("Highlighted = updated in the last 1 day"). */
  recentLegend?: string;
  /** PDF page-sets start with these frozen keys (Part D ⑧). */
  frozenKeys?: string[];
  /** Extra one-purpose sheets / sections. */
  extras?: { surveillanceDue?: boolean; fireNocAlerts?: boolean; gapClosure?: boolean };
  /** Line lists: "include summary" off → the workbook holds the list only. */
  skipSummary?: boolean;
};

/** Department line on every Excel/CSV cover — the ONE organisation name. */
export const DEPARTMENT_DEFAULT = ORG_SIGNATURE;

const stamp = () => new Date().toISOString().slice(0, 10);
const fileBase = (o: MasterExportOptions) =>
  o.fileNameBase ?? `facility-master-list-${stamp()}`;

/** Excel number formats (asserted by the export tests). */
export const FMT = {
  date: "dd-mmm-yyyy",
  // Matches SCORE_DECIMALS (2) — see lib/masterColumns: one score format in
  // the grid, on the screen and in every export.
  percent: '0.00"%"',
  amount: "[>=10000000]##\\,##\\,##\\,##0;[>=100000]##\\,##\\,##0;##,##0",
  text: "@",
} as const;

/* --------------------------------------------------------------------------- */
/* Unicode helpers (PDF only)                                                  */
/* --------------------------------------------------------------------------- */

let masterPdfFont: { family: string; base64: string } | null = null;

/** Register a Unicode TTF (base64) for the PDF reports — e.g. Noto Sans
 *  Tamil — so ₹, ▲/▼ and Tamil text print as designed. */
export function setMasterPdfFontBase64(b64: string, family = "NotoSans") {
  masterPdfFont = { family, base64: b64 };
}
export const hasUnicodeFont = () => masterPdfFont !== null;

/** Replace glyphs jsPDF's standard fonts cannot draw; passes text through
 *  untouched once a Unicode font is registered. */
export function pdfText(value: string): string {
  if (masterPdfFont) return value;
  return value
    .split("₹").join("Rs.")
    .split("▲").join("+")
    .split("▼").join("-")
    .split("■").join("=");
}

/* --------------------------------------------------------------------------- */
/* Pure helpers (unit-tested)                                                  */
/* --------------------------------------------------------------------------- */

export type PdfSection = { index: number; title: string; columns: MasterColumn[] };

/** Usable table width per paper, in the config's width units (1 unit ≈ 8px). */
const PAPER_BUDGET: Record<PdfPaper, number> = { a4: 300, a3: 430, legal: 270 };

const widthOf = (cols: MasterColumn[]) => cols.reduce((n, c) => n + c.width, 0);

/**
 * Split the visible columns into page-set sections.
 *
 * Every section starts with the frozen columns (Part D: pinned data columns
 * repeat first on every page-set), then consecutive groups. With `splitByGroup` ON (the default) a new group starts a new
 * page-set — so each printed table is one coherent subject; a group that is
 * wider than the page is split across two page-sets instead of being cut off.
 * With it OFF, groups are packed until the page width budget is reached.
 */
export function pdfSections(
  columns: MasterColumn[],
  paper: PdfPaper = "a4",
  splitByGroup = true,
  /** Frozen data keys repeated at the start of every page-set (Part D). */
  pinnedKeys: string[] = ["facility", "type"],
): PdfSection[] {
  const identity = columns.filter(
    (c) => c.group === "identity" || pinnedKeys.includes(c.key),
  );
  const rest = columns.filter((c) => !identity.includes(c));
  const budget = PAPER_BUDGET[paper];
  const idWidth = widthOf(identity);
  const out: PdfSection[] = [];

  let chunk: MasterColumn[] = [];
  let chunkWidth = 0;
  let chunkGroup: string | null = null;

  const flush = () => {
    if (chunk.length === 0) return;
    const groups = [...new Set(chunk.map((c) => GROUP_BY_ID[c.group].label))];
    out.push({
      index: out.length + 1,
      title: `Section ${out.length + 1} – ${groups.join(" · ")}`,
      columns: [...identity, ...chunk],
    });
    chunk = [];
    chunkWidth = 0;
    chunkGroup = null;
  };

  if (rest.length === 0) {
    return [
      { index: 1, title: "Section 1 – Identity", columns: identity },
    ];
  }

  for (const c of rest) {
    const groupChanged = chunkGroup !== null && chunkGroup !== c.group;
    const tooWide = idWidth + chunkWidth + c.width > budget;
    if (chunk.length > 0 && ((splitByGroup && groupChanged) || tooWide)) flush();
    chunk.push(c);
    chunkWidth += c.width;
    chunkGroup = c.group;
  }
  flush();

  // Every column must land in exactly one section.
  const covered = out.reduce((n, s) => n + (s.columns.length - identity.length), 0);
  if (covered !== rest.length) {
    out[0] = {
      index: 1,
      title: "Section 1 – Identity",
      columns: [...identity, ...rest],
    };
    return [out[0]];
  }
  return out;
}

/** One exported row per cell, as display text (used by the workbook + CSV). */
export function exportBody(rows: MasterRow[], columns: MasterColumn[]): string[][] {
  return rows.map((r) => columns.map((c) => cellText(r, c.key)));
}

/* --------------------------------------------------------------------------- */
/* Excel                                                                       */
/* --------------------------------------------------------------------------- */

/** Build the workbook in memory (testable headlessly — the caller decides how
 *  to hand the buffer to the browser). */
export async function buildMasterWorkbook(
  o: MasterExportOptions,
): Promise<ExcelWorkbook> {
  // Heavy-library discipline (perf brief 3.4): exceljs loads on the first
  // Excel export click, never in the initial bundle.
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "NQAS Tracker";
  wb.created = new Date();

  const columns = o.columns.filter((c) => c.exportable && c.type !== "action");
  const department = o.department ?? DEPARTMENT_DEFAULT;
  const title = o.title ?? "Facility Master List";

  /* ---------- Sheet 1: Summary (skippable for a list-only line list) ------ */
  const summary = o.skipSummary
    ? null
    : wb.addWorksheet("Summary", {
        properties: { tabColor: { argb: "FF0F6B63" } },
      });
  if (summary) {
  summary.columns = [{ width: 38 }, { width: 64 }];
  const summaryRows: [string, string][] = [
    [title, ""],
    ["Department", department],
    ["Facilities in this export", String(o.rows.length)],
    ["Columns in this export", String(columns.length)],
    ["Applied filters", o.filtersText || "None — all facilities"],
    // Part C ⑦ — the legend line that explains the amber fill (no extra col).
    ...(o.recentMarks && o.recentLegend
      ? ([[
          String(o.recentLegend),
          "— marked with the light amber fill",
        ]] as [string, string][])
      : []),
    ["Generated", new Date().toLocaleString("en-GB")],
    ["Generated by", o.generatedBy || "—"],
    ...kpiLines(o.rows),
  ];
  summaryRows.forEach((pair, i) => {
    const row = summary.addRow(pair);
    if (i === 0) {
      row.getCell(1).font = { bold: true, size: 16, color: { argb: "FF0F3A38" } };
    } else {
      row.getCell(1).font = { bold: true, color: { argb: "FF334155" } };
      row.getCell(2).alignment = { wrapText: true, vertical: "middle" };
      row.getCell(2).font = { color: { argb: "FF0F172A" } };
    }
  });
  }

  /* ---------- Sheet 2: Facility Master ---------- */
  const ws = wb.addWorksheet("Facility Master", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      printTitlesRow: "1:2",
    },
  });

  // Row 1 — merged group band. Row 2 — column names.
  const bands = consecutiveGroups(columns);
  let col = 1;
  for (const band of bands) {
    const start = col;
    const end = col + band.columns.length - 1;
    ws.mergeCells(1, start, 1, end);
    const fill: ExcelFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: argb(GROUP_BY_ID[band.group].tint.hex) },
    };
    for (let c = start; c <= end; c++) {
      const sub = ws.getCell(1, c);
      sub.fill = fill;
      sub.border = thinBorder;
      sub.alignment = { horizontal: "center", vertical: "middle" };
    }
    const head = ws.getCell(1, start);
    head.value = GROUP_BY_ID[band.group].label;
    head.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    col = end + 1;
  }
  ws.getRow(1).height = 20;

  const scoreColumns = new Set<number>();
  columns.forEach((c, i) => {
    const cell = ws.getCell(2, i + 1);
    cell.value = o.labels[c.key] ?? c.label;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: argb(GROUP_BY_ID[c.group].tint.hex) },
    };
    cell.alignment = { horizontal: c.align, vertical: "middle", wrapText: true };
    cell.border = thinBorder;
    ws.getColumn(i + 1).width = widthFor(c); // explicit width per column type
  });
  ws.getRow(2).height = 34;

  o.rows.forEach((r, rIdx) => {
    const excelRow = ws.addRow([]);
    const zebra: ExcelFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    };
    columns.forEach((c, i) => {
      const cell = excelRow.getCell(i + 1);
      const v = cellValue(r, c.key);
      let solidFill = false;
      switch (v.kind) {
        case "score": {
          cell.value = v.value;
          cell.numFmt = FMT.percent;
          cell.alignment = { horizontal: "right", vertical: "middle" };
          scoreColumns.add(i + 1);
          const tone = scoreTone(v.value);
          if (tone) cell.font = { color: { argb: argb(TONE_HEX[tone]) }, bold: true };
          break;
        }
        case "currency": {
          cell.value = v.value;
          cell.numFmt = FMT.amount;
          cell.alignment = { horizontal: "right", vertical: "middle" };
          break;
        }
        case "date": {
          const d = toDate(v.value);
          if (d) {
            cell.value = d;
            cell.numFmt = FMT.date;
          } else cell.value = "-";
          cell.alignment = { horizontal: "center", vertical: "middle" };
          break;
        }
        case "dueDate": {
          if (v.value) {
            const d = toDate(v.value);
            if (d) {
              cell.value = d;
              cell.numFmt = FMT.date;
            } else cell.value = String(v.value);
            const st = dueState(daysUntil(v.value));
            if (st === "overdue" || st === "soon") {
              cell.font = {
                bold: true,
                color: { argb: argb(st === "overdue" ? "#be123c" : "#b45309") },
              };
            }
          } else {
            cell.value = "-";
            cell.font = { color: { argb: "FF94A3B8" } };
          }
          cell.alignment = { horizontal: "center", vertical: "middle" };
          break;
        }
        case "status": {
          cell.value = v.value || "-";
          const tone = statusTone(v.value);
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: argb(TONE_BG[tone]) },
          };
          solidFill = true;
          cell.font = { color: { argb: argb(TONE_HEX[tone]) }, bold: true, size: 10 };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          break;
        }
        case "compare": {
          cell.value = cellText(r, c.key) || "-";
          cell.alignment = { horizontal: "center", vertical: "middle" };
          break;
        }
        case "docStatus": {
          const text =
            v.uploadedAt != null
              ? `Uploaded ${cellText(r, c.key).replace(/^Uploaded /, "")}`
              : "Not uploaded";
          const base = typeof window !== "undefined" ? window.location.origin : "";
          cell.value = {
            text,
            hyperlink: `${base}/facilities/${String(r.facility._id)}?docs=${encodeURIComponent(c.key)}`,
          };
          cell.font = v.uploaded
            ? { color: { argb: "FF0F6B63" }, underline: true }
            : { color: { argb: "FF94A3B8" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          break;
        }
        case "link": {
          if (v.url) {
            cell.value = { text: "Open", hyperlink: v.url };
            cell.font = { color: { argb: "FF0F6B63" }, underline: true };
          } else if (v.name) {
            cell.value = v.name;
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else {
            cell.value = "-";
            cell.font = { color: { argb: "FF94A3B8" } };
          }
          cell.alignment = { horizontal: "center", vertical: "middle" };
          break;
        }
        case "text": {
          cell.value = v.value;
          cell.alignment = {
            horizontal: c.align === "right" ? "right" : c.align === "center" ? "center" : "left",
            vertical: "middle",
            wrapText: c.type === "longtext" || c.key === "genDoc",
          };
          if (c.key === "nin") cell.numFmt = FMT.text; // keep leading zeros
          break;
        }
        default: {
          cell.value = "-";
          cell.alignment = { horizontal: c.align, vertical: "middle" };
          cell.font = { color: { argb: "FF94A3B8" } };
        }
      }
      cell.border = thinBorder;
      // "Mark recently updated cells" (optional, default OFF): light fill on
      // the marked cells — the legend line in the header explains it.
      if (!solidFill && o.recentMarks?.[String(r.facility._id)]?.[c.key])
        cell.fill = recentFill;
      else if (rIdx % 2 === 1 && !solidFill) cell.fill = zebra;
    });
    excelRow.height = 18;
  });

  // Autofilter over the header row, frozen panes: 2 header rows + the frozen
  // data columns the Admin setting froze (default 2 = Facility + Type).
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: columns.length } };
  ws.views = [{ state: "frozen", xSplit: o.frozenDataColumns ?? 2, ySplit: 2 }];
  ws.headerFooter = {
    oddFooter: `&8&L${department} — NQAS Tracker&RPage &P of &N`,
  };

  // Real conditional formatting on the score columns — the same thresholds the
  // screen uses (>=70 green, 50–69 amber, <50 red).
  for (const c of scoreColumns) {
    ws.addConditionalFormatting({
      ref: `${colRef(c)}3:${colRef(c)}${o.rows.length + 2}`,
      rules: [
        {
          type: "cellIs",
          operator: "between",
          formulae: [70, 9999],
          priority: 1,
          style: { font: { color: { argb: "FF047857" }, bold: true } },
        },
        {
          type: "cellIs",
          operator: "between",
          formulae: [50, 69.99],
          priority: 2,
          style: { font: { color: { argb: "FFB45309" }, bold: true } },
        },
        {
          type: "cellIs",
          operator: "lessThan",
          formulae: [50],
          priority: 3,
          style: { font: { color: { argb: "FFBE123C" }, bold: true } },
        },
      ],
    });
  }

  /* ---------- Optional extra sheets ---------- */
  if (o.extras?.surveillanceDue) addAlertSheet(wb, o, "Surveillance Due", "surveillance");
  if (o.extras?.fireNocAlerts) addAlertSheet(wb, o, "Fire NOC Alerts", "noc");
  if (o.extras?.gapClosure) addAlertSheet(wb, o, "Gap Closure", "funds");

  return wb;
}

/** Build + hand the .xlsx buffer to the caller. */
export async function exportMasterWorkbook(
  o: MasterExportOptions,
  save: (buf: ArrayBuffer, fileName: string) => void,
) {
  const wb = await buildMasterWorkbook(o);
  const buf = await wb.xlsx.writeBuffer();
  save(buf as ArrayBuffer, `${fileBase(o)}.xlsx`);
}

/* --------------------------------------------------------------------------- */
/* CSV (UTF-8 + BOM so Tamil and ₹ open correctly in Excel)                    */
/* --------------------------------------------------------------------------- */

export function buildMasterCsv(o: MasterExportOptions): string {
  const columns = o.columns.filter((c) => c.exportable && c.type !== "action");
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.split('"').join('""')}"` : v);
  const head = columns.map((c) => escape(o.labels[c.key] ?? c.label)).join(",");
  const body = exportBody(o.rows, columns)
    .map((r) => r.map(escape).join(","))
    .join("\r\n");
  // The leading U+FEFF BOM is what makes Excel open Tamil text and ₹ correctly.
  return `\uFEFF${head}\r\n${body}\r\n`;
}

export function exportMasterCsv(
  o: MasterExportOptions,
  save: (blob: Blob, fileName: string) => void,
) {
  save(new Blob([buildMasterCsv(o)], { type: "text/csv;charset=utf-8" }), `${fileBase(o)}.csv`);
}

/* --------------------------------------------------------------------------- */
/* PDF                                                                         */
/* --------------------------------------------------------------------------- */

/** jsPDF's instance shape without pulling the runtime module
 *  (heavy-library discipline — jspdf loads on the first PDF export). */
type JSPDF = InstanceType<typeof import("jspdf")["jsPDF"]>;

export type PdfMeta = {
  paper?: PdfPaper;
  orientation?: "landscape" | "portrait";
  splitByGroup?: boolean;
};

export async function buildMasterPdf(o: MasterExportOptions, meta: PdfMeta = {}): Promise<JSPDF> {
  // Heavy-library discipline (perf brief 3.4): jsPDF is fetched on the user's
  // first PDF click, never in the initial bundle.
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;
  const paper = meta.paper ?? "a4";
  const orientation = meta.orientation ?? "landscape";
  const columns = o.columns.filter((c) => c.exportable && c.type !== "action");
  // Part D ⑧: the PDF page-sets repeat the frozen data columns first.
  const pdfExportOptions = o as MasterExportOptions & { frozenKeys?: string[] };
  const frozenKeys = pdfExportOptions.frozenKeys ?? ["facility", "type"];
  const sections = pdfSections(columns, paper, meta.splitByGroup ?? true, frozenKeys);
  const department = o.department ?? DEPARTMENT_DEFAULT;
  const title = o.title ?? "Facility Master List";

  const doc = new jsPDF({ orientation, unit: "mm", format: paper });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  /** Report header, redrawn at the top of every page-set. */
  const header = () => {
    doc.setFillColor(15, 107, 99);
    doc.rect(0, 0, pageW, 17, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(pdfText(`NQAS Tracker – ${title}`), 10, 7.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      pdfText(
        `${department} · ${o.rows.length} facilities · filters: ${o.filtersText || "none"}`,
      ),
      10,
      13,
    );
    doc.text(
      pdfText(`Generated ${new Date().toLocaleString("en-GB")} · ${o.generatedBy || "—"}`),
      pageW - 10,
      7.5,
      { align: "right" },
    );
  };

  header();
  let isFirst = true;
  for (const section of sections) {
    if (!isFirst) {
      doc.addPage();
      header();
    }
    isFirst = false;

    doc.setTextColor(15, 58, 56);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(pdfText(section.title), 10, 23);

    autoTable(doc, {
      head: [section.columns.map((c) => pdfText(o.labels[c.key] ?? c.label))],
      body: o.rows.map((r) =>
        section.columns.map((c) => pdfText(cellText(r, c.key) || "-")),
      ),
      startY: 26,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 6.4,
        cellPadding: 1.2,
        overflow: "linebreak",
        lineColor: [203, 213, 225],
        lineWidth: 0.1,
        textColor: [15, 23, 42],
        valign: "middle",
      },
      headStyles: {
        fillColor: [15, 107, 99],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        overflow: "linebreak",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: columnStylesFor(section.columns),
      margin: { left: 10, right: 10, top: 21, bottom: 14 },
      // "wrap" sizes the columns to the printable width and wraps the text —
      // so a table never overflows the page, never gets cut, and every cell is
      // printed in full (row height grows instead of text being truncated).
      tableWidth: "wrap",
      // autoTable moves an overflowing row to the next page as a whole, so a
      // row is never cut in half; combined with `overflow: linebreak` no cell
      // text is ever truncated.
      pageBreak: "auto",
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const col = section.columns[data.column.index];
        const row = o.rows[data.row.index];
        if (!col || !row) return;
        const v = cellValue(row, col.key);
        if (v.kind === "status") {
          const tone = statusTone(v.value);
          data.cell.styles.fillColor = hexToRgb(TONE_BG[tone]);
          data.cell.styles.textColor = hexToRgb(TONE_HEX[tone]);
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.halign = "center";
        } else if (v.kind === "compare" || v.kind === "date" || v.kind === "dueDate") {
          data.cell.styles.halign = "center";
        } else if (v.kind === "currency" || v.kind === "score") {
          data.cell.styles.halign = "right";
        }
      },
    });
  }

  // Footers — stamped after the page count is known: "Page X of Y" + the
  // confidentiality note, on every page.
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      pdfText(`Page ${p} of ${total} · Confidential — authorised State/District health staff only`),
      10,
      pageH - 6,
    );
    doc.text(pdfText(`Generated by ${o.generatedBy || "NQAS Tracker"}`), pageW - 10, pageH - 6, {
      align: "right",
    });
  }
  return doc;
}

/** Fixed percentage widths for a data-built line-list PDF. The returned mm
 *  values always sum to the printable width, so the last column can never be
 *  pushed off the paper. */
export function lineListPdfWidths(
  columns: MasterColumn[],
  printableWidth: number,
): number[] {
  const weight = (c: MasterColumn): number => {
    if (c.key === "facility") return 2.5;
    if (c.key === "remarks") return 2.8;
    if (c.key === "genDoc") return 2.4;
    if (c.type === "longtext") return 2.2;
    if (c.key === "block" || c.key === "phc") return 1.35;
    if (c.type === "status") return 1.25;
    if (c.type === "date" || c.type === "dueDate") return 1.1;
    if (c.type === "score" || c.type === "compare") return 0.85;
    if (c.type === "currency") return 1.1;
    if (c.type === "link") return 0.95;
    return 1;
  };
  const weights = columns.map(weight);
  const total = weights.reduce((sum, w) => sum + w, 0) || 1;
  const widths: number[] = [];
  let used = 0;
  columns.forEach((_, index) => {
    if (index === columns.length - 1) {
      widths.push(Math.max(1, Math.round((printableWidth - used) * 100) / 100));
      return;
    }
    const mm = Math.round(((printableWidth * weights[index]) / total) * 100) / 100;
    widths.push(mm);
    used += mm;
  });
  return widths;
}

/** DD-MMM-YYYY in IST (never the browser's local day). */
function istStamp(date = new Date()): string {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(ist.getUTCDate()).padStart(2, "0")}-${months[ist.getUTCMonth()]}-${ist.getUTCFullYear()}`;
}

/**
 * REPORT LINE-LIST PDF — built from the rows, never a screen copy.
 *
 * A4 landscape, 10 mm margins, one table at one page width. Every header row
 * repeats, a row never splits, Remarks wraps in its own fixed-width cell, and
 * the footer is stamped "Page X of Y" after the page count is known. The
 * Facility column prints only the facility name (Block/Type/NIN have their
 * own columns).
 */
export async function buildLineListPdf(
  o: MasterExportOptions,
): Promise<JSPDF> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;
  const columns = o.columns.filter((c) => c.exportable && c.type !== "action");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const printable = pageW - margin * 2;
  const widths = lineListPdfWidths(columns, printable);
  const fontSize = columns.length > 9 ? 8 : 9;
  const title = o.title ?? "Line list";
  const scope = `${o.rows.length} of ${o.totalRows ?? o.rows.length} facilities`;
  const date = `${istStamp()} (IST)`;

  // Page 1 heading only. Later pages start with the repeated table header.
  doc.setTextColor(15, 58, 56);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(pdfText(title), margin, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(pdfText(scope), margin, 20);
  let filtersBottom = 20;
  if (o.filtersText) {
    const filterLines = doc.splitTextToSize(
      pdfText(`Filters: ${o.filtersText}`),
      printable - 55,
    ) as string[];
    doc.text(filterLines, margin, 25);
    filtersBottom = 25 + Math.max(0, filterLines.length - 1) * 4;
  }
  doc.text(pdfText(date), pageW - margin, 20, { align: "right" });

  const body = o.rows.map((row) =>
    columns.map((c) => {
      if (c.key === "facility") return pdfText(row.facility.name?.trim() || "-");
      const value = cellText(row, c.key);
      return pdfText(value?.trim() ? value : "-");
    }),
  );

  const columnStyles = Object.fromEntries(
    columns.map((c, index) => [
      index,
      {
        cellWidth: widths[index],
        halign: c.key === "facility" || c.key === "remarks" ? "left" : c.align,
        overflow: "linebreak" as const,
      },
    ]),
  );

  autoTable(doc, {
    head: [columns.map((c) => pdfText(o.labels[c.key] ?? c.label))],
    body,
    startY: Math.max(29, filtersBottom + 4),
    theme: "grid",
    tableWidth: printable,
    margin: { left: margin, right: margin, top: margin, bottom: 16 },
    styles: {
      font: "helvetica",
      fontSize,
      cellPadding: 1.6,
      overflow: "linebreak",
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
      textColor: [15, 23, 42],
      valign: "top",
      minCellHeight: 6,
    },
    headStyles: {
      fillColor: [226, 242, 239],
      textColor: [15, 58, 56],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      overflow: "linebreak",
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
    },
    alternateRowStyles: { fillColor: [250, 252, 252] },
    columnStyles,
    showHead: "everyPage",
    pageBreak: "auto",
    rowPageBreak: "avoid",
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const col = columns[data.column.index];
      if (!col) return;
      if (col.key === "remarks") data.cell.styles.halign = "left";
    },
  });

  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${page} of ${total}`, margin, pageH - 6);
    doc.text(pdfText(title), pageW - margin, pageH - 6, { align: "right" });
  }
  return doc;
}

export async function exportLineListPdf(
  o: MasterExportOptions,
  save?: (blob: Blob, fileName: string) => void,
) {
  const doc = await buildLineListPdf(o);
  const name = `${fileBase(o)}.pdf`;
  if (save) save(doc.output("blob") as Blob, name);
  else doc.save(name);
}

export async function exportMasterPdf(
  o: MasterExportOptions,
  meta: PdfMeta = {},
  save?: (blob: Blob, fileName: string) => void,
) {
  // Heavy-library discipline (perf brief 3.4): jsPDF + autoTable load on the
  // user's first PDF click, never in the initial bundle.
  const doc = await buildMasterPdf(o, meta);
  const name = `${fileBase(o)}.pdf`;
  if (save) save(doc.output("blob") as Blob, name);
  else doc.save(name);
}

/* --------------------------------------------------------------------------- */
/* Management summary (KPIs + overdue list, portrait, 1 page)                   */
/* --------------------------------------------------------------------------- */

export async function buildManagementSummaryPdf(
  o: MasterExportOptions,
  overdue: { facility: string; block: string; reason: string; days: number }[],
): Promise<unknown> {
  // Same lazy load as buildMasterPdf — first PDF click pays the bytes.
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;
  const department = o.department ?? DEPARTMENT_DEFAULT;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 107, 99);
  doc.rect(0, 0, pageW, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(pdfText("NQAS Tracker – Management Summary"), 12, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(pdfText(department), 12, 19);
  doc.text(pdfText(new Date().toLocaleString("en-GB")), pageW - 12, 12, { align: "right" });

  autoTable(doc, {
    startY: 32,
    head: [["Indicator", "Count"]],
    body: kpiLines(o.rows).map(([k, v]) => [pdfText(k), pdfText(String(v))]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [15, 107, 99], textColor: [255, 255, 255], fontStyle: "bold" },
    // Widths sum to the exact printable width (186mm) so autoTable has no
    // leftover slack to warn about and the table spans the page cleanly.
    columnStyles: { 0: { cellWidth: 130 }, 1: { halign: "right", cellWidth: 56 } },
    margin: { left: 12, right: 12 },
  });

  const y =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 58, 56);
  doc.text(pdfText("Needs attention (top overdue items)"), 12, y);

  autoTable(doc, {
    startY: y + 3,
    head: [["Facility", "Block", "Reason", "Days"]],
    body: overdue.slice(0, 15).map((a) => [
      pdfText(a.facility),
      pdfText(a.block),
      pdfText(a.reason),
      pdfText(a.days < 0 ? `${Math.abs(a.days)} overdue` : `${a.days} left`),
    ]),
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 1.8, overflow: "linebreak" },
    headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: "bold" },
    // Explicit widths (in the document's mm units) so the four columns always
    // fit the portrait page — long facility names wrap instead of widening the
    // table off the paper.
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 24 },
      2: { cellWidth: 50 },
      3: { cellWidth: 24, halign: "right" },
    },
    tableWidth: "wrap",
    margin: { left: 12, right: 12 },
  });
  return doc;
}

/* --------------------------------------------------------------------------- */
/* Single-facility profile sheet (1–2 pages)                                    */
/* --------------------------------------------------------------------------- */

export async function buildFacilityProfilePdf(
  row: MasterRow,
  o: Pick<MasterExportOptions, "labels" | "generatedBy" | "department" | "title"> & {
    audits?: SheetOptions["audits"];
    dataAsOf?: number | string | null;
  },
): Promise<JSPDF> {
  /* ONE engine: the deterministic two-page sheet (lib/facilitySheet) —
     aligned columns, glyph-safe text, vector ₹/▲/▼, never a third page.
     The old autoTable-per-section builder here was the source of the ragged
     tables, the clipped file names and the "&L&l&l&e…" garbling. */
  const sheet = await buildFacilitySheet(row, {
    generatedBy: o.generatedBy,
    department: o.department,
    title: o.title,
    audits: o.audits,
    dataAsOf: o.dataAsOf,
  });
  return sheet.doc;
}

export async function exportFacilityProfilePdf(
  row: MasterRow,
  o: Pick<MasterExportOptions, "labels" | "generatedBy" | "department" | "title"> & {
    audits?: SheetOptions["audits"];
    dataAsOf?: number | string | null;
    showEmpty?: boolean;
    includeRecent?: boolean;
    includeQr?: boolean;
  },
  save?: (blob: Blob, fileName: string) => void,
) {
  /* NQAS_FacilityProfile_<NIN>_<yyyy-mm-dd>.pdf, two pages, same engine as
     the on-screen Print facility sheet. */
  await exportFacilitySheet(row, {
    generatedBy: o.generatedBy,
    department: o.department,
    title: o.title,
    audits: o.audits,
    dataAsOf: o.dataAsOf,
    showEmpty: o.showEmpty,
    includeRecent: o.includeRecent,
    includeQr: o.includeQr,
    save,
  });
}

/* --------------------------------------------------------------------------- */
/* Internals                                                                   */
/* --------------------------------------------------------------------------- */

/** The KPI lines printed on the Summary sheet and the management summary. */
export function kpiLines(rows: MasterRow[]): [string, string][] {
  let certified = 0;
  let inPipeline = 0;
  let overdue = 0;
  let expiring = 0;
  let nocIssues = 0;
  let funds = 0;
  for (const r of rows) {
    const status = (r.facility.currentStatus ?? "").toLowerCase();
    if (status.includes("certified")) certified += 1;
    if (status.includes("scheduled") || status.includes("assessment")) inPipeline += 1;
    const surv = daysUntil(r.nqas?.surveillanceDue1 ?? null);
    if (surv != null && surv < 0) overdue += 1;
    const validity = daysUntil(r.nqas?.validityDate ?? null);
    if (validity != null && validity <= EXPIRY_WARN_DAYS) expiring += 1;
    if (/Expired|Not Obtained|Expiring/.test(r.noc?.status ?? "")) nocIssues += 1;
    if (r.fund?.amountSanctioned) funds += r.fund.amountSanctioned;
  }
  const inr = new Intl.NumberFormat("en-IN").format(funds);
  return [
    ["NQAS certified", String(certified)],
    ["In pipeline", String(inPipeline)],
    ["Surveillance overdue", String(overdue)],
    ["Certificates expiring ≤ 90 days", String(expiring)],
    ["Fire NOC expired / missing / expiring", String(nocIssues)],
    ["Gap closure funds sanctioned", `₹ ${inr}`],
  ];
}

/** Consecutive same-group runs — the Excel band and the label for PDF sections. */
function consecutiveGroups(columns: MasterColumn[]) {
  const out: { group: MasterColumn["group"]; columns: MasterColumn[] }[] = [];
  for (const c of columns) {
    const last = out[out.length - 1];
    if (last && last.group === c.group) last.columns.push(c);
    else out.push({ group: c.group, columns: [c] });
  }
  return out;
}

/** Explicit Excel width per column type (Facility 32, Block 16, dates 14…). */
function widthFor(c: MasterColumn): number {
  if (c.type === "longtext") return 40;
  if (c.type === "link") return 14;
  if (c.type === "action") return 10;
  if (c.type === "status") return Math.max(18, Math.min(28, c.width));
  if (c.type === "date" || c.type === "dueDate") return 15;
  if (c.type === "score" || c.type === "compare") return 12;
  if (c.type === "currency") return 16;
  return Math.max(10, Math.min(34, c.width));
}

function columnStylesFor(
  columns: MasterColumn[],
): Record<number, { halign?: "left" | "center" | "right" }> {
  // Alignment only: autoTable sizes the columns itself (and with
  // `tableWidth: fill` scales them to the page), so a long word can never
  // push the table off the paper or force a cell to be cut.
  const out: Record<number, { halign?: "left" | "center" | "right" }> = {};
  columns.forEach((c, i) => {
    out[i] = { halign: c.align };
  });
  return out;
}

function toDate(value: string | number): Date | null {
  if (typeof value === "number") return new Date(value);
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 12));
}

const thinBorder: Partial<ExcelBorders> = {
  top: { style: "thin", color: { argb: "FFD8E1E8" } },
  bottom: { style: "thin", color: { argb: "FFD8E1E8" } },
  left: { style: "thin", color: { argb: "FFD8E1E8" } },
  right: { style: "thin", color: { argb: "FFD8E1E8" } },
};

function argb(hex: string): string {
  return `FF${hex.replace("#", "").toUpperCase()}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function colRef(index: number): string {
  let n = index;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Extra sheet: only the rows that need a follow-up, in a short column set. */
function addAlertSheet(
  wb: ExcelWorkbook,
  o: MasterExportOptions,
  name: string,
  kind: "surveillance" | "noc" | "funds",
) {
  const keys =
    kind === "surveillance"
      ? [
          "facility", "block", "phc",
          "survDue1", "surv1", "survDue2", "surv2", "recertStatus",
        ]
      : kind === "noc"
        ? ["facility", "block", "phc", "nocAvailable", "nocStatus", "nocCertified", "nocValidity", "nocDoc"]
        : ["facility", "block", "phc", "gapAmount", "gcYear", "procLink"];
  const cols = keys
    .map((k) => o.columns.find((c) => c.key === k))
    .filter((c): c is MasterColumn => !!c);
  if (cols.length === 0) return;

  const ws = wb.addWorksheet(name, {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "1:1",
    },
  });
  const head = ws.addRow(cols.map((c) => o.labels[c.key] ?? c.label));
  head.height = 28;
  head.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F6B63" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = thinBorder;
  });
  for (const r of o.rows) {
    const line = cols.map((c) => cellText(r, c.key) || "-");
    if (line.every((v) => v === "-")) continue;
    ws.addRow(line);
  }
  cols.forEach((c, i) => {
    ws.getColumn(i + 1).width = widthFor(c);
  });
}
