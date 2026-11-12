import { describe, expect, test } from "bun:test";

import {
  isUsableTextLayer,
  linesFromWords,
  type OcrWord,
} from "../src/lib/resultTextLayout";

describe("image-only PDF fallback", () => {
  test("an empty or near-empty text layer is rejected so OCR runs", () => {
    expect(isUsableTextLayer("")).toBe(false);
    expect(isUsableTextLayer("   \n\f  ")).toBe(false);
    expect(isUsableTextLayer("Page 1")).toBe(false);
    expect(
      isUsableTextLayer(
        "A scanned page has no embedded sentence, only a page number 28.",
      ),
    ).toBe(false);
  });

  test("a real NQAS text layer is accepted and skips OCR", () => {
    expect(
      isUsableTextLayer(
        "National Quality Assurance Standards — AAM-SHC Agaram. " +
          "Assessment summary, Annexure I, criteria met and service package scores.",
      ),
    ).toBe(true);
  });

  test("word boxes rebuild table rows and preserve wide column gaps", () => {
    const word = (text: string, x0: number, y0: number, x1: number): OcrWord => ({
      text,
      x0,
      y0,
      x1,
      y1: y0 + 12,
      confidence: 91,
    });
    const lines = linesFromWords([
      word("Facility", 40, 20, 110),
      word("Score", 420, 21, 470),
      word("AAM-SHC", 40, 52, 120),
      word("Agaram", 128, 51, 180),
      word("91.28%", 420, 53, 480),
    ]);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Facility");
    expect(lines[0]).toContain("Score");
    expect(lines[1]).toContain("AAM-SHC Agaram");
    expect(lines[1]).toContain("91.28%");
    // A table gap must stay a gap; flattening to one space loses cell boundaries.
    expect(lines[1]!.indexOf("91.28%") - lines[1]!.indexOf("Agaram")).toBeGreaterThan(5);
  });
});
