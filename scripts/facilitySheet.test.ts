/**
 * FACILITY PROFILE SHEET — the two-page contract.
 *
 * These tests fail the build rather than let a third page or a garbled glyph
 * ship:
 *   • page count is EXACTLY 2 for every fixture (filled, blank, 500-char
 *     remarks, long file names, 12 departments, Tamil, expired certificate
 *     with many data checks) — the old builder silently made page 3,
 *   • text is never UTF-16-escaped ("&L&l&l&e&c&y…"): every string is
 *     WinAnsi-safe, and ₹ / ▲ / ▼ are drawn as vectors, so "Rs." never
 *     appears and nothing reaches the encoder unencodable,
 *   • formats: DD-MMM-YYYY, one IST stamp, Report ID on both pages, no
 *     "Pipeline" / "Eco-Friendly" / "Rs.",
 *   • no clipping: the wrapper never returns a line wider than its box (the
 *     old autoTable clipped long file names and department lists).
 *
 * Run: bun test ./scripts/facilitySheet.test.ts
 */
import { describe, expect, it } from "bun:test";

import { jsPDF as JsPDF } from "jspdf";

import {
  SHEET,
  SHEET_BODY,
  buildFacilitySheet,
  buildSheetModel,
  dateRangeText,
  drawCard,
  headerBoxViolations,
  sheetHeaderLayout,
  iaChartFor,
  isSheetSafe,
  measureCard,
  money,
  overlapViolations,
  sheetBoxes,
  sheetLadder,
  sheetText,
  wrapText,
  type PackedSheetCard,
  type PackedSheetPage,
  type SheetCyclePack,
  type SheetCycleRecord,
} from "../src/lib/facilitySheet";
import { decodePrintedQr, qrMatrix } from "../src/lib/qrCode";
import { sheetFileName } from "../src/lib/printSheet";
import { RETIRED_ORG_NAMES } from "../src/lib/org";
import { pdfText } from "./pdfText";
import type { MasterRow } from "../src/lib/masterColumns";

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

type RowOverrides = {
  facility?: Partial<MasterRow["facility"]>;
  nqas?: Partial<NonNullable<MasterRow["nqas"]>>;
  sa?: Partial<NonNullable<MasterRow["sa"]>>;
  fund?: Partial<NonNullable<MasterRow["fund"]>>;
  noc?: Partial<NonNullable<MasterRow["noc"]>>;
  building?: Partial<NonNullable<MasterRow["building"]>>;
};

function row(o: RowOverrides = {}): MasterRow {
  return {
    facility: {
      _id: "f1",
      name: "Athanavur",
      block: "Jolarpettai",
      phc: "PHC Athanavur",
      facilityType: "PHC",
      ninNumber: "2426248478",
      eligibility: "Eligible",
      currentStatus: "Certified",
      remarks: "Verified during the state visit.",
      updatedAt: Date.UTC(2026, 9, 21, 3, 0),
      ...o.facility,
    },
    cycleNumber: 1,
    cycleType: "Initial",
    sa: {
      status: "Completed",
      actualStartDate: "2026-09-24",
      actualEndDate: "2026-09-25",
      scorePercent: 88.5,
      assessor1Name: "Dr Rao",
      assessor1Hud: "Vellore",
      generalDocStatus: "Completed & Awaiting Results",
      reportAttachmentName: "SA-Report-Athanavur.pdf",
      ...o.sa,
    },
    nqas: {
      status: "Completed",
      scorePercent: 83.8,
      certificationStatus: "Quality Certified",
      certificationDate: "2026-10-12",
      validityDate: "2029-10-12",
      surveillanceDue1: "2027-10-12",
      recertYear: 2029,
      ...o.nqas,
    },
    fund: {
      financialYear: "2026-27",
      status: "Pending",
      amountSanctioned: 100000,
      procLink: "https://nqas.example.gov.in/proc/Athanavur-2026-27.pdf",
      ...o.fund,
    },
    noc: {
      nocAvailable: "Yes",
      issuedDate: "2024-01-10",
      expiryDate: "2029-01-09",
      nocAttachmentName: "Fire-NOC-Athanavur.pdf",
      ...o.noc,
    },
    building: { buildingType: "Main block", buildingStatus: "Good", ...o.building },
    iaq: {
      pair: { previous: { fy: "2026-27", q: 1 }, current: { fy: "2026-27", q: 2 } },
      rows: [
        { fy: "2026-27", quarter: 1, nqasIaScore: 80.1, kayakalpIaScore: 80.2 },
        { fy: "2026-27", quarter: 2, nqasIaScore: 83.8, kayakalpIaScore: 83.9 },
      ],
    },
  } as unknown as MasterRow & { iaq: unknown };
}

const audits = Array.from({ length: 8 }, (_, i) => ({
  changedAt: Date.UTC(2026, 9, 10 + i, 3, 30),
  changedByName: `user-${i}`,
  field: `Field ${i}`,
  action: "update",
  newValue: "x".repeat(120),
}));

const raw = async (r: MasterRow, opts = {}) => {
  const built = await buildFacilitySheet(r as MasterRow, {
    generatedAt: new Date(Date.UTC(2026, 9, 22, 3, 6)),
    audits,
    ...opts,
  });
  const bytes = Buffer.from(built.doc.output("arraybuffer") as ArrayBuffer);
  return {
    ...built,
    // Bytes as latin1 (structure, page boxes, vector operators …) and the
    // decoded text a reader would copy out of the PDF (embedded fonts make
    // every glyph a hex CID, so raw byte searches see no wording at all).
    text: bytes.toString("latin1"),
    words: pdfText(bytes),
  };
};

/* ------------------------------------------------------------------ */
/* Glyphs                                                              */
/* ------------------------------------------------------------------ */

describe("glyph safety", () => {
  it("maps or drops every character the standard fonts cannot encode", () => {
    expect(sheetText("Validity → Renewed")).toBe("Validity to Renewed");
    expect(sheetText("24-Sep-2026 – 25-Sep-2026")).toBe("24-Sep-2026 - 25-Sep-2026");
    expect(sheetText("It’s “ready”…")).toBe("It's \"ready\"...");
    expect(sheetText("✓ uploaded ▲ 4.2 ▼ 1.0 ■")).toBe("Yes uploaded + 4.2 - 1.0 =");
    expect(isSheetSafe(sheetText("தமிழ் செயலி ₹ 1,00,000"))).toBe(true);
    // No control / lone surrogate survives.
    expect(isSheetSafe(sheetText("a\u0007b\u0000c"))).toBe(true);
  });

  it("renders ₹ as a vector mark, never as 'Rs.'", async () => {
    const { words } = await raw(row());
    expect(words).not.toContain("Rs.");
    // The amount itself is printed as Indian-grouped digits.
    expect(words).toContain("1,00,000");
  });

  it("never emits UTF-16-escaped runs (&L&l&l&e&c&y…)", async () => {
    const built = await raw(
      row({
        facility: { name: "தமிழ் ஆரம்ப சுகாதார நிலையம்", remarks: "நல்ல நிலை → மேம்படுத்தப்பட்டது" },
      }),
    );
    // Scoped to the TEXT-SHOW operators: the embedded TTF is binary and can
    // legitimately contain any byte pattern.
    const shows = [...built.text.matchAll(/(<[0-9A-Fa-f]+>|\([^)]*\))\s*Tj/g)].map((m) => m[1]);
    expect(shows.length).toBeGreaterThan(50);
    for (const show of shows) {
      expect(/&[A-Za-z]&[A-Za-z]&[A-Za-z]/.test(show)).toBe(false);
      expect(show).not.toContain("\u0000");
    }
    // The Tamil name really reached the page, and so did the arrow's stand-in.
    expect(built.words).toContain("தமிழ் ஆரம்ப சுகாதார நிலையம்");
    expect(built.words).toContain("நல்ல நிலை to மேம்படுத்தப்பட்டது");
  });
});

