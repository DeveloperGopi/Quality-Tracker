// Profile exporters — one data mapper feeding four outputs (screen print,
// PDF via jsPDF+autoTable, Excel via ExcelJS) plus the facility-master-list
// bulk export that reuses the exact same column order and formatting.
//
// PDF: A4 portrait, 15mm margins, header (app name, facility, NIN,
// generated IST date-time, generated-by) on every page, footer
// "Page X of Y" + a confidentiality note. Table rows never split across
// pages, header rows repeat on every page, numbers right-aligned, dates
// DD-MMM-YYYY, zebra rows, status chips carry colour AND text (a black &
// white print still reads them).
// Tamil: core PDF fonts cannot render Tamil — provide a Unicode TTF
// (e.g. Noto Sans Tamil) via setProfileTamilFontBase64(); every PDF then
// embeds it automatically. Without it, Tamil text falls back to Helvetica
// (documented limitation, same hook pattern as the custom-report exports).

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import {
  getLifecycleState,
  profileCompleteness,
  toDdMmmYyyy,
  type ProfileFacility,
  type ProfileNqas,
  type ProfileSa,
} from "./facilityProfileState";
import {
  DEFAULT_SETTINGS,
  deriveFireNocStatus,
  type LifecycleSettings,
} from "../convex/lifecycle";

// ---------------------------------------------------------------------------
// Shared data mapper — pure, unit-tested, drives PDF + Excel + bulk
// ---------------------------------------------------------------------------

export type CycleDetailLike = {
  cycle: {
    cycleNumber: number;
    cycleType: string;
    superseded?: boolean | null;
    recertStage?: string | null;
  };
  sa: ProfileSa | null;
  nqas: ProfileNqas | null;
};

export type ProfileExportInput = {
  facility: ProfileFacility;
  cycles: CycleDetailLike[];
  funds: Record<string, unknown>[];
  nocs: Record<string, unknown>[];
  buildings: Record<string, unknown>[];
  audits: {
    changedAt: number;
    changedByName?: string | null;
    field?: string | null;
    action: string;
    oldValue?: unknown;
    newValue?: unknown;
    table?: string;
  }[];
  settings?: Partial<LifecycleSettings> | null;
  /** The quarterly IA store, so the Excel profile carries the same four/five
   *  quarter table the Profile and sheet show. */
  iaQuarters?: {
    fy: string;
    quarter: number;
    nqasIaScore?: number | null;
    kayakalpIaScore?: number | null;
    ecoFriendlyScore?: number | null;
    updatedByName?: string | null;
    updatedAt?: number | null;
  }[];
  district?: string;
  generatedBy?: string;
  generatedAt?: Date;
};

export type ExportRow = (string | number | null)[];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** dd-MMM-yyyy hh:mm IST — exports are made for the district's timezone
 *  regardless of where the browser is. */
export function istStamp(t: Date = new Date()): string {
  const ist = new Date(t.getTime() + 5.5 * 3600_000);
  return `${String(ist.getUTCDate()).padStart(2, "0")}-${MONTHS[ist.getUTCMonth()]}-${ist.getUTCFullYear()} ${String(ist.getUTCHours()).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")} IST`;
}

const NOT_RECORDED = "Not recorded yet";
const clean = (v: unknown): string => {
  if (v == null) return "";
  const s = String(v).trim();
  return s === "" ? "" : s;
};
const label = (raw: unknown) => {
  const v = clean(raw);
  return v === "" ? `— ${NOT_RECORDED}` : v;
};

