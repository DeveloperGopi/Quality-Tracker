/**
 * LINKS ORGANISER EXPORTS — Excel (ExcelJS), PDF (jsPDF + autoTable), CSV and
 * a print sheet. All helpers are lazy-loaded by the page, so opening /links
 * never downloads an export library.
 *
 * Excel keeps real hyperlinks and a "More links" column, so the workbook
 * re-imports without losing URLs. PDF draws link LABELS with clickable
 * annotations instead of printing long URLs.
 */

import type { Workbook } from "exceljs";
import type {
  LinkFrequencyOption,
  LinkStatusDef,
  LinksConfig,
} from "@/lib/links";
import {
  formatLinkDate,
  frequencyLabel,
  linkColour,
  linkStatusDef,
  linkTableWidths,
  normalizeLinkUrl,
  safeLinkUrl,
} from "@/lib/links";
import { formatDateLong } from "@/lib/dateInput";

export type LinksExportUrl = {
  id?: string;
  label: string;
  url: string;
  type: string;
  kind: string;
  isPrimary: boolean;
};

export type LinksExportItem = {
  id: string;
  serial: number;
  categoryName: string;
  categoryColour: string;
  title: string;
  description: string | null;
  frequency: string;
  lastUpdated: string | null;
  nextDue: string | null;
  ownerName: string | null;
  level: string | null;
  status: string;
  remarks: string | null;
  visibility: string;
  urls: LinksExportUrl[];
  due: { state: string; days: number | null };
};

export type LinksExportOptions = {
  title?: string;
  subtitle?: string;
  fileName: string;
};

const HEADERS = [
  "S. No",
  "Category",
  "Report Name",
  "Frequency",
  "Last Updated",
  "Link",
  "More links",
  "Form Link",
  "Owner",
  "Level",
  "Status",
  "Remarks",
] as const;

const WIDTHS = [6, 18, 42, 18, 14, 42, 34, 34, 16, 10, 12, 32];

function primaryOf(item: LinksExportItem) {
  return item.urls.find((u) => u.kind !== "form" && u.isPrimary) ?? item.urls.find((u) => u.kind !== "form");
}
function formOf(item: LinksExportItem) {
  return item.urls.find((u) => u.kind === "form");
}
function extraLinks(item: LinksExportItem) {
  const primary = primaryOf(item);
  return item.urls.filter((u) => u.kind !== "form" && u !== primary);
}

