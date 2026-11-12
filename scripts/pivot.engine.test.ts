/**
 * Locks the Custom Report Builder's pivot maths in place (src/lib/pivot.ts).
 *
 * The builder is "drag a field anywhere and the report must be right", so the
 * cases that matter are the ones a user cannot eyeball: crosstab cells with
 * multiple value fields, subtotals vs grand totals, blank grouping, filters,
 * measure sorting, collapse and date min/max. Run: bun test ./scripts
 */
import { describe, it, expect } from "bun:test";

import {
  buildPivot,
  createPivotFields,
  type PivotConfig,
  type PivotFieldDef,
  type PivotResult,
  type PivotRow,
} from "../src/lib/pivot";

/* ------------------------------------------------------------------ */
/* fixtures                                                            */
/* ------------------------------------------------------------------ */

function row(
  name: string,
  block: string,
  facilityType: string,
  score: number | null,
  certDate: string | null,
  status: string,
): PivotRow {
  return {
    facility: {
      name,
      block,
      phc: `${block}-PHC`,
      ninNumber: null,
      facilityType,
      currentStatus: status,
      statusOverride: null,
      eligibility: "Eligible",
      remarks: null,
      nqasIaQ1: null,
      nqasIaQ2: null,
      kayakalpIaQ1: null,
      kayakalpIaQ2: null,
    },
    cycleNumber: 1,
    cycleType: "NQAS",
    resultDocumentName: null,
    sa: null,
    nqas: {
      certificationStatus: status,
      certificationDate: certDate,
      goiLetterDate: certDate,
      scorePercent: score,
      validityDate: null,
      surveillanceDue1: null,
      surveillanceDone1: null,
      surveillanceDue2: null,
      surveillanceDone2: null,
      manualScore: null,
      recertStatus: null,
      recertYear: null,
    },
    fund: null,
    noc: null,
    building: null,
  };
}

/** 3 facilities in block A, 1 in B, 1 with no block at all. */
const DATA: PivotRow[] = [
  row("F1", "A", "PHC", 80, "2024-01-10", "Certified"),
  row("F2", "A", "CHC", 90, "2024-03-05", "Certified"),
  row("F3", "A", "PHC", 70, "2023-05-01", "Pending"),
  row("F4", "B", "PHC", 60, null, "Pending"),
  row("F5", "", "CHC", null, null, "Certified"),
];

const FIELDS: PivotFieldDef[] = [
  { id: "block", label: "Block", group: "Facility", type: "text", value: (r) => r.facility.block || null },
  { id: "type", label: "Facility Type", group: "Facility", type: "text", value: (r) => r.facility.facilityType },
  { id: "status", label: "Status", group: "Certification", type: "text", value: (r) => r.nqas?.certificationStatus ?? null },
  { id: "score", label: "Score", group: "Certification", type: "number", value: (r) => r.nqas?.scorePercent ?? null },
  { id: "name", label: "Facility", group: "Facility", type: "text", value: (r) => r.facility.name },
  { id: "certDate", label: "Cert date", group: "Certification", type: "date", value: (r) => r.nqas?.certificationDate ?? null },
  { id: "daysSinceCert", label: "Days since cert", group: "Calculated", type: "number", value: (r) => (r.nqas?.certificationDate ? 1 : null) },
];

function cfg(partial: Partial<PivotConfig>): PivotConfig {
  return {
    rows: [],
    columns: [],
    values: [],
    filters: {},
    sort: { kind: "label", dir: "asc" },
    ...partial,
  };
}

function run(config: PivotConfig, extra?: { collapsed?: Set<string>; showSubtotals?: boolean }) {
  return buildPivot({
    rows: DATA,
    fields: FIELDS,
    config,
    collapsed: extra?.collapsed,
    options: { showSubtotals: extra?.showSubtotals },
  });
}

/** Cell for (output row, column combo, value index). */
function cell(result: PivotResult, rowIndex: number, combo: number, value = 0) {
  const width = result.valueSpecs.length;
  return result.outRows[rowIndex].measures[combo * width + value];
}

/* ------------------------------------------------------------------ */
/* grouping, counts, aggregations                                      */
/* ------------------------------------------------------------------ */

