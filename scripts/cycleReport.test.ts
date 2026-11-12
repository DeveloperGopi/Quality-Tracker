/**
 * CERTIFICATION CYCLES — golden tests for the rebuilt builder.
 *
 * Fixtures (today = 24-Oct-2026):
 *   f1 Alangayam   Cycle #1 Quality 89 → Cycle #2 Deferred, NO score
 *                  (the Kurumbakeri case: blank is never 0 / never a decline)
 *   f2 Kaspa       Cycle #1 Conditional 90 → Cycle #2 Quality 92.5, on time
 *   f3 Athanavur   Cycle #1 Quality 85, expired 01-Jan-2026, no re-application
 *   f4 Nilavoor    Cycle #1 not certified, State Assessment scheduled
 *   f5 Kudiyanakuppam  Cycle #1 Quality with a stored 0 score and no validity
 *   f6 Vaniyambadi Cycle #1 Quality (superseded, expiry 01-Jun-2026) →
 *                  Cycle #2 in progress (NQAS completed, no result yet)
 */
import { describe, expect, test } from "bun:test";
import {
  buildCycleReport,
  bucketOfDays,
  coolingEndIso,
  cycleStartIso,
  effectiveScore,
  fyQuarterOf,
  holdsCertificate,
  medianDaysText,
  ratioLabel,
  resultLabel,
  type CycleReportRow,
} from "../src/lib/cycleReport";

const TODAY = "2026-10-24";

function cycleRow(over: Partial<CycleReportRow>): CycleReportRow {
  return {
    facilityId: "f1",
    facility: "Alangayam (CHC)",
    block: "Alangayam",
    phc: "Alangayam",
    type: "CHC",
    nin: null,
    eligibility: "Eligible",
    currentStatus: "Certified — On track",
    currentCycleNumber: 1,
    documentsStatusReport: null,
    cycleId: "c1",
    cycleNumber: 1,
    cycleType: "Initial",
    superseded: false,
    recertStage: null,
    cycleCreatedAt: 1_700_000_000_000,
    saStatus: "Completed",
    saScheduledDate: null,
    saStartDate: "2025-06-25",
    saEndDate: "2025-07-01",
    saScore: 80,
    generalDocStatus: "Docx forwarded to NHSRC",
    naStatus: "Completed",
    naScheduledDate: null,
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
    ...over,
  };
}

const rows: CycleReportRow[] = [
  /* f1 — Deferred in Cycle #2 with no score. */
  cycleRow({}),
  cycleRow({
    facilityId: "f1",
    cycleId: "c1b",
    cycleNumber: 2,
    cycleType: "Recertification",
    superseded: false,
    saStartDate: "2026-05-10",
    saEndDate: "2026-05-20",
    naEndDate: "2026-07-20",
    certStatus: "Deferred",
    certDate: null,
    goiLetterDate: "2026-07-29",
    certScore: null,
    validityDate: null,
    surveillanceDue1: null,
    surveillanceDone1: null,
    surveillanceDue2: null,
    generalDocStatus: "Result Declared",
  }),
  /* f2 — conditionality resolved, recertified on time. */
  cycleRow({
    facilityId: "f2",
    facility: "Kaspa (UHWC)",
    block: "Jolarpet",
    phc: "Kaspa",
    type: "HWC HSC",
    cycleId: "c2",
    superseded: true,
    certStatus: "Quality Certified with Conditionality",
    certScore: 90,
    certDate: "2025-09-01",
    validityDate: "2026-11-01",
    saStartDate: "2025-07-01",
    saEndDate: "2025-07-15",
  }),
  cycleRow({
    facilityId: "f2",
    facility: "Kaspa (UHWC)",
    block: "Jolarpet",
    phc: "Kaspa",
    type: "HWC HSC",
    cycleId: "c2b",
    cycleNumber: 2,
    cycleType: "Recertification",
    certStatus: "Quality Certified",
    certScore: 92.5,
    certDate: "2026-10-01",
    validityDate: "2029-10-01",
    saStartDate: "2026-08-01",
    saEndDate: "2026-08-10",
    surveillanceDue1: "2027-10-01",
    surveillanceDone1: null,
  }),
  /* f3 — expired, never re-applied. */
  cycleRow({
    facilityId: "f3",
    facility: "Athanavur (HSC)",
    block: "Alangayam",
    phc: "Athanavur",
    type: "HWC HSC",
    cycleId: "c3",
    certScore: 85,
    certDate: "2025-08-01",
    validityDate: "2026-01-01",
    saStartDate: "2025-06-01",
    saEndDate: "2025-06-05",
  }),
  /* f4 — not certified. */
  cycleRow({
    facilityId: "f4",
    facility: "Nilavoor (HWC)",
    block: "Alangayam",
    phc: "Nilavoor",
    type: "HWC HSC",
    cycleId: "c4",
    certStatus: null,
    certScore: null,
    certDate: null,
    validityDate: null,
    saStatus: "Scheduled",
    saScheduledDate: "2026-11-05",
    saStartDate: null,
    saEndDate: null,
    naStatus: null,
    naEndDate: null,
    surveillanceDue1: null,
    surveillanceDone1: null,
    surveillanceDue2: null,
    generalDocStatus: null,
  }),
  /* f5 — certified, stored score 0 (a blank), no validity date. */
  cycleRow({
    facilityId: "f5",
    facility: "Kudiyanakuppam (HSC)",
    block: "Tirupathur",
    phc: "Kudiyanakuppam",
    type: "HWC HSC",
    cycleId: "c5",
    certStatus: "Quality Certified",
    certScore: 0,
    certDate: "2025-09-10",
    validityDate: null,
    saStartDate: "2025-06-10",
    saEndDate: "2025-06-15",
  }),
  /* f6 — replaced Cycle #1 certificate, Cycle #2 still in progress. */
  cycleRow({
    facilityId: "f6",
    facility: "Vaniyambadi (PHC)",
    block: "Vaniyambadi",
    phc: "Vaniyambadi",
    type: "PHC",
    cycleId: "c6",
    superseded: true,
    certScore: 88,
    certDate: "2025-05-20",
    validityDate: "2026-06-01",
    saStartDate: "2025-04-01",
    saEndDate: "2025-04-05",
  }),
  cycleRow({
    facilityId: "f6",
    facility: "Vaniyambadi (PHC)",
    block: "Vaniyambadi",
    phc: "Vaniyambadi",
    type: "PHC",
    cycleId: "c6b",
    cycleNumber: 2,
    cycleType: "Recertification",
    certStatus: null,
    certScore: null,
    certDate: null,
    validityDate: null,
    naStatus: "Completed",
    naEndDate: "2026-09-20",
    saStartDate: "2026-07-01",
    saEndDate: "2026-07-02",
    surveillanceDue1: null,
    surveillanceDone1: null,
    generalDocStatus: "Result Declared",
  }),
];

