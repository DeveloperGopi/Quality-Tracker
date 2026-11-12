/**
 * Facility Profile rules tests — locks the validation, needs-attention and
 * formatting contract behind the State Assessment / NQAS Assessment screens
 * and the Overview panels.
 *
 * Run: bun test ./scripts
 */
import { describe, it, expect } from "bun:test";
import {
  SCORE_THRESHOLDS,
  dueChip,
  dmy,
  fieldCompleteness,
  formatInr,
  nextSurveillance,
  parseScore,
  SA_FIELDS,
  NQAS_FIELDS,
  NQAS_SECTIONS,
  SA_SECTIONS,
  FIELD_DEFS,
  needsAttention,
  scoreTone,
  sectionSummaries,
  validateNqasDraft,
  validateSaDraft,
  type FieldIssue,
  type NqasDraft,
  type SaDraft,
} from "../src/lib/facilityProfileRules";

const TODAY = "2026-01-15";

const saDraft = (over: Partial<SaDraft> = {}): SaDraft => ({
  scheduledDate: "",
  actualStartDate: "",
  actualEndDate: "",
  scorePercent: "",
  generalDocStatus: "",
  assessor1Name: "",
  assessor1Hud: "",
  assessor2Name: "",
  assessor2Hud: "",
  ...over,
});

const nqasDraft = (over: Partial<NqasDraft> = {}): NqasDraft => ({
  scheduledStartDate: "",
  scheduledEndDate: "",
  actualStartDate: "",
  actualEndDate: "",
  mode: "",
  checklistVersion: "",
  departments: [],
  certificationStatus: "",
  certificationDate: "",
  scorePercent: "",
  ...over,
});

describe("formatting helpers", () => {
  it("scoreTone follows the ONE threshold constant", () => {
    expect(SCORE_THRESHOLDS.good).toBe(70);
    expect(SCORE_THRESHOLDS.fair).toBe(50);
    expect(scoreTone(null)).toBe("grey");
    expect(scoreTone(70)).toBe("green");
    expect(scoreTone(69.9)).toBe("amber");
    expect(scoreTone(50)).toBe("amber");
    expect(scoreTone(49.9)).toBe("red");
  });

  it("formatInr uses Indian digit grouping and is blank-safe", () => {
    expect(formatInr(123456)).toBe("₹1,23,456");
    expect(formatInr(1000)).toBe("₹1,000");
    expect(formatInr(0)).toBe("₹0");
    expect(formatInr(null)).toBe("—");
  });

  it("dueChip reads Overdue / Due in with the right tones", () => {
    expect(dueChip(null)).toBeNull();
    expect(dueChip(-12)).toEqual({ label: "Overdue 12d", tone: "red" });
    expect(dueChip(0)).toEqual({ label: "Due today", tone: "amber" });
    expect(dueChip(20)).toEqual({ label: "Due in 20d", tone: "amber" });
    expect(dueChip(200)).toEqual({ label: "Due in 200d", tone: "blue" });
  });

  it("dmy renders DD-MMM-YYYY and blanks as —", () => {
    expect(dmy("2026-01-05")).toBe("05-Jan-2026");
    expect(dmy("")).toBe("—");
    expect(dmy(null)).toBe("—");
    expect(dmy("not-a-date")).toBe("not-a-date");
  });

  it("parseScore clamps to 0–100 with one decimal", () => {
    expect(parseScore("")).toBeNull();
    expect(parseScore("abc")).toBeNull();
    expect(parseScore("89")).toBe(89);
    expect(parseScore("89.55")).toBe(89.6);
    expect(parseScore("120")).toBe(100);
    expect(parseScore("-3")).toBe(0);
  });
});

