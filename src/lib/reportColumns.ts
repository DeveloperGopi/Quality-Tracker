/**
 * REPORT COLUMN MODEL — the ONE ordered column list behind a table report.
 *
 * WHY THIS FILE EXISTS (root cause)
 * ---------------------------------
 * The "Dashboard summary — current filter" export was built from TWO lists that
 * were allowed to drift apart:
 *
 *   • the header row came from `FILTERED_HEADERS.slice(1)` (Dashboard.tsx) —
 *     the "S.No" label was dropped, leaving 10 labels;
 *   • the body rows came from `buildFilteredExportRows()`, which still emitted
 *     the serial number as the first cell, so every row had 11 cells.
 *
 * Ten headers above eleven cells means every value prints one column to the
 * RIGHT of its own header ("Facility" showed 1, 2, 3 …, "Type" showed facility
 * names, …) and the real last column falls off the end of the page — exactly
 * what the attached screenshot shows.
 *
 * This module makes that class of bug impossible by construction:
 *
 *   1. ONE ordered `columns[]` per report. `reportHeaders()` and
 *      `reportRows()` both map over the SAME array, so the header and every
 *      body row are always the same length and always in the same order.
 *   2. `reportCell()` is the ONLY place a cell value is produced, and it is
 *      driven by the column's declared `type` — a score column can only print
 *      a number, a date column only a date, a status column only a string.
 *      A value that does not match its column type prints the blank glyph and
 *      raises a development warning, so a shifted/mistyped value is visible
 *      immediately instead of silently landing under the wrong header.
 *   3. Every consumer (Excel, PDF, CSV, print view) takes the pairs produced by
 *      (1) and (2). Nothing hand-writes a header cell or a body cell.
 */

import { SCORE_DECIMALS, toDdMmmYyyy } from "@/lib/masterColumns";

/* --------------------------------------------------------------------------- */
/* Formatting constants — one place, shared by every surface                    */
/* --------------------------------------------------------------------------- */

/** Decimal places for every score/percentage (84 → "84.00"). Owned by the
 *  central config (lib/masterColumns) and re-exported here; every formatter in
 *  this file reads it, so "one decimal-places constant" is literally true. */
export { SCORE_DECIMALS };

/** What a blank/null cell reads as. ONE glyph, one place. */
export const BLANK = "—";

/** Report-wide date format (Indian display standard): 20-Jul-2027. */
export const formatReportDate = (iso: string | number | null | undefined): string =>
  toDdMmmYyyy(iso) || BLANK;

/** Report-wide score format: fixed decimals, never "84.000001". Uses the same
 *  SCORE_DECIMALS as the master list's `formatPercent`, so both print "84.00"
 *  (the report columns carry the "%" in their header, the master list appends
 *  it to the value). */
export function formatReportScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return BLANK;
  return value.toFixed(SCORE_DECIMALS);
}

/* --------------------------------------------------------------------------- */
/* Column model                                                                 */
/* --------------------------------------------------------------------------- */

export type ReportAlign = "left" | "center" | "right";

/** What a column holds. The type decides both the formatter used by
 *  `reportCell()` and (for the master grid) the value kind. */
export type ReportColumnType = "index" | "text" | "status" | "score" | "date";

export type ReportColumn<Row> = {
  /** Stable key — tests and presets address a column by this, never by index. */
  key: string;
  /** Header text. The single source of the header row. */
  label: string;
  type: ReportColumnType;
  /** Header and values share this alignment. */
  align: ReportAlign;
  /** Column width in px, used by the PDF (scaled to the printable width). */
  width: number;
  /** Excluded columns (an action column, a hidden column) drop out of the
   *  header AND the rows together, so the two can never disagree. */
  exportable: boolean;
  /** Reads the raw value for one row. Formatting is NOT done here — the
   *  column type decides it, in exactly one place (`reportCell`). */
  raw: (row: Row, index: number) => unknown;
};