function textOrDash(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/* -------------------------------------------------------------------------- */
/* Excel                                                                       */
/* -------------------------------------------------------------------------- */

/** Build the workbook without downloading it — used by the export button and
 *  by the round-trip test that reads the hyperlinks back. */
export async function buildLinksWorkbook(
  items: LinksExportItem[],
  config: LinksConfig,
  options: LinksExportOptions,
): Promise<Workbook> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "SaQsham · Links Organiser";
  wb.created = new Date();
  const ws = wb.addWorksheet("Links Organiser", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 1 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.35, right: 0.35, top: 0.55, bottom: 0.55, header: 0.2, footer: 0.2 },
      printTitlesRow: "1:1",
    },
  });
  ws.properties.defaultRowHeight = 30;
  const header = ws.addRow([...HEADERS]);
  header.height = 28;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E3D" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF9FD6C4" } } };
  });
  ws.autoFilter = { from: "A1", to: "L1" };
  ws.columns = WIDTHS.map((width) => ({ width }));

  const warning = "FFB45309";
  const statusColors: Record<string, string> = {
    Active: "FFCCFBF1",
    Completed: "FFD1FAE5",
    "On hold": "FFFEF3C7",
    Archived: "FFF1F5F9",
  };

  for (const item of items) {
    const primary = primaryOf(item);
    const form = formOf(item);
    const more = extraLinks(item);
    const row = ws.addRow([
      item.serial,
      item.categoryName,
      item.title,
      frequencyLabel(config, item.frequency),
      item.lastUpdated ? formatLinkDate(item.lastUpdated) : "-",
      primary?.label ?? "-",
      more.length
        ? more.map((u) => `${u.label} — ${safeLinkUrl(u.url)}`).join("\n")
        : "-",
      form?.label ?? "-",
      textOrDash(item.ownerName),
      item.level ?? "-",
      item.status,
      textOrDash(item.remarks),
    ]);
    row.height = Math.max(30, 15 * Math.max(1, more.length));
    row.eachCell((cell) => {
      cell.font = { size: 9, color: { argb: "FF20342E" } };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8E5" } } };
    });
    const categoryFill = linkColour(item.categoryColour).fill;
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: categoryFill } };
    row.getCell(2).font = { size: 9, bold: true, color: { argb: "FF20342E" } };
    const statusFill = statusColors[item.status] ?? "FFF1F5F9";
    row.getCell(11).fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusFill } };
    row.getCell(11).font = { size: 9, bold: true, color: { argb: "FF20342E" } };

    if (primary) {
      const cell = row.getCell(6);
      cell.value = { text: primary.label || safeLinkUrl(primary.url), hyperlink: primary.url };
      cell.font = { size: 9, color: { argb: "FF0563C1" }, underline: true };
    }
    if (form) {
      const cell = row.getCell(8);
      cell.value = { text: form.label || safeLinkUrl(form.url), hyperlink: form.url };
      cell.font = { size: 9, color: { argb: "FF6D28D9" }, underline: true };
    }
    if (more.length) {
      const cell = row.getCell(7);
      cell.value = more
        .map((u) => `${u.label || safeLinkUrl(u.url)}\n${u.url}`)
        .join("\n\n");
      cell.font = { size: 8, color: { argb: "FF0563C1" }, underline: true };
    }
    const dueCell = row.getCell(5);
    if (item.due.state === "overdue" || item.due.state === "never") {
      dueCell.font = { size: 9, bold: true, color: { argb: "FFB91C1C" } };
    } else if (item.due.state === "due-soon") {
      dueCell.font = { size: 9, bold: true, color: { argb: warning } };
    }
  }

  ws.headerFooter.oddFooter = `&L${options.title ?? "Links Organiser"}&C${options.subtitle ?? ""}&RPage &P of &N`;
  ws.pageSetup.printTitlesRow = "1:1";
  ws.views = [{ state: "frozen", xSplit: 3, ySplit: 1 }];
  return wb;
}

export async function exportLinksExcel(
  items: LinksExportItem[],
  config: LinksConfig,
  options: LinksExportOptions,
): Promise<void> {
  const wb = await buildLinksWorkbook(items, config, options);
  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(`${options.fileName}.xlsx`, new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }));
}

/* -------------------------------------------------------------------------- */
/* Template                                                                    */
/* -------------------------------------------------------------------------- */

export async function downloadLinksTemplate(input: {
  categories: string[];
  owners: string[];
  statuses: readonly LinkStatusDef[];
  frequencies: readonly LinkFrequencyOption[];
  fileName?: string;
}): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Links");
  ws.addRow([...HEADERS]);
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E3D" } };
  });
  ws.columns = WIDTHS.map((width) => ({ width }));
  ws.views = [{ state: "frozen", xSplit: 3, ySplit: 1 }];
  // A few empty input rows so the dropdowns are visible immediately.
  for (let i = 0; i < 20; i += 1) ws.addRow([]);
  const lastRow = 60;
  const addList = (col: string, values: readonly string[]) => {
    if (!values.length) return;
    for (let row = 2; row <= lastRow; row += 1) {
      ws.getCell(`${col}${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${values.join(",").replace(/"/g, '""')}"`],
      };
    }
  };
  addList("B", input.categories);
  addList("D", input.frequencies.map((f) => f.label));
  addList("I", input.owners);
  addList("K", input.statuses.map((s) => s.name));

  const instructions = wb.addWorksheet("Instructions");
  instructions.columns = [{ width: 26 }, { width: 92 }];
  const lines: [string, string][] = [
    ["How to use", "Fill the Links sheet, one report per row, then import it from Links Organiser → Import → Upload."],
    ["S. No", "Leave blank for new rows. In Update existing mode this is the match key."],
    ["Category", "Pick an existing category. A new value is offered as Create in the import review."],
    ["Report Name", "Required. Two rows with the same name and category can be merged into one report with 2 links."],
    ["Frequency", "Use the dropdown. “3 Months Once” is Quarterly. One-time / “-” has no next due."],
    ["Last Updated", "DD-MMM-YYYY or DD-MM-YYYY. A future date is rejected."],
    ["Link", "Paste an http(s) URL. Excel hyperlinks are preserved on import."],
    ["More links", "Optional. One URL per line; each becomes another link on the report."],
    ["Form Link", "Optional, one form URL per report."],
    ["Owner / Level", "Owner is the team. State Sheet and District Sheet are offered as Level, not Owner."],
    ["Status", "Active, Completed, On hold or Archived (Admin may add statuses)."],
    ["Remarks", "Free text, including a period such as “4th Quarter (2025-26)”."],
    ["Security", "Never paste a password, token or private key into a URL. Credential-bearing URLs are rejected."],
  ];
  lines.forEach(([a, b], i) => {
    const row = instructions.addRow([a, b]);
    row.getCell(1).font = { bold: i === 0, size: 10 };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  });
  instructions.getRow(1).height = 24;
  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(`${input.fileName ?? "Links Organiser template"}.xlsx`, new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }));
}