export function buildProfileExportData(input: ProfileExportInput) {
  const generatedAt = istStamp(input.generatedAt);
  const active = input.cycles.find((c) => !c.cycle.superseded) ?? null;
  const state = getLifecycleState({
    facility: input.facility,
    activeCycle: active
      ? {
          cycleNumber: active.cycle.cycleNumber,
          cycleType: active.cycle.cycleType,
          sa: active.sa,
          nqas: active.nqas,
        }
      : null,
    funds: input.funds as { status: string }[],
    s: (input.settings ?? DEFAULT_SETTINGS) as Partial<LifecycleSettings>,
  });
  const completeness = profileCompleteness({
    facility: input.facility,
    activeCycle: active ? { cycleNumber: active.cycle.cycleNumber } : null,
  });

  const kpis: ExportRow[] = [
    ["Current stage", `${state.stageIndex} of 7 — ${state.chip.label}`],
    ["Internal Assessment score", state.scores.ia.long],
    ["State Assessment score", state.scores.sa.long],
    ["NQAS Assessment score", state.scores.nqas.long],
    [
      "Certification validity",
      state.validity.to
        ? `${toDdMmmYyyy(state.validity.from)} to ${toDdMmmYyyy(state.validity.to)} (${Math.max(0, state.validity.daysLeft ?? 0)} days left)`
        : `— ${NOT_RECORDED}`,
    ],
    ["Open gap-closure gaps", String(state.openGaps)],
    ["Profile completeness", `${completeness.pct}% (${completeness.missing.length} field${completeness.missing.length === 1 ? "" : "s"} missing)`],
  ];

  const lifecycle: ExportRow[] = state.stages.map((st, i) => {
    const d = state.stageDates[st.key];
    return [
      String(i + 1),
      st.label,
      st.state === "current" ? "CURRENT STAGE" : st.state === "done" ? "Completed" : "Not reached",
      (d?.date && toDdMmmYyyy(d.date)) || "",
    ];
  });

  const record: ExportRow[] = [
    ["Facility name", label(input.facility.name)],
    ["NIN Number", label(input.facility.ninNumber)],
    ["Facility type", label(input.facility.facilityType)],
    ["Phase type", label(input.facility.phaseType)],
    ["Block", label(input.facility.block)],
    ["PHC", label(input.facility.phc)],
    ["NQAS eligibility", label(input.facility.eligibility)],
    ["SaQsham Facility_Type", label(input.facility.saqshamFacilityType)],
    ["SaQsham Name/Category", label(input.facility.saqshamCategory)],
    ["General remarks", label(input.facility.remarks)],
  ];

  const certHistory: ExportRow[] = input.cycles.map(({ cycle, sa, nqas }) => {
    const saPct = sa?.scorePercent;
    const nqasPct = nqas?.scorePercent ?? nqas?.manualScore ?? null;
    const validFrom = nqas?.certificationDate ?? nqas?.goiLetterDate ?? null;
    return [
      `#${cycle.cycleNumber}`,
      `${cycle.cycleType}${cycle.superseded ? " (superseded)" : ""}`,
      // Scores stay REAL numbers (0 and 100 included) so Excel writes them
      // right-aligned with a 0.0 number format instead of as text.
      saPct == null ? "" : saPct,
      nqasPct == null ? "" : nqasPct,
      nqas?.certificationStatus ?? `Pending (${clean(nqas?.status) || "assessment not recorded"})`,
      nqas?.certificationStatus
        ? `${toDdMmmYyyy(validFrom)} to ${toDdMmmYyyy(nqas.validityDate)}`
        : "",
    ];
  });

  const inr = (v: unknown) =>
    v == null ? "" : `₹${Number(v).toLocaleString("en-IN")}`;

  const funds: ExportRow[] = input.funds.map((f) => [
    clean(f.financialYear),
    clean(f.status) || NOT_RECORDED,
    inr(f.amountSanctioned),
    inr(f.amountReleased),
    inr(f.amountUtilized),
    clean(f.remarks),
  ]);

  const nocs: ExportRow[] = input.nocs.map((n) => {
    // Validity status uses the ONE date-primary rule shared with the
    // dashboard/master list — past expiry ⇒ Expired, 90-day window ⇒
    // Expiring Soon, no NOC ⇒ Not Obtained.
    const validity = deriveFireNocStatus(
      clean(n.nocAvailable) || null,
      clean(n.expiryDate) || null,
      clean(n.status) || null,
      undefined,
      undefined,
    );
    return [
      clean(n.nocAvailable) || NOT_RECORDED,
      clean(n.nocNumber),
      toDdMmmYyyy(clean(n.issuedDate)),
      toDdMmmYyyy(clean(n.expiryDate)),
      validity,
    ];
  });

  const buildings: ExportRow[] = input.buildings.map((b) => [
    clean(b.buildingType) || NOT_RECORDED,
    clean(b.buildingStatus) || NOT_RECORDED,
    toDdMmmYyyy(clean(b.lastRenovationDate)),
    b.renovationFundRequired != null && Number(b.renovationFundRequired) !== 0
      ? inr(b.renovationFundRequired)
      : "",
    clean(b.remarks),
  ]);

  /* Part C — one Excel sheet with every cycle, not just the superseded
     summary. Dates and scores stay real numbers / strings, never merged
     across cycles. */
  const cycleHistory: ExportRow[] = [...input.cycles]
    .sort((a, b) => a.cycle.cycleNumber - b.cycle.cycleNumber)
    .map(({ cycle, sa, nqas }) => {
      const deferred = nqas?.certificationStatus === "Deferred";
      const validity = deferred
        ? nqas?.validityDate ?? ""
        : nqas?.validityDate ?? "";
      return [
        `#${cycle.cycleNumber}`,
        `${cycle.cycleType}${cycle.superseded ? " (superseded)" : ""}`,
        toDdMmmYyyy(sa?.actualStartDate) && toDdMmmYyyy(sa?.actualEndDate)
          ? `${toDdMmmYyyy(sa?.actualStartDate)} to ${toDdMmmYyyy(sa?.actualEndDate)}`
          : toDdMmmYyyy(sa?.actualStartDate) || toDdMmmYyyy(sa?.scheduledDate) || "",
        sa?.scorePercent == null ? "" : sa.scorePercent,
        toDdMmmYyyy(nqas?.scheduledStartDate) && toDdMmmYyyy(nqas?.scheduledEndDate)
          ? `${toDdMmmYyyy(nqas?.scheduledStartDate)} to ${toDdMmmYyyy(nqas?.scheduledEndDate)}`
          : "",
        toDdMmmYyyy(nqas?.actualStartDate) && toDdMmmYyyy(nqas?.actualEndDate)
          ? `${toDdMmmYyyy(nqas?.actualStartDate)} to ${toDdMmmYyyy(nqas?.actualEndDate)}`
          : "",
        clean(nqas?.mode),
        nqas?.scorePercent == null ? "" : nqas.scorePercent,
        clean(nqas?.certificationStatus) || clean(nqas?.status) || "",
        toDdMmmYyyy(nqas?.certificationDate ?? nqas?.goiLetterDate ?? null),
        deferred
          ? `Cooling period ends ${toDdMmmYyyy(validity)}`
          : toDdMmmYyyy(validity),
      ];
    });

  const iaRows: ExportRow[] = (input.iaQuarters ?? [])
    .slice()
    .sort((a, b) => a.fy.localeCompare(b.fy) || a.quarter - b.quarter)
    .map((q) => [
      `Q${q.quarter} ${q.fy}`,
      q.nqasIaScore == null ? "" : q.nqasIaScore,
      q.kayakalpIaScore == null ? "" : q.kayakalpIaScore,
      q.ecoFriendlyScore == null ? "" : q.ecoFriendlyScore,
      q.updatedByName ?? "",
      q.updatedAt ? istStamp(new Date(q.updatedAt)) : "",
    ]);

  const audit: ExportRow[] = input.audits.slice(0, 10).map((a) => [
    istStamp(new Date(a.changedAt)),
    clean(a.changedByName) || "System",
    // Every audit cell is capped long text so PDF columns can never blow up.
    (clean(a.field) || clean(a.action)).slice(0, 120),
    a.oldValue != null ? String(a.oldValue).slice(0, 120) : "",
    a.newValue != null ? String(a.newValue).slice(0, 120) : "",
  ]);

  return {
    generatedAt,
    generatedBy: input.generatedBy ?? "",
    district: input.district ?? "",
    facility: input.facility,
    chip: state.chip,
    stageIndex: state.stageIndex,
    kpis,
    lifecycle,
    record,
    certHistory,
    cycleHistory,
    iaRows,
    funds,
    fundHeader: ["FY", "Status", "Sanctioned", "Released", "Utilized", "Remarks"] as string[],
    nocs,
    nocHeader: ["NOC available", "NOC number", "Issued", "Expiry", "Validity status"] as string[],
    buildings,
    buildingHeader: ["Type", "Status", "Last renovation", "Renovation fund", "Remarks"] as string[],
    audit,
    auditHeader: ["When (IST)", "User", "Change", "From", "To"] as string[],
    completeness,
    validity: state.validity,
    openGaps: state.openGaps,
    scores: state.scores,
  };
}

