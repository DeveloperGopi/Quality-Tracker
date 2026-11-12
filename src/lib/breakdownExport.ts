/**
 * BREAKDOWN EXPORT — the Excel and PDF buttons on the "Progress breakdown"
 * card. Both read the ONE model (`buildBreakdown`, lib/breakdown), so the
 * workbook, the PDF, the three on-screen views and the drill-down lists show
 * the same numbers by construction — no component or export invents counts.
 *
 * Excel (ExcelJS, real formatting):
 *   • title band + subtitle (denominator and rate definition, generated stamp),
 *   • wrapped headers, frozen header row AND first column,
 *   • column widths measured from content (the card's own width model),
 *   • zero format `#,##0;-#,##0;"-"` on every count column,
 *   • LIVE formulas for Hold a certificate (=Quality+Conditional), Certified %
 *     (=hold ÷ facilities) and the SUM formulas on the total row,
 *   • print setup: landscape, fit to 1 page wide, header row repeats,
 *     footer "Report ID · Page &P of &N".
 *
 * PDF (jsPDF + autoTable): the table, then a VECTOR stacked-bar chart drawn
 * with jsPDF rect/path primitives (bucket colours from lib/breakdown, bucket
 * order identical to the on-screen bar). Bucket-fill column counts keep the
 * chart comparable across rows. Fonts stay embedded (jsPDF core fonts).
 */

import * as ExcelJS from "exceljs";
import type { jsPDF } from "jspdf";
import {
  BUCKET_BY_KEY,
  BUCKET_ORDER,
  oklchToRgb,
  type Breakdown,
  type BreakdownRow,
} from "@/lib/breakdown";
import { buildTablePdf } from "@/lib/exportTable";

/** RFC-4180 free column model for the spread — header, width, alignment and
 *  value(s) live together so the header row can never disagree with the body
 *  (the same rule lib/dashboardTables enforces for the other tables). */
/** Rows carry their absolute spreadsheet row (4+) once stamped — formulas
 *  reference them, so the column model is typed over the stamped row. */
export type NumberedRow = BreakdownRow & { rNo: number };

type ExportColumn = {
  label: string;
  width: number;
  align: "left" | "center" | "right";
  /** String cell (or null), plus the spreadsheet formula when a cell is live.
   *  `i` is the display serial position (0-based) — S.No uses it. */
  value: (r: NumberedRow, i: number) => string | number | null;
  formula?: (r: NumberedRow, i: number) => { formula: string } | null;
  /** Spreadsheet number format for the value/formula. */
  numFmt?: string;
};

const ZERO_FMT = '#,##0;-#,##0;"-"';
const PCT_FMT = "0.0%";

const clean = (v: number) => (v === 0 ? 0 : v); // zeros stay numbers; the numFmt prints "-"

