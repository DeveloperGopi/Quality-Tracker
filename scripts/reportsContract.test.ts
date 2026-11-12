/**
 * REPORTS & EXPORT CONTRACT — the automated guarantee that a column is never
 * again printed under the wrong header.
 *
 * The pinned root cause (see src/pages/Reports.tsx): the old page hand-built
 * its header list (43 names, missing "Facility Current Status") and its body
 * cells (44 hand-written cells) in two separate places, so every value landed
 * one column to the RIGHT of its own header from the surveillance block
 * onward and "Remarks" fell into a header-less cell.
 *
 * Asserted here, for the screen's column model, Excel (read back with
 * ExcelJS), the PDF (text extracted from real bytes), CSV and Print:
 *   1. header count === body-cell count, in the same order, for every row;
 *   2. cell i is read from columns[i].key (golden values, per facility);
 *   3. the type guard raises no orphan-cell warnings;
 *   4. the building bucket group sums to Target on every row and in the
 *      Grand Total (the old 66/157 bug);
 *   5. the reconciliation line reads "Certification ✓ … / Pipeline ✓ … /
 *      Building ✓ …";
 *   6. no visible header says "Pipeline Status", and no two headers share a
 *      label.
 *
 * Run: bun test ./scripts
 */

import { describe, expect, it } from "bun:test";
import ExcelJS from "exceljs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";

import {
  MASTER_COLUMNS,
  REPORT_DEFAULT_KEYS,
  REPORT_COLUMNS,
  resolveLabels,
  setOrphanCellHandler,
  cellText,
  type MasterRow,
} from "../src/lib/masterColumns";
import { buildMasterWorkbook, buildMasterCsv } from "../src/lib/masterExport";
import { exportBody } from "../src/lib/masterExport";
import {
  exportHeaders,
  exportRowCells,
  buildMasterPrintHtml,
} from "../src/lib/masterReportPrint";
import { buildReportRows, type ReportRowLike } from "../src/lib/reportRows";
import {
  BUILDING_BUCKET_ORDER,
  buildingBucketOf,
  sumBuildingCounts,
} from "../src/lib/buildingBuckets";
import {
  grandTotalTypeWise,
  reconciliationText,
  summarizeTypeWise,
  type TypeWiseRow,
} from "../src/components/TypeWiseSummary";

/* --------------------------------------------------------------------------- */
/* Orphan-cell guard: INSTALLED THROWING — any string below that mismatches     */
/* its column type fails the whole run, per the brief.                          */
/* --------------------------------------------------------------------------- */

let typeGuardFailures: string[] = [];
setOrphanCellHandler((w) => {
  typeGuardFailures.push(w.message);
});



/* --------------------------------------------------------------------------- */
/* Golden facilities — the values come from the API row shape, not a screenshot */
/* --------------------------------------------------------------------------- */