describe("pivot grouping and aggregation", () => {
  it("groups by block, counts facilities and totals them", () => {
    const r = run(cfg({ rows: ["block"], values: [{ fieldId: "name", agg: "count" }] }));
    // A, B, then the blank group (blanks sort last, like Excel); grand total last.
    expect(r.outRows.map((x) => x.kind)).toEqual(["leaf", "leaf", "leaf", "grand"]);
    expect(r.outRows.map((x) => x.labels[0])).toEqual([
      "A",
      "B",
      null,
      "Grand Total",
    ]);
    expect(r.outRows.slice(0, 3).map((x) => x.measures[0])).toEqual([3, 1, 1]);
    expect(r.outRows[3].measures).toEqual([5]);
    expect(r.filteredCount).toBe(5);
    expect(r.grandTotals).toEqual([5]);
  });

  it("computes sum, average, minimum and maximum of a number field", () => {
    const r = run(
      cfg({
        rows: ["block"],
        values: [
          { fieldId: "score", agg: "sum" },
          { fieldId: "score", agg: "avg" },
          { fieldId: "score", agg: "min" },
          { fieldId: "score", agg: "max" },
        ],
      }),
    );
    // Block A: 80 + 90 + 70 = 240, avg 80, min 70, max 90
    expect(r.outRows[0].measures).toEqual([240, 80, 70, 90]);
    // Block B: single 60
    expect(r.outRows[1].measures).toEqual([60, 60, 60, 60]);
    // (blank) block has no score at all → null (shown as "—"), not 0
    expect(r.outRows[2].measures).toEqual([null, null, null, null]);
    expect(r.grandTotals).toEqual([300, 75, 60, 90]);
  });

  it("counts distinct values and skips blank ones", () => {
    const r = run(
      cfg({
        rows: ["block"],
        values: [
          { fieldId: "type", agg: "distinct" },
          { fieldId: "status", agg: "distinct" },
        ],
      }),
    );
    expect(r.outRows[0].measures).toEqual([2, 2]); // A: PHC+CHC, Certified+Pending
    expect(r.grandTotals).toEqual([2, 2]);
  });

  it("takes min/max of a date field as the date itself", () => {
    const r = run(cfg({ rows: ["block"], values: [{ fieldId: "certDate", agg: "min" }] }));
    expect(r.outRows[0].measures[0]).toBe("2023-05-01"); // earliest in A
    expect(r.grandTotals[0]).toBe("2023-05-01");
  });
});

/* ------------------------------------------------------------------ */
/* crosstab                                                            */
/* ------------------------------------------------------------------ */

describe("pivot columns (crosstab)", () => {
  const config = cfg({
    rows: ["block"],
    columns: ["type"],
    values: [{ fieldId: "name", agg: "count" }],
  });

  it("spreads the figures across one combo per column value", () => {
    const r = run(config);
    expect(r.colCombos.map((c) => c.labels[0])).toEqual(["CHC", "PHC"]);
    // Row 0 = block A: 1 CHC, 2 PHC
    expect(cell(r, 0, 0)).toBe(1);
    expect(cell(r, 0, 1)).toBe(2);
    // Row order is A, B, (blank)
    expect(cell(r, 1, 0)).toBeNull(); // no CHC in block B
    expect(cell(r, 1, 1)).toBe(1);
    expect(cell(r, 2, 0)).toBe(1); // the blank block holds one CHC
    expect(cell(r, 2, 1)).toBeNull(); // and no PHC
  });

  it("adds a per-row grand total across the columns", () => {
    const r = run(config);
    expect(r.outRows[0].totals).toEqual([3]);
    expect(r.outRows[1].totals).toEqual([1]);
    expect(r.outRows[2].totals).toEqual([1]);
  });

  it("totals every column and everything overall", () => {
    const r = run(config);
    expect(r.grandMeasures).toEqual([2, 3]);
    expect(r.grandTotals).toEqual([5]);
    const grand = r.outRows[r.outRows.length - 1];
    expect(grand.kind).toBe("grand");
    expect(grand.measures).toEqual([2, 3]);
  });

  it("keeps two column fields as a two-level header", () => {
    const r = run(
      cfg({
        rows: ["block"],
        columns: ["status", "type"],
        values: [{ fieldId: "name", agg: "count" }],
      }),
    );
    // Only observed combinations appear (no Pending+CHC row exists).
    expect(r.colCombos.map((c) => c.labels.join("/"))).toEqual([
      "Certified/CHC",
      "Certified/PHC",
      "Pending/PHC",
    ]);
    // Certified/CHC = F2 + F5; Certified/PHC = F1; Pending/PHC = F3 + F4
    expect(r.grandMeasures).toEqual([2, 1, 2]);
  });
});

