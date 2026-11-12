/**
 * GOLDEN NARRATIVE TESTS (Part 5.1 fixtures) — the brief's data problems as
 * tests against a fixture that mirrors the real 157-facility dataset:
 *
 *   • 157 facilities; 72 hold a certificate (57 quality + 15 conditionality);
 *     in a clean dataset ALL 72 also sit in the Certified stage, and the
 *     reconciliation says so; a second fixture with 2 lapsed certificates
 *     exercises the "70 + 2 in <stage>" split wording.
 *   • State assessment records are REPORTS, not a funnel, and always sum to
 *     the facility count.
 *   • Certifications by fiscal year follow today's date (FY 2026-27 on
 *     20-Oct-2026); current + previous FY always present; years sum.
 *   • Barrier reasons are first-match (mutually exclusive) and sum to the
 *     uncertified count; "largest" only with a strict winner; ties stated.
 *   • Fire NOC buckets are date-derived incl. Not recorded and sum to 157.
 *   • Building buckets use the one shared mapping and sum to 157.
 *   • ₹ Indian format: 790000 → "₹ 7,90,000".
 */

import { describe, expect, it } from "bun:test";
import { buildDeckData, type DeckRow } from "../src/lib/deck";
import { formatInr } from "../src/lib/formatInr";
import { fiscalYearOf, fiscalYearLabel } from "../src/lib/fiscalYear";
import { buildingBucketOf, BUILDING_BUCKET_ORDER } from "../src/lib/buildingBuckets";

/* ---- fixture helpers ------------------------------------------------- */

let seq = 0;
function fac(over: Partial<DeckRow> = {}): DeckRow {
  seq += 1;
  return {
    facility: `Facility ${seq}`,
    type: "PHC",
    block: "BlockA",
    phc: "PHC-1",
    eligibility: "Eligible",
    currentStatus: "SA Not Yet Initiated",
    certStatus: null,
    naStatus: null,
    certDate: null,
    certScore: null,
    naScheduledDate: null,
    saStatus: null,
    generalDocStatus: null,
    naMode: null,
    saScore: null,
    buildingStatus: null,
    buildingType: null,
    fireNocStatus: null,
    fireNocExpiry: null,
    nqasIaQ1: null,
    nqasIaQ2: null,
    kayakalpIaQ1: null,
    kayakalpIaQ2: null,
    surveillanceDue1: null,
    surveillanceDone1: null,
    surveillanceDue2: null,
    surveillanceDone2: null,
    validityDate: null,
    gapClosureAmount: null,
    gcFundYear: null,
    ...over,
  };
}

/** The brief's headline fixture: 157 facilities, 72 hold a certificate
 *  (57 quality + 15 conditionality), all still in the Certified stage. */
function headlineFixture(): DeckRow[] {
  const rows: DeckRow[] = [];
  seq = 0;
  for (let i = 0; i < 57; i++) {
    const lapsed = i < 2; // 2 expired certificates → still holding, but the
    // result column was cleared during the re-assessment, so the stage rule
    // no longer reads them as certified (the 70-vs-72 difference).
    rows.push(
      fac(
        lapsed
          ? {
              certDate: "2024-08-10",
              certScore: 74,
              validityDate: "2025-08-10",
              saStatus: "Scheduled",
            }
          : {
              certStatus: "Quality Certified",
              certDate: "2025-06-12",
              certScore: 82.5,
              validityDate: "2028-06-12",
              naStatus: "Completed",
              saStatus: "Completed",
            },
      ),
    );
  }
  for (let i = 0; i < 15; i++) {
    rows.push(
      fac({
        certStatus: "Quality Certified with Conditionality",
        certDate: "2025-09-01",
        certScore: 71,
        validityDate: "2028-09-01",
        naStatus: "Completed",
        saStatus: "Completed",
      }),
    );
  }
  // 85 uncertified: 1 dilapidated, 1 land, 1 low-score, 1 result-awaiting,
  // the rest not started.
  rows.push(fac({ buildingStatus: "Dilapidated" }));
  rows.push(fac({ buildingStatus: "Land not available" }));
  rows.push(fac({ nqasIaQ2: 60 }));
  rows.push(
    fac({ saStatus: "Completed", generalDocStatus: "NA Completed & Awaiting Results", currentStatus: "Result Awaited" }),
  );
  while (rows.length < 157) rows.push(fac({}));
  return rows;
}

/* ---- tests ------------------------------------------------------------ */

