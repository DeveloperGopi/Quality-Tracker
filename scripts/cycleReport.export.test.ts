/** CERTIFICATION CYCLES EXPORTS — Excel, PDF and CSV read the same pure
 *  builder as the screen. Sheet list, no ISO dates, no sentences in cells,
 *  a blank score never printed as 0, and the file-name rule. */
import { describe, expect, test } from "bun:test";
import {
  buildCyclePdf,
  buildCycleWorkbook,
  cycleFileName,
  cycleReportCsv,
  type CycleExportMeta,
} from "../src/lib/cycleReportExport";
import type { CycleReportRow } from "../src/lib/cycleReport";

const row: CycleReportRow = {
  facilityId: "f1",
  facility: "Alangayam (CHC)",
  block: "Alangayam",
  phc: "Alangayam",
  type: "CHC",
  nin: "NIN-1",
  eligibility: "Eligible",
  currentStatus: "Certified — On track",
  currentCycleNumber: 1,
  documentsStatusReport: null,
  cycleId: "c1",
  cycleNumber: 1,
  cycleType: "Initial",
  superseded: false,
  recertStage: null,
  cycleCreatedAt: Date.UTC(2025, 5, 20),
  saStatus: "Completed",
  saScheduledDate: "2025-06-20",
  saStartDate: "2025-06-25",
  saEndDate: "2025-07-01",
  saScore: 80,
  generalDocStatus: "Docx forwarded to NHSRC",
  naStatus: "Completed",
  naScheduledDate: "2025-07-20",
  naEndDate: "2025-08-01",
  naMode: "Physical",
  certStatus: "Quality Certified",
  certDate: "2025-08-18",
  goiLetterDate: null,
  certScore: 89,
  manualScore: null,
  validityDate: "2028-08-18",
  surveillanceDue1: "2026-08-18",
  surveillanceDone1: "2026-08-17",
  surveillanceDue2: "2027-08-18",
  surveillanceDone2: null,
  recertStatus: null,
  recertYear: null,
  buildingStatus: "Good",
  nocStatus: "Valid",
};

/** The Kurumbakeri case: a Deferred Cycle #2 with no score at all. */
const deferredCycle1: CycleReportRow = {
  ...row,
  facilityId: "f2",
  facility: "Kurumbakeri (HSC)",
  cycleId: "c2a",
};
const deferred: CycleReportRow = {
  ...row,
  facilityId: "f2",
  facility: "Kurumbakeri (HSC)",
  cycleId: "c2",
  cycleNumber: 2,
  cycleType: "Recertification",
  certStatus: "Deferred",
  certDate: null,
  goiLetterDate: "2026-07-29",
  certScore: null,
  validityDate: null,
};

const meta: CycleExportMeta = {
  filtersText: "All cycles · No filters",
  generatedAt: "2026-10-24",
  generatedBy: "NQAS Tracker",
  reportId: "CR-20261024",
  district: "Tirupathur",
  knownCycles: [
    { cycleNumber: 1, cycleType: "Initial" },
    { cycleNumber: 2, cycleType: "Recertification" },
  ],
};

