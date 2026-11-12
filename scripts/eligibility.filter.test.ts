import { describe, expect, test } from "bun:test";
import {
  buildEligibilityOptions,
  eligibilityFilterMatches,
} from "../src/lib/eligibility";

describe("linelist multi-select eligibility filter", () => {
  test('"all" keeps every row (no filter active)', () => {
    expect(eligibilityFilterMatches("Eligible", "all")).toBe(true);
    expect(eligibilityFilterMatches("Not Eligible", "all")).toBe(true);
    expect(eligibilityFilterMatches(null, "all")).toBe(true);
    expect(eligibilityFilterMatches(undefined, "all")).toBe(true);
  });

  test("an empty selection behaves like \"all\" — deselect-all never hides rows", () => {
    expect(eligibilityFilterMatches("Eligible", [])).toBe(true);
    expect(eligibilityFilterMatches(null, [])).toBe(true);
  });

  test("a selection keeps only the picked values", () => {
    const pick = ["Eligible", "Possible"];
    expect(eligibilityFilterMatches("Eligible", pick)).toBe(true);
    expect(eligibilityFilterMatches("Possible", pick)).toBe(true);
    expect(eligibilityFilterMatches("Not Eligible", pick)).toBe(false);
  });

  test("null/unknown eligibility never matches a concrete selection", () => {
    expect(eligibilityFilterMatches(null, ["Eligible"])).toBe(false);
    expect(eligibilityFilterMatches("", ["Eligible"])).toBe(false);
    expect(eligibilityFilterMatches("Something Else", ["Eligible"])).toBe(false);
  });

  test("multi-select values are the canonical stored values, not labels", () => {
    // Admin renamed the label — the stored value must still filter correctly.
    const options = buildEligibilityOptions(["In-Eligible", "Future Candidate"]);
    const values = options.map((o) => o.value);
    expect(values).toEqual(["Not Eligible", "Possible"]);
    expect(eligibilityFilterMatches("Not Eligible", values)).toBe(true);
    expect(eligibilityFilterMatches("Eligible", values)).toBe(false);
  });
});