describe("validateSaDraft", () => {
  it("a blank draft is valid (a brand-new facility saves cleanly)", () => {
    expect(validateSaDraft(saDraft(), TODAY)).toEqual([]);
  });

  it("end date before start date is blocked with a plain-language fix", () => {
    const issues = validateSaDraft(
      saDraft({ actualStartDate: "2026-01-10", actualEndDate: "2026-01-08" }),
      TODAY,
    );
    expect(issues.some((i) => i.field === "sa.actualEndDate" && i.message.includes("before the start"))).toBe(true);
  });

  it("actual dates in the future are blocked", () => {
    const issues = validateSaDraft(
      saDraft({ actualStartDate: "2026-01-20", actualEndDate: "2026-01-20", scorePercent: "70" }),
      TODAY,
    );
    expect(issues.some((i) => i.field === "sa.actualStartDate" && i.message.includes("future"))).toBe(true);
  });

  it("a completed visit requires both dates and a score", () => {
    const issues = validateSaDraft(saDraft({ actualStartDate: "2026-01-10" }), TODAY);
    expect(issues.some((i) => i.field === "sa.actualStartDate" && i.message.includes("end date"))).toBe(true);
    expect(issues.some((i) => i.field === "sa.scorePercent" && i.message.includes("needs its score"))).toBe(true);
  });

  it("a fully valid completed visit passes", () => {
    expect(
      validateSaDraft(
        saDraft({
          actualStartDate: "2026-01-10",
          actualEndDate: "2026-01-10",
          scorePercent: "78.5",
          assessor1Name: "Dr A",
        }),
        TODAY,
      ),
    ).toEqual([]);
  });

  it("a non-numeric score is explained, not silently dropped", () => {
    const issues = validateSaDraft(saDraft({ scorePercent: "seventy" }), TODAY);
    expect(issues.some((i) => i.field === "sa.scorePercent" && i.message.includes("not a number"))).toBe(true);
  });
});

describe("validateNqasDraft", () => {
  it("blank draft with SA completed is valid", () => {
    expect(validateNqasDraft(nqasDraft(), { today: TODAY, saCompleted: true })).toEqual([]);
  });

  it("NQAS cannot be completed while the SA of the cycle is not completed", () => {
    const issues = validateNqasDraft(
      nqasDraft({ actualStartDate: "2026-01-10", actualEndDate: "2026-01-10", scorePercent: "80" }),
      { today: TODAY, saCompleted: false },
    );
    expect(issues.some((i) => i.field === "nqas.certificationStatus" && i.message.includes("State Assessment"))).toBe(true);
  });

  it("Certified requires the GoI letter date", () => {
    const issues = validateNqasDraft(
      nqasDraft({ certificationStatus: "Quality Certified" }),
      { today: TODAY, saCompleted: true },
    );
    expect(issues.some((i) => i.field === "nqas.certificationDate")).toBe(true);
  });

  it("Certified requires the NQAS result file", () => {
    const issues = validateNqasDraft(
      nqasDraft({ certificationStatus: "Quality Certified", certificationDate: "2026-01-10" }),
      { today: TODAY, saCompleted: true },
    );
    expect(issues.some((i) => i.field === "nqas.resultDocumentId")).toBe(true);
  });

  it("an uploaded result file clears the issue — the form's own draft key", () => {
    // The form stores the upload under `resultDocumentId` (the DB column), so
    // the rule has to read that key: reading a different one flagged a valid
    // upload as missing and blocked Save for ever.
    const issues = validateNqasDraft(
      nqasDraft({
        certificationStatus: "Quality Certified",
        certificationDate: "2026-01-10",
        resultDocumentId: "storage123",
      }),
      { today: TODAY, saCompleted: true },
    );
    // A certified result with its letter date and file is complete — nothing
    // left to fix, so Save is allowed.
    expect(issues).toEqual([]);
  });

  it("recognises a current NQAS Result in facilityDocuments without the legacy column", () => {
    // The upload lives in facility_document. The profile and the server now
    // read the SAME presence flag, so a valid uploaded PDF is not rejected.
    const issues = validateNqasDraft(
      nqasDraft({
        certificationStatus: "Quality Certified",
        certificationDate: "2026-01-10",
      }),
      { today: TODAY, saCompleted: true, resultDocUploaded: true },
    );
    expect(issues.some((issue) => issue.field === "nqas.resultDocumentId")).toBe(false);
  });

  it("does not block unrelated saves when the Admin rule is not blocking", () => {
    const issues = validateNqasDraft(
      nqasDraft({
        certificationStatus: "Quality Certified",
        certificationDate: "2026-01-10",
      }),
      {
        today: TODAY,
        saCompleted: true,
        resultDocRule: { required: true, blocking: false, label: "NQAS Result" },
      },
    );
    expect(issues.some((issue) => issue.field === "nqas.resultDocumentId")).toBe(false);
  });

  it("Certified with letter date + result file + dates + score passes", () => {
    expect(
      validateNqasDraft(
        nqasDraft({
          actualStartDate: "2026-01-08",
          actualEndDate: "2026-01-09",
          scorePercent: "84",
          certificationStatus: "Quality Certified",
          certificationDate: "2026-01-14",
          resultDocumentId: "storage123",
          departments: ["OPD"],
        }),
        { today: TODAY, saCompleted: true },
      ),
    ).toEqual([]);
  });

  it("scheduled end before scheduled start is blocked", () => {
    const issues = validateNqasDraft(
      nqasDraft({ scheduledStartDate: "2026-01-10", scheduledEndDate: "2026-01-09" }),
      { today: TODAY, saCompleted: true },
    );
    expect(issues.some((i) => i.field === "nqas.scheduledEndDate")).toBe(true);
  });
});