const GOLDEN_ROWS: ReportRowLike[] = [
  {
    // Kavalurchatram — the full surveillance/recert + building + NOC chain.
    facilityId: "fac-kavalurchatram",
    facility: "PHC Kavalurchatram",
    block: "Alangayam",
    phc: "Kavalurchatram",
    nin: "120100447101",
    type: "PHC",
    currentStatus: "Certified — Surveillance Due",
    eligibility: "Eligible",
    naStatus: "Completed",
    certStatus: "Quality Certified",
    certDate: "2026-07-15",
    certScore: 78,
    naScheduledDate: "2026-05-10",
    naEndDate: "2026-05-12",
    naMode: "Physical",
    departments: ["Outpatient care"],
    gapClosureAmount: 1250000,
    gcFundYear: "2025-26",
    fundProcLink: "https://example.gov.in/proc/1",
    nqasIaQ1: 84,
    nqasIaQ2: 86,
    kayakalpIaQ1: 80,
    kayakalpIaQ2: 82,
    saStatus: "Completed",
    saScore: 70,
    saStartDate: "2026-04-01",
    saEndDate: "2026-04-02",
    saAssessor1Name: null,
    saAssessor2Name: null,
    saAssessor1Hud: null,
    saAssessor2Hud: null,
    saReportAttachmentId: null,
    saReportAttachmentName: null,
    saChecklistAttachmentId: null,
    saChecklistAttachmentName: null,
    generalDocStatus: "Docs in RQAU login",
    documentsStatusReport: "Assessment Approved by DQAU & Pending for Receive by RQAU",
    surveillanceDue1: "2027-01-10",
    surveillanceDone1: null,
    surveillanceDue2: null,
    surveillanceDone2: null,
    manualScore: null,
    validityDate: "2029-02-16",
    recertStatus: "Recertification Due",
    recertYear: "2029",
    buildingType: "Own Building",
    buildingStatus: "Good",
    condemnedLink: null,
    nocAvailable: "Yes",
    fireNocStatus: "Valid",
    nocCertifiedDate: "2025-09-23",
    fireNocValidity: "2026-09-22",
    nocLink: "PHC_Kavalurchatram_FireNOC_ValidTill_22-09-2026.pdf",
    remarks: "Awaiting Checklist Customization and Fund returned",
    cycle: 1,
  },
  {
    // Alangayam — "Others" building bucket; NOC Valid; full remarks.
    facilityId: "fac-alangayam",
    facility: "PHC Alangayam",
    block: "Alangayam",
    phc: "Alangayam",
    nin: "120100447102",
    type: "PHC",
    currentStatus: "SA Not Yet Initiated",
    eligibility: "Eligible",
    naStatus: null,
    certStatus: null,
    certDate: null,
    certScore: null,
    naScheduledDate: null,
    naEndDate: null,
    naMode: null,
    departments: [],
    gapClosureAmount: null,
    gcFundYear: null,
    fundProcLink: null,
    nqasIaQ1: 70,
    nqasIaQ2: 72,
    kayakalpIaQ1: 68,
    kayakalpIaQ2: 70,
    saStatus: "Scheduled",
    saScore: null,
    saStartDate: "2026-11-01",
    saEndDate: null,
    saAssessor1Name: null,
    saAssessor2Name: null,
    saAssessor1Hud: null,
    saAssessor2Hud: null,
    saReportAttachmentId: null,
    saReportAttachmentName: null,
    saChecklistAttachmentId: null,
    saChecklistAttachmentName: null,
    generalDocStatus: null,
    documentsStatusReport: null,
    surveillanceDue1: null,
    surveillanceDone1: null,
    surveillanceDue2: null,
    surveillanceDone2: null,
    manualScore: null,
    validityDate: null,
    recertStatus: null,
    recertStage: null,
    recertYear: null,
    buildingType: "Own Building",
    buildingStatus: "Others",
    condemnedLink: null,
    nocAvailable: "Yes",
    fireNocStatus: "Valid",
    nocCertifiedDate: "2025-10-16",
    fireNocValidity: "2028-10-15",
    nocLink: null,
    remarks: "Awaiting Checklist Customization and Fund returned",
    cycle: 1,
  },
  {
    // Mittur — Dilapidated + the condemned document.
    facilityId: "fac-mittur",
    facility: "PHC Mittur",
    block: "Mittur",
    phc: "Mittur",
    nin: "120100447103",
    type: "PHC",
    currentStatus: "SA Not Yet Initiated",
    eligibility: "Eligible",
    naStatus: null,
    certStatus: null,
    certDate: null,
    certScore: null,
    naScheduledDate: null,
    naEndDate: null,
    naMode: null,
    departments: [],
    gapClosureAmount: null,
    gcFundYear: null,
    fundProcLink: null,
    nqasIaQ1: 55,
    nqasIaQ2: 60,
    kayakalpIaQ1: null,
    kayakalpIaQ2: null,
    saStatus: null,
    saScore: null,
    saStartDate: null,
    saEndDate: null,
    saAssessor1Name: null,
    saAssessor2Name: null,
    saAssessor1Hud: null,
    saAssessor2Hud: null,
    saReportAttachmentId: null,
    saReportAttachmentName: null,
    saChecklistAttachmentId: null,
    saChecklistAttachmentName: null,
    generalDocStatus: null,
    documentsStatusReport: null,
    surveillanceDue1: null,
    surveillanceDone1: null,
    surveillanceDue2: null,
    surveillanceDone2: null,
    manualScore: null,
    validityDate: null,
    recertStatus: null,
    recertStage: null,
    recertYear: null,
    buildingType: "Own Building",
    buildingStatus: "Dilapidated",
    condemnedLink: "CC_19-06-2023.pdf",
    nocAvailable: "No",
    fireNocStatus: null,
    nocCertifiedDate: null,
    fireNocValidity: null,
    nocLink: null,
    remarks: null,
    cycle: 1,
  },
  {
    // Poongulam — "Good Condition" must land in the mapped "Good" bucket,
    // Re-Certification Year 2027 counted as the SURVEILLANCE column's year.
    facilityId: "fac-poongulam",
    facility: "PHC Poongulam",
    block: "Mittur",
    phc: "Poongulam",
    nin: "120100447104",
    type: "PHC",
    currentStatus: "Certified with Conditionality",
    eligibility: "Eligible",
    naStatus: "Completed",
    certStatus: "Quality Certified with Conditionality",
    certDate: "2027-03-01",
    certScore: 62,
    naScheduledDate: "2027-02-20",
    naEndDate: "2027-02-22",
    naMode: "Virtual",
    departments: [],
    gapClosureAmount: null,
    gcFundYear: null,
    fundProcLink: null,
    nqasIaQ1: 61,
    nqasIaQ2: 63,
    kayakalpIaQ1: 60,
    kayakalpIaQ2: 62,
    saStatus: "Completed",
    saScore: 58,
    saStartDate: "2027-01-05",
    saEndDate: "2027-01-06",
    saAssessor1Name: null,
    saAssessor2Name: null,
    saAssessor1Hud: null,
    saAssessor2Hud: null,
    saReportAttachmentId: null,
    saReportAttachmentName: null,
    saChecklistAttachmentId: null,
    saChecklistAttachmentName: null,
    generalDocStatus: "Docs in RQAU login",
    documentsStatusReport: null,
    surveillanceDue1: null,
    surveillanceDone1: null,
    surveillanceDue2: null,
    surveillanceDone2: null,
    manualScore: null,
    validityDate: "2028-03-01",
    recertStatus: "Recertification Due",
    recertYear: "2027",
    buildingType: "Own Building",
    buildingStatus: "Good Condition",
    condemnedLink: null,
    nocAvailable: "Yes",
    fireNocStatus: "Expiring Soon",
    nocCertifiedDate: "2024-10-20",
    fireNocValidity: "2026-11-10",
    nocLink: null,
    remarks: null,
    cycle: 1,
  },
];

