/**
 * REPORT ALIGNMENT — the automated contract that makes the
 * "header ↔ column-value mismatch" bug impossible to reintroduce.
 *
 * The bug being pinned: the "Dashboard summary — current filter" export passed
 * `FILTERED_HEADERS.slice(1)` (10 labels, "S.No" dropped) as the header while
 * the body rows still carried 11 cells. Every value printed one column to the
 * right of its own header and the last value fell off the page.
 *
 * What this file asserts, for the UI model, the Excel, the PDF, the CSV and
 * the print view alike:
 *   1. header count === body-cell count, in the same order, for every row;
 *   2. cell *i* is read from `columns[i].key` (never by position);
 *   3. the five golden facilities — Poongulam included — land under their own
 *      headers in all four artefacts;
 *   4. formats: scores with SCORE_DECIMALS, dates DD-MMM-YYYY, blanks "—";
 *   5. edge cases: 0 / 1 / 157 rows, blanks, very long names, Tamil text,
 *      a hidden column, a reordered column, a multi-page PDF header repeat;
 *   6. no user-visible header says "Pipeline Status" any more, and no two
 *      visible columns share a label.
 *
 * Run: bun test ./scripts
 */
import { describe, expect, it } from "bun:test";
import ExcelJS from "exceljs";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";

import {
  DASHBOARD_FILTERED_COLUMNS,
  DASHBOARD_TABLES,
  ELIGIBLE_PENDING_HEADERS,
  FACILITY_CURRENT_STATUS_LABEL,
  type FilteredReportRow,
} from "../src/lib/dashboardTables";
import {
  MASTER_COLUMNS,
  COLUMN_BY_KEY,
  resolveLabels,
} from "../src/lib/masterColumns";
import { buildRawFacilityGrid } from "../src/lib/pivotExport";
import { TRACKER_COLUMN_LABELS } from "../src/lib/trackerColumns";
import { withOverrides } from "../src/lib/tableHeaders";
import { buildTablePdf, buildTableWorkbook } from "../src/lib/exportTable";
import {
  BLANK,
  SCORE_DECIMALS,
  buildReportCsv,
  buildReportPrintHtml,
  formatReportDate,
  formatReportScore,
  generatedStamp,
  reportCell,
  reportColumnAligns,
  reportColumnWidths,
  reportHeaders,
  reportRows,
  reportSubtitle,
  setTypeMismatchHandler,
  type ReportColumn,
} from "../src/lib/reportColumns";

/* --------------------------------------------------------------------------- */
/* Fixtures — the five golden facilities                                        */
/* --------------------------------------------------------------------------- */

/** The row from the bug report, with every value the user listed. */
const poongulam: FilteredReportRow = {
  facility: {
    name: "Poongulam",
    facilityType: "HWC HSC",
    block: "Alangayam",
    phc: "Alangayam",
    eligibility: "Eligible",
  },
  sa: { scorePercent: 84 },
  nqas: { scorePercent: 84.67, validityDate: "2027-07-20" },
  view: { currentStatus: "Recertification Due", docStage: "Docx in SQAU login" },
};

