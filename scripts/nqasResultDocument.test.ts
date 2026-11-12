import { describe, expect, it } from "bun:test";

import { hasCurrentNqasResultDocument } from "../src/lib/nqasResultDocument";

describe("NQAS Result document linking", () => {
  it("recognises the current result for the assessment cycle", () => {
    expect(
      hasCurrentNqasResultDocument(
        [{ docKey: "NQAS_Result", cycleNo: 2, isCurrent: true }],
        2,
      ),
    ).toBe(true);
  });

  it("recognises the legacy NQAS_Certificate key as the same document", () => {
    expect(
      hasCurrentNqasResultDocument(
        [{ docKey: "NQAS_Certificate", cycleNo: 1, isCurrent: true }],
        1,
      ),
    ).toBe(true);
  });

  it("does not accept another cycle's result, a removed file, or an old version", () => {
    expect(
      hasCurrentNqasResultDocument(
        [{ docKey: "NQAS_Result", cycleNo: 1, isCurrent: true }],
        2,
      ),
    ).toBe(false);
    expect(
      hasCurrentNqasResultDocument(
        [{ docKey: "NQAS_Result", cycleNo: 2, isCurrent: true, removedAt: 10 }],
        2,
      ),
    ).toBe(false);
    expect(
      hasCurrentNqasResultDocument(
        [{ docKey: "NQAS_Result", cycleNo: 2, isCurrent: false }],
        2,
      ),
    ).toBe(false);
  });

  it("honours a facility-scoped document rule", () => {
    const rows = [{ docKey: "NQAS_Result", cycleNo: 1, isCurrent: true }];
    expect(hasCurrentNqasResultDocument(rows, 3, "facility")).toBe(true);
    expect(hasCurrentNqasResultDocument(rows, 3, "cycle")).toBe(false);
  });
});
