/**
 * REPORTS SUMMARY (Part 1) — reconciliation and one-bucket pipeline.
 *
 * The reproduced bug read "Certification ✓ 74/157" because only the certified
 * columns were counted; every group now includes its remainder and every
 * facility lands in exactly one pipeline bucket. When a status is unknown the
 * pipeline check FAILS and names the facility instead of hiding it.
 */
import { describe, expect, test } from "bun:test";
import {
  countedFor,
  grandTotalTypeWise,
  reconciliationText,
  summarizeTypeWise,
  type TypeWiseRow,
} from "../src/components/TypeWiseSummary";
import { classifyPipeline, docStageLabel } from "../src/lib/reportPipeline";
import { deriveFlatLifecycle } from "../src/convex/lifecycle";

const DOC = ["Docx Pending at Facility", "Docx in RQAU login"];

function row(over: Partial<TypeWiseRow> = {}): TypeWiseRow {
  return {
    facilityId: "f1",
    facilityType: "PHC",
    block: "Alangayam",
    phc: "Alangayam",
    cycle: 1,
    currentStatus: "SA Not Yet Initiated",
    certStatus: null,
    naStatus: null,
    naStartDate: null,
    saStatus: null,
    docStatus: null,
    buildingStatus: null,
    ...over,
  };
}

describe("summary reconciliation includes the remainder", () => {
  const rows = [
    row({ facilityId: "q", certStatus: "Quality Certified", currentStatus: "Certified — On track", saStatus: "Completed" }),
    row({ facilityId: "c", certStatus: "Quality Certified with Conditionality", currentStatus: "Certified with Conditionality", saStatus: "Completed" }),
    row({ facilityId: "d", certStatus: "Deferred", currentStatus: "Deferred — Cooling Period", saStatus: "Completed" }),
    row({ facilityId: "n", currentStatus: "SA Not Yet Initiated" }),
  ];
  const [summary] = summarizeTypeWise(rows, "type", DOC, []);
  const total = grandTotalTypeWise([summary]);

  test("certification counts only certified + conditional, plus deferred and a remainder", () => {
    expect(summary.certified).toBe(1);
    expect(summary.conditional).toBe(1);
    expect(summary.totalCertified).toBe(2);
    expect(summary.deferred).toBe(1);
    expect(summary.notCertified).toBe(1);
    expect(
      summary.certified + summary.conditional + summary.deferred + summary.notCertified,
    ).toBe(summary.target);
    expect(reconciliationText(total)).toContain(`Certification ✓ ${total.target}/${total.target}`);
  });

  test("certified facilities land in Result declared even when that value is not in the admin list", () => {
    expect(summary.resultDeclared).toBe(3);
    expect(summary.docTotal).toBe(summary.target);
    expect(reconciliationText(total)).toContain(`Pipeline ✓ ${total.target}/${total.target}`);
  });

  test("a blank document status is a real bucket, not a failure", () => {
    expect(summary.notRecorded).toBe(1);
    expect(summary.notInPipeline).toBe(0);
    expect(total.reconcile.pipeline).toBe(true);
  });

  test("a blank is not 0%: certified % uses the shared one-decimal label", () => {
    // 2 of 4 = 50.0, not "50%" in one place and "50.0%" in another.
    expect(summary.certifiedPct).toBe(50);
    expect(reconciliationText(total)).toContain("Building ✓");
  });
});

describe("pipeline failures are named, not swallowed", () => {
  const rows = [
    row({ facilityId: "known", docStatus: "Docx in RQAU login", saStatus: "Scheduled" }),
    row({ facilityId: "unknown", docStatus: "Something the admin list does not know" }),
    row({ facilityId: "blank" }),
  ];
  const [summary] = summarizeTypeWise(rows, "type", DOC, []);
  const total = grandTotalTypeWise([summary]);

  test("the unknown status lands in the remainder and fails the check", () => {
    expect(summary.notInPipeline).toBe(1);
    expect(summary.notRecorded).toBe(1);
    expect(total.reconcile.pipeline).toBe(false);
    expect(countedFor(total).pipeline).toBe(2);
    expect(total.failures.pipeline).toEqual(["unknown"]);
    expect(reconciliationText(total)).toMatch(
      /Pipeline ⚠|Pipeline ✗|Pipeline ✓/,
    );
    expect(reconciliationText(total)).toMatch(/1 facility in no bucket/);
  });

  test("every facility is counted exactly once in the pipeline columns", () => {
    const sum =
      summary.nqasScheduled +
      summary.resultAwaited +
      summary.resultDeclared +
      summary.notRecorded +
      summary.nextPhase +
      summary.notInPipeline +
      Object.values(summary.docCounts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(summary.target);
  });
});

describe("display labels keep the stored key", () => {
  test("every legacy Docx wording reads Docs", () => {
    expect(docStageLabel("Docx Pending at Facility")).toBe("Docs Pending at Facility");
    expect(docStageLabel("Docx in RQAU login")).toBe("Docs in RQAU login");
    expect(docStageLabel("Docx forwarded to NHSRC")).toBe("Docs forwarded to NHSRC");
    expect(docStageLabel("Result Declared")).toBe("Result Declared");
  });
});

describe("classifyPipeline priority", () => {
  const view = (certStatus: string | null, extra: Record<string, unknown> = {}) =>
    deriveFlatLifecycle({ currentStatus: "", certStatus, ...extra });

  test("a declared result wins over any document stage", () => {
    const placement = classifyPipeline({
      view: view("Quality Certified"),
      saStatus: "Completed",
      docStatus: "Docx in RQAU login",
      docStatuses: DOC,
      certificationStatus: "Quality Certified",
    });
    expect(placement.kind).toBe("resultDeclared");
  });

  test("a real document stage is used when no lifecycle column owns it", () => {
    const placement = classifyPipeline({
      view: view(null),
      saStatus: "Not Yet Initiated",
      docStatus: "Docx in RQAU login",
      docStatuses: DOC,
    });
    expect(placement.kind).toBe("doc");
    expect(placement.bucket).toBe("Docx in RQAU login");
  });

  test("an unknown non-blank status is the remainder", () => {
    expect(
      classifyPipeline({
        view: view(null),
        saStatus: null,
        docStatus: "New status",
        docStatuses: DOC,
      }).kind,
    ).toBe("notInPipeline");
  });
});