const GOLDEN: FilteredReportRow[] = [
  poongulam,
  {
    // Blanks everywhere a value can be missing.
    facility: {
      name: "Ariyur HSC",
      facilityType: null,
      block: "Alangayam",
      phc: "Ariyur",
      eligibility: null,
    },
    sa: null,
    nqas: { scorePercent: null, validityDate: null },
    view: { currentStatus: "SA Not Yet Initiated", docStage: null },
  },
  {
    // Tamil text + a very long name (must not shift or truncate a neighbour).
    facility: {
      name: "மேட்டூர் அரசு மருத்துவமனை மற்றும் முதன்மை சுகாதார நிலையம் (கூடுதல் பிரிவு)",
      facilityType: "UPHC",
      block: "Mettur",
      phc: "Mettur",
      eligibility: "Eligible",
    },
    sa: { scorePercent: 0 },
    nqas: { scorePercent: 100, validityDate: "2026-10-16" },
    view: { currentStatus: "Certified — Surveillance Due", docStage: "NA Completed & Awaiting Results" },
  },
  {
    facility: {
      name: "Kandhili",
      facilityType: "PHC",
      block: "Kandhili",
      phc: "Kandhili",
      eligibility: "Not Eligible (In-Eligible)",
    },
    sa: { scorePercent: 61.5 },
    nqas: { scorePercent: 70, validityDate: "2029-01-05" },
    view: { currentStatus: "Not Eligible", docStage: "Docx Pending at Facility" },
  },
  {
    facility: {
      name: "Thiriyalam",
      facilityType: "CHC",
      block: "Jolarpettai",
      phc: "Pudupettai",
      eligibility: "Facility (Future Candidate)",
    },
    sa: { scorePercent: 88.125 },
    nqas: { scorePercent: 92.5, validityDate: "2028-03-31" },
    view: { currentStatus: "Deferred — Cooling Period", docStage: "Docx forwarded to NHSRC" },
  },
];

/** Independently computed expectations, keyed by COLUMN KEY (not by index) —
 *  this is what proves cell *i* comes from `columns[i].key`. */
const POONGULAM_BY_KEY: Record<string, string | number | null> = {
  sno: 1,
  facility: "Poongulam",
  type: "HWC HSC",
  block: "Alangayam",
  phc: "Alangayam",
  currentStatus: "Recertification Due",
  eligibility: "Eligible",
  saScore: "84.00",
  certScore: "84.67",
  validityEnds: "20-Jul-2027",
  docStatus: "Docx in SQAU login",
};

const visible = <Row,>(columns: readonly ReportColumn<Row>[]) =>
  columns.filter((c) => c.exportable);

const dir = mkdtempSync(join(tmpdir(), "nqas-report-"));
process.on("exit", () => rmSync(dir, { recursive: true, force: true }));

/* --------------------------------------------------------------------------- */
/* PDF + CSV readers                                                            */
/* --------------------------------------------------------------------------- */

/** One drawn table cell: its geometry plus the text inside it. */
type PdfCell = { x: number; y: number; w: number; text: string };

/**
 * Extract the table from real PDF bytes.
 *
 * `jspdf-autotable` draws every cell as a rectangle (`x y w h re f`) followed
 * by the cell's text operands. Walking the content stream in order therefore
 * gives each cell its own geometry AND its own text — so a test can assert
 * that the header cell and the data cell of a column occupy the SAME x band,
 * which is exactly "every header sits above its own value".
 *
 * Wrapped cells (a header too narrow for its label) emit a second text operand
 * without a new rectangle; the fragments are joined back into one cell, so the
 * label still reads as one string.
 */
function extractPdfCells(raw: string): PdfCell[] {
  const token = /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+re|\(((?:\\.|[^()\\])*)\)\s*Tj/g;
  const cells: PdfCell[] = [];
  let current: PdfCell | null = null;
  for (const m of raw.matchAll(token)) {
    if (m[1] !== undefined) {
      current = {
        x: Number(m[1]),
        y: Number(m[2]),
        w: Number(m[3]),
        text: "",
      };
      cells.push(current);
    } else if (current && m[5] !== undefined) {
      const fragment = m[5].replace(/\\([()\\])/g, "$1");
      current.text = current.text ? `${current.text} ${fragment}` : fragment;
    }
  }
  return cells;
}

/** The drawn table of ONE page's content stream, top to bottom. */
function extractPdfRows(stream: string): string[][] {
  const rows = new Map<string, PdfCell[]>();
  for (const cell of extractPdfCells(stream)) {
    const key = cell.y.toFixed(2);
    rows.set(key, [...(rows.get(key) ?? []), cell]);
  }
  return [...rows.values()]
    .sort((a, b) => b[0].y - a[0].y)
    .map((row) => [...row].sort((a, b) => a.x - b.x).map((c) => c.text));
}

/** Every page's drawn table. Each page has its own content stream, so pages
 *  are split apart before rows are grouped (two pages share y coordinates). */
