/**
 * IA IMPORT PREVIEW + REPORT — ONE column model.
 *
 * The on-screen preview table, the Excel import report and the IA Quarterly
 * Report export all map over this single ordered array, so the header and
 * every body row are the same length by construction and cell *i* is always
 * read from column *i* (the same contract the SaQsham preview uses — see
 * lib/saqshamPreviewColumns). UI-only columns (Include checkbox) carry short
 * headers and are excluded from the exports.
 */

import type { IaPreviewRow, IaTracker } from "./iaImport";
import { IA_NO_CHANGE_BAND, SCORE_BARS, formatFyQuarter } from "./iaImport";

export type IaPreviewAlign = "left" | "center" | "right";
export type IaPreviewColumnKind =
  | "include"
  | "index"
  | "text"
  | "score" // a score cell with the ScoreBar thresholds
  | "match"
  | "move" // ▲/▼/■ + Δ comparison cells
  | "spark" // last four quarters, the new point highlighted
  | "state"; // row state pill

export type IaPreviewColumn = {
  key: string;
  label: string;
  kind: IaPreviewColumnKind;
  /** Screen width px (the Excel export converts to width/8). */
  width: number;
  align: IaPreviewAlign;
  exportable: boolean;
  /** The plain value behind the cell — what the exports write. */
  raw: (row: IaPreviewRow, trackScore: (t: IaTracker, which: "new" | "cur" | "prev" | "move") => string) => string | number;
};

export const IA_STATE_LABELS: Record<IaPreviewRow["state"], string> = {
  ready: "Ready",
  no_change: "No change",
  needs_review: "Needs review",
  unmatched: "Unmatched",
  ambiguous: "Ambiguous",
  skipped: "Skipped",
  error: "Error",
};

const dash = (v: string | number | null | undefined): string =>
  v == null || String(v).trim() === "" ? "-" : String(v);

const num = (v: number | null | undefined): string => dash(v == null ? null : String(v));

/** Direction glyph + delta for the "change" cells (also the Master List's
 *  IA Comparison column, via exportIaComparison in the master grid). */
export function iaMoveGlyph(row: IaPreviewRow, tracker: IaTracker): string {
  const d = moveDelta(row, tracker);
  if (d == null) return "■";
  // The shared no-change band: |Δ| < 0.05 is a flat mark, never a 0.01 arrow.
  if (Math.abs(d) < IA_NO_CHANGE_BAND) return "■";
  return d > 0 ? "▲" : "▼";
}

function moveDelta(row: IaPreviewRow, tracker: IaTracker): number | null {
  // Compares the NEW value against the previous stored quarter when the new
  // value exists; else the CURRENT stored vs previous (master-list view uses
  // its own helper in lib/masterColumns for stored rows).
  const cur = row.cleaned.scores[tracker].value ?? row.current[tracker];
  const prev = row.prev[tracker];
  if (cur == null || prev == null) return null;
  return Math.round((cur - prev) * 100) / 100;
}

/**
 * THE column model. The tracker-scoped triplets (Current → New, Previous,
 * Move) are expanded per tracker by the table (a group band spans them).
 */
export const IA_BASE_COLUMNS: IaPreviewColumn[] = [
  { key: "include", label: "Include", kind: "include", width: 60, align: "center", exportable: false, raw: () => "" },
  { key: "rowNo", label: "#", kind: "index", width: 42, align: "right", exportable: true, raw: (r) => r.rowNo },
  { key: "nin", label: "NIN", kind: "text", width: 116, align: "left", exportable: true, raw: (r) => dash(r.nin) },
  { key: "key", label: "Facility key (old format)", kind: "text", width: 148, align: "left", exportable: true, raw: (r) => dash(r.cleaned.key || r.cleaned.name) },
  { key: "matchedFacility", label: "Facility (matched)", kind: "text", width: 160, align: "left", exportable: true, raw: (r) => dash(r.facilityName) },
  { key: "block", label: "Block", kind: "text", width: 100, align: "left", exportable: true, raw: (r) => dash(r.facilityBlock) },
  { key: "phc", label: "PHC", kind: "text", width: 110, align: "left", exportable: true, raw: (r) => dash(r.facilityPhc) },
  { key: "type", label: "Type", kind: "text", width: 74, align: "left", exportable: true, raw: (r) => dash(r.facilityType) },
  { key: "match", label: "Match", kind: "match", width: 110, align: "center", exportable: true, raw: (r) => matchLabel(r) },
];