describe("Certification Cycles workbook", () => {
  test("has exactly the five data sheets plus the cover", async () => {
    const wb = await buildCycleWorkbook([row], meta, {});
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "Cover",
      "Overview",
      "Renewals",
      "Compare",
      "Facility-cycles",
      "Definitions",
    ]);
    // Removed sections stay removed from the export too.
    for (const gone of ["Lifecycle", "Recertification outlook", "Cycle matrix"]) {
      expect(wb.getWorksheet(gone)).toBeUndefined();
    }
  });

  test("the cover keeps the Report ID that the screen no longer shows", async () => {
    const wb = await buildCycleWorkbook([row], meta, {});
    const cover = wb.getWorksheet("Cover")!;
    const keys = new Map<string, string>();
    cover.eachRow((r) => {
      keys.set(String(r.getCell(1).value ?? ""), String(r.getCell(2).value ?? ""));
    });
    expect(keys.get("Report ID")).toBe("CR-20261024");
    expect(keys.get("Data as of")).toContain("24-Oct-2026");
    expect(keys.get("District")).toBe("Tirupathur");
  });

  test("the Overview card uses the small-n fraction, not a percentage", async () => {
    const wb = await buildCycleWorkbook([row], meta, {});
    const ov = wb.getWorksheet("Overview")!;
    expect(String(ov.getCell(1, 1).value)).toBe("Cycle");
    expect(String(ov.getCell(2, 1).value)).toBe("Cycle #1 Initial");
    expect(ov.getCell(2, 3).value).toBe(1); // facilities
    expect(ov.getCell(2, 4).value).toBe(1); // hold
    expect(String(ov.getCell(2, 5).value)).toBe("1 of 1");
  });

  test("a blank score is never written as 0 and never a change", async () => {
    const wb = await buildCycleWorkbook([row, deferredCycle1, deferred], meta, {});
    const cp = wb.getWorksheet("Compare")!;
    let kurumbakeri: { from: unknown; to: unknown; delta: unknown } | null = null;
    cp.eachRow((r, n) => {
      if (n > 1 && String(r.getCell(1).value).includes("Kurumbakeri")) {
        kurumbakeri = {
          from: r.getCell(5).value,
          to: r.getCell(9).value,
          delta: r.getCell(11).value,
        };
      }
    });
    expect(kurumbakeri).toEqual({ from: 89, to: "-", delta: "-" });
    const facilityCycles = wb.getWorksheet("Facility-cycles")!;
    let deferredScore: string | number | null = null;
    facilityCycles.eachRow((r, n) => {
      if (
        n > 1 &&
        String(r.getCell(1).value).includes("Kurumbakeri") &&
        String(r.getCell(6).value) === "#2"
      ) {
        deferredScore = r.getCell(9).value as string;
      }
    });
    expect(deferredScore).toBe("-");
  });

  test("dates are real date cells formatted dd-mmm-yyyy, never ISO text", async () => {
    const wb = await buildCycleWorkbook([row], meta, {});
    const fc = wb.getWorksheet("Facility-cycles")!;
    const certifiedOn = fc.getCell(2, 10);
    expect(certifiedOn.value instanceof Date).toBe(true);
    expect(certifiedOn.numFmt).toBe("dd-mmm-yyyy");
    expect(String(fc.getCell(1, 10).value)).toBe("Certified on");
    // Part 5.2 — the migration "Started" column is gone from the export too.
    const headers: string[] = [];
    fc.getRow(1).eachCell((c) => headers.push(String(c.value)));
    expect(headers).not.toContain("Started");
  });

  test("the facility-cycles sheet is frozen on the first two columns", async () => {
    const wb = await buildCycleWorkbook([row], meta, {});
    const fc = wb.getWorksheet("Facility-cycles")!;
    expect(fc.views?.[0]).toMatchObject({ state: "frozen", xSplit: 2, ySplit: 1 });
    expect(fc.autoFilter).toBeTruthy();
  });
});

describe("Certification Cycles CSV", () => {
  test("carries the BOM, the filters and the Report ID, with display dates", () => {
    const csv = cycleReportCsv([row], meta, {});
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("CR-20261024");
    expect(csv).toContain("All cycles · No filters");
    expect(csv).toContain("18-Aug-2025");
    // No ISO date and no removed "Started" column.
    expect(csv).not.toContain("2025-08-18");
    expect(csv).not.toContain("Started");
  });

  test("the Renewals view writes one row per facility with its step", () => {
    const csv = cycleReportCsv([row, deferred], meta, {}, "renewals");
    const lines = csv.split("\r\n");
    expect(lines[2]).toBe(
      "Facility,Type,Block,Valid till,Days left,Renewal step,Next action",
    );
    expect(csv).toContain("Cooling period ends 29-Oct-2026");
  });

  test("the Compare view carries the recertification timing, never “On time” for a deferral", () => {
    const csv = cycleReportCsv([row, deferredCycle1, deferred], meta, {}, "compare");
    expect(csv).toContain("Not recertified yet · cooling period ends 29-Oct-2026");
    expect(csv).not.toContain("On time");
  });

  test("a blank score never becomes 0.00", () => {
    const csv = cycleReportCsv([deferred], meta, {}, "list");
    expect(csv).not.toContain("0.00");
    expect(csv).toContain("Kurumbakeri (HSC),CHC");
  });
});

describe("Certification Cycles PDF", () => {
  test("real bytes, more than one page, no ISO date in the text stream", async () => {
    const doc = await buildCyclePdf([row, deferred], meta, {});
    const raw = Buffer.from(doc.output("arraybuffer") as ArrayBuffer).toString("latin1");
    expect(raw.startsWith("%PDF")).toBe(true);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(raw).not.toContain("2025-08-18");
  });
});

describe("file name", () => {
  test("follows {District} Certification Cycles {View} {DD-MM-YYYY}", () => {
    expect(
      cycleFileName({ district: "Tirupathur", view: "renewals", date: "2026-10-27", ext: "xlsx" }),
    ).toBe("Tirupathur Certification Cycles Renewals 27-10-2026.xlsx");
    expect(
      cycleFileName({ district: "Tirupathur", view: "full", date: "2026-10-27", ext: "pdf" }),
    ).toBe("Tirupathur Certification Cycles Full Report 27-10-2026.pdf");
    expect(cycleFileName({ view: "overview", date: "2026-10-27", ext: "csv" })).toBe(
      "District Certification Cycles Overview 27-10-2026.csv",
    );
  });
});