/** Tiny identity helper so a column list reads as data (and stays typed). */
export const reportColumn = <Row,>(c: ReportColumn<Row>): ReportColumn<Row> => c;

/* --------------------------------------------------------------------------- */
/* Type-safe cell rendering                                                     */
/* --------------------------------------------------------------------------- */

const IS_DEV = (() => {
  try {
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
})();

/** Development-only warning sink. Exported so a test can install a spy and
 *  assert that a mistyped cell is reported instead of silently shifting. */
export let onTypeMismatch: (message: string) => void = (message) => {
  if (IS_DEV) console.warn(`[report] ${message}`);
};

export function setTypeMismatchHandler(fn: ((message: string) => void) | null): void {
  onTypeMismatch =
    fn ??
    ((message) => {
      if (IS_DEV) console.warn(`[report] ${message}`);
    });
}

const mismatch = (column: ReportColumn<never>, got: unknown): string => {
  const message =
    `column "${column.key}" is type "${column.type}" but received ` +
    `${got === null ? "null" : typeof got} — printing "${BLANK}"`;
  onTypeMismatch(message);
  return BLANK;
};

const isBlank = (v: unknown): boolean =>
  v == null || (typeof v === "string" && v.trim() === "");

/**
 * The value of ONE cell of ONE column.
 *
 * The column `type` is the contract:
 *   index   → a finite number (the serial number is a REAL column, so the
 *             header always has a "#" above it and never drifts),
 *   text    → a string,
 *   status  → a string,
 *   score   → a finite number, printed with SCORE_DECIMALS,
 *   date    → an ISO date string (or an epoch-ms number), printed DD-MMM-YYYY.
 */
export function reportCell<Row>(
  column: ReportColumn<Row>,
  row: Row,
  index: number,
): string | number | null {
  const raw = column.raw(row, index);

  switch (column.type) {
    case "index": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) return mismatch(column as ReportColumn<never>, raw);
      return n;
    }
    case "score": {
      if (isBlank(raw)) return BLANK;
      if (typeof raw !== "number" || !Number.isFinite(raw))
        return mismatch(column as ReportColumn<never>, raw);
      return raw.toFixed(SCORE_DECIMALS);
    }
    case "date": {
      if (isBlank(raw)) return BLANK;
      if (typeof raw !== "string" && typeof raw !== "number")
        return mismatch(column as ReportColumn<never>, raw);
      return toDdMmmYyyy(raw) || BLANK;
    }
    case "status":
    case "text": {
      if (isBlank(raw)) return BLANK;
      if (typeof raw !== "string")
        return mismatch(column as ReportColumn<never>, raw);
      return raw;
    }
    default:
      return BLANK;
  }
}

/* --------------------------------------------------------------------------- */
/* The two functions every surface uses                                         */
/* --------------------------------------------------------------------------- */

/** The header row — one label per exportable column, in order. */
export function reportHeaders<Row>(
  columns: readonly ReportColumn<Row>[],
  overrides?: Record<string, string>,
): string[] {
  return columns
    .filter((c) => c.exportable)
    .map((c) => {
      const custom = overrides?.[c.label];
      return custom && custom.trim() ? custom : c.label;
    });
}

/** Every body row — cell *i* is read from `columns[i]`, by key, never by
 *  position. Guaranteed to be exactly as long as `reportHeaders()`. */
export function reportRows<Row>(
  columns: readonly ReportColumn<Row>[],
  rows: readonly Row[],
): (string | number | null)[][] {
  const visible = columns.filter((c) => c.exportable);
  return rows.map((row, i) => visible.map((c) => reportCell(c, row, i)));
}

/** Per-column PDF widths (px) for `exportPdf({ columnWidths })`. */
export function reportColumnWidths<Row>(
  columns: readonly ReportColumn<Row>[],
): number[] {
  return columns.filter((c) => c.exportable).map((c) => c.width);
}

/** Per-column PDF alignment — the header inherits its values' alignment. */
export function reportColumnAligns<Row>(
  columns: readonly ReportColumn<Row>[],
): ReportAlign[] {
  return columns.filter((c) => c.exportable).map((c) => c.align);
}

