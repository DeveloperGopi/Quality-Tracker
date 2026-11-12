/**
 * DECK EXCEL EXPORT — sheets per section, REAL numbers and live formulas.
 *
 * The NQAS Summary Report's "Excel" action writes this workbook so the page
 * and the workbook can never disagree: both read `buildDeckModel`.
 *
 * Structure: Cover · one sheet per section (Summary, Facility profile,
 * Certification progress, Assessment, Certification & trends, Close) ·
 * Definitions. Tables keep their columns, every total row is a SUM formula
 * over the rows above it, and the print setup repeats the title rows.
 */

import type { Worksheet } from "exceljs";
import type { DeckModel, SlideBlock } from "./deckModel";
import { DECK_SECTIONS } from "./deckModel";

const HEADER_FILL = "FF115E58";
const MIST_FILL = "FFEAF4F2";
const BORDER = "FFD6E2E0";

export type DeckExcelOptions = {
  hidden?: readonly string[];
  fileName?: string;
};

const isNumeric = (v: string) => v.trim() !== "" && !Number.isNaN(Number(v.replace(/[,%]/g, "")));

function numeric(v: string): number | null {
  if (!isNumeric(v)) return null;
  return Number(v.replace(/[,%]/g, ""));
}

function download(buf: ArrayBuffer, fileName: string) {
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportDeckExcel(
  model: DeckModel,
  options: DeckExcelOptions = {},
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = model.meta.orgName;
  wb.title = `${model.meta.deckTitle} — ${model.meta.district}`;
  wb.created = new Date();

  const hidden = new Set(options.hidden ?? []);
  const slides = model.slides.filter((s) => !hidden.has(s.id));

  const styleTitle = (ws: Worksheet, text: string, subtitle?: string) => {
    ws.mergeCells("A1:F1");
    const c = ws.getCell("A1");
    c.value = text;
    c.font = { bold: true, size: 15, color: { argb: "FF12302E" } };
    ws.getRow(1).height = 24;
    ws.mergeCells("A2:F2");
    const s = ws.getCell("A2");
    s.value = subtitle ?? `${model.meta.orgName} · ${model.meta.reportId} · Data as of ${model.meta.dataAsOf}`;
    s.font = { size: 9, color: { argb: "FF5B7472" } };
    ws.getRow(4).values = [];
  };

  /* ---- Cover ---- */
  const cover = wb.addWorksheet("Cover", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });
  cover.columns = [{ width: 30 }, { width: 40 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];
  styleTitle(cover, `${model.meta.deckTitle} — ${model.meta.district}`, model.meta.periodLabel);
  const coverRows: [string, string | number][] = [
    ["Organisation", model.meta.orgName],
    ["Report ID", model.meta.reportId],
    ["Data as of", model.meta.dataAsOf],
    ["Filters", model.meta.filtersLabel],
    ["Period", model.meta.periodLabel],
    ["Facilities in scope", model.meta.totalFacilities],
    ["Hold a certificate", model.meta.holdCertificate],
    ["In Certified stage", model.meta.certifiedStage],
    ["Quality Certified", model.data.qualityCount],
    ["With conditionality", model.data.condCount],
    ["Data checks", model.checks.totalIssues],
    ["Reconciliation failures", model.checks.failed],
  ];
  coverRows.forEach(([k, v], i) => {
    const row = cover.getRow(5 + i);
    row.getCell(1).value = k;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = v;
  });

  /* ---- One sheet per section ---- */
  for (const section of DECK_SECTIONS) {
    const sectionSlides = slides.filter((s) => s.section === section.id);
    if (sectionSlides.length === 0) continue;
    const ws = wb.addWorksheet(section.label.slice(0, 31), {
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printTitlesRow: "6:6",
      },
      headerFooter: {
        oddFooter: `${model.meta.reportId} · Page &P of &N`,
      },
      views: [{ state: "frozen", ySplit: 6 }],
    });
    ws.columns = [
      { width: 34 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
    ];
    styleTitle(ws, section.label, `${model.meta.deckTitle} · ${model.meta.filtersLabel}`);

    let row = 4;
    for (const slide of sectionSlides) {
      ws.getCell(`A${row}`).value = slide.title;
      ws.getCell(`A${row}`).font = { bold: true, size: 12, color: { argb: "FF0F6B63" } };
      row += 1;
      if (slide.subtitle) {
        ws.mergeCells(`A${row}:F${row}`);
        ws.getCell(`A${row}`).value = slide.subtitle;
        ws.getCell(`A${row}`).font = { italic: true, color: { argb: "FF5B7472" } };
        row += 1;
      }

      for (const block of slide.columns.flat()) {
        row = writeBlock(ws, block, row);
        row += 1;
      }
      row += 1;
    }
    ws.eachRow((r) => {
      r.eachCell((c) => {
        c.border = {
          top: { style: "hair", color: { argb: BORDER } },
          bottom: { style: "hair", color: { argb: BORDER } },
          left: { style: "hair", color: { argb: BORDER } },
          right: { style: "hair", color: { argb: BORDER } },
        };
      });
    });
  }

  /* ---- Definitions ---- */
  const defs = wb.addWorksheet("Definitions", {
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1 },
  });
  defs.columns = [{ width: 34 }, { width: 110 }];
  styleTitle(defs, "Definitions and method");
  const defSlide = model.slides.find((s) => s.id === "defs");
  let dr = 4;
  for (const block of defSlide?.columns.flat() ?? []) {
    if (block.kind !== "defs") continue;
    for (const item of block.items) {
      defs.getCell(`A${dr}`).value = item.term;
      defs.getCell(`A${dr}`).font = { bold: true };
      defs.getCell(`B${dr}`).value = item.definition;
      defs.getCell(`B${dr}`).alignment = { wrapText: true, vertical: "top" };
      dr += 1;
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  download(
    buffer as ArrayBuffer,
    options.fileName ??
      `nqas-summary-report-${model.meta.reportId.slice(-8)}.xlsx`,
  );
}

function writeBlock(ws: Worksheet, block: SlideBlock, startRow: number): number {
  let row = startRow;
  switch (block.kind) {
    case "kpis": {
      ws.getRow(row).values = ["Measure", "Value", "Note"];
      headerRow(ws, row);
      row += 1;
      for (const item of block.items) {
        ws.getRow(row).values = [item.label, item.value, item.note ?? ""];
        row += 1;
      }
      return row;
    }
    case "bars": {
      if (block.title) {
        ws.getCell(`A${row}`).value = block.title;
        ws.getCell(`A${row}`).font = { bold: true };
        row += 1;
      }
      ws.getRow(row).values = ["Category", "Count"];
      headerRow(ws, row);
      row += 1;
      const first = row;
      for (const item of block.items) {
        ws.getRow(row).values = [item.label, item.display ?? item.value];
        row += 1;
      }
      ws.getCell(`A${row}`).value = "Total";
      ws.getCell(`A${row}`).font = { bold: true };
      ws.getCell(`B${row}`).value = { formula: `SUM(B${first}:B${row - 1})` };
      ws.getCell(`B${row}`).font = { bold: true };
      if (block.note) {
        row += 1;
        ws.mergeCells(`A${row}:F${row}`);
        ws.getCell(`A${row}`).value = block.note;
      }
      return row + 1;
    }
    case "stacked": {
      if (block.title) {
        ws.getCell(`A${row}`).value = block.title;
        ws.getCell(`A${row}`).font = { bold: true };
        row += 1;
      }
      ws.getRow(row).values = ["Segment", "Facilities", "Share"];
      headerRow(ws, row);
      row += 1;
      const total = block.segments.reduce((a, s) => a + s.value, 0);
      const first = row;
      for (const seg of block.segments) {
        ws.getRow(row).values = [
          seg.label,
          seg.value,
          { formula: `IFERROR(B${row}/SUM(B${first}:B${first + block.segments.length - 1}),0)` },
        ];
        ws.getCell(`C${row}`).numFmt = "0%";
        row += 1;
      }
      ws.getCell(`A${row}`).value = "Total";
      ws.getCell(`A${row}`).font = { bold: true };
      ws.getCell(`B${row}`).value = { formula: `SUM(B${first}:B${row - 1})` };
      ws.getCell(`B${row}`).font = { bold: true };
      void total;
      return row + 1;
    }
    case "table": {
      if (block.title) {
        ws.getCell(`A${row}`).value = block.title;
        ws.getCell(`A${row}`).font = { bold: true };
        row += 1;
      }
      ws.getRow(row).values = block.head;
      headerRow(ws, row);
      row += 1;
      const first = row;
      for (const r of block.rows) {
        ws.getRow(row).values = r.map((cell) => (isNumeric(cell) ? numeric(cell)! : cell));
        row += 1;
      }
      const last = row - 1;
      if (block.totalRow) {
        ws.getRow(row).values = block.totalRow.map((cell, i) => {
          if (i === 0) return cell;
          // A total column is a live formula over the rows above it whenever
          // those cells are numeric — never a typed number.
          const numericColumn = block.rows.every((r) => r[i] == null || isNumeric(r[i]));
          if (numericColumn && block.rows.length > 0) {
            const col = String.fromCharCode(65 + i);
            return { formula: `SUM(${col}${first}:${col}${last})` };
          }
          return isNumeric(cell) ? numeric(cell)! : cell;
        });
        ws.getRow(row).font = { bold: true };
        row += 1;
      }
      if (block.note) {
        ws.mergeCells(`A${row}:F${row}`);
        ws.getCell(`A${row}`).value = block.note;
        ws.getCell(`A${row}`).font = { italic: true, color: { argb: "FF5B7472" } };
        row += 1;
      }
      return row;
    }
    case "heatmap": {
      ws.getRow(row).values = ["Year", ...block.monthLabels, "Total"];
      headerRow(ws, row);
      row += 1;
      for (const r of block.rows) {
        ws.getRow(row).values = [r.label, ...r.cells, { formula: `SUM(B${row}:M${row})` }];
        row += 1;
      }
      ws.getRow(row).values = [block.totalLabel, ...block.totalCells, block.grandTotal];
      ws.getRow(row).font = { bold: true };
      return row + 1;
    }
    case "donut": {
      if (block.title) {
        ws.getCell(`A${row}`).value = block.title;
        ws.getCell(`A${row}`).font = { bold: true };
        row += 1;
      }
      ws.getRow(row).values = ["Status", "Facilities", "Share"];
      headerRow(ws, row);
      row += 1;
      const first = row;
      for (const seg of block.segments) {
        ws.getRow(row).values = [
          seg.label,
          seg.value,
          {
            formula: `IFERROR(B${row}/SUM(B${first}:B${first + block.segments.length - 1}),0)`,
          },
        ];
        ws.getCell(`C${row}`).numFmt = "0%";
        row += 1;
      }
      ws.getCell(`A${row}`).value = "Total";
      ws.getCell(`A${row}`).font = { bold: true };
      ws.getCell(`B${row}`).value = { formula: `SUM(B${first}:B${row - 1})` };
      ws.getCell(`B${row}`).font = { bold: true };
      if (block.caption) {
        row += 1;
        ws.mergeCells(`A${row}:F${row}`);
        ws.getCell(`A${row}`).value = block.caption;
      }
      return row + 1;
    }
    case "cards": {
      for (const item of block.items) {
        ws.getRow(row).values = [item.title, item.big, item.line];
        row += 1;
        if (item.body) {
          ws.mergeCells(`A${row}:F${row}`);
          ws.getCell(`A${row}`).value = item.body;
          row += 1;
        }
      }
      return row;
    }
    case "facts": {
      for (const item of block.items) {
        ws.getRow(row).values = [item.big, item.text];
        row += 1;
      }
      return row;
    }
    case "takeaways": {
      for (const item of block.items) {
        ws.getRow(row).values = [item.n, item.title, item.body];
        row += 1;
      }
      return row;
    }
    case "defs": {
      for (const item of block.items) {
        ws.getRow(row).values = [item.term, item.definition];
        ws.getCell(`A${row}`).font = { bold: true };
        ws.getCell(`B${row}`).alignment = { wrapText: true };
        row += 1;
      }
      return row;
    }
    case "text": {
      ws.mergeCells(`A${row}:F${row}`);
      ws.getCell(`A${row}`).value = block.body;
      ws.getCell(`A${row}`).alignment = { wrapText: true };
      return row + 1;
    }
    case "bullets": {
      if (block.title) {
        ws.getCell(`A${row}`).value = block.title;
        ws.getCell(`A${row}`).font = { bold: true };
        row += 1;
      }
      for (const item of block.items) {
        ws.mergeCells(`A${row}:F${row}`);
        ws.getCell(`A${row}`).value = `• ${item}`;
        ws.getCell(`A${row}`).alignment = { wrapText: true };
        row += 1;
      }
      return row;
    }
  }
}

function headerRow(ws: Worksheet, row: number) {
  ws.getRow(row).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  });
  ws.getRow(row).fill = { type: "pattern", pattern: "solid", fgColor: { argb: MIST_FILL } };
}