const report = buildCycleReport(rows, {
  today: TODAY,
  knownCycles: [
    { cycleNumber: 1, cycleType: "Initial" },
    { cycleNumber: 2, cycleType: "Recertification" },
    { cycleNumber: 3, cycleType: "Recertification" },
  ],
});

describe("Part 0.1 — a blank score is never 0", () => {
  test("effectiveScore treats null and a stored 0 as blank", () => {
    expect(effectiveScore(null)).toBeNull();
    expect(effectiveScore(0)).toBeNull();
    expect(effectiveScore(89)).toBe(89);
  });

  test("a Deferred Cycle #2 with no score has no change and is never a decline", () => {
    const f1 = report.comparison.rows.find((r) => r.facilityId === "f1")!;
    expect(f1.toScore).toBeNull();
    expect(f1.delta).toBeNull();
    expect(report.comparison.declined).toBe(0);
    const f5 = report.list.find((e) => e.row.facilityId === "f5")!;
    expect(f5.score).toBeNull();
  });

  test("only rows with BOTH scores count as improved / same / declined", () => {
    expect(report.comparison.improved).toBe(1); // f2: 90 → 92.5
    expect(report.comparison.unchanged).toBe(0);
    expect(report.comparison.declined).toBe(0);
    expect(report.comparison.twoCycleFacilities).toBe(3); // f1, f2, f6
  });
});

describe("Part 0.2 — recertification timing", () => {
  test("a deferred cycle reads “Not recertified yet” with the cooling end", () => {
    const f1 = report.comparison.rows.find((r) => r.facilityId === "f1")!;
    expect(f1.timing.kind).toBe("notRecertified");
    expect(f1.timing.text).toBe("Not recertified yet · cooling period ends 29-Oct-2026");
    expect(f1.timing.text).not.toContain("On time");
  });

  test("a cycle with no result yet reads “In progress”", () => {
    const f6 = report.comparison.rows.find((r) => r.facilityId === "f6")!;
    expect(f6.timing.kind).toBe("inProgress");
    expect(f6.timing.text).toBe("In progress");
  });

  test("certifying on or before the previous validity end is on time", () => {
    const f2 = report.comparison.rows.find((r) => r.facilityId === "f2")!;
    expect(f2.timing.kind).toBe("onTime");
    expect(f2.timing.text).toBe("On time");
    expect(f2.conditionalityResolved).toBe(true);
    expect(report.comparison.recertifiedOnTime).toBe(1);
    expect(report.comparison.recertifiedLate).toBe(0);
  });

  test("cooling end is three months after the GoI letter", () => {
    const deferred = rows.find((r) => r.cycleId === "c1b")!;
    expect(coolingEndIso(deferred, {})).toBe("2026-10-29");
  });
});