function extractPdfPages(raw: string): string[][][] {
  return raw
    .split("endstream")
    .map((chunk) => extractPdfRows(chunk))
    .filter((rows) => rows.length > 0);
}

/** Minimal RFC-4180 reader so a quoted cell containing a comma stays one cell. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          value += '"';
          i++;
        } else quoted = false;
      } else value += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(value);
      value = "";
    } else value += ch;
  }
  out.push(value);
  return out;
}

/* --------------------------------------------------------------------------- */
/* 1 — the contract: header count === cell count, cell i from columns[i].key     */
/* --------------------------------------------------------------------------- */

describe("header ↔ value contract", () => {
  it("keeps the header exactly as long as every body row (0, 1 and 5 rows)", () => {
    const headers = reportHeaders(DASHBOARD_FILTERED_COLUMNS);
    for (const rows of [[], [poongulam], GOLDEN]) {
      const body = reportRows(DASHBOARD_FILTERED_COLUMNS, rows);
      expect(body.length).toBe(rows.length);
      for (const row of body) expect(row.length).toBe(headers.length);
    }
  });

  it("reads cell i from columns[i].key — never by position", () => {
    const [row] = reportRows(DASHBOARD_FILTERED_COLUMNS, [poongulam]);
    visible(DASHBOARD_FILTERED_COLUMNS).forEach((column, i) => {
      // The expectation is derived from the column KEY, so an off-by-one in
      // the row builder cannot satisfy this test.
      expect(row[i]).toBe(POONGULAM_BY_KEY[column.key]);
    });
  });

  it("drops a hidden column from the header AND from the rows together", () => {
    const columns: ReportColumn<FilteredReportRow>[] = DASHBOARD_FILTERED_COLUMNS.map(
      (c) => (c.key === "block" ? { ...c, exportable: false } : c),
    );
    const headers = reportHeaders(columns);
    const [row] = reportRows(columns, [poongulam]);
    expect(headers).not.toContain("Block");
    expect(row.length).toBe(headers.length);
    expect(row[headers.indexOf("PHC")]).toBe("Alangayam");
    expect(row[headers.indexOf("Type")]).toBe("HWC HSC");
  });

  it("keeps a reordered column's own header above its own values", () => {
    const swapped = [...DASHBOARD_FILTERED_COLUMNS];
    const i = swapped.findIndex((c) => c.key === "saScore");
    const j = swapped.findIndex((c) => c.key === "certScore");
    [swapped[i], swapped[j]] = [swapped[j], swapped[i]];
    const headers = reportHeaders(swapped);
    const [row] = reportRows(swapped, [poongulam]);
    expect(row[headers.indexOf("SA score %")]).toBe("84.00");
    expect(row[headers.indexOf("Certified score %")]).toBe("84.67");
  });

  it("holds for every dashboard table in the registry (0, 1 and 5 rows)", () => {
    for (const table of DASHBOARD_TABLES) {
      for (const count of [0, 1, 5]) {
        const items = Array.from({ length: count }, (_, i) => table.sample(i));
        const rows = table.buildRows(items as never[]);
        expect(rows.length).toBe(count);
        for (const row of rows) {
          expect({ table: table.name, width: row.length }).toEqual({
            table: table.name,
            width: table.headers.length,
          });
        }
      }
    }
  });
});

/* --------------------------------------------------------------------------- */
/* 2 — formats (one constant, one glyph, one date format)                       */
/* --------------------------------------------------------------------------- */

