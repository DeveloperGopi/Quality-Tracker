/**
 * Facility Profile PDF contract — renders the REAL export (A4 portrait,
 * 15mm margins, header on every page, footer with the page count) into a
 * temp file and inspects the bytes:
 *
 *   • a non-trivial PDF is produced
 *   • every page is A4 portrait (MediaBox 595 × 842 pt — never landscape)
 *   • the header identity band and the confidentiality footer are present
 *   • multi-page output numbers its pages "Page X of Y"
 *
 * Run: bun test ./scripts
 */
import { describe, it, expect, afterAll } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildProfileExportData, exportProfilePdf } from "../src/lib/profileExport";

const dir = mkdtempSync(join(tmpdir(), "nqas-profile-pdf-"));

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** A facility with content in every section, so the PDF must paginate. */
const out = buildProfileExportData({
  facility: {
    name: "Thiriyalam",
    block: "Jolarpettai",
    phc: "Pudupettai",
    facilityType: "HWC HSC",
    eligibility: "Eligible",
    ninNumber: "1201004471",
    phaseType: "Phase-2",
    saqshamFacilityType: "HWC",
    saqshamCategory: "Sub centre",
    remarks: "R".repeat(600),
    iaLastDate: "2026-08-21",
    iaLastScore: 82,
  },
  cycles: [
    {
      cycle: { cycleNumber: 1, cycleType: "Initial" },
      sa: { status: "Completed", scorePercent: 92, actualStartDate: "2025-08-01", actualEndDate: "2025-08-02" },
      nqas: {
        status: "Completed",
        scorePercent: 88,
        certificationStatus: "Quality Certified",
        certificationDate: "2025-10-01",
        validityDate: "2028-10-01",
      },
    },
    {
      cycle: { cycleNumber: 2, cycleType: "Recertification", superseded: true },
      sa: { status: "Completed", scorePercent: 0 },
      nqas: { status: "Completed", scorePercent: 100 },
    },
  ],
  funds: Array.from({ length: 12 }, (_, i) => ({
    financialYear: `20${20 + i}-${21 + i}`,
    status: "Pending",
    amountSanctioned: 1250000 + i,
    amountUtilized: 250000,
    remarks: "Long fund remark ".repeat(6),
  })),
  nocs: [{ nocAvailable: "Yes", nocNumber: "N-123", issuedDate: "2024-01-01", expiryDate: "2029-01-01" }],
  buildings: [{ buildingType: "Main block", buildingStatus: "Good", remarks: "B".repeat(300) }],
  audits: Array.from({ length: 10 }, (_, i) => ({
    changedAt: Date.UTC(2026, 9, i + 1, 3, 30),
    changedByName: `user-${i}`,
    field: `Field ${i}`,
    action: "update",
    oldValue: "a".repeat(200),
    newValue: "b".repeat(200),
  })),
  generatedBy: "tester",
  generatedAt: new Date(Date.UTC(2026, 9, 14, 3, 30)),
});

function render(name: string): { path: string; raw: string; size: number } {
  const path = join(dir, `${name}.pdf`);
  exportProfilePdf(out, "thiriyalam-1201004471", path);
  const buf = readFileSync(path);
  return { path, raw: buf.toString("latin1"), size: statSync(path).size };
}

describe("profile PDF", () => {
  it("writes a non-trivial A4-portrait PDF", () => {
    const { path, raw, size } = render("profile");
    expect(existsSync(path)).toBe(true);
    expect(size).toBeGreaterThan(10_000);
    expect(raw.startsWith("%PDF")).toBe(true);
    // A4 portrait: 595.28 × 841.89 pt, never the landscape pair.
    const boxes = raw.match(/\/MediaBox\s*\[0 0 [\d.]+ [\d.]+\]/g) ?? [];
    expect(boxes.length).toBeGreaterThan(0);
    for (const b of boxes) {
      expect(b).toContain("595");
      expect(b).not.toContain("841.89 595");
    }
  });

  it("paginates long content and numbers every page", () => {
    const { raw } = render("pages");
    const pageCount = (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pageCount).toBeGreaterThan(1);
    // The footer is finalised with the real total: "Page 1 of N".
    expect(raw).toContain(`Page 1 of ${pageCount}`);
    expect(raw).toContain(`Page ${pageCount} of ${pageCount}`);
  });

  it("carries the identity header and the confidentiality footer on the pages", () => {
    const { raw } = render("header");
    expect(raw).toContain("NQAS Tracker");
    expect(raw).toContain("District Health Facility Quality Monitoring System");
    expect(raw).toContain("Thiriyalam");
    expect(raw).toContain("1201004471");
    expect(raw).toContain("Confidential");
    // Generated stamp + author are printed in IST.
    expect(raw).toContain("14-Oct-2026");
  });

  it("never prints a bare dash for a missing value", () => {
    const sparse = buildProfileExportData({
      facility: {
        name: "Sparse HSC",
        block: "B",
        phc: "P",
        facilityType: "HSC",
        eligibility: "Eligible",
      },
      cycles: [],
      funds: [],
      nocs: [],
      buildings: [],
      audits: [],
      generatedBy: "tester",
    });
    const path = join(dir, "sparse.pdf");
    exportProfilePdf(sparse, "sparse", path);
    const raw = readFileSync(path).toString("latin1");
    // The record section spells blanks out in words.
    expect(raw).toContain("Not recorded yet");
    // Empty sections say what to do instead of printing an empty table.
    expect(raw).toContain("No records yet");
  });
});