describe("Part 0.3 — a superseded certificate is never expired", () => {
  test("one row per facility, by its latest cycle", () => {
    expect(report.renewals.scope).toHaveLength(5); // f1, f2, f3, f5, f6
    const keys = report.renewals.scope.map((e) => e.facilityId);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("f6's replaced Cycle #1 certificate does not appear as expired", () => {
    const f6 = report.renewals.scope.find((e) => e.facilityId === "f6")!;
    expect(f6.step).toBe("resultAwaited");
    expect(f6.daysLeft).toBeNull();
    expect(f6.bucket).toBeNull();
    const expired = report.renewals.buckets.find((b) => b.key === "expired")!;
    expect(expired.count).toBe(1);
    expect(expired.ids).toEqual(["f3"]);
  });

  test("the facility in progress is still in the Renewals scope", () => {
    expect(report.renewals.scope.some((e) => e.step === "resultAwaited")).toBe(true);
    expect(report.renewals.scope.some((e) => e.step === "deferred")).toBe(true);
  });
});

describe("Part 0.4 — hold a certificate (one rule, plus a reconciliation line)", () => {
  test("Cycle #1 counts 5 of 6; latest cycle counts 3 distinct facilities", () => {
    expect(report.reconciliation.cycleHold).toBe(5);
    expect(report.reconciliation.distinctHold).toBe(3);
    expect(report.reconciliation.overlap).toBe(1);
    expect(report.reconciliation.text).toContain("5 facility-cycles");
    expect(report.reconciliation.text).toContain("3 distinct facilities");
    expect(report.reconciliation.text).toContain("1 hold one in more than one cycle");
  });

  test("every overview segment sums to the facilities in its cycle", () => {
    for (const card of report.overview.cards) {
      const sum = card.segments.reduce((n, s) => n + s.count, 0);
      expect(sum).toBe(card.facilities);
    }
  });

  test("Cycle #2 uses the small-n form “1 of 3 hold a certificate”", () => {
    const c2 = report.overview.cards.find((c) => c.cycleNumber === 2)!;
    expect(c2.hold).toBe(1);
    expect(c2.facilities).toBe(3);
    expect(c2.holdText).toBe("1 of 3 hold a certificate");
  });

  test("the details table totals equal the cards", () => {
    for (const card of report.overview.cards) {
      const totals = report.overview.details.type.totals.cycles[card.cycleNumber];
      expect(totals.facilities).toBe(card.facilities);
      expect(totals.certified).toBe(card.hold);
    }
  });
});

describe("Part 0.5 — renewal steps and buckets", () => {
  test("step chips add up to the facilities in scope", () => {
    const sum = report.renewals.steps.reduce((n, s) => n + s.count, 0);
    expect(sum).toBe(report.renewals.scope.length);
  });

  test("bucket boundaries are the shared days windows", () => {
    expect(bucketOfDays(-1)).toBe("expired");
    expect(bucketOfDays(0)).toBe("d90");
    expect(bucketOfDays(90)).toBe("d90");
    expect(bucketOfDays(91)).toBe("d180");
    expect(bucketOfDays(180)).toBe("d180");
    expect(bucketOfDays(181)).toBe("d365");
    expect(bucketOfDays(365)).toBe("d365");
    expect(bucketOfDays(366)).toBe("later");
  });

  test("the chart starts with Already expired, then eight quarters", () => {
    expect(report.renewals.chart).toHaveLength(9);
    expect(report.renewals.chart[0].key).toBe("expired");
    expect(report.renewals.chart[0].total).toBe(1);
    expect(report.renewals.chart[0].urgency).toBe("expired");
    for (const col of report.renewals.chart.slice(1)) {
      expect(col.label).toMatch(/^[A-Z][a-z]{2}–[A-Z][a-z]{2} \d{4}$/);
      expect(col.subLabel).toMatch(/^Q[1-4] \d{2}-\d{2}$/);
    }
  });
});

describe("Part 0.6 / 0.7 — data gaps and cycle start", () => {
  test("certified without a validity date is a data gap, not a bucket", () => {
    expect(report.renewals.certifiedNoValidity.ids).toEqual(["f5"]);
    const f5 = report.renewals.scope.find((e) => e.facilityId === "f5")!;
    expect(f5.bucket).toBeNull();
    expect(f5.daysLeft).toBeNull();
  });

  test("a cycle start never comes from the migration timestamp", () => {
    const migrated = cycleRow({
      saStartDate: null,
      saScheduledDate: null,
      naScheduledDate: null,
      cycleCreatedAt: 1_760_000_000_000,
    });
    expect(cycleStartIso(migrated)).toBeNull();
    const real = rows.find((r) => r.cycleId === "c2b")!;
    expect(cycleStartIso(real)).toBe("2026-08-01");
  });
});

describe("Part 1 — headline, needs action and definitions", () => {
  test("the headline is a guarded sentence with correct singular/plural", () => {
    // f2 (recertified) and f6 (result awaited) started a Cycle #2; f5 is still
    // in Cycle #1, so it is not a received re-application.
    expect(report.headline).toBe(
      "1 certificate expires within 12 months or has already expired; 2 re-applications have been received.",
    );
  });

  test("needs action only lists non-zero cards and links to its filters", () => {
    expect(report.needsAction.map((n) => n.key)).toEqual([
      "expiredNoReapp",
      "deferredCooling",
    ]);
    expect(report.needsAction[0].count).toBe(1);
    expect(report.needsAction[0].filters).toEqual({
      buckets: ["expired"],
      step: "notStarted",
    });
    expect(report.needsAction[1].filters).toEqual({ buckets: [], step: "deferred" });
  });

  test("an empty report has no headline and no needs-action cards", () => {
    const empty = buildCycleReport([], { today: TODAY });
    expect(empty.headline).toBeNull();
    expect(empty.needsAction).toHaveLength(0);
    expect(empty.overview.cards).toHaveLength(0);
    expect(empty.comparison.available).toBe(false);
    expect(empty.renewals.scope).toHaveLength(0);
  });

  test("definitions cover the vocabulary used on screen", () => {
    const terms = report.definitions.map((d) => d.term);
    expect(terms).toContain("Hold a certificate");
    expect(terms).toContain("On time / Late");
    expect(terms).toContain("Renewal step");
  });
});

describe("Part 4 — compare", () => {
  test("the dumbbell axis is only offered at 5+ facilities with two cycles", () => {
    expect(report.comparison.twoCycleFacilities).toBeLessThan(5);
    expect(report.comparison.axis).toBeNull();
  });

  test("declined rows are only those with both scores below the band", () => {
    const withDecline = rows.map((r) =>
      r.cycleId === "c2b" ? { ...r, certScore: 80 } : r,
    );
    const declined = buildCycleReport(withDecline, { today: TODAY });
    expect(declined.comparison.declined).toBe(1);
    const row = declined.comparison.rows.find((r) => r.facilityId === "f2")!;
    expect(row.delta).toBe(-10);
  });
});

describe("Part 5 — list", () => {
  test("one row per facility-cycle, with the cycle label and next action", () => {
    expect(report.list).toHaveLength(9);
    expect(report.latest).toHaveLength(6);
    const deferred = report.list.find((e) => e.row.cycleId === "c1b")!;
    expect(deferred.cycleLabel).toBe("Cycle #2 Recertification");
    expect(deferred.resultLabel).toBe("Deferred");
    expect(deferred.nextAction).toBe("Cooling period ends 29-Oct-2026");
    expect(report.list.every((e) => e.nextAction.length > 0)).toBe(true);
  });

  test("the List never repeats “Started” from a migration timestamp", () => {
    const f4 = report.list.find((e) => e.row.facilityId === "f4")!;
    expect(f4.startedOn).toBe("2026-11-05");
  });
});

describe("small helpers", () => {
  test("only quality and conditional hold a certificate", () => {
    expect(holdsCertificate("Quality Certified")).toBe(true);
    expect(holdsCertificate("Quality Certified with Conditionality")).toBe(true);
    expect(holdsCertificate("Deferred")).toBe(false);
    expect(holdsCertificate(null)).toBe(false);
  });

  test("vocabulary: not certified, never “Not recorded”", () => {
    expect(resultLabel(null)).toBe("Not certified");
    expect(resultLabel("Deferred")).toBe("Deferred");
    expect(resultLabel("Quality Certified")).toBe("Quality");
  });

  test("fiscal quarter labels follow the Indian April→March year", () => {
    expect(fyQuarterOf("2026-04-01").label).toBe("Q1 2026-27");
    expect(fyQuarterOf("2026-10-24").label).toBe("Q3 2026-27");
    expect(fyQuarterOf("2027-02-01").label).toBe("Q4 2026-27");
  });

  test("small groups show a fraction, never a percentage", () => {
    expect(ratioLabel(1, 2)).toBe("1 of 2");
    expect(ratioLabel(0, 0)).toBe("-");
    expect(ratioLabel(3, 4)).toBe("3 of 4");
  });

  test("a median carries its unit or reads '-'", () => {
    expect(medianDaysText(174)).toBe("174 days");
    expect(medianDaysText(null)).toBe("-");
  });
});