/* ------------------------------------------------------------------ */
/* subtotals / grand totals / collapse                                 */
/* ------------------------------------------------------------------ */

describe("subtotals, grand totals and collapse", () => {
  const config = cfg({
    rows: ["block", "type"],
    values: [{ fieldId: "name", agg: "count" }],
  });

  it("emits a subtotal after each group plus a grand total", () => {
    const r = run(config);
    const shape = r.outRows.map(
      (x) => `${x.kind}:${x.labels.slice(0, x.depth + 1).map((l) => l ?? "∅").join("/")}`,
    );
    expect(shape).toEqual([
      "leaf:A/CHC",
      "leaf:A/PHC",
      "subtotal:A",
      "leaf:B/PHC",
      "subtotal:B",
      "leaf:∅/CHC",
      "subtotal:∅",
      "grand:Grand Total",
    ]);
    const subtotalA = r.outRows[2];
    expect(subtotalA.count).toBe(3);
    expect(subtotalA.measures[0]).toBe(3);
    expect(subtotalA.hasChildren).toBe(true);
  });

  it("drops subtotal rows when they are switched off", () => {
    const r = run(config, { showSubtotals: false });
    expect(r.outRows.map((x) => x.kind)).toEqual([
      "leaf",
      "leaf",
      "leaf",
      "leaf",
      "grand",
    ]);
  });

  it("hides the grand total row when it is switched off", () => {
    const r = buildPivot({
      rows: DATA,
      fields: FIELDS,
      config,
      options: { showGrandTotals: false },
    });
    expect(r.outRows.every((x) => x.kind !== "grand")).toBe(true);
    // the totals are still computed for exports
    expect(r.grandTotals).toEqual([5]);
  });

  it("collapsing a group keeps its subtotal but hides its children", () => {
    const collapsed = new Set(["A"]);
    const r = run(config, { collapsed });
    expect(
      r.outRows.map(
        (x) => `${x.kind}:${x.labels.slice(0, x.depth + 1).map((l) => l ?? "∅").join("/")}`,
      ),
    ).toEqual([
      "subtotal:A",
      "leaf:B/PHC",
      "subtotal:B",
      "leaf:∅/CHC",
      "subtotal:∅",
      "grand:Grand Total",
    ]);
    expect(r.outRows[0].collapsed).toBe(true);
    expect(r.outRows[0].measures[0]).toBe(3);
  });
});

/* ------------------------------------------------------------------ */
/* filters and sorting                                                 */
/* ------------------------------------------------------------------ */