describe("formats everywhere", () => {
  it("prints scores with SCORE_DECIMALS and dates as DD-MMM-YYYY", () => {
    expect(SCORE_DECIMALS).toBe(2);
    expect(formatReportScore(84)).toBe("84.00");
    expect(formatReportScore(84.67)).toBe("84.67");
    expect(formatReportScore(0)).toBe("0.00");
    expect(formatReportScore(null)).toBe(BLANK);
    expect(formatReportDate("2027-07-20")).toBe("20-Jul-2027");
    expect(formatReportDate(null)).toBe(BLANK);
  });

  it("prints the blank glyph for every missing golden value", () => {
    const headers = reportHeaders(DASHBOARD_FILTERED_COLUMNS);
    const [, ariyur] = reportRows(DASHBOARD_FILTERED_COLUMNS, GOLDEN);
    expect(ariyur[headers.indexOf("Type")]).toBe(BLANK);
    expect(ariyur[headers.indexOf("Eligibility")]).toBe(BLANK);
    expect(ariyur[headers.indexOf("SA score %")]).toBe(BLANK);
    expect(ariyur[headers.indexOf("Certified score %")]).toBe(BLANK);
    expect(ariyur[headers.indexOf("Validity ends")]).toBe(BLANK);
    expect(ariyur[headers.indexOf("Documents status")]).toBe(BLANK);
  });

  it("renders a mistyped value as the blank glyph and warns (instead of shifting)", () => {
    const messages: string[] = [];
    setTypeMismatchHandler((m) => messages.push(m));
    try {
      const broken: ReportColumn<FilteredReportRow> = {
        key: "saScore",
        label: "SA score %",
        type: "score",
        align: "right",
        width: 80,
        exportable: true,
        // A string in a score column used to land silently one column over.
        raw: () => "84",
      };
      expect(reportCell(broken, poongulam, 0)).toBe(BLANK);
      expect(messages.length).toBe(1);
      expect(messages[0]).toContain("saScore");
    } finally {
      setTypeMismatchHandler(null);
    }
  });

  it("states the filters, the count and the generated stamp in IST", () => {
    const stamp = generatedStamp(new Date(Date.UTC(2026, 9, 16, 1, 8)));
    expect(stamp).toBe("16-Oct-2026 06:38 IST");
    const now = new Date(Date.UTC(2026, 9, 16, 1, 8));
    // A filtered subset names every filter that produced it…
    expect(reportSubtitle({ shown: 5, total: 157, filters: ["Block = Alangayam"], now })).toBe(
      "Filters: Block = Alangayam · Showing 5 of 157 facilities · Generated 16-Oct-2026 06:38 IST",
    );
    // …and an unfiltered report says so instead of listing nothing.
    expect(reportSubtitle({ shown: 157, total: 157, now })).toBe(
      "No filters (all 157 facilities) · Showing 157 of 157 facilities · Generated 16-Oct-2026 06:38 IST",
    );
  });
});

/* --------------------------------------------------------------------------- */
/* 3 — Excel (read back with ExcelJS)                                           */
/* --------------------------------------------------------------------------- */

