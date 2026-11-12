/**
 * GOLDEN TESTS for the deck model (Parts 1–3 of the deck brief).
 *
 * Each test pins one rule that used to be wrong in the hand-drawn deck:
 * certified headline vs stage, fiscal-year buckets, monthly column sums,
 * the "No date" row, the state-assessment stacked bar, building buckets,
 * Fire NOC buckets, exact rupees, guarded action titles, the data-check
 * stamp, hidden slides and the embedded-font glyph guard.
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import {
  buildDeckModel,
  computeDeckChecks,
  type DeckSlide,
  type SlideBlock,
} from "../src/lib/deckModel";
import { buildDeckPdf, visibleSlides } from "../src/lib/deckPdf";
import { buildDeckPptxFromModel } from "../src/lib/deckRender";
import { missingGlyphs, readTtfCoverage } from "../src/lib/pdfFonts";
import { buildDeckData, type DeckRow } from "../src/lib/deck";

const TODAY = "2026-10-24";

const row = (over: Partial<DeckRow> & { facility: string }): DeckRow => ({
  type: "PHC",
  block: "BlockA",
  phc: "PHC-1",
  eligibility: "Eligible",
  currentStatus: "Certified — On track",
  certStatus: "Quality Certified",
  naStatus: "Completed",
  certDate: "2025-08-18",
  certScore: 89,
  naScheduledDate: null,
  saStatus: "Completed",
  generalDocStatus: "Result Declared",
  naMode: "Physical",
  saScore: 80,
  buildingStatus: "Good",
  buildingType: "Own Building",
  fireNocStatus: "Valid",
  fireNocExpiry: "2029-01-01",
  nqasIaQ1: 70,
  nqasIaQ2: 75,
  kayakalpIaQ1: 65,
  kayakalpIaQ2: 68,
  surveillanceDue1: "2026-08-18",
  surveillanceDone1: null,
  surveillanceDue2: "2027-08-18",
  surveillanceDone2: null,
  validityDate: "2028-08-18",
  gapClosureAmount: null,
  gcFundYear: null,
  ...over,
});

const rows: DeckRow[] = [
  row({ facility: "Alpha", gapClosureAmount: 790000, gcFundYear: "2025-26" }),
  row({
    facility: "Beta",
    certStatus: "Quality Certified with Conditionality",
    certDate: "2026-05-10",
    block: "BlockB",
    type: "HWC HSC",
    buildingStatus: "Dilapidated",
    fireNocExpiry: "2025-01-01",
    surveillanceDone1: "2026-08-17",
  }),
  row({
    facility: "Gamma",
    certDate: null,
    validityDate: null,
    fireNocStatus: null,
    fireNocExpiry: null,
    buildingStatus: null,
  }),
  row({
    facility: "Delta",
    certStatus: null,
    certDate: null,
    validityDate: null,
    currentStatus: "Not Yet Initiated",
    saStatus: null,
    naStatus: null,
    fireNocExpiry: null,
    fireNocStatus: null,
    buildingStatus: null,
    nqasIaQ1: null,
    nqasIaQ2: null,
  }),
  row({
    facility: "Epsilon",
    certStatus: null,
    certDate: null,
    validityDate: null,
    currentStatus: "SA Scheduled",
    saStatus: "Completed",
    naStatus: null,
    fireNocExpiry: null,
    fireNocStatus: null,
    buildingStatus: "Good",
  }),
];

const model = buildDeckModel(rows, { today: TODAY, district: "Test District" });

const slide = (id: string) => model.slides.find((s) => s.id === id) as DeckSlide;
const blocks = (id: string): SlideBlock[] => slide(id).columns.flat();

describe("deck model — certified headline vs stage", () => {
  test("hold a certificate is the superset of the Certified stage", () => {
    expect(model.meta.holdCertificate).toBe(3);
    expect(model.meta.certifiedStage).toBe(3);
    expect(model.data.reconciliationLine).toContain("3 hold a certificate");
    expect(slide("title").hero?.value).toBe("3");
    // Stage bars sum to the facility count, never to the certified count.
    const status = blocks("where").find((b) => b.kind === "bars");
    expect(status?.kind).toBe("bars");
    if (status?.kind === "bars")
      expect(status.items.reduce((a, b) => a + b.value, 0)).toBe(rows.length);
  });

  test("definitions and the reconciliation are generated, never typed", () => {
    const defs = blocks("defs").find((b) => b.kind === "defs");
    expect(defs?.kind).toBe("defs");
    if (defs?.kind !== "defs") return;
    const hold = defs.items.find((d) => d.term === "Hold a certificate");
    expect(hold?.definition).toContain(`${model.meta.holdCertificate} today`);
    // A second facility flips every dependent number with no code edit.
    const more = buildDeckModel([...rows, row({ facility: "Zeta" })], { today: TODAY });
    const defs2 = more.slides
      .find((s) => s.id === "defs")!
      .columns.flat()
      .find((b) => b.kind === "defs");
    if (defs2?.kind === "defs")
      expect(defs2.items.find((d) => d.term === "Hold a certificate")?.definition).toContain(
        `${more.meta.holdCertificate} today`,
      );
    expect(hold?.definition).not.toContain("74 today");
  });
});

describe("deck model — fiscal years", () => {
  test("April–March buckets, with Earlier and No date summing to the headline", () => {
    // 2025-08-18 → FY 2025-26; 2026-05-10 → FY 2026-27; Gamma has no date.
    const by = (label: string) => model.periodRows.find((r) => r.label === label)?.total;
    expect(by("2026-27")).toBe(1);
    expect(by("2025-26")).toBe(1);
    expect(model.periodUndated.total).toBe(1);
    const sum =
      model.periodRows.reduce((a, b) => a + b.total, 0) + model.periodUndated.total;
    expect(sum).toBe(model.meta.holdCertificate);
    expect(slide("byYear").subtitle).toContain("April to March");
  });

  test("calendar mode relabels the same cohorts", () => {
    const cal = buildDeckModel(rows, { today: TODAY, period: "calendar" });
    expect(cal.periodRows.some((r) => r.label === "2026")).toBe(true);
    expect(cal.periodRows.some((r) => r.label === "2025")).toBe(true);
    expect(cal.periodUndated.total).toBe(1);
  });

  test("a January certification belongs to the fiscal year that started last April", () => {
    const jan = buildDeckModel([row({ facility: "Jan", certDate: "2026-01-15" })], {
      today: TODAY,
    });
    expect(jan.periodRows.find((r) => r.label === "2025-26")?.total).toBe(1);
  });
});

describe("deck model — monthly tables and the No date row", () => {
  test("monthly columns are Quality | Conditional | Total and the total row is the column sums", () => {
    // Calendar mode: the two month tables are calendar-year slices and are
    // absent from a financial-year deck by design.
    const cal = buildDeckModel(rows, { today: TODAY, period: "calendar" });
    const yearSlide = cal.slides.find(
      (s) => s.id === "yearA" || s.id === "yearB",
    ) as DeckSlide;
    const table = yearSlide.columns.flat().find((b) => b.kind === "table");
    expect(table?.kind).toBe("table");
    if (table?.kind !== "table") return;
    expect(table.head).toEqual(["Month", "Quality", "Conditional", "Total"]);
    const body = table.rows.filter((r) => r[0] !== "Result not recorded");
    const sums = body.reduce(
      (acc, r) => [acc[0] + Number(r[1]), acc[1] + Number(r[2]), acc[2] + Number(r[3])],
      [0, 0, 0],
    );
    expect(table.totalRow).toEqual(["Total", String(sums[0]), String(sums[1]), String(sums[2])]);
    for (const r of body) expect(Number(r[1]) + Number(r[2])).toBe(Number(r[3]));
  });

  test("the by-year chart and table both carry an explicit No date row", () => {
    const bars = blocks("byYear").find((b) => b.kind === "bars");
    if (bars?.kind === "bars")
      expect(bars.items.some((i) => i.label === "No date" && i.value === 1)).toBe(true);
    const table = blocks("byYear").find((b) => b.kind === "table");
    if (table?.kind === "table") {
      expect(table.rows.some((r) => r[0] === "No date")).toBe(true);
      expect(table.totalRow?.[3]).toBe(String(model.meta.holdCertificate));
    }
  });
});

describe("deck model — state assessment, buildings and Fire NOC", () => {
  test("awaiting result is a subset of completed; one stacked bar sums to the total", () => {
    const stacked = blocks("pipeline").find((b) => b.kind === "stacked");
    expect(stacked?.kind).toBe("stacked");
    if (stacked?.kind !== "stacked") return;
    const sum = stacked.segments.reduce((a, s) => a + s.value, 0);
    expect(sum).toBe(rows.length);
    const awaiting = stacked.segments.find((s) => s.label === "Completed, awaiting result");
    const completed = stacked.segments.find((s) => s.label === "Completed, result issued");
    expect((awaiting?.value ?? 0) + (completed?.value ?? 0)).toBe(model.data.saCompleted);
    expect(slide("pipeline").title).toContain("state assessments completed");
  });

  test("the buildings headline reads the shared Good bucket", () => {
    const good =
      model.data.buildingBars.find((b) => b.label === "Good")?.count ?? 0;
    // Bob: Alpha Good, Beta Dilapidated, Gamma blank, Delta blank, Epsilon Good.
    expect(good).toBe(2);
    expect(slide("buildings").title).toBe(`${good} buildings are in good condition`);
    expect(model.data.buildingReconciles).toBe(true);
  });

  test("Fire NOC has five date-derived buckets that sum to the facility count", () => {
    const donut = blocks("buildings").find((b) => b.kind === "donut");
    expect(donut?.kind).toBe("donut");
    if (donut?.kind !== "donut") return;
    expect(donut.segments.map((s) => s.label)).toEqual([
      "Valid",
      "Expiring soon",
      "Expired",
      "Recorded, no validity date",
      "Not recorded",
    ]);
    expect(donut.segments.reduce((a, s) => a + s.value, 0)).toBe(rows.length);
    expect(model.data.fireNocRecordedSentence).toContain(
      `recorded for ${model.data.nocRecorded} of ${rows.length}`,
    );
  });
});

describe("deck model — money, wording and guards", () => {
  test("gap-closure money is exact Indian rupees, never lakh", () => {
    const moneyText = JSON.stringify(model.slides);
    expect(moneyText).toContain("₹ 7,90,000");
    expect(moneyText).not.toContain("lakh");
  });

  test("no typo and no doubled word in generated text", () => {
    const text = model.slides
      .map((s) => `${s.title} ${s.subtitle ?? ""} ${JSON.stringify(s.columns)} ${s.note ?? ""}`)
      .join(" ");
    expect(text).not.toContain("facilityies");
    expect(text).not.toMatch(/\b(\w+)\s+\1\b/i);
  });

  test("action titles come from guarded templates (no denominator, no sentence)", () => {
    const empty = buildDeckModel([], { today: TODAY });
    expect(empty.slides.length).toBeGreaterThan(0);
    expect(empty.slides.find((s) => s.id === "progress")?.title).toBe(
      "No block has facilities in scope",
    );
    expect(empty.slides.find((s) => s.id === "profile")?.title).toBe(
      "No facilities in scope",
    );
  });

  test("data checks use one definition each and reconcile", () => {
    const checks = computeDeckChecks(rows, buildDeckData(rows), TODAY);
    const noDate = checks.issues.find((i) => i.id === "certified-no-date");
    expect(noDate?.count).toBe(1);
    const resultNoDate = checks.issues.find((i) => i.id === "result-no-date");
    // Gamma has a result but no date; the certified-no-date list is a subset.
    expect(resultNoDate?.count).toBe(1);
    expect(checks.failed).toBe(0);
    expect(slide("checks").title).toContain("Data check");
    expect(slide("checks").dataCheck?.issues).toBe(checks.totalIssues);
  });

  test("a hidden slide is excluded from the export page count", async () => {
    const all = await buildDeckPdf(model, { fileName: "__return__" });
    const fewer = await buildDeckPdf(model, {
      fileName: "__return__",
      hidden: ["exec", "checks"],
    });
    expect(fewer.getNumberOfPages()).toBe(all.getNumberOfPages() - 2);
    expect(visibleSlides(model, ["exec"]).some((s) => s.id === "exec")).toBe(false);
  });
});

describe("deck model — fonts and glyphs", () => {
  const regular = readTtfCoverage(
    new Uint8Array(readFileSync("public/fonts/NotoSans-Regular.ttf")),
  );

  test("the embedded face covers the rupee sign and typographic marks", () => {
    expect(regular.has(0x20b9)).toBe(true); // ₹
    expect(missingGlyphs(["₹ 7,90,000 · 26-Oct-2026"], regular)).toEqual([]);
  });

  test("characters without a glyph are detected before drawing", () => {
    expect(missingGlyphs(["Progress → certified"], regular)).toEqual(["→"]);
    // The deck avoids such characters entirely (arrows are vector shapes).
    const text = model.slides.map((s) => JSON.stringify(s)).join("");
    expect(missingGlyphs([text], regular)).toEqual([]);
  });

  test("the export refuses a model that contains an uncoverable glyph", async () => {
    const bad = { ...model, slides: [{ ...slide("where"), title: "Certified → on track" }] };
    await expect(buildDeckPdf(bad, { fileName: "__return__" })).rejects.toThrow(
      /missing.*glyph/i,
    );
  });
});

describe("deck model — PPTX honours hidden slides", () => {
  const outDir = mkdtempSync(join(tmpdir(), "deck-hidden-"));
  test("slide count drops when a slide is hidden", async () => {
    const file = join(outDir, "hidden.pptx");
    await buildDeckPptxFromModel(model, file, { hidden: ["exec", "heatmap"] });
    expect(statSync(file).size).toBeGreaterThan(10_000);
    const zip = await JSZip.loadAsync(readFileSync(file));
    const count = Object.keys(zip.files).filter((f) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(f),
    ).length;
    expect(count).toBe(model.slides.length - 2);
    rmSync(outDir, { recursive: true, force: true });
  });
});