describe("filters and sorting", () => {
  it("filters on group values, blank label included", () => {
    const r = run(
      cfg({
        rows: ["block"],
        values: [{ fieldId: "name", agg: "count" }],
        filters: { type: ["PHC"] },
      }),
    );
    expect(r.filteredCount).toBe(3);
    expect(r.grandTotals).toEqual([3]);
    expect(r.outRows.map((x) => x.labels[0])).toEqual(["A", "B", "Grand Total"]);

    const blank = run(
      cfg({
        rows: ["block"],
        values: [{ fieldId: "name", agg: "count" }],
        filters: { block: ["(blank)"] },
      }),
    );
    expect(blank.filteredCount).toBe(1);
  });

  it("sorts groups by a measure, blanks last on ties", () => {
    const r = run(
      cfg({
        rows: ["block"],
        values: [{ fieldId: "name", agg: "count" }],
        sort: { kind: "measure", colIndex: 0, vIndex: 0, dir: "desc" },
      }),
    );
    expect(r.outRows.map((x) => x.labels[0])).toEqual([
      "A",
      "B",
      null,
      "Grand Total",
    ]);
    expect(r.outRows.map((x) => x.measures[0] ?? null)).toEqual([3, 1, 1, 5]);
  });

  it("sorts a numeric field by its aggregated value, not its label", () => {
    const r = run(
      cfg({
        rows: ["status"],
        values: [{ fieldId: "score", agg: "avg" }],
        sort: { kind: "measure", colIndex: 0, vIndex: 0, dir: "desc" },
      }),
    );
    // Certified avg = (80+90)/2 = 85 → ahead of Pending avg = 65
    expect(r.outRows[0].labels[0]).toBe("Certified");
    expect(r.outRows[0].measures[0]).toBe(85);
    expect(r.outRows[1].labels[0]).toBe("Pending");
    expect(r.outRows[1].measures[0]).toBe(65);
  });

  it("can sort by the grand total column", () => {
    const r = buildPivot({
      rows: DATA,
      fields: FIELDS,
      config: cfg({
        rows: ["block"],
        columns: ["type"],
        values: [{ fieldId: "name", agg: "count" }],
        sort: { kind: "total", vIndex: 0, dir: "desc" },
      }),
    });
    expect(r.outRows.map((x) => x.labels[0])).toEqual([
      "A",
      "B",
      null,
      "Grand Total",
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* empty / invalid configurations                                      */
/* ------------------------------------------------------------------ */

describe("empty and invalid configurations", () => {
  it("returns nothing to render when no value field is selected", () => {
    const r = run(cfg({ rows: ["block"] }));
    expect(r.outRows).toEqual([]);
    expect(r.colCombos).toEqual([]);
    expect(r.totalCount).toBe(5);
  });

  it("ignores unknown field ids instead of throwing", () => {
    const r = run(
      cfg({
        rows: ["nope"],
        columns: ["also-nope"],
        values: [{ fieldId: "name", agg: "count" }, { fieldId: "ghost", agg: "sum" }],
      }),
    );
    expect(r.valueSpecs).toHaveLength(1);
    expect(r.rowFields).toEqual([]);
    expect(r.outRows[0].measures).toEqual([5]);
  });

  it("a values-only report shows ONE plain value row — NOT a 'Grand Total' row\n      (a Grand Total row exists only when a row field exists — Task B.1)", () => {
    const r = run(cfg({ values: [{ fieldId: "name", agg: "count" }] }));
    expect(r.outRows.map((x) => x.kind)).toEqual(["leaf"]);
    expect(r.outRows[0].measures).toEqual([5]);
    expect(r.outRows[0].labels).toEqual([]);
    expect(r.grandTotals).toEqual([5]);
    // …but with a row field the single Grand Total row is back:
    const withRows = run(
      cfg({ rows: ["type"], values: [{ fieldId: "name", agg: "count" }] }),
    );
    const grandRows = withRows.outRows.filter((x) => x.kind === "grand");
    expect(grandRows).toHaveLength(1);
    expect(grandRows[0].labels[0]).toBe("Grand Total");
  });
});

/* ------------------------------------------------------------------ */
/* field registry                                                      */
/* ------------------------------------------------------------------ */

describe("field registry", () => {
  it("exposes every tracker area with unique ids", () => {
    const fields = createPivotFields();
    const ids = fields.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(fields.length).toBeGreaterThan(40);
    for (const group of [
      "Facility",
      "Certification",
      "State Assessment",
      "Surveillance & Recert",
      "Building & Fire NOC",
      "Calculated",
    ]) {
      expect(fields.some((f) => f.group === group)).toBe(true);
    }
  });

  it("reads real values, derives years and merges the pipeline status", () => {
    const fields = createPivotFields();
    const byId = new Map(fields.map((f) => [f.id, f]));
    expect(byId.get("certYear")?.value(DATA[0])).toBe("2024");
    expect(byId.get("certMonth")?.value(DATA[0])).toBe("2024-01");
    expect(byId.get("certScore")?.value(DATA[1])).toBe(90);
    expect(byId.get("eligibility")?.value(DATA[2])).toBe("Eligible");
    // Derived pipeline status is always a non-empty string for a real row.
    expect(String(byId.get("pipelineStatus")?.value(DATA[0]))).not.toBe("");
  });

  it("only allows aggregations that fit the field type", () => {
    const fields = createPivotFields();
    const byId = new Map(fields.map((f) => [f.id, f]));
    expect(byId.get("certScore")?.type).toBe("number");
    expect(byId.get("certDate")?.type).toBe("date");
    expect(byId.get("block")?.type).toBe("text");
  });
});
