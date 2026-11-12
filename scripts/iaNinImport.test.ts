/**
 * INTERNAL ASSESSMENT IMPORT — the NIN format (new) + the key format (old).
 *
 * Fixtures: the 10-row sample from the brief, spread over the same facilities
 * the other IA tests use, plus the edge rows each rule names (leading zero,
 * Excel number, scientific notation, unknown NIN, cross-check, outside blocks,
 * locked quarter, a swapped pair of columns).
 */

import { describe, expect, test } from "bun:test";

import {
  buildIaNinIndex,
  buildIaPreview,
  cleanIaNin,
  cleanIaRow,
  cleanIaScore,
  facilityIaKeysOf,
  formatFyQuarter,
  iaPreviewCoverage,
  mapIaHeaders,
  matchIaRowByNin,
  normalizeIaNin,
  type CleanIaRow,
  type IaFacility,
  type IaRole,
  type IaStoredQuarter,
} from "../src/lib/iaImport";
import {
  IA_NIN_HEADERS,
  IA_NIN_SAMPLE_TSV,
  iaDetectionLine,
  iaQuartersInRows,
  prepareIaRows,
  withDetectedIaHeader,
} from "../src/lib/iaWizard";
import { parsePastedHtml, parsePastedText, toParsedSheet } from "../src/lib/saqshamParse";
import { iaColumnsForTrackers, iaPreviewCells, iaPreviewHeaders, matchLabel } from "../src/lib/iaPreviewColumns";
import {
  buildIaTemplateCsv,
  buildQuarterTemplateWorkbook,
  TEMPLATE_HEADERS,
} from "../src/lib/iaReport";

/* --------------------------------------------------------------------------- */
/* Fixtures                                                                     */
/* --------------------------------------------------------------------------- */

const fac = (
  id: string,
  name: string,
  block: string,
  phc: string,
  facilityType: string,
  ninNumber?: string,
): IaFacility => ({
  id,
  name,
  block,
  phc,
  facilityType,
  facilityKeys: facilityIaKeysOf({ name, block, phc, facilityType }),
  ninNumber: ninNumber ?? null,
});

const FACILITIES: IaFacility[] = [
  fac("alangayam-chc", "Alangayam", "Alangayam", "Alangayam", "CHC", "4527324786"),
  fac("alangayam-hsc", "Alangayam HSC", "Alangayam", "Alangayam", "HWC HSC", "4527324787"),
  fac("mittur", "Mittur", "Alangayam", "Mittur", "PHC", "4527324788"),
  fac("punga", "Pungampattu Nadu", "Pudurnadu", "Pungampattu Nadu", "PHC", "4527324789"),
  fac("athan", "Athanavoor", "Pudurnadu", "Athanavoor", "PHC", "4527324790"),
  fac("annanagar", "Annanagar", "Vellore", "Annanagar", "UPHC", "4527324791"),
  fac("pachur", "Pachur", "Pachur", "Pachur", "CHC", "4527324792"),
  fac("valli-phc", "Vallipattu", "Vallipattu", "Vallipattu", "PHC", "4527324793"),
  fac("valli-hwc", "Vallipattu", "Vallipattu", "Vallipattu", "HWC HSC", "4527324794"),
  fac("kaniga", "Kaspa -B", "Madhanur", "Kaspa", "UHWC", "4527324795"),
];

const stored = (
  facilityId: string,
  fy: string,
  quarter: number,
  scores: { nqas?: number | null; kayakalp?: number | null; nqasRemark?: string | null } = {},
  lockedAt: number | null = null,
): IaStoredQuarter => ({
  facilityId,
  fy,
  quarter,
  nqasIaScore: scores.nqas ?? null,
  kayakalpIaScore: scores.kayakalp ?? null,
  ecoFriendlyScore: null,
  nqasRemark: scores.nqasRemark ?? null,
  kayakalpRemark: null,
  ecoRemark: null,
  lockedAt,
  updatedAt: 1,
});

const TODAY = "2026-10-28";

/** Parse the shared sample exactly as the paste step does. */
function sampleRows(): CleanIaRow[] {
  const sheet = parsePastedText(IA_NIN_SAMPLE_TSV);
  const prepared = prepareIaRows(sheet, mapOf(sheet.headers));
  return prepared.rows;
}

