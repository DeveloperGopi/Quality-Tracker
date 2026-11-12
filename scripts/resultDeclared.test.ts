/**
 * RESULT DECLARED — one rule, every screen.
 *
 * A certified / conditional / deferred facility reads "Result declared" in the
 * report column and "Result Declared" in the SaQsham Documents Status, even on
 * rows written before the automatic rule existed (read-time, so imports cannot
 * downgrade it and a stale portal value cannot win).
 *
 * Run: bun test ./scripts/resultDeclared.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  RESULT_DECLARED,
  RESULT_DECLARED_LABEL,
  documentsStatusReportOf,
  importWouldDowngrade,
  isResultDeclared,
  isResultDeclaredStatus,
} from "../src/lib/resultDeclared";

describe("result declared — which certification results count", () => {
  test("quality certified, conditional and deferred are declared", () => {
    expect(isResultDeclaredStatus("Quality Certified")).toBe(true);
    expect(isResultDeclaredStatus("Quality Certified with Conditionality")).toBe(true);
    expect(isResultDeclaredStatus("Deferred")).toBe(true);
  });

  test("case and surrounding whitespace tolerant; anything else is not declared", () => {
    expect(isResultDeclaredStatus("  quality certified ")).toBe(true);
    expect(isResultDeclaredStatus("Not Certified")).toBe(false);
    expect(isResultDeclaredStatus("")).toBe(false);
    expect(isResultDeclaredStatus(null)).toBe(false);
  });

  test("only the automatic value is the stored declared status", () => {
    expect(isResultDeclared(RESULT_DECLARED)).toBe(true);
    expect(isResultDeclared("  result declared ")).toBe(true);
    expect(isResultDeclared("Submitted")).toBe(false);
  });
});

describe("report column — one value everywhere", () => {
  test("a stale portal value never wins over a declared result", () => {
    // The reproduced bug: certified facility, portal status still "Not started".
    expect(documentsStatusReportOf("Not started", null, "Quality Certified")).toBe(
      RESULT_DECLARED_LABEL,
    );
    expect(
      documentsStatusReportOf("Not started", "Not started", "Quality Certified with Conditionality"),
    ).toBe(RESULT_DECLARED_LABEL);
    expect(documentsStatusReportOf("Not started", null, "Deferred")).toBe(
      RESULT_DECLARED_LABEL,
    );
  });

  test("the stored automatic value reads the same label", () => {
    expect(documentsStatusReportOf(RESULT_DECLARED, null, null)).toBe(RESULT_DECLARED_LABEL);
    expect(documentsStatusReportOf(RESULT_DECLARED, "Result Declared", "Not Certified")).toBe(
      RESULT_DECLARED_LABEL,
    );
  });

  test("otherwise the portal report is shown exactly as imported", () => {
    expect(documentsStatusReportOf("Submitted to portal", "Submitted", null)).toBe("Submitted");
    expect(documentsStatusReportOf("", "Under review", "Not Certified")).toBe("Under review");
  });

  test("a blank stays blank — never 0, never a made-up status", () => {
    expect(documentsStatusReportOf("", "", null)).toBeNull();
    expect(documentsStatusReportOf(undefined, undefined, "Not Certified")).toBeNull();
    expect(documentsStatusReportOf("   ", "  ", null)).toBeNull();
  });
});

describe("imports never downgrade a declared result", () => {
  test("an earlier portal status would downgrade a declared row", () => {
    expect(importWouldDowngrade(RESULT_DECLARED, "Submitted to portal")).toBe(true);
    expect(importWouldDowngrade(RESULT_DECLARED, "")).toBe(true);
  });

  test("re-declaring or untouched rows are allowed", () => {
    expect(importWouldDowngrade(RESULT_DECLARED, RESULT_DECLARED)).toBe(false);
    expect(importWouldDowngrade("Submitted to portal", "Approved")).toBe(false);
  });
});
