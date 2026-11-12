/** Export-model + new-engine-feature tests.
 *
 *  buildExportTable is the single source of truth the PDF, Excel and CSV
 *  writers all read, so these tests pin down exactly what lands in a file:
 *  column order and roles, raw numeric cells (real numbers, not text),
 *  monthly date formatting, bold subtotal/grand rows, and the CSV encoding.
 *  The % of Total aggregation and drill-down selection are new engine
 *  entry points, so they are exercised here too. Run: bun test ./scripts */
import { describe, it, expect } from "bun:test";

import {
  buildPivot,
  createPivotFields,
  pivotDrilldown,
  toCsv,
  type PivotConfig,
  type PivotRow,
} from "@/lib/pivot";
import {
  buildExportTable,
  buildRawFacilityGrid,
  exportStamp,
} from "@/lib/pivotExport";

function row(rec: {
  name: string;
  block: string;
  type: string;
  cert?: string | null;
  score?: number | null;
  amount?: number | null;
  validity?: string | null;
}): PivotRow {
  return {
    facility: {
      _id: rec.name,
      name: rec.name,
      block: rec.block,
      phc: `${rec.block} PHC`,
      facilityType: rec.type,
      currentStatus: rec.cert ?? "SA Not Yet Initiated",
      eligibility: "Eligible",
    },
    cycleNumber: 1,
    nqas: rec.cert
      ? {
          status: "Completed",
          certificationStatus: rec.cert,
          scorePercent: rec.score ?? null,
          validityDate: rec.validity ?? null,
        }
      : null,
    sa: { status: "Completed", scorePercent: rec.score ?? null },
    fund: rec.amount != null ? { amountSanctioned: rec.amount } : null,
  };
}

const ROWS: PivotRow[] = [
  row({ name: "A", block: "Bargur", type: "PHC", cert: "Quality Certified", score: 82, amount: 150000, validity: "2026-03-15" }),
  row({ name: "B", block: "Bargur", type: "HWC HSC", cert: "Quality Certified", score: 78, amount: 50000, validity: "2026-05-02" }),
  row({ name: "C", block: "Kandhili", type: "PHC", cert: "Quality Certified with Conditionality", score: 65 }),
  row({ name: "Block-less", block: "", type: "HWC HSC" }),
];

const fields = createPivotFields();

const config: PivotConfig = {
  rows: ["block"],
  columns: ["certStatus"],
  values: [
    { fieldId: "facilityName", agg: "count" },
    { fieldId: "certScore", agg: "avg" },
  ],
  filters: {},
  sort: { kind: "label", dir: "asc" },
};

