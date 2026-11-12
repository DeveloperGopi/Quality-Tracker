import { F as COMPARE_NO_CHANGE_BAND, S as SCORE_DECIMALS, G as toDdMmmYyyy } from './AppShell-CP099uvN.js';

const PERCENT_DECIMALS = 1;
const NO_CHANGE_BAND = COMPARE_NO_CHANGE_BAND;
const MEDIAN_MIN_VALUES = 3;
function percentOf(part, whole) {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return null;
  return part / whole * 100;
}
function formatPercent(value, decimals = PERCENT_DECIMALS) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(decimals)}%`;
}
function percentLabel(part, whole) {
  return formatPercent(percentOf(part, whole));
}
function median(values) {
  const clean = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (clean.length < MEDIAN_MIN_VALUES) return null;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}
function daysBetweenIso(a, b) {
  if (!a || !b) return null;
  const ta = Date.parse(`${String(a).slice(0, 10)}T00:00:00Z`);
  const tb = Date.parse(`${String(b).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round((tb - ta) / 864e5);
}
function changeDirection(delta, band = NO_CHANGE_BAND) {
  if (delta == null || !Number.isFinite(delta)) return null;
  if (Math.abs(delta) < band) return "same";
  return delta > 0 ? "up" : "down";
}
function changeLabel(delta) {
  if (delta == null || !Number.isFinite(delta)) return "-";
  const dir = changeDirection(delta);
  const sign = dir === "same" ? "" : delta > 0 ? "+" : "-";
  return `${dir === "same" ? "■" : dir === "up" ? "▲" : "▼"} ${sign}${Math.abs(delta).toFixed(SCORE_DECIMALS)}`;
}

const BLANK = "—";
const formatReportDate = (iso) => toDdMmmYyyy(iso) || BLANK;
const reportColumn = (c) => c;
const IS_DEV = (() => {
  try {
    return Boolean(false);
  } catch {
    return false;
  }
})();
let onTypeMismatch = (message) => {
  if (IS_DEV) console.warn(`[report] ${message}`);
};
const mismatch = (column, got) => {
  const message = `column "${column.key}" is type "${column.type}" but received ${got === null ? "null" : typeof got} — printing "${BLANK}"`;
  onTypeMismatch(message);
  return BLANK;
};
const isBlank = (v) => v == null || typeof v === "string" && v.trim() === "";
function reportCell(column, row, index) {
  const raw = column.raw(row, index);
  switch (column.type) {
    case "index": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) return mismatch(column, raw);
      return n;
    }
    case "score": {
      if (isBlank(raw)) return BLANK;
      if (typeof raw !== "number" || !Number.isFinite(raw))
        return mismatch(column, raw);
      return raw.toFixed(SCORE_DECIMALS);
    }
    case "date": {
      if (isBlank(raw)) return BLANK;
      if (typeof raw !== "string" && typeof raw !== "number")
        return mismatch(column, raw);
      return toDdMmmYyyy(raw) || BLANK;
    }
    case "status":
    case "text": {
      if (isBlank(raw)) return BLANK;
      if (typeof raw !== "string")
        return mismatch(column, raw);
      return raw;
    }
    default:
      return BLANK;
  }
}
function reportHeaders(columns, overrides) {
  return columns.filter((c) => c.exportable).map((c) => {
    const custom = overrides?.[c.label];
    return custom && custom.trim() ? custom : c.label;
  });
}
function reportRows(columns, rows) {
  const visible = columns.filter((c) => c.exportable);
  return rows.map((row, i) => visible.map((c) => reportCell(c, row, i)));
}
function reportColumnWidths(columns) {
  return columns.filter((c) => c.exportable).map((c) => c.width);
}
function reportColumnAligns(columns) {
  return columns.filter((c) => c.exportable).map((c) => c.align);
}
const csvCell = (value) => {
  const s = value == null ? BLANK : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function buildReportCsv(columns, rows, overrides) {
  const headers = reportHeaders(columns, overrides);
  const body = reportRows(columns, rows);
  return [headers, ...body].map((r) => r.map(csvCell).join(",")).join("\r\n");
}
function downloadText(filename, text, mime = "text/csv") {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
const escapeHtml = (s) => s.replace(
  /[&<>"']/g,
  (c) => c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
);
function buildReportPrintHtml(opts) {
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
<table><thead><tr>${headers.map((h, i) => `<th style="text-align:${aligns[i]}">${escapeHtml(h)}</th>`).join("")}</tr></thead>
<tbody>${body.map(
    (r) => `<tr>${r.map(
      (c, i) => `<td style="text-align:${aligns[i]}">${escapeHtml(
        c == null ? BLANK : String(c)
      )}</td>`
    ).join("")}</tr>`
  ).join("")}</tbody></table>
<script>window.onload = function () { window.print(); };</script>
</body></html>`;
}
function openReportPrintView(opts) {
  if (typeof window === "undefined") return;
  const html = buildReportPrintHtml(opts);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
function generatedStamp(now = /* @__PURE__ */ new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")} IST`;
}
function reportSubtitle(opts) {
  const filters = (opts.filters ?? []).filter(Boolean);
  const scope = filters.length ? `Filters: ${filters.join("; ")}` : `No filters (all ${opts.total} facilities)`;
  return [
    scope,
    `Showing ${opts.shown} of ${opts.total} facilities`,
    `Generated ${generatedStamp(opts.now)}`
  ].join(" · ");
}

export { NO_CHANGE_BAND as N, reportHeaders as a, reportColumn as b, reportSubtitle as c, formatPercent as d, reportColumnAligns as e, formatReportDate as f, reportColumnWidths as g, downloadText as h, buildReportCsv as i, percentLabel as j, changeLabel as k, daysBetweenIso as l, median as m, openReportPrintView as o, percentOf as p, reportRows as r };