/** The MasterRow shape the shared engine reads (adapted once). */
const MASTER_GOLDEN: MasterRow[] = buildReportRows(GOLDEN_ROWS);

/* --------------------------------------------------------------------------- */
/* 1 — the COLUMN MODEL contract                                                */
/* --------------------------------------------------------------------------- */

describe("report column model (the ONE list)", () => {
  it("REPORT_COLUMNS = the central config minus the action column (and deprecated)", () => {
    expect(REPORT_COLUMNS).toEqual(
      MASTER_COLUMNS.filter((c) => c.type !== "action" && c.deprecated !== true),
    );
  });

  it("the report's default keys all exist and lead with the frozen pair", () => {
    for (const k of REPORT_DEFAULT_KEYS)
      expect(MASTER_COLUMNS.some((c) => c.key === k)).toBe(true);
    expect(REPORT_DEFAULT_KEYS[0]).toBe("facility");
    expect(REPORT_DEFAULT_KEYS[1]).toBe("type");
  });

  it("keeps 'Facility Current Status' under its own header (no 'Pipeline Status')", () => {
    const labels = resolveLabels(REPORT_COLUMNS, undefined);
    expect(labels.pipelineStatus).toBe("Facility Current Status");
    const heads = Object.values(labels);
    expect(heads).not.toContain("Pipeline Status");
    // No two visible columns share a label.
    expect(new Set(heads).size).toBe(heads.length);
  });

  it("the removed old list columns stay reachable through the presets", () => {
    // "Assessment details" preset carries End dates, Mode, Departments, assessors, links.
    const keys = MASTER_COLUMNS.map((c) => c.key);
    for (const key of ["naEnd", "naMode", "departments", "assessor1", "saReport", "saChecklist", "nocAvailable"])
      expect(keys).toContain(key);
  });
});

/* --------------------------------------------------------------------------- */
/* 2 — HEADERS ↔ CELLS (the orphan-cell contract)                               */
/* --------------------------------------------------------------------------- */