function mapOf(headers: readonly string[]): Record<IaRole, number | null> {
  const roles = mapIaHeaders(headers).roles;
  const out = {
    sno: null, nin: null, facilityKey: null, facilityName: null, block: null, phc: null,
    type: null, fy: null, quarter: null, nqasIa: null, kayakalpIa: null, ecoFriendly: null,
  } as Record<IaRole, number | null>;
  for (const [role, header] of Object.entries(roles)) {
    out[role as IaRole] = headers.indexOf(header as string);
  }
  return out;
}

/** CleanIaRow takes HEADER NAMES; those are the values mapIaHeaders returns. */
function rolesOf(headers: readonly string[]): Partial<Record<IaRole, string>> {
  return mapIaHeaders(headers).roles;
}

/* --------------------------------------------------------------------------- */
/* 1. Paste and upload give the same result                                     */
/* --------------------------------------------------------------------------- */

describe("new NIN format — paste and upload", () => {
  test("the sample parses 10 rows, 10 columns, one quarter, and the typo header maps", () => {
    const sheet = parsePastedText(IA_NIN_SAMPLE_TSV);
    expect(sheet.dataRows.length).toBe(10);
    expect(sheet.headers.length).toBe(10);
    expect(sheet.headers).toContain("NIN Number");
    const typos = mapIaHeaders(["Name of the faciltiy", "NIN Number", "NQAS IA Score"]).roles;
    expect(typos.facilityName).toBe("Name of the faciltiy");
    expect(typos.nin).toBe("NIN Number");
    expect(typos.nqasIa).toBe("NQAS IA Score");
    const rows = sampleRows();
    const quarters = iaQuartersInRows(rows);
    expect(quarters).toEqual([{ fy: "2025-26", q: 3, rows: 10, label: "Q3 2025-26" }]);
    expect(iaDetectionLine(sheet.dataRows.length, sheet.headers.length, quarters)).toBe(
      "Detected 10 rows · 10 columns · 1 quarter: Q3 2025-26",
    );
  });

  test("a pasted sheet and the same cells uploaded produce identical cleaned rows", () => {
    const matrix = [
      [...IA_NIN_HEADERS],
      ...IA_NIN_SAMPLE_TSV.split("\n").slice(1).map((line) => line.split("\t")),
    ];
    const uploaded = toParsedSheet("ia.xlsx", matrix);
    const pasted = parsePastedText(IA_NIN_SAMPLE_TSV);
    const a = prepareIaRows(pasted, mapOf(pasted.headers)).rows;
    const b = prepareIaRows(uploaded, mapOf(uploaded.headers)).rows;
    expect(a.length).toBe(b.length);
    expect(a.map((r) => [r.nin, r.fy, r.q, r.scores.nqas.value, r.scores.kayakalp.value])).toEqual(
      b.map((r) => [r.nin, r.fy, r.q, r.scores.nqas.value, r.scores.kayakalp.value]),
    );
  });

  test("an entirely blank Kayakalp column is ONE file-level line, not ten warnings", () => {
    const preview = buildIaPreview(sampleRows(), FACILITIES, [], { today: TODAY, recent: [] });
    expect(preview.fileWarnings).toContain("Kayakalp IA not reported in this file");
    expect(preview.fileWarnings.filter((w) => w.startsWith("Kayakalp"))).toHaveLength(1);
    expect(preview.rows.every((r) => r.cleaned.scores.kayakalp.value == null)).toBe(true);
  });

  test("the 0.85 cell in a percent column converts from a fraction, never becomes 0", () => {
    const rows = sampleRows();
    const last = rows[rows.length - 1];
    expect(last.nin).toBe("4527324795");
    expect(last.scores.nqas.value).toBe(85);
    expect(last.scores.nqas.chip).toBe("converted from fraction");
  });
});

/* --------------------------------------------------------------------------- */
/* 2. NIN cleaning                                                              */
/* --------------------------------------------------------------------------- */