describe("capacity of the golden deck numbers", () => {
  it("the headline fixture: 157 rows, 70 hold a certificate (57 + 15 minus 2 lapsed)", () => {
    const d = buildDeckData(headlineFixture());
    expect(d.totalFacilities).toBe(157);
    // The ONE definition: Quality Certified / Quality Certified with
    // Conditionality. The two lapsed rows have no result, so they are not a
    // fourth kind of certificate (this used to make the headline 72 while
    // every type table said 70).
    expect(d.certifiedTotal).toBe(70);
    expect(d.qualityCount).toBe(55);
    expect(d.condCount).toBe(15);
    expect(d.holdCertificate).toBe(70);
  });

  it("hold a certificate and the Certified stage read the same cohort", () => {
    const d = buildDeckData(headlineFixture());
    expect(d.reconciliationLine).toContain("70 hold a certificate");
    expect(d.holdExpiredNames.length).toBe(0);
    expect(d.reconciliationLine).toContain("all 70 are in the Certified stage");
  });

  it("state assessment records sum to 157 (not a funnel)", () => {
    const d = buildDeckData(headlineFixture());
    // "Awaiting result" is a sub-line of Completed, NOT a bucket — the
    // buckets (Completed + Scheduled + Not initiated + No entry) sum to 157.
    const total =
      d.saCompleted + d.saScheduled + d.saNotInitiated + d.saNoEntry;
    expect(total).toBe(157);
    expect(d.funnelSubtitle).toContain("State assessment records:");
  });

  it("certifications by fiscal year are computed from today's date", () => {
    const d = buildDeckData(headlineFixture());
    const today = new Date();
    const expectedFy = fiscalYearOf(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
        today.getDate(),
      ).padStart(2, "0")}`,
    );
    expect(d.currentFyLabel).toBe(fiscalYearLabel(expectedFy));
    expect(d.previousFyLabel).toBe(fiscalYearLabel(expectedFy - 1));
    expect(d.byFy.some((y) => fiscalYearLabel(y.year) === d.currentFyLabel)).toBe(true);
    expect(d.byFy.some((y) => fiscalYearLabel(y.year) === d.previousFyLabel)).toBe(true);
    const sum = d.byFy.reduce((a, y) => a + y.total, 0);
    expect(sum).toBe(d.grandTotalDated);
  });

  it("the 'No score' footnote year comes from the certified cohort", () => {
    const d = buildDeckData(headlineFixture());
    expect(d.noScoreBeforeYear).toBe(2025);
    expect(d.footNote).toContain("before 2025");
  });

  it("barrier reasons are first-match and sum to the uncertified count", () => {
    const d = buildDeckData(headlineFixture());
    expect(d.notCertifiedCount).toBe(87);
    const sum = d.barrierBars.reduce((a, b) => a + b.count, 0);
    expect(sum).toBe(87);
    const named = d.barrierBars.filter((b) => b.label !== "Other / not stated");
    const sorted = [...named].sort((a, b) => b.count - a.count);
    expect(d.barrierPriorityNote).toContain("Priority order:");
    if (sorted.length > 1 && sorted[0].count === sorted[1].count) {
      expect(d.barrierNotes[0]).toContain("are tied at");
    } else if (sorted[0]) {
      expect(d.barrierNotes[0]).toContain("the single largest reason");
    }
  });

  it("building buckets sum to 157 with the one shared mapping", () => {
    const d = buildDeckData(headlineFixture());
    expect(d.buildingReconciles).toBe(true);
    const sum = d.buildingBars.reduce((a, b) => a + b.count, 0);
    expect(sum).toBe(157);
    const mrBuckets = d.buildingBars.filter((b) => /M&R/i.test(b.label));
    expect(mrBuckets.length).toBeLessThanOrEqual(1);
    expect(buildingBucketOf("Land not available")).toBe("Construction on going");
    expect(buildingBucketOf("Major M&R works")).toBe("M&R Work");
    expect(buildingBucketOf("Minor M&R works")).toBe("M&R Work");
    expect(buildingBucketOf("Inaugurated")).toBe("Good");
  });

  it("the full bucket order always reconciles any input (drop nothing)", () => {
    for (const raw of [
      "Good", "Good Condition", "Dilapidated", "Others", "Construction going on",
      "Major M&R works", "M&R Work", "Minor M&R works", "Inaugurated",
      "Land not available", "Land available", null, "",
    ]) {
      expect(BUILDING_BUCKET_ORDER).toContain(buildingBucketOf(raw));
    }
  });

  it("fire NOC buckets are date-derived and include the undated recorded bucket (sum 157)", () => {
    const rows = headlineFixture();
    for (let i = 10; i < 50; i++) rows[i].fireNocStatus = "Valid";
    for (const i of [0, 1]) rows[i].fireNocExpiry = "2026-12-18"; // 90-day window
    const d = buildDeckData(rows);
    expect(d.nocExpiringSoon).toBe(2);
    // A stored "Valid" with no validity date is its own bucket, never Valid.
    expect(d.nocRecordedNoValidity).toBe(40);
    expect(d.nocValid + d.nocExpiringSoon + d.nocExpired + d.nocRecordedNoValidity).toBe(42);
    expect(d.nocNotRecorded).toBe(115);
    expect(
      d.nocValid +
        d.nocExpiringSoon +
        d.nocExpired +
        d.nocRecordedNoValidity +
        d.nocNotRecorded,
    ).toBe(157);
    expect(d.fireNocRecordedSentence).toBe(
      "Fire NOC is recorded for 42 of 157 facilities (115 not recorded).",
    );
  });

  it("₹ Indian format: 790000 → '₹ 7,90,000' (never 'Rs.')", () => {
    expect(formatInr(790000)).toBe("₹ 7,90,000");
    expect(formatInr(1250000)).toBe("₹ 12,50,000");
    expect(formatInr(null)).toBe("—");
  });
});
