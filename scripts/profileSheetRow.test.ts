/**
 * PROFILE → SHEET ROW — parity with the Master List and Quick View.
 *
 * The Facility Profile page prints the two-page sheet through the adapter
 * below, while the list prints it from `ops.listFacilityRowsFast` rows. These
 * tests build both for Athanavur and compare the rendered model, so the sheet
 * cannot say one thing on the profile and another from the list — and so the
 * two bugs from the brief stay fixed:
 *   • the quarterly IA store (83.8 / 83.9) is what the sheet reads, not the
 *     legacy Q1/Q2 columns,
 *   • a blank "Documents Status (Report)" is reported as a data check instead
 *     of quietly showing the portal phrase in the wrong field.
 *
 * Run: bun test ./scripts/profileSheetRow.test.ts
 */
import { describe, expect, it } from "bun:test";

import { buildSheetModel } from "../src/lib/facilitySheet";
import { masterRowFromProfile, type ProfileSheetInput } from "../src/lib/profileSheetRow";
import type { MasterRow } from "../src/lib/masterColumns";

const TODAY = "2026-10-22";

const facility = {
  _id: "f1",
  name: "PHC Athanavur",
  block: "Jolarpettai",
  phc: "PHC Athanavur",
  facilityType: "PHC",
  ninNumber: "2426248478",
  eligibility: "Eligible",
  currentStatus: "Certified",
  remarks: "Verified during the state visit.",
  currentCycleNumber: 1,
  nqasIaQ1: null,
  nqasIaQ2: null,
  kayakalpIaQ1: null,
  kayakalpIaQ2: null,
  updatedAt: Date.UTC(2026, 9, 21, 3, 0),
};

const sa = {
  status: "Completed",
  actualStartDate: "2026-09-24",
  actualEndDate: "2026-09-25",
  scorePercent: 88.5,
  assessor1Name: "Dr Rao",
  assessor1Hud: "Vellore",
  generalDocStatus: "Completed & Awaiting Results",
  reportAttachmentName: "SA-Report-Athanavur.pdf",
  checklistAttachmentName: "SA-Checklist-Athanavur.pdf",
};

const nqas = {
  status: "Completed",
  scorePercent: 83.8,
  certificationStatus: "Quality Certified",
  certificationDate: "2026-10-12",
  validityDate: "2029-10-12",
  surveillanceDue1: "2027-10-12",
  recertYear: 2029,
  manualRecertStatus: "Recertification Due",
};

const funds = [
  {
    financialYear: "2025-26",
    status: "Utilized",
    amountSanctioned: 50000,
  },
  {
    financialYear: "2026-27",
    status: "Pending",
    amountSanctioned: 100000,
    amountReleased: 40000,
    amountUtilized: 0,
    procLink: "https://nqas.example.gov.in/proc/Athanavur-2026-27.pdf",
  },
];

const nocs = [
  {
    nocAvailable: "Yes",
    status: "Valid",
    issuedDate: "2024-01-10",
    expiryDate: "2029-01-09",
    // The Convex fireNocs doc stores `attachmentName`; the row exposes it as
    // `nocAttachmentName` (same as ops.listFacilityRowsFast).
    attachmentName: "Fire-NOC-Athanavur.pdf",
  },
];

const buildings = [{ buildingType: "Main block", buildingStatus: "Good" }];

const iaQuarters = [
  { fy: "2026-27", quarter: 1, nqasIaScore: 80.1, kayakalpIaScore: 80.2, updatedAt: 1 },
  { fy: "2026-27", quarter: 2, nqasIaScore: 83.8, kayakalpIaScore: 83.9, updatedAt: 2 },
];

function input(over: Partial<ProfileSheetInput> = {}): ProfileSheetInput {
  return {
    facility,
    cycles: [{ cycle: { cycleNumber: 1, cycleType: "Initial" }, sa, nqas }],
    funds,
    nocs,
    buildings,
    iaQuarters,
    today: TODAY,
    fireNocAlertLeadDays: 90,
    ...over,
  };
}

