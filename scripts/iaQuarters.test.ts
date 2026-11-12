/**
 * PART G — quarter labels and the quarter-over-quarter comparison.
 *
 * Root cause this pins: the labels used to be derived from the CALENDAR
 * current quarter (October 2026 → "Q3") whenever the index had no period for a
 * facility, so the stored Q1 row was printed under "Q2" and the stored Q2 row
 * under "Q3", and the comparison read a quarter that did not exist (hence "-").
 *
 * The contract now: quarters come ONLY from stored rows. The pair is the
 * latest reported quarter and the one before it, the labels name those exact
 * quarters, and the change is latest − previous at SCORE_DECIMALS.
 */

import { describe, expect, test } from "bun:test";
import {
  attachIaExtras,
  buildIaMasterIndex,
  facilityIaPair,
  iaCompareOf,
  iaPairFor,
  withLegacyIa,
  type IaMasterIndex,
} from "../src/lib/iaMaster";
import { formatFyQuarter } from "../src/lib/iaImport";
import { withIaPeriodLabels } from "../src/lib/masterColumns";

const row = (
  facilityId: string,
  quarter: number,
  nqas: number | null,
  kayakalp: number | null,
) =>
  ({
    facilityId,
    fy: "2026-27",
    quarter,
    nqasIaScore: nqas,
    kayakalpIaScore: kayakalp,
    ecoFriendlyScore: null,
    nqasRemark: null,
    kayakalpRemark: null,
    ecoRemark: null,
    lockedAt: null,
    updatedAt: 0,
  }) as never;

/** Kavalurchatram: Q1 NQAS 93.3 / Kayakalp 93.4, Q2 NQAS 93.34 / Kayakalp 92.9. */
function kavalurchatram(): IaMasterIndex {
  return buildIaMasterIndex([
    row("f1", 1, 93.3, 93.4),
    row("f1", 2, 93.34, 92.9),
  ]);
}

describe("Part G — the pair comes from stored data only", () => {
  test("latest = Q2 2026-27, previous = Q1 2026-27 (never a calendar guess)", () => {
    const pair = facilityIaPair(kavalurchatram(), "f1");
    expect(pair).not.toBeNull();
    expect(formatFyQuarter(pair!.current.fy, pair!.current.q)).toBe("Q2 2026-27");
    expect(formatFyQuarter(pair!.previous.fy, pair!.previous.q)).toBe("Q1 2026-27");
  });

  test("a cursor on a quarter with no rows never produces that quarter's label", () => {
    const pair = iaPairFor("2026-27:3", kavalurchatram(), "2026-10-24");
    expect(formatFyQuarter(pair!.current.fy, pair!.current.q)).toBe("Q2 2026-27");
    expect(formatFyQuarter(pair!.previous.fy, pair!.previous.q)).toBe("Q1 2026-27");
  });

  test("no stored quarter → no pair at all (the UI shows '-' with a reason)", () => {
    expect(facilityIaPair(buildIaMasterIndex([]), "f1")).toBeNull();
  });
});

describe("Part G — column labels name the real quarter", () => {
  test("slot Q1 renders the previous period and slot Q2 the current one", () => {
    const pair = facilityIaPair(kavalurchatram(), "f1")!;
    const labels = withIaPeriodLabels(
      {
        nqasIaQ1: "NQAS IA % (Q1)",
        nqasIaQ2: "NQAS IA % (Q2)",
        kayakalpIaQ1: "Kayakalp IA % (Q1)",
        kayakalpIaQ2: "Kayakalp IA % (Q2)",
      },
      pair,
    );
    expect(labels.nqasIaQ1).toBe("NQAS IA % · Q1 2026-27");
    expect(labels.nqasIaQ2).toBe("NQAS IA % · Q2 2026-27");
    expect(labels.kayakalpIaQ2).toBe("Kayakalp IA % · Q2 2026-27");
    // No column ever claims Q3 2026-27 for data that stops at Q2.
    expect(Object.values(labels).join(" ")).not.toContain("Q3 2026-27");
  });
});

describe("Part G — the comparison", () => {
  test("NQAS 93.3 → 93.34 is ▲ +0.04 at two decimals", () => {
    const index = kavalurchatram();
    const pair = facilityIaPair(index, "f1")!;
    const r = attachIaExtras("f1", index, pair);
    expect(iaCompareOf(r, "nqas")).toBe(0.04);
  });

  test("Kayakalp 93.4 → 92.9 is ▼ −0.50", () => {
    const index = kavalurchatram();
    const pair = facilityIaPair(index, "f1")!;
    const r = attachIaExtras("f1", index, pair);
    expect(iaCompareOf(r, "kayakalp")).toBe(-0.5);
  });

  test("a facility with one quarter has no comparison (null, not 0)", () => {
    const index = buildIaMasterIndex([row("f2", 1, 88.1, null)]);
    const pair = facilityIaPair(index, "f2")!;
    const r = attachIaExtras("f2", index, pair);
    expect(iaCompareOf(r, "nqas")).toBeNull();
  });

  test("a blank tracker on either side is null, never 0", () => {
    const index = buildIaMasterIndex([
      row("f3", 1, null, 90),
      row("f3", 2, 91, null),
    ]);
    const pair = facilityIaPair(index, "f3")!;
    const r = attachIaExtras("f3", index, pair);
    expect(iaCompareOf(r, "nqas")).toBeNull();
    expect(iaCompareOf(r, "kayakalp")).toBeNull();
  });
});

describe("Part G — legacy columns are real 2026-27 Q1/Q2 rows", () => {
  test("facility Ia Q1/Q2 columns fill the index instead of a calendar guess", () => {
    const index = withLegacyIa(new Map(), [
      { id: "f4", nqasIaQ1: 70, nqasIaQ2: 80, kayakalpIaQ1: null, kayakalpIaQ2: null },
    ]);
    const pair = facilityIaPair(index, "f4")!;
    expect(formatFyQuarter(pair.current.fy, pair.current.q)).toBe("Q2 2026-27");
    expect(formatFyQuarter(pair.previous.fy, pair.previous.q)).toBe("Q1 2026-27");
  });
});
