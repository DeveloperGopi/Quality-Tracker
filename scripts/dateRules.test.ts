/**
 * DATE RULES — one table, date-only comparison, no false errors.
 *
 * The bug this pins (Facility Quick View, screenshot 2): "NQAS Assessment
 * Start date" 24-Sep-2026 and "NQAS Assessment End date" 25-Sep-2026 showed
 * "End date must be on or after the scheduled start." The rule compared the
 * STATE ASSESSMENT end (`saEnd`) with the NQAS SCHEDULED start (`naScheduled`)
 * and reported it on the NQAS end (`naEnd`) — three different assessments in
 * one condition, and an actual-vs-scheduled comparison on top.
 *
 * The contract now: scheduled pairs with scheduled, actual with actual, both
 * dates must exist, comparison is on DATE-ONLY values (never display text,
 * never a Date object that can shift by a timezone), the same day is valid,
 * actual vs scheduled is at most a soft warning, and a saved conflict is never
 * a blocking error on open.
 *
 * Run: bun test ./scripts/dateRules.test.ts
 */
import { describe, test, expect } from "bun:test";

import {
  DATE_RANGE_RULES,
  dateOnly,
  dateRangeProblem,
  dateRangeViolations,
  dmy,
  validateNqasDraft,
  validateSaDraft,
} from "../src/lib/facilityProfileRules";
import { attentionFor, validateQuickView } from "../src/lib/facilityQuickView";
import type { MasterRow } from "../src/lib/masterColumns";

const TODAY = "2026-10-21";

/** The Quick View's draft map, trimmed to the date fields under test. */
function draft(over: Record<string, string> = {}) {
  return {
    certStatus: "",
    certDate: "",
    certScore: "",
    naScheduled: "",
    naEnd: "",
    saStart: "",
    saEnd: "",
    nocCertified: "",
    nocValidity: "",
    surv1: "",
    surv2: "",
    nocAvailable: "Yes",
    ...over,
  };
}

function makeRow(sa: Record<string, string> | null = null): MasterRow {
  return {
    facility: {
      _id: "f1",
      name: "PHC Alangayam",
      block: "Alangayam",
      phc: "PHC Alangayam",
      facilityType: "PHC",
      ninNumber: "4527324786",
      eligibility: "Eligible",
      currentStatus: "SA Completed",
      statusOverride: null,
      remarks: "",
      updatedAt: null,
      nqasIaQ1: null,
      nqasIaQ2: null,
      kayakalpIaQ1: null,
      kayakalpIaQ2: null,
    },
    cycleNumber: 1,
    cycleType: null,
    sa: sa as never,
    nqas: null,
    fund: null,
    noc: null,
    building: null,
    ia: null,
    resultDocumentId: null,
    resultDocumentName: null,
  } as unknown as MasterRow;
}

const blocking = (issues: { field: string; severity: string }[], field?: string) =>
  issues.filter((i) => i.severity === "blocking" && (!field || i.field === field));

/* ------------------------------------------------------------------ */
/* The value layer                                                     */
/* ------------------------------------------------------------------ */

describe("dateOnly — the one date parser", () => {
  test("ISO dates, ISO datetimes and the display form all canonicalise", () => {
    expect(dateOnly("2026-09-24")).toBe("2026-09-24");
    expect(dateOnly("2026-09-24T00:00:00.000Z")).toBe("2026-09-24");
    expect(dateOnly("2026-09-24T00:30:00+05:30")).toBe("2026-09-24");
    expect(dateOnly("24-Sep-2026")).toBe("2026-09-24");
    expect(dateOnly("24/09/2026")).toBe("2026-09-24");
    expect(dateOnly(" 2026-10-01 ")).toBe("2026-10-01");
  });

  test("a blank is never a date; junk and impossible days are rejected", () => {
    expect(dateOnly("")).toBeNull();
    expect(dateOnly("   ")).toBeNull();
    expect(dateOnly(null)).toBeNull();
    expect(dateOnly(undefined)).toBeNull();
    expect(dateOnly("not a date")).toBeNull();
    expect(dateOnly("2026-02-30")).toBeNull();
  });

  test("IST midnight (00:30 +05:30) does not shift a day", () => {
    // The classic bug: new Date("2026-09-24T00:30:00+05:30").toISOString()
    // is 2026-09-23T19:00Z — the previous day. dateOnly keeps 24-Sep.
    const ist = "2026-09-24T00:30:00+05:30";
    expect(dateOnly(ist)).toBe("2026-09-24");
    // Same-day start/end at 00:30 IST is valid.
    expect(dateRangeProblem(ist, "2026-09-24T23:45:00+05:30")).toBeNull();
  });

  test("month names that sort wrongly as text still compare correctly", () => {
    // "25-Sep" > "01-Oct" as TEXT; as dates 01-Oct is later.
    expect("25-Sep-2026" > "01-Oct-2026").toBe(true);
    expect(dateRangeProblem("25-Sep-2026", "01-Oct-2026")).toBeNull();
    expect(dateRangeProblem("2026-09-25", "2026-10-01")).toBeNull();
    // …and the reversed pair is caught.
    expect(dateRangeProblem("01-Oct-2026", "25-Sep-2026")).toMatchObject({
      start: "2026-10-01",
      end: "2026-09-25",
    });
  });
});

