/**
 * SaQsham IMPORT PREVIEW + REPORT — ONE column model.
 *
 * The on-screen preview table, the Excel import report and the PDF import
 * report all map over this single ordered `SAQSHAM_PREVIEW_COLUMNS` array, so
 * the header and every body row are the same length by construction and cell
 * *i* is always read from column *i* (the same contract the master list uses —
 * see lib/reportColumns). The "Include" checkbox and the "→" arrow are real
 * UI-only columns with empty/short headers so the header/cell counts still
 * agree; they are simply excluded from the exported report.
 */

import type { PreviewRow, MatchMethod, PreviewState } from "./saqshamImport";
import { STATE_LABELS } from "./saqshamImport";

export type PreviewAlign = "left" | "center" | "right";

export type PreviewColumnKind =
  | "include" // checkbox (UI only)
  | "index" // row number
  | "text"
  | "status" // a status pill
  | "match" // method + confidence chip
  | "arrow" // the before → after separator
  | "change"; // New / Changed / No change

export type SaqshamPreviewColumn = {
  key: string;
  label: string;
  kind: PreviewColumnKind;
  /** Screen width in px (the exports use it for the column width). */
  width: number;
  align: PreviewAlign;
  /** Included in the exported import report. */
  exportable: boolean;
  /** The plain value behind the cell — this is what the exports write and what
   *  the contract test compares, so the UI and the report can never disagree. */
  raw: (row: PreviewRow, index: number) => string | number;
};

export const CHANGE_LABELS: Record<PreviewRow["change"], string> = {
  new: "New",
  changed: "Changed",
  same: "No change",
  none: "—",
};

/** Human label for a match method (shown as "Method NN%"). */
export const METHOD_LABELS: Record<MatchMethod, string> = {
  application_no: "Application No",
  portal_name: "SaQsham name (stored)",
  alias: "Saved alias",
  facility_key: "Facility key",
  helper: "Helper columns",
  exact: "Exact name+type",
  fuzzy: "Spelling variant",
  manual: "Manual",
  none: "—",
};

/** "Did the row change anything?" as one word, for the Change column. */
export function changeLabel(row: PreviewRow): string {
  return CHANGE_LABELS[row.change];
}

export function matchLabel(row: PreviewRow): string {
  // A confirmed manual choice wins over the original suggestion label.
  if (row.method === "manual") return "Manual 100%";
  // A fuzzy suggestion is never applied silently — the chip says what it is:
  // an amber "Spelling variant 97%" the user must accept.
  if (row.match.status === "suggested") {
    const top = row.match.candidates[0]?.score ?? 0;
    return `Spelling variant ${Math.round(top)}%`;
  }
  if (row.method === "none") return "Unmatched";
  if (row.method === "alias" && row.seededAlias) return "Seeded alias";
  const pct = Math.round(row.confidence);
  return `${METHOD_LABELS[row.method]} ${pct}%`;
}

export function portalLastUpdateLabel(row: PreviewRow): string {
  return row.cleaned.lastUpdate.date ?? row.cleaned.lastUpdate.updatedBy ?? "—";
}

