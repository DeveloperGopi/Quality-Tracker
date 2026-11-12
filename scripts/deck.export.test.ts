import { afterAll, describe, expect, test } from "bun:test";
import {
  existsSync,
  readFileSync,
  rmSync,
  statSync,
  mkdtempSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { multiFilterMatches } from "../src/lib/multiFilter";
import { buildDeckPdf, buildDeckPptx } from "../src/lib/deckRender";
import type { DeckRow } from "../src/lib/deck";

describe("multi-select filter predicate (all pages)", () => {
  test('"all" matches everything', () => {
    expect(multiFilterMatches("A", "all")).toBe(true);
    expect(multiFilterMatches(null, "all")).toBe(true);
    expect(multiFilterMatches(undefined, "all")).toBe(true);
  });

  test("empty selection clears the filter — deselect-all never hides rows", () => {
    expect(multiFilterMatches("A", [])).toBe(true);
    expect(multiFilterMatches(null, [])).toBe(true);
  });

  test("a selection keeps only picked values; missing values never match", () => {
    expect(multiFilterMatches("A", ["A", "B"])).toBe(true);
    expect(multiFilterMatches("C", ["A", "B"])).toBe(false);
    expect(multiFilterMatches("", ["A"])).toBe(false);
    expect(multiFilterMatches(null, ["A"])).toBe(false);
    expect(multiFilterMatches(undefined, ["A"])).toBe(false);
  });
});

/* Minimal deck row — enough for every slide builder to run. */
const row = {
  facility: "Test CHC",
  type: "CHC",
  block: "BlockA",
  phc: "PHC-1",
  eligibility: "Eligible",
  currentStatus: "Certified — Surveillance Due",
  certStatus: "Quality Certified",
  naStatus: null,
  certDate: "2025-06-12",
  certScore: 82.5,
  naScheduledDate: null,
  saStatus: "Completed",
  generalDocStatus: null,
  naMode: "Physical",
  saScore: 78,
  buildingStatus: "Good",
  buildingType: "Own Building",
  fireNocStatus: "Valid",
  fireNocExpiry: "2026-12-31",
  nqasIaQ1: 70,
  nqasIaQ2: 75,
  kayakalpIaQ1: 65,
  kayakalpIaQ2: 68,
  surveillanceDue1: "2026-06-12",
  surveillanceDone1: null,
  surveillanceDue2: null,
  surveillanceDone2: null,
  validityDate: "2028-06-12",
  gapClosureAmount: 5,
  gcFundYear: "2025-26",
} as DeckRow;

const outDir = mkdtempSync(join(tmpdir(), "deck-export-"));
afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe("deck exports (NQAS Summary Report / Generate PPT)", () => {
  // Regression: the fire-NOC doughnut used the [{ name, value }] shorthand,
  // which crashed pptxgenjs' writer at data[0].labels.length — every PPTX
  // export failed. Building a real file here exercises the chart path.
  test("buildDeckPptx produces a non-trivial .pptx", async () => {
    const file = join(outDir, "deck.pptx");
    await buildDeckPptx([row], "Test District", file);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeGreaterThan(10_000);
  });

  // Regression: the deck draws on a 13.33in × 7.5in canvas but declared
  // pptxgenjs' LAYOUT_16x9 (10in × 5.625in), so the right edge and the
  // bottom of every slide spilled off the slide and the content overflowed.
  test("buildDeckPptx declares a slide large enough for its own layout", async () => {
    const file = join(outDir, "deck-size.pptx");
    await buildDeckPptx([row], "Test District", file);
    const zip = await JSZip.loadAsync(readFileSync(file));
    const entry = zip.file("ppt/presentation.xml");
    expect(entry).not.toBeNull();
    const xml = await entry!.async("string");
    const cx = Number(/<p:sldSz[^>]*\bcx="(\d+)"/.exec(xml)?.[1]);
    const cy = Number(/<p:sldSz[^>]*\bcy="(\d+)"/.exec(xml)?.[1]);
    // 914400 EMU per inch. Slides are laid out for 13.33in × 7.5in.
    expect(cx).toBeGreaterThanOrEqual(Math.round(13.3 * 914400));
    expect(cy).toBeGreaterThanOrEqual(Math.round(7.4 * 914400));
  });

  test("buildDeckPdf produces a non-trivial .pdf with an embedded font", async () => {
    const file = join(outDir, "deck.pdf");
    await buildDeckPdf([row], "Test District", file, undefined, [
      "1 facility has no NQAS assessment entry: Test CHC",
    ]);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeGreaterThan(10_000);
    // The old renderer used jsPDF's built-in Helvetica, which cannot paint
    // ₹ / arrows. The new deck embeds Noto Sans as a TrueType font stream.
    const bytes = readFileSync(file).toString("latin1");
    expect(bytes).toContain("NotoSans");
    expect(bytes).toContain("FontFile2");
  });
});
