/**
 * Temporary targeted test for exportExcel autofit widths.
 * Writes real workbooks into a temp directory (never the CWD) and reads the
 * resulting !cols back, so the production code path runs end to end.
 * Run: bun test ./scripts/verify-export-autofit.ts
 */
import { describe, it, expect, afterAll } from "bun:test";
import * as XLSX from "xlsx";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { exportExcel } from "../src/lib/exportTable";

const dir = mkdtempSync(join(tmpdir(), "nqas-export-test-"));

async function runExport(
  headers: string[],
  rows: (string | number | null)[][],
): { wch: number }[] {
  // The production writer accepts an absolute path, so the workbook lands
  // in the temp dir instead of the CWD.
  const file = join(dir, `t-${Math.random().toString(36).slice(2)}.xlsx`);
  await exportExcel(file, "Sheet", headers, rows);
  const buf = readFileSync(file);
  const wb = XLSX.read(buf, { type: "buffer", cellStyles: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return (ws["!cols"] ?? []) as { wch: number }[];
}

describe("exportExcel autofit widths", () => {
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("sizes each column to its longest cell (header included) + 2 padding", async () => {
    const cols = await runExport(["Facility", "Type"], [
      ["Kurumbakeri HSC", "HSC"],
      ["Jammanapudur PHC", "PHC"],
    ]);
    expect(cols).toHaveLength(2);
    // Col 0's longest cell is "Jammanapudur PHC" (16) + 2 = 18
    expect(cols[0].wch).toBe(18);
    // Col 1's longest is "Type" (4) + 2 = 6 → raised to the 10-char minimum
    expect(cols[1].wch).toBe(10);
  });

  it("applies the 10-char minimum for short columns", async () => {
    const cols = await runExport(["S.No"], [[1], [2]]);
    expect(cols[0].wch).toBe(10);
  });

  it("caps width at 60 for very long values (remarks/links)", async () => {
    const long = "x".repeat(200);
    const cols = await runExport(["Remarks"], [[long]]);
    expect(cols[0].wch).toBe(60);
  });

  it("ignores null/empty cells when sizing", async () => {
    const cols = await runExport(["A", "B"], [[null, "hi"]]);
    // Col 0: only header "A" (1 char) → min 10.
    // Col 1: "hi" (2) + 2 = 4 → also raised to the 10-char minimum.
    expect(cols[0].wch).toBe(10);
    expect(cols[1].wch).toBe(10);
  });

  it("handles empty data rows (header-only widths)", async () => {
    const cols = await runExport(["S.No", "Facility"], []);
    expect(cols).toHaveLength(2);
    expect(cols[0].wch).toBe(10); // header 4 → min 10
    expect(cols[1].wch).toBe(10); // header 8 → min 10
  });

  it("still writes the sheet data itself (not just widths)", async () => {
    const file = join(dir, "data-check.xlsx");
    await exportExcel(file, "Sheet", ["Facility"], [["Kurumbakeri HSC"]]);
    const wb = XLSX.read(readFileSync(file), { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    expect(ws["A1"].v).toBe("Facility");
    expect(ws["A2"].v).toBe("Kurumbakeri HSC");
  });
});