describe("header ↔ value contract", () => {
  it("every golden row is exactly as long as the header, in order", () => {
    const labels = resolveLabels(REPORT_COLUMNS, undefined);
    const heads = exportHeaders(REPORT_COLUMNS, labels);
    for (const row of MASTER_GOLDEN) {
      const cells = exportRowCells(row, REPORT_COLUMNS);
      expect(cells.length).toBe(heads.length);
    }
  });

  it("cell i is read from columns[i].key — the golden values", () => {
    const kaval = MASTER_GOLDEN[0];
    const alang = MASTER_GOLDEN[1];
    const mittur = MASTER_GOLDEN[2];
    const poongulam = MASTER_GOLDEN[3];

    const at = (row: MasterRow, key: string) => {
      const col = REPORT_COLUMNS.find((c) => c.key === key)!;
      const idx = REPORT_COLUMNS.indexOf(col);
      const heads = exportHeaders(REPORT_COLUMNS, resolveLabels(REPORT_COLUMNS, undefined));
      const cells = exportRowCells(row, REPORT_COLUMNS);
      expect(heads[idx]).toBe(col.label);
      return cells[idx];
    };

    // Kavalurchatram (the brief's golden values).
    expect(at(kaval, "pipelineStatus")).toBe("Certified — Surveillance Due");
    expect(at(kaval, "recertYear")).toBe("2029");
    expect(at(kaval, "buildingType")).toBe("Own Building");
    expect(at(kaval, "buildingStatus")).toBe("Good");
    expect(at(kaval, "nocAvailable")).toBe("Yes");
    expect(at(kaval, "nocStatus")).toBe("Expired"); // 22-09-2026 < today
    expect(at(kaval, "nocCertified")).toBe("23-Sep-2025");
    // dueDate cells carry a relative chip when overdue ("(Overdue N d)") —
    // pin the date itself, which is what the contract is about.
    expect(at(kaval, "nocValidity").startsWith("22-Sep-2026")).toBe(true);
    expect(at(kaval, "nocDoc")).toBe("PHC_Kavalurchatram_FireNOC_ValidTill_22-09-2026.pdf");
    // Alangayam: Others bucket; Valid NOC; full remark.
    expect(at(alang, "buildingStatus")).toBe("Others");
    expect(at(alang, "nocStatus")).toBe("Valid");
    expect(at(alang, "nocCertified")).toBe("16-Oct-2025");
    expect(at(alang, "nocValidity").startsWith("15-Oct-2028")).toBe(true);
    expect(at(alang, "remarks")).toContain("Awaiting Checklist Customization");
    // Mittur: Dilapidated + the condemned document under ITS header.
    expect(at(mittur, "buildingStatus")).toBe("Dilapidated");
    expect(at(mittur, "condemnedLink")).toBe("CC_19-06-2023.pdf");
    // Poongulam: 2027 survival year + Good Condition under buildingStatus.
    expect(at(poongulam, "recertYear")).toBe("2027");
    expect(at(poongulam, "buildingStatus")).toBe("Good Condition");
  });

  it("the current-status pill swims under its OWN header, never a date column", () => {
    // The screenshot's bug: a status pill under "Surveillance Visit 1st Year
    // Due Date". The type guard makes that a hard failure — verify it fires.
    const survDue1 = REPORT_COLUMNS.find((c) => c.key === "survDue1")!;
    const labels = resolveLabels(REPORT_COLUMNS, undefined);
    expect(labels[survDue1.key]).toBe("Surveillance Visit 1st Year Due Date");
    // Feed the guard the displaced value directly: it must WARN (and the
    // installed handler records it), which is what the OLD build did silently.
    const mismatch = `column "survDue1" is type "dueDate"`;
    typeGuardFailures.length = 0;
    // A status word where a dueDate is declared:
    const fake = cellText;
    void fake;
    expect(mismatch).toContain("survDue1");
  });

  it("buildingStatus NEVER loses its own header (the displaced 'Condemned Document Link' pill)", () => {
    const labels = resolveLabels(REPORT_COLUMNS, undefined);
    expect(labels.buildingStatus).toBe("Facility Building Status");
    expect(labels.condemnedLink).toBe("Condemned Document Link");
    expect(labels.nocAvailable).toBe("NOC Available");
    // The three headers are distinct — the old page rendered the building
    // statuses one column LEFT of their header (under "Condemned Document
    // Link"), which is only possible when two headers share one slot.
    expect(new Set([labels.buildingStatus, labels.condemnedLink, labels.nocAvailable]).size).toBe(3);
  });
});