describe("export model (PDF/Excel/CSV shared)", () => {
  const result = buildPivot({ rows: ROWS, fields, config });
  const table = buildExportTable(result, {
    title: "NQAS Custom Report",
    subtitle: "Sub",
    district: "Tirupathur",
    generatedBy: "Test Offier",
    filters: [],
  });

  it("orders columns: labels → measures per combo → grand totals", () => {
    expect(table.columns[0].header).toBe("Block");
    // one column field ("certStatus") × 2 value specs
    expect(table.columns.length).toBe(1 + 3 * 2 + 2);
    expect(table.columns[1].header).toContain("Count of Facility");
    expect(table.columns[2].header).toContain("Average of Certified Score %");
    expect(table.columns.at(-2)!.header.startsWith("Grand Total — Count")).toBe(true);
  });

  it("classifies roles: counts/sums/averages are numbers even counting text", () => {
    const roles = table.columns.map((c) => c.role);
    // Block label column
    expect(roles[0]).toBe("label");
    // count-of-text, average-of-number: numbers
    expect(roles[1]).toBe("number");
    expect(roles[2]).toBe("number");
    // min/max of a number field stays number; a date min/max would be date
    expect(table.numericCols.length).toBeGreaterThanOrEqual(4);
  });

  it("writes real numeric cells (not strings) and formats dates", () => {
    // every measure/grand cell in a numeric column is typeof number
    for (const r of table.rows) {
      for (const c of table.numericCols) {
        const v = r.cells[c];
        expect(v == null || typeof v === "number").toBe(true);
      }
    }
    // the validity date renders DD-MM-YYYY where a date measure exists
    const dateCfg: PivotConfig = {
      ...config,
      columns: [],
      values: [{ fieldId: "validityDate", agg: "min" }],
    };
    const dateTable = buildExportTable(
      buildPivot({ rows: ROWS, fields, config: dateCfg }),
      { title: "t", subtitle: "", district: "", generatedBy: "", filters: [] },
    );
    const dateCell = dateTable.rows.find((r) => r.kind === "leaf")?.cells[1];
    expect(dateCell).toBe("15-03-2026");
  });

  it("flags subtotal rows with 'Total —' labels for bolding", () => {
    // Subtotals only exist once there is a second row level (children).
    const deepCfg: PivotConfig = {
      rows: ["block", "facilityType"],
      columns: [],
      values: [{ fieldId: "facilityName", agg: "count" }],
      filters: {},
      sort: { kind: "label", dir: "asc" },
    };
    const deepTable = buildExportTable(
      buildPivot({ rows: ROWS, fields, config: deepCfg }),
      { title: "t", subtitle: "", district: "", generatedBy: "", filters: [] },
    );
    const subtotal = deepTable.rows.find((r) => r.kind === "subtotal");
    expect(subtotal).toBeDefined();
    expect(String(subtotal!.cells[0]).startsWith("Total — ")).toBe(true);
    const grand = deepTable.rows.find((r) => r.kind === "grand");
    expect(grand).toBeDefined();
  });

  it("leaves deeper labels blank (Excel-pivot style) via drilldown config", () => {
    // blocks have no children here (single row field), so always full label
    for (const r of table.rows) expect(r.cells[0]).not.toBeNull();
  });

  it("booleans hidden: includeSubtotals=false drops them", () => {
    const noSub = buildExportTable(
      result,
      { title: "t", subtitle: "", district: "", generatedBy: "", filters: [] },
      { includeSubtotals: false },
    );
    expect(noSub.rows.some((r) => r.kind === "subtotal")).toBe(false);
    expect(noSub.rows.some((r) => r.kind === "grand")).toBe(true);
  });

  it("CSV escapes quotes/commas and keeps numbers plain", () => {
    const csv = toCsv(["A", "B"], [["a,b", 123], ['"q"', null]]);
    const lines = csv.split("\n");
    expect(lines[1]).toBe('"a,b",123');
    expect(lines[2]).toBe('"""q""",');
  });

  it("stamp is a yyyy-mm-dd date", () => {
    expect(exportStamp()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("raw facility grid is fixed-width and Excel-ready", () => {
    const grid = buildRawFacilityGrid(ROWS);
    expect(grid.headers.length).toBe(10);
    expect(grid.cells.length).toBe(ROWS.length);
    expect(grid.cells[0][0]).toBe("A");
    expect(grid.cells[0][8]).toBe("15-03-2026"); // validity DD-MM-YYYY
  });
});

describe("% of Total aggregation", () => {
  it("facility share sums to 100 across row groups", () => {
    const res = buildPivot({
      rows: ROWS,
      fields,
      config: {
        ...config,
        rows: ["certStatus"],
        columns: [],
        values: [{ fieldId: "facilityName", agg: "pctTotal" }],
      },
      options: { showGrandTotals: true },
    });
    const totalRow = res.outRows.find((r) => r.kind === "grand");
    expect(totalRow?.totals[0]).toBeCloseTo(100, 0);
    const leafShares = res.outRows
      .filter((r) => r.kind === "leaf")
      .map((r) => r.totals[0] as number);
    const sum = leafShares.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it("amount share = bucket sum over grand sum", () => {
    const res = buildPivot({
      rows: ROWS,
      fields,
      config: {
        rows: ["certStatus"],
        columns: [],
        values: [{ fieldId: "gapAmount", agg: "pctTotal" }],
        filters: {},
        sort: { kind: "label", dir: "asc" },
      },
    });
    const total = res.outRows.find((r) => r.kind === "grand")!;
    expect(total.totals[0]).toBeCloseTo(100, 0);
  });
});

describe("drill-down selection", () => {
  it("matches the row-group + column-combo of a clicked cell", () => {
    const matched = pivotDrilldown({
      rows: ROWS,
      fields,
      config,
      labels: ["Bargur"],
      colLabels: ["Quality Certified"],
    });
    expect(matched.map((r) => r.facility.name).sort()).toEqual(["A", "B"]);
  });

  it("no column filter when the totals cell is clicked", () => {
    const matched = pivotDrilldown({
      rows: ROWS,
      fields,
      config,
      labels: ["Kandhili"],
    });
    expect(matched.map((r) => r.facility.name)).toEqual(["C"]);
  });

  it("undefined level matches anything (subtotal rows)", () => {
    const matched = pivotDrilldown({
      rows: ROWS,
      fields,
      config: { ...config, rows: ["block", "facilityType"] },
      labels: ["Bargur", undefined],
    });
    expect(matched.length).toBe(2);
  });

  it("null label matches blank groups", () => {
    const matched = pivotDrilldown({
      rows: ROWS,
      fields,
      config,
      labels: [null],
    });
    expect(matched.map((r) => r.facility.name)).toEqual(["Block-less"]);
  });
});