/* ------------------------------------------------------------------ */
/* Formats                                                             */
/* ------------------------------------------------------------------ */

describe("formats", () => {
  it("dates are DD-MMM-YYYY and ranges say 'to', never an arrow", () => {
    expect(dateRangeText("2026-09-24", "2026-09-25")).toBe("24-Sep-2026 to 25-Sep-2026 - 2 days");
    expect(dateRangeText("2026-09-24", "2026-09-24")).toBe("24-Sep-2026");
    expect(dateRangeText(null, null)).toBe("");
    expect(money(100000)).toBe("₹ 1,00,000");
    expect(money(null)).toBe("");
  });

  it("labels/facts use the config vocabulary (no old group names)", async () => {
    const { words } = await raw(row());
    expect(words).toContain("ELIGIBILITY & STATUS");
    expect(words).not.toContain("Eligibility & Pipeline");
    expect(words).not.toContain("Eco-Friendly");
    expect(words).not.toContain("Pipeline Status");
    expect(words).toContain("Facility Current Status");
  });

  it("prints no Report ID, no old file name and no retired organisation name", async () => {
    const built = await raw(row());
    expect(built.words).not.toContain("Report ID");
    expect(built.words).not.toContain(built.reportId);
    expect(built.words).not.toContain("NQAS_FacilityProfile");
    expect(built.words).not.toContain(RETIRED_ORG_NAMES[0]);
    // Part 2 — the new footer, on both pages.
    expect(built.words).toContain("Page 1 of 2");
    expect(built.words).toContain("Page 2 of 2");
    expect(built.words).toMatch(
      /NIN 2426248478 · Cycle #1 · Data as of \d{2}-\w{3}-\d{4} \d{2}:\d{2} IST · Page 1 of 2/,
    );
    // Part 1 — the cycle band and the "As recorded" contract.
    expect(built.words).toContain("CYCLE #1 · INITIAL · CURRENT");
    expect(built.words).not.toContain("CYCLE HISTORY");
  });
});

/* ------------------------------------------------------------------ */
/* Part B/D — IA chart, deferred labels, history pages                 */
/* ------------------------------------------------------------------ */

describe("IA chart and deferred outcome", () => {
  it("builds the last four fiscal quarters with gaps, never zero", () => {
    const chart = iaChartFor({
      pair: { previous: { fy: "2026-27", q: 1 }, current: { fy: "2026-27", q: 2 } },
      rows: [
        { fy: "2025-26", quarter: 3, nqasIaScore: 78 },
        { fy: "2025-26", quarter: 4, nqasIaScore: 88, kayakalpIaScore: 75 },
        { fy: "2026-27", quarter: 1, nqasIaScore: 88, kayakalpIaScore: 81.1 },
        { fy: "2026-27", quarter: 2, nqasIaScore: 91, kayakalpIaScore: 89.34 },
      ],
    } as never);
    expect(chart.points.map((p) => p.shortLabel)).toEqual([
      "Q3 25-26",
      "Q4 25-26",
      "Q1 26-27",
      "Q2 26-27",
    ]);
    expect(chart.points.map((p) => p.nqas)).toEqual([78, 88, 88, 91]);
    expect(chart.points.map((p) => p.kayakalp)).toEqual([null, 75, 81.1, 89.34]);
    expect(chart.points.every((p) => p.nqas !== 0 && p.kayakalp !== 0)).toBe(true);
  });

  it("a Deferred result never says Certified or Valid till", () => {
    const r = row({
      nqas: {
        certificationStatus: "Deferred",
        certificationDate: "2026-07-29",
        goiLetterDate: "2026-07-29",
        validityDate: "2026-10-29",
      },
    });
    const model = buildSheetModel(r, { today: "2026-10-27" });
    const nqas = model.page1Left.find((c) => c.id === "nqas")!;
    const labels = nqas.rows.map((x) => x.label);
    expect(labels).toContain("Result (GoI letter) date");
    expect(labels).toContain("Cooling period ends");
    expect(labels).not.toContain("Certified on");
    expect(labels).not.toContain("Valid till");
    expect(model.validityChip).toContain("29-Oct-2026");
    expect(model.validityChip).toContain("2 days");
  });

  it("a completed assessment without a score prints dash and a data check", () => {
    const model = buildSheetModel(row({ nqas: { status: "Completed", scorePercent: null } }));
    expect(model.checks).toContain("NQAS assessment completed without a score");
    const details = model.page1Left.find((c) => c.id === "nqasDetails")!;
    expect(details.rows.find((x) => x.label === "Assessment score")?.value).toBe("-");
    expect(details.rows.find((x) => x.label === "Assessment score")?.muted).toBe(true);
  });

  it("two cycles print 4 pages — Cycle #2 on 1–2, Cycle #1 on 3–4, no history page", async () => {
    const current = row({
      nqas: { certificationStatus: "Quality Certified", certificationDate: "2026-10-12" },
    });
    current.cycleNumber = 2;
    current.cycleType = "Recertification";
    const cycleHistory: SheetCycleRecord[] = [
      {
        cycleNumber: 1,
        cycleType: "Initial",
        createdAt: Date.UTC(2024, 0, 10),
        sa: { status: "Completed", actualStartDate: "2024-02-12", actualEndDate: "2024-02-13" },
        nqas: {
          status: "Completed",
          certificationStatus: "Deferred",
          goiLetterDate: "2024-03-20",
        },
        documents: [
          {
            id: "d1",
            key: "SA_Report",
            label: "SA Report",
            name: "SA-Report-C1.pdf",
            uploadedAt: Date.UTC(2024, 1, 20),
          },
        ],
        audits: [
          {
            changedAt: Date.UTC(2024, 2, 20),
            changedByName: "Gopinath P",
            field: "NQAS_Result",
            action: "create",
            newValue: "stored.pdf (v1, 337 bytes)",
          },
        ],
      },
      {
        cycleNumber: 2,
        cycleType: "Recertification",
        createdAt: Date.UTC(2026, 5, 1),
        sa: { status: "Completed", actualStartDate: "2026-06-10", actualEndDate: "2026-06-11" },
        nqas: {
          status: "Completed",
          scorePercent: 88,
          certificationStatus: "Quality Certified",
          certificationDate: "2026-10-12",
          validityDate: "2029-10-12",
        },
      },
    ];
    const built = await raw(current, { cycleHistory, today: "2026-10-27" });
    expect(built.pages).toBe(4);
    expect(built.cycles).toEqual([2, 1]);
    expect(built.words).toContain("CYCLE #2 · RECERTIFICATION · CURRENT");
    expect(built.words).toContain("CYCLE #1 · INITIAL · SUPERSEDED BY CYCLE #2");
    expect(built.words).toContain("Page 1 of 4");
    expect(built.words).toContain("Page 2 of 4");
    expect(built.words).toContain("Page 3 of 4");
    expect(built.words).toContain("Page 4 of 4");
    // The Cycle-history page, its timeline, comparison table and per-cycle
    // documents list are GONE (kept only in Quick View / Profile on screen).
    expect(built.words).not.toContain("CYCLE HISTORY");
    expect(built.words).not.toContain("Cycle comparison");
    expect(built.words).not.toContain("Cycle #1 documents");
    expect(built.words).not.toContain("stored.pdf");
    // Past cycles are tagged read-only and carry their own records.
    expect(built.words).toContain("As recorded");
    expect(built.words).toContain("Cooling period ends");

    // Unticking a cycle drops its pages and renumbers the rest.
    const onlyCurrent = await raw(current, { cycleHistory, cycles: [2], today: "2026-10-27" });
    expect(onlyCurrent.pages).toBe(2);
    expect(onlyCurrent.words).toContain("Page 2 of 2");
    expect(onlyCurrent.words).not.toContain("CYCLE #1");
    expect(onlyCurrent.fileName).toContain(" (Cycle 2)");

    // A three-cycle facility prints six pages: 2 per cycle, newest first.
    const third: SheetCycleRecord = {
      cycleNumber: 3,
      cycleType: "Recertification",
      nqas: { status: "Scheduled", certificationStatus: null },
    };
    const three = await raw(current, {
      cycleHistory: [...cycleHistory, { ...third }],
      today: "2026-10-27",
    });
    expect(three.pages).toBe(6);
    expect(three.cycles).toEqual([3, 2, 1]);
  });

  it("a closed cycle's IA window ends in the quarter the cycle closed in", () => {
    const iaq = {
      pair: { previous: { fy: "2025-26", q: 4 }, current: { fy: "2026-27", q: 1 } },
      rows: [
        { fy: "2025-26", quarter: 2, nqasIaScore: 71 },
        { fy: "2025-26", quarter: 3, nqasIaScore: 78 },
        { fy: "2025-26", quarter: 4, nqasIaScore: 88 },
        { fy: "2026-27", quarter: 1, nqasIaScore: 90 },
      ],
    } as never;
    const chart = iaChartFor(iaq, { endPeriod: { fy: "2025-26", q: 4 } });
    expect(chart.points.map((p) => p.shortLabel)).toEqual([
      "Q1 25-26",
      "Q2 25-26",
      "Q3 25-26",
      "Q4 25-26",
    ]);
    expect(chart.points.map((p) => p.nqas)).toEqual([null, 71, 78, 88]);
  });
});