/** ISO date → "24-Aug-2026" (a blank is never a date; it reads "Not recorded"). */
export function shortDate(iso: string | null | undefined): string {
  const v = String(iso ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(v)) return "";
  const [y, m, d] = v.slice(0, 10).split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d).padStart(2, "0")}-${months[m - 1]}-${y}`;
}

/** The report group a row shows as its PREVIOUS value (blank → "-"). */
export function previousReportLabel(row: PreviewRow): string {
  if (row.keptResultDeclared) return "Result declared";
  const v = String(row.currentReport ?? "").trim();
  return v || "-";
}

/** The report group a row shows as its NEW value. */
export function nextReportLabel(row: PreviewRow): string {
  if (row.keptResultDeclared) return "Result declared";
  if (row.keepAsIs) return "Keep as-is";
  if (row.newReport == null) return "Unmapped";
  return row.newReport || "-";
}

/** "previous → new" for the report group — one value when they are equal. */
export function reportChangeLabel(row: PreviewRow): string {
  const prev = previousReportLabel(row);
  const next = nextReportLabel(row);
  return prev === next ? prev : `${prev} → ${next}`;
}

/** "previous → new" for the portal update date — one value when equal. */
export function portalUpdateChangeLabel(row: PreviewRow): string {
  const prev = shortDate(row.currentPortalUpdatedOn) || "Not recorded";
  const next = shortDate(row.cleaned.lastUpdate.date) || row.cleaned.lastUpdate.updatedBy || "Not recorded";
  return prev === next ? prev : `${prev} → ${next}`;
}

/** New / Re-Application (the portal's Assessment Type, "New" when absent). */
export function applicationTypeLabel(row: PreviewRow): string {
  return row.cleaned.assessmentType || "New";
}

export function notesFor(row: PreviewRow): string {
  // Import-history batches carry the note the preview computed at apply time,
  // so the report matches what the user saw; the live preview computes fresh.
  if (row.overrideNote) return row.overrideNote;
  const bits: string[] = [];
  if (row.olderApplication)
    bits.push(`Older application (ignored)${row.olderOfApplicationNo ? ` — kept ${row.olderOfApplicationNo}` : ""}`);
  if (row.keptResultDeclared) bits.push("Kept: result declared");
  if (row.movedBack) bits.push("Status moved back");
  if (row.stale) bits.push("Older than current data");
  if (row.unmappedStatus) bits.push("Unmapped status");
  if (row.cleaned.resultDeclared) bits.push("Result declared. Update certification in the NQAS Assessment tab");
  if (!row.cleaned.facilityTypeKnown) bits.push(`Unknown category “${row.cleaned.category}”`);
  if (row.differentScope) bits.push("Different district/state");
  if (row.state === "ambiguous") bits.push("Ambiguous — choose the right facility");
  // Department-count mismatch: an INFO TAG, never a state (Part 0.2).
  if (row.cleaned.appliedDepartments.note) bits.push(row.cleaned.appliedDepartments.note);
  if (row.warnings.length) bits.push(...row.warnings);
  return bits.join(" · ") || "—";
}

/**
 * The ONE-LINE REASON under the row-state chip (Part 3.2.3). Plain words,
 * never colour alone: it says why the row is where it is and what to do.
 */
export function stateReason(row: PreviewRow): string {
  if (row.differentScope) return "Outside this district — skipped";
  if (row.olderApplication) return "Older application — skipped";
  if (row.match.status === "ambiguous") return "More than one facility with that name";
  if (row.match.status === "suggested") return "Spelling variant — pick the facility";
  if (!row.facilityId) return "Pick the facility";
  if (row.unmappedStatus) return "Choose a report group";
  if (row.keptResultDeclared) return "Result declared kept";
  if (row.change === "new") return "First status for this facility";
  if (row.change === "changed") return row.movedBack ? "Report group moves back — confirm" : "Previous and new differ";
  if (row.stale) return "No change · portal date is older than stored";
  return "All values equal";
}

/** "previous → new" only when they DIFFER; a single value when they match
 *  (Part 0.6 — an identical pair is never struck through). */
export function showsBoth<T>(prev: T, next: T): boolean {
  return String(prev ?? "") !== String(next ?? "");
}

/**
 * THE column model. Header row, every body row, the Excel/PDF import report
 * and the print view are all generated from this array.
 */
export const SAQSHAM_PREVIEW_COLUMNS: SaqshamPreviewColumn[] = [
  { key: "include", label: "Include", kind: "include", width: 60, align: "center", exportable: false, raw: () => "" },
  { key: "rowNo", label: "Row #", kind: "index", width: 52, align: "right", exportable: true, raw: (r) => r.rowNo },
  { key: "applicationNo", label: "Application No", kind: "text", width: 150, align: "left", exportable: true, raw: (r) => r.cleaned.applicationNo },
  { key: "portalFacility", label: "Portal name (raw)", kind: "text", width: 160, align: "left", exportable: true, raw: (r) => r.cleaned.portalFacilityRaw },
  { key: "matchedFacility", label: "Matched facility", kind: "text", width: 160, align: "left", exportable: true, raw: (r) => r.facilityName || "—" },
  { key: "block", label: "Block", kind: "text", width: 104, align: "left", exportable: true, raw: (r) => r.facilityBlock || "—" },
  { key: "phc", label: "PHC", kind: "text", width: 112, align: "left", exportable: true, raw: (r) => r.facilityPhc || "—" },
  { key: "match", label: "Match", kind: "match", width: 118, align: "center", exportable: true, raw: (r) => matchLabel(r) },
  // Previous → new: two status columns with the arrow between them, then one
  // combined cell per other field so the "what changes" story is on one line.
  { key: "currentStatus", label: "Previous status", kind: "status", width: 164, align: "left", exportable: true, raw: (r) => r.currentStatus || "-" },
  { key: "arrow", label: "", kind: "arrow", width: 32, align: "center", exportable: false, raw: () => "→" },
  { key: "newStatus", label: "New status", kind: "status", width: 164, align: "left", exportable: true, raw: (r) => r.newStatus || "-" },
  { key: "reportChange", label: "Report group (previous → new)", kind: "text", width: 232, align: "left", exportable: true, raw: (r) => reportChangeLabel(r) },
  { key: "updateChange", label: "Portal update (previous → new)", kind: "text", width: 196, align: "left", exportable: true, raw: (r) => portalUpdateChangeLabel(r) },
  { key: "appType", label: "Application", kind: "text", width: 108, align: "center", exportable: true, raw: (r) => applicationTypeLabel(r) },
  { key: "mode", label: "Mode", kind: "text", width: 92, align: "center", exportable: true, raw: (r) => r.optional.assessmentMode || "-" },
  { key: "rowState", label: "Row state", kind: "change", width: 122, align: "center", exportable: true, raw: (r) => STATE_STYLES[r.state].label },
  { key: "notes", label: "Notes", kind: "text", width: 220, align: "left", exportable: true, raw: (r) => notesFor(r) },
];

/** The exported import report's columns — the UI-only cells drop out. */
export const SAQSHAM_REPORT_COLUMNS: SaqshamPreviewColumn[] = SAQSHAM_PREVIEW_COLUMNS.filter(
  (c) => c.exportable,
);

/** The header row — one label per column, in order. */
export function saqshamPreviewHeaders(
  columns: readonly SaqshamPreviewColumn[] = SAQSHAM_PREVIEW_COLUMNS,
): string[] {
  return columns.map((c) => c.label);
}

/** One body row — cell *i* is read from `columns[i]`, never by position. */
export function saqshamPreviewCells(
  row: PreviewRow,
  index: number,
  columns: readonly SaqshamPreviewColumn[] = SAQSHAM_PREVIEW_COLUMNS,
): (string | number)[] {
  return columns.map((c) => c.raw(row, index));
}

/** Every body row, in order. */
export function saqshamPreviewRows(
  rows: readonly PreviewRow[],
  columns: readonly SaqshamPreviewColumn[] = SAQSHAM_PREVIEW_COLUMNS,
): (string | number)[][] {
  return rows.map((r, i) => saqshamPreviewCells(r, i, columns));
}

/** The exported report's header row. */
export function saqshamReportHeaders(): string[] {
  return saqshamPreviewHeaders(SAQSHAM_REPORT_COLUMNS);
}

/** The exported report's body rows. */
export function saqshamReportRows(rows: readonly PreviewRow[]): (string | number)[][] {
  return saqshamPreviewRows(rows, SAQSHAM_REPORT_COLUMNS);
}

/** Row-state → pill classes + a check that the label always accompanies the
 *  colour (never colour alone). */
export const STATE_STYLES: Record<PreviewState, { label: string; className: string; icon: string }> = {
  ready: { label: STATE_LABELS.ready, className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300/50", icon: "check" },
  no_change: { label: STATE_LABELS.no_change, className: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-300/50", icon: "minus" },
  needs_review: { label: STATE_LABELS.needs_review, className: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300/50", icon: "alert" },
  unmatched: { label: STATE_LABELS.unmatched, className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300/50", icon: "x" },
  ambiguous: { label: STATE_LABELS.ambiguous, className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300/50", icon: "x" },
  skipped: { label: STATE_LABELS.skipped, className: "bg-muted text-muted-foreground border-border/60", icon: "skip" },
  error: { label: STATE_LABELS.error, className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300/50", icon: "x" },
};