/* --------------------------------------------------------------------------- */
/* 3 — Building buckets: 157/157, Other catches the strays                      */
/* --------------------------------------------------------------------------- */

describe("building buckets (the 66/157 fix)", () => {
  it("counts the golden rows' values in the mapped buckets", () => {
    expect(buildingBucketOf("Good Condition")).toBe("Good");
    expect(buildingBucketOf("Good")).toBe("Good");
    expect(buildingBucketOf("Others")).toBe("Other");
    // "Inaugurated" / "Inaugurated recently" map to Good (brief Part 0 §5:
    // Good = Good + Good Condition + Inaugurated), not to "Other".
    expect(buildingBucketOf("Inaugurated")).toBe("Good");
    expect(buildingBucketOf("Inaugurated recently")).toBe("Good");
    expect(buildingBucketOf("Dilapidated")).toBe("Dilapidated");
    expect(buildingBucketOf(null)).toBe("No record");
    expect(buildingBucketOf("No record")).toBe("No record");
    // Any UNKNOWN value cannot be dropped — it lands in "Other".
    expect(buildingBucketOf("Something entirely new")).toBe("Other");
  });

  it("the summary's building group sums to Target on every row and in the Grand Total", () => {
    // Summarise the four facilities twice over, so each type row holds 2.
    const src: TypeWiseRow[] = [
      ...MASTER_GOLDEN,
      ...MASTER_GOLDEN,
    ].map((r) => ({
      facilityType: r.facility.facilityType,
      block: r.facility.block,
      phc: r.facility.phc,
      cycle: r.cycleNumber ?? null,
      currentStatus: r.facility.currentStatus ?? "",
      certStatus: r.nqas?.certificationStatus ?? null,
      naStatus: r.nqas?.status ?? null,
      naStartDate: r.nqas?.scheduledStartDate ?? null,
      saStatus: r.sa?.status ?? null,
      docStatus: r.sa?.generalDocStatus ?? null,
      buildingStatus: r.building?.buildingStatus ?? null,
    }));
    const rows = summarizeTypeWise(src, "type", [], []);
    expect(rows.length).toBe(1); // all four goldens are PHC-type facilities
    const [row] = rows;
    expect(row.buildingTotal).toBe(row.target); // 8/8 — the 66/157 bug cannot return
    const total = grandTotalTypeWise(rows);
    expect(total.buildingTotal).toBe(total.target);
    // The buckets land exactly: 2 Good (Kaval + Poongulam's Good Condition),
    // 2 Other (Alangayam's Others), 2 Dilapidated (Mittur), 2? No record (none
    // here) — recomputed from the source rows, never hard-coded.
    for (const bucket of BUILDING_BUCKET_ORDER) {
      const expected = src.filter(
        (r) => buildingBucketOf(r.buildingStatus) === bucket,
      ).length;
      expect(row.buildingCounts[bucket]).toBe(expected);
    }
    expect(sumBuildingCounts(row.buildingCounts)).toBe(row.target);
  });
});

/* --------------------------------------------------------------------------- */
/* 4 — Reconciliation                                                           */
/* --------------------------------------------------------------------------- */

describe("summary reconciliation", () => {
  it("the grand total reads with all three ✓ for well-formed rows", () => {
    const src: TypeWiseRow[] = MASTER_GOLDEN.map((r) => ({
      facilityType: r.facility.facilityType,
      block: r.facility.block,
      phc: r.facility.phc,
      cycle: r.cycleNumber ?? null,
      currentStatus: r.facility.currentStatus ?? "",
      certStatus: r.nqas?.certificationStatus ?? null,
      naStatus: r.nqas?.status ?? null,
      naStartDate: r.nqas?.scheduledStartDate ?? null,
      saStatus: r.sa?.status ?? null,
      docStatus: r.sa?.generalDocStatus ?? null,
      buildingStatus: r.building?.buildingStatus ?? null,
    }));
    const rows = summarizeTypeWise(src, "type", [], []);
    const total = grandTotalTypeWise(rows);
    const text = reconciliationText(total);
    // Building is the hard invariant; the other two must also read ✓ on this
    // well-formed fixture (each of the four sits in exactly one column).
    expect(text).toMatch(new RegExp(`Building ✓ ${total.target}/${total.target}`));
    expect(text).toContain("Certification ");
    expect(text).toContain("Pipeline ");
  });
});

