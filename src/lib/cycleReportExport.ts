/**
 * CERTIFICATION CYCLES EXPORTS — Excel (ExcelJS), PDF (jsPDF + autoTable) and
 * CSV.
 *
 * Every sheet/section is written from the SAME `buildCycleReport` result the
 * screen renders, so a number cannot drift between the UI and the file.
 * Removed sections (lifecycle, surveillance-by-cycle, validity-by-cycle,
 * funnel) are gone from the exports too — their data lives in Line lists and
 * the Definitions sheet. No ISO dates, no sentences inside cells, no Report ID
 * on screen (kept here, in the Cover/footer only).
 *
 * File name: `{District} Certification Cycles {View} {DD-MM-YYYY}.xlsx`
 */

import { formatVisitDate } from "@/convex/lifecycle";
import {
  buildCycleReport,
  medianDaysText,
  OUTCOME_SEGMENTS,
  RENEWAL_BUCKETS,
  RENEWAL_STEPS,
  ratioLabel,
  type CycleReportRow,
  type CycleReportSettings,
} from "@/lib/cycleReport";
import { changeLabel, formatPercent } from "@/lib/reportMetrics";
import { docStageLabel } from "@/lib/reportPipeline";
import { ORG_NAME } from "@/lib/org";
import { istReportDate, sanitizeReportPart } from "@/lib/reportNaming";

export type CycleExportView =
  | "overview"
  | "renewals"
  | "compare"
  | "list"
  | "full";

export const CYCLE_VIEW_LABELS: Record<CycleExportView, string> = {
  overview: "Overview",
  renewals: "Renewals",
  compare: "Compare",
  list: "List",
  full: "Full Report",
};

export type CycleExportMeta = {
  filtersText: string;
  generatedAt: string;
  generatedBy: string;
  reportId: string;
  /** District for the file name (Admin → Settings districtName). */
  district?: string;
  /** Existing cycles, including an empty one. */
  knownCycles?: { cycleNumber: number; cycleType: string }[];
};

const dmy = (iso: string | null | undefined) =>
  iso ? formatVisitDate(String(iso).slice(0, 10)) : "-";

const dateCell = (iso: string | null | undefined) =>
  iso && /^\d{4}-\d{2}-\d{2}/.test(iso)
    ? new Date(`${iso.slice(0, 10)}T00:00:00Z`)
    : null;

const sanitize = (v: unknown) => sanitizeReportPart(v) || "District";