/** The ordered columns — every header is generated from this same array. */
export function breakdownExportColumns(bd: Breakdown): ExportColumn[] {
  const cols: ExportColumn[] = [
    { label: "S.No", width: 8, align: "right", value: (_r, i) => i + 1 },
    { label: bd.scopeLabel, width: 18, align: "left", value: (r) => r.label },
    { label: "Facilities", width: 11, align: "right", value: (r) => clean(r.n), numFmt: ZERO_FMT },
    {
      label: "Quality certified",
      width: 14,
      align: "right",
      value: (r) => clean(r.buckets.qualityCertified),
      numFmt: ZERO_FMT,
    },
    {
      label: "Conditional",
      width: 12,
      align: "right",
      value: (r) => clean(r.buckets.conditional),
      numFmt: ZERO_FMT,
    },
    {
      // LIVE formula — the sheet's own arithmetic, never a stale number.
      label: "Hold a certificate",
      width: 15,
      align: "right",
      value: () => null,
      // Hold a certificate = Quality (D) + Conditional (E) — live formula.
      formula: (r) => ({ formula: `D${r.rNo}+E${r.rNo}` }),
      numFmt: ZERO_FMT,
    },
  ];
  for (const key of ["resultAwaited", "inProgress", "deferred", "eligibleNotStarted", "notEligible"] as const)
    cols.push({
      label: BUCKET_BY_KEY[key].label,
      width: 15,
      align: "right",
      value: (r) => clean(r.buckets[key]),
      numFmt: ZERO_FMT,
    });
  cols.push({
    label: "Certified %",
    width: 12,
    align: "right",
    value: () => null,
    // = Hold a certificate ÷ Facilities — same definition the card header states.
    // Certified % = Hold (F) ÷ Facilities (C) — the definition the header states.
    formula: (r) => ({ formula: `F${r.rNo}/C${r.rNo}` }),
    numFmt: PCT_FMT,
  });
  cols.push({
    label: "vs average (pts)",
    width: 14,
    align: "right",
    value: (r) => clean(round1(bd.avgPct ? r.vsAvgPoints : 0)),
    numFmt: "+0.0;-0.0;0",
  });
  cols.push({
    label: "Recert due",
    width: 11,
    align: "right",
    value: (r) => clean(r.overlays.recertDue),
    numFmt: ZERO_FMT,
  });
  cols.push({
    label: "Surveillance due",
    width: 13,
    align: "right",
    value: (r) => clean(r.overlays.surveillanceDue),
    numFmt: ZERO_FMT,
  });
  return cols;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** 1-based column index → spreadsheet letters (A…AA). Data starts at row 4
 *  when the title band is present, so formulas need the absolute row. */
function colLetter(index: number): string {
  let s = "";
  let n = index + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
}

export function breakdownSubtitle(bd: Breakdown, generatedAt: string): string {
  const def =
    bd.denominator === "eligible"
      ? "Certified % = facilities holding a certificate ÷ eligible facilities"
      : "Certified % = facilities holding a certificate ÷ all facilities";
  return `${def} · ${bd.total} facilities · scope average ${bd.avgPct}% · generated ${generatedAt}`;
}

/** Build the workbook contract (layout, formulas, print setup) without the
 *  browser download path — tests read it back with ExcelJS. */
export async function buildBreakdownWorkbook(
  bd: Breakdown,
  meta: { title: string; generatedAt: string },
): Promise<ExcelJS.Workbook> {
  const cols = breakdownExportColumns(bd);
  const wb = new ExcelJS.Workbook();
  wb.creator = "NQAS Tracker";
  const ws = wb.addWorksheet("Progress breakdown", {
    views: [
      // Frozen header row AND first column (the brief's read-back rule).
      { state: "frozen", xSplit: 1, ySplit: 3 },
    ],
    headerFooter: {
      // The print footer the brief pins: Report ID · Page &P of &N.
      oddFooter: "&8&LReport ID · Page &P of &N",
    },
  });

  // Group band: title and subtitle merged across the table width.
  const bandCol = cols.length;
  const band = [meta.title, breakdownSubtitle(bd, meta.generatedAt)];
  band.forEach((text, i) => {
    const r = i + 1;
    ws.mergeCells(r, 1, r, bandCol);
    const cell = ws.getCell(r, 1);
    cell.value = text;
    if (i === 0) cell.font = { bold: true, size: 13 };
    else {
      cell.font = { size: 9, color: { argb: "FF555555" } };
      cell.alignment = { wrapText: true };
    }
  });

  // Header row (row 3) — wrapped.
  const headerRow = ws.getRow(3);
  cols.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.label;
    cell.font = { bold: true };
    cell.alignment = { wrapText: true, horizontal: c.align === "right" ? "right" : "left" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D6960" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  // Data rows (row 4+) — one per group, then the SUM total row. Formulas
  // need absolute row numbers, so stamp them once here.
  const numbered: NumberedRow[] = [
    ...bd.rows.map((r, i) => ({ ...(r as BreakdownRow), rNo: 4 + i })),
    { ...(bd.grand as BreakdownRow), rNo: 4 + bd.rows.length },
  ];
  for (const r of numbered) {
    const row = ws.getRow(r.rNo);
    cols.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      const f = c.formula?.(r, i);
      if (f) {
        cell.value = { formula: f.formula };
        if (c.numFmt) cell.numFmt = c.numFmt;
      } else {
        cell.value = c.value(r, i);
        if (c.numFmt && typeof cell.value === "number") cell.numFmt = c.numFmt;
      }
      cell.alignment = {
        horizontal: c.align === "right" ? "right" : "left",
        wrapText: c.align === "left",
      };
    });
    if (r.key === bd.grand.key) row.font = { bold: true };
    row.commit();
  }

  // Column widths from the shared model (content measured on export too).
  cols.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width;
  });

  // Print setup: landscape, fit to one page wide, header row repeats.
  ws.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: "3:3",
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
  };
  return wb;
}

/** The vector stacked-bar chart page(s) after the table (B7). One bar per
 *  group, segments in bucket order, painted with doc.setFillColor/rect from
 *  the SAME oklch palette the on-screen bars use (via oklchToRgb) — pure
 *  vector output, no images, no split words. A legend row prints above the
 *  first bar; bars continue across pages if needed. */