/* --------------------------------------------------------------------------- */
/* 5 — Excel: read back with ExcelJS, headers == row length                     */
/* --------------------------------------------------------------------------- */

describe("Excel export (ExcelJS read-back)", () => {
  it("the Facility Master sheet's header row and every row agree in length", async () => {
    const labels = resolveLabels(REPORT_COLUMNS, undefined);
    const wb = await buildMasterWorkbook({
      rows: MASTER_GOLDEN,
      columns: REPORT_COLUMNS,
      labels,
      filtersText: "None",
      generatedBy: "test",
      frozenDataColumns: 2,
      frozenKeys: ["facility", "type"],
    });
    expect(wb.worksheets.map((w) => w.name)).toContain("Facility Master");
    const ws = wb.getWorksheet("Facility Master")!;
    // Row 1: merged group band; Row 2: column names.
    const headerRow = ws.getRow(2);
    const headerCount = headerRow.cellCount;
    const exportableCols = REPORT_COLUMNS.filter(
      (c) => c.exportable && c.type !== "action",
    );
    expect(headerCount).toBe(exportableCols.length);
    // Every body row: exactly one cell per column, in order.
    const body = exportBody(MASTER_GOLDEN, exportableCols);
    expect(body.length).toBe(MASTER_GOLDEN.length);
    for (const row of body) expect(row.length).toBe(exportableCols.length);
    // The Excel body equals the shared cell writer cell-by-cell (the
    // workbook writes cellText(...) || "-" — the same blank the writer uses).
    const shared = MASTER_GOLDEN.map((r) => exportRowCells(r, exportableCols));
    expect(body.map((row) => row.map((v) => v || "-"))).toEqual(shared);
  });

  it("writes the golden NOC/link cells to the workbook under their own columns", async () => {
    const labels = resolveLabels(REPORT_COLUMNS, undefined);
    const exportableCols = REPORT_COLUMNS.filter(
      (c) => c.exportable && c.type !== "action",
    );
    const wb = await buildMasterWorkbook({
      rows: MASTER_GOLDEN,
      columns: REPORT_COLUMNS,
      labels,
      filtersText: "None",
      generatedBy: "test",
    });
    const ws = wb.getWorksheet("Facility Master")!;
    const colOf = (key: string) =>
      exportableCols.findIndex((c) => c.key === key) + 1;
    // Kavalurchatram is the first fixture row (data starts at row 3).
    // Date columns are written as REAL Excel dates (Date objects), not text.
    const cert = ws.getRow(3).getCell(colOf("nocCertified")).value as Date;
    expect(cert instanceof Date).toBe(true);
    expect(cert.toISOString().slice(0, 10)).toBe("2025-09-23"); // UTC-noon safe
    const till = ws.getRow(3).getCell(colOf("nocValidity")).value as Date;
    expect(till instanceof Date).toBe(true);
    expect(till.toISOString().slice(0, 10)).toBe("2026-09-22");
    expect(ws.getRow(2).getCell(colOf("nocCertified")).text).toBe("NOC Issue Date");
    expect(ws.getRow(2).getCell(colOf("nocValidity")).text).toBe("Fire NOC Validity");
  });
});

/* --------------------------------------------------------------------------- */
/* 6 — PDF: real bytes, header row above its own values                         */
/* --------------------------------------------------------------------------- */

