/**
 * PART H step 1 — surveillance done-date confirmation.
 *
 * The screen may only change what the admin confirmed, and the plan is the one
 * place that decides what "confirmed" means.
 */

import { describe, expect, test } from "bun:test";
import {
  buildSurveillancePlan,
  futureRows,
  planSummary,
  scoreWillBeCleared,
  validateDecision,
  type SurveillanceAuditRow,
} from "../src/lib/surveillanceAudit";

const TODAY = "2026-10-24";

const row = (over: Partial<SurveillanceAuditRow> = {}): SurveillanceAuditRow => ({
  facilityId: "f1",
  facilityName: "Kavalurchatram",
  block: "Alangayam",
  naId: "na1",
  field: "surveillanceDone1",
  label: "1st Surveillance Assessment Done Date",
  done: "2027-02-15",
  due: "2027-02-16",
  score: null,
  reason: "Later than today — the visit has not happened, so this is not a done date",
  kind: "future",
  ...over,
});

describe("surveillance audit — what counts as impossible", () => {
  test("future rows are the only ones the bulk action selects", () => {
    const rows = [
      row(),
      row({ naId: "na2", kind: "copied", done: "2027-02-16" }),
    ];
    expect(futureRows(rows).map((r) => r.naId)).toEqual(["na1"]);
  });

  test("a stored score is cleared only with the 2nd done date", () => {
    expect(scoreWillBeCleared(row({ field: "surveillanceDone2", score: 91 }))).toBe(true);
    expect(scoreWillBeCleared(row({ field: "surveillanceDone1", score: 91 }))).toBe(false);
    expect(scoreWillBeCleared(row({ field: "surveillanceDone2", score: null }))).toBe(false);
  });
});

describe("surveillance audit — the plan", () => {
  test("no decision means no change (nothing is cleared silently)", () => {
    const plan = buildSurveillancePlan([row()], [], TODAY);
    expect(plan.changes).toHaveLength(0);
    expect(plan.kept).toHaveLength(1);
    expect(plan.facilities).toHaveLength(0);
  });

  test("clearing a future date produces one change for its facility", () => {
    const plan = buildSurveillancePlan(
      [row()],
      [{ naId: "na1", field: "surveillanceDone1", action: "clear" }],
      TODAY,
    );
    expect(plan.changes).toHaveLength(1);
    expect(plan.changes[0].action).toBe("clear");
    expect(plan.facilities).toEqual(["f1"]);
  });

  test("setting a real past date is allowed and keeps the score", () => {
    const plan = buildSurveillancePlan(
      [row({ field: "surveillanceDone2", score: 88 })],
      [{ naId: "na1", field: "surveillanceDone2", action: "set", newDate: "2026-09-30" }],
      TODAY,
    );
    expect(plan.problems).toHaveLength(0);
    expect(plan.changes[0].newDate).toBe("2026-09-30");
    expect(plan.changes[0].clearsScore).toBe(false);
  });

  test("a future new date is rejected, never applied", () => {
    const plan = buildSurveillancePlan(
      [row()],
      [{ naId: "na1", field: "surveillanceDone1", action: "set", newDate: "2027-01-01" }],
      TODAY,
    );
    expect(plan.changes).toHaveLength(0);
    expect(plan.problems[0].message).toContain("cannot be in the future");
  });

  test("setting the date back to the due date is rejected", () => {
    const problem = validateDecision(
      row({ kind: "copied", done: "2026-09-30", due: "2026-09-30" }),
      { naId: "na1", field: "surveillanceDone1", action: "set", newDate: "2026-09-30" },
      TODAY,
    );
    expect(problem).toContain("due date");
  });

  test("clearing the 2nd done date with a score counts the score clear", () => {
    const plan = buildSurveillancePlan(
      [row({ field: "surveillanceDone2", score: 92.9 })],
      [{ naId: "na1", field: "surveillanceDone2", action: "clear" }],
      TODAY,
    );
    expect(plan.clearsScores).toBe(1);
    expect(plan.changes[0].clearsScore).toBe(true);
  });

  test("two rows of the same facility recompute it once", () => {
    const plan = buildSurveillancePlan(
      [row(), row({ field: "surveillanceDone2", naId: "na1" })],
      [
        { naId: "na1", field: "surveillanceDone1", action: "clear" },
        { naId: "na1", field: "surveillanceDone2", action: "clear" },
      ],
      TODAY,
    );
    expect(plan.changes).toHaveLength(2);
    expect(plan.facilities).toEqual(["f1"]);
  });

  test("the summary says what will happen, including the score clear", () => {
    const plan = buildSurveillancePlan(
      [row({ field: "surveillanceDone2", score: 90 })],
      [{ naId: "na1", field: "surveillanceDone2", action: "clear" }],
      TODAY,
    );
    const text = planSummary(plan);
    expect(text).toContain("1 cleared");
    expect(text).toContain("score");
    expect(text).toContain("1 facility");
  });

  test("an empty plan says so", () => {
    expect(planSummary(buildSurveillancePlan([], [], TODAY))).toBe("No changes selected");
  });
});