describe("NIN cleaning", () => {
  test("digits survive spaces, hyphens and a leading zero typed as text", () => {
    expect(cleanIaNin(" 4527 324 786 ").value).toBe("4527324786");
    expect(cleanIaNin("4527-324-786").value).toBe("4527324786");
    expect(cleanIaNin("04527324786").error).toContain("expected 10");
    expect(cleanIaNin("0452732478").value).toBe("0452732478");
  });

  test("a NIN Excel stored as a number is padded and flagged amber", () => {
    const c = cleanIaNin(452732478);
    expect(c.value).toBe("0452732478");
    expect(c.padded).toBe(true);
    expect(c.error).toBeNull();
  });

  test("scientific notation names the fix; letters and wrong lengths are errors", () => {
    expect(cleanIaNin("4.52732E+09").error).toBe(
      "Excel changed this NIN. Format the NIN column as Text and paste again.",
    );
    expect(cleanIaNin("NIN45273").error).toContain("digits only");
    expect(cleanIaNin("123").padded).toBe(true);
    expect(cleanIaNin("").value).toBeNull();
    expect(cleanIaNin("").error).toBeNull();
    expect(normalizeIaNin(" 4527324786 ")).toBe("4527324786");
  });
});

/* --------------------------------------------------------------------------- */
/* 3. Matching by NIN + cross-check                                             */
/* --------------------------------------------------------------------------- */

describe("matching by NIN", () => {
  const index = buildIaNinIndex(FACILITIES);
  const row = (over: Partial<{ nin: string; key: string; name: string; block: string; phc: string; facilityType: string }>) => ({
    nin: over.nin ?? "",
    key: over.key ?? "",
    name: over.name ?? "",
    block: over.block ?? "",
    phc: over.phc ?? "",
    facilityType: over.facilityType ?? "",
  });

  test("an exact NIN is 100%, even when the name is spelled differently — held amber", () => {
    const m = matchIaRowByNin(
      row({ nin: "4527324786", name: "Alangayam Urban", block: "Alangayam", phc: "Alangayam", facilityType: "CHC" }),
      FACILITIES,
      index,
    );
    expect(m.match).toMatchObject({ status: "matched", facilityId: "alangayam-chc", viaNin: true, confidence: 100 });
    expect(m.crossCheck).toContain("NIN belongs to Alangayam (Alangayam/Alangayam), file says name “Alangayam Urban”");
    expect(m.unknownNin).toBe(false);
  });

  test("agreeing identity fields produce no cross-check", () => {
    const m = matchIaRowByNin(
      row({ nin: "4527324786", name: "Alangayam", block: "Alangayam", phc: "Alangayam", facilityType: "CHC" }),
      FACILITIES,
      index,
    );
    expect(m.crossCheck).toBeNull();
    expect(m.match.facilityId).toBe("alangayam-chc");
  });

  test("an unknown NIN is red, with same-type suggestions that are never auto-applied", () => {
    const m = matchIaRowByNin(
      row({ nin: "9999999999", name: "Pachur", block: "Pachur", phc: "Pachur", facilityType: "CHC" }),
      FACILITIES,
      index,
    );
    expect(m.match.status).toBe("unmatched");
    expect(m.match.facilityId).toBeNull();
    expect(m.unknownNin).toBe(true);
    expect(m.suggestionIds).toContain("pachur");
  });

  test("a NIN outside the editor's blocks is grey, not red", () => {
    const m = matchIaRowByNin(
      row({ nin: "4527324786", name: "Alangayam", facilityType: "CHC" }),
      [],
      buildIaNinIndex(FACILITIES.filter((f) => f.ninNumber !== "4527324786")),
      [],
      {},
      new Set(["4527324786"]),
    );
    expect(m.outsideBlocks).toBe(true);
    expect(m.unknownNin).toBe(false);
    expect(m.match.status).toBe("unmatched");
  });

  test("NIN wins over the old key when a file carries both", () => {
    const pachurKey = facilityIaKeysOf({ name: "Pachur", block: "Pachur", phc: "Pachur", facilityType: "CHC" })[0];
    const m = matchIaRowByNin(
      row({ nin: "4527324786", key: pachurKey, name: "Pachur", facilityType: "CHC" }),
      FACILITIES,
      index,
    );
    expect(m.match.facilityId).toBe("alangayam-chc");
    expect(m.crossCheck).not.toBeNull();
  });
});

/* --------------------------------------------------------------------------- */
/* 4. Preview: previous → now, partial files, blank protection                  */
/* --------------------------------------------------------------------------- */