export type ProfileExportData = ReturnType<typeof buildProfileExportData>;

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/** Tamil/Unicode hook — set once with the base64 of a TTF that covers Tamil
 *  + Latin (e.g. Noto Sans Tamil). Same documented pattern as the
 *  custom-report exports; commit the font under src/assets/fonts/ and call
 *  this in the app entry before any export. */
let profileTamilFontBase64: string | null = null;
export function setProfileTamilFontBase64(b64: string) {
  profileTamilFontBase64 = b64;
}

/** `fileName` overrides the download name — used by tests (and by callers
 *  that need a server-side path); in the browser it is left undefined so the
 *  file is offered as `<facility>-<nin>-profile.pdf`. */
export function exportProfilePdf(
  out: ProfileExportData,
  fileBase: string,
  fileName?: string,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let font = "helvetica";
  if (profileTamilFontBase64) {
    // Instance-level registration is the supported jsPDF path.
    doc.addFileToVFS("NQAS-Tamil.ttf", profileTamilFontBase64);
    doc.addFont("NQAS-Tamil.ttf", "NQAS-Tamil", "normal");
    font = "NQAS-Tamil";
  }
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 15; // 15mm margins
  const contentW = W - M * 2;

  const header = (p: number) => {
    doc.setFillColor(13, 105, 96);
    doc.rect(0, 0, W, 18, "F");
    doc.setTextColor(255);
    doc.setFont(font, "bold");
    doc.setFontSize(11);
    doc.text("NQAS Tracker", M, 7.5);
    doc.setFont(font, "normal");
    doc.setFontSize(7.5);
    doc.text("District Health Facility Quality Monitoring System", M, 12.5);
    doc.text(`${out.chip.label} · NIN ${out.facility.ninNumber ?? "—"}`, W - M, 7.5, {
      align: "right",
    });
    doc.text(`Generated ${out.generatedAt} · by ${out.generatedBy || "NQAS Tracker user"}`, W - M, 12.5, {
      align: "right",
    });
    // Facility identity band under the header — repeated on every page.
    doc.setFont(font, "bold");
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text(
      `${out.facility.name} · ${out.facility.facilityType} · NIN ${out.facility.ninNumber ?? "—"}`,
      M,
      23.5,
    );
    doc.setFont(font, "normal");
    doc.text(
      `Block ${out.facility.block} / PHC ${out.facility.phc}${out.district ? ` · ${out.district}` : ""}`,
      W - M,
      23.5,
      { align: "right" },
    );
    // Bottom confidentiality note on every page.
    doc.setFontSize(6.5);
    doc.setTextColor(110);
    doc.text(
      "Confidential — facility quality data. Handle per state DHS guidelines.",
      M,
      H - 4,
    );
    doc.setTextColor(0);
    doc.setFontSize(8);
    doc.text(`Page ${p} of .`, W - M, H - 4, { align: "right" });
    void p;
  };

  header(1);

  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const sectionTitle = (title: string, y: number): number => {
    if (y > H - M - 12) {
      doc.addPage();
      header(doc.getNumberOfPages());
      y = 28;
    }
    doc.setFont(font, "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(13, 105, 96);
    doc.text(title.toUpperCase(), M, y);
    doc.line(M, y + 1.6, M + contentW, y + 1.6);
    doc.setTextColor(0);
    return y + 5;
  };

  let cursorY = 28;

  const table = (head: string[], rows: ExportRow[], numeric: number[] = []) =>
    autoTable(doc, {
      head: [head],
      body: rows.map((r) => r.map((c) => (c == null ? "" : String(c)))),
      startY: cursorY,
      margin: { left: M, right: M, top: 30, bottom: 10 },
      styles: { fontSize: 9, cellPadding: { horizontal: 2.5, vertical: 1.6 }, font, textColor: 25, minCellHeight: 6, overflow: "linebreak" },
      headStyles: { fillColor: [13, 105, 96], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [244, 248, 247] },
      theme: "grid",
      rowPageBreak: "avoid",
      didDrawPage: () => header(doc.getNumberOfPages()),
      columnStyles: {
        ...Object.fromEntries(numeric.map((i) => [i, { halign: "right" as const }])),
      },
    });

  // 1 — Facility summary (KPI strip)
  cursorY = sectionTitle("Facility summary", cursorY);
  table(["Metric", "Value"], out.kpis, []);
  cursorY = lastY() + 8;

  // 2 — Lifecycle: static 7-step graphic (current stage tinted, B&W-safe)
  cursorY = sectionTitle("Certification lifecycle", cursorY);
  autoTable(doc, {
    head: [["#", "Stage", "State", "Date"]],
    body: out.lifecycle.map((r) => r.map(String)),
    startY: cursorY,
    margin: { left: M, right: M, top: 30, bottom: 10 },
    styles: { fontSize: 9, cellPadding: { horizontal: 2.5, vertical: 1.6 }, font, minCellHeight: 6 },
    headStyles: { fillColor: [13, 105, 96], textColor: 255, fontStyle: "bold" },
    theme: "grid",
    rowPageBreak: "avoid",
    didDrawPage: () => header(doc.getNumberOfPages()),
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 2 && d.cell.raw === "CURRENT STAGE") {
        d.cell.styles.fillColor = [190, 232, 224];
        d.cell.styles.fontStyle = "bold";
      }
      if (d.section === "body" && d.column.index === 2 && d.cell.raw === "Not reached") {
        d.cell.styles.textColor = [130, 130, 130];
      }
    },
  });
  cursorY = lastY() + 8;

  const drawTable = (title: string, head: string[], rows: ExportRow[], numeric: number[] = []) => {
    cursorY = sectionTitle(title, cursorY);
    if (rows.length === 0) {
      doc.setFont(font, "italic");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`No records yet — add one from the Facility Profile page.`, M, cursorY);
      doc.setTextColor(0);
      doc.setFont(font, "normal");
      cursorY += 6;
      return;
    }
    table(head, rows, numeric);
    cursorY = lastY() + 8;
  };

  // 3 — Facility record (2-col label/value, wrapped values)
  drawTable("Facility record", ["Field", "Value"], out.record);
  // 4 — Certification history
  drawTable(
    "Certification history",
    ["Cycle", "Type", "SA score", "NQAS score", "Status", "Valid from–to"],
    out.certHistory,
    [2, 3],
  );
  // 5 — Gap Closure Fund / Fire NOC / Building summaries
  drawTable("Gap closure fund", out.fundHeader, out.funds, [2, 3, 4]);
  drawTable("Fire NOC", out.nocHeader, out.nocs);
  drawTable("Building", out.buildingHeader, out.buildings, [3]);
  // 6 — Audit trail (last 10)
  drawTable("Audit trail (last 10)", out.auditHeader, out.audit);

  // Finalize footer page numbers with the real total.
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont(font, "normal");
    doc.setFontSize(8);
    doc.setTextColor(110);
    const prev = doc.getTextWidth(`Page ${p} of ${total}`);
    doc.setFillColor(255, 255, 255);
    doc.rect(W - M - prev - 2, H - 6.4, prev + 4, 4, "F");
    doc.text(`Page ${p} of ${total}`, W - M, H - 4, { align: "right" });
    doc.setTextColor(0);
  }
  doc.save(fileName ?? `${fileBase}-profile.pdf`);
}

