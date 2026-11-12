import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';

async function exportExcel(filename, sheetName, headers, rows, meta) {
  const XLSXmod = await __vitePreload(() => import('./vendor-xlsx-yBJAythd.js'),true              ?[]:void 0);
  XLSXmod.writeFile(
    await buildTableWorkbook(sheetName, headers, rows, meta),
    filename
  );
}
async function buildTableWorkbook(sheetName, headers, rows, meta) {
  const XLSXmod = await __vitePreload(() => import('./vendor-xlsx-yBJAythd.js'),true              ?[]:void 0);
  const metaRows = [meta?.title, meta?.subtitle].filter(
    (v) => typeof v === "string" && v.trim() !== ""
  );
  const data = [
    ...metaRows.map((v) => [v]),
    headers,
    ...rows.map((r) => r.map((c) => c ?? ""))
  ];
  const ws = XLSXmod.utils.aoa_to_sheet(data);
  if (metaRows.length > 0) {
    ws["!merges"] = metaRows.map((_, r) => ({
      s: { r, c: 0 },
      e: { r, c: Math.max(0, headers.length - 1) }
    }));
  }
  ws["!cols"] = headers.map((_, col) => {
    let longest = headers[col]?.length ?? 10;
    for (const row of rows) {
      const len = String(row[col] ?? "").length;
      if (len > longest) longest = len;
    }
    return { wch: Math.min(60, Math.max(10, longest + 2)) };
  });
  const wb = XLSXmod.utils.book_new();
  XLSXmod.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return wb;
}
async function exportPdf(filename, title, headers, rows, subtitle, options) {
  (await buildTablePdf({ title, subtitle, headers, rows, options })).save(filename);
}
async function buildTablePdf({
  title,
  subtitle,
  headers,
  rows,
  options
}) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    __vitePreload(() => import('./vendor-jspdf-BarNdCns.js').then(n => n.j),true              ?[]:void 0),
    __vitePreload(() => import('./vendor-jspdf-BarNdCns.js').then(n => n.b),true              ?[]:void 0)
  ]);
  const autoTable = autoTableMod.default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(title, 40, 36);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(subtitle, 40, 52);
    doc.setTextColor(0);
  }
  const columnStyles = {};
  if (options?.align) {
    headers.forEach((_, i) => {
      columnStyles[i] = { ...columnStyles[i], halign: options.align };
    });
  }
  if (options?.columnAligns) {
    options.columnAligns.forEach((a, i) => {
      columnStyles[i] = { ...columnStyles[i], halign: a };
    });
  }
  if (options?.columnWidths) {
    const available = doc.internal.pageSize.getWidth() - 80;
    const total = options.columnWidths.reduce((sum, w) => sum + (w ?? 0), 0);
    const scale = total > 0 ? available / total : 1;
    options.columnWidths.forEach((w, i) => {
      if (w != null) {
        columnStyles[i] = { ...columnStyles[i], cellWidth: w * scale };
      }
    });
  }
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((c) => c == null ? "" : String(c))),
    // The header row repeats on every page (jspdf-autotable's default
    // `showHead: "everyPage"`), so page 2+ still labels its own values.
    showHead: "everyPage",
    startY: subtitle ? 62 : 50,
    styles: { fontSize: 7.5, cellPadding: 3, textColor: 0 },
    headStyles: { fillColor: [13, 105, 96], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 248, 247] },
    margin: { left: 40, right: 40 },
    columnStyles
  });
  return doc;
}

export { exportExcel as a, buildTablePdf as b, exportPdf as e };