describe("Excel export", () => {
  const sheetPath = () => join(dir, "filtered.xlsx");

  /** Build the workbook exactly as the Download menu does (title band +
   *  subtitle), write it to disk and read it back with ExcelJS. */
  async function readBack(rows: FilteredReportRow[], meta?: { title: string; subtitle: string }) {
    const headers = reportHeaders(DASHBOARD_FILTERED_COLUMNS);
    const body = reportRows(DASHBOARD_FILTERED_COLUMNS, rows);
    const wb = await buildTableWorkbook("Facility list", headers, body, meta);
    const path = sheetPath();
    writeFileSync(path, Buffer.from(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer));
    const excel = new ExcelJS.Workbook();
    await excel.xlsx.readFile(path);
    const ws = excel.worksheets[0];
    /** ExcelJS pads rows (1-based) and leaves holes for empty cells — read a
     *  fixed grid so a missing cell is an empty string, never a shorter row. */
    const rowCells = (rowNumber: number) =>
      Array.from({ length: headers.length }, (_, i) => {
        const v = ws.getRow(rowNumber).getCell(i + 1).value;
        return v == null ? "" : String(v);
      });
    return { headers, body, ws, rowCells, headerRow: meta ? 3 : 1 };
  }

  it("writes the header row and the data rows from the same columns[]", async () => {
    const { headers, body, ws, rowCells, headerRow } = await readBack(GOLDEN);
    // Without a title band the header stays row 1 (the app's data convention).
    expect(headerRow).toBe(1);
    expect(rowCells(1)).toEqual(headers);
    expect(ws.rowCount).toBe(GOLDEN.length + 1);
    for (let r = 0; r < GOLDEN.length; r++) {
      const cells = rowCells(r + 2);
      expect(cells.length).toBe(headers.length);
      expect(cells).toEqual(body[r].map((c) => (c == null ? "" : String(c))));
    }
  });

  it("states the filters and the count in the report header band", async () => {
    const subtitle = reportSubtitle({
      shown: GOLDEN.length,
      total: 157,
      filters: ["Block = Alangayam", "Type = PHC"],
    });
    const { headers, rowCells, ws } = await readBack(GOLDEN, {
      title: "Facility list — current dashboard filter",
      subtitle,
    });
    expect(ws.getCell("A1").value).toBe("Facility list — current dashboard filter");
    const title = String(ws.getCell("A2").value);
    expect(title).toBe(subtitle);
    expect(title).toContain("Filters: Block = Alangayam; Type = PHC");
    expect(title).toContain("Showing 5 of 157 facilities");
    expect(title).toContain("IST");
    // The header moved down with the band, and the table is still aligned.
    expect(rowCells(3)).toEqual(headers);
    for (let r = 0; r < GOLDEN.length; r++) {
      expect(rowCells(r + 4).length).toBe(headers.length);
    }
  });

  it("puts every Poongulam value under its own header", async () => {
    const { headers, rowCells, headerRow } = await readBack(
      [poongulam],
      { title: "Facility list", subtitle: "No filters (all 157 facilities)" },
    );
    const cells = rowCells(headerRow + 1);
    for (const [key, expected] of Object.entries(POONGULAM_BY_KEY)) {
      // Frame identity from the report's own model, never from an index.
      const column = DASHBOARD_FILTERED_COLUMNS.find((c) => c.key === key)!;
      const index = headers.indexOf(column.label);
      expect({ key, at: cells[index] }).toEqual({ key, at: String(expected) });
    }
  });
});

/* --------------------------------------------------------------------------- */
/* 4 — PDF (real bytes: text extracted and compared to the header)              */
/* --------------------------------------------------------------------------- */

describe("PDF export", () => {
  async function renderPdf(rows: FilteredReportRow[]) {
    const headers = reportHeaders(DASHBOARD_FILTERED_COLUMNS);
    const body = reportRows(DASHBOARD_FILTERED_COLUMNS, rows);
    const doc = await buildTablePdf({
      title: "Dashboard summary — current filter",
      subtitle: "Filters: Block = Alangayam · Showing 1 of 1 facilities",
      headers,
      rows: body,
      options: {
        columnWidths: reportColumnWidths(DASHBOARD_FILTERED_COLUMNS),
        columnAligns: reportColumnAligns(DASHBOARD_FILTERED_COLUMNS),
      },
    });
    const raw = Buffer.from(doc.output("arraybuffer") as ArrayBuffer).toString("latin1");
    return { headers, doc, raw, pages: extractPdfPages(raw) };
  }

  it("prints the header row above its own values, in order", async () => {
    const { headers, raw, pages } = await renderPdf([poongulam]);
    expect(raw.startsWith("%PDF")).toBe(true);
    const [page] = pages;
    // Row 1 is the header (as drawn), row 2 the Poongulam facility.
    expect(page[0]).toEqual(headers);
    visible(DASHBOARD_FILTERED_COLUMNS).forEach((column, i) => {
      expect({ key: column.key, at: page[1][i] }).toEqual({
        key: column.key,
        at: String(POONGULAM_BY_KEY[column.key]),
      });
    });
  });

  it("draws the header and the value in the same column band (x geometry)", async () => {
    const { raw } = await renderPdf([poongulam]);
    const bandsOf = (cells: PdfCell[]) =>
      [...cells].sort((a, b) => a.x - b.x).map((c) => `${c.x.toFixed(1)}/${c.w.toFixed(1)}`);
    const cells = extractPdfCells(raw.split("endstream")[0]);
    const byRow = new Map<string, PdfCell[]>();
    for (const cell of cells) {
      const key = cell.y.toFixed(2);
      byRow.set(key, [...(byRow.get(key) ?? []), cell]);
    }
    const drawn = [...byRow.values()].sort((a, b) => b[0].y - a[0].y);
    expect(drawn.length).toBeGreaterThan(1);
    // Same x / same width for header cell i and body cell i — the header is
    // physically above its own value.
    expect(bandsOf(drawn[0])).toEqual(bandsOf(drawn[1]));
  });

  it("repeats the same header on every page of a 157-row report", async () => {
    const many: FilteredReportRow[] = Array.from({ length: 157 }, (_, i) => ({
      ...poongulam,
      facility: { ...poongulam.facility, name: `Facility ${i + 1}` },
    }));
    const { headers, doc, pages } = await renderPdf(many);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(pages.length).toBe(doc.getNumberOfPages());
    const signature = headers.join("|");
    for (const page of pages) {
      // Exactly one header row per page, and nothing else is ever mistaken for it.
      expect(page.filter((r) => r.join("|") === signature).length).toBe(1);
      expect(page[0].join("|")).toBe(signature);
      // …and every data row on the page lines up with it, last column included.
      for (const row of page.slice(1)) expect(row.length).toBe(headers.length);
    }
    expect(pages[0][1][headers.indexOf("Documents status")]).toBe("Docx in SQAU login");
  }, 30_000);
});

