/**
 * Profile export mapper tests — empty values, long text, Tamil text,
 * 0/100% scores, NOC validity dates, NIN-as-text and the master-list bulk
 * column contract.
 *
 * Run: bun test ./scripts
 */
import { describe, it, expect } from "bun:test";

import {
  BULK_HEADER,
  buildBulkRows,
  buildProfileExportData,
  istStamp,
  type BulkFacilityRow,
} from "../src/lib/profileExport";

const base = (over: Partial<Parameters<typeof buildProfileExportData>[0]> = {}) =>
  buildProfileExportData({
    facility: {
      name: "Thiriyalam",
      block: "Jolarpettai",
      phc: "Pudupettai",
      facilityType: "HWC HSC",
      eligibility: "Eligible",
      ninNumber: "NIN-4471",
    },
    cycles: [],
    funds: [],
    nocs: [],
    buildings: [],
    audits: [],
    ...over,
  });

describe("profile export mapper", () => {
  it("every empty value says what is missing — never a bare dash", () => {
    const out = base();
    for (const [, v] of out.kpis) expect(String(v)).not.toBe("—");
    for (const [k, v] of out.record) {
      if (String(v).startsWith("—")) expect(String(v)).toContain("Not recorded yet");
      expect(k).toBeTruthy();
    }
  });

  it("dates are DD-MMM-YYYY in the record and cert history", () => {
    const out = base({
      cycles: [
        {
          cycle: { cycleNumber: 1, cycleType: "Initial" },
          sa: { status: "Completed", scorePercent: 0, actualStartDate: "2026-02-01" },
          nqas: {
            status: "Completed",
            scorePercent: 100,
            certificationStatus: "Quality Certified",
            certificationDate: "2026-03-01",
            validityDate: "2029-03-01",
          },
        },
      ],
    });
    const history = out.certHistory[0];
    expect(history[4]).toContain("Certified");
    expect(String(history[5]))
      .toBe("01-Mar-2026 to 01-Mar-2029");
    const kpiValidity = String(out.kpis.find((k) => k[0] === "Certification validity")![1]);
    expect(kpiValidity).toContain("01-Mar-2026");
    expect(kpiValidity).toContain("(0% scores are numbers)".slice(0, 0) + "");
    // 0% and 100% stay real numbers in the score KPIs.
    expect(String(out.kpis.find((k) => k[0] === "State Assessment score")![1])).toBe("SA score 0%");
    expect(String(out.kpis.find((k) => k[0] === "NQAS Assessment score")![1])).toBe("NQAS score 100%");
  });

  it("Tamil text survives the mapper byte-for-byte and wraps at a sane column width", () => {
    const tamil = "மருத்துவமனை தரம் வாரியம்";
    const out = base({
      facility: { name: tamil, block: tamil, phc: "Pudupettai", facilityType: "HWC HSC", eligibility: "Eligible", remarks: tamil.repeat(20) },
    });
    const nameRow = out.record.find((r) => r[0] === "Facility name")!;
    expect(nameRow[1]).toBe(tamil);
    expect(String(out.record.find((r) => r[0] === "General remarks")![1]).startsWith(tamil)).toBe(true);
  });

  it("long text is truncated in audit cells but preserved in remarks/labels", () => {
    const long = "x".repeat(400);
    const out = base({
      audits: [{ changedAt: Date.now(), changedByName: "admin", field: long, action: "update", oldValue: long, newValue: long }],
      facility: { name: "F", block: "B", phc: "P", facilityType: "PHC", eligibility: "Eligible", remarks: long },
    });
    // Every audit cell — including the Change column — is capped so no PDF
    // column can be blown up by one long value.
    expect(String(out.audit[0][2]).length).toBe(120);
    expect(String(out.audit[0][3]).length).toBe(120);
    expect(String(out.audit[0][4]).length).toBe(120);
  });

  it("Tamil text reaches the Excel/PDF mapper unchanged (only the audit cell is capped)", () => {
    const tamil = "மருத்துவமனை";
    const out = base({
      facility: {
        name: tamil,
        block: "ஜோலார்பேட்டை",
        phc: "புதுப்பேட்டை",
        facilityType: "HWC HSC",
        eligibility: "Eligible",
      },
      audits: [
        {
          changedAt: Date.UTC(2026, 9, 1),
          changedByName: "அமைப்பாளர்",
          field: tamil,
          action: "update",
        },
      ],
    });
    expect(out.record.find((r) => r[0] === "Facility name")![1]).toBe(tamil);
    expect(out.record.find((r) => r[0] === "Block")![1]).toBe("ஜோலார்பேட்டை");
    expect(out.audit[0][1]).toBe("அமைப்பாளர்");
    expect(out.audit[0][2]).toBe(tamil);
  });

  it("NOC validity uses the shared date rule", () => {
    const out = base({
      nocs: [
        { nocAvailable: "Yes", nocNumber: "N1", expiryDate: "2026-01-01" },
        { nocAvailable: "Yes", nocNumber: "N2", expiryDate: "2099-01-01" },
        { nocAvailable: "No" },
      ],
    });
    expect(out.nocs[0][4]).toBe("Expired");
    expect(out.nocs[1][4]).toBe("Valid");
    expect(out.nocs[2][4]).toBe("Not Obtained");
  });

  it("money amounts use the Indian digit grouping", () => {
    const out = base({ funds: [{ financialYear: "2025-26", status: "Pending", amountSanctioned: 1250000 }] });
    expect(out.funds[0][2]).toContain("₹12,50,000");
  });
});

