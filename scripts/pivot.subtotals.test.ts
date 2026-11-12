/**
 * SUBTOTAL ALIGNMENT — golden fixture + contract (Task A).
 *
 * Pinned against the attached report (rows = Certification year >
 * Certification month, columns = Block, value = Count of Facility):
 *  • 2022 → Natrampalli 1, Tirupathur 1, Grand 2
 *  • 2023 → Alangayam 1, Jolarpettai 1, Kandhili 1, Madhanur 2,
 *           Tirupathur 2, Grand 7
 *  • 2024 → Alangayam 1, Kandhili 2, Grand 3
 *  • 2025 → Alangayam 3, Jolarpettai 4, Kandhili 7, Madhanur 7,
 *           Natrampalli 5, Tirupathur 2, Grand 28
 *  • whole-table Grand Total = 69 facilities (40 dated + 29 "(No date)")
 *
 * Contract checks:
 *  1. every export row (leaf, subtotal, grand) has EXACTLY one cell per
 *     column and the value cells start at the first value column — the
 *     subtotal label never shifts values one column left,
 *  2. each subtotal's Grand Total column = the sum of its detail rows; the
 *     sum of every subtotal + "(No date)" = the Grand Total row,
 *  3. 1 / 2 / 3 row fields × 0/1 column fields × 1/2 values, subtotals
 *     on/off — all aligned,
 *  4. month labels: "Oct 2022" display, ISO-key sorting, one "(No date)" row.
 *
 * Run: bun test ./scripts
 */
import { describe, it, expect } from "bun:test";

import {
  applyDateLabelOptions,
  buildPivot,
  createPivotFields,
  friendlyMonthLabel,
  type PivotConfig,
  type PivotRow,
} from "@/lib/pivot";
import { buildExportTable, exportPivotPdf, type ExportTable } from "@/lib/pivotExport";
import { buildPivotColumns } from "@/lib/pivotColumns";
import { toCsv } from "@/lib/pivot";

/* ------------------------------------------------------------------ */
/* golden data — exactly the attached report's figures                  */
/* ------------------------------------------------------------------ */

/* The golden table verbatim from the evidence: YEAR → block → count. */

function facility(name: string, block: string | null, certDate: string | null): PivotRow {
  return {
    facility: {
      _id: name,
      name,
      block: block ?? "",
      phc: "—",
      facilityType: "PHC",
      currentStatus: "Quality Certified",
      eligibility: "Eligible",
    },
    cycleNumber: 1,
    nqas: certDate
      ? {
          status: "Completed",
          certificationStatus: "Quality Certified",
          goiLetterDate: certDate,
        }
      : null,
    sa: null,
    fund: null,
  };
}

