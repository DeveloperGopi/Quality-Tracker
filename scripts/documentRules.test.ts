/**
 * PART C — the document requirement rules.
 *
 * The screenshot bug: the NQAS Result field showed "Optional" while the save
 * was blocked and the same error appeared twice. These tests pin the contract
 * that made those three disagree impossible: ONE rule decides the badge, the
 * blocking flag and the message.
 */

import { describe, expect, test } from "bun:test";
import {
  DEFAULT_DOCUMENT_RULES,
  blockingDocumentKeys,
  conditionMet,
  defaultDocumentRules,
  missingDocumentMessage,
  normalizeDocumentRules,
  resolveDocRequirement,
  resolveDocumentRequirements,
  type DocRule,
} from "../src/lib/documentRules";
import { validateNqasDraft } from "../src/lib/facilityProfileRules";

const certified = { certStatus: "Quality Certified" as string | null };
const notCertified = { certStatus: "Result Awaited" as string | null };

const rule = (patch: Partial<DocRule>): DocRule => ({
  mode: "optional",
  condition: "certified",
  blocking: false,
  scope: "cycle",
  ...patch,
});

describe("document rules — defaults (Part C ①)", () => {
  test("NQAS Certified Result is required when certified and blocking", () => {
    const r = DEFAULT_DOCUMENT_RULES.NQAS_Result;
    expect(r.mode).toBe("conditional");
    expect(r.condition).toBe("certified");
    expect(r.blocking).toBe(true);
  });

  test("SA Report, SA Checklist, Gap Closure, Condemned and NOC default to Optional", () => {
    for (const key of ["SA_Report", "SA_Checklist", "Gap_Closure", "Condemned", "NOC"]) {
      expect(DEFAULT_DOCUMENT_RULES[key].mode).toBe("optional");
      expect(DEFAULT_DOCUMENT_RULES[key].blocking).toBe(false);
    }
  });

  test("every active document always has a rule, even after a partial write", () => {
    const rules = normalizeDocumentRules({ SA_Report: { mode: "mandatory" } });
    expect(Object.keys(rules).length).toBe(Object.keys(defaultDocumentRules()).length);
    expect(rules.SA_Report.mode).toBe("mandatory");
    expect(rules.SA_Report.blocking).toBe(true); // mandatory implies blocking
    expect(rules.NQAS_Result.mode).toBe("conditional"); // default kept
  });
});

describe("document rules — the three modes agree with the badge", () => {
  test("Optional never blocks and says so", () => {
    const req = resolveDocRequirement(rule({ mode: "optional" }), certified);
    expect(req.required).toBe(false);
    expect(req.blocking).toBe(false);
    expect(req.badge).toBe("Optional");
  });

  test("Mandatory blocks whether or not the facility is certified", () => {
    const req = resolveDocRequirement(rule({ mode: "mandatory", blocking: true }), notCertified);
    expect(req.required).toBe(true);
    expect(req.blocking).toBe(true);
    expect(req.badge).toBe("Required");
  });

  test("Required when… names the condition in the badge and the reason", () => {
    const req = resolveDocRequirement(
      rule({ mode: "conditional", condition: "certified", blocking: true }),
      certified,
    );
    expect(req.required).toBe(true);
    expect(req.badge).toBe("Required: certified");
    expect(req.reason).toContain("certified or conditional");
  });

  test("Required when… that does not apply is Optional, with no reason", () => {
    const req = resolveDocRequirement(
      rule({ mode: "conditional", condition: "gap_amount", blocking: true }),
      { gapAmount: 0 },
    );
    expect(req.required).toBe(false);
    expect(req.badge).toBe("Optional");
    expect(req.reason).toBeNull();
  });

  test("each condition reads its own fact", () => {
    expect(conditionMet("certified", { certStatus: "Quality Certified with Conditionality" })).toBe(true);
    expect(conditionMet("certified", { certStatus: "Deferred" })).toBe(false);
    expect(conditionMet("gap_amount", { gapAmount: 150000 })).toBe(true);
    expect(conditionMet("dilapidated", { dilapidated: true })).toBe(true);
    expect(conditionMet("fire_noc", { fireNocRecorded: true })).toBe(true);
  });
});

describe("document rules — the blocking set the save gate reads", () => {
  test("only required AND blocking documents appear", () => {
    const rules = normalizeDocumentRules({
      SA_Report: { mode: "mandatory", blocking: true },
      NOC: { mode: "mandatory", blocking: false },
    });
    const keys = blockingDocumentKeys(rules, { certStatus: "Result Awaited" });
    expect(keys).toContain("SA_Report");
    expect(keys).not.toContain("NOC");
    expect(keys).not.toContain("NQAS_Result"); // conditional rule not met
  });

  test("switching NQAS Certified Result to Optional stops blocking a certified save", () => {
    const rules = normalizeDocumentRules({
      NQAS_Result: { mode: "optional", blocking: false },
    });
    const reqs = resolveDocumentRequirements(rules, { certStatus: "Quality Certified" });
    expect(reqs.NQAS_Result.required).toBe(false);
    expect(blockingDocumentKeys(rules, { certStatus: "Quality Certified" })).toHaveLength(0);
  });
});

describe("document rules — one message everywhere (never twice)", () => {
  test("a blocking missing file produces exactly one issue, with the badge wording", () => {
    const draft = {
      scheduledStartDate: "",
      scheduledEndDate: "",
      actualStartDate: "2026-01-05",
      actualEndDate: "2026-01-06",
      mode: "",
      checklistVersion: "",
      departments: [],
      certificationStatus: "Quality Certified",
      certificationDate: "2026-02-01",
      scorePercent: "90",
      resultDocumentId: "",
    } as never;
    const issues = validateNqasDraft(draft, {
      today: "2026-10-24",
      saCompleted: true,
      resultDocRule: { required: true, blocking: true, label: "NQAS Certified Result" },
    });
    const docIssues = issues.filter((i) => i.field === "nqas.resultDocumentId");
    expect(docIssues).toHaveLength(1);
    expect(docIssues[0].message).toContain("NQAS Certified Result");
    expect(docIssues[0].message).toContain("must be uploaded under Documents");
  });

  test("a Warning-only rule shows no blocking issue", () => {
    const draft = {
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
      resultDocumentId: "",
    } as never;
    const issues = validateNqasDraft(draft, {
      today: "2026-10-24",
      saCompleted: true,
      resultDocRule: { required: true, blocking: false, label: "SA Report" },
    });
    expect(issues.filter((i) => i.field === "nqas.resultDocumentId")).toHaveLength(0);
  });

  test("the shared message names the reason once", () => {
    const req = resolveDocRequirement(
      rule({ mode: "conditional", condition: "dilapidated", blocking: false }),
      { dilapidated: true },
    );
    const message = missingDocumentMessage("Condemned", req);
    expect(message.match(/Required because/g)?.length).toBe(1);
  });
});