describe("preview previous → now", () => {
  test("the 10 sample rows match cleanly and are Ready", () => {
    const preview = buildIaPreview(sampleRows(), FACILITIES, [], { today: TODAY, recent: [] });
    expect(preview.rows).toHaveLength(10);
    expect(preview.rows.every((r) => r.facilityId != null)).toBe(true);
    expect(preview.rows.every((r) => r.state === "ready")).toBe(true);
    expect(preview.summary.newCount).toBe(10);
    expect(preview.summary.errors).toBe(0);
  });

  test("facilities not in the file are untouched", () => {
    const rows = sampleRows().slice(0, 2);
    const preview = buildIaPreview(rows, FACILITIES, [], { today: TODAY, recent: [] });
    expect(preview.summary.missing.length).toBe(8);
    expect(preview.summary.missing).not.toContain("Alangayam HSC");
    expect(preview.summary.missing).toContain("Pachur");
  });

  test("a second paste of the same text is No change on every row", () => {
    const first = buildIaPreview(sampleRows(), FACILITIES, [], { today: TODAY, recent: [] });
    const recent: IaStoredQuarter[] = first.rows
      .filter((r) => r.facilityId && r.fy && r.q)
      .map((r) =>
        stored(r.facilityId!, r.fy!, r.q!, {
          nqas: r.cleaned.scores.nqas.value,
          nqasRemark: r.cleaned.scores.nqas.remark,
        }),
      );
    const second = buildIaPreview(sampleRows(), FACILITIES, [], { today: TODAY, recent });
    expect(second.rows.every((r) => r.state === "no_change")).toBe(true);
    expect(second.summary.willChange).toBe(0);
    expect(second.summary.changedCount).toBe(0);
  });

  test("a blank cell never clears a stored value and is not an error", () => {
    const row: CleanIaRow = cleanIaRow(
      {
        "NIN Number": "4527324792",
        Block: "Pachur",
        PHC: "Pachur",
        "Name of the facility": "Pachur",
        Type: "CHC",
        "Financial Year": "2025-26",
        Quarter: "Q3",
        "NQAS IA Score": "",
        "Kayakalp IA Score": "",
      },
      rolesOf(["NIN Number", "Block", "PHC", "Name of the facility", "Type", "Financial Year", "Quarter", "NQAS IA Score", "Kayakalp IA Score"]),
      { rowNo: 1, sourceRowNo: 2 },
    );
    const preview = buildIaPreview([row], FACILITIES, [], {
      today: TODAY,
      recent: [stored("pachur", "2025-26", 3, { nqas: 70 })],
    });
    expect(preview.rows[0].state).toBe("no_change");
    expect(preview.rows[0].current.nqas).toBe(70);
    expect(preview.rows[0].change.nqas).toBe("none");
  });

  test("a cross-checked NIN is held amber until confirmed, then becomes Ready", () => {
    const sheet = parsePastedText(IA_NIN_SAMPLE_TSV);
    const matrix = [...sheet.rows];
    // Change row 1's name to a spelling the master does not use.
    matrix[1] = [...matrix[1]];
    matrix[1][4] = "Alangayam Urban";
    const edited = toParsedSheet("edited", matrix);
    const rows = prepareIaRows(edited, mapOf(edited.headers)).rows;
    const held = buildIaPreview(rows, FACILITIES, [], { today: TODAY, recent: [] });
    const amber = held.rows.find((r) => r.nin === "4527324786")!;
    expect(amber.state).toBe("needs_review");
    expect(amber.include).toBe(false);
    expect(amber.needsNinConfirm).toBe(true);
    const confirmed = buildIaPreview(rows, FACILITIES, [], {
      today: TODAY,
      recent: [],
      confirmedNin: { [amber.rowNo]: true },
    });
    expect(confirmed.rows.find((r) => r.nin === "4527324786")!.state).toBe("ready");
  });

  test("a preview edit fixes an out-of-range score", () => {
    const row: CleanIaRow = cleanIaRow(
      {
        "NIN Number": "4527324792",
        Block: "Pachur",
        PHC: "Pachur",
        "Name of the facility": "Pachur",
        Type: "CHC",
        "Financial Year": "2025-26",
        Quarter: "Q3",
        "NQAS IA Score": "105",
        "Kayakalp IA Score": "",
      },
      rolesOf(["NIN Number", "Block", "PHC", "Name of the facility", "Type", "Financial Year", "Quarter", "NQAS IA Score", "Kayakalp IA Score"]),
      { rowNo: 1, sourceRowNo: 2 },
    );
    const before = buildIaPreview([row], FACILITIES, [], { today: TODAY, recent: [] });
    expect(before.rows[0].state).toBe("error");
    const after = buildIaPreview([row], FACILITIES, [], {
      today: TODAY,
      recent: [],
      scoreEdits: { 1: { nqas: "95" } },
    });
    expect(after.rows[0].state).toBe("ready");
    expect(after.rows[0].cleaned.scores.nqas.value).toBe(95);
    expect(after.rows[0].edited).toEqual(["nqas"]);
    expect(after.rows[0].chips).toContain("Edited in the preview");
  });

  test("duplicate NIN rows are both Needs review, the last non-blank wins", () => {
    const first = cleanIaRow(
      { "NIN Number": "4527324792", "Name of the facility": "Pachur", Type: "CHC", "Financial Year": "2025-26", Quarter: "Q3", "NQAS IA Score": "74.5" },
      rolesOf(["NIN Number", "Name of the facility", "Type", "Financial Year", "Quarter", "NQAS IA Score"]),
      { rowNo: 1, sourceRowNo: 2 },
    );
    const second = cleanIaRow(
      { "NIN Number": "4527324792", "Name of the facility": "Pachur", Type: "CHC", "Financial Year": "2025-26", Quarter: "Q3", "NQAS IA Score": "76.5" },
      rolesOf(["NIN Number", "Name of the facility", "Type", "Financial Year", "Quarter", "NQAS IA Score"]),
      { rowNo: 2, sourceRowNo: 3 },
    );
    const preview = buildIaPreview([first, second], FACILITIES, [], { today: TODAY, recent: [] });
    expect(preview.rows.every((r) => r.state === "needs_review")).toBe(true);
    expect(preview.rows.some((r) => r.cleaned.scores.nqas.value === 76.5)).toBe(true);
  });

  test("outside-block rows are grey Skipped and excluded", () => {
    const rows = sampleRows();
    const preview = buildIaPreview(rows, FACILITIES.filter((f) => f.ninNumber !== "4527324786"), [], {
      today: TODAY,
      recent: [],
      outsideNins: new Set(["4527324786"]),
    });
    const outside = preview.rows.find((r) => r.nin === "4527324786")!;
    expect(outside.state).toBe("skipped");
    expect(outside.outsideBlocks).toBe(true);
    expect(outside.include).toBe(false);
    expect(preview.summary.outsideBlocks).toBe(1);
  });

  test("a locked stored quarter is surfaced on the row", () => {
    const preview = buildIaPreview(sampleRows().slice(0, 1), FACILITIES, [], {
      today: TODAY,
      recent: [stored("alangayam-chc", "2025-26", 3, { nqas: 60 }, 1234)],
    });
    expect(preview.rows[0].locked).toBe(true);
    expect(preview.rows[0].state).toBe("ready"); // updated, but the lock is an approve-time gate
  });

  test("swapped NQAS/Kayakalp columns raise ONE file-level warning", () => {
    const rows = FACILITIES.slice(0, 4).map((f, i) =>
      cleanIaRow(
        {
          "NIN Number": f.ninNumber ?? "",
          Block: f.block,
          PHC: f.phc,
          "Name of the facility": f.name,
          Type: f.facilityType,
          "Financial Year": "2025-26",
          Quarter: "Q3",
          "NQAS IA Score": String(40 + i),
          "Kayakalp IA Score": String(85 + i),
        },
        rolesOf(["NIN Number", "Block", "PHC", "Name of the facility", "Type", "Financial Year", "Quarter", "NQAS IA Score", "Kayakalp IA Score"]),
        { rowNo: i + 1, sourceRowNo: i + 2 },
      ),
    );
    const preview = buildIaPreview(rows, FACILITIES, [], { today: TODAY, recent: [] });
    expect(preview.fileWarnings).toContain("NQAS and Kayakalp look swapped — check the two score columns");
  });

  test("coverage counts NQAS and Kayakalp per block, blank never a zero", () => {
    const rows = sampleRows().filter((r) => r.nin !== "4527324786");
    const preview = buildIaPreview(rows, FACILITIES, [], { today: TODAY, recent: [] });
    const cov = preview.coverage[0];
    expect(cov.label).toBe("Q3 2025-26");
    expect(cov.total).toBe(FACILITIES.length);
    // "New PHC" has no score, so only 8 of the 9 rows carry an NQAS value.
    expect(cov.nqas).toBe(8);
    expect(cov.kayakalp).toBe(0);
    const alangayam = cov.blocks.find((b) => b.block === "Alangayam")!;
    // Alangayam block holds the CHC, the HSC and Mittur PHC.
    expect(alangayam.total).toBe(3);
    expect(alangayam.nqas).toBe(2);
  });

  test("iaPreviewCoverage is the same function the panel reads", () => {
    const preview = buildIaPreview(sampleRows(), FACILITIES, [], { today: TODAY, recent: [] });
    expect(iaPreviewCoverage(preview.rows, FACILITIES)).toEqual(preview.coverage);
  });

  test("the sparkline is the four quarters ending at the row's period", () => {
    const rows = sampleRows().slice(0, 1);
    const preview = buildIaPreview(rows, FACILITIES, [], {
      today: TODAY,
      recent: [
        stored("alangayam-chc", "2025-26", 1, { nqas: 60 }),
        stored("alangayam-chc", "2025-26", 2, { nqas: 65 }),
      ],
    });
    expect(preview.rows[0].trend.map((p) => p.label)).toEqual([
      "Q4 2024-25",
      "Q1 2025-26",
      "Q2 2025-26",
      "Q3 2025-26",
    ]);
    expect(preview.rows[0].trend.map((p) => p.nqas)).toEqual([null, 60, 65, 72]);
  });
});