// ---------------------------------------------------------------------------
// Excel — ExcelJS real styled workbook (7 sheets)
// ---------------------------------------------------------------------------

export type SheetSpec = {
  title: string;
  header: string[];
  rows: ExportRow[];
  /** 0-based column indexes right-aligned with 0.0 number format. */
  numericCols?: number[];
  /** 0-based columns forced to text (NIN — never scientific notation). */
  textCols?: number[];
  /** 0-based columns holding dd-MMM-yyyy strings / Dates. */
  dateCols?: number[];
  /** Optional embedded PNG (the IA card): placed under the header. */
  image?: { base64: string; width: number; height: number };
};

const applySheet = (
  wb: ExcelJS.Workbook,
  spec: SheetSpec,
  meta: { facilityName: string; generatedAt: string; generatedBy: string },
) => {
  const ws = wb.addWorksheet(spec.title.slice(0, 31), {
    views: [{ showGridLines: spec.title !== "Summary", state: "frozen", ySplit: 4 }],
  });

  const lastCol = Math.max(1, spec.header.length);
  ws.getCell(1, 1).value = `NQAS Tracker — ${spec.title}`;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: "FF0D6960" } };
  ws.mergeCells(1, 1, 1, lastCol);
  ws.getCell(2, 1).value = `${meta.facilityName} · Generated ${meta.generatedAt} by ${meta.generatedBy || "NQAS Tracker user"}`;
  ws.getCell(2, 1).font = { size: 10, color: { argb: "FF666666" } };
  ws.mergeCells(2, 1, 2, lastCol);

  const headerRow = ws.getRow(4);
  headerRow.values = spec.header;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D6960" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    };
  });

  spec.rows.forEach((rowValues, r) => {
    const excelRow = ws.getRow(5 + r);
    for (let c = 0; c < spec.header.length; c++) {
      const raw = rowValues[c] ?? "";
      const cell = excelRow.getCell(c + 1);
      const isNumeric = spec.numericCols?.includes(c) ?? false;
      if (typeof raw === "number") {
        cell.value = raw;
        if (isNumeric) cell.numFmt = "0.0";
      } else {
        cell.value = String(raw);
        // NIN and other text-pinned columns refuse scientific notation.
        if (spec.textCols?.includes(c)) cell.numFmt = "@";
      }
      cell.alignment = {
        vertical: "top",
        // Numbers right-aligned, everything else left (long text wraps).
        horizontal: isNumeric ? "right" : "left",
        wrapText: true,
        indent: isNumeric ? 0 : 1,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFDDDDDD" } },
        bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
        left: { style: "thin", color: { argb: "FFDDDDDD" } },
        right: { style: "thin", color: { argb: "FFDDDDDD" } },
      };
      if (r % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F8F7" } };
      }
    }
  });
  if (spec.rows.length > 0) {
    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + spec.rows.length, column: spec.header.length },
    };
  } else {
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: spec.header.length } };
  }

  if (spec.image) {
    const imageId = wb.addImage({ base64: spec.image.base64, extension: "png" });
    ws.addImage(imageId, {
      tl: { col: 0.2, row: 4.4 },
      ext: { width: spec.image.width, height: spec.image.height },
      editAs: "oneCell",
    });
    ws.getRow(5).height = Math.max(15, spec.image.height * 0.75);
  }

  // Column widths from content length (min 12, max 50).
  spec.header.forEach((h, c) => {
    let longest = h.length;
    for (const rowValues of spec.rows) {
      longest = Math.max(longest, String(rowValues[c] ?? "").length);
    }
    ws.getColumn(c + 1).width = Math.min(50, Math.max(12, longest + 2));
  });

  // Print setup: landscape, fit to one page wide, header row repeats.
  ws.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
  };
  ws.headerFooter = {
    oddFooter: `&8&L${meta.facilityName} — NQAS Tracker&RPage &P of &N`,
  };
  void spec.dateCols;
};

