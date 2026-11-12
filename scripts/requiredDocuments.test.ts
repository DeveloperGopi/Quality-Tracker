/**
 * ONE required-document list — the warning every surface prints.
 *
 * The reported bug: the "NQAS Result is required…" sentence lived only inside
 * the Documents section, and other screens disagreed (or said nothing). These
 * cases pin the rule text and the "only when required and absent" behaviour so
 * the Documents banner, the Overview card, the Quick View chip, the Save bar,
 * Needs attention, the Master List cell and the facility sheet keep reading the
 * same answer.
 */
import { describe, expect, test } from "bun:test";

import {
  DEFAULT_DOCUMENT_RULES,
  normalizeDocumentRules,
  requiredDocumentIssues,
  type DocumentRules,
} from "../src/lib/documentRules";

const CERTIFIED = { certStatus: "Quality Certified" } as const;

describe("requiredDocumentIssues", () => {
  test("a certified facility without the NQAS Result has one blocking issue", () => {
    const issues = requiredDocumentIssues({ ...CERTIFIED, presentKeys: [] });
    expect(issues.map((i) => i.key)).toEqual(["NQAS_Result"]);
    expect(issues[0].label).toBe("NQAS Result");
    expect(issues[0].blocking).toBe(true);
    expect(issues[0].badge).toBe("Required: certified");
    expect(issues[0].message).toBe(
      "NQAS Result is required for this facility; saving the NQAS assessment is blocked until it is uploaded.",
    );
  });

  test("an uploaded NQAS Result clears the issue", () => {
    const issues = requiredDocumentIssues({
      ...CERTIFIED,
      presentKeys: ["NQAS_Result"],
    });
    expect(issues).toEqual([]);
  });

  test("the legacy NQAS_Certificate key counts as the NQAS Result (one document)", () => {
    const issues = requiredDocumentIssues({
      ...CERTIFIED,
      presentKeys: ["NQAS_Certificate"],
    });
    expect(issues).toEqual([]);
  });

  test("a non-certified facility needs nothing under the default rules", () => {
    const issues = requiredDocumentIssues({ certStatus: "Not Certified", presentKeys: [] });
    expect(issues).toEqual([]);
  });

  test("Admin → Documents decides: switching the rule to optional removes the issue", () => {
    const rules: DocumentRules = normalizeDocumentRules({
      NQAS_Result: { mode: "optional", condition: "certified", blocking: false, scope: "cycle" },
    });
    expect(requiredDocumentIssues({ ...CERTIFIED, presentKeys: [] }, rules)).toEqual([]);
  });

  test("a mandatory non-blocking rule warns without the 'blocked' sentence", () => {
    const rules: DocumentRules = {
      ...DEFAULT_DOCUMENT_RULES,
      SA_Report: { mode: "mandatory", condition: "certified", blocking: false, scope: "cycle" },
    };
    const issues = requiredDocumentIssues({ certStatus: null, presentKeys: [] }, rules);
    const sa = issues.find((i) => i.key === "SA_Report")!;
    expect(sa.blocking).toBe(false);
    expect(sa.badge).toBe("Required");
    expect(sa.message).toBe(
      "SA Report is required for this facility under the current document rules.",
    );
  });

  test("a missing key list is never treated as an accusation by callers", () => {
    // requiredDocumentIssues itself is only called when the keys are known;
    // the row adapter (requiredDocumentsMissing) guards on row.docs?.keys.
    expect(requiredDocumentIssues({ ...CERTIFIED, presentKeys: null }).length).toBe(1);
  });
});
