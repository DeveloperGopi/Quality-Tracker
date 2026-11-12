const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-exceljs-CqnmHTS6.js","assets/icons-BxQpodNr.js"])))=>i.map(i=>d[i]);
import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, b5 as ListTodo, Q as Search, a3 as X, aW as Funnel, I as Info, aP as Circle, T as TriangleAlert, b6 as MessageSquarePlus, b7 as Wrench, N as CalendarClock, a2 as Download, u as FileText, L as LoaderCircle, H as ChevronDown, F as FileSpreadsheet } from './icons-BxQpodNr.js';
import { l as useQuery, j as api, m as useMutation, d as useSearchParams, B as Button, c as cn, t as toast } from './index-CBV6wOh8.js';
import { aQ as pendingCounts, aR as ISSUE_CATEGORY_LABEL, aS as ISSUE_SEVERITY_LABEL, aT as ISSUE_STATUS_LABEL, aU as dmy, u as useCycleScope, R as RULE_BY_ID, j as normalizePendingConfig, aV as normalizeDocumentRules, aW as mergeIssueStates, aX as isoDate, aY as ISSUE_CATEGORIES, aZ as ISSUE_STATUSES, a_ as pendingFileName, z as resolveLabels, M as MASTER_COLUMNS, A as AppShell, a$ as dueLabel, b0 as pendingHeadline } from './AppShell-CP099uvN.js';
import { F as FacilityCell } from './FacilityCell-CI45DpPw.js';
import { I as Input } from './input-Cy2oZLur.js';
import { T as Textarea } from './textarea-Dm9kSFQo.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from './dialog-BW3GEiPg.js';
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, f as DropdownMenuItem } from './dropdown-menu-N0nU9bdA.js';
import { l as loadBarState, r as rowPasses, f as filterChipLabel, U as UniversalFilterBar, s as saveBarState } from './UniversalFilterBar-uuD2kW1Y.js';
import { D as DateInput } from './DateInput-DZAT80St.js';
import { F as FacilityQuickView, t as trackerUpdatePayload } from './FacilityQuickView-D07vvNqK.js';
import { t as todayLocalIso } from './today-D9v8Esj5.js';
import { c as computePendingInWorker } from './pendingComputeClient-CG7Te_eH.js';
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { a as ORG_NAME, O as ORG_SIGNATURE } from './org-DjtYn14q.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';
import './FacilityTypeBadge-8G3otPEU.js';
import './dateInput-0KZh0HdG.js';
import './skeleton-D-jVDmpg.js';
import './PdfCanvasViewer-C0MZuH_2.js';
import './DocumentField-4d87_sVm.js';
import './scoreBands-CA46Kez8.js';
import './select-qTILnHQg.js';
import './phone-C-n0eG_z.js';
import './AttachmentPicker-B8WtH0vb.js';
import './StatusBadge-BPGGn135.js';
import './masterFilter-DrauVhuN.js';
import './facilityQuickView-BCxVjMPj.js';
import './facilityProfileState-D76_z1Ay.js';
import './SaveBar--TNBfs1X.js';

