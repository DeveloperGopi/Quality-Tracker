/**
 * PART 1 (verify the whole path) — the DOCUMENT SELF-TEST.
 *
 * The self-test is what an admin runs after resuming uploads: it must walk the
 * SIX counted documents (not a hard-coded four), exercise the channel each one
 * actually accepts, and print one pass/fail row per document with a cause when
 * it fails. The plan and the wording live in `documentsConfig` so the server,
 * the Drive panel and these tests all agree.
 */
import { describe, expect, test } from "bun:test";

import {
  COUNTED_DOC_KEYS,
  DOCUMENT_FIELDS,
  documentSelfTestPlan,
  selfTestOutcome,
} from "../src/lib/documentsConfig";
import { acceptFor, allowedMimesFor } from "../src/convex/storage/validation";

describe("document self-test plan — all six counted documents", () => {
  const plan = documentSelfTestPlan();

  test("the plan covers exactly the six counted document types", () => {
    expect(plan.map((t) => t.key)).toEqual([...COUNTED_DOC_KEYS]);
    expect(plan).toHaveLength(6);
  });

  test("the six rows are SA Report, SA Checklist, NQAS Result, Gap Closure, Condemned, Fire NOC", () => {
    expect(plan.map((t) => t.label)).toEqual([
      "SA Report",
      "SA Checklist",
      "NQAS Result",
      "Gap Closure Proceeding",
      "Condemned Certificate",
      "Fire NOC",
    ]);
  });

  test("a row can never disagree with the label the tiles and badges show", () => {
    for (const row of plan) {
      const field = DOCUMENT_FIELDS.find((f) => f.docKey === row.key);
      expect(field?.label).toBe(row.label);
    }
  });

  test("each row exercises a type that document really accepts", () => {
    for (const row of plan) {
      expect(allowedMimesFor(row.key)).toContain(row.mime);
      expect(
        acceptFor(row.key)
          .split(",")
          .map((e) => e.replace(".", "").toLowerCase()),
      ).toContain(row.ext.toLowerCase());
    }
  });

  test("SA Checklist is tested on the Excel channel, the PDFs on PDF", () => {
    const byKey = Object.fromEntries(plan.map((t) => [t.key, t]));
    expect(byKey.SA_Checklist.mime).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(byKey.SA_Checklist.ext).toBe("xlsx");
    for (const key of ["SA_Report", "NQAS_Result", "Gap_Closure", "Condemned", "NOC"]) {
      expect(byKey[key].mime).toBe("application/pdf");
      expect(byKey[key].ext).toBe("pdf");
    }
  });

  test("the plan stays in step with a document added to the config later", () => {
    expect(plan.length).toBe(COUNTED_DOC_KEYS.length);
    expect(new Set(plan.map((t) => t.key)).size).toBe(plan.length);
  });
});

describe("self-test verdicts — one cause per failure", () => {
  test("a clean write → read back passes with the shared wording", () => {
    const out = selfTestOutcome({
      mime: "application/pdf",
      written: 120,
      readBack: { size: "120", mimeType: "application/pdf" },
    });
    expect(out).toEqual({ ok: true, message: "Uploaded, verified and removed" });
  });

  test("a missing read-back says the file is gone", () => {
    const out = selfTestOutcome({ mime: "application/pdf", written: 120, readBack: null });
    expect(out.ok).toBe(false);
    expect(out.message).toContain("not in Drive");
  });

  test("a wrong stored type names both types", () => {
    const out = selfTestOutcome({
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      written: 64,
      readBack: { size: "64", mimeType: "application/pdf" },
    });
    expect(out.ok).toBe(false);
    expect(out.message).toContain("application/pdf");
    expect(out.message).toContain("spreadsheetml.sheet");
  });

  test("a truncated read-back reports both byte counts", () => {
    const out = selfTestOutcome({
      mime: "application/pdf",
      written: 120,
      readBack: { size: "40", mimeType: "application/pdf" },
    });
    expect(out.ok).toBe(false);
    expect(out.message).toContain("40");
    expect(out.message).toContain("120");
  });

  test("an absent size field is not treated as a failure (a blank is never 0)", () => {
    const out = selfTestOutcome({
      mime: "application/pdf",
      written: 120,
      readBack: { mimeType: "application/pdf" },
    });
    expect(out.ok).toBe(true);
  });
});