/* --------------------------------------------------------------------------- */
/* 5. Old format and score rules                                                */
/* --------------------------------------------------------------------------- */

describe("old format and scores", () => {
  test("the old key format still imports", () => {
    const headers = ["S. No", "Facility for Formula", "Block", "PHC", "Name of the faciltiy", "Type", "Financial Year", "Quarter", "NQAS IA Score"];
    const key = facilityIaKeysOf({ name: "Pachur", block: "Pachur", phc: "Pachur", facilityType: "CHC" })[0];
    const sheet = toParsedSheet("old.xlsx", [headers, ["1", key, "Pachur", "Pachur", "Pachur", "CHC", "2025-26", "Q3", "69.0"]]);
    const rows = prepareIaRows(sheet, mapOf(headers)).rows;
    const preview = buildIaPreview(rows, FACILITIES, [], { today: TODAY, recent: [] });
    expect(rows[0].nin).toBeNull();
    expect(preview.rows[0].facilityId).toBe("pachur");
    expect(preview.rows[0].cleaned.scores.nqas.value).toBe(69);
    expect(preview.rows[0].match.viaNin).not.toBe(true);
    expect(preview.rows[0].chips).toContain("Matched without a NIN (old key)");
    expect(matchLabel(preview.rows[0])).toContain("No NIN");
  });

  test("scores: 69.0, 95.77, a remark, 105 and a fraction", () => {
    expect(cleanIaScore("69.0").value).toBe(69);
    expect(cleanIaScore("95.77").value).toBe(95.77);
    expect(cleanIaScore("New PHC").value).toBeNull();
    expect(cleanIaScore("New PHC").chip).toBe("New facility");
    expect(cleanIaScore("105").error).toBe(true);
    expect(cleanIaScore("105").value).toBe(105);
    expect(cleanIaScore("0.85", true).value).toBe(85);
    expect(cleanIaScore("0.85", false).value).toBe(0.85);
  });

  test("NIN padded rows carry the amber note", () => {
    const headers = ["NIN Number", "Name of the facility", "Type", "Financial Year", "Quarter", "NQAS IA Score"];
    const sheet = toParsedSheet("padded", [headers, ["452732478", "Alangayam HSC", "HWC HSC", "2025-26", "Q3", "70"]]);
    const rows = prepareIaRows(sheet, mapOf(headers)).rows;
    expect(rows[0].nin).toBe("0452732478");
    expect(rows[0].ninPadded).toBe(true);
    const preview = buildIaPreview(rows, FACILITIES, [], { today: TODAY, recent: [] });
    expect(preview.rows[0].chips).toContain("NIN padded; format the column as Text");
  });

  test("a headerless 10-column paste is detected by its NIN and Q3 cells", () => {
    const headerless = parsePastedText("1\t4527324786\tAlangayam\tAlangayam\tAlangayam\tCHC\t2025-26\tQ3\t72\t");
    expect(headerless.rows[0]).toHaveLength(10);
    const fixed = withDetectedIaHeader(headerless);
    expect(fixed.headers).toEqual([...IA_NIN_HEADERS]);
    expect(fixed.dataRows).toHaveLength(1);
    const rows = prepareIaRows(fixed, mapOf(fixed.headers)).rows;
    expect(rows[0].nin).toBe("4527324786");
    expect(rows[0].q).toBe(3);
  });

  test("an HTML-table clipboard parses to the same sheet", () => {
    const html = `<table><tr><th>NIN Number</th><th>Block</th><th>PHC</th><th>Name of the facility</th><th>Type</th><th>Financial Year</th><th>Quarter</th><th>NQAS IA Score</th><th>Kayakalp IA Score</th></tr><tr><td>4527324786</td><td>Alangayam</td><td>Alangayam</td><td>Alangayam</td><td>CHC</td><td>2025-26</td><td>Q3</td><td>72</td><td>&nbsp;</td></tr></table>`;
    const sheet = parsePastedHtml(html);
    expect(sheet.headers).toContain("NIN Number");
    expect(sheet.dataRows).toHaveLength(1);
    const rows = prepareIaRows(sheet, mapOf(sheet.headers)).rows;
    expect(rows[0].nin).toBe("4527324786");
    expect(rows[0].scores.nqas.value).toBe(72);
    expect(rows[0].scores.kayakalp.value).toBeNull();
  });
});