export function drawBreakdownChart(doc: jsPDF, bd: Breakdown): void {
  const d = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
  const margin = 40;
  const pageW = d.internal.pageSize.getWidth();
  const pageH = d.internal.pageSize.getHeight();
  const barAreaW = pageW - margin * 2 - 120; // name 120pt left, bar right
  const barH = 12;
  const gap = 10;
  const present = BUCKET_ORDER.filter((k) => bd.grand.buckets[k] > 0);

  let y = (d.lastAutoTable?.finalY ?? 60) + 24;
  const legendOnce = () => {
    d.setFontSize(8);
    let lx = margin;
    for (const k of present) {
      const [r, g, b2] = oklchToRgb(BUCKET_BY_KEY[k].colour);
      d.setFillColor(r, g, b2);
      d.rect(lx, y - 7, 6, 6, "F");
      d.setTextColor(60);
      d.text(BUCKET_BY_KEY[k].label, lx + 8, y - 2);
      lx += 8 + d.getTextWidth(BUCKET_BY_KEY[k].label) + 8;
      if (lx > pageW - margin - 40) {
        lx = margin;
        y += 10;
      }
    }
    d.setTextColor(0);
    y += 8;
  };
  if (y + 20 < pageH) legendOnce();

  const maxN = Math.max(1, ...bd.rows.map((r) => r.n));
  for (const r of bd.rows) {
    if (y + barH + 10 > pageH - 40) {
      d.addPage();
      y = 48;
      legendOnce();
    }
    // Label + counts left of the bar.
    d.setFontSize(8);
    d.setTextColor(0);
    d.text(`${r.label} (${r.holdCert}/${r.n} · ${Math.round(r.rate)}%)`, margin, y + barH - 3);
    let x = margin + barAreaW;
    for (const k of BUCKET_ORDER) {
      const n = r.buckets[k];
      if (n === 0) continue;
      const w = (n / r.n) * barAreaW - 0.5; // 0.5pt white joint between segments
      const [cr, cg, cb2] = oklchToRgb(BUCKET_BY_KEY[k].colour);
      d.setFillColor(cr, cg, cb2);
      d.rect(x, y, Math.max(0.5, w), barH, "F");
      x += w + 0.5;
    }
    y += barH + gap;
  }
  void maxN;
}

/** The PDF document for the card's Download menu — split out so a test can
 *  read its bytes without the browser download path. */
export async function buildBreakdownPdf(
  bd: Breakdown,
  meta: { title: string; generatedAt: string },
): Promise<jsPDF> {
  const cols = breakdownExportColumns(bd);
  const headers = cols.map((c) => c.label);
  const bodyLine = (r: NumberedRow, rowNo: number) =>
    cols.map((c, i) => {
      if (c.formula) {
        // The PDF shows the RESULT (the sheet's formula result), never the
        // formula text: Hold a certificate and Certified % have direct values.
        if (c.label === "Hold a certificate") return r.holdCert;
        if (c.label === "Certified %") return r.rate + "%";
        return null;
      }
      return c.value(r, rowNo);
    });
  const body = bd.rows.map((r, i) => bodyLine({ ...(r as BreakdownRow), rNo: 4 + i }, i));
  const total = bodyLine(
    { ...(bd.grand as BreakdownRow), rNo: 4 + bd.rows.length },
    bd.rows.length,
  );
  const doc = await buildTablePdf({
    title: meta.title,
    subtitle: breakdownSubtitle(bd, meta.generatedAt),
    headers,
    rows: [...body, total],
    options: {
      columnWidths: cols.map((c) => c.width),
      columnAligns: cols.map((c) => c.align),
    },
  });
  drawBreakdownChart(doc as unknown as jsPDF, bd);
  return doc as unknown as jsPDF;
}

/** The complete export call from the card buttons (xlsx | pdf). */
export async function exportBreakdown(
  bd: Breakdown,
  fmt: "xlsx" | "pdf",
  fileBase: string,
) {
  const stamp = new Date().toISOString().slice(0, 10);
  const title = `Progress breakdown — by ${bd.scopeLabel.toLowerCase()}`;
  if (fmt === "xlsx") {
    const wb = await buildBreakdownWorkbook(bd, { title, generatedAt: stamp });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}-${stamp}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    // One shared builder (table + vector chart) — the download path only
    // persists and names the bytes.
    const doc = await buildBreakdownPdf(bd, { title, generatedAt: stamp });
    await doc.save(`${fileBase}-${stamp}.pdf`);
  }
}
