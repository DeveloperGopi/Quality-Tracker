/**
 * PIVOT — the ONE columns[] model contract (Custom Report Builder, Task B).
 *
 * Pins, on the same fixtures the export model uses:
 *  • EXACTLY ONE "Grand Total" column — and only when a column field exists
 *    (Task B.1; without one the "row total" would duplicate the value column),
 *  • EXACTLY ONE "Grand Total" row — and only when a row field exists,
 *  • the counter equals the table (body rows excluding the total row; value
 *    columns excluding the Grand Total column),
 *  • the export model (buildExportTable) agrees with the preview: single
 *    value never repeats its measure name per column, single Grand Total
 *    column, and the grand row's label slot agrees with the column model,
 *  • single-value reports keep whole-valued totals live in the model.
 *
 * Run: bun test ./scripts
 */
import { describe, expect, it } from "bun:test";

import {
  buildPivot,
  createPivotFields,
  type PivotConfig,
  type PivotRow,
} from "@/lib/pivot";
import { buildExportTable } from "@/lib/pivotExport";
import {
  buildPivotColumns,
  pivotCounter,
} from "@/components/custom-report/PivotTable";

const fields = createPivotFields();

function row(spec: {
  name: string;
  block: string;
  type: string;
  cert?: string | null;
  score?: number | null;
  amount?: number | null;
}): PivotRow {
  return {
    facility: {
      _id: spec.name,
      name: spec.name,
      block: spec.block,
      phc: `${spec.block} PHC`,
      facilityType: spec.type,
      currentStatus: spec.cert ?? "SA Not Yet Initiated",
      eligibility: "Eligible",
    },
    cycleNumber: 1,
    nqas: spec.cert
      ? {
          status: "Completed",
          certificationStatus: spec.cert,
          scorePercent: spec.score ?? null,
        }
      : null,
    sa: { status: "Completed", scorePercent: spec.score ?? null },
    fund: spec.amount != null ? { amountSanctioned: spec.amount } : null,
  };
}

const ROWS: PivotRow[] = [
  row({ name: "A", block: "Bargur", type: "PHC", cert: "Quality Certified", score: 82, amount: 150000 }),
  row({ name: "B", block: "Bargur", type: "HWC HSC", cert: "Quality Certified", score: 78 }),
  row({ name: "C", block: "Kandhili", type: "PHC", cert: "Quality Certified with Conditionality", score: 65 }),
  row({ name: "D", block: "Kandhili", type: "HWC HSC" }),
  row({ name: "E", block: "Natrampalli", type: "PHC", cert: "Quality Certified", score: 91, amount: 30000 }),
];

const baseConfig: PivotConfig = {
  rows: ["block"],
  columns: ["certStatus"],
  values: [{ fieldId: "facilityName", agg: "count" }],
  filters: {},
  sort: { kind: "label", dir: "asc" },
};