describe("needsAttention", () => {
  const base = { nocs: [], funds: [], settings: null, today: TODAY };

  it("a clean certified facility produces nothing", () => {
    const items = needsAttention({
      ...base,
      sa: { status: "Completed", actualStartDate: "2025-01-10", actualEndDate: "2025-01-10", reportAttachmentId: "r1" },
      nqas: {
        status: "Completed",
        certificationStatus: "Quality Certified",
        certificationDate: "2026-01-01",
        goiLetterDate: "2026-01-01",
        validityDate: "2029-01-01",
        scorePercent: 84,
        resultDocumentId: "res1",
      },
    });
    expect(items.filter((i) => i.severity === "danger")).toEqual([]);
  });

  it("flags certified with no dates — the contradictory screenshot case", () => {
    const items = needsAttention({
      ...base,
      sa: { status: "Completed" },
      nqas: { status: "Completed", certificationStatus: "Quality Certified", resultDocumentId: "r" },
    });
    expect(items.some((i) => i.id === "nqas-cert-no-date" && i.severity === "danger")).toBe(true);
    expect(items.some((i) => i.id === "sa-dates-missing")).toBe(true);
  });

  it("flags NQAS recorded while the SA of the cycle is not completed", () => {
    const items = needsAttention({
      ...base,
      sa: { status: "Scheduled", scheduledDate: "2026-01-05" },
      nqas: { status: "Completed", scorePercent: 80 },
    });
    expect(items.some((i) => i.id === "nqas-before-sa" && i.severity === "danger")).toBe(true);
  });

  it("flags NQAS completed with no score and a missing SA report", () => {
    const items = needsAttention({
      ...base,
      sa: { status: "Completed", actualStartDate: "2026-01-01", actualEndDate: "2026-01-01" },
      nqas: { status: "Completed" },
    });
    expect(items.some((i) => i.id === "nqas-score-missing")).toBe(true);
    expect(items.some((i) => i.id === "sa-report-missing")).toBe(true);
  });

  it("flags a certificate expiring inside the lead window and overdue surveillance", () => {
    const items = needsAttention({
      ...base,
      sa: { status: "Completed", actualStartDate: "2023-01-01", actualEndDate: "2023-01-01", reportAttachmentId: "r" },
      nqas: {
        status: "Completed",
        certificationStatus: "Quality Certified",
        certificationDate: "2023-04-01",
        validityDate: "2026-03-01", // ~45 days away
        scorePercent: 80,
        resultDocumentId: "r",
      },
    });
    expect(items.some((i) => i.id === "cert-expiring")).toBe(true);
    // Surveillance Y1/Y2 (2024-04-01, 2025-04-01) both in the past.
    expect(items.some((i) => i.id === "surv1-overdue")).toBe(true);
  });

  it("flags an expired Fire NOC and pending funds", () => {
    const items = needsAttention({
      ...base,
      sa: null,
      nqas: null,
      nocs: [{ expiryDate: "2025-12-01" }],
      funds: [{ status: "Pending" }],
    });
    expect(items.some((i) => i.id.startsWith("noc-expired"))).toBe(true);
    expect(items.some((i) => i.id === "funds-open")).toBe(true);
  });

  it("sorts dangers first", () => {
    const items = needsAttention({
      ...base,
      sa: { status: "Completed" },
      nqas: { status: "Completed", certificationStatus: "Quality Certified" },
      funds: [{ status: "Pending" }],
    });
    expect(items[0].severity).toBe("danger");
  });
});

