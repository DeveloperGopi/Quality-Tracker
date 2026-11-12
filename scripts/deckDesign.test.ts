/**
 * DECK THEME + DENSITY — the regression guard for the bug where the Design
 * selects only changed the on-screen preview.
 *
 * Both downloads are built here and inspected in their real bytes:
 *   • PPTX: unzip the file and read each slide's background / colours / font
 *     sizes from the OOXML.
 *   • PDF: inflate jsPDF's content streams and read the fill-colour and Tf
 *     operators the vector renderer actually painted.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import zlib from "node:zlib";
import JSZip from "jszip";
import { buildDeckModel } from "../src/lib/deckModel";
import { buildDeckPptxFromModel } from "../src/lib/deckRender";
import { buildDeckPdf } from "../src/lib/deckPdf";
import type { DeckRow } from "../src/lib/deck";

const row: DeckRow = {
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
};

const model = buildDeckModel([row], { district: "Test District" });
const outDir = mkdtempSync(join(tmpdir(), "deck-design-"));
afterAll(() => rmSync(outDir, { recursive: true, force: true }));

/** Slide background colour as stored in presentation.xml / slideN.xml. */
async function pptxSlide(
  name: string,
  options: { theme?: "light" | "dark-cover" | "high-contrast"; density?: "comfortable" | "compact" },
  slide: number,
) {
  const file = join(outDir, `${name}.pptx`);
  await buildDeckPptxFromModel(model, file, options);
  const zip = await JSZip.loadAsync(readFileSync(file));
  const xml = await zip.file(`ppt/slides/slide${slide}.xml`)!.async("string");
  const bg = /<p:bg>.*?val="([0-9A-F]{6})"/.exec(xml)?.[1] ?? null;
  const sizes = [...xml.matchAll(/sz="(\d+)"/g)].map((m) => Number(m[1]));
  return { xml, bg, sizes, colors: [...new Set([...xml.matchAll(/srgbClr val="([0-9A-F]{6})"/g)].map((m) => m[1]))] };
}

async function pdfContent(name: string, options: { theme?: "light" | "high-contrast"; density?: "comfortable" | "compact" }) {
  const file = join(outDir, `${name}.pdf`);
  await buildDeckPdf(model, { fileName: file, ...options });
  const buf = readFileSync(file);
  const latin = buf.toString("latin1");
  const chunks: string[] = [];
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(latin))) {
    const start = m.index + m[0].length;
    const end = latin.indexOf("endstream", start);
    try {
      chunks.push(zlib.inflateSync(buf.subarray(start, end)).toString("latin1"));
    } catch {
      /* image or metadata stream */
    }
  }
  const all = chunks.join("\n");
  return {
    all,
    fontSizes: [...all.matchAll(/\/(F\d+) ([\d.]+) Tf/g)].map((x) => Number(x[2])),
  };
}

describe("deck downloads honour the Theme select", () => {
  test("light: every slide is white paper, including the cover", async () => {
    const cover = await pptxSlide("theme-light", { theme: "light" }, 1);
    const content = await pptxSlide("theme-light", { theme: "light" }, 2);
    expect(cover.bg).toBe("FFFFFF");
    expect(content.bg).toBe("FFFFFF");
    // The light palette's ink, not pure black.
    expect(content.colors).toContain("12302E");
  });

  test("dark-cover: the cover is dark and the content stays white", async () => {
    const cover = await pptxSlide("theme-dark", { theme: "dark-cover" }, 1);
    const content = await pptxSlide("theme-dark", { theme: "dark-cover" }, 2);
    expect(cover.bg).toBe("0B3B3B");
    expect(content.bg).toBe("FFFFFF");
  });

  test("high-contrast: black and white reach the PPTX and the PDF", async () => {
    const cover = await pptxSlide("theme-contrast", { theme: "high-contrast" }, 1);
    const content = await pptxSlide("theme-contrast", { theme: "high-contrast" }, 2);
    expect(cover.bg).toBe("000000");
    expect(content.bg).toBe("FFFFFF");
    expect(content.colors).toContain("000000");
    expect(content.colors).toContain("FFFFFF");

    const pdf = await pdfContent("theme-contrast", { theme: "high-contrast" });
    // jsPDF writes pure black as `0. g` and pure white as `1. g`.
    expect(pdf.all).toContain("0. g");
    expect(pdf.all).toContain("1. g");
    // The normal ink (#12302E) must not leak into the high-contrast page.
    expect(pdf.all).not.toContain("0.071 0.188 0.18");

    const lightPdf = await pdfContent("theme-light", { theme: "light" });
    expect(lightPdf.all).toContain("0.071 0.188 0.18");
  });
});

describe("deck downloads honour the Density select", () => {
  test("compact shrinks the PPTX type scale", async () => {
    const comfy = await pptxSlide("density-comfortable", { density: "comfortable" }, 1);
    const compact = await pptxSlide("density-compact", { density: "compact" }, 1);
    expect(Math.max(...comfy.sizes)).toBeGreaterThan(Math.max(...compact.sizes));
    // The cover title is 40 pt comfortable, 36 pt compact.
    expect(comfy.sizes).toContain(4000);
    expect(compact.sizes).toContain(3600);
  });

  test("compact shrinks the PDF type scale", async () => {
    const comfy = await pdfContent("pdf-comfortable", { density: "comfortable" });
    const compact = await pdfContent("pdf-compact", { density: "compact" });
    expect(Math.max(...comfy.fontSizes)).toBeGreaterThan(Math.max(...compact.fontSizes));
    expect(comfy.fontSizes).toContain(40);
    expect(compact.fontSizes).toContain(36);
  });
});