describe("the ONE columns[] model (preview + exports)", () => {
  it("rows × columns × 1 value: grid columns = corner + valueColumns, NO Grand Total duplication", () => {
    const result = buildPivot({ rows: ROWS, fields, config: baseConfig });
    const cols = buildPivotColumns(result, { grandTotalColumn: true });

    // One leading label slot per row field, one column per combo × value,
    // ONE grand column (dom type "grand") — never two.
    const valueCols = cols.filter((c) => c.kind === "value");
    const grandCols = cols.filter((c) => c.kind === "grand");
    expect(result.colFields).toHaveLength(1);
    expect(valueCols).toHaveLength(result.colCombos.length * result.valueSpecs.length);
    expect(grandCols).toHaveLength(1);
    expect(grandCols[0].header.startsWith("Grand Total")).toBe(true);
  });

  it("counter contract: body rows exclude the Grand Total row; value columns exclude the Grand Total column", () => {
    const result = buildPivot({ rows: ROWS, fields, config: baseConfig });
    const c = pivotCounter(result);
    expect(c.of).toBe(ROWS.length);
    expect(c.facilities).toBeGreaterThan(0);
    expect(c.rows).toBe(result.outRows.length - 1 /* exactly the grand row */);
    expect(c.valueColumns).toBe(result.colCombos.length); // 1 value × 3 combos
    // …and the DOM model agrees: body rows + 1 footer row = outRows.
    expect(result.outRows.filter((r) => r.kind === "grand")).toHaveLength(1);
  });

  it("no column field ⇒ no Grand Total column (the row total would duplicate the value column)", () => {
    const noCols: PivotConfig = { ...baseConfig, columns: [] };
    const result = buildPivot({ rows: ROWS, fields, config: noCols });
    expect(result.colFields).toHaveLength(0);
    const cols = buildPivotColumns(result, { grandTotalColumn: true });
    expect(cols.filter((c) => c.kind === "grand")).toHaveLength(0);
    // label columns (one per row field) + the single value column
    expect(cols).toHaveLength(result.rowFields.length + result.valueSpecs.length);
  });

  it("no row field ⇒ no Grand Total row (values-only report is a single plain row)", () => {
    const noRows: PivotConfig = { ...baseConfig, rows: [], columns: [] };
    const result = buildPivot({ rows: ROWS, fields, config: noRows });
    expect(result.rowFields).toHaveLength(0);
    expect(result.outRows).toHaveLength(1);
    expect(result.outRows[0].kind).toBe("leaf");
    expect(result.outRows[0].labels).toEqual([]);
    // …but a row field (even with no zero columns to add up) gives the row back:
    const withRows = buildPivot({ rows: ROWS, fields, config: { ...noRows, rows: ["block"] } });
    expect(withRows.outRows.filter((r) => r.kind === "grand")).toHaveLength(1);
  });

  it("2+ values: one grand sub-column per value, still ONE grand column-group per row-alignment", () => {
    const two: PivotConfig = {
      ...baseConfig,
      values: [
        { fieldId: "facilityName", agg: "count" },
        { fieldId: "gapAmount", agg: "sum" },
      ],
    };
    const result = buildPivot({ rows: ROWS, fields, config: two });
    const cols = buildPivotColumns(result, { grandTotalColumn: true });
    const grand = cols.filter((c) => c.kind === "grand");
    expect(grand).toHaveLength(2); // one sub-column per value
    // The value columns count too: combos × 2.
    expect(cols.filter((c) => c.kind === "value")).toHaveLength(result.colCombos.length * 2);
  });
});

describe("exports follow the SAME model (Task B.7)", () => {
  it("single value ⇒ headers are the combo labels themselves, never a repeated measure name", () => {
    const result = buildPivot({ rows: ROWS, fields, config: baseConfig });
    const table = buildExportTable(result, {
      title: "t",
      subtitle: "",
      district: "",
      generatedBy: "",
      filters: [],
    });
    // Column [0] is the label ("Block"); then one column per combo without
    // any "Count of Facility"; then EXACTLY ONE grand column.
    expect(table.columns[0].header).toBe("Block");
    for (let i = 1; i <= result.colCombos.length; i += 1) {
      expect(table.columns[i].header).not.toContain("Count of Facility");
    }
    const grandHeaders = table.columns.filter((c) => c.header.startsWith("Grand Total"));
    expect(grandHeaders).toHaveLength(1);
    // Single value ⇒ the grand header is "Grand Total" ONLY (no repeated
    // measure name); the measure appears exactly ONCE, in the caption.
    expect(grandHeaders[0].header).toBe("Grand Total");
    expect(
      table.columns.filter((c) => c.header.includes("Count of Facility")),
    ).toHaveLength(0);
    expect(table.meta.valuesCaption).toContain("Count of Facility");
  });

  it("row alignment: every row has exactly one cell per exported column", () => {
    const two: PivotConfig = {
      ...baseConfig,
      values: [
        { fieldId: "facilityName", agg: "count" },
        { fieldId: "gapAmount", agg: "sum" },
      ],
    };
    const result = buildPivot({ rows: ROWS, fields, config: two });
    const table = buildExportTable(result, {
      title: "t",
      subtitle: "",
      district: "",
      generatedBy: "",
      filters: [],
    });
    for (const r of table.rows) {
      expect(r.cells).toHaveLength(table.columns.length);
    }
  });

  it("values-only export: no phantom 'Report'/'Grand Total' label column and aligned rows", () => {
    const noRows: PivotConfig = { ...baseConfig, rows: [], columns: [] };
    const result = buildPivot({ rows: ROWS, fields, config: noRows });
    const table = buildExportTable(result, {
      title: "t",
      subtitle: "",
      district: "",
      generatedBy: "",
      filters: [],
    });
    // Without row fields there is NO label column and NO grand column:
    expect(table.columns).toHaveLength(1);
    expect(table.columns[0].header).toContain("Count of Facility");
    for (const r of table.rows) {
      expect(r.cells).toHaveLength(table.columns.length);
    }
  });
});