export async function exportExcelWorkbook(
  specs: SheetSpec[],
  meta: { facilityName: string; generatedAt: string; generatedBy: string },
  save: (buf: ExcelJS.Buffer) => void,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "NQAS Tracker";
  for (const spec of specs) applySheet(wb, spec, meta);
  const buf = await wb.xlsx.writeBuffer();
  save(buf as ExcelJS.Buffer);
}

/** The seven profile sheets, in order, with each sheet's formatting rules.
 *  Exported so the workbook contract (sheet names, header row, widths, NIN
 *  as text, print setup) can be asserted against the real production specs. */
export function profileSheetSpecs(out: ProfileExportData): SheetSpec[] {
  return [
    { title: "Summary", header: ["Metric", "Value"], rows: out.kpis, textCols: [1] },
    {
      title: "Facility Record",
      header: ["Field", "Value"],
      rows: out.record,
      textCols: [1],
    },
    {
      title: "Certification History",
      header: ["Cycle", "Type", "SA score", "NQAS score", "Status", "Valid from–to"],
      rows: out.certHistory,
      numericCols: [2, 3],
      textCols: [0],
    },
    {
      title: "Cycle History",
      header: [
        "Cycle",
        "Type",
        "SA dates",
        "SA score",
        "NQAS scheduled",
        "NQAS visit",
        "Mode",
        "Assessment score",
        "Result",
        "Certification date",
        "Validity / cooling end",
      ],
      rows: out.cycleHistory,
      numericCols: [3, 7],
      textCols: [0],
    },
    {
      title: "IA Quarters",
      header: ["Quarter", "NQAS IA", "Kayakalp IA", "Eco-friendly", "Updated by", "Updated at (IST)"],
      rows: out.iaRows,
      numericCols: [1, 2, 3],
      textCols: [0, 5],
    },
    { title: "Gap Closure", header: out.fundHeader, rows: out.funds, textCols: [5] },
    { title: "Fire NOC", header: out.nocHeader, rows: out.nocs, textCols: [1] },
    { title: "Building", header: out.buildingHeader, rows: out.buildings, textCols: [4] },
    { title: "Audit Trail", header: out.auditHeader, rows: out.audit, textCols: [2, 3, 4] },
  ];
}