/** `{District} Certification Cycles {View} {DD-MM-YYYY}` (Part 7). */
export function cycleFileName(input: {
  district?: string;
  view: CycleExportView;
  date?: Date | string | number;
  ext: "xlsx" | "pdf" | "csv";
}): string {
  const district = sanitize(input.district) || "District";
  const view = CYCLE_VIEW_LABELS[input.view];
  return `${district} Certification Cycles ${view} ${istReportDate(input.date)}.${input.ext}`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Browser-only PNG for the Renewals sheet. Null in Node/tests (no canvas). */
function renewalsChartPng(
  report: ReturnType<typeof buildCycleReport>,
): string | null {
  if (typeof document === "undefined") return null;
  const width = 960;
  const height = 320;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const pad = 48;
  const bottom = height - 64;
  const columns = report.renewals.chart;
  const max = Math.max(1, ...columns.map((c) => c.total));
  const slot = (width - pad * 2) / columns.length;
  const urgency = { expired: "#dc2626", soon: "#d97706", later: "#0284c7" };
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  for (const [i, col] of columns.entries()) {
    const h = col.total === 0 ? 0 : Math.max(4, (col.total / max) * (bottom - 54));
    const x = pad + i * slot + slot * 0.2;
    if (h > 0) {
      ctx.fillStyle = urgency[col.urgency];
      ctx.fillRect(x, bottom - h, slot * 0.6, h);
      if (col.urgency === "expired") {
        ctx.strokeStyle = "rgba(255,255,255,.7)";
        for (let o = -h; o < 0; o += 6) {
          ctx.beginPath();
          ctx.moveTo(x, bottom + o);
          ctx.lineTo(x + slot * 0.6, bottom + o - slot * 0.6);
          ctx.stroke();
        }
      }
    }
    ctx.fillStyle = "#334155";
    ctx.fillText(String(col.total), x + slot * 0.3, bottom - h - 6);
    ctx.fillStyle = "#64748b";
    ctx.fillText(col.label, x + slot * 0.3, bottom + 16);
    if (col.subLabel) ctx.fillText(col.subLabel, x + slot * 0.3, bottom + 32);
  }
  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(pad, bottom);
  ctx.lineTo(width - pad, bottom);
  ctx.stroke();
  return canvas.toDataURL("image/png").split(",")[1] ?? null;
}

/** Build the workbook (not saved) so a test can read it back. */
export async function buildCycleWorkbook(
  rows: CycleReportRow[],
  meta: CycleExportMeta,
  settings: CycleReportSettings,
): Promise<import("exceljs").Workbook> {
  const ExcelJS = (await import("exceljs")).default;
  const report = buildCycleReport(rows, {
    today: meta.generatedAt,
    settings,
    knownCycles: meta.knownCycles,
  });
  const wb = new ExcelJS.Workbook();
  wb.creator = meta.generatedBy;
  wb.created = new Date();

  const headerFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0D6960" },
  } as const;
  const headerFont = { bold: true, color: { argb: "FFFFFFFF" } } as const;
  const styleHeader = (ws: import("exceljs").Worksheet) => {
    ws.getRow(1).eachCell((c) => {
      c.fill = headerFill;
      c.font = headerFont;
    });
  };
  const printSetup = (ws: import("exceljs").Worksheet) => {
    ws.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      printTitlesRow: "1:1",
    };
    ws.headerFooter = { oddFooter: `${meta.reportId} · Page &P of &N` };
  };

  /* ---------------- Cover ---------------- */
  const cover = wb.addWorksheet("Cover");
  cover.addRow(["Certification Cycles"]);
  cover.getRow(1).font = { bold: true, size: 16 };
  (
    [
      ["District", sanitize(meta.district) || "District"],
      ["Filters", meta.filtersText || "None"],
      ["Data as of", `${dmy(meta.generatedAt)} (IST)`],
      ["Report ID", meta.reportId],
      ["Generated by", meta.generatedBy],
      ["Facilities", report.distinctFacilities],
      ["Facility-cycles", report.facilityCycles],
      ["Cycles", report.cycles.map((c) => c.label).join(" · ") || "-"],
      ["Headline", report.headline ?? "-"],
      ...(report.reconciliation.text
        ? ([["Reconciliation", report.reconciliation.text]] as [string, string][])
        : []),
    ] as [string, string | number][]
  ).forEach(([k, v]) => {
    const r = cover.addRow([k, v]);
    r.getCell(1).font = { bold: true };
  });
  cover.columns = [{ width: 22 }, { width: 110 }];
  cover.getColumn(2).alignment = { wrapText: true, vertical: "top" };
  printSetup(cover);

  /* ---------------- Overview ---------------- */
  const ov = wb.addWorksheet("Overview");
  ov.addRow([
    "Cycle",
    "Status",
    "Facilities",
    "Hold a certificate",
    "Hold %",
    ...OUTCOME_SEGMENTS.map((s) => s.label),
  ]);
  styleHeader(ov);
  for (const card of report.overview.cards) {
    ov.addRow([
      card.label,
      card.status === "current" ? "Current" : "Closed",
      card.facilities,
      card.hold,
      ratioLabel(card.hold, card.facilities),
      ...OUTCOME_SEGMENTS.map(
        (s) => card.segments.find((x) => x.key === s.key)?.count ?? 0,
      ),
    ]);
  }
  ov.addRow([]);
  ov.addRow([`Details by Facility Type`]);
  ov.getRow(ov.rowCount).font = { bold: true };
  ov.addRow([
    "Facility Type",
    ...report.cycles
      .filter((c) => c.facilities > 0)
      .flatMap((c, i) =>
        i === 0
          ? [
              `${c.label} facilities`,
              `${c.label} certified`,
              `${c.label} certified %`,
              `${c.label} in progress`,
            ]
          : [`${c.label} facilities`, `${c.label} certified`],
      ),
  ]);
  styleHeader(ov);
  const typeCycles = report.cycles.filter((c) => c.facilities > 0);
  for (const row of report.overview.details.type.rows) {
    ov.addRow([
      row.label,
      ...typeCycles.flatMap((c, i) => {
        const cell = row.cycles[c.cycleNumber];
        return i === 0
          ? [
              cell?.facilities ?? 0,
              cell?.certified ?? 0,
              ratioLabel(cell?.certified ?? 0, cell?.facilities ?? 0),
              cell?.inProgress ?? 0,
            ]
          : [cell?.facilities ?? 0, cell?.certified ?? 0];
      }),
    ]);
  }
  const totals = report.overview.details.type.totals;
  const totalRow = ov.addRow([
    totals.label,
    ...typeCycles.flatMap((c, i) => {
      const cell = totals.cycles[c.cycleNumber];
      return i === 0
        ? [
            cell?.facilities ?? 0,
            cell?.certified ?? 0,
            ratioLabel(cell?.certified ?? 0, cell?.facilities ?? 0),
            cell?.inProgress ?? 0,
          ]
        : [cell?.facilities ?? 0, cell?.certified ?? 0];
    }),
  ]);
  totalRow.font = { bold: true };
  ov.columns = [{ width: 26 }, { width: 16 }, { width: 14 }, { width: 20 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 14 }];
  ov.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
  printSetup(ov);

  /* ---------------- Renewals (buckets + steps + list + chart) ------------ */
  const rn = wb.addWorksheet("Renewals");
  rn.addRow(["Bucket", "Facilities"]);
  styleHeader(rn);
  for (const b of report.renewals.buckets) rn.addRow([b.label, b.count]);
  if (report.renewals.certifiedNoValidity.count > 0)
    rn.addRow([
      "Certified, no validity date (Needs attention)",
      report.renewals.certifiedNoValidity.count,
    ]);
  rn.addRow([]);
  rn.addRow(["Renewal step", "Facilities", "Not recorded"]);
  styleHeader(rn);
  rn.getRow(rn.rowCount - 1).eachCell((c) => {
    c.fill = headerFill;
    c.font = headerFont;
  });
  for (const s of report.renewals.steps)
    rn.addRow([s.label, s.count, s.notRecorded]);
  rn.addRow([]);
  const listHeaderRow = rn.rowCount + 1;
  rn.addRow([
    "Facility",
    "Type",
    "Block",
    "Valid till",
    "Days left",
    "Renewal step",
    "Next action",
  ]);
  rn.getRow(rn.rowCount).eachCell((c) => {
    c.fill = headerFill;
    c.font = headerFont;
  });
  for (const e of report.renewals.scope) {
    const r = rn.addRow([
      e.facility,
      e.type,
      e.block,
      dateCell(e.certRow?.validityDate ?? null),
      e.daysLeft ?? "-",
      RENEWAL_STEPS.find((s) => s.key === e.step)?.label ?? "-",
      e.nextAction,
    ]);
    r.getCell(4).numFmt = "dd-mmm-yyyy";
  }
  rn.autoFilter = {
    from: { row: listHeaderRow, column: 1 },
    to: { row: rn.rowCount, column: 7 },
  };
  rn.views = [{ state: "frozen", xSplit: 1, ySplit: listHeaderRow }];
  rn.columns = [{ width: 32 }, { width: 14 }, { width: 18 }, { width: 14 }, { width: 11 }, { width: 22 }, { width: 44 }];
  const chart = renewalsChartPng(report);
  if (chart) {
    const imageId = wb.addImage({ base64: chart, extension: "png" });
    rn.addImage(imageId, {
      tl: { col: 0, row: rn.rowCount + 2 },
      ext: { width: 900, height: 300 },
      editAs: "oneCell",
    });
  }
  printSetup(rn);

  /* ---------------- Compare ---------------- */
  const cp = wb.addWorksheet("Compare");
  cp.addRow([
    "Facility",
    "Type",
    "Block",
    `Cycle #${report.comparison.rows[0]?.fromCycle ?? 1} result`,
    "Score",
    "Certified on",
    "Valid till",
    `Cycle #${report.comparison.rows[0]?.toCycle ?? 2} result`,
    "Score",
    "Certified on",
    "Change",
    "Renewal timing",
  ]);
  styleHeader(cp);
  for (const c of report.comparison.rows) {
    const r = cp.addRow([
      c.facility,
      c.type,
      c.block,
      c.fromResult,
      c.fromScore ?? "-",
      dateCell(c.fromCertifiedOn),
      dateCell(c.fromValidTill),
      c.toResult,
      c.toScore ?? "-",
      dateCell(c.toCertifiedOn),
      changeLabel(c.delta),
      c.timing.text,
    ]);
    for (const idx of [6, 7, 10]) r.getCell(idx).numFmt = "dd-mmm-yyyy";
  }
  cp.addRow([]);
  cp.addRow(["Summary", "Value"]);
  styleHeader(cp);
  cp.getRow(cp.rowCount).eachCell((c) => {
    c.fill = headerFill;
    c.font = headerFont;
  });
  cp.addRow(["Improved", report.comparison.improved]);
  cp.addRow(["Same", report.comparison.unchanged]);
  cp.addRow(["Declined", report.comparison.declined]);
  cp.addRow(["Conditionality resolved", report.comparison.conditionalityResolved]);
  cp.addRow(["On time", report.comparison.recertifiedOnTime]);
  cp.addRow(["Late", report.comparison.recertifiedLate]);
  cp.addRow([
    "Median between certifications",
    medianDaysText(report.comparison.medianDaysBetweenCerts),
  ]);
  cp.columns = [{ width: 32 }, { width: 14 }, { width: 18 }, { width: 26 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 26 }, { width: 10 }, { width: 14 }, { width: 12 }, { width: 46 }];
  cp.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
  printSetup(cp);

  /* ---------------- Facility-cycles ---------------- */
  const fc = wb.addWorksheet("Facility-cycles");
  fc.addRow([
    "Facility",
    "NIN",
    "Type",
    "Block",
    "PHC",
    "Cycle",
    "Cycle type",
    "Result",
    "Score",
    "Certified on",
    "Valid till",
    "Days left",
    "Renewal step",
    "Next action",
    "Documents status",
  ]);
  styleHeader(fc);
  for (const e of report.list) {
    const r = e.row;
    const row = fc.addRow([
      r.facility,
      r.nin ?? "-",
      r.type,
      r.block,
      r.phc,
      `#${r.cycleNumber}`,
      r.cycleType,
      e.resultLabel,
      e.score ?? "-",
      dateCell(r.certDate),
      dateCell(r.validityDate),
      e.daysLeft ?? "-",
      RENEWAL_STEPS.find((s) => s.key === e.step)?.label ?? "-",
      e.nextAction,
      r.generalDocStatus ? docStageLabel(r.generalDocStatus) : "Not recorded",
    ]);
    row.getCell(2).numFmt = "@";
    for (const idx of [10, 11]) row.getCell(idx).numFmt = "dd-mmm-yyyy";
    // Status colours (never colour alone — the word is always printed).
    const resultCell = row.getCell(8);
    const label = e.resultLabel;
    resultCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb:
          label === "Quality"
            ? "FFD1FAE5"
            : label === "Conditional"
              ? "FFFEF3C7"
              : label === "Deferred"
                ? "FFFEE2E2"
                : "FFF1F5F9",
      },
    };
  }
  fc.autoFilter = { from: { row: 1, column: 1 }, to: { row: fc.rowCount, column: 15 } };
  fc.views = [{ state: "frozen", xSplit: 2, ySplit: 1 }];
  fc.columns = [32, 16, 14, 18, 18, 10, 18, 16, 10, 14, 14, 11, 22, 44, 26].map(
    (w) => ({ width: w }),
  );
  printSetup(fc);

  /* ---------------- Definitions ---------------- */
  const defs = wb.addWorksheet("Definitions");
  defs.addRow(["Term", "Meaning"]);
  styleHeader(defs);
  for (const d of report.definitions) defs.addRow([d.term, d.meaning]);
  defs.columns = [{ width: 28 }, { width: 110 }];
  defs.getColumn(2).alignment = { wrapText: true, vertical: "top" };
  printSetup(defs);

  void RENEWAL_BUCKETS;
  void formatPercent;
  return wb;
}