describe("sectionSummaries + completeness", () => {
  it("counts filled fields over the config's field list", () => {
    const done = fieldCompleteness(SA_FIELDS, { scheduledDate: "2026-01-01", scorePercent: 80 });
    expect(done.total).toBe(SA_FIELDS.length);
    expect(done.filled).toBe(2);
    const none = fieldCompleteness(NQAS_FIELDS, { departments: [] });
    expect(none.filled).toBe(0);
  });

  it("summary cards derive pills and rows from the records", () => {
    const cards = sectionSummaries({
      sa: { status: "Completed", scheduledDate: "2026-01-02", actualStartDate: "2026-01-05", actualEndDate: "2026-01-05", scorePercent: 76, assessor1Name: "Dr X" },
      nqas: { status: "Completed", certificationStatus: "Quality Certified", certificationDate: "2026-01-10", validityDate: "2029-01-10", scorePercent: 82, mode: "Physical" },
      funds: [{ status: "Received", amountSanctioned: 500000, financialYear: "2025-26" }],
      nocs: [{ expiryDate: "2027-06-01" }],
      buildings: [{ buildingStatus: "Good", buildingType: "Own Building" }],
      settings: null,
      today: TODAY,
    });
    const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));
    expect(byKey.state.chip).toEqual({ label: "Completed", tone: "green" });
    expect(byKey.national.chip).toEqual({ label: "Certified", tone: "green" });
    expect(byKey.funds.rows[0].value).toBe("₹5,00,000");
    expect(byKey.noc.chip).toEqual({ label: "Valid", tone: "green" });
    expect(byKey.building.chip).toEqual({ label: "Good", tone: "green" });
  });
});

describe("nextSurveillance", () => {
  it("returns the earliest due date (Y1) with days left", () => {
    const next = nextSurveillance(
      {
        status: "Completed",
        certificationStatus: "Quality Certified",
        certificationDate: "2025-12-01",
        goiLetterDate: "2025-12-01",
      },
      null,
      TODAY,
    );
    expect(next?.date).toBe("2026-12-01");
    expect(next?.daysLeft).toBe(320); // Y1 = +12 months = 2026-12-01, 320 days after 2026-01-15
  });

  it("is null when not certified", () => {
    expect(nextSurveillance({ status: "Scheduled" }, null, TODAY)).toBeNull();
  });
});

describe("rule field keys resolve to a rendered field", () => {
  // The forms look an error up by the bare key of `issue.field` and focus the
  // element with `data-focus="<issue.field>"`. A rule pointing at a key the
  // form never renders is invisible AND unfixable — the field it complains
  // about holds the right value, yet Save stays blocked (the NQAS Result
  // upload bug). Every key a validator can emit must map to a field the form
  // renders, in a section that exists.
  const cases: { issue: FieldIssue; sections: readonly { id: string }[] }[] = [
    ...validateSaDraft(
      saDraft({ actualStartDate: "2027-01-01", actualEndDate: "2026-01-01", scorePercent: "x" }),
      TODAY,
    ).map((issue) => ({ issue, sections: SA_SECTIONS })),
    ...validateNqasDraft(
      nqasDraft({
        actualStartDate: "2027-01-01",
        scheduledStartDate: "2026-01-10",
        scheduledEndDate: "2026-01-02",
        certificationStatus: "Quality Certified",
        scorePercent: "seventy",
      }),
      { today: TODAY, saCompleted: false },
    ).map((issue) => ({ issue, sections: NQAS_SECTIONS })),
  ];

  it("covers both forms", () => {
    expect(cases.length).toBeGreaterThan(4);
    expect(cases.some((c) => c.issue.field.startsWith("sa."))).toBe(true);
    expect(cases.some((c) => c.issue.field.startsWith("nqas."))).toBe(true);
  });

  it("every issue key is `sa.`/`nqas.` + a field def in an existing section", () => {
    for (const { issue, sections } of cases) {
      const bare = issue.field.replace(/^(sa|nqas)\./, "");
      expect(bare).not.toBe(issue.field); // a real prefix, not a bare key
      const def = FIELD_DEFS[bare];
      expect(def, `no field def for ${issue.field}`).toBeDefined();
      expect(
        sections.map((s) => s.id),
        `section ${def.section} for ${issue.field}`,
      ).toContain(def.section);
    }
  });

  it("keeps the NQAS result file on the DB column's own key", () => {
    // Regression guard: the rule, the field def, the focus key and the Convex
    // mirror must all name the same field.
    expect(FIELD_DEFS.resultDocumentId?.dbColumn).toBe("NQAS Result");
    const issues = validateNqasDraft(
      nqasDraft({ certificationStatus: "Quality Certified", certificationDate: "2026-01-10" }),
      { today: TODAY, saCompleted: true },
    );
    expect(issues.map((i) => i.field)).toContain("nqas.resultDocumentId");
  });
});
