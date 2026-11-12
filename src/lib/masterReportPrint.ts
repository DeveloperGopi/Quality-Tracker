/**
 * MASTER-REPORT PRINT — the printable document behind "Master report → Print".
 *
 * Built from the SAME columns[] + labels the Excel/CSV/PDF exports use and the
 * SAME per-row cell writer (lib.masterColumns.cellText via reportRows.ts's
 * exportCells contract), so the printout can never drift from the other three
 * formats. Exported here so the contract test
 * (scripts/reportsContract.test.ts) parses the REAL <thead>/<tbody> HTML and
 * asserts that every row's cell count equals the header's.
 */

import {
  checkRowTypes,
  cellText,
  type MasterColumn,
  type MasterRow,
} from "@/lib/masterColumns";

/** One row of EXPORT CELLS: the exportable columns × ONE cell each.
 *
 *  THE shared per-row cell writer: Excel/CSV (lib/masterExport.exportBody),
 *  the PDF (same module) and this print document all produce their rows from
 *  exactly this mapping — one cell per column, read by column key.
 *
 *  Type guard: a value that does not match its column's declared type
 *  renders "-" and warns in development; the contract TESTS install a
 *  throwing handler so a displaced cell fails `bun test`. */
export function exportRowCells(row: MasterRow, columns: readonly MasterColumn[]): string[] {
  const cells = columns.map((c) => {
    const v = cellText(row, c.key);
    return v === "" ? "-" : v;
  });
  checkRowTypes(columns, cells, "log");
  return cells;
}

/** The full header row (exportable columns only, in order). */
export function exportHeaders(
  columns: readonly MasterColumn[],
  labels: Record<string, string>,
): string[] {
  return columns
    .filter((c) => c.exportable && c.type !== "action")
    .map((c) => labels[c.key] ?? c.label);
}

/** Escapes the text nodes of the print document. */
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (ch) =>
    ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : "&quot;",
  );

export type MasterPrintOptions = {
  rows: readonly MasterRow[];
  /** Exportable columns, in print order. */
  columns: readonly MasterColumn[];
  labels: Record<string, string>;
  subtitle: string;
  title?: string;
};

/**
 * The printable master-report document (A3 landscape, header repeats via
 * `<thead>`). Kept synchronous and pure — tests pass rows/columns directly.
 */
export function buildMasterPrintHtml(opts: MasterPrintOptions): string {
  const title = opts.title ?? "NQAS Full Report";
  const cols = opts.columns.filter((c) => c.exportable && c.type !== "action");
  const headerRow = exportHeaders(opts.columns, opts.labels);
  const body = opts.rows.map((r) => exportRowCells(r, cols));
  return (
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>` +
    `<style>body{font:10.5px/1.35 system-ui,sans-serif;margin:14px;color:#111}` +
    `h1{font-size:15px;margin:0 0 2px}p.sub{font-size:10px;color:#555;margin:0 0 10px}` +
    `table{border-collapse:collapse;table-layout:fixed;width:100%}` +
    `th,td{border:1px solid #ccc;padding:3px 5px;word-break:break-word;vertical-align:top}` +
    `thead th{background:#0d6960;color:#fff;font-weight:600;text-align:left}` +
    `tbody tr:nth-child(even){background:#f4f8f7}@page{size:A3 landscape;margin:10mm}</style></head><body>` +
    `<h1>${esc(title)}</h1><p class="sub">${esc(opts.subtitle)}</p>` +
    `<table><thead><tr>${headerRow.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>` +
    body.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("") +
    `</tbody></table><script>window.onload=function(){window.print()}<\/script></body></html>`
  );
}

/** Open the printable report (same headers, same rows) — the page's Print
 *  action. An iframe keeps the app mounted; printing happens inside it. */
export function openMasterPrint(opts: MasterPrintOptions): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const doc = buildMasterPrintHtml(opts);
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  frame.srcdoc = doc;
}
