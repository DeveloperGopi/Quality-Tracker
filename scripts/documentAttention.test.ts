/**
 * PART C ③ — a missing REQUIRED document is part of "Needs attention".
 *
 * One rule source (Admin → Documents) decides it; the KPI count, the bell
 * list, the sidebar badge and the smart view must all answer with the same
 * set, and old data is only flagged, never blocked.
 */

import { describe, expect, test } from "bun:test";
import {
  attentionList,
  attentionOf,
  computeKpis,
  requiredDocumentsMissing,
  type MasterRow,
} from "../src/lib/masterColumns";
import { DEFAULT_DOCUMENT_RULES, normalizeDocumentRules } from "../src/lib/documentRules";
import { DEFAULT_PENDING_CONFIG } from "../src/lib/pending";
import { kpiMatches } from "../src/lib/masterFilter";

const row = (over: Partial<MasterRow> = {}): MasterRow => ({
  facility: {
    _id: "f1",
    name: "Kavalurchatram",
    block: "Alangayam",
    phc: "Alangayam",
    facilityType: "PHC",
    eligibility: "Eligible",
    currentStatus: "Quality Certified",
  },
  sa: null,
  nqas: {
    certificationStatus: "Quality Certified",
    certificationDate: "2026-05-01",
    goiLetterDate: "2026-05-01",
    validityDate: "2029-05-01",
  },
  fund: null,
  noc: null,
  building: { buildingStatus: "Good" },
  docs: { uploaded: 5, total: 6, keys: ["SA_Report", "SA_Checklist", "Gap_Closure", "Condemned", "NOC"] },
  ...over,
});

const optionalRules = normalizeDocumentRules({
  NQAS_Result: { mode: "optional", blocking: false },
});

/** Only the document rules — this file pins the document engine, while the
 *  full registry (NOC missing, IA missing, …) is exercised by /pending. */
const DOCS_ONLY = {
  ...DEFAULT_PENDING_CONFIG,
  rules: Object.fromEntries(
    Object.entries(DEFAULT_PENDING_CONFIG.rules).map(([id, setting]) => [
      id,
      { ...setting, enabled: id.startsWith("doc.") },
    ]),
  ),
};

describe("required documents — one rule, one answer", () => {
  test("a certified facility missing the NQAS Result is flagged", () => {
    const missing = requiredDocumentsMissing(row(), DEFAULT_DOCUMENT_RULES);
    expect(missing.map((m) => m.key)).toEqual(["NQAS_Result"]);
    expect(missing[0].label).toBe("NQAS Result");
    expect(missing[0].blocking).toBe(true);
  });

  test("switching the rule to Optional removes the flag without touching data", () => {
    expect(requiredDocumentsMissing(row(), optionalRules)).toEqual([]);
    expect(attentionOf(row(), new Date("2026-10-24"), optionalRules, DOCS_ONLY)).toBe(false);
  });

  test("a facility with no doc key list is never accused", () => {
    const bare = row({ docs: { uploaded: 0, total: 6 } });
    expect(requiredDocumentsMissing(bare, DEFAULT_DOCUMENT_RULES)).toEqual([]);
    expect(attentionOf(bare, new Date("2026-10-24"), DEFAULT_DOCUMENT_RULES, DOCS_ONLY)).toBe(false);
  });

  test("the legacy certificate key satisfies the merged document", () => {
    const legacy = row({
      docs: {
        uploaded: 6,
        total: 6,
        keys: ["SA_Report", "SA_Checklist", "NQAS_Certificate", "Gap_Closure", "Condemned", "NOC"],
      },
    });
    expect(requiredDocumentsMissing(legacy, DEFAULT_DOCUMENT_RULES)).toEqual([]);
  });
});

describe("required documents — badge, bell, KPI and smart view agree", () => {
  test("the badge count equals the list it opens and the smart-view filter", () => {
    const rows = [
      row(),
      row({ facility: { ...row().facility, _id: "f2", name: "Kayakalp" } }),
      row({
        facility: { ...row().facility, _id: "f3", name: "Complete" },
        docs: {
          uploaded: 6,
          total: 6,
          keys: ["SA_Report", "SA_Checklist", "NQAS_Result", "Gap_Closure", "Condemned", "NOC"],
        },
      }),
    ];
    const today = new Date("2026-10-24");
    const listed = attentionList(rows, today, DEFAULT_DOCUMENT_RULES, DOCS_ONLY);
    const smartView = rows.filter((r) =>
      kpiMatches(r, "attention", today, DEFAULT_DOCUMENT_RULES, DOCS_ONLY),
    );
    expect(listed).toHaveLength(2);
    expect(smartView).toHaveLength(2);
    expect(
      computeKpis(rows, today, DEFAULT_DOCUMENT_RULES, DOCS_ONLY).attentionFacilities,
    ).toBe(2);
  });

  test("the reason names the document and points at the uploader", () => {
    const [item] = attentionList([row()], new Date("2026-10-24"), DEFAULT_DOCUMENT_RULES);
    expect(item.reason).toContain("NQAS Result");
    expect(item.section).toBe("documents");
    expect(item.documentKeys).toEqual(["NQAS_Result"]);
  });

  test("an old facility is flagged, never removed or blocked", () => {
    const today = new Date("2026-10-24");
    expect(kpiMatches(row(), "total", today)).toBe(true);
    expect(attentionOf(row(), today)).toBe(true);
  });
});