/** The list row the backend would return for the same records. */
function listRow(): MasterRow {
  return {
    facility: facility as unknown as MasterRow["facility"],
    cycleNumber: 1,
    cycleType: "Initial",
    iaq: {
      pair: { previous: { fy: "2026-27", q: 1 }, current: { fy: "2026-27", q: 2 } },
      rows: [
        { fy: "2026-27", quarter: 1, nqasIaScore: 80.1, kayakalpIaScore: 80.2 },
        { fy: "2026-27", quarter: 2, nqasIaScore: 83.8, kayakalpIaScore: 83.9 },
      ],
    },
    sa: sa as unknown as MasterRow["sa"],
    // ops.listFacilityRowsFast renames the NQAS doc fields (manualRecertStatus →
    // recertStatus); the adapter does the same, so the fixtures must too.
    nqas: {
      ...nqas,
      recertStatus: nqas.manualRecertStatus,
    } as unknown as MasterRow["nqas"],
    fund: {
      amountSanctioned: 100000,
      amountReleased: 40000,
      amountUtilized: 0,
      financialYear: "2026-27",
      status: "Pending",
      procLink: "https://nqas.example.gov.in/proc/Athanavur-2026-27.pdf",
    } as unknown as MasterRow["fund"],
    noc: {
      nocAvailable: "Yes",
      status: "Valid",
      issuedDate: "2024-01-10",
      expiryDate: "2029-01-09",
      nocAttachmentName: "Fire-NOC-Athanavur.pdf",
    },
    building: { buildingType: "Main block", buildingStatus: "Good" },
  };
}

describe("profile → sheet row", () => {
  it("prints the same sheet the Master List would for Athanavur", () => {
    const fromProfile = buildSheetModel(
      masterRowFromProfile(input()),
      { dataAsOf: Date.UTC(2026, 9, 21, 3, 0) },
    );
    const fromList = buildSheetModel(listRow(), { dataAsOf: Date.UTC(2026, 9, 21, 3, 0) });

    // Every data-driven section matches: facts, both pages, documents, checks.
    expect(fromProfile.facts).toEqual(fromList.facts);
    expect(fromProfile.page1Left).toEqual(fromList.page1Left);
    expect(fromProfile.page1Right).toEqual(fromList.page1Right);
    expect(fromProfile.page2Left).toEqual(fromList.page2Left);
    expect(fromProfile.page2Right).toEqual(fromList.page2Right);
    expect(fromProfile.documents).toEqual(fromList.documents);
    expect(fromProfile.checks).toEqual(fromList.checks);
  });

  it("reads the quarterly IA store — 80.1/83.8 and 80.2/83.9, never the legacy blanks", () => {
    const model = buildSheetModel(masterRowFromProfile(input()));
    // Part 3 — the card's own four-quarter table and chart read `iaChart`; the
    // separate Q1/Q2 mini table is gone.
    const ia = model.page1Right.find((c) => c.id === "ia");
    expect(ia).toBeTruthy();
    expect(ia?.rows).toEqual([]);
    const points = model.iaChart.points.map((p) => [p.shortLabel, p.nqas, p.kayakalp]);
    expect(points).toEqual([
      ["Q3 25-26", null, null],
      ["Q4 25-26", null, null],
      ["Q1 26-27", 80.1, 80.2],
      ["Q2 26-27", 83.8, 83.9],
    ]);
    expect(model.iaChart.change).toEqual({ nqas: 3.7, kayakalp: 3.7 });
    // No Eco-Friendly row survives anywhere.
    expect(JSON.stringify(model)).not.toContain("Eco-Friendly");
  });

  it("keeps the documents status conflict visible instead of hiding it", () => {
    const model = buildSheetModel(masterRowFromProfile(input()));
    expect(model.checks).toContain(
      "Documents Status (Report) is blank while a portal status exists",
    );
    expect(model.checks).toContain(
      "Certified, but the documents status still says results are awaited",
    );
  });

  it("picks the current cycle and the newest fund / NOC record", () => {
    const row = masterRowFromProfile(
      input({
        cycles: [
          { cycle: { cycleNumber: 1, cycleType: "Initial", superseded: true }, sa: null, nqas: null },
          { cycle: { cycleNumber: 2, cycleType: "Recertification" }, sa: {}, nqas: { validityDate: "2032-10-12" } },
        ],
        facility: { ...facility, currentCycleNumber: 2 },
      }),
    );
    expect(row.cycleNumber).toBe(2);
    expect(row.cycleType).toBe("Recertification");
    expect(row.fund?.financialYear).toBe("2026-27");
    expect(row.noc?.expiryDate).toBe("2029-01-09");
  });

  it("leaves blanks blank (never 0, never a guessed value)", () => {
    const row = masterRowFromProfile(
      input({ funds: [], nocs: [], buildings: [], iaQuarters: [] }),
    );
    expect(row.fund).toBeNull();
    expect(row.noc).toBeNull();
    expect(row.building).toBeNull();
    expect(row.iaq).toBeUndefined();
  });
});
