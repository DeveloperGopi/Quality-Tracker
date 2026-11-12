/**
 * FACILITY-MASTER IMPORT TEMPLATE (Part 6.2 / test group 7) — the workbook
 * and CSV are generated from THE central config, never hand-typed.
 *
 * Assertions pin: config-driven headers (importable columns only), the group
 * band row, the NIN text format (leading zeros), the grey "delete this row"
 * sample, the four sheets, derived columns marked "Auto, do not fill", and
 * the Lists sheet carrying the live admin lists + the CSV twin.
 */
import { describe, expect, it } from "bun:test";

import { DEFAULT_SETTINGS } from "../src/convex/lifecycle";
import {
  IMPORTABLE_COLUMNS,
  buildMasterImportCsv,
  buildMasterImportWorkbook,
} from "../src/lib/masterImportTemplate";
import {
  cellText,
  fullExportColumns,
  isDeprecatedColumn,
  type MasterRow,
} from "../src/lib/masterColumns";

const LISTS = {
  Blocks: ["Alangayam", "Madhanur"],
  FacilityTypes: DEFAULT_SETTINGS.facilityTypes,
  BuildingTypes: DEFAULT_SETTINGS.buildingTypes,
  CertificationStatuses: DEFAULT_SETTINGS.certificationStatuses,
};

/** A slim MasterRow — enough for one current-data row's cellText calls. */
const row = (over: Partial<MasterRow["facility"]> = {}): MasterRow => ({
  facility: {
    _id: "f1",
    name: over.name ?? "Poongulam HSC",
    block: over.block ?? "Alangayam",
    phc: over.phc ?? "Udhayenthiram",
    facilityType: over.facilityType ?? "HWC HSC",
    ninNumber: over.ninNumber ?? "0123456789",
    eligibility: over.eligibility ?? "Eligible",
    ...over,
  },
  sa: null,
  nqas: null,
  fund: null,
  noc: null,
  building: null,
});

describe("facility-master import template", () => {
  it("headers come from the central config (importable columns only, none deprecated)", () => {
    expect(IMPORTABLE_COLUMNS.length).toBeGreaterThan(0);
    for (const c of IMPORTABLE_COLUMNS) {
      expect(c.importable).toBe(true);
      expect(isDeprecatedColumn(c)).toBe(false);
    }
    // Every importable column must be part of the exportable master set.
    const exportableKeys = new Set(fullExportColumns().map((c) => c.key));
    for (const c of IMPORTABLE_COLUMNS) expect(exportableKeys.has(c.key)).toBe(true);
  });

  it("the workbook has the four sheets in order and the NIN column is TEXT", () => {
    const wb = buildMasterImportWorkbook({
      template: "blank",
      rows: [],
      lists: LISTS,
      generatedBy: "test",
    });
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "Facility Master",
      "Instructions",
      "Field guide",
      "Lists",
    ]);
    const ws = wb.getWorksheet("Facility Master")!;
    const nin = IMPORTABLE_COLUMNS.findIndex((c) => c.key === "nin");
    expect(nin).toBeGreaterThanOrEqual(0);
    expect(ws.getRow(2).getCell(nin + 1).numFmt).toBe("@");
  });

  it("the blank template carries exactly one grey 'delete this row' sample", () => {
    const wb = buildMasterImportWorkbook({
      template: "blank",
      rows: [],
      lists: LISTS,
      generatedBy: "test",
    });
    const ws = wb.getWorksheet("Facility Master")!;
    // Rows: 1 band + 1 header + 1 sample = 3.
    expect(ws.rowCount).toBe(3);
    const sample = ws.getRow(3);
    expect(sample.getCell(1).fill.fgColor?.argb).toBe("FFF1F5F9");
    expect(sample.getCell(1).value).toContain("delete this row");
    const current = buildMasterImportWorkbook({
      template: "current",
      rows: [row(), row({ name: "Second" })],
      lists: LISTS,
      generatedBy: "test",
    });
    expect(current.getWorksheet("Facility Master")!.rowCount).toBe(4);
  });

  it("current-data rows print exactly what the shared cell writer prints", () => {
    const r = row();
    const wb = buildMasterImportWorkbook({
      template: "current",
      rows: [r],
      lists: LISTS,
      generatedBy: "test",
    });
    const ws = wb.getWorksheet("Facility Master")!;
    const facilityCol = IMPORTABLE_COLUMNS.findIndex((c) => c.key === "facility");
    expect(ws.getRow(3).getCell(facilityCol + 1).value).toBe(cellText(r, "facility"));
  });

  it("the Field guide marks every derived column 'Auto, do not fill'", () => {
    const wb = buildMasterImportWorkbook({
      template: "blank",
      rows: [],
      lists: LISTS,
      generatedBy: "test",
    });
    const guide = wb.getWorksheet("Field guide")!;
    const rows: [string, string][] = [];
    guide.eachRow((r) =>
      rows.push([
        String(r.getCell(1).value ?? ""),
        String(r.getCell(4).value ?? ""),
      ]),
    );
    // The derived Certification Cycle row is present but marked auto —
    // named with the central config's plain-English label (the guide and
    // the Facility Master header row share one label source).
    const cycle = rows.find(([name]) => name === "Certification Cycle");
    expect(cycle?.[1]).toContain("Auto, do not fill");
    // And every IMPORTABLE column is marked importable.
    for (const c of IMPORTABLE_COLUMNS) {
      const line = rows.find(([name]) => name === c.label);
      expect(line?.[1]).toBe("Yes");
    }
  });

  it("the Lists sheet carries the live lists so dropdowns work offline", () => {
    const wb = buildMasterImportWorkbook({
      template: "blank",
      rows: [],
      lists: LISTS,
      generatedBy: "test",
    });
    const lists = wb.getWorksheet("Lists")!;
    expect(lists.getRow(1).values.slice(1)).toEqual(["Blocks", "FacilityTypes", "BuildingTypes", "CertificationStatuses"]);
    expect(lists.getRow(2).getCell(2).value).toBe(DEFAULT_SETTINGS.facilityTypes[0]);
  });

  it("the CSV twin shares the same headers and starts with the sample note", () => {
    const csv = buildMasterImportCsv(LISTS);
    const lines = csv.split("\n");
    expect(lines[0].split(",")).toEqual(IMPORTABLE_COLUMNS.map((c) => c.label));
    expect(csv).toContain("Blocks: Alangayam | Madhanur");
  });
});