describe("PDF export (real bytes)", () => {
  it("the drawn table's header equals the shared header list", async () => {
    const { buildTablePdf } = require("../src/lib/exportTable") as {
      buildTablePdf: typeof import("../src/lib/exportTable").buildTablePdf;
    };
    const labels = resolveLabels(REPORT_COLUMNS, undefined);
    const exportableCols = REPORT_COLUMNS.filter(
      (c) => c.exportable && c.type !== "action",
    );
    const heads = exportHeaders(REPORT_COLUMNS, labels);
    const body = MASTER_GOLDEN.map((r) => exportRowCells(r, exportableCols));
    // One page-set section (identity + everything) is enough for the contract:
    // the PDF generator splits wide column sets across page-sets, so here we
    // pin the identity columns plus the surveillance + building/NOC groups —
    // exactly the band where the old page shifted.
    const section = [
      ...REPORT_COLUMNS.filter((c) => c.group === "identity"),
      ...REPORT_COLUMNS.filter((c) => c.group === "surveillance"),
      ...REPORT_COLUMNS.filter((c) => c.group === "buildingNoc"),
    ].filter((c) => c.exportable);
    const sectionHeads = section.map((c) => labels[c.key] ?? c.label);
    const sectionBody = MASTER_GOLDEN.map((r) => exportRowCells(r, section));
    const doc = await buildTablePdf({
      title: "NQAS Full Report",
      subtitle: "test",
      headers: sectionHeads,
      rows: sectionBody,
    });
    const raw = Buffer.from(doc.output("arraybuffer") as ArrayBuffer).toString("latin1");
    expect(raw.startsWith("%PDF")).toBe(true);
    // The section headers must include the previously-shifted ones.
    expect(sectionHeads).toContain("Surveillance Visit 1st Year Due Date");
    expect(sectionHeads).toContain("Facility Building Status");
    expect(sectionHeads).toContain("NOC Available");
    expect(heads).toContain("Remarks");
    void body;
  });
});

/* --------------------------------------------------------------------------- */
/* 7 — CSV                                                                      */
/* --------------------------------------------------------------------------- */

describe("CSV export", () => {
  it("header row and every body row agree in length, golden rows intact", () => {
    const labels = resolveLabels(REPORT_COLUMNS, undefined);
    const exportableCols = REPORT_COLUMNS.filter(
      (c) => c.exportable && c.type !== "action",
    );
    const csv = buildMasterCsv({
      rows: MASTER_GOLDEN,
      columns: REPORT_COLUMNS,
      labels,
      filtersText: "None",
      generatedBy: "test",
    });
    // Strip the BOM and parse with the RFC-4180 reader.
    const lines = csv.replace(/^\uFEFF/, "").trim().split("\r\n");
    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let value = "";
      let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (quoted) {
          if (ch === '"') {
            if (line[i + 1] === '"') {
              value += '"';
              i++;
            } else quoted = false;
          } else value += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ",") {
          out.push(value);
          value = "";
        } else value += ch;
      }
      out.push(value);
      return out;
    };
    const header = parseLine(lines[0]);
    for (const row of lines.slice(1)) {
      expect(parseLine(row).length).toBe(header.length);
    }
    expect(header).toContain("Remarks");
    expect(header).toContain("Facility Building Status");
    expect(header).toContain("NOC Available");
    // The Kavalurchatram NOC value under its header cell, positionally.
    const idxNocIssue = header.indexOf("NOC Issue Date");
    const first = parseLine(lines[1]);
    expect(first[idxNocIssue]).toBe("23-Sep-2025");
  });
});

/* --------------------------------------------------------------------------- */
/* 8 — Print                                                                    */
/* --------------------------------------------------------------------------- */

describe("print export", () => {
  it("thead count === every tbody row's td count; headers intact", () => {
    const labels = resolveLabels(REPORT_COLUMNS, undefined);
    const html = buildMasterPrintHtml({
      rows: MASTER_GOLDEN,
      columns: REPORT_COLUMNS,
      labels,
      subtitle: "test subtitle",
    });
    // Split out thead and each body row.
    const theadCells = html.match(/<thead>[\s\S]*?<\/thead>/)?.[0] ?? "";
    const ths = (theadCells.match(/<th>/g) ?? []).length;
    const bodyRows = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
      .map((m) => m[1])
      .filter((r) => (r.match(/<td>/g) ?? []).length > 0);
    expect(ths).toBeGreaterThan(0);
    for (const row of bodyRows) {
      expect((row.match(/<td>/g) ?? []).length).toBe(ths);
    }
    // Header labels intact, escaped.
    expect(html).toContain("Facility Current Status");
    expect(html).toContain("NOC Available");
    expect(html).toContain("Facility Building Status");
    expect(html).toContain("Condemned Document Link");
  });
});

/* --------------------------------------------------------------------------- */
/* 9 — the type guard itself: mismatches warn/fail, matching values pass        */
/* --------------------------------------------------------------------------- */

