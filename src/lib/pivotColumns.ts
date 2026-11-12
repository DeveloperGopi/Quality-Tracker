/** THE one column model for the Custom Report pivot — shared by the
 *  on-screen table (components/custom-report/PivotTable), the Excel, PDF
 *  and CSV writers (lib/pivotExport) and the toolbar counter.
 *
 *  columns[] is built ONCE, left → right:
 *  1. one "label" column per row field (outline/tabular/compact all map
 *     their label cells onto these columns),
 *  2. one "value" column per column-combo × value spec,
 *  3. the Grand Total column(s) — ONLY when a column field exists (without
 *     one the row total would duplicate the only value column).
 *
 *  Every consumer is contract-tested to render `columns.map(c => cell)` so
 *  the screen and the exports can never drift apart. */

import { measureLabel } from "@/lib/pivot";
import type {
  PivotColumnCombo,
  PivotFieldDef,
  PivotValueSpec,
} from "@/lib/pivot";

export interface PivotColumnModel {
  key: string;
  /** "label" = one per row field; "value" = combo × value; "grand" = the
   *  row total column (exists only with a column field on ONE grand column
   *  per value). */
  kind: "label" | "value" | "grand";
  level: number | null;
  comboIndex: number | null;
  valueIndex: number | null;
  /** The final label of the column as printed in a flat (one-row) header. */
  header: string;
}

/** Result slice the model is built from — a full PivotResult satisfies it. */
export interface PivotColumnsInput {
  rowFields: PivotFieldDef[];
  colFields: PivotFieldDef[];
  colCombos: Pick<PivotColumnCombo, "key" | "labels" | "displayLabels">[];
  valueSpecs: PivotValueSpec[];
  valueFields: (PivotFieldDef | undefined)[];
}

/** Build the complete column list behind the preview header and the exports.
 *  Exactly ONE Grand Total column set exists — and only when a column field
 *  exists (otherwise the "row total" would duplicate the only value
 *  column). */
export function buildPivotColumns(
  result: PivotColumnsInput,
  opts: { grandTotalColumn?: boolean } = {},
): PivotColumnModel[] {
  const columns: PivotColumnModel[] = [];
  result.rowFields.forEach((field, level) => {
    columns.push({
      kind: "label",
      level,
      comboIndex: null,
      valueIndex: null,
      key: `label:${field.id}`,
      header: field.label,
    });
  });
  result.colCombos.forEach((combo, c) => {
    result.valueSpecs.forEach((_spec, v) => {
      columns.push({
        kind: "value",
        level: null,
        comboIndex: c,
        valueIndex: v,
        key: `m:${c}:${v}`,
        header:
          combo.labels.length
            ? `${(combo.displayLabels ?? combo.labels).map((l) => l ?? "(blank)").join(" · ")} — ${measureLabel(result.valueSpecs[v], result.valueFields[v])}`
            : measureLabel(result.valueSpecs[v], result.valueFields[v]),
      });
    });
  });
  if (opts.grandTotalColumn !== false && result.colFields.length > 0) {
    result.valueSpecs.forEach((_spec, v) => {
      columns.push({
        kind: "grand",
        level: null,
        comboIndex: null,
        valueIndex: v,
        key: `tot:${v}`,
        /* "Grand Total" alone with ONE value — the value name appears once
           in the corner caption / export caption; with 2+ values it repeats
           per value. */
        header:
          result.valueSpecs.length === 1
            ? "Grand Total"
            : `Grand Total — ${measureLabel(result.valueSpecs[v], result.valueFields[v])}`,
      });
    });
  }
  return columns;
}

/** Page counter contract: body rows EXCLUDING the grand-total row, value
 *  columns EXCLUDING the Grand Total column — the preview toolbar's
 *  "x of y facilities · z rows · w value columns" must equal the table. */
export function pivotCounter(
  result: {
    filteredCount: number;
    totalCount: number;
    outRows: { kind: string }[];
    colCombos: unknown[];
    valueSpecs: unknown[];
  },
): {
  facilities: number;
  of: number;
  rows: number;
  valueColumns: number;
} {
  return {
    facilities: result.filteredCount,
    of: result.totalCount,
    rows: result.outRows.filter((r) => r.kind !== "grand").length,
    valueColumns: result.colCombos.length * result.valueSpecs.length,
  };
}