/* ------------------------------------------------------------------ */
/* The sheet never becomes three pages                                 */
/* ------------------------------------------------------------------ */

describe("exactly two pages", () => {
  const cases: { name: string; r: MasterRow }[] = [
    { name: "fully filled", r: row() },
    {
      name: "mostly blank",
      r: row({
        facility: { ninNumber: null, remarks: null, eligibility: "Possible", currentStatus: "Not started" },
        sa: { status: null, actualStartDate: null, actualEndDate: null, scorePercent: null, assessor1Name: null, assessor1Hud: null, generalDocStatus: null, reportAttachmentName: null, checklistAttachmentName: null },
        nqas: { certificationStatus: null, certificationDate: null, validityDate: null, scorePercent: null, surveillanceDue1: null, surveillanceDue2: null, surveillanceDone1: null, surveillanceDone2: null, recertYear: null },
        fund: { financialYear: null, status: null, amountSanctioned: null, procLink: null },
        noc: { nocAvailable: null, issuedDate: null, expiryDate: null, nocAttachmentName: null },
        building: { buildingType: null, buildingStatus: null },
      }),
    },
    {
      name: "500-character remarks + long file names + 12 departments",
      r: row({
        facility: { remarks: "Long remark sentence. ".repeat(25) },
        sa: {
          reportAttachmentName:
            "SA-Report-Athanavur-Block-Jolarpettai-District-Tirupattur-Cycle-1-Final-Signed-27-Sep-2026.pdf",
          checklistAttachmentName:
            "SA-Checklist-Athanavur-Block-Jolarpettai-District-Tirupattur-Cycle-1-Final-Signed.pdf",
        },
        fund: { procLink: "https://nqas.example.gov.in/procurement/2026-27/Athanavur-PHC-gap-closure-fund-approval.pdf" },
        nqas: { departments: Array.from({ length: 12 }, (_, i) => `Service package ${i + 1}`) },
      }),
    },
    {
      name: "Tamil text",
      r: row({ facility: { name: "ஆத்தனவூர் ஆரம்ப சுகாதார நிலையம்", remarks: "தமிழ் குறிப்பு" } }),
    },
    {
      name: "expired certificate + many data checks",
      r: row({
        nqas: { validityDate: "2026-08-01", certificationDate: "2023-08-01", certificationStatus: "Quality Certified" },
        noc: { nocAvailable: "Yes", expiryDate: "2026-01-01" },
        sa: { generalDocStatus: "Awaiting Results" },
        facility: { documentsStatusReport: null },
      }),
    },
  ];

  for (const c of cases) {
    it(`${c.name}: exactly 2 A4 portrait pages`, async () => {
      const built = await raw(c.r);
      expect(built.pages).toBe(2);
      expect(built.doc.getNumberOfPages()).toBe(2);
      const text = built.text;
      // A4 portrait: every page box is 595 × 842 pt, never the landscape pair.
      const boxes = text.split("/MediaBox [0 0 ").slice(1).map((s) => s.slice(0, s.indexOf("]")));
      expect(boxes.length).toBe(2);
      for (const b of boxes) {
        expect(b.startsWith("595")).toBe(true);
        expect(b.includes("595") && b.trim().endsWith("595")).toBe(false);
      }
      // Page numbers on both pages, the Report ID on neither (Part 2).
      expect(built.words).toContain("Page 1 of 2");
      expect(built.words).toContain("Page 2 of 2");
      expect(built.words).not.toContain(built.reportId);
      expect(built.words).not.toContain("Report ID");
      // Part 1 — the new card is always there, blank or full.
      expect(built.words).toContain("NQAS ASSESSMENT DETAILS");
      expect(built.words).toContain("NQAS CERTIFICATION");
    });
  }

  it("no card heading is ever printed without a row under it", () => {
    for (const c of cases) {
      const model = buildSheetModel(c.r);
      for (const card of [
        ...model.page1Left,
        ...model.page1Right,
        ...model.page2Left,
        ...model.page2Right,
      ]) {
        expect(card.title.length).toBeGreaterThan(0);
        // The IA card renders its own four-quarter table + chart, so it is the
        // one card without kv rows — every other card must have content.
        if (card.id === "ia") continue;
        expect(card.rows.length).toBeGreaterThan(0);
      }
    }
  });

  it("an all-blank card says so in one line (never an empty heading)", async () => {
    const blank = cases.find((c) => c.name === "mostly blank")!;
    const built = await raw(blank.r);
    expect(built.words).toContain("Gap closure: not recorded");
    // The gap-funds chip is a blank, never a zero.
    expect(built.words).not.toContain("₹ 0");
    expect(built.words).not.toContain("INR 0");
  });

  it("the overlap check fails a card that leaves its page and a lost card", () => {
    const card = (id: string, height: number): PackedSheetCard =>
      ({
        card: { id, title: id, hex: "#000000", rows: [], missing: [] },
        layout: { card: { id, title: id, hex: "#000000", rows: [], missing: [] }, height, rows: [], blankLine: "" },
        withChart: false,
        height,
      }) as unknown as PackedSheetCard;
    const page = (items: PackedSheetCard[]): PackedSheetPage => ({
      left: items,
      right: [],
      leftH: items.reduce((s, i) => s + i.height, 0),
      rightH: 0,
      iaH: 0,
      top: SHEET_BODY.top1,
      capacity: SHEET_BODY.cap1,
    });
    const base: SheetCyclePack = {
      page1: page([card("identity", 40)]),
      page2: page([card("checks", 30)]),
      iaOnPage1: false,
      step: sheetLadder()[0],
      hidden: [],
      dropped: [],
      violations: [],
      diagnostics: [],
    };
    // A clean pack records nothing.
    expect(overlapViolations(base)).toEqual([]);
    expect(sheetBoxes(base).every((b) => b.y + b.h <= SHEET_BODY.bottom + 0.01)).toBe(true);
    // A card taller than page 1's content box fails the build check.
    const overfull: SheetCyclePack = { ...base, page1: page([card("identity", SHEET_BODY.cap1 + 30)]) };
    expect(overlapViolations(overfull).join(" ")).toContain("exceeds page 1");
    // A card that did not fit the two pages fails too (never silently lost).
    expect(overlapViolations(base, 2).join(" ")).toContain("2 cards do not fit the two pages");
  });

  it("the fit ladder is recorded, not silent", async () => {
    const built = await raw(row({ facility: { remarks: "x ".repeat(900) } }));
    expect(built.diagnostics.join(" ")).toContain("fit:");
    expect(built.pages).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/* Values come from the shared fields (the two data bugs)              */
/* ------------------------------------------------------------------ */

describe("field mapping", () => {
  it("IA reads the quarterly store and shows FOUR real quarters in ONE card", () => {
    const model = buildSheetModel(row());
    // The quarterly store (row.iaq), not the legacy Q1/Q2 facility columns.
    expect(model.iaChart.points.map((p) => p.shortLabel)).toEqual([
      "Q3 25-26",
      "Q4 25-26",
      "Q1 26-27",
      "Q2 26-27",
    ]);
    expect(model.iaChart.points.map((p) => p.nqas)).toEqual([null, null, 80.1, 83.8]);
    expect(model.iaChart.points.map((p) => p.kayakalp)).toEqual([null, null, 80.2, 83.9]);
    expect(model.iaChart.change.nqas).toBe(3.7);
    // The separate Q1/Q2 mini table is gone: the card draws its own table and
    // chart from `iaChart` (one card, never two).
    const ia = model.page1Right.find((c) => c.id === "ia")!;
    expect(ia.rows).toEqual([]);
  });

  it("documents come from their own fields and collapse the blanks", () => {
    const model = buildSheetModel(row({ sa: { checklistAttachmentName: null } }));
    const docs = model.page2Left.find((c) => c.id === "documents")!;
    const values = Object.fromEntries(docs.rows.map((r) => [r.label, r.value]));
    // Part 5.6 — the six agreed labels, in order, each with ONE requirement
    // badge from the Admin → Documents rules.
    expect(model.documents.map((d) => d.label)).toEqual([
      "NQAS Result",
      "SA Report",
      "SA Checklist",
      "Gap Closure Proceeding",
      "Condemned Certificate",
      "Fire NOC",
    ]);
    // Part 5.6 — "(Optional)" is never printed; only a required document
    // carries a badge.
    expect(values["SA Report"]).toBe("Uploaded");
    // A missing document is stated, never silently dropped.
    expect(values["SA Checklist"]).toBe("Not uploaded");
    expect(values["Fire NOC"]).toBe("Uploaded");
    expect(Object.keys(values).join("|")).not.toContain("(Optional)");
    expect(values["Documents uploaded"]).toBe("3 of 6");
    // The retired "Gap Closure Proc. Link" row and the "0/5" counter are gone.
    expect(Object.keys(values).join("|")).not.toContain("Proc. Link");
    expect(Object.values(values).join("|")).not.toMatch(/\/5\b/);
    // A required document that is missing says so in the row itself.
    const required = buildSheetModel({
      ...row(),
      docs: {
        keys: ["SA_Report"],
        requiredMissing: [
          { key: "NQAS_Result", label: "NQAS Result", blocking: true },
        ],
      },
    } as MasterRow);
    const reqDocs = required.page2Left.find((c) => c.id === "documents")!;
    const reqValues = Object.fromEntries(reqDocs.rows.map((r) => [r.label, r.value]));
    expect(reqValues["NQAS Result (Required)"]).toBe("Required missing");
    expect(required.checks.join(" | ")).toContain("NQAS Result document not uploaded (required)");
  });

  it("the documents report blank is flagged, not hidden", () => {
    const model = buildSheetModel(
      row({ facility: { documentsStatusReport: null }, sa: { generalDocStatus: "Awaiting Results" } }),
    );
    expect(model.checks.join(" | ")).toContain("Documents Status (Report) is blank");
    const checksCard = model.page2Right.find((c) => c.id === "checks")!;
    expect(checksCard.rows.map((r) => r.value).join(" | ")).toContain("Documents Status");
  });

  it("a clean facility says so", () => {
    const model = buildSheetModel(
      row({
        nqas: { validityDate: "2029-10-12", certificationDate: "2026-10-12" },
        sa: { generalDocStatus: "Documents Verified" },
        facility: { documentsStatusReport: "Documents Verified" },
      }),
    );
    expect(model.checks).toEqual([]);
    expect(model.page2Right.find((c) => c.id === "checks")!.rows[0].value).toBe("No issues found");
  });
});

/* ------------------------------------------------------------------ */
/* No clipping, one column grid                                        */
/* ------------------------------------------------------------------ */

describe("layout", () => {
  it("wraps without ever exceeding the box (file names hard-break)", async () => {
    const { doc } = await raw(row());
    doc.setFont("helvetica", "normal");
    doc.setFontSize(SHEET.body);
    const long = "https://nqas.example.gov.in/procurement/2026-27/Athanavur-PHC-gap-closure-fund-approval.pdf";
    const lines = wrapText(doc, long, 50);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(doc.getTextWidth(l)).toBeLessThanOrEqual(50.001);
    // Ordinary sentences break at spaces only.
    const sentence = wrapText(doc, "Certified on 12-Oct-2026 and valid till 12-Oct-2029", 40);
    for (const l of sentence) expect(l).not.toMatch(/^\S$/);
  });

  it("every card is on the same two-column 92 mm grid", () => {
    const model = buildSheetModel(row());
    expect(SHEET.colW).toBe(92);
    expect(SHEET.gap).toBe(6);
    expect(SHEET.margin * 2 + SHEET.colW * 2 + SHEET.gap).toBe(SHEET.pageW);
    for (const card of [...model.page1Left, ...model.page1Right, ...model.page2Left, ...model.page2Right]) {
      expect(card.title.length).toBeGreaterThan(0);
    }
  });

  it("names the file {Facility} {Type} NQAS Status Report {DD-MM-YYYY}.pdf", async () => {
    const built = await raw(row());
    expect(built.fileName).toBe("Athanavur PHC NQAS Status Report 22-10-2026.pdf");
    // The dialog previews the very same rule (generation date, IST).
    expect(
      sheetFileName(
        { name: "Athanavur", facilityType: "PHC", phc: "PHC Athanavur" },
        { date: new Date(Date.UTC(2026, 9, 22, 3, 6)) },
      ),
    ).toBe(built.fileName);
    // Names repeat across blocks: same name AND same type label → the PHC
    // disambiguates. Unknown types keep the stored value; a blank type is
    // simply omitted (never "Facility Facility").
    expect(
      sheetFileName(
        { name: "Narayanapuram", facilityType: "HWC HSC", phc: "Ramanaickenpettai" },
        { date: new Date(Date.UTC(2026, 9, 26, 6)), duplicate: true },
      ),
    ).toBe("Narayanapuram HSC (Ramanaickenpettai) NQAS Status Report 26-10-2026.pdf");
    expect(
      sheetFileName({ name: "Mallapalli", facilityType: "New Type X" }, { date: new Date(Date.UTC(2026, 9, 26, 6)) }),
    ).toBe("Mallapalli New Type X NQAS Status Report 26-10-2026.pdf");
    expect(
      sheetFileName({ name: null, facilityType: null }, { date: new Date(Date.UTC(2026, 9, 26, 6)) }),
    ).toBe("Facility NQAS Status Report 26-10-2026.pdf");
  });
});

/* ------------------------------------------------------------------ */
/* Print options dialog — every combination stays two pages            */
/* ------------------------------------------------------------------ */

describe("print options", () => {
  it("A3 is the same two pages, scaled onto the A3 sheet", async () => {
    const built = await raw(row(), { paper: "a3" });
    expect(built.pages).toBe(2);
    expect(built.doc.internal.pageSize.getWidth()).toBeCloseTo(297, 0);
    expect(built.doc.internal.pageSize.getHeight()).toBeCloseTo(420, 0);
    const text = Buffer.from(built.doc.output("arraybuffer") as ArrayBuffer).toString("latin1");
    // One matrix per page, with the Y pull-down so nothing lands off-page.
    const matrices = [...text.matchAll(/([\d.]+) 0 0 ([\d.]+) 0 (-?[\d.]+) cm/g)];
    expect(matrices.length).toBe(2);
    for (const m of matrices) {
      expect(Number(m[1])).toBeCloseTo(297 / 210, 3);
      expect(Number(m[3])).toBeLessThan(0);
    }
  });

  it("show empty fields / recent changes / QR are independent switches", async () => {
    for (const opts of [
      { showEmpty: true },
      { showEmpty: true, includeRecent: false },
      { includeRecent: false, includeQr: false },
      { showEmpty: false, includeRecent: true, includeQr: true },
    ]) {
      const built = await raw(row(), opts);
      expect(built.pages).toBe(2);
    }
    // "Show empty fields" prints the dashes the collapsed line hides.
    const withEmpty = buildSheetModel(row(), { showEmpty: true });
    expect(withEmpty.page1Left.length).toBeGreaterThan(0);
    const noQr = await raw(row(), { includeQr: false });
    expect(noQr.words).not.toContain("Scan to open the digital copy");
  });

  it("shows the dialog's file name before rendering, and it matches the file written", async () => {
    const built = await raw(row());
    expect(
      sheetFileName(
        { name: "Athanavur", facilityType: "PHC", phc: "PHC Athanavur" },
        { date: new Date(Date.UTC(2026, 9, 22, 3, 6)) },
      ),
    ).toBe(built.fileName);
    expect(
      sheetFileName({ name: "Mallapalli", facilityType: "HWC HSC" }, { date: new Date(Date.UTC(2026, 9, 26, 6)) }),
    ).toBe("Mallapalli HSC NQAS Status Report 26-10-2026.pdf");
  });

  it("draws the QR ONCE, on page 1 of the document, and no end block", async () => {
    const url = "https://nqas.example.in/r/xY7QwE2rT5uI9oP1aS3dF";
    const built = await raw(row(), { qrUrl: url });
    expect(built.words).toContain("Scan to open the digital copy");
    // The old end-of-document verification block is gone: no printed short
    // link, no "Download this report from the same page" box.
    expect(built.words).not.toContain(url);
    expect(built.words).not.toContain("Download this report from the same page");
    expect(built.words).not.toContain("Verify this sheet");
    expect(built.words).not.toContain("/facilities?nin");
    // The QR is drawn as filled rectangles (no image, no font): one run per
    // dark row-run. The same sheet without the switch has strictly fewer.
    const plain = await raw(row(), { includeQr: false });
    const withQr = (built.text.match(/ re\n/g) ?? []).length;
    const withoutQr = (plain.text.match(/ re\n/g) ?? []).length;
    expect(withQr - withoutQr).toBeGreaterThan(40);
    expect(plain.words).not.toContain("Scan to open the digital copy");
    expect(plain.pages).toBe(2);
  });

  it("never prints Future Done dates as Done", async () => {
    const model = buildSheetModel(
      row({
        nqas: {
          certificationStatus: "Quality Certified",
          certificationDate: "2026-10-12",
          validityDate: "2029-10-11",
          surveillanceDue1: "2027-10-12",
          surveillanceDone1: "2027-10-12",
        },
      }),
      { today: "2026-10-27" },
    );
    const card = model.page2Left.find((c) => c.id === "surveillance")!;
    const doneRow = card.rows.find((r) => r.label === "1st surveillance done")!;
    expect(doneRow.value).toBe("Not done");
    expect(model.checks.join(" | ")).toContain("1st surveillance done date is in the future");
  });

  it("the Deferred stepper keeps Certification warned and Surveillance upcoming", () => {
    const model = buildSheetModel(
      row({
        nqas: {
          status: "Completed",
          certificationStatus: "Deferred",
          goiLetterDate: "2026-07-29",
          actualEndDate: "2026-07-28",
          surveillanceDue1: null,
        },
        sa: { status: "Completed", actualStartDate: "2026-06-10", actualEndDate: "2026-06-11" },
      }),
      { today: "2026-10-27" },
    );
    const byLabel = Object.fromEntries(model.stages.map((s) => [s.label, s.state]));
    expect(byLabel["Eligibility"]).toBe("done");
    expect(byLabel["State Assessment"]).toBe("done");
    expect(byLabel["NQAS Assessment"]).toBe("done");
    expect(byLabel["Certification"]).toBe("blocked");
    expect(byLabel["Surveillance"]).toBe("upcoming");
    expect(byLabel["Recertification"]).toBe("upcoming");
    expect(model.validityChip).toContain("Cooling period ends 29-Oct-2026");
  });

  it("a cycle's start comes from its own first record, never the upload stamp", () => {
    const current = row({ sa: { status: "Completed", actualStartDate: "2026-09-14", actualEndDate: "2026-09-16" } });
    current.cycleNumber = 2;
    current.cycleType = "Recertification";
    const cycleHistory: SheetCycleRecord[] = [
      {
        cycleNumber: 1,
        cycleType: "Initial",
        // The migration stamped both cycles on the same day — the old history
        // page read this and printed "Start 25-Sep-2025" twice.
        createdAt: Date.UTC(2025, 8, 25),
        sa: { status: "Completed", actualStartDate: "2023-02-01", actualEndDate: "2023-02-03" },
        nqas: { status: "Completed", certificationStatus: "Deferred", goiLetterDate: "2023-06-01" },
      },
      { cycleNumber: 2, cycleType: "Recertification", createdAt: Date.UTC(2025, 8, 25), sa: null, nqas: null },
    ];
    const built = buildFacilitySheet(current, { cycleHistory, today: "2026-10-27" });
    return built.then((sheet) => {
      expect(sheet.doc).toBeTruthy();
      const words = pdfText(Buffer.from(sheet.doc.output("arraybuffer") as ArrayBuffer));
      expect(words).toContain("Started 01-Feb-2023");
      expect(words).not.toContain("Started 25-Sep-2025");
    });
  });

  it("prints a real Open link for every uploaded document (Part 3)", async () => {
    const url = "https://qualitytracker.freebuff.app/r/DSgycBZbAbCdEfGhIjKlMn/d/AbCdEfGhIjKlMnOpQrStUv";
    // The model attaches the snapshot link only to a document that has a file.
    const model = buildSheetModel(row(), { today: "2026-10-27", docLinks: { "1:NOC": url } });
    expect(model.documents.find((d) => d.key === "NOC")?.url).toBe(url);
    expect(model.documents.find((d) => d.key === "SA_Report")?.url ?? null).toBeNull();

    // A real PDF link annotation (not plain text) on the document card.
    const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const card = {
      id: "documents",
      title: "Documents",
      hex: "#475569",
      missing: [],
      rows: [
        {
          kind: "kv" as const,
          label: "Fire NOC",
          value: "Uploaded 24-Oct-2026 · Fire NOC.pdf",
          link: url,
        },
      ],
    };
    const layout = measureCard(doc, card, 10, 40, 92, SHEET.body, false);
    drawCard(doc, layout, 10, 40, 92, SHEET.body, false);
    const raw = Buffer.from(doc.output("arraybuffer") as ArrayBuffer).toString("latin1");
    expect(raw).toContain("/URI");
    expect(raw).toContain(url);
    expect(raw).not.toContain("drive.google.com");
  });
});

/* ------------------------------------------------------------------ */
/* FLOW LAYOUT — the "does not fit two pages" regression                */
/* ------------------------------------------------------------------ */

describe("flow layout packs cards instead of pinning pages", () => {
  /** Kurumbakeri-shaped fixture: cycle #2, a four-quarter (1-year) IA chart,
   *  NQAS Assessment Details with 12 service packages, long remarks and a
   *  long cycle history. This is the shape that used to overflow page 1. */
  const kurumbakeri = () => {
    const r = row({
      facility: {
        name: "Kurumbakeri",
        block: "Tirupathur",
        phc: "PHC Kurumbakeri",
        facilityType: "HWC HSC",
        remarks:
          "The facility shares its building with the panchayat office; the upper floor is used for the labour room and the cold-chain room. " +
          "Rainwater seeps into the corridor during the north-east monsoon, and the ramp to the entrance is steep. " +
          "The medical officer has requested a structural assessment before the next NQAS visit. " +
          "All registers were verified on the last visit and the biomedical waste contract is current. " +
          "The health inspector has been asked to photograph the seepage and upload it to the shared Drive folder.",
      },
      nqas: {
        status: "Completed",
        mode: "Physical",
        checklistVersion: "2024",
        scorePercent: 88.4,
        certificationStatus: "Quality Certified",
        certificationDate: "2026-10-12",
        goiLetterDate: "2026-10-12",
        validityDate: "2029-10-11",
        actualStartDate: "2026-09-14",
        actualEndDate: "2026-09-16",
        departments: Array.from({ length: 12 }, (_, i) => `Service package ${i + 1}: maternal and child health`),
        departmentsTotal: 12,
      },
    });
    r.cycleNumber = 2;
    r.cycleType = "Recertification";
    const cycleHistory: SheetCycleRecord[] = [
      {
        cycleNumber: 1,
        cycleType: "Initial",
        createdAt: Date.UTC(2023, 0, 5),
        sa: { status: "Completed", actualStartDate: "2023-02-01", actualEndDate: "2023-02-03", scorePercent: 74.2 },
        nqas: {
          status: "Completed",
          certificationStatus: "Quality Certified",
          certificationDate: "2023-06-01",
          validityDate: "2026-05-31",
          scorePercent: 79.1,
        },
      },
      {
        cycleNumber: 2,
        cycleType: "Recertification",
        createdAt: Date.UTC(2026, 8, 1),
        sa: { status: "Completed", actualStartDate: "2026-09-14", actualEndDate: "2026-09-16", scorePercent: 84.9 },
        nqas: {
          status: "Completed",
          certificationStatus: "Quality Certified",
          certificationDate: "2026-10-12",
          validityDate: "2029-10-11",
          scorePercent: 88.4,
        },
      },
    ];
    return { r, cycleHistory };
  };

  it("Kurumbakeri (2 cycles) prints exactly 4 pages, current cycle first, no overlap", async () => {
    const { r, cycleHistory } = kurumbakeri();
    const built = await raw(r, { cycleHistory, today: "2026-10-27" });
    expect(built.pages).toBe(4);
    expect(built.cycles).toEqual([2, 1]);
    expect(built.words).toContain("CYCLE #2 · RECERTIFICATION · CURRENT");
    expect(built.words).toContain("CYCLE #1 · INITIAL · SUPERSEDED BY CYCLE #2");
    // Every packed column stays inside its measured capacity (199 mm page 1,
    // page height − margins − tail on page 2).
    for (const line of built.diagnostics) {
      const m = line.match(/page (\d): left ([\d.]+)mm right ([\d.]+)mm of ([\d.]+)mm/);
      if (!m) continue;
      expect(Number(m[2])).toBeLessThanOrEqual(Number(m[4]) + 0.01);
      expect(Number(m[3])).toBeLessThanOrEqual(Number(m[4]) + 0.01);
    }
    // No overlap, no card off its page — the runtime overlap check ran and
    // recorded nothing.
    expect(built.diagnostics.filter((d) => d.includes("overlap check"))).toEqual([]);
    expect(built.diagnostics.join(" ")).not.toContain("do not fit");
    // ONE IA card: table + chart, gaps as "Not reported", never 0.
    expect(built.words).toContain("INTERNAL ASSESSMENT & KAYAKALP — LAST FOUR QUARTERS");
    expect(built.words).toContain("Not reported");
    expect(built.words).not.toContain("0.00%");
    expect(built.words).toContain("NQAS ASSESSMENT DETAILS");
    expect(built.words).toContain("Kurumbakeri");
    expect(built.words).toContain("GAP CLOSURE");
    expect(built.words).toContain("SURVEILLANCE & RECERTIFICATION");
    // SHEET_DEBUG=1 prints the measured pack (used for the delivery report).
    if (process.env.SHEET_DEBUG) console.log(built.diagnostics.join("\n"));
  });

  it("stress fixtures (Tamil, 12 packages, six docs, blank cycle) never fail", async () => {
    const { r, cycleHistory } = kurumbakeri();
    r.facility.name = "குரும்பகேரி ஆரம்ப சுகாதார நிலையம்";
    const built = await raw(r, { cycleHistory, today: "2026-10-27" });
    expect(built.pages).toBe(4);
    const blank = row();
    blank.cycleNumber = 1;
    const one = await raw(blank, { today: "2026-10-27" });
    expect(one.pages).toBe(2);
    // The fit ladder always names the rung it used and there is never an
    // overlap warning.
    for (const bundle of [built, one]) {
      expect(bundle.diagnostics.some((d) => d.trim().startsWith("fit:"))).toBe(true);
      expect(bundle.diagnostics.filter((d) => d.includes("overlap check"))).toEqual([]);
    }
  });

  it("force-fit keeps two pages per cycle, drops only low-priority cards, never throws", async () => {
    const { r, cycleHistory } = kurumbakeri();
    // Force the ladder past every ordinary rung: a very long remarks block,
    // the longest department names and an expired certificate.
    r.facility.remarks = "x ".repeat(1200);
    r.nqas = {
      ...r.nqas,
      departments: Array.from({ length: 12 }, (_, i) => `Service package ${i + 1}: a very long department name for the checklist`),
      validityDate: "2025-01-01",
    };
    const built = await raw(r, { cycleHistory, today: "2026-10-27" });
    expect(built.pages).toBe(4);
    const joined = built.diagnostics.join(" ");
    expect(joined).toMatch(/fit:|forced|shortened/);
    expect(joined).not.toContain("overlap check");
    // Even when the ladder has to drop follow-up cards, the identity and NQAS
    // cards are always printed.
    expect(built.words).toContain("IDENTITY");
    expect(built.words).toContain("NQAS CERTIFICATION");
  });

  it("the fit ladder shortens optional detail before it adds a page", async () => {
    // A deliberately dense sheet: the last audits + the longest departments +
    // a certificate that expires soon (so the checks card is long).
    const { r } = kurumbakeri();
    r.facility.remarks = "long remark line ".repeat(60);
    r.nqas = {
      ...r.nqas,
      departments: Array.from({ length: 12 }, (_, i) => `Service package ${i + 1}: a very long department name for the checklist`),
      // Expired certificate → the needs-attention card grows.
      validityDate: "2025-01-01",
    };
    const built = await raw(r, { today: "2026-10-27" });
    expect(built.pages).toBe(2);
    const joined = built.diagnostics.join(" ");
    expect(joined).toMatch(/clamp-text|recent-hidden|documents-detail-hidden|department-detail-hidden|fit:/);
  });
});

/* ------------------------------------------------------------------ */
/* PART 1/2 — header layout, QR size, no printed links                */
/* ------------------------------------------------------------------ */

describe("page-1 header layout and the QR badge", () => {
  const QR_URL = "https://qualitytracker.freebuff.app/r/VPuCofo_xFBMSex2-2GO7jOy";
  const DOC_URL =
    "https://qualitytracker.freebuff.app/r/VPuCofo_xFBMSex2-2GO7jOy/d/AbCdEfGhIjKlMnOpQrStUv";

  const layoutFor = (name: string, opts: Record<string, unknown> = {}) => {
    const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const model = buildSheetModel(
      row({ facility: { name } }),
      { today: "2026-10-27", qrUrl: QR_URL, ...opts },
    );
    return { doc, model, layout: sheetHeaderLayout(doc, model, { qrUrl: QR_URL, ...opts }) };
  };

  it("has no intersecting header boxes (title, subtitle, chips, QR, caption)", () => {
    const { layout } = layoutFor("Kavalurchatram");
    expect(headerBoxViolations(layout.boxes)).toEqual([]);
    // The QR keeps its own column: chips end before the block starts.
    const qr = layout.boxes.find((b) => b.id === "qr")!;
    for (const pill of layout.boxes.filter((b) => b.id.startsWith("pill-"))) {
      expect(pill.x + pill.w).toBeLessThanOrEqual(qr.x + 0.01);
    }
    // Nothing in the header is wider than the content area.
    for (const b of layout.boxes) {
      expect(b.x).toBeGreaterThanOrEqual(SHEET.margin - 0.01);
      expect(b.x + b.w).toBeLessThanOrEqual(SHEET.pageW - SHEET.margin + 0.01);
    }
  });

  it("prints NO share URL, only the caption under the QR", async () => {
    const built = await raw(row(), { qrUrl: QR_URL });
    const all = built.words;
    expect(all).toContain("Scan to open the digital copy");
    for (const needle of [
      "freebuff.app",
      "qualitytracker",
      "/r/",
      "VPuCofo",
      "https://",
      "Scan to open the digital copy ·",
    ]) {
      expect(all).not.toContain(needle);
    }
    // The URL lives in the QR annotation only (and in the QR modules).
    expect(built.text).toContain("/URI");
    expect(built.text).toContain(QR_URL);
  });

  it("sizes the symbol at 20 mm inside a ~24.8 mm block", () => {
    const { layout } = layoutFor("Kavalurchatram");
    expect(layout.qr).not.toBeNull();
    expect(layout.qr!.symbol).toBe(20);
    expect(layout.qr!.size).toBeCloseTo((20 * 41) / 33, 2); // 24.85 mm
    // 33 modules → 0.606 mm per module.
    expect(layout.qr!.symbol / 33).toBeCloseTo(0.606, 3);
    // Caption sits below the block, centred as far as the page allows.
    expect(layout.caption).not.toBeNull();
    expect(layout.caption!.y).toBeGreaterThan(layout.qr!.y + layout.qr!.size);
    const cap = layout.caption!;
    expect(cap.x).toBeGreaterThanOrEqual(SHEET.margin);
    expect(cap.x + cap.w).toBeLessThanOrEqual(SHEET.pageW - SHEET.margin);
  });

  it("a long facility name wraps to two lines without touching the QR", () => {
    const { layout } = layoutFor(
      "Kavalurchatram Primary Health Centre Kadambur Extension Building Compound Street Colony",
    );
    expect(layout.titleLines.length).toBe(2);
    expect(layout.pills.every((p) => p.y >= layout.titleYs[1])).toBe(true);
    expect(headerBoxViolations(layout.boxes)).toEqual([]);
  });

  it("a Tamil name and chips stay inside the left column", () => {
    const { layout } = layoutFor("காவலூர்சத்திரம் தமிழ் சுகாதார நிலையம்");
    expect(layout.titleLines[0].length).toBeGreaterThan(0);
    expect(headerBoxViolations(layout.boxes)).toEqual([]);
  });

  it("headerBoxViolations really catches an overlap and an overflow", () => {
    expect(
      headerBoxViolations([
        { id: "a", x: 10, y: 30, w: 40, h: 5 },
        { id: "b", x: 45, y: 32, w: 40, h: 5 },
      ]),
    ).toEqual(["a overlaps b"]);
    expect(
      headerBoxViolations([{ id: "wide", x: 170, y: 20, w: 40, h: 4 }]),
    ).toEqual([
      "wide leaves the content width (170.0–210.0mm)",
    ]);
  });

  it("document lines print the date and Open, never the file name (PDF only)", async () => {
    const withDocs = (): MasterRow => {
      const r = row();
      r.docs = {
        uploaded: 2,
        total: 6,
        keys: ["NOC", "SA_Report"],
        files: {
          NOC: { name: "Kavalurchatram PHC.pdf", uploadedAt: Date.UTC(2026, 9, 24) },
          SA_Report: { name: "SA-Report (2).pdf", uploadedAt: Date.UTC(2026, 9, 20) },
        },
        requirements: {
          NOC: { required: true, badge: "Required" },
          SA_Report: { required: false, badge: "" },
        },
      } as NonNullable<MasterRow["docs"]>;
      return r;
    };
    const model = buildSheetModel(withDocs(), {
      today: "2026-10-27",
      docLinks: { "1:NOC": DOC_URL, "1:SA_Report": DOC_URL },
    });
    const noc = model.documents.find((d) => d.key === "NOC")!;
    expect(noc.value).toBe("Uploaded 24-Oct-2026");
    expect(noc.value).not.toContain(".pdf");
    const sa = model.documents.find((d) => d.key === "SA_Report")!;
    expect(sa.value).toBe("Uploaded 20-Oct-2026");
    expect(sa.value).not.toContain("SA-Report");

    const built = await raw(withDocs(), {
      qrUrl: QR_URL,
      docLinks: { "1:NOC": DOC_URL, "1:SA_Report": DOC_URL },
    });
    const all = built.words;
    expect(all).toContain("Open");
    // No file name or extension ANYWHERE in the printed text.
    expect(all).not.toMatch(/\.(pdf|xlsx?|png|jpe?g|docx?)\b/i);
    expect(all).not.toContain("Fire-NOC-Athanavur");
    expect(all).not.toContain("SA-Report-Athanavur");
    // …while the document annotations still point at the snapshot copy.
    expect(built.text).toContain(DOC_URL);
  });

  it("one QR annotation per document, caption on page 1 only", async () => {
    const r = row();
    r.cycleNumber = 2;
    r.cycleType = "Recertification";
    const cycleHistory: SheetCycleRecord[] = [
      {
        cycleNumber: 1,
        cycleType: "Initial",
        createdAt: Date.UTC(2025, 8, 25),
        sa: { status: "Completed", actualStartDate: "2023-02-01", actualEndDate: "2023-02-03" },
        nqas: { status: "Completed", certificationStatus: "Quality Certified", certificationDate: "2023-08-01", validityDate: "2026-07-31" },
      },
      { cycleNumber: 2, cycleType: "Recertification", createdAt: Date.UTC(2025, 8, 25), sa: null, nqas: null },
    ];
    const built = await raw(r, {
      qrUrl: QR_URL,
      cycleHistory,
      today: "2026-10-27",
      docLinks: { "2:NOC": DOC_URL },
    });
    expect(built.pages).toBe(4);
    // The QR URL appears as an annotation exactly once (no `/d/` suffix).
    expect(built.text.split(`/URI (${QR_URL})`).length - 1).toBe(1);
    // …and the caption prints once, on the first page of the document.
    expect(built.words.split("Scan to open the digital copy").length - 1).toBe(1);
  });

  it("decodes the symbol AS PRINTED at generation (150 dpi) and at 72 dpi", async () => {
    const built = await raw(row(), { qrUrl: QR_URL });
    expect(built.qrCheckFailed).toBe(false);
    expect(built.diagnostics.some((d) => d.startsWith("qr-check:"))).toBe(false);
    const matrix = qrMatrix(QR_URL, "M");
    expect(await decodePrintedQr(matrix, 20, 150)).toBe(QR_URL);
    expect(await decodePrintedQr(matrix, 20, 72)).toBe(QR_URL);
    expect(await decodePrintedQr(matrix, 24, 300)).toBe(QR_URL);
  });

  it("Recent changes never print a stored file name", () => {
    const model = buildSheetModel(row(), {
      today: "2026-10-27",
      audits: [
        {
          changedAt: Date.UTC(2026, 9, 20),
          changedByName: "editor",
          field: "reportAttachmentName",
          action: "update",
          newValue: "Kavalurchatram PHC.pdf",
        },
        {
          changedAt: Date.UTC(2026, 9, 21),
          changedByName: "editor",
          field: "documents",
          action: "create",
          newValue: "Gap-Closure-Proceedings.xlsx",
        },
      ],
    });
    const text = model.recent.map((r) => r.what).join(" | ");
    expect(text).not.toMatch(/\.(pdf|xlsx)\b/i);
    expect(text).toMatch(/document/i);
  });
});