/* --------------------------------------------------------------------------- */
/* 6. Contract: header i = cell i (preview + report)                            */
/* --------------------------------------------------------------------------- */

describe("preview and report contract", () => {
  test("every preview header has exactly one cell and the NIN is column 3", () => {
    const columns = iaColumnsForTrackers(["nqas", "kayakalp"], { includeKey: false });
    const headers = iaPreviewHeaders(columns);
    expect(headers[0]).toBe("Include");
    expect(headers[2]).toBe("NIN");
    const rows = buildIaPreview(sampleRows(), FACILITIES, [], { today: TODAY, recent: [] }).rows;
    for (const row of rows) {
      const cells = iaPreviewCells(row, 0, columns);
      expect(cells.length).toBe(headers.length);
      expect(String(cells[2])).toBe(row.nin ?? "-");
    }
    // The exports drop the UI-only Include column; every remaining column is
    // exportable, so the workbook header still sits above cell i.
    const exported = columns.filter((c) => c.exportable);
    const body = iaPreviewCells(rows[0], 0, exported);
    expect(body.length).toBe(exported.length);
  });

  test("the quarter label is the real one from the file", () => {
    expect(formatFyQuarter("2025-26", 3)).toBe("Q3 2025-26");
    const rows = sampleRows();
    expect(rows[0].fy).toBe("2025-26");
    expect(rows[0].q).toBe(3);
  });
});