/* -------------------------------------------------------------------------- */
/* CSV                                                                         */
/* -------------------------------------------------------------------------- */

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportLinksCsv(
  items: LinksExportItem[],
  config: LinksConfig,
  options: LinksExportOptions,
): void {
  downloadBlob(
    `${options.fileName}.csv`,
    new Blob([`\uFEFF${linksCsv(items, config)}`], { type: "text/csv;charset=utf-8" }),
  );
}

export function linksCsv(items: LinksExportItem[], config: LinksConfig): string {
  const rows = items.map((item) => {
    const primary = primaryOf(item);
    const form = formOf(item);
    const more = extraLinks(item);
    return [
      item.serial,
      item.categoryName,
      item.title,
      frequencyLabel(config, item.frequency),
      item.lastUpdated ? formatLinkDate(item.lastUpdated) : "-",
      primary?.url ?? "",
      // One physical line per record: the CSV reader splits on newlines before
      // unquoting, so extra URLs stay pipe-separated inside the cell.
      more.map((u) => `${u.label} — ${u.url}`).join(" | "),
      form?.url ?? "",
      item.ownerName ?? "",
      item.level ?? "",
      item.status,
      item.remarks ?? "",
    ]
      .map(csvCell)
      .join(",");
  });
  return [
    ["S. No", "Category", "Report Name", "Frequency", "Last Updated", "Link", "More links", "Form Link", "Owner", "Level", "Status", "Remarks"]
      .map(csvCell)
      .join(","),
    ...rows,
  ].join("\r\n");
}

/* -------------------------------------------------------------------------- */
/* PDF                                                                         */
/* -------------------------------------------------------------------------- */

/** Build the PDF without downloading it — used by the export button and the
 *  annotation/round-trip tests. */