/* --------------------------------------------------------------------------- */
/* 5 — CSV + print view                                                         */
/* --------------------------------------------------------------------------- */

describe("CSV and print view", () => {
  it("writes one header and one cell per column, in order", () => {
    const [headerLine, ...lines] = buildReportCsv(DASHBOARD_FILTERED_COLUMNS, GOLDEN).split("\r\n");
    const headers = parseCsvLine(headerLine);
    expect(headers).toEqual(reportHeaders(DASHBOARD_FILTERED_COLUMNS));
    expect(lines.length).toBe(GOLDEN.length);
    for (const line of lines) expect(parseCsvLine(line).length).toBe(headers.length);
    // Poongulam is the first row and every value sits under its own header.
    const first = parseCsvLine(lines[0]);
    for (const [key, expected] of Object.entries(POONGULAM_BY_KEY)) {
      const column = DASHBOARD_FILTERED_COLUMNS.find((c) => c.key === key)!;
      expect(first[headers.indexOf(column.label)]).toBe(String(expected));
    }
  });

  it("prints the same header above the same values", () => {
    const html = buildReportPrintHtml({
      title: "Dashboard summary — current filter",
      columns: DASHBOARD_FILTERED_COLUMNS,
      rows: GOLDEN,
    });
    const head = (html.match(/<th[^>]*>([^<]*)<\/th>/g) ?? []).map((t) =>
      t.replace(/<[^>]+>/g, ""),
    );
    expect(head).toEqual(reportHeaders(DASHBOARD_FILTERED_COLUMNS));
    const rows = html.split("<tbody>")[1].split("</tbody>")[0].match(/<tr>.*?<\/tr>/g) ?? [];
    expect(rows.length).toBe(GOLDEN.length);
    for (const row of rows) {
      expect((row.match(/<td[^>]*>/g) ?? []).length).toBe(head.length);
    }
    expect(rows[0]).toContain("Poongulam");
    expect(rows[0]).toContain("20-Jul-2027");
  });

  it("escapes a cell that contains commas or quotes without breaking the row", () => {
    const csv = buildReportCsv(DASHBOARD_FILTERED_COLUMNS, [
      { ...poongulam, facility: { ...poongulam.facility, name: 'Padappai "Rural", HSC' } },
    ]);
    const headers = reportHeaders(DASHBOARD_FILTERED_COLUMNS);
    expect(csv).toContain('"Padappai ""Rural"", HSC"');
    const first = parseCsvLine(csv.split("\r\n")[1]);
    // The comma inside the name did NOT create an extra cell.
    expect(first.length).toBe(headers.length);
    expect(first[headers.indexOf("Facility")]).toBe('Padappai "Rural", HSC');
    expect(first[headers.indexOf("Documents status")]).toBe("Docx in SQAU login");
  });
});

