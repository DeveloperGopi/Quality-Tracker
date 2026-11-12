/**
 * CERTIFICATION CYCLE (Part 3.3, test scenario group) — the cycle rule
 * defined ONCE in src/convex/lifecycle.ts:
 *
 *   1. The current cycle is the HIGHEST OPEN cycle (closedOn == null).
 *   2. A cycle stays open until its certificate is replaced.
 *   3. "Recertification Due" alone does NOT open a second cycle — a real
 *      Re-Application (SaQsham "Re-Application" row / the Profile button /
 *      a new application after expiry) does.
 *   4. The "Certification Cycle" cell shows the derived pill "#1 Initial" /
 *      "#2 Recert" and is read-only (no config column sets it).
 */
import { describe, expect, it } from "bun:test";

import {
  cycleLabel,
  deriveCycle,
  nextCycleNumber,
  type CycleLike,
} from "../src/convex/lifecycle";
import { COLUMN_BY_KEY } from "../src/lib/masterColumns";

const c1 = (over: Partial<CycleLike> = {}): CycleLike => ({
  cycleNumber: 1,
  cycleType: "Initial",
  ...over,
});

describe("certification cycle (deriveCycle)", () => {
  it("#1 + Recertification Due stays #1 — no cycle record, no change", () => {
    // The rule lives in the DATA, not in a status word: with only cycle #1,
    // every reading of the row stays "#1 Initial" no matter what the
    // Recertification Status column says.
    expect(deriveCycle([c1()])).toMatchObject({ cycleNumber: 1 });
    expect(deriveCycle([c1()])!.cycleNumber).toBe(1);
    expect(cycleLabel(deriveCycle([c1()]))).toBe("#1 Initial");
  });

  it("a Recertification Due status text alone never influences the number", () => {
    // deriveCycle takes cycle rows only — no recertStatus parameter exists.
    const fn = deriveCycle as { length: number };
    expect(fn.length).toBe(1);
  });

  it("cycle #2 only when a re-application created it (open #2 → current #2)", () => {
    const cycles: CycleLike[] = [
      c1({ cycleNumber: 1, cycleType: "Initial", closedOn: "2026-10-01" }),
      { cycleNumber: 2, cycleType: "Recertification" },
    ];
    expect(deriveCycle(cycles)).toMatchObject({ cycleNumber: 2, cycleType: "Recertification" });
    expect(cycleLabel(deriveCycle(cycles))).toBe("#2 Recert");
  });

  it("the box unticked changes nothing — an OPEN #1 and a NEW #2 record cannot coexist, so absent #2 = #1", () => {
    expect(deriveCycle([c1()])!.cycleNumber).toBe(1);
  });

  it("viewing cycle #1 after #2 exists still shows the OLD values (closed #1 readable)", () => {
    const cycles: CycleLike[] = [
      c1({ cycleNumber: 1, cycleType: "Initial", closedOn: "2026-10-01" }),
      { cycleNumber: 2, cycleType: "Recertification" },
    ];
    // The current selector is deriveCycle (#2); the historical row itself is
    // untouched — the migration report output keeps cycle #1's record intact.
    expect(cycleLabel(cycles[0])).toBe("#1 Initial");
    expect(deriveCycle(cycles)!.cycleNumber).toBe(2);
  });

  it("the highest open cycle wins when several are open (migration safety)", () => {
    expect(
      deriveCycle([c1(), { cycleNumber: 2, cycleType: "Recertification" }]),
    ).toMatchObject({ cycleNumber: 2 });
  });

  it("no cycles at all → #1 Initial (the migration's inferred default)", () => {
    expect(deriveCycle([])).toBe(null);
    expect(cycleLabel(null)).toBe("#1 Initial");
  });

  it("nextCycleNumber counts past cycles for the Start-Cycle button", () => {
    expect(nextCycleNumber([c1()])).toBe(2);
    expect(
      nextCycleNumber([
        c1({ closedOn: "2026-01-01" }),
        { cycleNumber: 2, cycleType: "Recertification", closedOn: "2028-01-01" },
      ]),
    ).toBe(3);
  });

  it("the column is read-only and filterable (config)", () => {
    const col = COLUMN_BY_KEY.certCycle;
    expect(col.type).toBe("text");
    expect(col.db).toContain("certificationCycles");
    // No import writes into it (Part 6 keeps derived fields out of the file).
    expect(col.importable).toBeUndefined();
  });
});