export async function buildLinksPdf(
  items: LinksExportItem[],
  config: LinksConfig,
  options: LinksExportOptions,
): Promise<import("jspdf").jsPDF> {
  const [{ jsPDF }, autoTableMod, { loadFont }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    import("@/lib/pdfFonts"),
  ]);
  const autoTable = autoTableMod.default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const fontFamily = "LinksNoto";
  let embedded = false;
  try {
    const regular = await loadFont("regular");
    const tamil = await loadFont("tamilMerged");
    if (regular && tamil) {
      doc.addFileToVFS("LinksNotoSansMerged.ttf", tamil.base64);
      doc.addFont("LinksNotoSansMerged.ttf", fontFamily, "normal");
      doc.addFont("LinksNotoSansMerged.ttf", fontFamily, "bold");
      embedded = true;
    } else if (regular) {
      doc.addFileToVFS(regular.file, regular.base64);
      doc.addFont(regular.file, fontFamily, "normal");
      doc.addFont(regular.file, fontFamily, "bold");
      embedded = true;
    }
  } catch {
    // Fall back to Helvetica; the export still works, the glyph coverage is
    // reported by the PDF test rather than failing the user's download.
  }
  if (!embedded) doc.setFont("helvetica");

  doc.setFont(fontFamily);
  doc.setFontSize(15);
  doc.setTextColor(31, 78, 61);
  doc.text(options.title ?? "Links Organiser", 32, 34);
  doc.setFontSize(8.5);
  doc.setTextColor(90, 103, 98);
  doc.text(options.subtitle ?? "", 32, 50);
  doc.setTextColor(30, 41, 36);

  const body: unknown[][] = [];
  /** Annotation target per body row: [primary link, form link]. */
  const rowUrls: Array<[string | null, string | null]> = [];
  const groups = new Map<string, LinksExportItem[]>();
  for (const item of items) {
    const list = groups.get(item.categoryName) ?? [];
    list.push(item);
    groups.set(item.categoryName, list);
  }
  for (const [category, rows] of groups) {
    body.push([
      {
        content: `${category} · ${rows.length}`,
        colSpan: 9,
        styles: {
          fontStyle: "bold",
          fillColor: [229, 242, 236],
          textColor: [31, 78, 61],
          fontSize: 8,
        },
      },
    ]);
    rowUrls.push([null, null]);
    for (const item of rows) {
      const primary = primaryOf(item);
      const form = formOf(item);
      const extra = extraLinks(item).length;
      const due =
        item.due.state === "overdue"
          ? `Overdue (${Math.abs(item.due.days ?? 0)}d)`
          : item.due.state === "due-soon"
            ? `Due soon (${item.due.days ?? 0}d)`
            : item.due.state === "never"
              ? "Never updated"
              : item.nextDue
                ? formatLinkDate(item.nextDue)
                : "-";
      body.push([
        String(item.serial),
        item.title,
        frequencyLabel(config, item.frequency),
        item.lastUpdated ? formatLinkDate(item.lastUpdated) : "-",
        due,
        primary?.label || (primary ? safeLinkUrl(primary.url) : "-"),
        extra ? `+${extra}` : "-",
        form?.label || "-",
        item.status,
      ]);
      rowUrls.push([
        primary ? safeLinkUrl(primary.url) : null,
        form ? safeLinkUrl(form.url) : null,
      ]);
    }
  }

  autoTable(doc, {
    startY: 62,
    head: [["S. No", "Report Name", "Frequency", "Last Updated", "Next Due", "Link", "More", "Form link", "Status"]],
    body: body as never,
    theme: "grid",
    styles: {
      font: fontFamily,
      fontSize: 7.5,
      cellPadding: 4,
      overflow: "linebreak",
      textColor: [30, 41, 36],
      lineColor: [220, 228, 224],
      lineWidth: 0.4,
    },
    headStyles: {
      font: fontFamily,
      fillColor: [31, 78, 61],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    columnStyles: {
      // Landscape A4 minus the 28 pt margins (785.89 pt). The widths sum to
      // 785.88 so autoTable distributes no leftover and never warns/clips.
      0: { cellWidth: 30 },
      1: { cellWidth: 160, fontStyle: "bold" },
      2: { cellWidth: 84 },
      3: { cellWidth: 78 },
      4: { cellWidth: 84 },
      5: { cellWidth: 160 },
      6: { cellWidth: 42 },
      7: { cellWidth: 84 },
      8: { cellWidth: 63.88 },
    },
    margin: { left: 28, right: 28, top: 50, bottom: 40 },
    rowPageBreak: "avoid",
    didDrawPage: (data: any) => {
      const page = doc.getNumberOfPages();
      doc.setFont(fontFamily);
      doc.setFontSize(7);
      doc.setTextColor(100, 110, 105);
      doc.text(
        `${options.title ?? "Links Organiser"} · ${options.subtitle ?? ""}`,
        28,
        doc.internal.pageSize.getHeight() - 16,
      );
      doc.text(
        `Page ${page}`,
        doc.internal.pageSize.getWidth() - 44,
        doc.internal.pageSize.getHeight() - 16,
      );
      void data;
    },
    willDrawCell: (data: any) => {
      if (data.section !== "body") return;
      if (data.column.index !== 5 && data.column.index !== 7) return;
      const urls = rowUrls[data.row.index];
      const url = data.column.index === 5 ? urls?.[0] : urls?.[1];
      if (!url) return;
      data.cell.styles.textColor = [5, 99, 193];
      data.cell.styles.fontStyle = "normal";
    },
    didDrawCell: (data: any) => {
      if (data.section !== "body") return;
      if (data.column.index !== 5 && data.column.index !== 7) return;
      const urls = rowUrls[data.row.index];
      const url = data.column.index === 5 ? urls?.[0] : urls?.[1];
      if (!url) return;
      doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
    },
  } as never);

  return doc;
}