const COVER_FILL = "FF1F4E3D";
const HEADER_FILL = "FF1F4E3D";
const ZEBRA_FILL = "FFF4F8F7";
const STATUS_FILL = {
  Open: "FFFEF3C7",
  "In progress": "FFE0F2FE",
  Snoozed: "FFEDE9FE",
  Resolved: "FFD1FAE5"
};
const SEVERITY_FILL = {
  High: "FFFFE4E6",
  Medium: "FFFEF3C7",
  Low: "FFF1F5F9"
};
function downloadBlob(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 3e4);
}
const orDash = (value) => value && value.trim() ? value : "-";
const ISSUE_HEADERS = [
  "Facility",
  "Block",
  "PHC",
  "Facility Type",
  "Category",
  "Severity",
  "Issue / reason",
  "Since",
  "Days",
  "Cycle",
  "Remark",
  "Follow-up",
  "Assigned to",
  "Status",
  "Action"
];
const ISSUE_WIDTHS = [32, 16, 16, 13, 20, 10, 58, 13, 8, 8, 34, 13, 16, 13, 14];
function styleHeader(row) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FF9FD6C4" } } };
  });
}
async function buildPendingWorkbook(rows, meta) {
  const ExcelJS = (await __vitePreload(async () => { const {default: __vite_default__} = await import('./vendor-exceljs-CqnmHTS6.js').then(n => n.e);return { default: __vite_default__ }},true              ?__vite__mapDeps([0,1]):void 0)).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = `${ORG_NAME} · Pending & Follow-up`;
  wb.created = /* @__PURE__ */ new Date();
  const counts = pendingCounts(rows);
  const cover = wb.addWorksheet("Cover", {
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
  });
  cover.columns = [{ width: 3 }, { width: 36 }, { width: 52 }, { width: 3 }];
  cover.mergeCells("B2:C3");
  const mark = cover.getCell("B2");
  mark.value = "NQAS";
  mark.font = { size: 30, bold: true, color: { argb: "FFFFFFFF" } };
  mark.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COVER_FILL } };
  mark.alignment = { vertical: "middle", horizontal: "center" };
  cover.getCell("B5").value = ORG_NAME;
  cover.getCell("B5").font = { size: 15, bold: true, color: { argb: COVER_FILL } };
  cover.mergeCells("B5:C5");
  cover.getCell("B6").value = "Pending & Follow-up";
  cover.getCell("B6").font = { size: 22, bold: true };
  cover.mergeCells("B6:C6");
  cover.getCell("B7").value = "Every facility with something missing, not updated, overdue or needing attention";
  cover.getCell("B7").font = { size: 10, color: { argb: "FF475569" } };
  cover.mergeCells("B7:C7");
  const metaRows = [
    ["District", meta.district || "District"],
    ["Data as of", meta.dataAsOf],
    ["Filters", meta.filtersText || "None — all facilities"],
    ["Issues", `${counts.total} issues · ${counts.facilities} facilities · ${counts.high} High`],
    ["Generated by", meta.generatedBy],
    ["Organisation", ORG_SIGNATURE]
  ];
  let metaY = 10;
  for (const [label, value] of metaRows) {
    cover.getCell(`B${metaY}`).value = label;
    cover.getCell(`B${metaY}`).font = { bold: true, size: 10, color: { argb: "FF334155" } };
    cover.getCell(`C${metaY}`).value = value;
    cover.getCell(`C${metaY}`).font = { size: 10, color: { argb: "FF0F172A" } };
    cover.getCell(`C${metaY}`).alignment = { wrapText: true, vertical: "top" };
    metaY += 1;
  }
  cover.getCell(`B${metaY + 2}`).value = "Reasons and remarks are reproduced exactly as shown on screen. A blank cell is '-' and never 0.";
  cover.getCell(`B${metaY + 2}`).font = { size: 9, italic: true, color: { argb: "FF64748B" } };
  cover.mergeCells(`B${metaY + 2}:C${metaY + 2}`);
  cover.headerFooter.oddFooter = `&L${ORG_NAME}&RPage &P of &N`;
  const summary = wb.addWorksheet("Summary", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, printTitlesRow: "1:1" }
  });
  summary.columns = [{ width: 34 }, { width: 14 }, { width: 14 }, { width: 14 }];
  const sHead = summary.addRow(["Group", "Issues", "Facilities", "High"]);
  styleHeader(sHead);
  summary.addRow(["All issues", counts.total, counts.facilities, counts.high]).font = { bold: true };
  summary.addRow([]);
  const byCatHead = summary.addRow(["Category", "Issues", "Facilities", "High"]);
  styleHeader(byCatHead);
  const catOrder = Object.keys(ISSUE_CATEGORY_LABEL);
  for (const category of catOrder) {
    const catRows = rows.filter((row) => row.category === category);
    summary.addRow([
      ISSUE_CATEGORY_LABEL[category],
      catRows.length,
      new Set(catRows.map((row) => row.facilityId)).size,
      catRows.filter((row) => row.severity === "high").length
    ]);
  }
  summary.addRow([]);
  const bySev = summary.addRow(["Severity", "Issues", "", ""]);
  styleHeader(bySev);
  for (const severity of ["high", "medium", "low"]) {
    summary.addRow([
      ISSUE_SEVERITY_LABEL[severity],
      rows.filter((row) => row.severity === severity).length,
      new Set(rows.filter((row) => row.severity === severity).map((row) => row.facilityId)).size,
      ""
    ]);
  }
  summary.addRow([]);
  const byBlock = summary.addRow(["Block", "Issues", "Facilities", "High"]);
  styleHeader(byBlock);
  const blocks = [...new Set(rows.map((row) => row.block || "-"))].sort((a, b) => a.localeCompare(b));
  for (const block of blocks) {
    const blockRows = rows.filter((row) => (row.block || "-") === block);
    summary.addRow([
      block,
      blockRows.length,
      new Set(blockRows.map((row) => row.facilityId)).size,
      blockRows.filter((row) => row.severity === "high").length
    ]);
  }
  summary.headerFooter.oddFooter = `&L${ORG_NAME} · Pending & Follow-up&C${meta.dataAsOf}&RPage &P of &N`;
  const issues = wb.addWorksheet("Issues", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 1 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "1:1",
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
    }
  });
  issues.columns = ISSUE_WIDTHS.map((width) => ({ width }));
  const issueHead = issues.addRow([...ISSUE_HEADERS]);
  styleHeader(issueHead);
  issues.autoFilter = { from: "A1", to: "O1" };
  rows.forEach((row, index) => {
    const values = [
      row.facilityName,
      row.block,
      row.phc,
      row.facilityType,
      ISSUE_CATEGORY_LABEL[row.category],
      ISSUE_SEVERITY_LABEL[row.severity],
      row.reason,
      row.since ? dmy(row.since) : "-",
      row.days == null ? "-" : row.days,
      row.cycleNumber != null ? `#${row.cycleNumber}` : "-",
      orDash(row.remark),
      row.followUpDate ? dmy(row.followUpDate) : "-",
      orDash(row.assignee),
      ISSUE_STATUS_LABEL[row.status],
      row.history ? "View" : "Fix"
    ];
    const excelRow = issues.addRow(values);
    excelRow.height = 42;
    excelRow.eachCell((cell) => {
      cell.font = { size: 9, color: { argb: "FF20342E" } };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8E5" } } };
    });
    if (index % 2 === 1) {
      excelRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA_FILL } };
      });
    }
    excelRow.getCell(1).font = { size: 9, bold: true, color: { argb: "FF20342E" } };
    const severity = ISSUE_SEVERITY_LABEL[row.severity];
    excelRow.getCell(6).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: SEVERITY_FILL[severity] ?? "FFF1F5F9" }
    };
    excelRow.getCell(6).font = { size: 9, bold: true, color: { argb: "FF20342E" } };
    const status = ISSUE_STATUS_LABEL[row.status];
    excelRow.getCell(14).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: STATUS_FILL[status] ?? "FFF1F5F9" }
    };
    excelRow.getCell(14).font = { size: 9, bold: true, color: { argb: "FF20342E" } };
  });
  issues.headerFooter.oddFooter = `&L${ORG_NAME}&CPending & Follow-up · ${meta.dataAsOf}&RPage &P of &N`;
  const byFacility = wb.addWorksheet("By facility", {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, printTitlesRow: "1:1" }
  });
  byFacility.columns = [
    { width: 34 },
    { width: 16 },
    { width: 16 },
    { width: 13 },
    { width: 9 },
    { width: 9 },
    { width: 34 },
    { width: 48 }
  ];
  const facilityHead = byFacility.addRow([
    "Facility",
    "Block",
    "PHC",
    "Facility Type",
    "Issues",
    "High",
    "Categories",
    "Open reasons"
  ]);
  styleHeader(facilityHead);
  byFacility.autoFilter = { from: "A1", to: "H1" };
  const facilityIds = [...new Set(rows.map((row) => row.facilityId))];
  for (const facilityId of facilityIds) {
    const list = rows.filter((row) => row.facilityId === facilityId);
    const first = list[0];
    const facilityRow = byFacility.addRow([
      first.facilityName,
      first.block,
      first.phc,
      first.facilityType,
      list.length,
      list.filter((row) => row.severity === "high").length,
      [...new Set(list.map((row) => ISSUE_CATEGORY_LABEL[row.category]))].join(", "),
      list.map((row) => row.reason).join("\n")
    ]);
    facilityRow.height = Math.max(30, Math.min(120, 14 * list.length));
    facilityRow.eachCell((cell) => {
      cell.font = { size: 9, color: { argb: "FF20342E" } };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8E5" } } };
    });
    facilityRow.getCell(1).font = { size: 9, bold: true };
  }
  byFacility.headerFooter.oddFooter = `&L${ORG_NAME}&CPending & Follow-up · ${meta.dataAsOf}&RPage &P of &N`;
  return wb;
}
async function exportPendingExcel(rows, meta) {
  const wb = await buildPendingWorkbook(rows, meta);
  const buffer = await wb.xlsx.writeBuffer();
  const fileName = `${meta.fileNameBase}.xlsx`;
  downloadBlob(
    fileName,
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    })
  );
  return { fileName, rows: rows.length };
}
const csvCell = (value) => {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
function pendingCsv(rows) {
  const head = ISSUE_HEADERS.map(csvCell).join(",");
  const body = rows.map(
    (row) => [
      row.facilityName,
      row.block,
      row.phc,
      row.facilityType,
      ISSUE_CATEGORY_LABEL[row.category],
      ISSUE_SEVERITY_LABEL[row.severity],
      row.reason,
      row.since ? dmy(row.since) : "-",
      row.days ?? "-",
      row.cycleNumber != null ? `#${row.cycleNumber}` : "-",
      row.remark ?? "",
      row.followUpDate ? dmy(row.followUpDate) : "",
      row.assignee ?? "",
      ISSUE_STATUS_LABEL[row.status],
      row.history ? "View" : "Fix"
    ].map(csvCell).join(",")
  );
  return `\uFEFF${[head, ...body].join("\r\n")}\r
`;
}
function exportPendingCsv(rows, meta) {
  const fileName = `${meta.fileNameBase}.csv`;
  downloadBlob(fileName, new Blob([pendingCsv(rows)], { type: "text/csv;charset=utf-8" }));
  return { fileName, rows: rows.length };
}
async function buildPendingPdf(rows, meta) {
  const [{ jsPDF }, autoTableMod, { loadFont }] = await Promise.all([
    __vitePreload(() => import('./vendor-jspdf-BarNdCns.js').then(n => n.j),true              ?[]:void 0),
    __vitePreload(() => import('./vendor-jspdf-BarNdCns.js').then(n => n.b),true              ?[]:void 0),
    __vitePreload(() => import('./pdfFonts-DsWGLT77.js'),true              ?[]:void 0)
  ]);
  const autoTable = autoTableMod.default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const family = "PendingNoto";
  let embedded = false;
  try {
    const tamil = await loadFont("tamilMerged");
    const regular = await loadFont("regular");
    const face = tamil ?? regular;
    if (face) {
      doc.addFileToVFS("PendingNotoSans.ttf", face.base64);
      doc.addFont("PendingNotoSans.ttf", family, "normal");
      doc.addFont("PendingNotoSans.ttf", family, "bold");
      embedded = true;
    }
  } catch {
  }
  if (!embedded) doc.setFont("helvetica");
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 28;
  const counts = pendingCounts(rows);
  doc.setFont(family);
  doc.setTextColor(31, 78, 61);
  doc.setFontSize(16);
  doc.text("Pending & Follow-up", margin, 36);
  doc.setFontSize(9);
  doc.setTextColor(90, 103, 98);
  doc.text(ORG_NAME, pageW - margin, 30, { align: "right" });
  doc.text(`Data as of ${meta.dataAsOf}`, pageW - margin, 42, { align: "right" });
  doc.setTextColor(30, 41, 36);
  doc.setFontSize(8.5);
  doc.text(
    `${counts.total} issues · ${counts.facilities} facilities · ${counts.high} High` + (meta.filtersText ? ` · ${meta.filtersText}` : ""),
    margin,
    52
  );
  const summaryBody = [];
  for (const category of Object.keys(ISSUE_CATEGORY_LABEL)) {
    const catRows = rows.filter((row) => row.category === category);
    summaryBody.push([
      ISSUE_CATEGORY_LABEL[category],
      String(catRows.length),
      String(new Set(catRows.map((row) => row.facilityId)).size),
      String(catRows.filter((row) => row.severity === "high").length)
    ]);
  }
  summaryBody.push(["All issues", String(counts.total), String(counts.facilities), String(counts.high)]);
  autoTable(doc, {
    startY: 64,
    // The four fixed columns sum to 550 pt; declaring it avoids autoTable's
    // misleading "could not fit" console warning about the unused width.
    tableWidth: 550,
    head: [["Category", "Issues", "Facilities", "High"]],
    body: summaryBody,
    theme: "grid",
    styles: { font: family, fontSize: 8, cellPadding: 4, textColor: [30, 41, 36], lineColor: [220, 228, 224], lineWidth: 0.4 },
    headStyles: { font: family, fillColor: [31, 78, 61], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    columnStyles: { 0: { cellWidth: 240 }, 1: { cellWidth: 100 }, 2: { cellWidth: 110 }, 3: { cellWidth: 100 } },
    margin: { left: margin, right: margin, top: 60, bottom: 40 },
    rowPageBreak: "avoid"
  });
  const body = [];
  const groups = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const key = ISSUE_CATEGORY_LABEL[row.category];
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  for (const [category, list] of groups) {
    body.push([
      {
        content: `${category} · ${list.length}`,
        colSpan: 8,
        styles: { fontStyle: "bold", fillColor: [229, 242, 236], textColor: [31, 78, 61], fontSize: 8 }
      }
    ]);
    for (const row of list) {
      body.push([
        row.facilityName,
        ISSUE_SEVERITY_LABEL[row.severity],
        row.reason,
        row.since ? dmy(row.since) : "-",
        row.remark ?? "-",
        row.assignee ?? "-",
        ISSUE_STATUS_LABEL[row.status],
        row.history ? "View" : "Fix"
      ]);
    }
  }
  doc.addPage();
  autoTable(doc, {
    startY: 46,
    head: [["Facility", "Severity", "Issue / reason", "Since", "Remark", "Assigned to", "Status", "Action"]],
    body,
    theme: "grid",
    styles: {
      font: family,
      fontSize: 8,
      cellPadding: 4,
      overflow: "linebreak",
      textColor: [30, 41, 36],
      lineColor: [220, 228, 224],
      lineWidth: 0.4
    },
    headStyles: { font: family, fillColor: [31, 78, 61], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    columnStyles: {
      // Landscape A4 minus 28 pt margins = 785.89 pt; widths sum to 785.88.
      0: { cellWidth: 120, fontStyle: "bold" },
      1: { cellWidth: 42 },
      2: { cellWidth: 250 },
      3: { cellWidth: 55 },
      4: { cellWidth: 150 },
      5: { cellWidth: 58.88 },
      6: { cellWidth: 60 },
      7: { cellWidth: 50 }
    },
    margin: { left: margin, right: margin, top: 46, bottom: 42 },
    rowPageBreak: "avoid",
    didDrawPage: () => {
      doc.setFont(family);
      doc.setFontSize(7.5);
      doc.setTextColor(100, 110, 105);
      doc.text(`${ORG_NAME} · Pending & Follow-up · Data as of ${meta.dataAsOf}`, margin, 24);
    }
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont(family);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 110, 105);
    doc.text(
      `Generated by ${meta.generatedBy} · ${meta.filtersText || "All facilities"}`,
      margin,
      doc.internal.pageSize.getHeight() - 14
    );
    doc.text(`Page ${page} of ${pages}`, pageW - margin, doc.internal.pageSize.getHeight() - 14, {
      align: "right"
    });
  }
  return doc;
}
async function exportPendingPdf(rows, meta) {
  const doc = await buildPendingPdf(rows, meta);
  const fileName = `${meta.fileNameBase}.pdf`;
  downloadBlob(fileName, doc.output("blob"));
  return { fileName, rows: rows.length };
}

const VIEW_KEY = "nqas.pending.view";
function readView(userId) {
  if (typeof window === "undefined") return "issue";
  try {
    const own = userId ? window.localStorage.getItem(`${VIEW_KEY}.${userId}`) : null;
    const value = own ?? window.localStorage.getItem(VIEW_KEY);
    return value === "facility" ? "facility" : "issue";
  } catch {
    return "issue";
  }
}
function saveView(value, userId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIEW_KEY, value);
    if (userId) window.localStorage.setItem(`${VIEW_KEY}.${userId}`, value);
  } catch {
  }
}
const SEVERITY_STYLE = {
  high: "border-rose-300/80 bg-rose-50 text-rose-900",
  medium: "border-amber-300/80 bg-amber-50 text-amber-900",
  low: "border-slate-300/70 bg-slate-50 text-slate-700"
};
const SEVERITY_ICON = {
  high: TriangleAlert,
  medium: Circle,
  low: Info
};
const STATUS_STYLE = {
  open: "border-amber-300/80 bg-amber-50 text-amber-900",
  "in-progress": "border-sky-300/80 bg-sky-50 text-sky-900",
  snoozed: "border-violet-300/80 bg-violet-50 text-violet-900",
  resolved: "border-emerald-300/80 bg-emerald-50 text-emerald-900"
};
const CATEGORY_SHORT = {
  documents: "Documents",
  "not-updated": "Not updated",
  "pending-work": "Pending work",
  "certificate-surveillance": "Certificate & surveillance",
  "fire-building": "Fire NOC & building",
  "data-conflicts": "Data conflicts"
};
const emptyDraft = (row) => ({
  remark: row?.remark ?? "",
  followUpDate: row?.followUpDate ?? "",
  assignee: row?.assignee ?? "",
  status: row?.history ? "resolved" : row?.status ?? "open",
  snoozeUntil: row?.snoozeUntil ?? "",
  snoozeReason: row?.snoozeReason ?? ""
});
function PendingFollowUpPage() {
  const cycleScope = useCycleScope();
  const rowsQ = useQuery(api.ops.listFacilityRowsFast, { cycle: cycleScope });
  const overview = useQuery(api.pending.overview, {});
  const saveState = useMutation(api.pending.upsertState);
  const logExport = useMutation(api.pending.logExport);
  const updateTrackerRow = useMutation(api.facilities.updateTrackerRow);
  const today = todayLocalIso();
  const [searchParams, setSearchParams] = useSearchParams();
  const ruleFilter = searchParams.get("rule") ?? "";
  const ruleFilterDef = ruleFilter ? RULE_BY_ID[ruleFilter] : void 0;
  const [issues, setIssues] = reactExports.useState(null);
  const [computeError, setComputeError] = reactExports.useState(null);
  const [search, setSearch] = reactExports.useState("");
  const [view, setView] = reactExports.useState(() => readView());
  const [quick, setQuick] = reactExports.useState("all");
  const [bar, setBar] = reactExports.useState(() => {
    if (searchParams.get("rule")) {
      return { barKeys: ["block", "category", "severity", "status"], filters: [], match: "all" };
    }
    const saved = loadBarState("pending");
    return saved ? { ...saved, filters: saved.filters ?? [] } : { barKeys: ["block", "category", "severity", "status"], filters: [], match: "all" };
  });
  const [filterSheet, setFilterSheet] = reactExports.useState(false);
  const [editRow, setEditRow] = reactExports.useState(null);
  const [draft, setDraft] = reactExports.useState(emptyDraft());
  const [saving, setSaving] = reactExports.useState(false);
  const [busyExport, setBusyExport] = reactExports.useState(null);
  const [quickView, setQuickView] = reactExports.useState(null);
  const defaultsApplied = reactExports.useRef(false);
  const config = reactExports.useMemo(
    () => normalizePendingConfig(overview?.config),
    [overview?.config]
  );
  const documentRules = reactExports.useMemo(
    () => normalizeDocumentRules(overview?.documentRules),
    [overview?.documentRules]
  );
  const lifecycle = reactExports.useMemo(
    () => overview?.settings ?? {},
    [overview?.settings]
  );
  const rows = rowsQ?.rows;
  reactExports.useEffect(() => {
    if (overview?.me.id) setView(readView(overview.me.id));
  }, [overview?.me.id]);
  reactExports.useEffect(() => {
    if (!overview || defaultsApplied.current || loadBarState("pending")) return;
    defaultsApplied.current = true;
    const configured = overview.config.defaultFilters ?? [];
    if (!configured.length) return;
    setBar((current) => ({ ...current, barKeys: configured }));
  }, [overview]);
  reactExports.useEffect(() => {
    if (!rows || !overview) return;
    let cancelled = false;
    setComputeError(null);
    computePendingInWorker(rows, {
      today,
      config,
      documentRules,
      settings: lifecycle
    }).then((next) => {
      if (!cancelled) setIssues(next);
    }).catch((err) => {
      if (!cancelled) {
        setComputeError(err instanceof Error ? err.message : "Could not compute the pending list");
        setIssues([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [rows, overview, today, config, documentRules, lifecycle]);
  const merged = reactExports.useMemo(
    () => mergeIssueStates(issues ?? [], overview?.states ?? [], today),
    [issues, overview?.states, today]
  );
  const counts = reactExports.useMemo(() => pendingCounts(issues ?? []), [issues]);
  const facilityById = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const row of rowsQ?.rows ?? []) {
      map.set(String(row.facility._id), row);
    }
    return map;
  }, [rowsQ?.rows]);
  const lastUpdatedById = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const [id, row] of facilityById) {
      const iso = isoDate(row.facility.lastChangedAt ?? row.facility.updatedAt ?? null);
      if (iso) map.set(id, iso);
    }
    return map;
  }, [facilityById]);
  const dataAsOfIso = reactExports.useMemo(() => {
    let latest = null;
    for (const iso of lastUpdatedById.values()) if (!latest || iso > latest) latest = iso;
    return latest ?? today;
  }, [lastUpdatedById, today]);
  const uniq = (values) => [...new Set(values.filter((value) => !!value && value.trim() !== ""))].sort(
    (a, b) => a.localeCompare(b)
  );
  const fields = reactExports.useMemo(() => {
    const all = [...merged.rows, ...merged.history];
    return [
      {
        key: "block",
        label: "Block",
        type: "select",
        onThisPage: true,
        options: uniq(all.map((r) => r.block)).map((value) => ({ value, label: value }))
      },
      {
        key: "facilityType",
        label: "Facility Type",
        type: "select",
        onThisPage: true,
        options: uniq(all.map((r) => r.facilityType)).map((value) => ({ value, label: value }))
      },
      {
        key: "category",
        label: "Category",
        type: "select",
        onThisPage: true,
        options: ISSUE_CATEGORIES.map((value) => ({ value: ISSUE_CATEGORY_LABEL[value], label: ISSUE_CATEGORY_LABEL[value] }))
      },
      {
        key: "severity",
        label: "Severity",
        type: "select",
        onThisPage: true,
        options: ["high", "medium", "low"].map((value) => ({
          value: ISSUE_SEVERITY_LABEL[value],
          label: ISSUE_SEVERITY_LABEL[value]
        }))
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        onThisPage: true,
        options: ISSUE_STATUSES.map((value) => ({ value: ISSUE_STATUS_LABEL[value], label: ISSUE_STATUS_LABEL[value] }))
      },
      {
        key: "cycle",
        label: "Cycle",
        type: "select",
        options: uniq(all.map((r) => r.cycleNumber != null ? `#${r.cycleNumber}` : "No cycle")).map((value) => ({
          value,
          label: value
        }))
      },
      { key: "lastUpdated", label: "Last updated", type: "date", options: [] },
      {
        key: "assignedTo",
        label: "Assigned to",
        type: "select",
        options: uniq(all.map((r) => r.assignee)).map((value) => ({ value, label: value }))
      }
    ];
  }, [merged.rows, merged.history]);
  const statusValues = reactExports.useMemo(
    () => (bar.filters.find((filter) => filter.key === "status")?.values ?? []).map(
      (value) => value.toLowerCase()
    ),
    [bar.filters]
  );
  const showSnoozed = statusValues.includes("snoozed");
  const showResolved = statusValues.includes("resolved");
  const filtered = reactExports.useMemo(() => {
    const pool = [
      ...merged.rows.filter(
        (row) => row.status === "resolved" ? showResolved : row.status === "snoozed" ? showSnoozed : true
      ),
      ...showResolved ? merged.history : []
    ];
    const needle = search.trim().toLowerCase();
    return pool.filter((row) => {
      if (ruleFilter && row.stateRuleId !== ruleFilter) return false;
      if (quick === "high" && row.severity !== "high") return false;
      if (quick !== "all" && quick !== "high" && row.category !== quick) return false;
      if (needle) {
        const haystack = [
          row.facilityName,
          row.nin ?? "",
          row.reason,
          row.block,
          row.phc,
          row.facilityType,
          row.remark ?? "",
          row.assignee ?? ""
        ].join(" ").toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return rowPasses(bar.filters, bar.match, (key) => {
        switch (key) {
          case "block":
            return row.block;
          case "facilityType":
            return row.facilityType;
          case "category":
            return ISSUE_CATEGORY_LABEL[row.category];
          case "severity":
            return ISSUE_SEVERITY_LABEL[row.severity];
          case "status":
            return ISSUE_STATUS_LABEL[row.status];
          case "cycle":
            return row.cycleNumber != null ? `#${row.cycleNumber}` : "No cycle";
          case "lastUpdated":
            return lastUpdatedById.get(row.facilityId) ?? "";
          case "assignedTo":
            return row.assignee ?? "";
          default:
            return "";
        }
      });
    });
  }, [
    merged.rows,
    merged.history,
    showSnoozed,
    showResolved,
    search,
    quick,
    bar.filters,
    bar.match,
    lastUpdatedById,
    ruleFilter
  ]);
  const byFacility = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const row of filtered) {
      const entry = map.get(row.facilityId) ?? {
        name: row.facilityName,
        block: row.block,
        phc: row.phc,
        type: row.facilityType,
        nin: row.nin ?? null,
        rows: []
      };
      entry.rows.push(row);
      map.set(row.facilityId, entry);
    }
    return [...map.entries()].map(([facilityId, entry]) => ({ facilityId, ...entry, high: entry.rows.filter((row) => row.severity === "high").length })).sort((a, b) => b.high - a.high || a.name.localeCompare(b.name));
  }, [filtered]);
  const filterText = reactExports.useMemo(() => {
    const parts = [];
    for (const filter of bar.filters) {
      if (!filter.values.length) continue;
      const field = fields.find((item) => item.key === filter.key);
      if (field) parts.push(filterChipLabel(field, filter));
    }
    if (search.trim()) parts.push(`Search: ${search.trim()}`);
    if (ruleFilter) parts.push(`Rule: ${ruleFilterDef?.label ?? ruleFilter}`);
    if (quick === "high") parts.push("High severity");
    if (quick !== "all" && quick !== "high") parts.push(ISSUE_CATEGORY_LABEL[quick]);
    return parts.join(" · ") || "None — all facilities";
  }, [bar.filters, fields, search, quick, ruleFilter, ruleFilterDef]);
  const exportMeta = {
    district: String(overview?.settings?.districtName ?? "District"),
    filtersText: filterText,
    generatedBy: `NQAS Tracker (${overview?.me.appRole ?? "user"})`,
    dataAsOf: dmy(dataAsOfIso),
    fileNameBase: pendingFileName(String(overview?.settings?.districtName ?? "District"), today)
  };
  const runExport = async (format) => {
    if (filtered.length === 0) {
      toast.error("Nothing to export — no issue matches the current filters");
      return;
    }
    setBusyExport(format);
    try {
      let result;
      if (format === "excel") result = await exportPendingExcel(filtered, exportMeta);
      else if (format === "pdf") result = await exportPendingPdf(filtered, exportMeta);
      else result = exportPendingCsv(filtered, exportMeta);
      await logExport({
        format,
        filters: exportMeta.filtersText,
        rows: result.rows,
        fileName: result.fileName
      });
      toast.success(`${format.toUpperCase()} ready`, {
        description: `${filtered.length} issue${filtered.length === 1 ? "" : "s"} · ${exportMeta.fileNameBase}`
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the export");
    } finally {
      setBusyExport(null);
    }
  };
  const openEdit = (row) => {
    if (!overview?.me.canEdit) return;
    setEditRow(row);
    setDraft(emptyDraft(row));
  };
  const saveFollowUp = async () => {
    if (!editRow) return;
    if (draft.status === "snoozed" && (!draft.snoozeUntil || !draft.snoozeReason.trim())) {
      toast.error("Choose the snooze date and add a reason");
      return;
    }
    setSaving(true);
    try {
      await saveState({
        facilityId: editRow.facilityId,
        ruleId: editRow.stateRuleId,
        remark: draft.remark.trim() || void 0,
        followUpDate: draft.followUpDate || void 0,
        assignee: draft.assignee.trim() || void 0,
        status: draft.status,
        snoozeUntil: draft.status === "snoozed" ? draft.snoozeUntil || void 0 : void 0,
        snoozeReason: draft.status === "snoozed" ? draft.snoozeReason.trim() || void 0 : void 0,
        lastReason: editRow.reason
      });
      toast.success("Follow-up saved", { description: "Every surface reads the same issue registry." });
      setEditRow(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the follow-up");
    } finally {
      setSaving(false);
    }
  };
  const openQuickView = (facilityId, section, edit) => {
    setQuickView({ facilityId, section, edit, token: Date.now() });
  };
  const quickRow = quickView ? facilityById.get(quickView.facilityId) ?? null : null;
  const labels = reactExports.useMemo(
    () => resolveLabels(MASTER_COLUMNS, overview?.settings?.tableHeaderOverrides),
    [overview?.settings?.tableHeaderOverrides]
  );
  const loading = issues === null || !overview || !rowsQ;
  const activeFilterCount = bar.filters.filter((filter) => filter.values.length > 0).length;
  const chips = [
    { key: "all", label: "All", count: counts.total },
    { key: "high", label: "High", count: counts.high },
    ...ISSUE_CATEGORIES.map((category) => ({
      key: category,
      label: CATEGORY_SHORT[category],
      count: counts.byCategory[category]
    }))
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    AppShell,
    {
      title: "Pending & Follow-up",
      subtitle: `${pendingHeadline(counts)} · Data as of ${dmy(dataAsOfIso)} IST`,
      titleIcon: ListTodo,
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            className: "rounded-r-none",
            onClick: () => void runExport("excel"),
            disabled: busyExport !== null || loading,
            children: [
              busyExport === "excel" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-1.5 size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-1.5 size-3.5" }),
              "Download"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "sm",
              className: "rounded-l-none border-l border-primary-foreground/25 px-2",
              "aria-label": "Download options",
              disabled: busyExport !== null || loading,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3.5" })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-48", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void runExport("excel"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "mr-1.5 size-4" }),
              " Excel (.xlsx)"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void runExport("pdf"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "mr-1.5 size-4" }),
              " PDF"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void runExport("csv"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "mr-1.5 size-4" }),
              " CSV"
            ] })
          ] })
        ] })
      ] }) }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 pb-24 md:pb-0", "data-testid": "pending-page", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "sticky top-[4.6rem] z-20 -mx-1 rounded-xl border border-border/60 bg-background/90 px-1.5 py-2 shadow-sm backdrop-blur-md", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 lg:flex-row lg:items-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground", "aria-hidden": true }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    value: search,
                    onChange: (event) => setSearch(event.target.value),
                    placeholder: "Search facility, NIN, reason or remark…",
                    "aria-label": "Search pending issues",
                    className: "h-10 rounded-lg border-border/70 bg-background pr-9 pl-9 text-sm"
                  }
                ),
                search && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setSearch(""),
                    "aria-label": "Clear search",
                    className: "absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden md:block", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                UniversalFilterBar,
                {
                  pageKey: "pending",
                  restoreSaved: !ruleFilter,
                  fields,
                  value: bar,
                  onChange: setBar,
                  onResetDefault: () => {
                    const next = { barKeys: config.defaultFilters, filters: [], match: "all" };
                    setBar(next);
                    saveBarState("pending", next);
                  }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  className: "h-10 justify-center gap-2 md:hidden",
                  onClick: () => setFilterSheet(true),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Funnel, { className: "size-4" }),
                    " Filters",
                    activeFilterCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary", children: activeFilterCount })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: filterSheet, onOpenChange: setFilterSheet, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "shrink-0 border-b px-4 py-3 pr-12", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Filters" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Tap outside or Esc to return to the list." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 overflow-y-auto p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                UniversalFilterBar,
                {
                  pageKey: "pending",
                  restoreSaved: !ruleFilter,
                  fields,
                  value: bar,
                  onChange: setBar
                }
              ) })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[11px] text-muted-foreground", "aria-live": "polite", children: [
              "Showing ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "font-semibold text-foreground", children: filtered.length }),
              " of",
              " ",
              issues?.length ?? 0,
              " issues",
              showResolved ? ` · ${merged.history.length} resolved in history` : ""
            ] }),
            ruleFilter && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap items-center gap-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 text-[11px] font-medium text-primary", children: [
              "Rule: ",
              ruleFilterDef?.label ?? ruleFilter,
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    const next = new URLSearchParams(searchParams);
                    next.delete("rule");
                    setSearchParams(next, { replace: true });
                  },
                  "aria-label": "Clear rule filter",
                  className: "rounded-full p-0.5 hover:bg-primary/10",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3" })
                }
              )
            ] }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center gap-1.5", role: "group", "aria-label": "Pending summary filters", children: chips.map((chip) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "aria-pressed": quick === chip.key,
              onClick: () => setQuick(quick === chip.key ? "all" : chip.key),
              className: cn(
                "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-8",
                quick === chip.key ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 bg-background/70 text-muted-foreground hover:border-primary/30 hover:text-foreground"
              ),
              children: [
                chip.label,
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] tabular-nums", children: chip.count })
              ]
            },
            chip.key
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex rounded-lg border border-border/70 bg-background/70 p-0.5", role: "tablist", "aria-label": "Pending view", children: [
              ["issue", "By issue"],
              ["facility", "By facility"]
            ].map(([key, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                role: "tab",
                "aria-selected": view === key,
                onClick: () => {
                  setView(key);
                  saveView(key, overview?.me.id);
                },
                className: cn(
                  "inline-flex min-h-10 items-center rounded-md px-3 text-xs font-semibold transition-colors md:min-h-8",
                  view === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                ),
                children: label
              },
              key
            )) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: view === "issue" ? "One row per issue · frozen Facility column" : `${byFacility.length} facilities with an issue in view` })
          ] }),
          computeError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900", children: computeError }),
          loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", "aria-busy": "true", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-10 w-full animate-pulse rounded-lg bg-muted" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-64 w-full animate-pulse rounded-xl bg-muted/60" })
          ] }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ListTodo, { className: "mx-auto size-8 text-primary/60" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-2 text-sm font-semibold", children: "Nothing pending in this view" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mx-auto mt-1 max-w-md text-xs text-muted-foreground", children: issues?.length === 0 ? "Every enabled rule is satisfied for the facilities you can see." : "Clear the search and filters, or switch the summary chip." })
          ] }) : view === "issue" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden overflow-auto rounded-xl border border-border/60 bg-card md:block", style: { maxHeight: "calc(100vh - 17rem)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[1180px] border-collapse text-xs", "data-testid": "pending-table", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 z-20 bg-muted text-[11px] text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "sticky left-0 z-30 min-w-[220px] border-r border-border/60 bg-muted px-2.5 py-2 text-left font-semibold", children: "Facility" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "min-w-[120px] px-2.5 py-2 text-left font-semibold", children: "Category" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "min-w-[86px] px-2.5 py-2 text-left font-semibold", children: "Severity" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "min-w-[300px] px-2.5 py-2 text-left font-semibold", children: "Issue / reason" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "min-w-[110px] px-2.5 py-2 text-left font-semibold", children: "Since" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "min-w-[64px] px-2.5 py-2 text-left font-semibold", children: "Cycle" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "min-w-[190px] px-2.5 py-2 text-left font-semibold", children: "Remark" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "min-w-[110px] px-2.5 py-2 text-left font-semibold", children: "Status" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "min-w-[76px] px-2.5 py-2 text-right font-semibold", children: "Action" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filtered.map((row) => {
                const Icon = SEVERITY_ICON[row.severity];
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "h-[54px] border-b border-border/40 align-middle hover:bg-muted/25", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "sticky left-0 z-10 border-r border-border/60 bg-card px-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FacilityCell,
                    {
                      facility: {
                        _id: row.facilityId,
                        name: row.facilityName,
                        facilityType: row.facilityType,
                        block: row.block,
                        phc: row.phc,
                        ninNumber: row.nin
                      },
                      query: search,
                      onOpen: () => openQuickView(row.facilityId, row.action, false)
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2.5 text-[11px] text-muted-foreground", children: CATEGORY_SHORT[row.category] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", SEVERITY_STYLE[row.severity]), children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3", "aria-hidden": true }),
                    " ",
                    ISSUE_SEVERITY_LABEL[row.severity]
                  ] }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "line-clamp-2 text-[11px] leading-snug", "data-tip": row.reason, "data-tip-truncate": true, children: row.reason }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2.5 text-[11px] whitespace-nowrap", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block", children: row.since ? dmy(row.since) : "-" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10px] text-muted-foreground", children: dueLabel(row.days) })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2.5 text-[11px] tabular-nums", children: row.cycleNumber != null ? `#${row.cycleNumber}` : "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2.5", children: overview?.me.canEdit && !row.history ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => openEdit(row),
                      className: "flex max-w-[190px] items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] hover:bg-muted",
                      "data-tip": row.remark ?? "Add a remark",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquarePlus, { className: "size-3 shrink-0 text-muted-foreground" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "line-clamp-2", children: row.remark || "Add remark" })
                      ]
                    }
                  ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "line-clamp-2 text-[11px] text-muted-foreground", children: row.remark || "-" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold", STATUS_STYLE[row.status]), children: ISSUE_STATUS_LABEL[row.status] }),
                    row.followUpDate && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-0.5 block text-[10px] text-muted-foreground", children: [
                      "Follow-up ",
                      dmy(row.followUpDate)
                    ] }),
                    row.assignee && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-[10px] text-muted-foreground", children: row.assignee })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2.5 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      size: "sm",
                      variant: "outline",
                      className: "h-8 gap-1 px-2 text-[11px]",
                      onClick: () => openQuickView(row.facilityId, row.action, true),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { className: "size-3" }),
                        " ",
                        row.history ? "View" : "Fix"
                      ]
                    }
                  ) })
                ] }, row.id);
              }) })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 md:hidden", children: filtered.map((row) => {
              const Icon = SEVERITY_ICON[row.severity];
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "rounded-xl border border-border/60 bg-card p-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FacilityCell,
                    {
                      facility: {
                        _id: row.facilityId,
                        name: row.facilityName,
                        facilityType: row.facilityType,
                        block: row.block,
                        phc: row.phc,
                        ninNumber: row.nin
                      },
                      onOpen: () => openQuickView(row.facilityId, row.action, false),
                      query: search,
                      compact: true,
                      className: "min-w-0 flex-1"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", SEVERITY_STYLE[row.severity]), children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3", "aria-hidden": true }),
                    " ",
                    ISSUE_SEVERITY_LABEL[row.severity]
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs leading-snug", children: row.reason }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-border/60 px-2 py-0.5", children: CATEGORY_SHORT[row.category] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: row.since ? dmy(row.since) : "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: dueLabel(row.days) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("rounded-full border px-2 py-0.5 font-semibold", STATUS_STYLE[row.status]), children: ISSUE_STATUS_LABEL[row.status] })
                ] }),
                row.remark && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 rounded-lg bg-muted/50 px-2 py-1.5 text-[11px]", children: row.remark }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center justify-between gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      size: "sm",
                      variant: "ghost",
                      className: "h-9 px-2 text-[11px]",
                      disabled: !overview?.me.canEdit || row.history,
                      onClick: () => openEdit(row),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquarePlus, { className: "mr-1 size-3.5" }),
                        " ",
                        row.remark ? "Edit remark" : "Add remark"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      size: "sm",
                      variant: "outline",
                      className: "h-9 px-2 text-[11px]",
                      onClick: () => openQuickView(row.facilityId, row.action, true),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { className: "mr-1 size-3.5" }),
                        " ",
                        row.history ? "View" : "Fix"
                      ]
                    }
                  )
                ] })
              ] }, row.id);
            }) })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden overflow-auto rounded-xl border border-border/60 bg-card md:block", style: { maxHeight: "calc(100vh - 17rem)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[900px] border-collapse text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 z-20 bg-muted text-[11px] text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "sticky left-0 z-30 min-w-[240px] border-r border-border/60 bg-muted px-2.5 py-2 text-left font-semibold", children: "Facility" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "min-w-[340px] px-2.5 py-2 text-left font-semibold", children: "Issues" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "min-w-[70px] px-2.5 py-2 text-right font-semibold", children: "Count" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "min-w-[70px] px-2.5 py-2 text-right font-semibold", children: "High" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "min-w-[110px] px-2.5 py-2 text-right font-semibold", children: "Action" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: byFacility.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/40 align-top hover:bg-muted/25", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "sticky left-0 z-10 border-r border-border/60 bg-card px-2.5 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  FacilityCell,
                  {
                    facility: {
                      _id: group.facilityId,
                      name: group.name,
                      facilityType: group.type,
                      block: group.block,
                      phc: group.phc,
                      ninNumber: group.nin
                    },
                    query: search,
                    onOpen: () => openQuickView(group.facilityId, group.rows[0]?.action ?? "overview", false)
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2.5 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1", children: group.rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    "data-tip": row.reason,
                    className: cn(
                      "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                      SEVERITY_STYLE[row.severity]
                    ),
                    children: ISSUE_CATEGORY_LABEL[row.category]
                  },
                  row.id
                )) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2.5 py-2.5 text-right text-sm font-semibold tabular-nums", children: group.rows.length }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2.5 py-2.5 text-right text-sm font-semibold tabular-nums text-rose-700", children: group.high || "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2.5 py-2.5 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-1", children: [
                  overview?.me.canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", className: "h-8 px-2 text-[11px]", onClick: () => openEdit(group.rows[0]), children: "Remark" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      size: "sm",
                      variant: "outline",
                      className: "h-8 gap-1 px-2 text-[11px]",
                      onClick: () => openQuickView(group.facilityId, group.rows[0]?.action ?? "overview", true),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { className: "size-3" }),
                        " Fix"
                      ]
                    }
                  )
                ] }) })
              ] }, group.facilityId)) })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 md:hidden", children: byFacility.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "rounded-xl border border-border/60 bg-card p-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                FacilityCell,
                {
                  facility: {
                    _id: group.facilityId,
                    name: group.name,
                    facilityType: group.type,
                    block: group.block,
                    phc: group.phc,
                    ninNumber: group.nin
                  },
                  query: search,
                  onOpen: () => openQuickView(group.facilityId, group.rows[0]?.action ?? "overview", false)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap gap-1", children: group.rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("rounded-full border px-2 py-0.5 text-[10px]", SEVERITY_STYLE[row.severity]), children: ISSUE_CATEGORY_LABEL[row.category] }, row.id)) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-[11px] text-muted-foreground", children: [
                group.rows.length,
                " issues · ",
                group.high,
                " High"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  size: "sm",
                  variant: "outline",
                  className: "mt-2 h-9 w-full gap-1 text-[11px]",
                  onClick: () => openQuickView(group.facilityId, group.rows[0]?.action ?? "overview", true),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { className: "size-3.5" }),
                    " Fix in Quick View"
                  ]
                }
              )
            ] }, group.facilityId)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarClock, { className: "size-3" }),
            "Dates DD-MMM-YYYY IST · blank is never 0 · counts come from the same rule registry as the bell and sidebar badge.",
            !overview?.me.canEdit && " You have read-only access."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 p-3 backdrop-blur md:hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { className: "h-11 flex-1", onClick: () => void runExport("excel"), disabled: busyExport !== null || filtered.length === 0, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-1.5 size-4" }),
            " Excel"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "h-11 flex-1", onClick: () => void runExport("pdf"), disabled: busyExport !== null || filtered.length === 0, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "mr-1.5 size-4" }),
            " PDF"
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!editRow, onOpenChange: (open) => !open && setEditRow(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-lg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
              "Follow up — ",
              editRow?.facilityName
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "line-clamp-2", children: editRow?.reason })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "pending-remark", className: "mb-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Remark" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Textarea,
                {
                  id: "pending-remark",
                  value: draft.remark,
                  onChange: (event) => setDraft((current) => ({ ...current, remark: event.target.value })),
                  rows: 3,
                  maxLength: 2e3,
                  placeholder: "What has been done, and what happens next?"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Follow-up date" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  DateInput,
                  {
                    id: "pending-follow-up",
                    label: "Follow-up date",
                    value: draft.followUpDate,
                    onChange: (value) => setDraft((current) => ({ ...current, followUpDate: value })),
                    today
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "pending-assignee", className: "mb-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Assigned to" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    id: "pending-assignee",
                    value: draft.assignee,
                    onChange: (event) => setDraft((current) => ({ ...current, assignee: event.target.value })),
                    placeholder: "Name or team",
                    maxLength: 120
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "pending-status", className: "mb-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Status" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "select",
                {
                  id: "pending-status",
                  value: draft.status,
                  onChange: (event) => setDraft((current) => ({ ...current, status: event.target.value })),
                  className: "h-10 w-full rounded-md border border-input bg-background px-2 text-sm",
                  children: ISSUE_STATUSES.map((status) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: status, children: [
                    ISSUE_STATUS_LABEL[status],
                    status === "resolved" ? " (kept in history)" : ""
                  ] }, status))
                }
              )
            ] }),
            draft.status === "snoozed" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 rounded-lg border border-violet-200 bg-violet-50/50 p-2 sm:grid-cols-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Snooze until" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  DateInput,
                  {
                    id: "pending-snooze",
                    label: "Snooze until",
                    value: draft.snoozeUntil,
                    min: today,
                    onChange: (value) => setDraft((current) => ({ ...current, snoozeUntil: value })),
                    today
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "pending-snooze-reason", className: "mb-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Why snooze?" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    id: "pending-snooze-reason",
                    value: draft.snoozeReason,
                    onChange: (event) => setDraft((current) => ({ ...current, snoozeReason: event.target.value })),
                    placeholder: "Waiting for the portal",
                    maxLength: 300
                  }
                )
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setEditRow(null), disabled: saving, children: "Cancel" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => void saveFollowUp(), disabled: saving, children: [
              saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-1.5 size-4 animate-spin" }) : null,
              "Save follow-up"
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FacilityQuickView,
          {
            row: quickRow,
            open: !!quickRow,
            onOpenChange: (open) => {
              if (!open) setQuickView(null);
            },
            labels,
            canEdit: !!overview?.me.canEdit,
            initialSection: quickView?.section ?? "overview",
            editRequest: quickView && quickRow && quickView.edit ? { token: quickView.token, facilityId: String(quickRow.facility._id) } : null,
            onSave: async (row, state) => {
              await updateTrackerRow(trackerUpdatePayload(row, state));
              toast.success("Facility updated");
            },
            settings: overview?.settings,
            userId: overview?.me.id,
            dataAsOf: dataAsOfIso ? Date.parse(`${dataAsOfIso}T00:00:00Z`) : null
          }
        )
      ]
    }
  );
}

export { PendingFollowUpPage as default };