export const IA_STATE_COLUMN: IaPreviewColumn = {
  key: "state", label: "Row status", kind: "state", width: 108, align: "center", exportable: true,
  raw: (r) => IA_STATE_LABELS[r.state],
};

export const IA_NOTES_COLUMN: IaPreviewColumn = {
  key: "notes", label: "Notes", kind: "text", width: 200, align: "left", exportable: true,
  raw: (r) => iaNotes(r),
};

/** The sparkline column: last four quarters (new point last, highlighted). */
export const IA_TREND_COLUMN: IaPreviewColumn = {
  key: "trend", label: "Last four quarters", kind: "spark", width: 170, align: "left", exportable: true,
  raw: (r) => iaSparkText(r),
};

/** Plain-text trend for the Excel report (one cell, never a clipped chart). */
export function iaSparkText(row: IaPreviewRow): string {
  if (row.trend.length === 0) return "-";
  return row.trend
    .map((p) => `${p.label} NQAS ${p.nqas ?? "-"} / Kayakalp ${p.kayakalp ?? "-"}`)
    .join(" · ");
}

export function matchLabel(row: IaPreviewRow): string {
  if (row.outsideBlocks) return "Outside your blocks";
  if (row.unknownNin) return "Unknown NIN";
  if (row.match.status === "unmatched") return "Unmatched";
  if (row.match.status === "ambiguous") return "Ambiguous";
  if (row.match.status === "suggested") return `Suggested ${Math.round(row.match.confidence)}%`;
  if (row.match.viaNin) {
    const suffix = row.needsNinConfirm ? " · confirm" : row.crossCheck ? " · confirmed" : "";
    return `NIN ${Math.round(row.match.confidence)}%${suffix}`;
  }
  if (!row.nin && row.match.status === "matched") {
    // Old-format rows are visible as legacy matches (amber wording), never
    // hidden behind a normal "Exact" label.
    return `No NIN · ${row.match.method === "manual" ? "Manual" : "old key"} ${Math.round(row.match.confidence)}%`;
  }
  const labels: Record<string, string> = {
    helper: "Saved key",
    alias: "Saved alias",
    exact: "Exact",
    manual: "Manual",
    fuzzy: "Fuzzy",
    none: "Unmatched",
  };
  return `${labels[row.match.method] ?? row.match.method} ${Math.round(row.match.confidence)}%`;
}

export function iaNotes(row: IaPreviewRow): string {
  const bits: string[] = [];
  if (row.cleaned.fyError) bits.push("Financial Year not recognised");
  if (row.cleaned.qError) bits.push("Quarter not recognised");
  if (row.future) bits.push("Future quarter (error)");
  if (row.stale) bits.push("Past quarter edit");
  if (row.locked) bits.push("Locked quarter");
  if (row.ninError) bits.push(row.ninError);
  if (row.ninPadded) bits.push("NIN padded; format the column as Text");
  if (row.needsNinConfirm && row.crossCheck) bits.push(row.crossCheck);
  if (row.unknownNin) bits.push("Unknown NIN — pick the right facility");
  if (row.outsideBlocks) bits.push("Outside your blocks — skipped");
  if (row.edited.length) bits.push("Edited in the preview");
  if (row.match.method === "manual") bits.push("Matched by hand in this import");
  // Part 2: the Eco-Friendly tracker is deprecated — no preview notes.
  for (const t of ["nqas", "kayakalp"] as const) {
    const s = row.cleaned.scores[t];
    if (s.error) bits.push(`${TRACKER_LABEL(t)} ${s.raw} outside 0–100`);
    else if (s.chip) bits.push(`${TRACKER_LABEL(t)}: ${s.chip}`);
    else if (s.raw.trim() === "" && row.current[t] != null) bits.push(`${TRACKER_LABEL(t)} blank in file (value kept)`);
  }
  if (row.match.status === "suggested") bits.push("Suggested, not auto-applied");
  bits.push(...row.warnings, ...row.chips);
  return bits.join(" · ") || "-";
}