export async function exportLinksPdf(
  items: LinksExportItem[],
  config: LinksConfig,
  options: LinksExportOptions,
): Promise<void> {
  const doc = await buildLinksPdf(items, config, options);
  downloadBlob(`${options.fileName}.pdf`, doc.output("blob"));
}

/* -------------------------------------------------------------------------- */
/* Print                                                                       */
/* -------------------------------------------------------------------------- */

export function printLinks(
  items: LinksExportItem[],
  config: LinksConfig,
  options: LinksExportOptions,
): void {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  const esc = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const rows = items
    .map((item) => {
      const primary = primaryOf(item);
      const form = formOf(item);
      return `<tr>
        <td>${item.serial}</td>
        <td>${esc(item.categoryName)}</td>
        <td><strong>${esc(item.title)}</strong>${item.description ? `<div class="muted">${esc(item.description)}</div>` : ""}</td>
        <td>${esc(frequencyLabel(config, item.frequency))}</td>
        <td>${item.lastUpdated ? formatLinkDate(item.lastUpdated) : "-"}</td>
        <td>${item.nextDue ? formatLinkDate(item.nextDue) : "-"}</td>
        <td>${primary ? `<a href="${esc(primary.url)}">${esc(primary.label)}</a>` : "-"}</td>
        <td>${form ? `<a href="${esc(form.url)}">${esc(form.label)}</a>` : "-"}</td>
        <td>${esc(item.ownerName ?? "-")}</td>
        <td>${esc(item.status)}</td>
        <td>${esc(item.remarks ?? "-")}</td>
      </tr>`;
    })
    .join("");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(options.fileName)}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: "Noto Sans", "Noto Sans Tamil", system-ui, sans-serif; color:#1e2924; font-size:9px; }
      h1 { font-size:16px; margin:0; color:#1f4e3d; }
      p.sub { margin:3px 0 10px; color:#5a6762; font-size:9px; }
      table { width:100%; border-collapse:collapse; }
      thead { display:table-header-group; }
      tr { page-break-inside:avoid; }
      th { background:#1f4e3d; color:#fff; text-align:left; padding:5px; font-size:8px; }
      td { border-bottom:1px solid #dce4e0; padding:5px; vertical-align:top; }
      td:nth-child(3) { min-width:160px; }
      a { color:#0563c1; text-decoration:none; }
      .muted { color:#66736d; font-size:8px; margin-top:2px; }
      footer { margin-top:8px; font-size:8px; color:#66736d; }
    </style></head><body>
    <h1>${esc(options.title ?? "Links Organiser")}</h1>
    <p class="sub">${esc(options.subtitle ?? "")} · ${formatDateLong(new Date().toISOString().slice(0, 10))}</p>
    <table><thead><tr><th>S. No</th><th>Category</th><th>Report Name</th><th>Frequency</th><th>Last Updated</th><th>Next Due</th><th>Link</th><th>Form link</th><th>Owner</th><th>Status</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table>
    <footer>District Quality Assurance Unit · Links Organiser</footer>
    </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

/** Kept for the UI: the number of links shown in the header. */
export function totalLinkCount(items: LinksExportItem[]): number {
  return items.reduce((n, item) => n + item.urls.length, 0);
}

/** The widths are also used by the table contract test. */
export const LINK_EXPORT_WIDTHS = linkTableWidths();
