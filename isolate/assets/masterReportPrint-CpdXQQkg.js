import { k as cellText, H as checkRowTypes } from './AppShell-CP099uvN.js';

function exportRowCells(row, columns) {
  const cells = columns.map((c) => {
    const v = cellText(row, c.key);
    return v === "" ? "-" : v;
  });
  checkRowTypes(columns, cells, "log");
  return cells;
}
function exportHeaders(columns, labels) {
  return columns.filter((c) => c.exportable && c.type !== "action").map((c) => labels[c.key] ?? c.label);
}
const esc = (s) => s.replace(
  /[&<>"]/g,
  (ch) => ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : "&quot;"
);
function buildMasterPrintHtml(opts) {
  const title = opts.title ?? "NQAS Full Report";
  const cols = opts.columns.filter((c) => c.exportable && c.type !== "action");
  const headerRow = exportHeaders(opts.columns, opts.labels);
  const body = opts.rows.map((r) => exportRowCells(r, cols));
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:10.5px/1.35 system-ui,sans-serif;margin:14px;color:#111}h1{font-size:15px;margin:0 0 2px}p.sub{font-size:10px;color:#555;margin:0 0 10px}table{border-collapse:collapse;table-layout:fixed;width:100%}th,td{border:1px solid #ccc;padding:3px 5px;word-break:break-word;vertical-align:top}thead th{background:#0d6960;color:#fff;font-weight:600;text-align:left}tbody tr:nth-child(even){background:#f4f8f7}@page{size:A3 landscape;margin:10mm}</style></head><body><h1>${esc(title)}</h1><p class="sub">${esc(opts.subtitle)}</p><table><thead><tr>${headerRow.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>` + body.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("") + `</tbody></table><script>window.onload=function(){window.print()}<\/script></body></html>`;
}
function openMasterPrint(opts) {
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

export { openMasterPrint as o };