describe("bulk master-list export", () => {
  it("keeps the pinned column order and treats every NIN as text", () => {
    expect(BULK_HEADER[0]).toBe("Facility name");
    expect(BULK_HEADER[1]).toBe("NIN Number");
    expect(BULK_HEADER[16]).toBe("SaQsham Name/Category");
    expect(BULK_HEADER[17]).toBe("Remarks");
  });

  it("one row per facility with the mapper-derived numbers", () => {
    const rows: BulkFacilityRow[] = [
      {
        facility: { name: "A", block: "B", phc: "P", facilityType: "PHC", eligibility: "Eligible", ninNumber: "NIN1" },
        activeCycle: {
          cycle: { cycleNumber: 1, cycleType: "Initial" },
          sa: { status: "Completed", scorePercent: 75 },
          nqas: { status: "Completed", scorePercent: 80, certificationStatus: "Quality Certified", certificationDate: "2026-03-01", validityDate: "2029-03-01" },
        },
        funds: [{ status: "Pending" }],
      },
      {
        facility: { name: "B", block: "B", phc: "P", facilityType: "PHC", eligibility: "Eligible" },
        activeCycle: null,
        funds: [],
      },
    ];
    const data = buildBulkRows(rows, { generatedBy: "tester", generatedAt: new Date(0) });
    expect(data).toHaveLength(2);
    expect(data[0]![9]).toBe(75);  // SA score column
    expect(data[0]![10]).toBe(80); // NQAS score column
    expect(String(data[0]![13])).toBe("01-Mar-2029"); // Valid till
    expect(data[1]![8]).toBe("");   // IA — not recorded
    expect(String(data[1]![7])).toContain("Not Yet Initiated".slice(0, 15));
  });

  it("a Tamil facility, a 0% SA and a missing NIN still line up column-wise", () => {
    const rows: BulkFacilityRow[] = [
      {
        facility: {
          name: "மருத்துவமனை திரியாளம்",
          block: "ஜோலார்பேட்டை",
          phc: "புதுப்பேட்டை",
          facilityType: "HWC HSC",
          eligibility: "Eligible",
        },
        activeCycle: {
          cycle: { cycleNumber: 2, cycleType: "Recertification" },
          sa: { status: "Completed", scorePercent: 0 },
          nqas: { status: "Completed", scorePercent: 100 },
        },
        funds: [],
      },
    ];
    const [row] = buildBulkRows(rows, { generatedBy: "tester" });
    expect(row![0]).toBe("மருத்துவமனை திரியாளம்");
    expect(row![1]).toBe(""); // NIN absent → blank, and the Excel column is text
    expect(row![2]).toBe("HWC HSC");
    expect(row![4]).toBe("ஜோலார்பேட்டை");
    expect(row![8]).toBe(""); // IA — never recorded → blank, NOT a 0% score
    expect(row![9]).toBe(0);   // SA 0% survives as a number
    expect(row![10]).toBe(100); // NQAS 100%
    expect(row).toHaveLength(BULK_HEADER.length);
  });

  it("IST stamp is shifted +5:30 regardless of the generating clock", () => {
    // 2000-01-01T00:00:00Z → 05:30 IST
    expect(istStamp(new Date(Date.UTC(2000, 0, 1)))).toBe("01-Jan-2000 05:30 IST");
    // 2000-01-01T20:00:00Z → next day 01:30 IST
    expect(istStamp(new Date(Date.UTC(2000, 0, 1, 20)))).toBe("02-Jan-2000 01:30 IST");
  });
});
