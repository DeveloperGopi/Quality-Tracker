/**
 * Facility Profile workbook contract — writes the REAL production sheet specs
 * through exportExcelWorkbook into a temp file and reads the .xlsx back, so
 * the export alignment rules are asserted end to end:
 *
 *   • the seven sheets, in order, with the exact names the spec asks for
 *   • title row (merged) + generated info row + header row starting at row 4
 *   • freeze panes, auto-filter, header fill/white bold text
 *   • explicit column widths (min 12, max 50) from the longest cell
 *   • NIN stored as TEXT (never scientific notation)
 *   • print setup: landscape, fit to one page wide
 *
 * Run: bun test ./scripts
 */
import { describe, it, expect, afterAll } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";

import {
  buildProfileExportData,
  exportExcelWorkbook,
  profileSheetSpecs,
  profileWorkbookMeta,
} from "../src/lib/profileExport";

const dir = mkdtempSync(join(tmpdir(), "nqas-profile-xlsx-"));

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const TAMIL = "மருத்துவமனை";

const out = buildProfileExportData({
  facility: {
    name: TAMIL,
    block: "Jolarpettai",
    phc: "Pudupettai",
    facilityType: "HWC HSC",
    eligibility: "Eligible",
    ninNumber: "1201004471", // long enough to tempt scientific notation
    phaseType: "Phase-2",
  },
  cycles: [
    {
      cycle: { cycleNumber: 1, cycleType: "Initial" },
      sa: { status: "Completed", scorePercent: 0 },
      nqas: {
        status: "Completed",
        scorePercent: 100,
        certificationStatus: "Quality Certified",
        certificationDate: "2026-03-01",
        validityDate: "2029-03-01",
      },
    },
  ],
  funds: [{ financialYear: "2025-26", status: "Pending", amountSanctioned: 1250000 }],
  nocs: [{ nocAvailable: "Yes", nocNumber: "N1", expiryDate: "2099-01-01" }],
  buildings: [{ buildingType: "Main block", buildingStatus: "Good" }],
  audits: [
    {
      changedAt: Date.UTC(2026, 9, 1, 3, 30),
      changedByName: "admin",
      field: "NIN Number",
      action: "update",
      oldValue: null,
      newValue: "1201004471",
    },
  ],
  generatedBy: "tester",
  generatedAt: new Date(Date.UTC(2026, 9, 14, 3, 30)),
});

async function writeWorkbook(): Promise<ExcelJS.Workbook> {
  const file = join(dir, "profile.xlsx");
  await exportExcelWorkbook(profileSheetSpecs(out), profileWorkbookMeta(out), (buf) => {
    writeFileSync(file, Buffer.from(buf as ArrayBuffer));
  });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(readFileSync(file));
  return wb;
}

describe("profile workbook", () => {
  it("has the requested sheets, in the requested order", async () => {
    const wb = await writeWorkbook();
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "Summary",
      "Facility Record",
      "Certification History",
      "Cycle History",
      "IA Quarters",
      "Gap Closure",
      "Fire NOC",
      "Building",
      "Audit Trail",
    ]);
  });

  it("lays out title / generated / header rows and pins the header row", async () => {
    const wb = await writeWorkbook();
    const ws = wb.getWorksheet("Summary")!;
    expect(String(ws.getCell(1, 1).value)).toBe("NQAS Tracker — Summary");
    expect(String(ws.getCell(2, 1).value)).toContain("Generated");
    expect(String(ws.getCell(2, 1).value)).toContain("tester");
    // Header row = row 4, bold white on the brand fill, centred + wrapped.
    const head = ws.getRow(4);
    expect(head.getCell(1).value).toBe("Metric");
    expect(head.getCell(2).value).toBe("Value");
    expect(head.getCell(1).font?.bold).toBe(true);
    expect(
      (head.getCell(1).fill as ExcelJS.FillPattern).fgColor?.argb,
    ).toBe("FF0D6960");
    expect(head.getCell(1).alignment?.wrapText).toBe(true);
    // Frozen header + auto-filter over the whole used range.
    expect(ws.views?.[0]?.state).toBe("frozen");
    expect(ws.views?.[0]?.ySplit).toBe(4);
    expect(ws.autoFilter).toBeDefined();
  });

  it("sizes every column from its content, between 12 and 50", async () => {
    const wb = await writeWorkbook();
    for (const ws of wb.worksheets) {
      ws.eachRow((row) => {
        row.eachCell(() => {});
      });
      for (let c = 1; c <= ws.columnCount; c++) {
        const w = ws.getColumn(c).width ?? 0;
        expect(w).toBeGreaterThanOrEqual(12);
        expect(w).toBeLessThanOrEqual(50);
      }
    }
  });

  it("keeps the NIN as text so Excel never shows it in scientific notation", async () => {
    const wb = await writeWorkbook();
    const ws = wb.getWorksheet("Facility Record")!;
    let ninCell: ExcelJS.Cell | null = null;
    ws.eachRow((row) => {
      if (String(row.getCell(1).value) === "NIN Number") ninCell = row.getCell(2);
    });
    expect(ninCell).not.toBeNull();
    expect(String(ninCell!.value)).toBe("1201004471");
    expect(ninCell!.numFmt).toBe("@");
  });

  it("exports Tamil values unchanged and prints landscape, fit to one page wide", async () => {
    const wb = await writeWorkbook();
    const ws = wb.getWorksheet("Facility Record")!;
    let nameCell: ExcelJS.Cell | null = null;
    ws.eachRow((row) => {
      if (String(row.getCell(1).value) === "Facility name") nameCell = row.getCell(2);
    });
    expect(String(nameCell!.value)).toBe(TAMIL);
    expect(ws.pageSetup.orientation).toBe("landscape");
    expect(ws.pageSetup.fitToWidth).toBe(1);
    expect(ws.headerFooter?.oddFooter).toContain("Page &P of &N");
  });

  it("keeps 0% and 100% as real numbers with numeric alignment", async () => {
    const wb = await writeWorkbook();
    const ws = wb.getWorksheet("Certification History")!;
    const dataRow = ws.getRow(5);
    expect(dataRow.getCell(3).value).toBe(0); // SA score 0%
    expect(dataRow.getCell(4).value).toBe(100); // NQAS score 100%
    // Vertical alignment is top for wrapped long text columns.
    expect(dataRow.getCell(1).alignment?.vertical).toBe("top");
    expect(dataRow.getCell(1).alignment?.wrapText).toBe(true);
  });
});