/* --------------------------------------------------------------------------- */
/* 6 — the exact bug, regressed                                                 */
/* --------------------------------------------------------------------------- */

describe("regression — the shifted Dashboard summary", () => {
  it("no longer trims a header label while keeping the serial-number cell", () => {
    const headers = reportHeaders(DASHBOARD_FILTERED_COLUMNS);
    const [row] = reportRows(DASHBOARD_FILTERED_COLUMNS, [poongulam]);
    // Pre-fix: headers had 10 entries, the row had 11, and headers[0] was
    // "Facility" while row[0] was 1.
    expect(headers.length).toBe(row.length);
    expect(headers[0]).toBe("S.No");
    expect(row[0]).toBe(1);
    expect(headers[1]).toBe("Facility");
    expect(row[1]).toBe("Poongulam");
  });
});

/* --------------------------------------------------------------------------- */
/* 7 — label hygiene (Part 3 of the request)                                    */
/* --------------------------------------------------------------------------- */

describe("label hygiene", () => {
  const headersOfEverything = () => [
    ...MASTER_COLUMNS.map((c) => c.label),
    ...Object.values(TRACKER_COLUMN_LABELS),
    ...DASHBOARD_TABLES.flatMap((t) => t.headers),
    ...reportHeaders(DASHBOARD_FILTERED_COLUMNS),
    ...buildRawFacilityGrid([]).headers,
  ];

  it("never prints 'Pipeline Status' any more (any letter case)", () => {
    for (const label of headersOfEverything()) {
      expect(label.toLowerCase()).not.toContain("pipeline status");
    }
    expect(ELIGIBLE_PENDING_HEADERS.every((h) => !/pipeline status/i.test(h))).toBe(true);
  });

  it("shows the renamed column as 'Facility Current Status'", () => {
    expect(FACILITY_CURRENT_STATUS_LABEL).toBe("Facility Current Status");
    expect(COLUMN_BY_KEY.pipelineStatus.label).toBe(FACILITY_CURRENT_STATUS_LABEL);
    expect(TRACKER_COLUMN_LABELS.pipelineStatus).toBe(FACILITY_CURRENT_STATUS_LABEL);
    expect(reportHeaders(DASHBOARD_FILTERED_COLUMNS)).toContain("Facility Current Status");
  });

  it("never gives two visible columns the same label", () => {
    const seen = new Map<string, string[]>();
    for (const c of MASTER_COLUMNS) {
      if (c.type === "action") continue;
      const key = c.label.trim().toLowerCase();
      seen.set(key, [...(seen.get(key) ?? []), c.key]);
    }
    const duplicates = [...seen.entries()].filter(([, keys]) => keys.length > 1);
    expect(duplicates).toEqual([]);
  });

  it("never gives one report two identical headers", () => {
    for (const table of DASHBOARD_TABLES) {
      const labels = table.headers.map((h) => h.trim().toLowerCase());
      expect({ table: table.name, dupes: labels.length - new Set(labels).size }).toEqual({
        table: table.name,
        dupes: 0,
      });
    }
  });

  it("keeps a Table-headers rename that was saved under the OLD label", () => {
    // Before the rename an admin set "Pipeline Status" → "Status at a glance".
    const overrides = { "Pipeline Status": "Status at a glance" };
    expect(withOverrides(["Facility Current Status"], overrides)).toEqual([
      "Status at a glance",
    ]);
    expect(resolveLabels([COLUMN_BY_KEY.pipelineStatus], overrides)).toEqual({
      pipelineStatus: "Status at a glance",
    });
    // A rename saved under the NEW label still wins over the legacy one.
    expect(
      resolveLabels([COLUMN_BY_KEY.pipelineStatus], {
        "Pipeline Status": "old",
        "Facility Current Status": "new",
      }),
    ).toEqual({ pipelineStatus: "new" });
  });
});