function TRACKER_LABEL(t: IaTracker): string {
  // The retired tracker can no longer be imported; if a legacy row still
  // carries a note it is labelled neutrally, never by the old name.
  return t === "nqas" ? "NQAS IA" : t === "kayakalp" ? "Kayakalp IA" : "Legacy IA";
}

/** One header label of a tracker triplet, e.g. "NQAS IA" / "Current → New". */
export const IA_TRACKER_HEADERS = (trackerLabel: string): { label: string; which: "new" | "cur" | "prev" | "move"; width: number; kind: IaPreviewColumnKind }[] => [
  { label: `${trackerLabel}: in this quarter → new`, which: "new", width: 160, kind: "score" },
  { label: `${trackerLabel} prev quarter`, which: "prev", width: 108, kind: "score" },
  { label: `${trackerLabel} change`, which: "move", width: 92, kind: "move" },
];

/** The full ordered preview column list for ONE tracker section — the table
 *  renders [base … tracker sections … state, notes] and the exports skip the
 *  non-exportable head. */
export function iaColumnsForTrackers(
  trackers: readonly IaTracker[],
  opts: { includeKey?: boolean; includeTrend?: boolean } = {},
): IaPreviewColumn[] {
  const cols: IaPreviewColumn[] = IA_BASE_COLUMNS.filter((c) => opts.includeKey !== false || c.key !== "key");
  for (const t of trackers) {
    const label = TRACKER_LABEL(t);
    for (const h of IA_TRACKER_HEADERS(label)) {
      cols.push({
        key: `${t}:${h.which}`,
        label: h.label,
        kind: h.kind,
        width: h.width,
        align: h.which === "move" ? "center" : "right",
        exportable: true,
        raw: (r) => scoreCell(r, t, h.which),
      });
    }
  }
  if (opts.includeTrend !== false) cols.push(IA_TREND_COLUMN);
  cols.push(IA_STATE_COLUMN, IA_NOTES_COLUMN);
  return cols;
}

/** The plain export value for one score cell. */
export function scoreCell(
  row: IaPreviewRow,
  tracker: IaTracker,
  which: "new" | "cur" | "prev" | "move",
): string {
  if (which === "cur") return num(row.current[tracker]);
  if (which === "prev") return num(row.prev[tracker]);
  if (which === "move") {
    const d = moveDelta(row, tracker);
    if (d == null) return "■";
    return `${iaMoveGlyph(row, tracker)} ${d > 0 ? "+" : ""}${d}`;
  }
  const s = row.cleaned.scores[tracker];
  if (s.error) return `ERR ${String(s.raw)}`;
  if (s.value != null) return String(s.value);
  if (s.chip) return s.chip;
  return "-";
}

/** The header row — one label per column, in order. */
export function iaPreviewHeaders(columns: readonly IaPreviewColumn[]): string[] {
  return columns.map((c) => c.label);
}

/** One body row — cell *i* is read from `columns[i]`, never by position. */
export function iaPreviewCells(
  row: IaPreviewRow,
  index: number,
  columns: readonly IaPreviewColumn[],
  trackScore: (t: IaTracker, which: "new" | "cur" | "prev" | "move") => string = () => "",
): (string | number)[] {
  return columns.map((c) => c.raw(row, trackScore));
}

/** Every body row, in order. */
export function iaPreviewRows(
  rows: readonly IaPreviewRow[],
  columns: readonly IaPreviewColumn[],
  trackScore: (t: IaTracker, which: "new" | "cur" | "prev" | "move") => string,
): (string | number)[][] {
  return rows.map((r, i) => iaPreviewCells(r, i, columns, trackScore));
}

/** Row-state color tokens shared by the preview and the mobile cards. */
export const IA_STATE_STYLES: Record<IaPreviewRow["state"], string> = {
  ready: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  no_change: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  needs_review: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  unmatched: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  ambiguous: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  skipped: "bg-muted text-muted-foreground",
  error: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

/** ScoreBar color class from the shared thresholds. */
export function scoreBarColor(value: number | null | undefined): string {
  if (value == null) return "";
  if (value >= SCORE_BARS.green) return "text-emerald-700 dark:text-emerald-300";
  if (value >= SCORE_BARS.amber) return "text-amber-700 dark:text-amber-300";
  return "text-rose-700 dark:text-rose-300";
}

/** Quarter tab label. */
export const quarterTabLabel = (fy: string, q: number): string => formatFyQuarter(fy, q);