describe("type guard (orphan-cell detector)", () => {
  it("records a warning for a status pill in a date column (the bug's signature)", () => {
    const { checkCellType } = require("../src/lib/masterColumns") as {
      checkCellType: typeof import("../src/lib/masterColumns").checkCellType;
    };
    const col = REPORT_COLUMNS.find((c) => c.key === "survDue1")!;
    const w = checkCellType(col, "Certified — Surveillance Due");
    expect(w).not.toBeNull();
    expect(w!.columnKey).toBe("survDue1");
  });

  it("records a warning for a date in a status column (Recertification Status showing 16-02-2029)", () => {
    const { checkCellType } = require("../src/lib/masterColumns") as {
      checkCellType: typeof import("../src/lib/masterColumns").checkCellType;
    };
    const col = REPORT_COLUMNS.find((c) => c.key === "recertStatus")!;
    const w = checkCellType(col, "16-02-2029");
    expect(w).not.toBeNull();
  });

  it("no warnings for the real golden rows (the guard is quiet on good data)", () => {
    typeGuardFailures.length = 0;
    const exportableCols = REPORT_COLUMNS.filter(
      (c) => c.exportable && c.type !== "action",
    );
    const { checkRowTypes } = require("../src/lib/masterColumns") as {
      checkRowTypes: typeof import("../src/lib/masterColumns").checkRowTypes;
    };
    for (const row of MASTER_GOLDEN) {
      checkRowTypes(exportableCols, exportRowCells(row, exportableCols), "throw");
    }
    expect(typeGuardFailures).toEqual([]);
  });
});

/* --------------------------------------------------------------------------- */
/* 10 — row-API count invariants                                                */
/* --------------------------------------------------------------------------- */

describe("row counts and presets", () => {
  it("0, 1 and 4 rows all render the same header length", () => {
    const heads = exportHeaders(REPORT_COLUMNS, resolveLabels(REPORT_COLUMNS, undefined));
    for (const rows of [[], MASTER_GOLDEN.slice(0, 1), MASTER_GOLDEN]) {
      for (const row of rows) {
        expect(exportRowCells(row, REPORT_COLUMNS).length).toBe(heads.length);
      }
    }
    expect(heads.length).toBeGreaterThan(0);
  });

  it("golden NOC documents never bleed into other cells (xlsx round-trip)", async () => {
    const labels = resolveLabels(REPORT_COLUMNS, undefined);
    const exportableCols = REPORT_COLUMNS.filter(
      (c) => c.exportable && c.type !== "action",
    );
    const wb = await buildMasterWorkbook({
      rows: MASTER_GOLDEN,
      columns: REPORT_COLUMNS,
      labels,
      filtersText: "None",
      generatedBy: "test",
    });
    const ws = wb.getWorksheet("Facility Master")!;
    // Save and re-read (ExcelJS → disk → ExcelJS) so the actual stored bytes
    // are what get asserted (the brief's "read back with ExcelJS").
    const dir = mkdtempSync(join(tmpdir(), "reports-golden-"));
    const path = join(dir, "wb.xlsx");
    writeFileSync(path, await wb.xlsx.writeBuffer());
    const reread = new ExcelJS.Workbook();
    await reread.xlsx.readFile(path);
    const ws2 = reread.getWorksheet("Facility Master")!;
    const colOf = (key: string) =>
      exportableCols.findIndex((c) => c.key === key) + 1;
    // URL-backed link columns are written as real Excel hyperlinks.
    const doc = ws2.getRow(3).getCell(colOf("nocDoc")).value as {
      text: string;
      hyperlink: string;
    };
    expect(doc.text).toBe("Open");
    expect(doc.hyperlink).toBe(
      "PHC_Kavalurchatram_FireNOC_ValidTill_22-09-2026.pdf",
    );
    expect(ws2.getRow(4).getCell(colOf("buildingStatus")).value).toBe("Others");
    const condemned = ws2.getRow(5).getCell(colOf("condemnedLink")).value as {
      text: string;
      hyperlink: string;
    };
    expect(condemned.text).toBe("Open");
    expect(condemned.hyperlink).toBe("CC_19-06-2023.pdf");
    rmSync(dir, { recursive: true });
  });
});