export async function exportCycleWorkbook(
  filename: string,
  rows: CycleReportRow[],
  meta: CycleExportMeta,
  settings: CycleReportSettings,
): Promise<void> {
  const wb = await buildCycleWorkbook(rows, meta, settings);
  const buffer = await wb.xlsx.writeBuffer();
  saveBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

/** CSV of the active view (UTF-8 BOM so Excel reads ₹ / Tamil). */
export function cycleReportCsv(
  rows: CycleReportRow[],
  meta: CycleExportMeta,
  settings: CycleReportSettings,
  view: CycleExportView = "list",
): string {
  const report = buildCycleReport(rows, {
    today: meta.generatedAt,
    settings,
    knownCycles: meta.knownCycles,
  });
  const cell = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  let headers: string[];
  let body: (string | number)[][];
  if (view === "renewals") {
    headers = ["Facility", "Type", "Block", "Valid till", "Days left", "Renewal step", "Next action"];
    body = report.renewals.scope.map((e) => [
      e.facility,
      e.type,
      e.block,
      dmy(e.certRow?.validityDate ?? null),
      e.daysLeft ?? "-",
      RENEWAL_STEPS.find((s) => s.key === e.step)?.label ?? "-",
      e.nextAction,
    ]);
  } else if (view === "compare") {
    headers = ["Facility", "Type", "Block", "Cycle #1 result", "Score", "Certified on", "Valid till", "Cycle #2 result", "Score", "Certified on", "Change", "Renewal timing"];
    body = report.comparison.rows.map((c) => [
      c.facility,
      c.type,
      c.block,
      c.fromResult,
      c.fromScore ?? "-",
      dmy(c.fromCertifiedOn),
      dmy(c.fromValidTill),
      c.toResult,
      c.toScore ?? "-",
      dmy(c.toCertifiedOn),
      changeLabel(c.delta),
      c.timing.text,
    ]);
  } else {
    headers = ["Facility", "Type", "Block", "PHC", "Cycle", "Result", "Score", "Certified on", "Valid till", "Days left", "Renewal step", "Next action"];
    body = report.list.map((e) => [
      e.row.facility,
      e.row.type,
      e.row.block,
      e.row.phc,
      `#${e.row.cycleNumber}`,
      e.resultLabel,
      e.score ?? "-",
      dmy(e.row.certDate),
      dmy(e.row.validityDate),
      e.daysLeft ?? "-",
      RENEWAL_STEPS.find((s) => s.key === e.step)?.label ?? "-",
      e.nextAction,
    ]);
  }
  const lines = [
    ["Certification Cycles", `Report ID ${meta.reportId}`, `Data as of ${dmy(meta.generatedAt)} (IST)`],
    [`Filters: ${meta.filtersText || "None"}`],
    headers,
    ...body,
  ];
  return `\uFEFF${lines.map((l) => l.map(cell).join(",")).join("\r\n")}`;
}

/* -------------------------------------------------------------------------- */
/* PDF — Overview, Renewals (chart + first 30 rows), Compare                   */
/* -------------------------------------------------------------------------- */

/** Build the PDF (not saved) so a test can read its text back. */
export async function buildCyclePdf(
  rows: CycleReportRow[],
  meta: CycleExportMeta,
  settings: CycleReportSettings,
  view: CycleExportView = "full",
): Promise<{
  save: (filename: string) => void;
  output: (t: string) => unknown;
  getNumberOfPages: () => number;
}> {
  const { jsPDF } = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const autoTable = autoTableMod.default;
  const report = buildCycleReport(rows, {
    today: meta.generatedAt,
    settings,
    knownCycles: meta.knownCycles,
  });
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 34;
  const sections =
    view === "full"
      ? (["overview", "renewals", "compare", "list"] as CycleExportView[])
      : [view];
  const subtitle = `${meta.filtersText || "No filters"} · Data as of ${dmy(meta.generatedAt)} IST · Report ID ${meta.reportId}`;

  /** Header + footer, stamped once on every page after the content is laid
   *  out (so "Page X of Y" knows the real total). Tables keep a 34/30 pt
   *  margin, so the stamp never collides with a row. */
  const stampChrome = () => {
    const total = doc.getNumberOfPages();
    const current = doc.getCurrentPageInfo().pageNumber;
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(ORG_NAME, margin, 22);
      doc.text(`Certification Cycles · ${meta.generatedBy}`, pageW - margin, 22, {
        align: "right",
      });
      doc.text(`Page ${i} of ${total}`, pageW - margin, pageH - 16, { align: "right" });
      doc.text(meta.reportId, margin, pageH - 16);
    }
    doc.setTextColor(0);
    doc.setPage(current);
  };

  let y = 46;
  const heading = (text: string) => {
    if (y > pageH - 110) {
      doc.addPage();
      y = 46;
    }
    doc.setFontSize(11);
    doc.setTextColor(13, 105, 96);
    doc.text(text, margin, y);
    doc.setTextColor(0);
    y += 10;
  };
  const table = (
    head: string[],
    body: (string | number)[][],
    align?: Record<number, "left" | "right" | "center">,
  ) => {
    autoTable(doc, {
      head: [head],
      body: body.map((r) => r.map((c) => (c == null || c === "" ? "-" : String(c)))),
      startY: y,
      margin: { left: margin, right: margin, top: 34, bottom: 30 },
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: 0, overflow: "linebreak" },
      headStyles: { fillColor: [13, 105, 96], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [244, 248, 247] },
      columnStyles: Object.fromEntries(
        Object.entries(align ?? {}).map(([k, v]) => [Number(k), { halign: v }]),
      ),
    });
    const last = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
    y = (last?.finalY ?? y) + 14;
  };

  doc.setFontSize(15);
  doc.text("Certification Cycles", margin, 44);
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text(subtitle, margin, 56);
  doc.setTextColor(0);
  y = 70;

  if (report.headline) {
    doc.setFontSize(9);
    doc.text(report.headline, margin, y, { maxWidth: pageW - margin * 2 });
    y += 18;
  }

  /* ---------------- Overview ---------------- */
  if (sections.includes("overview")) {
    heading("Overview — one card per cycle");
    table(
      ["Cycle", "Status", "Facilities", "Hold a certificate", "Quality", "Conditional", "Deferred", "In progress", "Not eligible"],
      report.overview.cards.map((c) => [
        c.label,
        c.status === "current" ? "Current" : "Closed",
        c.facilities,
        c.holdText,
        c.segments.find((s) => s.key === "quality")?.count ?? 0,
        c.segments.find((s) => s.key === "conditional")?.count ?? 0,
        c.segments.find((s) => s.key === "deferred")?.count ?? 0,
        c.segments.find((s) => s.key === "inProgress")?.count ?? 0,
        c.segments.find((s) => s.key === "notEligible")?.count ?? 0,
      ]),
      { 2: "right", 4: "right", 5: "right", 6: "right", 7: "right", 8: "right" },
    );
    for (const [dim, details] of [
      ["Facility Type", report.overview.details.type],
      ["Block", report.overview.details.block],
    ] as const) {
      const cycles = report.cycles.filter((c) => c.facilities > 0);
      heading(`By ${dim}`);
      table(
        [
          dim,
          ...cycles.flatMap((c) => [`#${c.cycleNumber} Facilities`, `#${c.cycleNumber} Certified`]),
        ],
        [
          ...details.rows.map((r) => [
            r.label,
            ...cycles.flatMap((c) => {
              const cell = r.cycles[c.cycleNumber];
              return [cell.facilities || "-", cell.certified || "-"];
            }),
          ]),
          [
            "Total",
            ...cycles.flatMap((c) => {
              const cell = details.totals.cycles[c.cycleNumber];
              return [cell.facilities || "-", cell.certified || "-"];
            }),
          ],
        ],
      );
    }
    if (report.reconciliation.text) {
      doc.setFontSize(7.5);
      doc.text(report.reconciliation.text, margin, y, { maxWidth: pageW - margin * 2 });
      y += 14;
    }
  }

  /* ---------------- Renewals ---------------- */
  if (sections.includes("renewals")) {
    heading("Renewals — what is coming");
    const png = renewalsChartPng(report);
    if (png) {
      const w = pageW - margin * 2;
      const h = Math.min(150, w * 0.33);
      if (y + h > pageH - 60) {
        doc.addPage();
        y = 46;
      }
      doc.addImage(`data:image/png;base64,${png}`, "PNG", margin, y, w, h);
      y += h + 12;
    }
    table(
      ["Bucket", "Facilities"],
      report.renewals.buckets.map((b) => [b.label, b.count]),
      { 1: "right" },
    );
    table(
      ["Renewal step", "Facilities"],
      report.renewals.steps.map((s) => [s.label, s.count]),
      { 1: "right" },
    );
    const shown = report.renewals.scope.slice(0, 30);
    heading(`Renewal list — first ${shown.length} of ${report.renewals.scope.length}`);
    table(
      ["Facility", "Type", "Block", "Valid till", "Days left", "Renewal step", "Next action"],
      shown.map((e) => [
        e.facility,
        e.type,
        e.block,
        dmy(e.certRow?.validityDate ?? null),
        e.daysLeft ?? "-",
        RENEWAL_STEPS.find((s) => s.key === e.step)?.label ?? "-",
        e.nextAction,
      ]),
      { 4: "right" },
    );
    if (report.renewals.scope.length > shown.length) {
      doc.setFontSize(7.5);
      doc.setTextColor(110);
      doc.text(
        `${report.renewals.scope.length - shown.length} more rows — continued in the Excel export.`,
        margin,
        y,
      );
      doc.setTextColor(0);
      y += 14;
    }
  }

  /* ---------------- Compare ---------------- */
  if (sections.includes("compare")) {
    heading("Compare — facilities with two or more cycles");
    if (!report.comparison.available) {
      doc.setFontSize(9);
      doc.text(
        "No facility has started Cycle #2 yet. See Renewals for what is coming.",
        margin,
        y,
      );
      y += 16;
    } else {
      table(
        ["Improved", "Same", "Declined", "Conditionality resolved", "On time", "Late"],
        [[
          report.comparison.improved,
          report.comparison.unchanged,
          report.comparison.declined,
          report.comparison.conditionalityResolved,
          report.comparison.recertifiedOnTime,
          report.comparison.recertifiedLate,
        ]],
        { 0: "right", 1: "right", 2: "right", 3: "right", 4: "right", 5: "right" },
      );
      table(
        ["Facility", "Type", "Block", `Cycle #1`, "Score", "Certified on", "Valid till", `Cycle #2`, "Score", "Certified on", "Change", "Renewal timing"],
        report.comparison.rows.map((c) => [
          c.facility,
          c.type,
          c.block,
          c.fromResult,
          c.fromScore ?? "-",
          dmy(c.fromCertifiedOn),
          dmy(c.fromValidTill),
          c.toResult,
          c.toScore ?? "-",
          dmy(c.toCertifiedOn),
          changeLabel(c.delta),
          c.timing.text,
        ]),
        { 4: "right", 8: "right" },
      );
    }
  }

  /* ---------------- List ---------------- */
  if (sections.includes("list")) {
    heading("Facility-cycles");
    table(
      ["Facility", "Type", "Block", "Cycle", "Result", "Score", "Certified on", "Valid till", "Days left", "Next action"],
      report.list.map((e) => [
        e.row.facility,
        e.row.type,
        e.row.block,
        `#${e.row.cycleNumber}`,
        e.resultLabel,
        e.score ?? "-",
        dmy(e.row.certDate),
        dmy(e.row.validityDate),
        e.daysLeft ?? "-",
        e.nextAction,
      ]),
      { 5: "right", 8: "right" },
    );
  }

  /* ---------------- Definitions ---------------- */
  heading("Definitions");
  table(
    ["Term", "Meaning"],
    report.definitions.map((d) => [d.term, d.meaning]),
  );
  stampChrome();
  return doc;
}

/** Download the Certification Cycles PDF for one view (or all of them). */
export async function exportCyclePdf(
  filename: string,
  rows: CycleReportRow[],
  meta: CycleExportMeta,
  settings: CycleReportSettings,
  view: CycleExportView = "full",
): Promise<void> {
  const doc = await buildCyclePdf(rows, meta, settings, view);
  doc.save(filename);
}
