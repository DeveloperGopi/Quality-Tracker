/**
 * PART 3 — the cycle scope contract.
 *
 * Pins the URL/remembered parsing, which pages are cycle-based, and the one
 * cycle-resolution rule so the control and the list can never disagree.
 *
 * Run: bun test ./scripts/cycleScope.test.ts
 */
import { describe, expect, test } from "bun:test";

import {
  CYCLE_APPLIES_TO,
  cycleOptionDescription,
  cycleOptionLabel,
  cyclePageScope,
  cycleScopeLabel,
  cycleShortLabel,
  parseCycleScope,
  scopedCycleNumber,
  serializeCycleScope,
} from "../src/lib/cycleScope";

describe("cycle scope parsing", () => {
  test("defaults to current and never throws on junk", () => {
    expect(parseCycleScope(null)).toBe("current");
    expect(parseCycleScope("")).toBe("current");
    expect(parseCycleScope("current")).toBe("current");
    expect(parseCycleScope("ALL")).toBe("all");
    expect(parseCycleScope("2")).toBe(2);
    expect(parseCycleScope("0")).toBe("current");
    expect(parseCycleScope("-1")).toBe("current");
    expect(parseCycleScope("2.5")).toBe("current");
    expect(parseCycleScope("banana")).toBe("current");
  });

  test("serializes back to the URL form and labels the control", () => {
    expect(serializeCycleScope("current")).toBe("current");
    expect(serializeCycleScope("all")).toBe("all");
    expect(serializeCycleScope(3)).toBe("3");
    expect(cycleScopeLabel("current")).toBe("Current cycle");
    expect(cycleScopeLabel(2)).toBe("Cycle #2");
    expect(cycleScopeLabel("all")).toBe("All cycles");
  });
});

describe("which pages are cycle-based", () => {
  test("the three assessment pages are fully scoped", () => {
    for (const path of [
      "/facilities/state-assessment",
      "/facilities/certification",
      "/facilities/recertification",
    ]) {
      expect(cyclePageScope(path).mode).toBe("full");
    }
  });

  test("mixed pages say so and still offer All cycles where a list can show it", () => {
    expect(cyclePageScope("/facilities").mode).toBe("partial");
    expect(cyclePageScope("/facilities").allowAll).toBe(true);
    expect(cyclePageScope("/dashboard").mode).toBe("partial");
    expect(cyclePageScope("/dashboard").allowAll).toBe(false);
    expect(cyclePageScope("/reports").mode).toBe("partial");
    expect(cyclePageScope("/facilities/f1").mode).toBe("partial");
    expect(cyclePageScope("/custom-report").mode).toBe("partial");
  });

  test("non-cycle pages get no cycle control at all (mode none)", () => {
    // The redesign moved the control out of the header and made it appear
    // ONLY inside the filters of cycle-based pages — a non-cycle page shows
    // nothing, rather than a greyed-out control.
    for (const path of [
      "/facilities/internal-assessment",
      "/facilities/fund",
      "/facilities/building",
      "/facilities/fire-noc",
      "/bulk-import",
      "/saqsham-import",
      "/ia-import",
      "/admin",
      "/profile",
    ]) {
      const page = cyclePageScope(path);
      expect(page.mode).toBe("none");
      expect(page.allowAll).toBe(false);
      expect(page.note).toContain("not cycle-based");
    }
  });
});

describe("cycle resolution", () => {
  const cycles = [
    { cycleNumber: 1, superseded: true },
    { cycleNumber: 2, superseded: false },
  ];

  test("current follows the stored pointer, then the active cycle", () => {
    expect(scopedCycleNumber("current", { currentCycleNumber: 1 }, cycles)).toBe(1);
    expect(scopedCycleNumber("current", { currentCycleNumber: 0 }, cycles)).toBe(2);
    expect(scopedCycleNumber("current", { currentCycleNumber: null }, cycles)).toBe(2);
    expect(scopedCycleNumber("current", {}, [])).toBeNull();
  });

  test("a number is only valid when the facility HAS that cycle", () => {
    expect(scopedCycleNumber(1, {}, cycles)).toBe(1);
    expect(scopedCycleNumber(9, {}, cycles)).toBeNull();
  });

  test("all cycles is not a single number", () => {
    expect(scopedCycleNumber("all", {}, cycles)).toBeNull();
  });
});

describe("the redesigned cycle menu labels", () => {
  test("trigger short labels — never 'Cycle: Cycle #2'", () => {
    expect(cycleShortLabel("current")).toBe("Current");
    expect(cycleShortLabel(1)).toBe("Cycle #1");
    expect(cycleShortLabel("all")).toBe("All cycles");
  });

  test("option labels name the cycle type", () => {
    expect(cycleOptionLabel("current")).toBe("Current cycle");
    expect(cycleOptionLabel(1, "Initial")).toBe("Cycle #1 Initial");
    expect(cycleOptionLabel(2, "Recertification")).toBe("Cycle #2 Recertification");
    expect(cycleOptionLabel("all")).toBe("All cycles");
  });

  test("each option explains itself", () => {
    expect(cycleOptionDescription("current")).toContain("latest open cycle");
    expect(cycleOptionDescription("all")).toContain("list pages only");
    expect(cycleOptionDescription(2)).toContain("Only this cycle");
  });

  test("the 'applies to' note names the affected and unaffected pages", () => {
    expect(CYCLE_APPLIES_TO).toContain("State Assessment");
    expect(CYCLE_APPLIES_TO).toContain("Documents");
    expect(CYCLE_APPLIES_TO).toContain("Internal Assessment, Gap Closure, Building and Fire NOC are not affected");
  });

  test("the summary report is cycle-based; IA / funds / building / NOC are not", () => {
    expect(cyclePageScope("/summary-report").mode).toBe("partial");
    expect(cyclePageScope("/summary-report").allowAll).toBe(false);
    expect(cyclePageScope("/facilities/fund").mode).toBe("none");
    expect(cyclePageScope("/facilities/building").mode).toBe("none");
    expect(cyclePageScope("/facilities/internal-assessment").mode).toBe("none");
    expect(cyclePageScope("/facilities/fire-noc").mode).toBe("none");
  });
});