export function profileWorkbookMeta(out: ProfileExportData) {
  return {
    facilityName: `${out.facility.name} (NIN ${out.facility.ninNumber ?? "—"})`,
    generatedAt: out.generatedAt,
    generatedBy: out.generatedBy,
  };
}

export async function exportProfileExcel(out: ProfileExportData, fileBase: string) {
  const meta = profileWorkbookMeta(out);
  const sheets: SheetSpec[] = profileSheetSpecs(out);
  /* Part 1.8 — the SAME IA card as the screen and the PDF, as a table plus an
     embedded image. The table is the "IA Quarters" sheet; this sheet carries
     the picture (browser only; the workbook still exports without it). */
  try {
    const parse = (label: unknown) =>
      /^Q([1-4])\s+(\d{2})-(\d{2})$/.exec(String(label ?? ""));
    const rows = out.iaRows
      .map((r) => {
        const m = parse(r[0]);
        if (!m) return null;
        return {
          fy: `20${m[2]}-${m[3]}`,
          quarter: Number(m[1]),
          nqasIaScore: typeof r[1] === "number" ? r[1] : null,
          kayakalpIaScore: typeof r[2] === "number" ? r[2] : null,
        };
      })
      .filter((r): r is { fy: string; quarter: number; nqasIaScore: number | null; kayakalpIaScore: number | null } => !!r);
    if (rows.length) {
      const { iaCardPointsFromRows, iaCardPng } = await import("@/lib/iaCard");
      const { points, change } = iaCardPointsFromRows(rows);
      const png = points.length ? await iaCardPng(points, change, { width: 174, chartMm: 40 }) : null;
      if (png) {
        const at = sheets.findIndex((s) => s.title === "IA Quarters");
        sheets.splice(at + 1, 0, {
          title: "IA Chart",
          header: ["Internal Assessment & Kayakalp — last four quarters"],
          rows: [],
          image: png,
        });
      }
    }
  } catch {
    /* no canvas (server/test) — the table sheet still carries every number */
  }
  await exportExcelWorkbook(sheets, meta, (buf) => {
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}-profile.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// ---------------------------------------------------------------------------
// Master list bulk export — one row per facility, SAME column order and
// formatting discipline, built with the same mapper.
// ---------------------------------------------------------------------------

export const BULK_HEADER = [
  "Facility name", "NIN Number", "Type", "Phase", "Block", "PHC",
  "Stage", "Current status",
  "IA score", "SA score", "NQAS score",
  "Cert. status", "Valid from", "Valid till", "Open gaps",
  "SaQsham Facility_Type", "SaQsham Name/Category", "Remarks",
] as const;

export type BulkFacilityRow = {
  facility: ProfileFacility;
  activeCycle: CycleDetailLike | null;
  funds: { status: string }[];
};

/** Structural view of an `ops.listFacilityRowsFast` row — what the Facility
 *  Master List and the Admin Settings “export a backup before deleting” action
 *  both hold. The SA/NQAS sub-objects arrive loosely typed (the serialized
 *  tracker shape spells absent optionals as `null`) and are narrowed once, in
 *  the mapper below. */
export type TrackerRowLike = {
  facility: ProfileFacility;
  cycleNumber: number | null;
  cycleType: string | null;
  recertStage?: string | null;
  sa: Record<string, unknown> | null;
  nqas: Record<string, unknown> | null;
  fund: { status: string } | null;
};

/** Tracker rows → bulk profile rows, using the same mapping the single-facility
 *  export uses. One definition, so the master-list sheet, the admin backup and
 *  the per-facility workbook can never disagree about a column. */
export function trackerRowsToBulkRows(rows: TrackerRowLike[]): BulkFacilityRow[] {
  return rows.map((r) => ({
    facility: r.facility,
    activeCycle: r.cycleNumber
      ? {
          cycle: {
            cycleNumber: r.cycleNumber,
            cycleType: r.cycleType ?? "Initial",
            recertStage: r.recertStage ?? null,
          },
          sa: (r.sa ?? null) as unknown as ProfileSa | null,
          nqas: (r.nqas ?? null) as unknown as ProfileNqas | null,
        }
      : null,
    funds: r.fund ? [{ status: r.fund.status }] : [],
  }));
}

export function buildBulkRows(
  rows: BulkFacilityRow[],
  meta: { district?: string; generatedBy?: string; generatedAt?: Date } = {},
): ExportRow[] {
  return rows.map(({ facility, activeCycle, funds }) => {
    const out = buildProfileExportData({
      facility,
      cycles: activeCycle ? [activeCycle] : [],
      funds: funds as unknown as Record<string, unknown>[],
      nocs: [],
      buildings: [],
      audits: [],
      settings: meta as Partial<LifecycleSettings> | null,
    });
    const nqas = activeCycle?.nqas ?? null;
    return [
      facility.name,
      facility.ninNumber ?? "",  // text column downstream (NIN as text)
      facility.facilityType,
      facility.phaseType ?? "",
      facility.block,
      facility.phc,
      `${out.stageIndex} of 7`,
      out.chip.label,
      out.scores.ia.value ?? "",
      out.scores.sa.value ?? "",
      out.scores.nqas.value ?? "",
      nqas?.certificationStatus ?? "",
      toDdMmmYyyy(out.validity.from),
      toDdMmmYyyy(out.validity.to),
      out.openGaps,
      facility.saqshamFacilityType ?? "",
      facility.saqshamCategory ?? "",
      facility.remarks ?? "",
    ];
  });
}

export async function exportFacilitiesBulkProfile(
  rows: BulkFacilityRow[],
  meta: { district?: string; generatedBy?: string; generatedAt?: Date } = {},
) {
  await exportExcelWorkbook(
    [
      {
        title: "Facilities",
        header: [...BULK_HEADER],
        rows: buildBulkRows(rows, meta),
        numericCols: [8, 9, 10, 14],
        textCols: [1],
      },
    ],
    {
      facilityName: `${rows.length} facilities — master list${meta.district ? ` · ${meta.district}` : ""}`,
      generatedAt: istStamp(meta.generatedAt),
      generatedBy: meta.generatedBy ?? "",
    },
    (buf) => {
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nqas-facilities-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    },
  );
}

/** Column-order contract for the master-list export — pinned by unit tests. */
export const EXPORT_ORDER = [
  "summary", "lifecycle", "record", "certHistory", "funds", "nocs", "buildings", "audit",
] as const;