/* ------------------------------------------------------------------ */
/* The rule table                                                      */
/* ------------------------------------------------------------------ */

describe("DATE_RANGE_RULES — scheduled with scheduled, actual with actual", () => {
  test("every blocking rule compares two fields of the same kind", () => {
    for (const rule of DATE_RANGE_RULES) {
      if (rule.severity !== "blocking") continue;
      const samePrefix = rule.start.split(".")[0] === rule.end.split(".")[0];
      expect(samePrefix).toBe(true);
      expect(rule.start).not.toBe(rule.end);
    }
    const scheduled = DATE_RANGE_RULES.find((r) => r.id === "nqas-scheduled");
    expect(scheduled).toMatchObject({
      kind: "scheduled",
      start: "nqas.scheduledStartDate",
      end: "nqas.scheduledEndDate",
    });
    const actual = DATE_RANGE_RULES.find((r) => r.id === "nqas-actual");
    expect(actual).toMatchObject({
      kind: "actual",
      start: "nqas.actualStartDate",
      end: "nqas.actualEndDate",
    });
  });

  test("actual vs scheduled is never compared as an error", () => {
    // No rule may pair a scheduled field with an actual one.
    for (const rule of DATE_RANGE_RULES) {
      expect(/scheduled/i.test(rule.start)).toBe(/scheduled/i.test(rule.end));
      expect(/actual/i.test(rule.start)).toBe(/actual/i.test(rule.end));
    }
    // An actual start later than the scheduled start is a fact, not a conflict.
    const get = (f: string) =>
      ({
        "nqas.scheduledStartDate": "2026-09-24",
        "nqas.actualStartDate": "2026-09-30",
        "nqas.actualEndDate": "2026-09-25",
        "nqas.scheduledEndDate": "2026-09-26",
      })[f] ?? null;
    const violations = dateRangeViolations(get);
    expect(violations.every((v) => v.rule.kind === "actual")).toBe(true);
  });

  test("only when BOTH values exist, and the same day is valid", () => {
    const get = (f: string) =>
      ({
        "sa.actualStartDate": "2026-09-24",
        "sa.actualEndDate": "2026-09-24",
      })[f] ?? null;
    expect(dateRangeViolations(get).filter((v) => v.rule.id === "sa-actual")).toHaveLength(0);
    expect(
      dateRangeViolations((f) => (f === "sa.actualStartDate" ? "2026-09-24" : null)).filter(
        (v) => v.rule.id === "sa-actual",
      ),
    ).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* The Quick View — the screen from the screenshot                     */
/* ------------------------------------------------------------------ */

describe("Quick View: the false 'end before scheduled start' is gone", () => {
  test("24-Sep-2026 → 25-Sep-2026 shows NO error", () => {
    const initial = draft();
    const next = draft({ naScheduled: "2026-09-24", naEnd: "2026-09-25" });
    const issues = validateQuickView(next, TODAY, initial);
    expect(issues.filter((i) => i.field === "naEnd")).toHaveLength(0);
    // Nothing anywhere mentions the old wording.
    expect(issues.some((i) => /scheduled start/i.test(i.message))).toBe(false);
  });

  test("the same day is valid", () => {
    const initial = draft();
    const next = draft({ naScheduled: "2026-09-24", naEnd: "2026-09-24" });
    expect(validateQuickView(next, TODAY, initial)).toHaveLength(0);
  });

  test("a REAL reversal names both fields and values", () => {
    const initial = draft({ saStart: "2026-09-24", saEnd: "2026-09-25" });
    const next = draft({ saStart: "2026-09-24", saEnd: "2026-09-20" });
    const issue = blocking(validateQuickView(next, TODAY, initial), "saEnd")[0];
    expect(issue).toBeDefined();
    expect(issue.message).toContain(dmy("2026-09-20"));
    expect(issue.message).toContain(dmy("2026-09-24"));
    expect(issue.message).toContain("State Assessment actual end");
    expect(issue.message).toContain("State Assessment actual start");
    expect(issue.message).toContain("Fix start date.");
  });

  test("a missing scheduled start never produces an error", () => {
    const initial = draft();
    const next = draft({ naScheduled: "", naEnd: "2026-09-25" });
    expect(validateQuickView(next, TODAY, initial).filter((i) => i.field === "naEnd")).toHaveLength(0);
  });

  test("opening a saved record (lean row, nothing edited) never blocks", () => {
    // Stored conflict: SA end before SA start. Opening the dialog must not
    // show a blocking red error — it belongs in Needs attention as a warning.
    const lean = draft({ saStart: "2026-09-25", saEnd: "2026-09-20" });
    // No inline red error at all — nothing was edited.
    expect(validateQuickView(lean, TODAY, lean)).toHaveLength(0);
    expect(blocking(validateQuickView(lean, TODAY, lean))).toHaveLength(0);

    const items = attentionFor(
      makeRow({ actualStartDate: "2026-09-25", actualEndDate: "2026-09-20" }),
      TODAY,
    );
    const stored = items.find((i) => i.id === "date-sa-actual");
    expect(stored).toBeDefined();
    expect(stored?.severity).toBe("warning");
    expect(stored?.text).toContain(dmy("2026-09-20"));
  });

  test("actual vs scheduled is never a blocking error in the dialog", () => {
    const initial = draft();
    const next = draft({ naScheduled: "2026-09-24", naEnd: "2026-09-02" });
    const issues = validateQuickView(next, TODAY, initial);
    expect(blocking(issues)).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* The same rule, every surface                                        */
/* ------------------------------------------------------------------ */

describe("one rule, every surface", () => {
  const saDraft = (start: string, end: string) => ({
    scheduledDate: "",
    actualStartDate: start,
    actualEndDate: end,
    scorePercent: "80",
    generalDocStatus: "Received",
    assessor1Name: "",
    assessor1Hud: "",
    assessor2Name: "",
    assessor2Hud: "",
  });

  const nqasDraft = (scheduledStart: string, scheduledEnd: string) => ({
    scheduledStartDate: scheduledStart,
    scheduledEndDate: scheduledEnd,
    actualStartDate: "",
    actualEndDate: "",
    mode: "",
    scorePercent: "",
    certificationStatus: "Not applicable",
    certificationDate: "",
    validityDate: "",
    surveillanceDone1: "",
    surveillanceDone2: "",
    manualScore: "",
    departments: "",
    resultDocumentId: "",
  });

  test("an end BEFORE its start is caught identically everywhere", () => {
    // Central helper (the one implementation)
    expect(dateRangeProblem("2026-09-25", "2026-09-20")).not.toBeNull();
    // Facility Profile — State Assessment
    expect(
      validateSaDraft(saDraft("2026-09-25", "2026-09-20") as never, TODAY).some(
        (i) => i.field === "sa.actualEndDate",
      ),
    ).toBe(true);
    // Facility Profile — NQAS scheduled pair
    expect(
      validateNqasDraft(nqasDraft("2026-09-25", "2026-09-20") as never, {
        today: TODAY,
        saCompleted: true,
      }).some((i) => i.field === "nqas.scheduledEndDate"),
    ).toBe(true);
    // Quick View — same verdict for the same input
    expect(
      blocking(
        validateQuickView(
          draft({ saStart: "2026-09-25", saEnd: "2026-09-20" }),
          TODAY,
          draft(),
        ),
        "saEnd",
      ),
    ).toHaveLength(1);
  });

  test("a CORRECT pair is clean in every surface (no surface invents an error)", () => {
    expect(dateRangeProblem("2026-09-24", "2026-09-25")).toBeNull();
    expect(
      validateSaDraft(saDraft("2026-09-24", "2026-09-25") as never, TODAY).some(
        (i) => i.field === "sa.actualEndDate",
      ),
    ).toBe(false);
    expect(
      validateNqasDraft(nqasDraft("2026-09-24", "2026-09-25") as never, {
        today: TODAY,
        saCompleted: true,
      }).some((i) => i.field === "nqas.scheduledEndDate"),
    ).toBe(false);
    expect(
      blocking(
        validateQuickView(
          draft({ saStart: "2026-09-24", saEnd: "2026-09-25" }),
          TODAY,
          draft(),
        ),
      ),
    ).toHaveLength(0);
  });
});