/* --------------------------------------------------------------------------- */
/* 7. Templates                                                                 */
/* --------------------------------------------------------------------------- */

describe("NIN templates", () => {
  test("the Excel template has the NIN headers, NIN as TEXT and every facility", () => {
    const wb = buildQuarterTemplateWorkbook("2025-26", 3, FACILITIES);
    const ws = wb.getWorksheet("IA scores")!;
    const headers = (ws.getRow(1).values as (string | undefined)[]).slice(1);
    expect(headers).toEqual([...TEMPLATE_HEADERS]);
    expect(ws.getRow(2).getCell(2).value).toBe("4527324786");
    expect(ws.getRow(2).getCell(2).numFmt).toBe("@");
    // Header + one row per facility, no sample/dummy rows.
    expect(ws.actualRowCount).toBe(FACILITIES.length + 1);
    expect(wb.getWorksheet("Lists")).toBeTruthy();
    expect(wb.getWorksheet("Instructions")).toBeTruthy();
  });

  test("the CSV template is UTF-8 with BOM and the same 10 columns", () => {
    const csv = buildIaTemplateCsv("2025-26", 3, FACILITIES);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const [header, first] = csv.replace(/^\uFEFF/, "").trim().split("\r\n");
    expect(header.split(",")).toEqual([...TEMPLATE_HEADERS]);
    expect(first.split(",")[0]).toBe("1");
    expect(first.split(",")[1]).toBe("4527324786");
  });

  test("the NIN index only contains valid, in-scope facilities", () => {
    const index = buildIaNinIndex([...FACILITIES, fac("no-nin", "No NIN", "B", "P", "PHC")]);
    expect(index.size).toBe(FACILITIES.length);
    expect(index.get("4527324786")?.[0].id).toBe("alangayam-chc");
  });
});