/* --------------------------------------------------------------------------- */
/* CSV + print view — built from the same pairs                                 */
/* --------------------------------------------------------------------------- */

const csvCell = (value: string | number | null): string => {
  const s = value == null ? BLANK : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** A CSV document for a report. Takes the SAME columns[] as the on-screen /
 *  PDF / Excel surfaces, so its header row matches its body. */
export function buildReportCsv<Row>(
  columns: readonly ReportColumn<Row>[],
  rows: readonly Row[],
  overrides?: Record<string, string>,
): string {
  const headers = reportHeaders(columns, overrides);
  const body = reportRows(columns, rows);
  return [headers, ...body].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** Trigger a download for text content (CSV / JSON). */
export function downloadText(filename: string, text: string, mime = "text/csv"): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );

/**
 * Print view — a plain printable table built from the SAME headers/rows.
 *
 * The `<thead>` repeats on every printed page (browsers do this natively for
 * `thead`), so page 2 onwards still carries the header above its own values.
 */
export function buildReportPrintHtml<Row>(opts: {
  title: string;
  subtitle?: string;
  columns: readonly ReportColumn<Row>[];
  rows: readonly Row[];
  overrides?: Record<string, string>;
}): string {
  const headers = reportHeaders(opts.columns, opts.overrides);
  const body = reportRows(opts.columns, opts.rows);
  const aligns = reportColumnAligns(opts.columns);
  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>${escapeHtml(opts.title)}</title>
<style>
  body { font: 12px/1.4 system-ui, sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  p.sub { font-size: 11px; color: #555; margin: 0 0 12px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; }
  thead th { background: #0d6960; color: #fff; text-align: left; }
  tbody tr:nth-child(even) { background: #f4f8f7; }
  @page { size: A4 landscape; margin: 12mm; }
</style></head><body>
<h1>${escapeHtml(opts.title)}</h1>
${opts.subtitle ? `<p class="sub">${escapeHtml(opts.subtitle)}</p>` : ""}
<table><thead><tr>${headers
    .map((h, i) => `<th style="text-align:${aligns[i]}">${escapeHtml(h)}</th>`)
    .join("")}</tr></thead>
<tbody>${body
    .map(
      (r) =>
        `<tr>${r
          .map(
            (c, i) =>
              `<td style="text-align:${aligns[i]}">${escapeHtml(
                c == null ? BLANK : String(c),
              )}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("")}</tbody></table>
<script>window.onload = function () { window.print(); };</script>
</body></html>`;
}

/** Open the printable view (same headers, same rows) in a new window. */
export function openReportPrintView<Row>(opts: {
  title: string;
  subtitle?: string;
  columns: readonly ReportColumn<Row>[];
  rows: readonly Row[];
  overrides?: Record<string, string>;
}): void {
  if (typeof window === "undefined") return;
  const html = buildReportPrintHtml(opts);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

/* --------------------------------------------------------------------------- */
/* Report header — states the filters and the count                             */
/* --------------------------------------------------------------------------- */

/** "16-Oct-2026 06:38 IST" — the report's generated stamp (IST, the app's
 *  operating timezone), in the report date format. */
export function generatedStamp(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")} IST`;
}

/**
 * The report's subtitle line: which filters produced it and how many of how
 * many facilities are shown. Built here (not in the page) so Excel, PDF, CSV
 * and the print view all state the same thing.
 */
export function reportSubtitle(opts: {
  shown: number;
  total: number;
  filters?: string[];
  now?: Date;
}): string {
  const filters = (opts.filters ?? []).filter(Boolean);
  const scope = filters.length
    ? `Filters: ${filters.join("; ")}`
    : `No filters (all ${opts.total} facilities)`;
  return [
    scope,
    `Showing ${opts.shown} of ${opts.total} facilities`,
    `Generated ${generatedStamp(opts.now)}`,
  ].join(" · ");
}