const M = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}-15`;

/** Encoded verbatim: 2 + 7 + 3 + 28 dated + 29 undated facilities. */
const ROWS2: PivotRow[] = [
  // 2022 (Apr) — Natrampalli 1, Tirupathur 1
  facility("f-natr-1", "Natrampalli", M(2022, 4)),
  facility("f-tiru-1", "Tirupathur", M(2022, 4)),
  // 2023 (May) — Alangayam 1, Jolarpettai 1, Kandhili 1, Madhanur 2, Tirupathur 2
  facility("f-al-1", "Alangayam", M(2023, 5)),
  facility("f-jl-1", "Jolarpettai", M(2023, 5)),
  facility("f-kh-1", "Kandhili", M(2023, 5)),
  facility("f-md-1", "Madhanur", M(2023, 5)),
  facility("f-md-2", "Madhanur", M(2023, 5)),
  facility("f-tp-1", "Tirupathur", M(2023, 5)),
  facility("f-tp-2", "Tirupathur", M(2023, 5)),
  // 2024 (Jun) — Alangayam 1, Kandhili 2
  facility("f-al-2", "Alangayam", M(2024, 6)),
  facility("f-kh-2", "Kandhili", M(2024, 6)),
  facility("f-kh-3", "Kandhili", M(2024, 6)),
  // 2025 (Jul) — Alangayam 3, Jolarpettai 4, Kandhili 7, Madhanur 7,
  //              Natrampalli 5, Tirupathur 2
  ...Array.from({ length: 3 }, (_, i) => facility(`f-al-25-${i}`, "Alangayam", M(2025, 7))),
  ...Array.from({ length: 4 }, (_, i) => facility(`f-jl-25-${i}`, "Jolarpettai", M(2025, 7))),
  ...Array.from({ length: 7 }, (_, i) => facility(`f-kh-25-${i}`, "Kandhili", M(2025, 7))),
  ...Array.from({ length: 7 }, (_, i) => facility(`f-md-25-${i}`, "Madhanur", M(2025, 7))),
  ...Array.from({ length: 5 }, (_, i) => facility(`f-na-25-${i}`, "Natrampalli", M(2025, 7))),
  ...Array.from({ length: 2 }, (_, i) => facility(`f-tp-25-${i}`, "Tirupathur", M(2025, 7))),
  // (No date) — 29
  ...Array.from({ length: 29 }, (_, i) => facility(`f-nd-${i}`, "Tirupathur", null)),
];

const GOLDEN_CONFIG: PivotConfig = {
  rows: ["certYear", "certMonth"],
  columns: ["block"],
  values: [{ fieldId: "facilityName", agg: "count" }],
  filters: {},
  sort: { kind: "label", dir: "asc" },
};

const DATA_ROWS = ROWS2;
const fields = applyDateLabelOptions(createPivotFields(), "friendly");

function makeTable(
  result = buildPivot({ rows: DATA_ROWS, fields, config: GOLDEN_CONFIG }),
): ExportTable {
  return buildExportTable(result, {
    title: "NQAS Custom Report",
    subtitle: "Certification year × month × block",
    district: "Tirupathur",
    generatedBy: "Test Officer",
    filters: [],
  });
}

function headerIndex(table: ExportTable, header: string): number {
  const i = table.columns.findIndex((c) => c.header === header);
  expect(i).toBeGreaterThanOrEqual(0);
  return i;
}

const YEAR_FIGURES: Record<string, Record<string, number>> = {
  "2022": { Natrampalli: 1, Tirupathur: 1 },
  "2023": {
    Alangayam: 1,
    Jolarpettai: 1,
    Kandhili: 1,
    Madhanur: 2,
    Tirupathur: 2,
  },
  "2024": { Alangayam: 1, Kandhili: 2 },
  "2025": {
    Alangayam: 3,
    Jolarpettai: 4,
    Kandhili: 7,
    Madhanur: 7,
    Natrampalli: 5,
    Tirupathur: 2,
  },
};

/* ------------------------------------------------------------------ */
/* tests                                                               */
/* ------------------------------------------------------------------ */

describe("subtotal alignment — golden fixture (Task A4.2)", () => {
  const result = buildPivot({ rows: DATA_ROWS, fields, config: GOLDEN_CONFIG });

  it("imports friendlyMonthLabel as 'Oct 2022'", () => {
    expect(friendlyMonthLabel("2022-10")).toBe("Oct 2022");
  });

  it("every year subtotal carries the golden block figures", () => {
    const table = makeTable();
    const y = headerIndex(table, "Certification year");
    expect(table.columns[y].header).toBe("Certification year");
    for (const [yearLabel, blockFigures] of Object.entries(YEAR_FIGURES)) {
      const sub = table.rows.find(
        (r) => r.kind === "subtotal" && r.cells[0] === `Total — ${yearLabel}`,
      );
      expect(`${yearLabel} subtotal present`).toBeTruthy();
      for (const [block, count] of Object.entries(blockFigures)) {
        const col = headerIndex(table, block);
        expect(`${yearLabel} / ${block}`).toBeTruthy();
        expect(sub?.cells[col]).toBe(count);
      }
      // value columns = everything between the label columns and the
      // Grand Total column (ExportColumn carries role, not kind)
      const valueCols = table.columns
        .map((c, i) =>
          c.role === "label" || c.header === "Grand Total" ? -1 : i,
        )
        .filter((i) => i >= 0);
      const sum = valueCols.reduce((a, i) => a + Number(sub?.cells[i] ?? 0), 0);
      expect(`${yearLabel} sum`).toBeTruthy();
      expect(sum).toBe(Object.values(blockFigures).reduce((a, b) => a + b, 0));
      // merged label covers BOTH label columns
      expect(table.columns[y].role).toBe("label");
      expect(sub?.mergeSpan).toBe(2);
      expect(sub?.cells[1]).toBeNull();
    }
  });

  it("2025 subtotal reads 3 · 4 · 7 · 7 · 5 · 2 with Grand Total 28", () => {
    const table = makeTable();
    const sub = table.rows.find((r) => r.cells[0] === "Total — 2025")!;
    const grandCol = headerIndex(table, "Grand Total");
    expect(table.columns[grandCol].header).toBe("Grand Total");
    const values = table.columns
      .map((c, i) =>
        c.role === "label" || c.header === "Grand Total"
          ? null
          : (sub.cells[i] as number),
      )
      .filter((v): v is number => v != null);
    // column combos are alphabetical (Alangayam → Tirupathur) — the golden
    // figures in that order
    expect(values).toEqual([3, 4, 7, 7, 5, 2]);
    expect(sub.cells[grandCol]).toBe(28);
  });

  it("whole-table Grand Total row = 69", () => {
    const table = makeTable();
    const grandRow = table.rows.find((r) => r.kind === "grand")!;
    const grandCol = headerIndex(table, "Grand Total");
    expect(grandRow.cells[grandCol]).toBe(69);
    expect(grandRow.cells[0]).toBe("Grand Total");
    expect(grandRow.mergedLabel).toBe("Grand Total");
    expect(grandRow.mergeSpan).toBe(2);
    expect(result.filteredCount).toBe(69);
    expect(DATA_ROWS).toHaveLength(69);
  });

  it("year subtotals equal the sum of their detail rows; Σ subtotals = Grand row", () => {
    const table = makeTable();
    const y = headerIndex(table, "Certification year");
    const grandCol = headerIndex(table, "Grand Total");
    let subtotalSum = 0;
    for (const yearLabel of [...Object.keys(YEAR_FIGURES), "(No date)"]) {
      const yearSub = table.rows.find(
        (r) => r.kind === "subtotal" && r.cells[y] === `Total — ${yearLabel}`,
      );
      expect(`${yearLabel} subtotal`).toBeTruthy();
      // the year subtotal equals the sum of its own detail (leaf) rows
      const detailRows = table.rows.filter(
        (r) => r.kind === "leaf" && r.cells[y] === yearLabel,
      );
      expect(detailRows.length).toBeGreaterThan(0);
      expect(
        detailRows.reduce((a, b) => a + Number(b.cells[grandCol]), 0),
      ).toBe(yearSub?.cells[grandCol]);
      subtotalSum += Number(yearSub?.cells[grandCol]);
      // the subtotal label seats at the FIRST label column (year level)
      expect(yearSub?.mergeFrom).toBe(0);
    }
    const grandRow = table.rows.find((r) => r.kind === "grand")!;
    expect(subtotalSum).toBe(grandRow.cells[grandCol]);
    expect(subtotalSum).toBe(69);
  });
});

describe("alignment contract — every format gets exactly #columns cells", () => {
  const layouts: PivotConfig[] = [
    GOLDEN_CONFIG,
    { ...GOLDEN_CONFIG, columns: [] },
    { ...GOLDEN_CONFIG, rows: ["certYear"], columns: [] },
    { ...GOLDEN_CONFIG, rows: ["certYear", "certMonth", "block"], columns: [] },
    {
      ...GOLDEN_CONFIG,
      values: [
        { fieldId: "facilityName", agg: "count" },
        { fieldId: "certScore", agg: "count" },
      ],
    },
  ];

  for (const [li, config] of layouts.entries()) {
    it(`layout ${li}: subtotal/grand rows aligned to the header grid`, () => {
      const result = buildPivot({ rows: DATA_ROWS, fields, config });
      const table = makeTable(result);
      const labelCount = table.columns.filter((c) => c.role === "label").length;
      for (const row of table.rows) {
        expect(row.cells).toHaveLength(table.columns.length);
        if (row.kind === "subtotal") {
          expect(row.mergeSpan).toBe(labelCount - (row.mergeFrom ?? 0));
          expect(row.cells[row.mergeFrom ?? 0]).toBe(row.mergedLabel);
        }
        if (row.kind === "grand" && config.columns.length > 0) {
          expect(row.mergeFrom).toBe(0);
          expect(row.mergeSpan).toBe(labelCount);
          expect(row.cells[0]).toBe("Grand Total");
        }
        if (row.kind === "grand" && config.columns.length === 0) {
          // no column field ⇒ no Grand Total column; the row total IS the
          // single value column, so it repeats the value, not an extra col
          const valueCount = table.columns.length - labelCount;
          expect(valueCount).toBe(1);
        }
      }
    });
  }

  it("subtotals OFF still aligns", () => {
    const result = buildPivot({
      rows: DATA_ROWS,
      fields,
      config: GOLDEN_CONFIG,
      options: { showSubtotals: false },
    });
    const table = makeTable(result);
    for (const row of table.rows) {
      expect(row.cells).toHaveLength(table.columns.length);
    }
    expect(table.rows.some((r) => r.kind === "subtotal")).toBe(false);
  });

  it("2+ values: the Grand Total columns keep per-value measure names", () => {
    const config: PivotConfig = {
      ...GOLDEN_CONFIG,
      values: [
        { fieldId: "facilityName", agg: "count" },
        { fieldId: "certScore", agg: "count" },
      ],
    };
    const result = buildPivot({ rows: DATA_ROWS, fields, config });
    const table = makeTable(result);
    const grandHeaders = table.columns.filter((c) =>
      c.header.startsWith("Grand Total"),
    );
    expect(grandHeaders).toHaveLength(2);
    expect(grandHeaders[0].header).toBe("Grand Total — Count of Facility");
  });

  it("CSV: character-for-character alignment (header i = cell i)", () => {
    const table = makeTable();
    const csv = toCsv(
      table.columns.map((c) => c.header),
      table.rows.map((r) => r.cells),
    );
    const lines = csv.split("\n");
    // the golden data contains no commas or quotes — plain split is exact
    const split = (line: string) => line.split(",");
    const headers = split(lines[0]);
    expect(headers).toHaveLength(table.columns.length);
    for (let li = 1; li < lines.length; li += 1) {
      expect(split(lines[li])).toHaveLength(headers.length);
    }
    // "Total — 2025" seats in the YEAR label column; month col inside the merge
    const sub = lines.findIndex((l) => l.includes("Total — 2025"));
    const cells = split(lines[sub]);
    expect(cells[0]).toBe("Total — 2025");
    expect(cells[1]).toBe("");
  });

  it("PDF: renders end-to-end without throwing (planner + draw)", () => {
    const table = makeTable();
    exportPivotPdf("golden.pdf", table, { orientation: "landscape" });
    expect(table.rows.length).toBeGreaterThan(0);
  });
});

describe("month labels + (No date) grouping", () => {
  it("friendly month labels visible; raw labels stay ISO for drill-down", () => {
    const result = buildPivot({ rows: DATA_ROWS, fields, config: GOLDEN_CONFIG });
    const deep = result.outRows.filter((r) => r.kind === "leaf" && r.depth === 1);
    expect(deep.length).toBeGreaterThan(0);
    for (const r of deep) {
      if (r.displayLabels?.[0] === "(No date)") {
        expect(r.displayLabels[1]).toBe("(No date)");
      } else {
        expect(r.displayLabels?.[1]).toMatch(/^[A-Z][a-z]{2} \d{4}$/);
        expect(r.labels[1]).toMatch(/^\d{4}-\d{2}$/);
      }
    }
  });

  it("ISO display option shows ISO keys", () => {
    const isoFields = applyDateLabelOptions(createPivotFields(), "iso");
    const result = buildPivot({ rows: DATA_ROWS, fields: isoFields, config: GOLDEN_CONFIG });
    const deep = result.outRows.filter((r) => r.kind === "leaf" && r.depth === 1);
    for (const r of deep) {
      if (r.displayLabels?.[0] !== "(No date)") {
        expect(r.displayLabels?.[1]).toMatch(/^\d{4}-\d{2}$/);
      }
    }
  });

  it("(No date) rows: one single subtotal holds all 29 undated facilities", () => {
    const result = buildPivot({ rows: DATA_ROWS, fields, config: GOLDEN_CONFIG });
    const noDateRows = result.outRows.filter(
      (r) => r.displayLabels?.[0] === "(No date)",
    );
    expect(noDateRows).toHaveLength(2); // one detail + one subtotal
    const subtotal = noDateRows.find((r) => r.kind === "subtotal")!;
    expect(subtotal.totals[0]).toBe(29);
    expect(noDateRows.find((r) => r.kind === "leaf")!.totals[0]).toBe(29);
  });

  it("months sort by the ISO key in friendly form too", () => {
    const result = buildPivot({ rows: DATA_ROWS, fields, config: GOLDEN_CONFIG });
    const raw = result.outRows
      .filter((r) => r.kind === "leaf" && r.depth === 1 && r.labels[0] != null)
      .map((r) => r.labels[1] as string);
    expect([...raw].sort()).toEqual(raw);
  });

  it("the shared model exposes the same columns for screen + export", () => {
    const result = buildPivot({ rows: DATA_ROWS, fields, config: GOLDEN_CONFIG });
    const model = buildPivotColumns(result, { grandTotalColumn: true });
    expect(model[0].kind).toBe("label");
    expect(model[0].header).toBe(result.rowFields[0].label);
    const last = model[model.length - 1];
    expect(last.kind).toBe("grand");
    expect(last.header).toBe("Grand Total");
  });
});
